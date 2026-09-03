// POST /api/dashboard/project-invite  -- invite a user to a shared project
// GET  /api/dashboard/project-invite?project_id=...  -- list collaborators
// DELETE /api/dashboard/project-invite  { id }       -- revoke a grant
//
// Looks up the user by email, finds their world, creates a sharing grant.
// Only existing Corner users can be invited (no self-signup).
//
// corner:retire-supabase (2026-09-03): the grant table is Convex projectAccess
// (projects:access / grantAccess / revokeAccess), the person lookup is
// users:getByEmail + users:worldsFor, and the room the shared project gets in
// the invited world is a Convex room (rooms:createRoom). Was Supabase
// project_access, the auth admin user list and an agent_status row.
//
// AUTH (corner:identity-attribution, 2026-07-27). Grants ARE the cross-world
// access table: the tenant gate trusts them to decide whether a foreign world
// may read and post in a shared project. Unauthenticated, this endpoint let
// anyone grant their own world into anyone's project, and its GET dumped the
// whole user list (emails, names, avatars) to the open internet.
//
// The ownership model (Patrik 2026-07-27): ONE world owns a project and shares
// it outward. Ownership never moves or splits. So only the HOLDER world may
// grant or revoke access, and that is the gate below.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js'

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

// Convex document ids are short base32-ish strings; a Supabase uuid is not one.
const ID_RE = /^[a-z0-9_-]{8,64}$/i

// The project row by id (across every world, since the holder is what we are
// finding out). Null when it does not exist.
async function projectById(projectId) {
  const rows = await convexQuery('projects:list', { includeArchived: true })
  return (Array.isArray(rows) ? rows : []).find(p => String(p._id) === String(projectId)) || null
}

// Gate: the caller must be in the world that HOLDS this project.
// Returns { ok: true, ownerWorld, project } or writes the error response and returns { ok: false }.
async function requireProjectOwner(projectId, req, res) {
  if (!projectId || !ID_RE.test(String(projectId))) {
    res.status(400).json({ error: 'valid project_id required' })
    return { ok: false }
  }
  const project = await projectById(projectId)
  const ownerWorld = project?.worldSlug ? String(project.worldSlug).toLowerCase() : null
  if (!project || !ownerWorld) {
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
  return { ok: true, ownerWorld, project }
}

// One person to show for a granted world: the first member listed for it.
async function identityForWorld(worldId) {
  try {
    const members = await convexQuery('worlds:membersOf', { worldId })
    const first = Array.isArray(members) && members[0]
    return first ? { email: first.email || null, display_name: first.name || null } : { email: null, display_name: null }
  } catch {
    return { email: null, display_name: null }
  }
}

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: list collaborators for a project
  if (req.method === 'GET') {
    const { project_id } = req.query
    if (!project_id) return res.status(400).json({ error: 'project_id required' })

    const gate = await requireProjectOwner(project_id, req, res)
    if (!gate.ok) return

    let entries
    try {
      entries = await convexQuery('projects:access', { projectId: project_id })
    } catch {
      return res.status(502).json({ error: 'Failed to fetch collaborators' })
    }

    // Resolve a display identity per granted world. Behind the owner gate now,
    // so this list never leaves the holder world.
    const collaborators = []
    for (const entry of (Array.isArray(entries) ? entries : [])) {
      const who = await identityForWorld(entry.worldId)
      collaborators.push({
        id: entry._id,
        client_id: entry.worldSlug || null,
        role: entry.role === 'viewer' ? 'read_only' : 'member',
        email: who.email,
        display_name: who.display_name || entry.worldName || null,
        avatar_url: null,
      })
    }

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

    // Look up the person by email
    const targetUser = await convexQuery('users:getByEmail', { email: String(email).trim().toLowerCase() })
    if (!targetUser?._id) {
      return res.status(404).json({ error: 'No Corner account found for that email. Users must be invited to Corner first.' })
    }

    // Their world: the shared one they belong to, never the personal user-*
    // fallback when anything better exists.
    const worlds = await convexQuery('users:worldsFor', { userId: targetUser._id })
    const list = Array.isArray(worlds) ? worlds : []
    const target = list.find(w => w.slug && !String(w.slug).startsWith('user-')) || list[0] || null
    const targetWorld = target?.slug ? String(target.slug).toLowerCase() : null
    if (!targetWorld) {
      return res.status(400).json({ error: 'User has no world configured.' })
    }
    if (targetWorld === gate.ownerWorld) {
      return res.status(409).json({ error: 'That person is already in the world that holds this project.' })
    }

    // Check if already has access
    const existing = await convexQuery('projects:access', { projectId: project_id })
    if ((Array.isArray(existing) ? existing : []).some(g => g.worldSlug === targetWorld)) {
      return res.status(409).json({ error: 'User already has access to this project.' })
    }

    try {
      await convexMutation('projects:grantAccess', { projectId: project_id, worldId: targetWorld, role: 'editor' })
    } catch (err) {
      return res.status(502).json({ error: 'Failed to create access', detail: err.message })
    }

    // Give the shared project a room in the invited world so it shows up in
    // their conversation list. Best effort; the grant is what matters.
    try {
      if (target?.worldId) {
        await convexMutation('rooms:createRoom', {
          worldId: target.worldId,
          title: gate.project.name || gate.project.slug,
          kind: 'project',
          project: gate.project.slug,
          subtitle: `Shared by ${gate.ownerWorld}`,
        })
      }
    } catch { /* non-fatal */ }

    return res.status(200).json({
      ok: true,
      invited: {
        email: targetUser.email,
        world: targetWorld,
        display_name: targetUser.name || null,
      },
    })
  }

  // DELETE: remove access
  if (req.method === 'DELETE') {
    const { id, project_id } = { ...(req.query || {}), ...(req.body || {}) }
    if (!id) return res.status(400).json({ error: 'id required' })
    if (!ID_RE.test(String(id))) return res.status(400).json({ error: 'valid id required' })

    // Resolve which project this grant belongs to, then gate on its holder
    // world. Revoking is an ownership action, same as granting. With no
    // project_id given, the caller's own projects are scanned for the grant.
    let projectId = project_id || null
    if (!projectId) {
      const rows = await convexQuery('projects:list', { includeArchived: true })
      for (const p of (Array.isArray(rows) ? rows : [])) {
        const grants = await convexQuery('projects:access', { projectId: p._id })
        if ((Array.isArray(grants) ? grants : []).some(g => String(g._id) === String(id))) { projectId = p._id; break }
      }
    }
    if (!projectId) return res.status(404).json({ error: 'access row not found' })

    const gate = await requireProjectOwner(projectId, req, res)
    if (!gate.ok) return

    const grants = await convexQuery('projects:access', { projectId })
    if (!(Array.isArray(grants) ? grants : []).some(g => String(g._id) === String(id))) {
      return res.status(404).json({ error: 'access row not found' })
    }

    try {
      const out = await convexMutation('projects:revokeAccess', { id })
      return res.status(out?.ok ? 200 : 502).json({ ok: !!out?.ok })
    } catch {
      return res.status(502).json({ ok: false })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
