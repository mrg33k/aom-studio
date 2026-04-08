// POST /api/dashboard/agent-status-updater
// Updates agent status in the agent_status table.
// Called by: task runner scripts (building/qa/done/error), gemini chat (responding/idle).
// Replaces the legacy poke-agent system -- status is now derived from real activities.

import { resolveClientId } from './set-supabase-client-context.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_STATUSES = new Set(['idle', 'working', 'building', 'qa', 'done', 'responding', 'error', 'blocked', 'waiting', 'paused']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { agent_id, slug, status, task_id, current_task, client_id, world_id } = req.body || {};
  const agentSlug = slug || agent_id;

  if (!agentSlug) return res.status(400).json({ error: 'agent_id or slug required' });

  let clientId;
  try {
    clientId = await resolveClientId({ worldId: world_id, clientId: client_id });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (!status) return res.status(400).json({ error: 'status required' });
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: `invalid status: ${status}. Valid: ${[...VALID_STATUSES].join(', ')}` });
  }

  const now = new Date().toISOString();
  const body = { status, updated_at: now, last_activity_at: now };
  if (current_task !== undefined) body.current_task = current_task;
  if (task_id !== undefined) body.current_task = body.current_task || task_id;

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(agentSlug)}&client_id=eq.${encodeURIComponent(clientId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(body),
      }
    );
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: text });
    }
    return res.status(200).json({ ok: true, slug: agentSlug, status, client_id: clientId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
