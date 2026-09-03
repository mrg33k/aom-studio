// /api/dashboard/mission-update
//
// corner:right-click-menu R6: rename + delete missions from the right-click
// menu. Display-name only rename (slug/folder stay; see VISION).
//
// PATCH { client_id, project_slug, mission_slug, name, path? }
//   -> renames everywhere the dashboard reads from:
//      1. `name:` frontmatter on disk via the tunnel (/mission-rename, which
//         also regenerates the live registry), when body.path is known
//      2. the mission room's title on Convex (rooms:setTitle)
// DELETE { client_id, project_slug, mission_slug, confirm: "DELETE" }
//   -> soft-archives the mission room (rooms:archive). Messages stay.
//
// corner:retire-supabase (2026-09-03): the old agent_status and mission_meta
// writes are gone; the room is the record.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`)
  const data = await r.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token)
const convexMutation = (path, args, token) => convexCall('mutation', path, args, token)

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null
  return null
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req)
  if (!token) throw new AuthError('sign-in required', 401)
  let who = null
  try { who = await convexQuery('users:verifyToken', {}, token) } catch { who = null }
  if (!who || !who.userId) throw new AuthError('invalid session', 401)
  const world = who.world ? String(who.world).toLowerCase() : null
  let superAdmin = false
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)) } catch { superAdmin = false }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token }
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase()
  if (!t) throw new AuthError('tenant required', 400)
  const who = await requireCaller(req)
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true }
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length)
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false }
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null)
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' }
    if (who.world === t) return { ok: true, tenant: t, ...who }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403)
}

const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com'

// A shared room ("shared:<slug>") has no world of its own; the room lives in
// the caller's world.
function worldSlugFor(verified) {
  const t = verified.tenant
  return t.startsWith('shared:') ? (verified.world || t) : t
}

async function findMissionRoom(worldSlug, projectSlug, missionSlug, token) {
  try {
    return await convexQuery('rooms:resolveCanonical', { worldSlug, kind: 'mission', key: missionSlug, project: projectSlug }, token)
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Derive tenant from body. For shared rooms callers pass shared:<slug>.
  const _requestedRaw = req.body && (req.body.client_id || req.body.clientId) ? String(req.body.client_id || req.body.clientId).trim() : ''
  if (!_requestedRaw) return res.status(401).json({ error: 'Missing client' })
  let verified
  try {
    verified = await verifyTenant(_requestedRaw, req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status || 401).json({ error: err.message })
    return res.status(500).json({ error: err.message || 'auth failure' })
  }
  const clientId = verified.tenant
  const updatedBy = verified.userId || null
  const worldSlug = worldSlugFor(verified)

  if (req.method === 'PATCH') {
    const { project_slug, mission_slug, name, path } = req.body || {}
    if (!project_slug || !mission_slug || !name) {
      return res.status(400).json({ error: 'project_slug + mission_slug + name required' })
    }
    const trimmed = String(name).trim()
    if (!trimmed) return res.status(400).json({ error: 'name cannot be blank' })

    // 1. Disk is canon: set `name:` frontmatter in the mission's CONTEXT.md via
    // the tunnel. Best-effort: a down tunnel must not block the room rename.
    let diskRenamed = false
    const missionPath = typeof path === 'string' && path.trim() ? path.trim() : null
    if (missionPath) {
      try {
        const r = await fetch(`${RAG_TUNNEL_URL}/mission-rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
          body: JSON.stringify({ path: missionPath, name: trimmed }),
        })
        const j = await r.json().catch(() => ({}))
        diskRenamed = !!(r.ok && j?.ok)
        if (!diskRenamed && r.status === 400) {
          return res.status(400).json({ error: j?.error || 'invalid mission path' })
        }
      } catch { /* tunnel down: proceed with the room rename */ }
    }

    // 2. The mission room carries the name the tree shows.
    let roomRenamed = false
    const room = await findMissionRoom(worldSlug, project_slug, mission_slug, verified.token)
    if (room) {
      try {
        const r = await convexMutation('rooms:setTitle', { key: CONVEX_KEY, roomId: String(room._id), title: trimmed }, verified.token)
        roomRenamed = !!(r && r.ok)
      } catch (err) {
        return res.status(502).json({ error: `room rename failed: ${err.message}` })
      }
    }
    if (!diskRenamed && !roomRenamed) {
      return res.status(404).json({ error: 'mission not found on disk or on Convex; nothing renamed' })
    }

    const now = new Date().toISOString()
    return res.status(200).json({
      ok: true,
      meta: {
        client_id: clientId,
        project_slug,
        mission_slug,
        display_name: trimmed,
        room_id: room ? String(room._id) : null,
        updated_by: updatedBy,
        updated_at: now,
      },
      disk_renamed: diskRenamed,
      room_renamed: roomRenamed,
    })
  }

  if (req.method === 'DELETE') {
    const { project_slug, mission_slug, confirm } = req.body || {}
    if (!project_slug || !mission_slug) return res.status(400).json({ error: 'project_slug + mission_slug required' })
    if (confirm !== 'DELETE') return res.status(400).json({ error: 'confirm must equal "DELETE" (caps)' })

    const room = await findMissionRoom(worldSlug, project_slug, mission_slug, verified.token)
    if (!room) return res.status(404).json({ error: 'mission room not found' })
    try {
      await convexMutation('rooms:archive', { roomId: String(room._id), archived: true }, verified.token)
    } catch (err) {
      return res.status(502).json({ error: `archive failed: ${err.message}` })
    }
    return res.status(200).json({ ok: true, archived: { project_slug, mission_slug, room_id: String(room._id), archived_at: new Date().toISOString() } })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
