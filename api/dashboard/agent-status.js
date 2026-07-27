// PATCH /api/dashboard/agent-status?slug=bobby&status=active&current_task=Responding...
// PATCH /api/dashboard/agent-status?table=tasks&id=xxx&status=active  (task update mode)
// Combined endpoint: updates agent_status OR tasks table in Supabase.
//
// AUTH (corner:identity-attribution, 2026-07-27). Both verbs wrote into a
// world-scoped surface with no credential: POST inserted a tasks row into any
// world named by the body, PATCH mutated any agent_status or tasks row by id.
// Every write path now resolves a tenant and runs verifyTenant against it, and
// CORS is the dashboard origins rather than `*`.

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

// Look up the owning world of a row so PATCH can be gated on it.
async function clientIdOfRow(table, id) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=client_id&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!r.ok) return null;
    const rows = await r.json();
    const c = Array.isArray(rows) ? rows[0]?.client_id : null;
    return c ? String(c).toLowerCase() : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: create a new task (merged from supabase-tasks.js)
  if (req.method === 'POST') {
    const { agent, text, project, status: taskStatus = 'todo', client_id } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const resolvedClientId = await gate(client_id || 'aom', req, res);
    if (!resolvedClientId) return;
    const identity = await callerIdentity(req).catch(() => null);
    const crypto = await import('crypto');
    const payload = {
      id: crypto.randomUUID(),
      agent: agent || 'elon',
      text: text.trim(),
      project: project || null,
      status: taskStatus,
      client_id: resolvedClientId,
      created_by: identity?.userId || null,
    };
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const inserted = await r.json();
      return res.status(200).json({ ok: true, task: inserted[0] || payload });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'PATCH or POST only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  const { table, slug, status, current_task, id, agent } = req.query;

  // Every PATCH mode is world-scoped now. `client_id` in the query is the
  // REQUESTED world; verifyTenant turns it into a verified one, and the verified
  // value is what goes into the row filter — so a slug-only PATCH can no longer
  // rewrite the same-named row in every world at once.
  const requestedClient = (req.query.client_id && String(req.query.client_id).trim())
    ? String(req.query.client_id).trim().toLowerCase()
    : 'aom';

  // Task update mode: PATCH tasks table
  if (table === 'tasks') {
    if (!status) return res.status(400).json({ error: 'status required' });
    const body = { status };
    if (status === 'done') body.completed_at = new Date().toISOString();
    if (!id && !agent) return res.status(400).json({ error: 'id or agent required' });
    // Prefer the ROW's own world when we're given an id — the caller shouldn't
    // get to name the tenant of a row they're mutating.
    const rowWorld = id ? await clientIdOfRow('tasks', id) : null;
    const tenant = await gate(rowWorld || requestedClient, req, res);
    if (!tenant) return;
    const scope = `&client_id=eq.${encodeURIComponent(tenant)}`;
    const filter = id
      ? `id=eq.${encodeURIComponent(id)}${rowWorld ? scope : ''}`
      : `agent=eq.${encodeURIComponent(agent)}&status=eq.todo${scope}`;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
      return res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Default: agent_status update
  // Supports: status, current_task, name (rename), display_name (EA user-set name),
  //           last_naming_nudge_at (EA cadence tracking), client_id scoping
  const { name, display_name, last_naming_nudge_at } = req.query;

  // All agent_status modes below share one gate + one scope.
  const clientIdParam = await gate(requestedClient, req, res);
  if (!clientIdParam) return;

  // Rename-only mode: slug + name, no status required.
  // The same slug may refer to either an agent or a project (the chat
  // settings UI doesn't tell us which), so we PATCH all three tables —
  // agent_status, rooms, and projects. A non-matching slug is a no-op,
  // which keeps the call cheap and correct in both cases.
  if (slug && name && !status) {
    const trimmedName = name.trim();
    const filter = `slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`;
    try {
      // Update agent_status name (no-op if slug is a project)
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?${filter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ name: trimmedName }),
      });
      // Also update rooms table name so canvas label updates via Realtime
      const roomFilter = `id=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`;
      await fetch(`${SUPABASE_URL}/rest/v1/rooms?${roomFilter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ name: trimmedName }),
      }).catch(() => {});
      // Project rename: the projects table is the source of truth for the
      // drawer list + project-chat header label. agent_status/rooms PATCHes
      // above are no-ops for projects, so this was getting silently dropped.
      await fetch(`${SUPABASE_URL}/rest/v1/projects?${filter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ name: trimmedName }),
      }).catch(() => {});
      return res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // EA display_name mode: writes user-provided name (sticky once set, required eventually).
  // Called by the EA settings UI — slug + display_name, no status.
  if (slug && display_name !== undefined && !status && !name) {
    const trimmedName = display_name.trim();
    const filter = `slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?${filter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ display_name: trimmedName || null }),
      });
      return res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Cadence tracking: update last_naming_nudge_at after the EA injects the naming nudge.
  // slug + last_naming_nudge_at (ISO string or 'now'), no status.
  if (slug && last_naming_nudge_at !== undefined && !status && !name && display_name === undefined) {
    const ts = last_naming_nudge_at === 'now' ? new Date().toISOString() : last_naming_nudge_at;
    const filter = `slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`;
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?${filter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ last_naming_nudge_at: ts }),
      });
      return res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (!slug || !status) {
    return res.status(400).json({ error: 'slug and status required' });
  }

  const body = { status };
  if (current_task !== undefined) body.current_task = current_task;

  // Multi-tenant: scope agent_status update by the VERIFIED client_id
  const filter = `slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`;

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?${filter}`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    });
    res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
