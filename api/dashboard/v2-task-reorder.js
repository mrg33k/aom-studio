// POST /api/dashboard/v2-task-reorder
// Drag-reorder v2 tasks by rewriting sort_order in 100-point increments.
// Body: { taskId, newIndex, client_id? }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseGet(params) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase GET failed (${resp.status}): ${errText}`);
  }
  return resp.json();
}

async function supabasePatch(taskId, body) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase PATCH failed (${resp.status}): ${errText}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { taskId, newIndex, client_id = 'aom' } = req.body || {};

  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'taskId (UUID) required' });
  }
  if (!Number.isInteger(newIndex) || newIndex < 0) {
    return res.status(400).json({ error: 'newIndex (int >= 0) required' });
  }

  try {
    const params = `client_id=eq.${encodeURIComponent(client_id)}`
      + `&title=is.not.null`
      + `&order=priority.desc,sort_order.asc,created_at.asc`;

    const tasks = await supabaseGet(params);
    const taskIdx = tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) {
      return res.status(404).json({ error: 'task not found' });
    }

    const [moved] = tasks.splice(taskIdx, 1);
    const targetIndex = Math.min(newIndex, tasks.length);
    tasks.splice(targetIndex, 0, moved);

    let updated = 0;
    for (let i = 0; i < tasks.length; i += 1) {
      const nextSort = (i + 1) * 100;
      if (tasks[i].sort_order !== nextSort) {
        await supabasePatch(tasks[i].id, { sort_order: nextSort });
        updated += 1;
      }
    }

    return res.status(200).json({ ok: true, updated });
  } catch (err) {
    console.error('[v2-task-reorder] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
