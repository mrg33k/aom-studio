// PATCH  /api/dashboard/room-title { client_id, agent, title }
// DELETE /api/dashboard/room-title { client_id, agent }
//
// A direct-chat title is user-owned conversation metadata. It intentionally
// lives in a hidden synthetic `rooms` row instead of renaming the specialist's
// canonical agent_status record ("Website sprint" can still be Bobby / Web).

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { directChatTitleRoomId, normalizeAgentSlug, normalizeChatTitle } from '../_lib/chatTitles.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers(prefer = 'return=representation') {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const requested = String(req.body?.client_id || 'aom').trim().toLowerCase()
  let clientId
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status || 401).json({ error: err.message })
    return res.status(500).json({ error: err.message || 'auth failure' })
  }

  const agent = normalizeAgentSlug(req.body?.agent)
  if (!agent) return res.status(400).json({ error: 'valid agent required' })
  const id = directChatTitleRoomId(clientId, agent)

  if (req.method === 'PATCH') {
    const title = normalizeChatTitle(req.body?.title)
    if (!title) return res.status(400).json({ error: 'title must be 1-80 characters' })
    const now = new Date().toISOString()
    const row = { id, client_id: clientId, type: 'chat', name: title, hidden: true, updated_at: now }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rooms?on_conflict=id`, {
      method: 'POST',
      headers: headers('resolution=merge-duplicates,return=representation'),
      body: JSON.stringify(row),
    })
    if (!r.ok) return res.status(r.status).json({ error: `supabase: ${await r.text()}` })
    const rows = await r.json()
    return res.status(200).json({ ok: true, room: rows?.[0] || row })
  }

  if (req.method === 'DELETE') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${encodeURIComponent(id)}&client_id=eq.${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
      headers: headers('return=minimal'),
    })
    if (!r.ok) return res.status(r.status).json({ error: `supabase: ${await r.text()}` })
    return res.status(200).json({ ok: true, reset: agent })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
