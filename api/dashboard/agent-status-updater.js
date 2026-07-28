// POST /api/dashboard/agent-status-updater
// Updates agent status in the agent_status table.
// Called by: task runner scripts (building/qa/done/error), gemini chat (responding/idle).
// Replaces the legacy poke-agent system -- status is now derived from real activities.
//
// AUTH (r7:open-agent-surface, 2026-07-27). Unauthenticated with
// `Access-Control-Allow-Origin: *`. Anyone could park every agent in any world
// at `error`/`blocked` — the dashboard reads these rows to decide what looks
// alive, so this is a silent, world-wide "everything is broken" button, and the
// inverse (pinning a wedged agent at `idle`) hides a real failure.
//
// WHICH CREDENTIAL, AND WHY. This endpoint's documented callers are task-runner
// scripts and daemons, not a browser: they have no user session, so demanding a
// user JWT would be the wrong gate — it would 401 the only legitimate traffic
// and teach whoever hit it to remove the gate. So it accepts EITHER:
//   - X-Internal-Key == SUPABASE_SERVICE_ROLE_KEY, the internal-secret scheme
//     api/internal/mail/*.js already uses on this exact "terminal agent with no
//     browser session" problem (same header, same secret, no new env var); or
//   - a normal user session, verifyTenant'd against the target world, for any
//     dashboard surface that ever wants to drive this.
// Either way it is no longer open, and a caller holding neither gets 401.
// Live callers today: none found in src/ or scripts/, so nothing converts.

import { resolveClientId } from './set-supabase-client-context.js';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_STATUSES = new Set(['idle', 'working', 'building', 'qa', 'done', 'responding', 'error', 'blocked', 'waiting', 'paused']);

// Constant-time compare so a wrong key cannot be recovered byte-by-byte.
function internalKeyOk(req) {
  const presented = String(req.headers['x-internal-key'] || '').trim();
  if (!presented || !SUPABASE_KEY) return false;
  if (presented.length !== SUPABASE_KEY.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i += 1) {
    diff |= presented.charCodeAt(i) ^ SUPABASE_KEY.charCodeAt(i);
  }
  return diff === 0;
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST');
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

  // Internal daemon, or a signed-in member of the world being written to.
  if (!internalKeyOk(req)) {
    try {
      await verifyTenant(String(clientId).trim().toLowerCase(), req);
    } catch (err) {
      if (err instanceof TenantAuthError) return sendAuthError(res, err);
      return res.status(500).json({ error: err?.message || 'auth check failed' });
    }
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
