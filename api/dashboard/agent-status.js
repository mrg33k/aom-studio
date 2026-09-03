// PATCH /api/dashboard/agent-status?slug=bobby&status=active&current_task=Responding...&client_id=aom
// PATCH /api/dashboard/agent-status?table=tasks&id=xxx&status=active&client_id=aom  (task update mode)
// PATCH /api/dashboard/agent-status?slug=bobby&name=Bobby&client_id=aom             (rename)
// PATCH /api/dashboard/agent-status?slug=ea&display_name=Sam&client_id=aom          (EA display name)
// PATCH /api/dashboard/agent-status?slug=ea&last_naming_nudge_at=now&client_id=aom  (EA cadence)
// POST  /api/dashboard/agent-status  { agent, text, project, status?, client_id }   (create a task)
//
// corner:retire-supabase (2026-09-03): every write goes to Convex.
//   agent status         -> agents:setStatus  (idle | working | blocked | offline)
//   tasks                -> tasks:get / tasks:find / tasks:update / tasks:queue
//   rename               -> rooms:setTitle + projects:update + agents:upsert
//   EA display name and naming nudge -> state:put (kind agent_meta)
// The Supabase agent_status table carried many status words; they collapse
// onto the four Convex ones (see mapAgentStatus). Callers keep the same URL
// shape and the same { ok } answer.
//
// AUTH (corner:identity-attribution, 2026-07-27). Every write path resolves a
// tenant and runs verifyTenant against it, and CORS is the dashboard origins
// rather than `*`.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// Verify the caller against `tenant`; on failure writes the response and
// returns null. On success returns the verified tenant string.
async function gate(tenant, req, res) {
  try {
    const { tenant: verified } = await verifyTenant(tenant, req);
    return verified;
  } catch (err) {
    if (err instanceof TenantAuthError) {
      res.status(err.status).json({ error: err.message });
      return null;
    }
    throw err;
  }
}

// The old status vocabulary collapses onto what the Convex agents row holds.
function mapAgentStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (['idle', 'done', 'paused', 'waiting', 'offline'].includes(s)) return s === 'offline' ? 'offline' : 'idle';
  if (['error', 'blocked', 'needs_input'].includes(s)) return 'blocked';
  if (['active', 'working', 'building', 'qa', 'responding', 'planning', 'classifying'].includes(s)) return 'working';
  return null;
}

// The old tasks vocabulary onto the Convex queue's.
const TASK_STATUSES = new Set(['queued', 'running', 'building', 'done', 'failed', 'needs_input', 'blocked', 'cancelled']);
function mapTaskStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (TASK_STATUSES.has(s)) return s;
  if (s === 'active' || s === 'qa' || s === 'planning' || s === 'classifying') return 'running';
  if (s === 'error') return 'failed';
  if (s === 'todo' || s === 'waiting' || s === 'paused') return 'blocked';
  return null;
}

// Is this world allowed to queue work under this project? The project must be
// registered and reachable (holder world or a grant). A slug nobody registered
// does not name a checkout, so it never gets one (taskScope rule, kept).
async function taskProjectOk(slug, world) {
  try {
    const verdict = await convexQuery('projects:hasAccess', { slug, worldId: world });
    return !!(verdict && verdict.ok);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: create a new task
  if (req.method === 'POST') {
    const { agent, text, project, status: taskStatus = 'todo', client_id } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!client_id || !String(client_id).trim()) return res.status(401).json({ error: 'Missing client' });
    const resolvedClientId = await gate(String(client_id).trim().toLowerCase(), req, res);
    if (!resolvedClientId) return;
    const identity = await callerIdentity(req).catch(() => null);
    // The project steers which checkout the runner uses, so it is gated like
    // every other task writer. Denied means the task is still created, with no
    // project: nothing is lost, it just steers no repo.
    let taskProject = (project || '').toString().trim().toLowerCase() || null;
    if (taskProject && !(await taskProjectOk(taskProject, resolvedClientId))) {
      console.warn(`[agent-status] task project DENIED: tenant "${resolvedClientId}" slug "${taskProject}"`);
      taskProject = null;
    }
    const mapped = mapTaskStatus(taskStatus) || 'blocked';
    try {
      const task = await convexMutation('tasks:queue', {
        row: {
          title: String(text).trim().split('\n')[0].slice(0, 240),
          text: String(text).trim(),
          status: mapped,
          source: 'agent-status',
          agent: agent || 'elon',
          project: taskProject,
          client_id: resolvedClientId,
          created_by: identity?.userId || identity?.email || undefined,
          metadata: {
            requested_status: String(taskStatus),
            // 'todo' rows sit parked until task-action requeues them, same as before.
            ...(mapped === 'blocked' && mapTaskStatus(taskStatus) === 'blocked' ? { parked: true } : {}),
            ...(identity?.userName ? { user_name: identity.userName } : {}),
          },
        },
      });
      return res.status(200).json({ ok: true, task });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'PATCH or POST only' });

  const { table, slug, status, current_task, id, agent } = req.query;

  // Every PATCH mode is world-scoped. `client_id` in the query is the
  // REQUESTED world; verifyTenant turns it into a verified one, and the verified
  // value is what scopes the write.
  const _requestedRaw = req.query.client_id && String(req.query.client_id).trim();
  if (!_requestedRaw) return res.status(401).json({ error: 'Missing client' });
  const requestedClient = _requestedRaw.toLowerCase();

  // Task update mode
  if (table === 'tasks') {
    if (!status) return res.status(400).json({ error: 'status required' });
    const mapped = mapTaskStatus(status);
    if (!mapped) return res.status(400).json({ error: `unknown task status: ${status}` });
    const patch = { status: mapped };
    if (mapped === 'done') patch.completed_at = new Date().toISOString();
    if (!id && !agent) return res.status(400).json({ error: 'id or agent required' });
    try {
      if (id) {
        // Prefer the ROW's own world: the caller does not get to name the
        // tenant of a row they are mutating.
        const row = await convexQuery('tasks:get', { id: String(id) });
        if (!row) return res.status(404).json({ error: 'task not found' });
        const tenant = await gate(String(row.client_id || requestedClient).toLowerCase(), req, res);
        if (!tenant) return;
        const updated = await convexMutation('tasks:update', { id: String(id), patch });
        return res.status(200).json({ ok: Array.isArray(updated) && updated.length > 0 });
      }
      // agent mode: promote that agent's parked rows.
      const tenant = await gate(requestedClient, req, res);
      if (!tenant) return;
      const rows = await convexQuery('tasks:find', { client_id: tenant, status: 'blocked' });
      const mine = (Array.isArray(rows) ? rows : []).filter((r) => r.agent === String(agent) && r.metadata && r.metadata.parked);
      for (const r of mine) await convexMutation('tasks:update', { id: r.id, patch: { ...patch, metadata: { parked: false } } });
      return res.status(200).json({ ok: true, updated: mine.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Default: agent status update
  // Supports: status, current_task, name (rename), display_name (EA user-set name),
  //           last_naming_nudge_at (EA cadence tracking), client_id scoping
  const { name, display_name, last_naming_nudge_at } = req.query;

  // All agent modes below share one gate + one scope.
  const clientIdParam = await gate(requestedClient, req, res);
  if (!clientIdParam) return;
  // A shared room is not a world; agents and rooms live in the caller's world.
  const world = clientIdParam.startsWith('shared:')
    ? ((await callerIdentity(req).catch(() => null))?.world || clientIdParam)
    : clientIdParam;

  // Rename-only mode: slug + name, no status required.
  // The same slug may refer to either an agent or a project (the chat
  // settings UI does not tell us which), so every place a name shows up is
  // patched. A non-matching slug is a no-op, which keeps the call cheap and
  // correct in both cases.
  if (slug && name && !status) {
    const trimmedName = String(name).trim();
    const key = String(slug).trim().toLowerCase();
    let touched = 0;
    try {
      // Agent room and project room titles (the rail and canvas labels).
      for (const kind of ['agent', 'project']) {
        try {
          const room = await convexQuery('rooms:resolveCanonical', { worldSlug: world, kind, key });
          if (room && room._id) {
            await convexMutation('rooms:setTitle', { roomId: room._id, title: trimmedName });
            touched++;
          }
        } catch { /* no room of that kind */ }
      }
      // Project registry name (drawer list + project-chat header).
      try {
        const r = await convexMutation('projects:update', { slug: key, worldId: world, patch: { name: trimmedName } });
        if (r && r.ok) touched++;
      } catch { /* not a project */ }
      // Agent roster title. Only patch an agent that already exists: upsert
      // would otherwise mint a new agent for a project slug.
      try {
        const roster = await convexQuery('agents:listStatus', { worldId: world, includeInactive: true });
        if ((Array.isArray(roster) ? roster : []).some((a) => a.slug === key)) {
          await convexMutation('agents:upsert', { slug: key, title: trimmedName, worldId: world });
          touched++;
        }
      } catch { /* roster read failed; the room title above still changed */ }
      return res.status(200).json({ ok: true, touched });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // EA display_name and naming-nudge cadence live in keyed state per agent.
  async function patchAgentMeta(key, patch) {
    const existing = await convexQuery('state:get', { kind: 'agent_meta', scopeId: key, worldId: world });
    const value = { ...((existing && existing.value) || {}), ...patch };
    await convexMutation('state:put', { kind: 'agent_meta', scopeId: key, worldId: world, value, updatedBy: 'agent-status' });
    return value;
  }

  if (slug && display_name !== undefined && !status && !name) {
    const trimmedName = String(display_name).trim();
    try {
      await patchAgentMeta(String(slug).trim().toLowerCase(), { display_name: trimmedName || null, display_name_at: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (slug && last_naming_nudge_at !== undefined && !status && !name && display_name === undefined) {
    const ts = last_naming_nudge_at === 'now' ? new Date().toISOString() : String(last_naming_nudge_at);
    try {
      await patchAgentMeta(String(slug).trim().toLowerCase(), { last_naming_nudge_at: ts });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (!slug || !status) {
    return res.status(400).json({ error: 'slug and status required' });
  }

  const mapped = mapAgentStatus(status);
  if (!mapped) return res.status(400).json({ error: `unknown status: ${status}` });

  try {
    const result = await convexMutation('agents:setStatus', {
      slug: String(slug).trim().toLowerCase(),
      status: mapped,
      ...(current_task !== undefined ? { currentTask: String(current_task) || null } : {}),
      worldId: world,
    });
    // An unknown slug is a no-op on Convex (ok:false, reason). Keep the old
    // truthful { ok } answer rather than a 500.
    return res.status(200).json({ ok: !!(result && result.ok), ...(result && result.reason ? { reason: result.reason } : {}) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
