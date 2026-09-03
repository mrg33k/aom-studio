// PATCH  /api/dashboard/room-title { client_id, agent, title }
// DELETE /api/dashboard/room-title { client_id, agent }
//
// A direct-chat title is user-owned conversation metadata. It lives on the
// agent room itself now (rooms:setTitle, corner:retire-supabase R2,
// 2026-09-03); clearing it puts the agent's plain name back.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { directChatTitleRoomId, normalizeAgentSlug, normalizeChatTitle } from '../_lib/chatTitles.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

const AGENT_TITLE_OVERRIDES = { ea: 'EA', aom: 'AOM', qa: 'QA', os: 'OS', ai: 'AI' }
function agentTitle(slug) {
  const key = String(slug || '').trim().toLowerCase()
  if (!key) return 'Agent'
  if (AGENT_TITLE_OVERRIDES[key]) return AGENT_TITLE_OVERRIDES[key]
  return key.split(/[-_\s]+/).map((w) => AGENT_TITLE_OVERRIDES[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Set the room's title; create the agent room first if nobody has spoken in it.
async function setTitle(clientId, agent, title) {
  const roomId = `${clientId}:agent:${agent}`
  try {
    await convexMutation('rooms:setTitle', { roomId, title })
    return true
  } catch (err) {
    if (!/Room not found/i.test(String(err?.message || ''))) throw err
  }
  const world = await convexQuery('worlds:getBySlug', { slug: clientId })
  if (!world) throw new Error(`world "${clientId}" not found`)
  await convexMutation('rooms:createRoom', { worldId: String(world._id), title, kind: 'agent', specialist: agent })
  return true
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const requested = String(req.body?.client_id || '').trim().toLowerCase()
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

  try {
    if (req.method === 'PATCH') {
      const title = normalizeChatTitle(req.body?.title)
      if (!title) return res.status(400).json({ error: 'title must be 1-80 characters' })
      await setTitle(clientId, agent, title)
      const row = { id, client_id: clientId, type: 'chat', name: title, hidden: true, updated_at: new Date().toISOString() }
      return res.status(200).json({ ok: true, room: row })
    }

    if (req.method === 'DELETE') {
      await setTitle(clientId, agent, agentTitle(agent))
      return res.status(200).json({ ok: true, reset: agent })
    }
  } catch (err) {
    return res.status(502).json({ error: `convex: ${String(err?.message || err)}` })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
