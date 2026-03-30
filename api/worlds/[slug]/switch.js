// POST /api/worlds/:slug/switch
// Body: { user_id }
// Switches the user's active world.
// Sets active_world cookie + returns world client_id for dashboard scoping.

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const slug = req.query.slug
  const { user_id: userId } = req.body || {}
  if (!slug) return res.status(400).json({ error: 'slug required' })
  if (!userId) return res.status(400).json({ error: 'user_id required' })

  const isSuperAdmin = userId === SUPER_ADMIN_USER_ID

  try {
    // Fetch world
    const wr = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&status=eq.active&select=id,name,slug,client_id,config&limit=1`,
      { headers: sbHeaders() }
    )
    if (!wr.ok) return res.status(wr.status).json({ error: await wr.text() })
    const worlds = await wr.json()
    if (!worlds.length) return res.status(404).json({ error: 'World not found' })

    const world = worlds[0]

    // Access check
    if (!isSuperAdmin) {
      const mr = await fetch(
        `${SUPABASE_URL}/rest/v1/world_members?world_id=eq.${world.id}&user_id=eq.${userId}&select=role&limit=1`,
        { headers: sbHeaders() }
      )
      if (mr.ok) {
        const membership = await mr.json()
        if (!membership.length) return res.status(403).json({ error: 'Access denied' })
      }
    }

    // Set active_world cookie (30 days, HttpOnly, SameSite=Lax)
    const cookieVal = `active_world=${encodeURIComponent(slug)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax; HttpOnly`
    res.setHeader('Set-Cookie', cookieVal)

    return res.status(200).json({
      ok: true,
      world: world.slug,
      client_id: world.client_id,
      name: world.name,
      config: world.config,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
