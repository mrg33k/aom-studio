// POST /api/dashboard/retry-task
// Re-queue a failed task as a NEW queued task row that references the failed
// row via metadata.parent_id. Inherits title/text/description/project/agent
// and metadata.model from the failed row so the worker runs the same brief.
// R5b — failure-card UX: one-click retry from the dashboard.
//
// Body: { taskId: <failed-row-uuid> }
// Returns: { ok: true, newTask: {...} }
//
// AUTH (corner:identity-attribution, 2026-07-27). A retry re-queues a brief that
// a live Claude Code worker then executes, and explicitly wakes the runner. Task
// UUIDs leak through several read surfaces, so the UUID is not a secret. The
// task's own client_id is now resolved first and verifyTenant runs against it,
// so only someone in the owning world can re-run the work. CORS is the dashboard
// origins rather than `*`.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const { taskId } = req.body || {};
  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'valid taskId required' });
  }

  try {
    const fetchResp = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}&select=id,title,text,description,project,agent,client_id,created_by,source,metadata,error,status`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
    );
    if (!fetchResp.ok) {
      const errText = await fetchResp.text();
      return res.status(502).json({ error: `Supabase fetch failed: ${errText}` });
    }
    const rows = await fetchResp.json();
    const failed = Array.isArray(rows) && rows[0];
    if (!failed) return res.status(404).json({ error: 'task not found' });

    // Gate on the world that OWNS the task, read off the row — never on
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
    const crypto = await import('crypto');
    const now = new Date().toISOString();

    const retryCount = (prevMeta.retry_count || 0) + 1;
    const newRow = {
      id: crypto.randomUUID(),
      title: failed.title || null,
      text: failed.text || null,
      description: failed.description || null,
      status: 'queued',
      source: 'retry',
      client_id: verified.tenant,
      created_by: failed.created_by || null,
      project: failed.project || null,
      agent: failed.agent || null,
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
        // Who pressed retry — verified, and null rather than a borrowed name.
        retried_by: identity?.userId || verified.userId || null,
        retried_by_name: identity?.userName || null,
      },
    };

    const postResp = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(newRow),
    });
    if (!postResp.ok) {
      const errText = await postResp.text();
      return res.status(502).json({ error: `Supabase insert failed: ${errText}` });
    }
    const inserted = await postResp.json();
    const newTask = Array.isArray(inserted) && inserted[0] ? inserted[0] : newRow;

    // Wake the runner so the retry is claimed promptly.
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          agent: 'system',
          event_type: 'runner_start_requested',
          payload: { source: 'retry-task', parent_task_id: failed.id, new_task_id: newTask.id, requested_at: now },
          timestamp: now,
        }),
      });
    } catch {}

    return res.status(200).json({ ok: true, newTask });
  } catch (err) {
    console.error('[retry-task] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
