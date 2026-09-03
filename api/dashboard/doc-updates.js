// GET /api/dashboard/doc-updates?project=corner[&mission=launch-mvp][&limit=40]
//
// R75-h1: returns recent doc_update events for a project/mission surface.
// Mirrors /api/dashboard/message-steps.
//
// Response shape:
//   { updates: [{ id, agent, file, project, mission, doc_type, summary,
//                 commit_sha, actor, timestamp }] }
//
// SECURITY (corner:tenant-isolation R1): the events ledger has no world column,
// so ?project is required and gated by verifyProjectAccess(project); only that
// project's rows are returned.
//
// corner:retire-supabase (2026-09-03): reads events:find on Convex.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

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

// May the caller reach this project? The holder world and any world with a
// grant pass (projects:hasAccess). A project with no registry row is admitted
// when the caller's world already has a room for it.
async function verifyProjectAccess(projectSlug, req) {
  const slug = String(projectSlug || '').trim().toLowerCase()
  if (!slug) throw new AuthError('project required', 400)
  const who = await requireCaller(req)
  const project = await convexQuery('projects:lookupBySlug', { slug }, who.token).catch(() => null)
  const base = { ok: true, projectSlug: slug, projectId: project?.projectId || null, ownerWorld: project?.ownerWorld || null, registered: !!project, tenant: project?.ownerWorld || who.world || null, ...who }
  if (who.superAdmin) return { ...base, via: 'super-admin', isAdmin: true }
  if (who.world) {
    const access = await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null)
    if (access && access.ok) return { ...base, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' }
    if (!project) {
      const rooms = await convexQuery('rooms:listRooms', { worldId: who.world }, who.token).catch(() => [])
      const hit = (Array.isArray(rooms) ? rooms : []).some(r => String(r.project || '').toLowerCase() === slug)
      if (hit) return { ...base, via: 'unregistered-project' }
    }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" has no access to project "${slug}"`, 403)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const project = (req.query.project || '').toString().toLowerCase()
  if (!project) return res.status(400).json({ error: 'project required' })
  let verified
  try {
    verified = await verifyProjectAccess(project, req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }
  const mission = (req.query.mission || '').toString().toLowerCase()
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100)

  let rows = []
  try {
    rows = await convexQuery('events:find', {
      event_type: 'doc_update',
      payload_eq: { key: 'project', value: project },
      order: 'desc',
      limit: mission ? limit * 4 : limit,
    }, verified.token)
  } catch (_) { rows = [] }

  const updates = []
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const p = row.payload || {}
    if ((p.project || '').toLowerCase() !== project) continue
    if (mission && (p.mission || '').toLowerCase() !== mission) continue
    updates.push({
      id: row.id,
      agent: row.agent,
      file: p.file || '',
      project: p.project || '',
      mission: p.mission || '',
      doc_type: p.doc_type || '',
      summary: p.summary || 'updated',
      commit_sha: p.commit_sha || '',
      actor: p.actor || '',
      timestamp: row.timestamp,
    })
    if (updates.length >= limit) break
  }
  return res.status(200).json({ updates })
}
