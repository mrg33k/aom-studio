// PATCH /api/dashboard/v2-task-update
// Updates a v2 task in Supabase via REST API with state-machine enforcement.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TRANSITIONS = {
  queued: ['classifying'],
  classifying: ['planning', 'building'],
  planning: ['building'],
  building: ['qa'],
  qa: ['done', 'building'],
  failed: ['queued'],
};

async function supabaseGetTask(taskId) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}&limit=1`, {
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
  return rows.length > 0 ? rows[0] : null;
}

async function supabasePatchTask(taskId, body) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
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
    throw new Error(`Supabase PATCH failed (${resp.status}): ${errText}`);
  }
  return resp.json();
}

function hasField(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function toNumberIfFinite(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return value;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : value;
  }
  return value;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'PATCH only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { taskId } = body;

  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'taskId (UUID) required' });
  }

  try {
    const current = await supabaseGetTask(taskId);
    if (!current) return res.status(404).json({ error: 'task not found' });

    const updateBody = {};

    if (hasField(body, 'priority')) updateBody.priority = toNumberIfFinite(body.priority);
    if (hasField(body, 'sort_order')) updateBody.sort_order = toNumberIfFinite(body.sort_order);
    if (hasField(body, 'agent_identity')) updateBody.agent_identity = body.agent_identity;
    if (hasField(body, 'result')) updateBody.result = body.result;
    if (hasField(body, 'error')) updateBody.error = body.error;
    if (hasField(body, 'qa_score')) updateBody.qa_score = toNumberIfFinite(body.qa_score);
    if (hasField(body, 'qa_notes')) updateBody.qa_notes = body.qa_notes;
    if (hasField(body, 'token_cost')) updateBody.token_cost = toNumberIfFinite(body.token_cost);

    const statusProvided = hasField(body, 'status');
    if (statusProvided) {
      if (typeof body.status !== 'string' || !body.status.trim()) {
        return res.status(400).json({ error: 'status must be a non-empty string' });
      }

      const nextStatus = body.status.trim();
      const currentStatus = current.status || null;
      const allowedTransitions = new Set([...(TRANSITIONS[currentStatus] || []), 'failed']);
      const isSameStatus = nextStatus === currentStatus;

      if (!isSameStatus && !allowedTransitions.has(nextStatus)) {
        return res.status(400).json({
          error: 'Invalid status transition',
          currentStatus,
          allowedTransitions: Array.from(allowedTransitions),
        });
      }

      updateBody.status = nextStatus;

      if (!isSameStatus) {
        const now = new Date().toISOString();

        if (nextStatus === 'building') {
          if (!current.started_at) updateBody.started_at = now;
          const prevAttempt = Number.isFinite(current.attempt_count)
            ? current.attempt_count
            : Number(current.attempt_count) || 0;
          updateBody.attempt_count = prevAttempt + 1;
        }

        if (nextStatus === 'done') {
          updateBody.completed_at = now;
        }

        if (nextStatus === 'failed') {
          updateBody.error = hasField(body, 'error') ? body.error : null;
        }
      }
    }

    if (Object.keys(updateBody).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await supabasePatchTask(taskId, updateBody);
    const updated = Array.isArray(result) ? result[0] : result;
    return res.status(200).json(updated || null);
  } catch (err) {
    console.error('[v2-task-update] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
