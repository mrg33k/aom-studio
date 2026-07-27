// POST /api/dashboard/project-invite  -- invite a user to a shared project
// GET  /api/dashboard/project-invite?project_id=...  -- list collaborators
// DELETE /api/dashboard/project-invite  { id }       -- revoke a grant
//
// Looks up the user by email, finds their world (client_id), creates a project_access entry.
// Only existing Corner users can be invited (no self-signup).
//
// AUTH (corner:identity-attribution, 2026-07-27). project_access rows ARE the
// cross-world grant table — hasSharedProjectAccess() in _lib/verifyTenant.js
// trusts them to decide whether a foreign world may read and post in a
// shared:<slug> room. Unauthenticated, this endpoint let anyone grant their own
// world into anyone's project, and its GET dumped the whole Supabase auth user
// list (emails, names, avatars) to the open internet.
//
// The ownership model (Patrik 2026-07-27): ONE world owns a project
// (projects.client_id) and shares it outward. Ownership never moves or splits.
// So only the HOLDER world may grant or revoke access — that is the gate below.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
]

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

function applyCors(req, res) {
  const origin = req.headers?.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

function sbHeaders(extra) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// projects.client_id IS the holder world. Returns null when the project row
// doesn't exist — the caller turns that into a 404 rather than a silent pass.
async function ownerWorldOfProject(projectId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=client_id&limit=1`,
    { headers: sbHeaders() }
  )
  if (!r.ok) return null
  const rows = await r.json().catch(() => null)
  const world = Array.isArray(rows) ? rows[0]?.client_id : null
  return world ? String(world).toLowerCase() : null
}

// Gate: the caller must be in the world that HOLDS this project.
// Returns { ok: true } or writes the error response and returns { ok: false }.
async function requireProjectOwner(projectId, req, res) {
  if (!projectId || !UUID_RE.test(String(projectId))) {
    res.status(400).json({ error: 'valid project_id required' })
    return { ok: false }
  }
  const ownerWorld = await ownerWorldOfProject(projectId)
  if (!ownerWorld) {
    res.status(404).json({ error: 'project not found' })
    return { ok: false }
  }
  try {
    await verifyTenant(ownerWorld, req)
  } catch (err) {
    if (err instanceof TenantAuthError) {
      res.status(err.status || 403).json({ error: err.message })
      return { ok: false }
    }
    throw err
  }
  return { ok: true, ownerWorld }
}

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // GET: list collaborators for a project
  if (req.method === 'GET') {
    const { project_id } = req.query
    if (!project_id) return res.status(400).json({ error: 'project_id required' })

    const gate = await requireProjectOwner(project_id, req, res)
    if (!gate.ok) return

    // Fetch project_access entries
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${encodeURIComponent(project_id)}&select=id,client_id,role,created_at`,
      { headers: sbHeaders() }
    )
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch collaborators' })
    const entries = await r.json()

    // Resolve a display identity per granted world. Behind the owner gate now,
    // so this list never leaves the holder world.
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

    const gate = await requireProjectOwner(project_id, req, res)
    if (!gate.ok) return

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
      `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${encodeURIComponent(project_id)}&client_id=eq.${encodeURIComponent(targetWorld)}&select=id`,
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
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(project_id)}&select=slug,name`,
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
    if (!UUID_RE.test(String(id))) return res.status(400).json({ error: 'valid id required' })

    // Resolve which project this grant belongs to, then gate on its holder
    // world — revoking is an ownership action, same as granting.
    const rowR = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?id=eq.${encodeURIComponent(id)}&select=project_id&limit=1`,
      { headers: sbHeaders() }
    )
    if (!rowR.ok) return res.status(502).json({ error: 'Failed to look up access row' })
    const rows = await rowR.json().catch(() => null)
    const projectId = Array.isArray(rows) ? rows[0]?.project_id : null
    if (!projectId) return res.status(404).json({ error: 'access row not found' })

    const gate = await requireProjectOwner(projectId, req, res)
    if (!gate.ok) return

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: sbHeaders({ 'Prefer': 'return=minimal' }) }
    )
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
