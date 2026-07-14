// POST /api/worlds/:slug/members
// Add a member. Caller must be an authenticated world owner/admin or super-admin.

import {
  authenticateWorldRequest,
  getWorldMembership,
  sendWorldAuthError,
  setWorldCors,
  worldDbHeaders,
} from '../../_lib/worldAuth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const VALID_ROLES = ['owner', 'admin', 'member', 'viewer']

export default async function handler(req, res) {
  setWorldCors(req, res, 'POST')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const slug = req.query.slug
  const { target_user_id: targetUserId, role = 'member' } = req.body || {}
  if (!slug) return res.status(400).json({ error: 'slug required' })
  if (!targetUserId) return res.status(400).json({ error: 'target_user_id required' })
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
  }

  try {
    const { userId, isSuperAdmin } = await authenticateWorldRequest(req)
    const worldResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,client_id&limit=1`,
      { headers: worldDbHeaders() },
    )
    if (!worldResponse.ok) return res.status(worldResponse.status).json({ error: await worldResponse.text() })
    const worlds = await worldResponse.json()
    if (!worlds.length) return res.status(404).json({ error: 'World not found' })

    const world = worlds[0]
    if (!isSuperAdmin) {
      const membership = await getWorldMembership(world.id, userId, ['owner', 'admin'])
      if (!membership) return res.status(403).json({ error: 'Admin or owner required' })
    }

    const insertResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/world_members?on_conflict=world_id,user_id`,
      {
        method: 'POST',
        headers: worldDbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify({
          world_id: world.id,
          user_id: targetUserId,
          role,
          created_at: new Date().toISOString(),
        }),
      },
    )
    if (!insertResponse.ok) {
      return res.status(insertResponse.status).json({ error: await insertResponse.text() })
    }
    const inserted = await insertResponse.json()
    return res.status(200).json({
      ok: true,
      world: world.slug,
      member: inserted[0] || { world_id: world.id, user_id: targetUserId, role },
    })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }
}
