// GET  /api/dashboard/worlds       -- list all user worlds (admin view)
// POST /api/dashboard/worlds       -- create a new world (new user + world slug)

import {
  authenticateWorldRequest,
  sendWorldAuthError,
  setWorldCors,
} from '../_lib/worldAuth.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  setWorldCors(req, res, 'GET,POST')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const adminHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }

  try {
    const { isSuperAdmin } = await authenticateWorldRequest(req)
    if (!isSuperAdmin) return res.status(403).json({ error: 'Super-admin access required' })
  } catch (error) {
    return sendWorldAuthError(res, error)
  }

  // GET: list all worlds from Supabase admin users
  if (req.method === 'GET') {
    try {
      // Fetch up to 1000 users (pagination could be added later)
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: adminHeaders,
      })
      if (!r.ok) {
        const text = await r.text()
        return res.status(r.status).json({ error: text })
      }
      const data = await r.json()
      const users = data.users || []
      // Extract world metadata from each user
      const worlds = users.map(u => ({
        id: u.id,
        email: u.email || '',
        world: u.user_metadata?.world || '',
        name: u.user_metadata?.workspace_name
           || u.user_metadata?.display_name
           || u.user_metadata?.name
           || u.user_metadata?.full_name
           || (u.user_metadata?.world || '').toUpperCase()
           || u.email?.split('@')[0]
           || 'Unknown',
        created_at: u.created_at || '',
      }))
      // Deduplicate by world slug (multiple users can share a world)
      // Sort: users with workspace_name first (they're the world "owner")
      worlds.sort((a, b) => {
        const aHas = users.find(u => u.id === a.id)?.user_metadata?.workspace_name ? 0 : 1
        const bHas = users.find(u => u.id === b.id)?.user_metadata?.workspace_name ? 0 : 1
        return aHas - bHas
      })
      const seen = new Set()
      const unique = worlds.filter(w => {
        if (seen.has(w.world)) return false
        seen.add(w.world)
        return true
      })
      return res.status(200).json({ worlds: unique })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST: create a new user + world
  if (req.method === 'POST') {
    const { email, password, world, name } = req.body || {}
    if (!email || !password || !world) {
      return res.status(400).json({ error: 'email, password, and world are required' })
    }
    const worldSlug = world.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            world: worldSlug,
            full_name: (name || email.split('@')[0]).trim(),
            temp_password: true,
          },
        }),
      })
      if (!r.ok) {
        const text = await r.text()
        return res.status(r.status).json({ error: text })
      }
      const created = await r.json()
      return res.status(200).json({ ok: true, world: worldSlug, user: created })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
