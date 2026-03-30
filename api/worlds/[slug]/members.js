// POST /api/worlds/:slug/members
// Body: { user_id, target_user_id, role }
// Add a user to a world. Requires admin or owner role (or super-admin).
// role defaults to 'member' if not specified.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '833f6828-1dae-409c-a24b-1438f46544d0'

const VALID_ROLES = ['owner', 'admin', 'member', 'viewer']

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const slug = req.query.slug
  const { user_id: userId, target_user_id: targetUserId, role = 'member' } = req.body || {}

  if (!slug) return res.status(400).json({ error: 'slug required' })
  if (!userId) return res.status(400).json({ error: 'user_id required' })
  if (!targetUserId) return res.status(400).json({ error: 'target_user_id required' })
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })

  const isSuperAdmin = userId === SUPER_ADMIN_USER_ID

  try {
    // Fetch world
    const wr = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&select=id,name,client_id&limit=1`,
      { headers: sbHeaders() }
    )
    if (!wr.ok) return res.status(wr.status).json({ error: await wr.text() })
    const worlds = await wr.json()
    if (!worlds.length) return res.status(404).json({ error: 'World not found' })

    const world = worlds[0]

    // Admin check: must be owner, admin, or super-admin to add members
    if (!isSuperAdmin) {
      const mr = await fetch(
        `${SUPABASE_URL}/rest/v1/world_members?world_id=eq.${world.id}&user_id=eq.${userId}&role=in.(owner,admin)&select=role&limit=1`,
        { headers: sbHeaders() }
      )
      if (mr.ok) {
        const membership = await mr.json()
        if (!membership.length) return res.status(403).json({ error: 'Admin or owner required' })
      } else {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    // Add member (upsert: update role if already a member)
    const insertR = await fetch(
      `${SUPABASE_URL}/rest/v1/world_members?on_conflict=world_id,user_id`,
      {
        method: 'POST',
        headers: {
          ...sbHeaders(),
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          world_id: world.id,
          user_id: targetUserId,
          role,
          created_at: new Date().toISOString(),
        }),
      }
    )

    if (!insertR.ok) {
      const err = await insertR.text()
      return res.status(insertR.status).json({ error: err })
    }

    const inserted = await insertR.json()

    return res.status(200).json({
      ok: true,
      world: world.slug,
      member: inserted[0] || { world_id: world.id, user_id: targetUserId, role },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
