// GET /api/worlds/:slug
// Get world details for an authenticated member or the super-admin.

import {
  authenticateWorldRequest,
  getWorldMembership,
  sendWorldAuthError,
  setWorldCors,
  worldDbHeaders,
} from '../_lib/worldAuth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function handler(req, res) {
  setWorldCors(req, res, 'GET')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'slug required' })

  try {
    const { userId, isSuperAdmin } = await authenticateWorldRequest(req)
    const worldResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,client_id,status,config,created_at&limit=1`,
      { headers: worldDbHeaders() },
    )
    if (!worldResponse.ok) return res.status(worldResponse.status).json({ error: await worldResponse.text() })
    const worlds = await worldResponse.json()
    if (!worlds.length) return res.status(404).json({ error: 'World not found' })

    const world = worlds[0]
    if (isSuperAdmin) {
      world.role = 'owner'
    } else {
      const membership = await getWorldMembership(world.id, userId)
      if (!membership) return res.status(403).json({ error: 'Access denied' })
      world.role = membership.role
    }

    let agents = []
    if (world.slug) {
      const agentsResponse = await fetch(
        // Columns are slug/name — agent_slug/agent_name have never existed, so this
        // query returned HTTP 400 ("column agent_status.agent_slug does not exist")
        // on every call and `agents` was silently always []. Also scoped to real
        // agent rows: agent_status holds project and mission rows in the same table.
        `${SUPABASE_URL}/rest/v1/agent_status?client_id=eq.${encodeURIComponent(world.slug)}&type=eq.agent&hidden=eq.false&select=slug,name,role,status,current_task,color&order=name.asc`,
        { headers: worldDbHeaders() },
      )
      if (agentsResponse.ok) agents = await agentsResponse.json()
    }

    const membersResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/world_members?world_id=eq.${encodeURIComponent(world.id)}&select=user_id,role,created_at&order=created_at.asc`,
      { headers: worldDbHeaders() },
    )
    const members = membersResponse.ok ? await membersResponse.json() : []
    return res.status(200).json({ world, agents, members })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }
}
