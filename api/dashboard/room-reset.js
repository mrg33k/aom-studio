// Archive the visible room session and clear only the agent's transient working context.
// Message rows are never deleted: the room_reset marker is the boundary used by CV6's
// History view, while clear_context is consumed by the room bridge/session reset worker.

import { randomUUID } from 'crypto'
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
}

function cleanSlug(value) {
  const text = String(value || '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9:_-]{0,159}$/.test(text) ? text : ''
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const body = req.body || {}
  const requestedTenant = cleanSlug(body.client_id || body.tenant || 'aom')
  const agent = cleanSlug(body.agent)
  const project = cleanSlug(body.project)
  const missionSlug = cleanSlug(body.mission_slug)
  if (!requestedTenant || !agent) return res.status(400).json({ error: 'valid client_id and agent required' })

  let tenant
  try {
    ({ tenant } = await verifyTenant(requestedTenant, req))
  } catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message })
    throw error
  }

  const metadata = missionSlug ? { mission_slug: missionSlug, room_reset: true } : { room_reset: true }
  const base = { agent, client_id: tenant, ...(project ? { project } : {}) }
  const now = Date.now()
  const rows = [
    {
      ...base, id: randomUUID(), role: 'system', source: 'room_reset',
      text: 'Previous session archived', metadata, timestamp: new Date(now).toISOString(),
    },
    {
      ...base, id: randomUUID(), role: 'system', source: 'clear_context',
      text: agent, metadata: missionSlug ? { mission_slug: missionSlug } : {},
      timestamp: new Date(now + 50).toISOString(),
    },
  ]

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST', headers: headers(), body: JSON.stringify(rows),
    })
    if (!response.ok) throw new Error(await response.text())
    return res.status(200).json({ ok: true, archived: true })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not reset room' })
  }
}
