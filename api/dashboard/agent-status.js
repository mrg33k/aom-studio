// PATCH /api/dashboard/agent-status?slug=bobby&status=active&current_task=Responding...
// PATCH /api/dashboard/agent-status?table=tasks&id=xxx&status=active  (task update mode)
// Combined endpoint: updates agent_status OR tasks table in Supabase.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: create a new task (merged from supabase-tasks.js)
  if (req.method === 'POST') {
    const { agent, text, project, status: taskStatus = 'todo', client_id } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const crypto = await import('crypto');
    const resolvedClientId = (client_id && client_id.trim()) ? client_id.trim().toLowerCase() : 'aom';
    const payload = { id: crypto.randomUUID(), agent: agent || 'elon', text: text.trim(), project: project || null, status: taskStatus, client_id: resolvedClientId };
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

  // Task update mode: PATCH tasks table
  if (table === 'tasks') {
    if (!status) return res.status(400).json({ error: 'status required' });
    const body = { status };
    if (status === 'done') body.completed_at = new Date().toISOString();
    const filter = id ? `id=eq.${encodeURIComponent(id)}` : agent ? `agent=eq.${encodeURIComponent(agent)}&status=eq.todo` : null;
    if (!filter) return res.status(400).json({ error: 'id or agent required' });
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
      return res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Default: agent_status update
  // Supports: status, current_task, name (rename), client_id scoping
  const { name, client_id: clientIdParam } = req.query;

  // Rename-only mode: slug + name, no status required
  if (slug && name && !status) {
    const trimmedName = name.trim();
    const filter = clientIdParam
      ? `slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`
      : `slug=eq.${encodeURIComponent(slug)}`;
    try {
      // Update agent_status name
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?${filter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ name: trimmedName }),
      });
      // Also update rooms table name so canvas label updates via Realtime
      const roomFilter = clientIdParam
        ? `id=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientIdParam)}`
        : `id=eq.${encodeURIComponent(slug)}`;
      await fetch(`${SUPABASE_URL}/rest/v1/rooms?${roomFilter}`, {
        method: 'PATCH', headers, body: JSON.stringify({ name: trimmedName }),
      }).catch(() => {});
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

  // Multi-tenant: scope agent_status update by client_id
  const clientId = (clientIdParam && clientIdParam.trim())
    ? clientIdParam.trim().toLowerCase()
    : 'aom';
  const filter = `slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`;

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?${filter}`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    });
    res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
