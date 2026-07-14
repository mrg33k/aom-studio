// GET /api/worlds
// List active worlds available to the authenticated caller.

import {
  authenticateWorldRequest,
  sendWorldAuthError,
  setWorldCors,
  worldDbHeaders,
} from '../_lib/worldAuth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

function getActiveCookie(req) {
  const raw = req.headers.cookie || ''
  const match = raw.match(/(?:^|;\s*)active_world=([^;]+)/)
  return match ? match[1] : null
}

export default async function handler(req, res) {
  setWorldCors(req, res, 'GET')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  try {
    const { userId, isSuperAdmin } = await authenticateWorldRequest(req)
    let worlds = []

    if (isSuperAdmin) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/worlds?status=eq.active&select=id,name,slug,client_id,status,config,created_at&order=name.asc`,
        { headers: worldDbHeaders() },
      )
      if (!response.ok) return res.status(response.status).json({ error: await response.text() })
      worlds = (await response.json()).map(world => ({ ...world, role: 'owner' }))
    } else {
      const membershipsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/world_members?user_id=eq.${encodeURIComponent(userId)}&select=world_id,role`,
        { headers: worldDbHeaders() },
      )
      if (!membershipsResponse.ok) {
        return res.status(membershipsResponse.status).json({ error: await membershipsResponse.text() })
      }

      const memberships = await membershipsResponse.json()
      if (memberships.length) {
        const roleMap = Object.fromEntries(memberships.map(row => [row.world_id, row.role]))
        const worldIds = memberships.map(row => row.world_id).join(',')
        const worldsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/worlds?status=eq.active&id=in.(${worldIds})&select=id,name,slug,client_id,status,config,created_at&order=name.asc`,
          { headers: worldDbHeaders() },
        )
        if (!worldsResponse.ok) {
          return res.status(worldsResponse.status).json({ error: await worldsResponse.text() })
        }
        worlds = (await worldsResponse.json()).map(world => ({
          ...world,
          role: roleMap[world.id] || 'member',
        }))
      }
    }

    const cookieWorld = getActiveCookie(req)
    const activeWorld = worlds.some(world => world.slug === cookieWorld)
      ? cookieWorld
      : (worlds.length ? worlds[0].slug : null)
    return res.status(200).json({
      worlds,
      active_world: activeWorld,
      is_super_admin: isSuperAdmin,
    })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }
}
