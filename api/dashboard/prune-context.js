// POST /api/dashboard/prune-context  { agent, tenant?, cleanup_hello? }
//
// R33(a+b): pruned EA restart + cleanup-hello. Stronger than clear-context:
// archives the super-agent's working context (tape rotation signal) AND writes
// a cleanup-hello message that the EA introduces themselves with after the
// prune. The room's history stays intact; only the EA's live working context
// is pruned.
//
// corner:retire-supabase (2026-09-03): all three writes go to Convex.
//   1. Record the prune as a `context_prune` event (tasks:logEvent).
//   2. Post the cleanup-hello into the agent's room (messages:send, the EA
//      speaks, so it appears the moment the user reopens the chat).
//   3. Write a control row with source='clear_context' (messages:send) so the
//      Mac listener (Convex subscription, R2) sends /clear to the agent's tmux.
// Control rows go out as assistant-role rows from the 'system' agent because
// Convex dispatches any row without an agentSlug to the AI round table.
//
// Tenant-agnostic. Caller passes the EA's slug (agent) + optionally a tenant
// slug for audit. No 'if user == "ben"' anywhere. Any future tenant inherits
// this on day one.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexMutation } from '../_lib/verifyTenant.js'

const DEFAULT_HELLO = "Hey -- we've done some cleanup. I can help with your projects, or we can finish onboarding -- your call."

function validSlug(s) {
  return typeof s === 'string' && /^[a-z][a-z0-9-]*$/.test(s)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const body = req.body || {}
  const agent = (body.agent || '').toString().trim().toLowerCase()
  const _rawTenant = (body.tenant || body.client_id) ? String(body.tenant || body.client_id).trim() : '';
  if (!_rawTenant) return res.status(401).json({ error: 'Missing client' });
  const requestedTenant = _rawTenant.toLowerCase()
  const helloText = (body.cleanup_hello || DEFAULT_HELLO).toString()

  if (!validSlug(agent)) return res.status(400).json({ error: 'valid agent required' })
  if (!validSlug(requestedTenant)) return res.status(400).json({ error: 'valid tenant required' })

  let verified
  try {
    verified = await verifyTenant(requestedTenant, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const tenant = verified.tenant

  try {
    const now = new Date().toISOString()
    const roomId = `${tenant}:agent:${agent}`

    // 1) Audit event
    await convexMutation('tasks:logEvent', {
      event: {
        event_type: 'context_prune',
        agent,
        timestamp: now,
        payload: { tenant, initiated_by: 'dashboard', user_id: verified.userId || null },
      },
    })

    // 2) Cleanup-hello, spoken by the EA in its own room
    await convexMutation('messages:send', {
      roomId,
      clientId: tenant,
      text: helloText,
      role: 'assistant',
      agentSlug: agent,
      source: 'cleanup_hello',
    })

    // 3) /clear signal to the tmux session (same mechanism as clear-context.js)
    const controlId = await convexMutation('messages:send', {
      roomId,
      clientId: tenant,
      text: agent,
      role: 'assistant',
      agentSlug: 'system',
      source: 'clear_context',
      userId: verified.userId || undefined,
      userEmail: verified.email || undefined,
    })

    // messages:send does not keep the free-form metadata bag on the row, so the
    // provenance is stamped right after. Best effort: the signal already landed.
    try {
      await convexMutation('messages:patchMetadata', {
        messageId: String(controlId),
        patch: { control: 'clear_context', agent, requested_by: verified.userId || null },
      })
    } catch { /* the control row is what the listener reads */ }

    return res.status(200).json({ ok: true, agent, tenant })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
