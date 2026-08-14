// POST /api/dashboard/clear-context
// Sends a clear_context signal for a super-agent's tmux session via Supabase.
// supabase-listener.py picks up source='clear_context' and runs /clear in the
// agent's Claude Code terminal.
//
// Flow:
//   1. This route writes a row to the Supabase messages table with
//      source = "clear_context" and agent = <slug>.
//   2. supabase-listener.py picks up the Realtime INSERT and sends /clear
//      to the agent's tmux session via tmux send-keys.
//
// Unlike reset-agent (which kills and restarts the session), clear_context
// only clears the Claude Code conversation history -- the session keeps running.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  let tenant
  try {
    ({ tenant } = await verifyTenant(requested, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  try {
    const crypto = await import('crypto')
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
        source: 'clear_context',
        text: agent,
        client_id: tenant,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      return res.status(500).json({ error: err })
    }

    return res.status(200).json({ ok: true, agent })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
