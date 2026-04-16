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

async function supabasePostEvent(agent, eventType, description, taskId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const crypto = await import('crypto');
    const payload = { description: description || '' };
    if (taskId) payload.task_id = taskId;
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        agent: agent || 'system',
        event_type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {}
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

  const { action, taskText, taskId, agent, payload, clientId = 'aom', project } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action required' });

  // startRunner: signal watcher + reclaim stale tasks
  if (action === 'startRunner') {
    try {
      const crypto = await import('crypto');
      const now = new Date().toISOString();

      // 1. Signal the runner watcher
      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          agent: 'system',
          event_type: 'runner_start_requested',
          payload: { source: 'tasks-tab', requested_at: now },
          timestamp: now,
        }),
      });

      // 2. Reclaim stale tasks: stuck in building/qa/classifying/planning for >10 minutes
      //    Reset them to queued so the runner picks them up again.
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const staleResp = await fetch(
        `${SUPABASE_URL}/rest/v1/tasks?status=in.(building,qa,classifying,planning)&updated_at=lt.${tenMinAgo}&select=id,title,status`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      );
      let reclaimed = 0;
      if (staleResp.ok) {
        const staleTasks = await staleResp.json();
        if (staleTasks.length > 0) {
          const ids = staleTasks.map(t => t.id).join(',');
          await fetch(
            `${SUPABASE_URL}/rest/v1/tasks?id=in.(${ids})`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ status: 'queued', updated_at: now }),
            }
          );
          reclaimed = staleTasks.length;
        }
      }

      return res.status(200).json({ ok: true, action: 'startRunner', reclaimed });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

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
        let addResult;
        if (existing || taskId) {
          addResult = await supabasePatch(filter, { status: 'active' });
        } else {
          // Task doesn't exist in Supabase yet -- create it as active
          const crypto = await import('crypto');
          const projectSlug = (project || '').trim().toLowerCase() || null
          const newTask = {
            id: crypto.randomUUID(),
            text: taskText,
            agent: agent || 'elon',
            status: 'active',
            source: 'user',
            client_id: clientId,
            ...(projectSlug ? { project: projectSlug } : {}),
          };
          addResult = await supabasePost(newTask);
        }
        // Log task_started event so Right Now bar updates immediately
        await supabasePostEvent(agent || 'elon', 'task_started', taskText, taskId || null);
        return res.status(200).json({ ok: true, action: 'addToRightNow', result: addResult });
      }

      case 'markDone': {
        // Alias for toggle(done=true) for convenience from BoardView
        const result = await supabasePatch(filter, { status: 'done', completed_at: new Date().toISOString() });
        // Log task_completed event so activity feed + agent status update
        await supabasePostEvent(agent || 'elon', 'task_completed', taskText, taskId || null);
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

      case 'dismiss': {
        // Hide a task from the dashboard without rewriting its history. Previously
        // this flipped status -> 'done', which masked timeouts + worker failures
        // as if they had succeeded (e.g. e64cf748 chain parent ended up status=done
        // even though it errored with 'timeout after 20 minutes'). Now we preserve
        // the existing status + error and just merge metadata.dismissed=true so
        // filteredFailed (status==='failed' && !isDismissed) hides it. For tasks
        // not yet in a terminal state, escalate to 'cancelled' so they stop being
        // worked, but never overwrite 'failed'.
        const fetchResp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}&select=status,metadata`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        });
        const existing = fetchResp.ok ? await fetchResp.json() : [];
        const current = Array.isArray(existing) && existing[0] ? existing[0] : { status: null, metadata: {} };
        const mergedMeta = { ...(current.metadata || {}), dismissed: true };
        const TERMINAL = new Set(['failed', 'done', 'completed', 'cancelled']);
        const body = TERMINAL.has((current.status || '').toLowerCase())
          ? { metadata: mergedMeta }
          : { status: 'cancelled', metadata: mergedMeta };
        const result = await supabasePatch(filter, body);
        return res.status(200).json({ ok: true, action: 'dismiss', result });
      }

      case 'requeue': {
        // Fetch existing task to build fix suggestions from QA notes/errors
        const requeueResp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}&select=description,qa_notes,error,metadata,title`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        });
        const requeueRows = await requeueResp.json();
        const requeueTask = Array.isArray(requeueRows) && requeueRows[0] ? requeueRows[0] : {};

        // Build retry context from previous failure
        const prevNotes = requeueTask.qa_notes || '';
        const prevError = requeueTask.error || '';
        const prevMeta = requeueTask.metadata || {};
        let retryHint = '';
        if (prevNotes) retryHint += `Previous QA notes: ${prevNotes}\n`;
        if (prevError) retryHint += `Previous error: ${prevError}\n`;
        if (retryHint) retryHint = `\n\n--- RETRY CONTEXT (fix these issues) ---\n${retryHint}`;

        const updates = {
          status: 'queued',
          qa_score: null,
          error: null,
          worker_id: null,
          locked_at: null,
          lease_expires_at: null,
        };
        // Append retry context to description if there are fix suggestions
        if (retryHint && requeueTask.description) {
          updates.description = requeueTask.description.replace(/\n\n--- RETRY CONTEXT.*$/s, '') + retryHint;
        }
        // Track requeue count in metadata
        prevMeta.requeue_count = (prevMeta.requeue_count || 0) + 1;
        updates.metadata = prevMeta;

        const result = await supabasePatch(filter, updates);

        // Fire runner_start_requested event
        try {
          const crypto = await import('crypto');
          await fetch(`${SUPABASE_URL}/rest/v1/events`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              agent: 'system',
              event_type: 'runner_start_requested',
              payload: { source: 'requeue', task_id: taskId, requested_at: new Date().toISOString() },
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {}

        return res.status(200).json({ ok: true, action: 'requeue', result });
      }

      case 'resume': {
        // Human replied to a waiting task -- store answer, requeue for runner
        // payload = { answer: "Use the DJI audio track" }
        const answer = typeof payload === 'string' ? payload : payload?.answer;
        if (!answer) return res.status(400).json({ error: 'resume requires an answer in payload' });

        // Fetch existing task to merge metadata
        const taskResp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${filter}&select=metadata`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        });
        const taskRows = await taskResp.json();
        const existingMeta = (Array.isArray(taskRows) && taskRows[0]?.metadata) || {};
        const checkpoint = existingMeta.checkpoint || {};
        checkpoint.answer = answer;
        checkpoint.answered_at = new Date().toISOString();
        existingMeta.checkpoint = checkpoint;

        const result = await supabasePatch(filter, {
          status: 'queued',
          worker_id: null,
          locked_at: null,
          lease_expires_at: null,
          metadata: existingMeta,
        });

        // Fire runner_start_requested event so the runner wakes up
        try {
          const crypto = await import('crypto');
          await fetch(`${SUPABASE_URL}/rest/v1/events`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              agent: 'system',
              event_type: 'runner_start_requested',
              payload: { source: 'checkpoint-resume', task_id: taskId, requested_at: new Date().toISOString() },
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {}

        return res.status(200).json({ ok: true, action: 'resume', result });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[task-action] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
