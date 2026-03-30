// GET /api/worlds?user_id={uid}
// List worlds the requesting user can access.
// Super-admin (SUPER_ADMIN_USER_ID env var) sees all worlds.
// Regular users see only worlds where they're a member.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '833f6828-1dae-409c-a24b-1438f46544d0'

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function getActiveCookie(req) {
  const raw = req.headers.cookie || ''
  const match = raw.match(/(?:^|;\s*)active_world=([^;]+)/)
  return match ? match[1] : null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const userId = req.query.user_id
  if (!userId) return res.status(400).json({ error: 'user_id required' })

  const isSuperAdmin = userId === SUPER_ADMIN_USER_ID

  try {
    let worldsUrl
    if (isSuperAdmin) {
      // Super-admin: all active worlds
      worldsUrl = `${SUPABASE_URL}/rest/v1/worlds?status=eq.active&select=id,name,slug,client_id,status,config,created_at&order=name.asc`
    } else {
      // Regular user: worlds they're a member of
      worldsUrl = `${SUPABASE_URL}/rest/v1/worlds?status=eq.active&id=in.(select world_id from world_members where user_id=eq.${userId})&select=id,name,slug,client_id,status,config,created_at&order=name.asc`
    }

    const r = await fetch(worldsUrl, { headers: sbHeaders() })
    if (!r.ok) {
      const err = await r.text()
      return res.status(r.status).json({ error: err })
    }

    let worlds = await r.json()

    // If regular user, also fetch their role in each world
    if (!isSuperAdmin && worlds.length > 0) {
      const worldIds = worlds.map(w => w.id).join(',')
      const membersUrl = `${SUPABASE_URL}/rest/v1/world_members?user_id=eq.${userId}&world_id=in.(${worldIds})&select=world_id,role`
      const mr = await fetch(membersUrl, { headers: sbHeaders() })
      if (mr.ok) {
        const memberships = await mr.json()
        const roleMap = {}
        memberships.forEach(m => { roleMap[m.world_id] = m.role })
        worlds = worlds.map(w => ({ ...w, role: roleMap[w.id] || 'member' }))
      }
    } else if (isSuperAdmin) {
      worlds = worlds.map(w => ({ ...w, role: 'owner' }))
    }

    const activeWorld = getActiveCookie(req)

    return res.status(200).json({
      worlds,
      active_world: activeWorld || (worlds.length > 0 ? worlds[0].slug : null),
      is_super_admin: isSuperAdmin,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
