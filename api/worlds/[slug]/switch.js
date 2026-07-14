// POST /api/worlds/:slug/switch
// Switch the authenticated caller's active world.

import {
  authenticateWorldRequest,
  getWorldMembership,
  sendWorldAuthError,
  setWorldCors,
  worldDbHeaders,
} from '../../_lib/worldAuth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function handler(req, res) {
  setWorldCors(req, res, 'POST')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const slug = req.query.slug
  if (!slug) return res.status(400).json({ error: 'slug required' })

  try {
    const { userId, isSuperAdmin } = await authenticateWorldRequest(req)
    const worldResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&status=eq.active&select=id,name,slug,client_id,config&limit=1`,
      { headers: worldDbHeaders() },
    )
    if (!worldResponse.ok) return res.status(worldResponse.status).json({ error: await worldResponse.text() })
    const worlds = await worldResponse.json()
    if (!worlds.length) return res.status(404).json({ error: 'World not found' })

    const world = worlds[0]
    if (!isSuperAdmin) {
      const membership = await getWorldMembership(world.id, userId)
      if (!membership) return res.status(403).json({ error: 'Access denied' })
    }

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    res.setHeader(
      'Set-Cookie',
      `active_world=${encodeURIComponent(slug)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax; HttpOnly${secure}`,
    )
    return res.status(200).json({
      ok: true,
      world: world.slug,
      client_id: world.client_id,
      name: world.name,
      config: world.config,
    })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }
}
