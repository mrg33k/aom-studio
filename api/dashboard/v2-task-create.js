// POST /api/dashboard/v2-task-create
// Creates a v2 task in Supabase via REST API

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseGetMaxSortOrder(clientId) {
  const filter = `client_id=eq.${encodeURIComponent(clientId)}&order=sort_order.desc.nullslast&limit=1`;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=sort_order&${filter}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase GET failed (${resp.status}): ${errText}`);
  }
  const rows = await resp.json();
  if (rows.length === 0) return 0;
  const value = rows[0]?.sort_order;
  return Number.isFinite(value) ? value : Number(value) || 0;
}

async function supabasePostTask(body) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase POST failed (${resp.status}): ${errText}`);
  }
  return resp.json();
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

  const {
    title,
    description,
    complexity,
    priority = 0,
    agent_identity,
    created_by = 'system',
    client_id = 'aom',
  } = req.body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title required' });
  }

  try {
    const maxSort = await supabaseGetMaxSortOrder(client_id);
    const sort_order = (Number.isFinite(maxSort) ? maxSort : 0) + 100;

    let priorityValue = priority;
    if (priorityValue === undefined || priorityValue === null || priorityValue === '') priorityValue = 0;
    if (typeof priorityValue === 'string' && priorityValue.trim() !== '') priorityValue = Number(priorityValue);
    if (!Number.isFinite(priorityValue)) priorityValue = 0;

    const crypto = await import('crypto');
    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      text: title.trim(),  // legacy NOT NULL column -- mirror title
      status: 'queued',
      sort_order,
      priority: priorityValue,
      created_by,
      client_id,
    };

    if (description !== undefined) newTask.description = description;
    if (complexity !== undefined) newTask.complexity = complexity;
    if (agent_identity !== undefined) newTask.agent_identity = agent_identity;

    const result = await supabasePostTask(newTask);
    const created = Array.isArray(result) ? result[0] : result;
    return res.status(200).json(created);
  } catch (err) {
    console.error('[v2-task-create] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
