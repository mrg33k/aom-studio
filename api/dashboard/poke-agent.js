// GET|POST /api/dashboard/poke-agent?agent=elon[&world=<slug>]
// Writes a poke_agent control row into the agent's room on Convex
// (messages:send, source 'poke_agent'). The Mac listener subscribes to Convex
// (corner:retire-supabase R2) and runs:
//   tmux send-keys -t {agent}-relay "check relay" Enter
//
// corner:retire-supabase (2026-09-03): was a row in the Supabase messages
// table picked up by supabase-listener.py over Realtime. The row is now sent
// as an assistant-role message from the 'system' agent on purpose: Convex
// dispatches every row without an agentSlug to the AI round table, and a
// control ping must never be answered by an agent.
//
// AUTH (r7:open-agent-surface, 2026-07-27). This endpoint had NO authentication
// of any kind and `Access-Control-Allow-Origin: *`. The row it writes ends up
// typed into a live super-agent tmux session, so anyone on the internet could
// drive unbounded turns in Elon or Studio by GET-ing a URL, from any page, with
// no session. That is a remote handle on the agent layer this whole effort
// exists to protect.
//
// The gate is verifyTenant against the world the poke lands in, not a bare
// "is there a JWT". A poke is an ACTION INSIDE A WORLD: it wakes that world's
// agent and costs that world tokens. So an arsenal member holding a perfectly
// valid session may poke arsenal's agents and not AOM's, exactly like every
// other write endpoint in this tree.
//
// The world comes from the request and is VERIFIED, then the verified tenant
// (never the raw input) is what the row is filed under. A plain AOM member with
// no admin rights still pokes AOM agents; that path is unchanged.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js';
import { convexMutation } from '../_lib/verifyTenant.js';

const SHARED_PREFIX = 'shared:';

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

  // Resolve the target world AFTER establishing who is asking, so an
  // unauthenticated caller gets a flat 401 and never a validation error that
  // maps the API for them. An omitted world means "my own world", taken from
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

  // A shared room is not a world; the control row lives in the author's own
  // world's agent room.
  const worldSlug = auth.tenant.startsWith(SHARED_PREFIX) ? (auth.world || who.world) : auth.tenant;
  if (!worldSlug) return res.status(403).json({ error: 'caller has no world' });

  try {
    const messageId = await convexMutation('messages:send', {
      roomId: `${worldSlug}:agent:${agent}`,
      clientId: worldSlug,
      text: `poke ${agent}`,
      role: 'assistant',
      agentSlug: 'system',
      source: 'poke_agent',
      // Who woke the agent. Same identity-attribution contract as every other
      // writer: a verified identity or nothing, never a client-supplied name.
      userId: auth.userId || undefined,
      userEmail: auth.email || undefined,
    });

    // messages:send does not keep the free-form metadata bag on the row, so the
    // provenance is stamped right after. Best effort: the poke already landed.
    try {
      await convexMutation('messages:patchMetadata', {
        messageId: String(messageId),
        patch: { control: 'poke_agent', agent, requested_by: auth.userId || null },
      });
    } catch { /* the control row is what the listener reads */ }

    return res.status(200).json({ ok: true, agent, world: auth.tenant });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
