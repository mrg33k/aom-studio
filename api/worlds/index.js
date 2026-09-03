// GET /api/worlds
// List the worlds available to the authenticated caller.
//
// corner:retire-supabase (2026-09-03): the list is the caller's memberships
// (users:worldsFor, already resolved by worldAuth into user.worlds) plus the
// team world for a super-admin. There is no "every world" read on the
// deployment; a super-admin who needs another world in this list gets a
// membership row there (worlds:addMember). Shape unchanged:
// { worlds: [{ id, name, slug, client_id, status, config, created_at, role }],
//   active_world, is_super_admin }.

import {
  authenticateWorldRequest,
  sendWorldAuthError,
  setWorldCors,
} from '../_lib/worldAuth.js'
import { convexQuery } from '../_lib/verifyTenant.js'

function getActiveCookie(req) {
  const raw = req.headers.cookie || ''
  const match = raw.match(/(?:^|;\s*)active_world=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default async function handler(req, res) {
  setWorldCors(req, res, 'GET')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  try {
    const { user, isSuperAdmin } = await authenticateWorldRequest(req)
    const bySlug = new Map()
    for (const w of Array.isArray(user?.worlds) ? user.worlds : []) {
      if (!w.slug) continue
      bySlug.set(w.slug, {
        id: w.worldId || null,
        name: w.name || w.slug,
        slug: w.slug,
        client_id: w.slug,
        status: 'active',
        config: {},
        created_at: null,
        role: isSuperAdmin ? 'owner' : (w.role || 'member'),
      })
    }
    // The home world always counts, even before a membership row exists.
    if (user?.worldSlug && !bySlug.has(user.worldSlug)) {
      bySlug.set(user.worldSlug, {
        id: user.worldId || null,
        name: user.worldSlug,
        slug: user.worldSlug,
        client_id: user.worldSlug,
        status: 'active',
        config: {},
        created_at: null,
        role: isSuperAdmin || user.isAdmin ? 'owner' : 'member',
      })
    }
    if (isSuperAdmin && !bySlug.has('aom')) {
      try {
        const team = await convexQuery('worlds:getBySlug', { slug: 'aom' })
        if (team) bySlug.set('aom', { id: String(team._id), name: team.name, slug: team.slug, client_id: team.slug, status: 'active', config: { planTier: team.planTier || null }, created_at: null, role: 'owner' })
      } catch { /* the team world is optional here */ }
    }

    const worlds = [...bySlug.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)))
    const cookieWorld = getActiveCookie(req)
    const activeWorld = worlds.some((world) => world.slug === cookieWorld)
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
