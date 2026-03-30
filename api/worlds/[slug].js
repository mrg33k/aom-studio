// GET /api/worlds/:slug?user_id={uid}
// Get world details + agents for that world.
// Super-admin sees any world. Members see their own worlds.

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { slug, user_id: userId } = req.query
  if (!slug) return res.status(400).json({ error: 'slug required' })
  if (!userId) return res.status(400).json({ error: 'user_id required' })

  const isSuperAdmin = userId === SUPER_ADMIN_USER_ID

  try {
    // Fetch world
    const wr = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,client_id,status,config,created_at&limit=1`,
      { headers: sbHeaders() }
    )
    if (!wr.ok) return res.status(wr.status).json({ error: await wr.text() })
    const worlds = await wr.json()
    if (!worlds.length) return res.status(404).json({ error: 'World not found' })

    const world = worlds[0]

    // Access check: super-admin bypasses, others need membership
    if (!isSuperAdmin) {
      const mr = await fetch(
        `${SUPABASE_URL}/rest/v1/world_members?world_id=eq.${world.id}&user_id=eq.${userId}&select=role&limit=1`,
        { headers: sbHeaders() }
      )
      if (mr.ok) {
        const membership = await mr.json()
        if (!membership.length) return res.status(403).json({ error: 'Access denied' })
        world.role = membership[0].role
      }
    } else {
      world.role = 'owner'
    }

    // Fetch agents scoped to this world's client_id
    const clientId = world.client_id
    let agents = []
    if (clientId) {
      const ar = await fetch(
        `${SUPABASE_URL}/rest/v1/agent_status?client_id=eq.${clientId}&select=agent_slug,agent_name,status,current_task,color&order=agent_name.asc`,
        { headers: sbHeaders() }
      )
      if (ar.ok) {
        agents = await ar.json()
      }
    }

    // Fetch members
    const membersR = await fetch(
      `${SUPABASE_URL}/rest/v1/world_members?world_id=eq.${world.id}&select=user_id,role,created_at&order=created_at.asc`,
      { headers: sbHeaders() }
    )
    const members = membersR.ok ? await membersR.json() : []

    return res.status(200).json({ world, agents, members })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
