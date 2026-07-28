// POST /api/dashboard/reset-agent?agent=elon[&world=<slug>]
// Hard-resets a super-agent tmux session via the Supabase -> listener ->
// signal-file -> relay-keepalive bridge. The dashboard "Reset Agent" button
// (in the Control tab of the chat settings modal) calls this.
//
// Flow:
//   1. This route writes a row to the Supabase messages table with
//      source = "reset_agent" and agent = <slug>.
//   2. supabase-listener.py picks up the Realtime INSERT and writes a
//      signal file at ~/Library/Application Support/aom-ea/data/context/.reset-request-{agent}.
//   3. relay-keepalive.py sees the signal file on its next 3s tick and
//      runs force_reset_session(): tmux kill-session + new-session + claude.
//
// Allowlist enforced server-side: only the agents relay-keepalive owns.
//
// AUTH (r7:open-agent-surface, 2026-07-27). This endpoint was unauthenticated
// with `Access-Control-Allow-Origin: *`, and step 3 above is a literal
// `tmux kill-session`. Anyone on the internet could destroy a running
// super-agent session — mid-turn, repeatedly — by POSTing a URL with no
// credential. The agent allowlist bounded WHICH session died, never WHO could
// kill it, which is not a security control.
//
// Gated with verifyTenant on the world the reset lands in, same as poke-agent:
// killing a world's agent is an action inside that world. An ordinary member of
// that world (no admin role) still passes — this is deliberately not an
// admin-only gate, because resetting a wedged agent is normal operator work and
// making it admin-only would lock out exactly the people who need it.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Which sessions relay-keepalive actually owns. Overridable so a fork does not
// have to edit code, but the default is the live pair.
const ALLOWED_AGENTS = new Set(
  (process.env.RESET_AGENT_ALLOWLIST || 'elon,gary')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
);


export default async function handler(req, res) {
  applyCors(req, res, 'GET,POST');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  const agent = (req.query.agent || (req.body && req.body.agent) || '').toString().trim().toLowerCase();
  if (!agent) return res.status(400).json({ error: 'agent required' });
  if (!ALLOWED_AGENTS.has(agent)) {
    return res.status(400).json({ error: 'agent not in reset allowlist' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // Resolve the target world AFTER establishing who is asking, so an
  // unauthenticated caller gets a flat 401 and never a validation error that
  // maps the API for them. An omitted world means "my own world" — taken from
  // the verified session, which is both the right default and one that cannot
  // be pointed at somebody else's tenant.
  const who = await callerIdentity(req);
  if (!who) return res.status(401).json({ error: 'sign in required' });

  const requestedWorld = String(
    req.query.world || req.query.client_id || (req.body && (req.body.world || req.body.client_id)) || who.world || ''
  ).trim().toLowerCase();
  if (!requestedWorld) {
    return res.status(403).json({ error: 'caller has no world' });
  }

  let auth;
  try {
    auth = await verifyTenant(requestedWorld, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return sendAuthError(res, err);
    return res.status(500).json({ error: err?.message || 'auth check failed' });
  }

  try {
    const crypto = await import('crypto');
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        agent,
        role: 'system',
        source: 'reset_agent',
        text: agent,
        // The VERIFIED tenant, never the raw request field.
        client_id: auth.tenant,
        // Who pulled the trigger — a kill-session with no attributable author
        // is exactly the event you most want a name on.
        user_id: auth.userId || null,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(500).json({ error: err });
    }

    return res.status(200).json({ ok: true, agent, world: auth.tenant });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
