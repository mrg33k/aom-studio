// PATCH /api/dashboard/v2-task-update
// Updates a v2 task in Supabase via REST API with state-machine enforcement.
//
// AUTH (r7:open-agent-surface, 2026-07-27). Unauthenticated with
// `Access-Control-Allow-Origin: *`. Task UUIDs are not secret — they surface on
// several read paths — so anyone holding one could drive another world's task
// through the state machine: flip a `queued` row to `running` so the runner
// never claims it, mark live work `failed`, or write `result`/`error`/`qa_notes`
// that a human then reads as the agent's own report. The state machine bounded
// WHICH transitions were legal, never WHO could make them.
//
// Gated on the TASK'S OWN client_id, resolved from the row before any write —
// the same shape retry-task.js and foreman-pause.js use. A member of the owning
// world passes without being an admin; every other world is refused.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TRANSITIONS = {
  queued: ['classifying', 'running'],
  classifying: ['planning', 'building'],
  planning: ['building'],
  running: ['done', 'failed', 'building'],
  building: ['qa'],
  qa: ['done', 'building'],
  failed: ['queued', 'superseded'],
};

// ── Auto-supersede failed duplicates ────────────────────────────────────────
// When a task completes successfully, find failed tasks with similar titles
// (≥50% keyword overlap) and mark them as superseded. Fully non-fatal.

const STOP_WORDS = new Set([
  'the','and','for','with','from','that','this','not','are','was','has','have',
  'been','will','task','fix','feat','add','all','show','must','code','change',
]);

function extractKeywords(title) {
  return (title || '').split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

async function supersedeFailedDuplicates(taskId, taskTitle) {
  try {
    const keywords = extractKeywords(taskTitle);
    if (keywords.length === 0) return;

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?status=eq.failed&order=created_at.desc&limit=30&select=id,title`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!resp.ok) return;
    const failedTasks = await resp.json();

    let count = 0;
    for (const ft of failedTasks) {
      if (ft.id === taskId) continue;
      const ftTitle = (ft.title || '').toLowerCase();
      const matches = keywords.filter(w => ftTitle.includes(w)).length;
      const ratio = matches / keywords.length;
      if (ratio >= 0.5) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(ft.id)}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'superseded' }),
          }
        );
        count++;
      }
    }
    if (count > 0) {
      console.log(`[v2-task-update] Superseded ${count} failed task(s) matching "${taskTitle}"`);
    }
  } catch (err) {
    console.error('[v2-task-update] Supersede check failed (non-fatal):', err.message);
  }
}

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

async function postInvestigationTrigger(taskId, taskRow) {
  if (!taskId) return;
  try {
    const crypto = await import('crypto');
    const logSourceUrl = `/api/dashboard/v2-task-list?taskId=${encodeURIComponent(taskId)}&include=thread`;
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
        agent: (taskRow && taskRow.agent_identity) || 'system',
        client_id: (taskRow && taskRow.client_id) || '',
        event_type: 'investigation_trigger',
        payload: {
          task_id: String(taskId),
          log_source_url: logSourceUrl,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('[v2-task-update] Failed to emit investigation_trigger (non-fatal):', err.message);
  }
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
  applyCors(req, res, 'PATCH');

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

  let current;
  try {
    current = await supabaseGetTask(taskId);
  } catch (err) {
    return res.status(502).json({ error: `task lookup failed: ${err.message}` });
  }
  if (!current) return res.status(404).json({ error: 'task not found' });

  // Authorize against the task's own world before touching anything.
  const taskWorld = String(current.client_id || '').trim().toLowerCase();
  if (!taskWorld) {
    return res.status(409).json({ error: 'task has no client_id; cannot authorize' });
  }
  try {
    await verifyTenant(taskWorld, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return sendAuthError(res, err);
    return res.status(500).json({ error: err?.message || 'auth check failed' });
  }

  try {
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

        if (nextStatus === 'building' || nextStatus === 'running') {
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

    if (updateBody.status === 'failed' && current.status !== 'failed') {
      postInvestigationTrigger(taskId, updated || current).catch(() => {});
    }

    // Fire-and-forget: supersede failed duplicates when a task completes
    if (updateBody.status === 'done') {
      supersedeFailedDuplicates(taskId, current.title).catch(() => {});
    }

    return res.status(200).json(updated || null);
  } catch (err) {
    console.error('[v2-task-update] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
