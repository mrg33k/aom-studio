// POST /api/dashboard/clear-context
// Sends a clear_context signal for a super-agent's tmux session.
// The Mac listener sees a message with source='clear_context' and runs /clear
// in the agent's Claude Code terminal.
//
// Flow:
//   1. This route writes a system message into the agent's room on Convex
//      (messages:send) with source = "clear_context" and text = <slug>.
//   2. The Mac listener subscribes to Convex (corner:retire-supabase R2) and
//      sends /clear to the agent's tmux session via tmux send-keys.
//
// Unlike reset-agent (which kills and restarts the session), clear_context
// only clears the Claude Code conversation history. The session keeps running.
//
// corner:retire-supabase (2026-09-03): was a row in the Supabase messages table
// picked up over Realtime.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexMutation } from '../_lib/reportsStore.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const agent = ((req.body && req.body.agent) || '').toString().trim().toLowerCase()
  const _reqClient = (req.body && req.body.client_id) ? String(req.body.client_id).trim() : '';
  if (!_reqClient) return res.status(401).json({ error: 'Missing client' });
  const requested = _reqClient.toLowerCase()

  if (!agent) return res.status(400).json({ error: 'agent required' })
  if (!/^[a-z][a-z0-9-]*$/.test(agent)) return res.status(400).json({ error: 'invalid agent slug' })

  let verified
  try {
    verified = await verifyTenant(requested, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const tenant = verified.tenant
  // A shared room is not a world. The control row goes to the caller's own
  // world's agent room, which is where that agent's terminal listens.
  const world = tenant.startsWith('shared:') ? (verified.world || tenant) : tenant

  try {
    // role 'system' on purpose: the round table never answers a control row,
    // and the listener matches on source.
    const messageId = await convexMutation('messages:send', {
      roomId: `${world}:agent:${agent}`,
      text: agent,
      role: 'system',
      source: 'clear_context',
      clientId: world,
      userId: verified.userId || undefined,
      userEmail: verified.email || undefined,
      userName: verified.userName || undefined,
      metadata: { control: 'clear_context', agent, requested_by: verified.email || verified.userId || null },
    })

    return res.status(200).json({ ok: true, agent, messageId })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
