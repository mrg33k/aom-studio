// POST /api/dashboard/retry-task
// Re-queue a failed task as a NEW queued task row that references the failed
// row via metadata.parent_id. Inherits title/text/description/project/agent
// and metadata.model from the failed row so the worker runs the same brief.
// R5b: failure-card UX, one-click retry from the dashboard.
//
// corner:retire-supabase (2026-09-03): reads and writes the Convex task queue
// (tasks:get, tasks:queue, tasks:logEvent). Was the Supabase tasks and events
// tables.
//
// Body: { taskId: <failed-row-uuid> }
// Returns: { ok: true, newTask: {...} }
//
// AUTH (corner:identity-attribution, 2026-07-27). A retry re-queues a brief that
// a live Claude Code worker then executes, and explicitly wakes the runner. Task
// UUIDs leak through several read surfaces, so the UUID is not a secret. The
// task's own client_id is resolved first and verifyTenant runs against it, so
// only someone in the owning world can re-run the work. CORS is the dashboard
// origins rather than `*`.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { taskId } = req.body || {};
  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'valid taskId required' });
  }

  try {
    let failed;
    try {
      failed = await convexQuery('tasks:get', { id: taskId });
    } catch (err) {
      return res.status(502).json({ error: `task fetch failed: ${err.message}` });
    }
    if (!failed) return res.status(404).json({ error: 'task not found' });

    // Gate on the world that OWNS the task, read off the row, never on
    // anything the caller supplied.
    const _rowClient = failed.client_id && String(failed.client_id).trim();
    if (!_rowClient) return res.status(401).json({ error: 'Missing client' });
    let verified;
    try {
      verified = await verifyTenant(_rowClient.toLowerCase(), req);
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    const identity = await callerIdentity(req).catch(() => null);

    const prevMeta = (failed.metadata && typeof failed.metadata === 'object') ? failed.metadata : {};
    const now = new Date().toISOString();

    const retryCount = (prevMeta.retry_count || 0) + 1;
    const row = {
      title: failed.title || 'Untitled task',
      status: 'queued',
      source: 'retry',
      client_id: verified.tenant,
      project: failed.project || null,
      created_at: now,
      metadata: {
        model: prevMeta.model || 'sonnet',
        repo: prevMeta.repo || null,
        parent_id: failed.id,
        parent_task_id: failed.id,
        kind: 'retry',
        created_via: 'dashboard-retry',
        retry_count: retryCount,
        retry_of_error: failed.error || null,
        requested_by_agent: prevMeta.requested_by_agent || null,
        // Who pressed retry: verified, and null rather than a borrowed name.
        retried_by: identity?.userId || verified.userId || null,
        retried_by_name: identity?.userName || null,
      },
    };
    // The queue validator refuses undefined fields; copy only what is set.
    if (failed.text) row.text = failed.text;
    if (failed.description) row.description = failed.description;
    if (failed.agent) row.agent = failed.agent;
    if (failed.created_by) row.created_by = failed.created_by;
    if (failed.project_path) row.project_path = failed.project_path;

    let newTask;
    try {
      newTask = await convexMutation('tasks:queue', { row });
    } catch (err) {
      return res.status(502).json({ error: `task insert failed: ${err.message}` });
    }
    if (!newTask) newTask = row;

    // Wake the runner so the retry is claimed promptly.
    try {
      await convexMutation('tasks:logEvent', {
        event: {
          agent: 'system',
          event_type: 'runner_start_requested',
          payload: { source: 'retry-task', parent_task_id: failed.id, new_task_id: newTask.id, requested_at: now },
          timestamp: now,
        },
      });
    } catch {}

    return res.status(200).json({ ok: true, newTask });
  } catch (err) {
    console.error('[retry-task] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
