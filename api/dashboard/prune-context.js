// POST /api/dashboard/prune-context  { agent, tenant?, cleanup_hello? }
//
// R33(a+b): pruned EA restart + cleanup-hello. Stronger than clear-context --
// archives the super-agent's working context (tape rotation signal) AND writes
// a cleanup-hello message into the messages table that the EA introduces
// themselves with after the prune. The underlying `messages` rows stay intact
// and queryable; only the EA's live working context is pruned.
//
// Flow:
//   1. Record the prune as a `context_prune` event (audit + idempotency).
//   2. Post the cleanup-hello into the messages table (role=agent, the EA
//      speaks) so the user sees it appear the moment they reopen the chat.
//   3. Write a row with source='clear_context' so supabase-listener.py sends
//      /clear to the agent's tmux (pruning the live context window).
//
// Tenant-agnostic. Caller passes the EA's slug (agent) + optionally a tenant
// slug for audit. No 'if user == "ben"' anywhere. Any future tenant inherits
// this on day one.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEFAULT_HELLO = "Hey -- we've done some cleanup. I can help with your projects, or we can finish onboarding -- your call."

function validSlug(s) {
  return typeof s === 'string' && /^[a-z][a-z0-9-]*$/.test(s)
}

async function insertMessage(row) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`messages insert failed: ${resp.status} ${err}`)
  }
}

async function insertEvent(row) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`events insert failed: ${resp.status} ${err}`)
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const body = req.body || {}
  const agent = (body.agent || '').toString().trim().toLowerCase()
  const _rawTenant = (body.tenant || body.client_id) ? String(body.tenant || body.client_id).trim() : '';
  if (!_rawTenant) return res.status(401).json({ error: 'Missing client' });
  const requestedTenant = _rawTenant.toLowerCase()
  const helloText = (body.cleanup_hello || DEFAULT_HELLO).toString()

  if (!validSlug(agent)) return res.status(400).json({ error: 'valid agent required' })
  if (!validSlug(requestedTenant)) return res.status(400).json({ error: 'valid tenant required' })

  let tenant
  try {
    ({ tenant } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  try {
    const crypto = await import('crypto')
    const now = new Date().toISOString()

    // 1) Audit event
    await insertEvent({
      id: crypto.randomUUID(),
      event_type: 'context_prune',
      agent,
      timestamp: now,
      payload: { tenant, initiated_by: 'dashboard' },
    })

    // 2) Cleanup-hello in the user-visible messages table
    await insertMessage({
      id: crypto.randomUUID(),
      agent,
      role: 'agent',
      source: 'cleanup_hello',
      text: helloText,
      client_id: tenant,
      timestamp: now,
    })

    // 3) /clear signal to the tmux session (same mechanism as clear-context.js)
    await insertMessage({
      id: crypto.randomUUID(),
      agent,
      role: 'system',
      source: 'clear_context',
      text: agent,
      client_id: tenant,
      timestamp: new Date(Date.now() + 500).toISOString(),
    })

    return res.status(200).json({ ok: true, agent, tenant })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
