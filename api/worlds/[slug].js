// GET /api/worlds/:slug
// Get world details for an authenticated member or the super-admin.
//
// corner:retire-supabase (2026-09-03): the world row comes from
// worlds:getBySlug, the caller's role from worlds:membership (via worldAuth),
// the roster from agents:listStatus and the members from worlds:membersOf.
// The response keeps the old shape: { world: { id, name, slug, client_id,
// status, config, created_at, role }, agents, members }.

import {
  authenticateWorldRequest,
  getWorldMembership,
  sendWorldAuthError,
  setWorldCors,
} from '../_lib/worldAuth.js'
import { convexQuery } from '../_lib/verifyTenant.js'

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null)

export default async function handler(req, res) {
  setWorldCors(req, res, 'GET')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'slug required' })

  try {
    const { userId, isSuperAdmin } = await authenticateWorldRequest(req)
    let row = null
    try {
      row = await convexQuery('worlds:getBySlug', { slug: String(slug).trim().toLowerCase() })
    } catch (e) {
      return res.status(502).json({ error: `world lookup failed: ${e?.message || e}` })
    }
    if (!row) return res.status(404).json({ error: 'World not found' })

    const world = {
      id: String(row._id),
      name: row.name,
      slug: row.slug,
      client_id: row.slug,
      status: 'active',
      config: { planTier: row.planTier || null },
      created_at: iso(row._creationTime),
    }
    if (isSuperAdmin) {
      world.role = 'owner'
    } else {
      const membership = await getWorldMembership(world.id, userId)
      if (!membership) return res.status(403).json({ error: 'Access denied' })
      world.role = membership.role
    }

    let agents = []
    try {
      const rows = await convexQuery('agents:listStatus', { worldId: world.id })
      agents = (Array.isArray(rows) ? rows : [])
        .map((a) => ({
          slug: a.slug,
          name: a.title,
          role: a.subtitle || null,
          status: a.status || 'idle',
          current_task: a.currentTask ?? null,
          color: a.color || null,
        }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    } catch {
      agents = []
    }

    let members = []
    try {
      const rows = await convexQuery('worlds:membersOf', { worldId: world.id })
      members = (Array.isArray(rows) ? rows : [])
        .map((m) => ({
          user_id: String(m.userId),
          role: m.role,
          created_at: iso(m.createdAt),
          email: m.email || null,
          name: m.name || null,
        }))
        .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    } catch {
      members = []
    }
    return res.status(200).json({ world, agents, members })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }
}
