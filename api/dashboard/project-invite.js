// POST /api/dashboard/project-invite  -- invite a user to a shared project
// GET  /api/dashboard/project-invite?project_id=...  -- list collaborators
//
// Looks up the user by email, finds their world (client_id), creates a project_access entry.
// Only existing Corner users can be invited (no self-signup).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders(extra) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // GET: list collaborators for a project
  if (req.method === 'GET') {
    const { project_id } = req.query
    if (!project_id) return res.status(400).json({ error: 'project_id required' })

    // Fetch project_access entries
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${project_id}&select=id,client_id,role,created_at`,
      { headers: sbHeaders() }
    )
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch collaborators' })
    const entries = await r.json()

    // Fetch user details for each client_id (world)
    const usersR = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: sbHeaders() }
    )
    const allUsers = usersR.ok ? (await usersR.json()).users || [] : []

    const collaborators = entries.map(entry => {
      const user = allUsers.find(u => u.user_metadata?.world === entry.client_id)
      return {
        id: entry.id,
        client_id: entry.client_id,
        role: entry.role,
        email: user?.email || null,
        display_name: user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || null,
        avatar_url: user?.user_metadata?.avatar_url || null,
      }
    })

    return res.status(200).json({ collaborators })
  }

  // POST: invite a user by email
  if (req.method === 'POST') {
    const { project_id, email } = req.body || {}
    if (!project_id || !email) {
      return res.status(400).json({ error: 'project_id and email required' })
    }

    // Look up user by email
    const usersR = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: sbHeaders() }
    )
    if (!usersR.ok) return res.status(502).json({ error: 'Failed to look up users' })
    const allUsers = (await usersR.json()).users || []
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

    if (!targetUser) {
      return res.status(404).json({ error: 'No Corner account found for that email. Users must be invited to Corner first.' })
    }

    const targetWorld = targetUser.user_metadata?.world
    if (!targetWorld) {
      return res.status(400).json({ error: 'User has no world configured.' })
    }

    // Check if already has access
    const existR = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${project_id}&client_id=eq.${targetWorld}&select=id`,
      { headers: sbHeaders() }
    )
    if (existR.ok) {
      const existing = await existR.json()
      if (existing.length > 0) {
        return res.status(409).json({ error: 'User already has access to this project.' })
      }
    }

    // Create project_access entry
    const crypto = await import('crypto')
    const insertR = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access`,
      {
        method: 'POST',
        headers: sbHeaders({ 'Prefer': 'return=representation' }),
        body: JSON.stringify({
          id: crypto.randomUUID(),
          project_id,
          client_id: targetWorld,
          role: 'member',
        }),
      }
    )
    if (!insertR.ok) {
      const err = await insertR.text()
      return res.status(502).json({ error: 'Failed to create access', detail: err })
    }

    // Also create an agent_status entry for the shared project in the target world
    // so it shows up in their conversation list
    try {
      // Get project details
      const projR = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${project_id}&select=slug,name`,
        { headers: sbHeaders() }
      )
      if (projR.ok) {
        const projs = await projR.json()
        if (projs[0]) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/agent_status`,
            {
              method: 'POST',
              headers: sbHeaders({ 'Prefer': 'return=minimal' }),
              body: JSON.stringify({
                slug: projs[0].slug,
                name: projs[0].name,
                status: 'idle',
                type: 'project',
                client_id: targetWorld,
              }),
            }
          )
        }
      }
    } catch { /* non-fatal */ }

    return res.status(200).json({
      ok: true,
      invited: {
        email: targetUser.email,
        world: targetWorld,
        display_name: targetUser.user_metadata?.display_name || targetUser.user_metadata?.full_name || null,
      },
    })
  }

  // DELETE: remove access
  if (req.method === 'DELETE') {
    const { id } = req.body || req.query || {}
    if (!id) return res.status(400).json({ error: 'id required' })

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?id=eq.${id}`,
      { method: 'DELETE', headers: sbHeaders({ 'Prefer': 'return=minimal' }) }
    )
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
