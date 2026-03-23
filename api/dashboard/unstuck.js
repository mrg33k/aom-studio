// POST /api/dashboard/unstuck
// Full system recovery (Supabase layer):
//   1. Clear stale active tasks (status=active -> done)
//   2. Reset stuck/working agents to idle
//   3. Return detailed report: cleared count, reset agents, current queue depth
//
// Returns { ok, cleared, reset, queueDepth, clearedTasks[], resetAgents[] }

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
  let queueDepth = 0;
  let clearedTasks = [];
  let resetAgents = [];

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
      const data = await taskResp.json();
      if (Array.isArray(data)) {
        cleared = data.length;
        clearedTasks = data.map(t => ({ agent: t.agent, task: t.task || t.description }));
      }
    }

    // 2. PATCH agent_status: status in (working, stuck) -> status=idle
    const agentResp = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_status?status=in.(working,stuck)`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'idle', current_task: null }),
      }
    );
    if (agentResp.ok) {
      const data = await agentResp.json();
      if (Array.isArray(data)) {
        reset = data.length;
        resetAgents = data.map(a => a.agent || a.slug || '?');
      }
    }

    // 3. COUNT queued tasks (for status report)
    const queueResp = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?status=eq.queued&select=id`,
      { headers: { ...headers, Prefer: 'count=exact' } }
    );
    if (queueResp.ok) {
      const countHeader = queueResp.headers.get('content-range');
      if (countHeader) {
        const match = countHeader.match(/\/(\d+)$/);
        if (match) queueDepth = parseInt(match[1], 10);
      }
    }

    return res.status(200).json({ ok: true, cleared, reset, queueDepth, clearedTasks, resetAgents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
