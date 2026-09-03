// POST /api/worlds/:slug/switch
// Switch the authenticated caller's active world.
//
// corner:retire-supabase (2026-09-03): the world comes from worlds:getBySlug
// and the membership check from worlds:membership (via worldAuth). The active
// world is kept two ways: the active_world cookie the dashboards already read,
// and preferences.activeWorld on the user's Convex row (users:setPrefs, as the
// caller) so the phone and the next browser agree.

import {
  authenticateWorldRequest,
  getWorldMembership,
  sendWorldAuthError,
  setWorldCors,
} from '../../_lib/worldAuth.js'
import { convexQuery, convexMutationAs } from '../../_lib/verifyTenant.js'

export default async function handler(req, res) {
  setWorldCors(req, res, 'POST')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const slug = String(req.query.slug || '').trim().toLowerCase()
  if (!slug) return res.status(400).json({ error: 'slug required' })

  try {
    const { userId, isSuperAdmin, token } = await authenticateWorldRequest(req)
    let world = null
    try {
      world = await convexQuery('worlds:getBySlug', { slug })
    } catch (e) {
      return res.status(502).json({ error: `world lookup failed: ${e?.message || e}` })
    }
    if (!world) return res.status(404).json({ error: 'World not found' })

    if (!isSuperAdmin) {
      const membership = await getWorldMembership(String(world._id), userId)
      if (!membership) return res.status(403).json({ error: 'Access denied' })
    }

    // Remember it on the person, best-effort.
    try {
      await convexMutationAs(token, 'users:setPrefs', { userId, patch: { activeWorld: world.slug } })
    } catch { /* the cookie still carries the choice */ }

    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    res.setHeader(
      'Set-Cookie',
      `active_world=${encodeURIComponent(world.slug)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax; HttpOnly${secure}`,
    )
    return res.status(200).json({
      ok: true,
      world: world.slug,
      client_id: world.slug,
      name: world.name,
      config: { planTier: world.planTier || null },
    })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }
}
