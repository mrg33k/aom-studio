// GET|POST /api/dashboard/poke-agent?agent=elon[&world=<slug>]
// Writes a poke_agent record to Supabase messages table.
// supabase-listener.py picks it up via Realtime and runs:
//   tmux send-keys -t {agent}-relay "check relay" Enter
//
// AUTH (r7:open-agent-surface, 2026-07-27). This endpoint had NO authentication
// of any kind and `Access-Control-Allow-Origin: *`. The row it writes is
// consumed by supabase-listener.py, which types into a live super-agent tmux
// session — so anyone on the internet could drive unbounded turns in Elon or
// Studio by GET-ing a URL, from any page, with no session. That is a remote
// handle on the agent layer this whole effort exists to protect.
//
// The gate is verifyTenant against the world the poke lands in, not a bare
// "is there a JWT". A poke is an ACTION INSIDE A WORLD: it wakes that world's
// agent and costs that world tokens. So an arsenal member holding a perfectly
// valid session may poke arsenal's agents and not AOM's, exactly like every
// other write endpoint in this tree.
//
// The world is no longer the hardcoded literal it was — it comes from the
// request and is VERIFIED, then the verified tenant (never the raw input) is
// what gets stamped on the row. A plain AOM member with no admin rights still
// pokes AOM agents; that path is unchanged and must stay that way.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


export default async function handler(req, res) {
  applyCors(req, res, 'GET,POST');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  const agent = req.query.agent || (req.body && req.body.agent);
  if (!agent) return res.status(400).json({ error: 'agent required' });

  // Validate slug: lowercase alphanumeric + hyphens only
  if (!/^[a-z][a-z0-9-]*$/.test(agent)) {
    return res.status(400).json({ error: 'invalid agent slug' });
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
        source: 'poke_agent',
        text: `poke ${agent}`,
        // The VERIFIED tenant, never the raw request field.
        client_id: auth.tenant,
        // Who woke the agent. Same identity-attribution contract as every other
        // writer: a verified auth uid or nothing, never a client-supplied name.
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
