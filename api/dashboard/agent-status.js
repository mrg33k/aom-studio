// PATCH /api/dashboard/agent-status?slug=bobby&status=active&current_task=Responding...
// PATCH /api/dashboard/agent-status?table=tasks&id=xxx&status=active  (task update mode)
// Combined endpoint: updates agent_status OR tasks table in Supabase.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'PATCH only' });

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
  if (!slug || !status) {
    return res.status(400).json({ error: 'slug and status required' });
  }

  const body = { status };
  if (current_task !== undefined) body.current_task = current_task;

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(slug)}`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    });
    res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
