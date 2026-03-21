// POST /api/dashboard/unstuck
// Clears all stale active tasks and resets stuck/working agents to idle.
// Returns { cleared: taskCount, reset: agentCount }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const now = new Date().toISOString();
  let cleared = 0;
  let reset = 0;

  try {
    // 1. PATCH tasks: status=active -> status=done, completed_at=now
    const taskResp = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?status=eq.active`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'done', completed_at: now }),
      }
    );
    if (taskResp.ok) {
      const cleared_tasks = await taskResp.json();
      cleared = Array.isArray(cleared_tasks) ? cleared_tasks.length : 0;
    }

    // 2. PATCH agent_status: status in (working, stuck) -> status=idle
    // Supabase PostgREST: use `in` filter for multiple values
    const agentResp = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_status?status=in.(working,stuck)`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'idle', current_task: null }),
      }
    );
    if (agentResp.ok) {
      const reset_agents = await agentResp.json();
      reset = Array.isArray(reset_agents) ? reset_agents.length : 0;
    }

    return res.status(200).json({ ok: true, cleared, reset });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
