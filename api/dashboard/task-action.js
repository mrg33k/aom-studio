// POST /api/dashboard/task-action
// Unified endpoint for all task mutations from the Corner dashboard.
// Handles: toggle, reassign, delete, priority, moveToProject, addContext,
// addToRightNow, markDone, markUndone, approve, reject, editText, setLabel,
// dismiss, requeue, resume, startRunner.
//
// Body: { action, taskText, taskId?, agent?, payload?, clientId?, project? }
//
// Backend: the Convex task queue (corner:retire-supabase R1/R2, 2026-09-03):
// tasks:get / tasks:find to read, tasks:update to patch, tasks:queue to
// create, tasks:logEvent for the audit ledger.
//
// The queue keeps one status vocabulary (queued, running, building, done,
// failed, needs_input, blocked, cancelled). The old dashboard-only statuses
// map onto it: active -> queued, completed -> done, deleted -> cancelled.
// Columns the old table had and the queue does not (context_note, label,
// priority label, lock fields) live under metadata.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;

// Optional write key for the gated queue mutations (tasks:update, tasks:queue,
// tasks:logEvent). Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined;

// Columns the queue row carries. Anything else in a patch goes to metadata.
const ROW_FIELDS = new Set([
  'title', 'text', 'description', 'status', 'source', 'client_id', 'project', 'project_path',
  'priority', 'sort_order', 'agent', 'agent_identity', 'builder', 'planner', 'complexity',
  'created_by', 'created_at', 'started_at', 'completed_at', 'worker_id', 'result', 'error',
  'qa_score', 'token_cost', 'metadata',
]);
const STATUS_MAP = { active: 'queued', completed: 'done', deleted: 'cancelled', superseded: 'cancelled', todo: 'queued' };
const PRIORITY_MAP = { high: 100, med: 50, medium: 50, low: 10 };

function toQueuePatch(body) {
  const patch = {};
  const meta = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (k === 'status') { patch.status = STATUS_MAP[v] || v; continue; }
    if (ROW_FIELDS.has(k)) patch[k] = v;
    else meta[k] = v;
  }
  if (Object.keys(meta).length) patch.metadata = { ...(patch.metadata || {}), ...meta };
  return patch;
}

// The world that owns a task row. Read off the row, never from the caller.
async function taskById(taskId) {
  if (!taskId) return null;
  try { return await convexQuery('tasks:get', { id: taskId }); } catch { return null; }
}

async function patchTask(taskId, body) {
  const rows = await convexMutation('tasks:update', { key: CONVEX_KEY, id: taskId, patch: toQueuePatch(body) });
  return Array.isArray(rows) ? rows : [];
}

async function logEvent(agent, eventType, description, taskId, extra = {}) {
  try {
    const payload = { description: description || '', ...extra };
    if (taskId) payload.task_id = taskId;
    await convexMutation('tasks:logEvent', { key: CONVEX_KEY, event: { agent: agent || 'system', event_type: eventType, payload } });
  } catch {}
}

// Find a task by text match (when we don't have a uuid), newest first.
async function findTaskByText(text, clientId) {
  try {
    const rows = await convexQuery('tasks:find', { client_id: clientId, order: 'created_at.desc' });
    return (Array.isArray(rows) ? rows : []).find((t) => t.text === text || t.title === text) || null;
  } catch { return null; }
}

// May this world queue work under this project? A task runs a brief inside
// that project's checkout, so the project must be one this world already
// reaches: the holder world, a grant, or a world admin. A slug nobody has
// registered is refused; a first claim admits a chat tag, never a checkout.
async function authorizeTaskProject({ clientId, isAdmin, projectSlug }) {
  const slug = String(projectSlug || '').trim().toLowerCase();
  if (!slug) return { ok: true, via: 'no-scope' };
  if (isAdmin) return { ok: true, via: 'world-admin' };
  const access = await convexQuery('projects:hasAccess', { slug, worldId: clientId }).catch(() => null);
  if (access?.ok) return { ok: true, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' };
  const registered = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null);
  if (!registered) {
    return { ok: false, via: 'first-claim-not-a-checkout', reason: `project "${slug}" is not registered, so nothing proves whose checkout it is. Register the project before queueing work under it.` };
  }
  return { ok: false, via: 'denied', reason: `project "${slug}" belongs to world "${registered.ownerWorld}"` };
}

function taskScopeDenialMessage({ clientId, projectSlug, reason }) {
  return (
    `forbidden: world "${clientId}" may not queue work under project "${projectSlug}": ${reason}. ` +
    `A queued task runs a brief inside that project's checkout, so the project must be one this world already reaches.`
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, taskText, taskId, agent, payload, clientId: rawClientId, project } = req.body || {};
  const requestedTenant = (rawClientId || '').toString().trim().toLowerCase();

  // World gate: when the caller names a task id, the world that owns that row
  // is the world we gate on, and the verified world is pinned onto every
  // write so a borrowed uuid cannot reach outside it.
  const row = (taskId && UUID_RE.test(taskId)) ? await taskById(taskId) : null;
  const rowWorld = row?.client_id ? String(row.client_id).toLowerCase() : null;
  let verified;
  try {
    verified = await verifyTenant(rowWorld || requestedTenant, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  const clientId = verified.tenant;
  const isAdmin = !!verified.isAdmin;

  if (!action) return res.status(400).json({ error: 'action required' });

  // startRunner: signal the watcher + reclaim stale tasks in this world.
  if (action === 'startRunner') {
    try {
      const now = new Date().toISOString();
      await logEvent('system', 'runner_start_requested', '', null, { source: 'tasks-tab', requested_at: now });
      // Stuck in building/running for more than 10 minutes goes back to queued.
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      const stale = await convexQuery('tasks:find', { client_id: clientId, status_in: ['building', 'running'] }).catch(() => []);
      let reclaimed = 0;
      for (const t of Array.isArray(stale) ? stale : []) {
        const stamp = Date.parse(t.started_at || t.created_at || '');
        if (!Number.isFinite(stamp) || stamp >= tenMinAgo) continue;
        await convexMutation('tasks:update', { key: CONVEX_KEY, id: t.id, require_status: t.status, patch: { status: 'queued', worker_id: null } });
        reclaimed += 1;
      }
      return res.status(200).json({ ok: true, action: 'startRunner', reclaimed });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (!taskText && !taskId) return res.status(400).json({ error: 'taskText or taskId required' });

  try {
    // Identify the row: uuid first, else the newest row with this text.
    let target = row;
    if (!target && taskText) target = await findTaskByText(taskText, clientId);
    if (target && String(target.client_id || '').toLowerCase() !== clientId) {
      return res.status(403).json({ error: 'task belongs to another world' });
    }
    const id = target?.id || null;
    const patch = async (body) => (id ? patchTask(id, body) : []);

    switch (action) {
      case 'toggle': {
        const isDone = payload === true || payload === 'done';
        const body = isDone
          ? { status: 'done', completed_at: new Date().toISOString() }
          : { status: 'queued', completed_at: null };
        return res.status(200).json({ ok: true, action: 'toggle', result: await patch(body) });
      }

      case 'reassign': {
        if (!payload) return res.status(400).json({ error: 'payload (agent slug) required for reassign' });
        return res.status(200).json({ ok: true, action: 'reassign', result: await patch({ agent: payload, agent_identity: payload }) });
      }

      case 'delete': {
        // Soft delete: the row stays, marked cancelled and hidden.
        return res.status(200).json({ ok: true, action: 'delete', result: await patch({ status: 'cancelled', deleted: true, dismissed: true }) });
      }

      case 'priority': {
        if (!payload) return res.status(400).json({ error: 'payload (priority) required' });
        const label = String(payload).toLowerCase();
        const numeric = Number.isFinite(Number(payload)) ? Number(payload) : (PRIORITY_MAP[label] ?? 50);
        return res.status(200).json({ ok: true, action: 'priority', result: await patch({ priority: numeric, priority_label: label }) });
      }

      case 'moveToProject': {
        if (!payload) return res.status(400).json({ error: 'payload (project) required for moveToProject' });
        // tasks.project is a checkout selector, not a label, so the
        // destination has to be a project this world already reaches.
        const destSlug = String(payload).trim().toLowerCase();
        const verdict = await authorizeTaskProject({ clientId, isAdmin, projectSlug: destSlug });
        if (!verdict.ok) {
          console.warn(`[task-action] moveToProject DENIED: tenant "${clientId}" slug "${destSlug}": ${verdict.reason}`);
          return res.status(403).json({
            error: taskScopeDenialMessage({ clientId, projectSlug: destSlug, reason: verdict.reason }),
            code: 'PROJECT_SCOPE_DENIED',
          });
        }
        return res.status(200).json({ ok: true, action: 'moveToProject', result: await patch({ project: destSlug }) });
      }

      case 'addContext': {
        if (!payload) return res.status(400).json({ error: 'payload (note) required for addContext' });
        return res.status(200).json({ ok: true, action: 'addContext', result: await patch({ context_note: payload }) });
      }

      case 'addToRightNow': {
        // If the task exists, flip it to queued. If not, create it queued.
        let addResult;
        if (id) {
          addResult = await patch({ status: 'queued' });
        } else {
          let projectSlug = (project || '').trim().toLowerCase() || null;
          // Same gate as every other task writer. Denied means the task is
          // still created, just unscoped (it has no checkout to steer).
          if (projectSlug) {
            const verdict = await authorizeTaskProject({ clientId, isAdmin, projectSlug });
            if (!verdict.ok) {
              console.warn(`[task-action] addToRightNow project DENIED: tenant "${clientId}" slug "${projectSlug}": ${verdict.reason}`);
              projectSlug = null;
            }
          }
          const created = await convexMutation('tasks:queue', {
            key: CONVEX_KEY,
            row: {
              title: String(taskText).slice(0, 200),
              text: taskText,
              agent: agent || 'elon',
              agent_identity: agent || 'elon',
              status: 'queued',
              source: 'user',
              client_id: clientId,
              ...(projectSlug ? { project: projectSlug } : {}),
              created_by: verified.email || verified.userName || null,
            },
          });
          addResult = created ? [created] : [];
        }
        await logEvent(agent || 'elon', 'task_started', taskText, id || (addResult[0] && addResult[0].id) || null);
        return res.status(200).json({ ok: true, action: 'addToRightNow', result: addResult });
      }

      case 'markDone': {
        const result = await patch({ status: 'done', completed_at: new Date().toISOString() });
        await logEvent(agent || 'elon', 'task_completed', taskText, id);
        return res.status(200).json({ ok: true, action: 'markDone', result });
      }

      case 'markUndone': {
        return res.status(200).json({ ok: true, action: 'markUndone', result: await patch({ status: 'queued', completed_at: null }) });
      }

      case 'approve': {
        // Patrik approved a done task.
        return res.status(200).json({ ok: true, action: 'approve', result: await patch({ status: 'done', approved: true, completed_at: new Date().toISOString() }) });
      }

      case 'reject': {
        // Patrik rejected a done task: back to the queue so the agent can redo it.
        return res.status(200).json({ ok: true, action: 'reject', result: await patch({ status: 'queued', approved: false, completed_at: null }) });
      }

      case 'editText': {
        if (!payload || typeof payload !== 'string' || !payload.trim()) {
          return res.status(400).json({ error: 'payload (new text) required for editText' });
        }
        return res.status(200).json({ ok: true, action: 'editText', result: await patch({ text: payload.trim() }) });
      }

      case 'setLabel': {
        const validLabels = ['bug', 'feature', 'polish', 'urgent', 'blocked'];
        const labelValue = payload && validLabels.includes(payload) ? payload : null;
        return res.status(200).json({ ok: true, action: 'setLabel', result: await patch({ label: labelValue }) });
      }

      case 'dismiss': {
        // Hide a task without rewriting its history: keep status and error,
        // merge metadata.dismissed=true. A task not yet in a terminal state is
        // cancelled so it stops being worked, but 'failed' is never overwritten.
        const current = target || { status: null };
        const TERMINAL = new Set(['failed', 'done', 'cancelled']);
        const body = TERMINAL.has(String(current.status || '').toLowerCase())
          ? { dismissed: true }
          : { status: 'cancelled', dismissed: true };
        return res.status(200).json({ ok: true, action: 'dismiss', result: await patch(body) });
      }

      case 'requeue': {
        // Build retry context from the previous failure and put it back in line.
        const prev = target || {};
        const prevMeta = (prev.metadata && typeof prev.metadata === 'object') ? prev.metadata : {};
        const prevNotes = prevMeta.qa_notes || '';
        const prevError = prev.error || '';
        let retryHint = '';
        if (prevNotes) retryHint += `Previous QA notes: ${prevNotes}\n`;
        if (prevError) retryHint += `Previous error: ${prevError}\n`;
        if (retryHint) retryHint = `\n\n--- RETRY CONTEXT (fix these issues) ---\n${retryHint}`;

        const updates = {
          status: 'queued',
          qa_score: null,
          error: null,
          worker_id: null,
          requeue_count: (prevMeta.requeue_count || 0) + 1,
        };
        if (retryHint && prev.description) {
          updates.description = prev.description.replace(/\n\n--- RETRY CONTEXT.*$/s, '') + retryHint;
        }
        const result = await patch(updates);
        await logEvent('system', 'runner_start_requested', '', id, { source: 'requeue', requested_at: new Date().toISOString() });
        return res.status(200).json({ ok: true, action: 'requeue', result });
      }

      case 'resume': {
        // Human replied to a waiting task: store the answer, requeue for the runner.
        const answer = typeof payload === 'string' ? payload : payload?.answer;
        if (!answer) return res.status(400).json({ error: 'resume requires an answer in payload' });
        const prevMeta = (target?.metadata && typeof target.metadata === 'object') ? target.metadata : {};
        const checkpoint = { ...(prevMeta.checkpoint || {}), answer, answered_at: new Date().toISOString() };
        const result = await patch({ status: 'queued', worker_id: null, checkpoint });
        await logEvent('system', 'runner_start_requested', '', id, { source: 'checkpoint-resume', requested_at: new Date().toISOString() });
        return res.status(200).json({ ok: true, action: 'resume', result });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[task-action] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
