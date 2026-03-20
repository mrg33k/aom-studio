// PATCH /api/dashboard/task-update?id=xxx&status=active
// Updates a task's status in the Supabase tasks table.
// Used by "Send to Right Now" (todo -> active) and task completion (active -> done).

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

  const { id, status, agent } = req.query;
  if (!status) {
    return res.status(400).json({ error: 'status required' });
  }

  const body = { status };
  if (status === 'done') body.completed_at = new Date().toISOString();

  // Update by ID if provided, otherwise by agent slug (update latest active task for that agent)
  let filter = id ? `id=eq.${encodeURIComponent(id)}` : agent ? `agent=eq.${encodeURIComponent(agent)}&status=eq.todo&order=created_at.desc&limit=1` : null;
  if (!filter) return res.status(400).json({ error: 'id or agent required' });

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
    });

    res.status(resp.ok ? 200 : 500).json({ ok: resp.ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
