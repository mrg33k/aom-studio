// POST /api/dashboard/task-action
// Unified endpoint for all task mutations from the Corner dashboard.
// Handles: toggle (done/undone), reassign, delete, priority, moveToProject, addContext, addToRightNow
//
// Body: { action, taskText, taskId?, agent?, payload?, clientId? }
// All writes go to the Supabase `tasks` table.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabasePatch(filter, body) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}`, {
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

async function supabasePost(body) {
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

// Find a task by text match (when we don't have a UUID)
async function findTaskByText(text, clientId) {
  const filter = `text=eq.${encodeURIComponent(text)}&client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=1`;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return rows.length > 0 ? rows[0] : null;
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

  const { action, taskText, taskId, agent, payload, clientId = 'aom' } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action required' });
  if (!taskText && !taskId) return res.status(400).json({ error: 'taskText or taskId required' });

  try {
    // Build filter: prefer taskId (UUID) when available, fall back to text match
    let filter;
    if (taskId && /^[0-9a-f-]{36}$/i.test(taskId)) {
      filter = `id=eq.${encodeURIComponent(taskId)}`;
    } else if (taskText) {
      filter = `text=eq.${encodeURIComponent(taskText)}&client_id=eq.${encodeURIComponent(clientId)}`;
    } else {
      return res.status(400).json({ error: 'Cannot identify task' });
    }

    switch (action) {
      case 'toggle': {
        // Toggle done/undone. payload = true (mark done) or false (mark undone)
        const isDone = payload === true || payload === 'done'
        const body = isDone
          ? { status: 'done', completed_at: new Date().toISOString() }
          : { status: 'active', completed_at: null }
        const result = await supabasePatch(filter, body);
        return res.status(200).json({ ok: true, action: 'toggle', result });
      }

      case 'reassign': {
        // payload = new agent slug
        if (!payload) return res.status(400).json({ error: 'payload (agent slug) required for reassign' });
        const result = await supabasePatch(filter, { agent: payload });
        return res.status(200).json({ ok: true, action: 'reassign', result });
      }

      case 'delete': {
        // Soft-delete: set status to 'deleted'
        const result = await supabasePatch(filter, { status: 'deleted' });
        return res.status(200).json({ ok: true, action: 'delete', result });
      }

      case 'priority': {
        // payload = 'high' | 'med' | 'low'
        if (!payload) return res.status(400).json({ error: 'payload (priority) required' });
        const result = await supabasePatch(filter, { priority: payload });
        return res.status(200).json({ ok: true, action: 'priority', result });
      }

      case 'moveToProject': {
        // payload = project section slug
        if (!payload) return res.status(400).json({ error: 'payload (project) required for moveToProject' });
        const result = await supabasePatch(filter, { project: payload });
        return res.status(200).json({ ok: true, action: 'moveToProject', result });
      }

      case 'addContext': {
        // payload = context note text
        if (!payload) return res.status(400).json({ error: 'payload (note) required for addContext' });
        const result = await supabasePatch(filter, { context_note: payload });
        return res.status(200).json({ ok: true, action: 'addContext', result });
      }

      case 'addToRightNow': {
        // Two paths: if the task exists in Supabase, PATCH to active. If not, POST a new one.
        const existing = taskId ? null : await findTaskByText(taskText, clientId);
        if (existing || taskId) {
          const result = await supabasePatch(filter, { status: 'active' });
          return res.status(200).json({ ok: true, action: 'addToRightNow', result });
        } else {
          // Task doesn't exist in Supabase yet -- create it as active
          const crypto = await import('crypto');
          const newTask = {
            id: crypto.randomUUID(),
            text: taskText,
            agent: agent || 'elon',
            status: 'active',
            source: 'user',
            client_id: clientId,
          };
          const result = await supabasePost(newTask);
          return res.status(200).json({ ok: true, action: 'addToRightNow', created: true, result });
        }
      }

      case 'markDone': {
        // Alias for toggle(done=true) for convenience from BoardView
        const result = await supabasePatch(filter, { status: 'done', completed_at: new Date().toISOString() });
        return res.status(200).json({ ok: true, action: 'markDone', result });
      }

      case 'markUndone': {
        const result = await supabasePatch(filter, { status: 'active', completed_at: null });
        return res.status(200).json({ ok: true, action: 'markUndone', result });
      }

      case 'approve': {
        // Patrik approved a done task -- mark as completed
        const result = await supabasePatch(filter, { status: 'completed', completed_at: new Date().toISOString() });
        return res.status(200).json({ ok: true, action: 'approve', result });
      }

      case 'reject': {
        // Patrik rejected a done task -- send back to active so agent can redo
        const result = await supabasePatch(filter, { status: 'active', completed_at: null });
        return res.status(200).json({ ok: true, action: 'reject', result });
      }

      case 'editText': {
        // payload = new task text string
        if (!payload || typeof payload !== 'string' || !payload.trim()) {
          return res.status(400).json({ error: 'payload (new text) required for editText' });
        }
        const result = await supabasePatch(filter, { text: payload.trim() });
        return res.status(200).json({ ok: true, action: 'editText', result });
      }

      case 'setLabel': {
        // payload = label id string ('bug'|'feature'|'polish'|'urgent'|'blocked') or null to clear
        const validLabels = ['bug', 'feature', 'polish', 'urgent', 'blocked'];
        const labelValue = payload && validLabels.includes(payload) ? payload : null;
        try {
          const result = await supabasePatch(filter, { label: labelValue });
          return res.status(200).json({ ok: true, action: 'setLabel', result });
        } catch {
          // label column may not exist yet in Supabase -- silently succeed
          // localStorage is the source of truth until column is added
          return res.status(200).json({ ok: true, action: 'setLabel', note: 'label column not in schema yet' });
        }
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[task-action] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
