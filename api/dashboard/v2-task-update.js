// PATCH /api/dashboard/v2-task-update
// Updates a task in the Convex queue with state-machine enforcement
// (corner:retire-supabase R2, 2026-09-03; was Supabase REST).
//
// Auth: gated on the task's own client_id, resolved from the row before any
// write. A member of the owning world passes without being an admin; every
// other world is refused.
//
// Writes go through tasks:update with require_status set to the status we
// read, so a concurrent transition (the runner claiming the row) makes this
// patch a no-op instead of a silent overwrite. Fields the queue row does not
// carry as columns (qa_notes, attempt_count) live under metadata.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

// Optional write key for the gated queue mutations (tasks:update,
// tasks:logEvent). Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined;

const TRANSITIONS = {
  queued: ['classifying', 'running'],
  classifying: ['planning', 'building'],
  planning: ['building'],
  running: ['done', 'failed', 'building'],
  building: ['qa'],
  qa: ['done', 'building'],
  failed: ['queued', 'superseded'],
};

// Statuses the queue stores. The old dashboard names map onto them; the
// original name is kept under metadata.stage so nothing is lost.
const QUEUE_STATUSES = new Set(['queued', 'running', 'building', 'done', 'failed', 'needs_input', 'blocked', 'cancelled']);
const STAGE_MAP = { classifying: 'running', planning: 'running', qa: 'building', superseded: 'cancelled' };

// Auto-supersede failed duplicates: when a task completes, failed tasks in the
// same world with similar titles (50% keyword overlap or more) are cancelled
// and marked superseded. Fully non-fatal.
const STOP_WORDS = new Set([
  'the','and','for','with','from','that','this','not','are','was','has','have',
  'been','will','task','fix','feat','add','all','show','must','code','change',
]);

function extractKeywords(title) {
  return (title || '').split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

async function supersedeFailedDuplicates(taskId, taskTitle, clientId) {
  try {
    const keywords = extractKeywords(taskTitle);
    if (keywords.length === 0) return;
    const failedTasks = await convexQuery('tasks:find', { client_id: clientId, status: 'failed', order: 'created_at.desc', limit: 30 });
    let count = 0;
    for (const ft of Array.isArray(failedTasks) ? failedTasks : []) {
      if (ft.id === taskId) continue;
      const ftTitle = (ft.title || '').toLowerCase();
      const matches = keywords.filter(w => ftTitle.includes(w)).length;
      if (matches / keywords.length >= 0.5) {
        await convexMutation('tasks:update', {
          key: CONVEX_KEY, id: ft.id, require_status: 'failed',
          patch: { status: 'cancelled', metadata: { stage: 'superseded', superseded_by: taskId } },
        });
        count++;
      }
    }
    if (count > 0) console.log(`[v2-task-update] Superseded ${count} failed task(s) matching "${taskTitle}"`);
  } catch (err) {
    console.error('[v2-task-update] Supersede check failed (non-fatal):', err.message);
  }
}

async function postInvestigationTrigger(taskId, taskRow) {
  if (!taskId) return;
  try {
    const logSourceUrl = `/api/dashboard/v2-task-list?taskId=${encodeURIComponent(taskId)}&include=thread`;
    await convexMutation('tasks:logEvent', {
      key: CONVEX_KEY,
      event: {
        agent: (taskRow && taskRow.agent_identity) || 'system',
        event_type: 'investigation_trigger',
        payload: {
          task_id: String(taskId),
          client_id: (taskRow && taskRow.client_id) || '',
          log_source_url: logSourceUrl,
        },
      },
    });
  } catch (err) {
    console.error('[v2-task-update] Failed to emit investigation_trigger (non-fatal):', err.message);
  }
}

function hasField(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function toNumberIfFinite(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return value;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : value;
  }
  return value;
}

export default async function handler(req, res) {
  applyCors(req, res, 'PATCH');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'PATCH only' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { taskId } = body;

  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'taskId (UUID) required' });
  }

  let current;
  try {
    current = await convexQuery('tasks:get', { id: taskId });
  } catch (err) {
    return res.status(502).json({ error: `task lookup failed: ${err.message}` });
  }
  if (!current) return res.status(404).json({ error: 'task not found' });

  // Authorize against the task's own world before touching anything.
  const taskWorld = String(current.client_id || '').trim().toLowerCase();
  if (!taskWorld) {
    return res.status(409).json({ error: 'task has no client_id; cannot authorize' });
  }
  try {
    await verifyTenant(taskWorld, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return sendAuthError(res, err);
    return res.status(500).json({ error: err?.message || 'auth check failed' });
  }

  try {
    const updateBody = {};
    const metaPatch = {};

    if (hasField(body, 'priority')) updateBody.priority = toNumberIfFinite(body.priority);
    if (hasField(body, 'sort_order')) updateBody.sort_order = toNumberIfFinite(body.sort_order);
    if (hasField(body, 'agent_identity')) updateBody.agent_identity = body.agent_identity;
    if (hasField(body, 'result')) updateBody.result = body.result;
    if (hasField(body, 'error')) updateBody.error = body.error;
    if (hasField(body, 'qa_score')) updateBody.qa_score = toNumberIfFinite(body.qa_score);
    if (hasField(body, 'qa_notes')) metaPatch.qa_notes = body.qa_notes;
    if (hasField(body, 'token_cost')) updateBody.token_cost = toNumberIfFinite(body.token_cost);

    const currentMeta = (current.metadata && typeof current.metadata === 'object') ? current.metadata : {};
    // The stage a caller sees: the finer old name when one was recorded, else
    // the queue status.
    const currentStage = currentMeta.stage || current.status || null;
    const statusProvided = hasField(body, 'status');
    if (statusProvided) {
      if (typeof body.status !== 'string' || !body.status.trim()) {
        return res.status(400).json({ error: 'status must be a non-empty string' });
      }

      const nextStage = body.status.trim();
      const allowedTransitions = new Set([...(TRANSITIONS[currentStage] || []), 'failed']);
      const isSameStatus = nextStage === currentStage;

      if (!isSameStatus && !allowedTransitions.has(nextStage)) {
        return res.status(400).json({
          error: 'Invalid status transition',
          currentStatus: currentStage,
          allowedTransitions: Array.from(allowedTransitions),
        });
      }

      const queueStatus = QUEUE_STATUSES.has(nextStage) ? nextStage : (STAGE_MAP[nextStage] || nextStage);
      if (!QUEUE_STATUSES.has(queueStatus)) {
        return res.status(400).json({ error: `status "${nextStage}" has no queue status` });
      }
      updateBody.status = queueStatus;
      metaPatch.stage = nextStage;

      if (!isSameStatus) {
        const now = new Date().toISOString();

        if (nextStage === 'building' || nextStage === 'running') {
          if (!current.started_at) updateBody.started_at = now;
          const prevAttempt = Number(currentMeta.attempt_count) || 0;
          metaPatch.attempt_count = prevAttempt + 1;
        }

        if (nextStage === 'done') {
          updateBody.completed_at = now;
        }

        if (nextStage === 'failed') {
          updateBody.error = hasField(body, 'error') ? body.error : null;
        }
      }
    }

    if (Object.keys(metaPatch).length) updateBody.metadata = metaPatch;
    if (Object.keys(updateBody).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await convexMutation('tasks:update', {
      key: CONVEX_KEY,
      id: taskId,
      require_status: current.status,
      patch: updateBody,
    });
    const updated = Array.isArray(result) ? result[0] : result;
    if (!updated) {
      return res.status(409).json({ error: 'task changed underneath this update; reload and try again', currentStatus: current.status });
    }

    if (updateBody.status === 'failed' && current.status !== 'failed') {
      postInvestigationTrigger(taskId, updated || current).catch(() => {});
    }

    // Fire-and-forget: supersede failed duplicates when a task completes.
    if (updateBody.status === 'done') {
      supersedeFailedDuplicates(taskId, current.title, taskWorld).catch(() => {});
    }

    return res.status(200).json(updated || null);
  } catch (err) {
    console.error('[v2-task-update] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
