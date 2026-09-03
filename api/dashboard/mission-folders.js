// /api/dashboard/mission-folders
//
// corner:right-menu R7: per-project sub-folders for missions.
//
// GET ?client=<world>[&project=<slug>]
//   -> { folders: [{id,project_slug,slug,name,parent_folder_slug,created_at}],
//        assignments: [{project_slug,mission_slug,folder_slug}] }
//
// POST { project_slug, name, client? }
//   -> creates folder, derived slug. Returns the new row.
//
// PUT  { project_slug, mission_slug, folder_slug | null, client? }
//   -> moves the mission into that folder. null = ungrouped.
//
// corner:retire-supabase (2026-09-03): folders live in the Convex
// missionFolders table (missions:folders / createFolder / assign). A folder
// row holds the mission slugs filed under it, so "assignments" are derived
// from the folders. The folder slug is derived from its name (unique within
// the project by a -2, -3 suffix). Every call verifies the caller against the
// world named by `client` (or the caller's own world when absent).

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

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'folder'
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return {} } }
  return await new Promise((resolve) => {
    let chunks = ''
    req.on('data', c => { chunks += c })
    req.on('end', () => { try { resolve(JSON.parse(chunks || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

// Folder slugs are derived from names in creation order, so two folders called
// "Ideas" in one project become ideas and ideas-2, and the mapping is stable.
function withSlugs(project, rows) {
  const taken = new Set()
  return (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .map(f => {
      const base = slugify(f.name)
      let slug = base
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
      taken.add(slug)
      return {
        id: f._id,
        project_slug: project,
        slug,
        name: f.name,
        parent_folder_slug: null,
        created_at: typeof f.createdAt === 'number' ? new Date(f.createdAt).toISOString() : null,
        mission_slugs: Array.isArray(f.missionSlugs) ? f.missionSlugs : [],
      }
    })
}

// Which world a request is about: explicit client, else the caller's own.
async function scopeWorld(explicit, req) {
  const given = explicit == null ? '' : String(explicit).trim().toLowerCase()
  if (given) return given
  const who = await requireCaller(req)
  if (!who.world) throw new AuthError('this account is not in a world; send an explicit client', 400)
  return who.world
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: list folders + assignments for the world (or one project of it)
  if (req.method === 'GET') {
    let verified
    try {
      verified = await verifyTenant(await scopeWorld(req.query.client, req), req)
    } catch (e) {
      if (e instanceof AuthError) return res.status(e.status).json({ error: e.message })
      return res.status(500).json({ error: String(e?.message || e) })
    }
    const onlyProject = req.query.project ? String(req.query.project).trim().toLowerCase() : ''
    try {
      let projectSlugs = []
      if (onlyProject) projectSlugs = [onlyProject]
      else {
        const projects = await convexQuery('projects:list', { worldSlug: verified.tenant, includeShared: true }, verified.token).catch(() => [])
        projectSlugs = (Array.isArray(projects) ? projects : []).map(p => p.slug).filter(Boolean)
      }
      const folders = []
      const assignments = []
      for (const project of projectSlugs.slice(0, 100)) {
        const rows = await convexQuery('missions:folders', { project }, verified.token).catch(() => [])
        for (const f of withSlugs(project, rows)) {
          const { mission_slugs, ...folder } = f
          folders.push(folder)
          for (const mission_slug of mission_slugs) {
            assignments.push({ project_slug: project, mission_slug, folder_slug: folder.slug, updated_at: folder.created_at })
          }
        }
      }
      return res.status(200).json({ folders, assignments })
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed', detail: String(e?.message || e) })
    }
  }

  // POST: create a new folder
  if (req.method === 'POST') {
    const body = await readBody(req)
    const project_slug = String(body.project_slug || '').trim().toLowerCase()
    const name = String(body.name || '').trim()
    if (!project_slug || !name) return res.status(400).json({ error: 'project_slug and name required' })

    let verified
    try {
      verified = await verifyTenant(await scopeWorld(body.client || body.client_id, req), req)
    } catch (e) {
      if (e instanceof AuthError) return res.status(e.status).json({ error: e.message })
      return res.status(500).json({ error: String(e?.message || e) })
    }
    try {
      const existing = await convexQuery('missions:folders', { project: project_slug }, verified.token).catch(() => [])
      const folderId = await convexMutation('missions:createFolder', { project: project_slug, name, order: (existing?.length || 0) }, verified.token)
      const rows = await convexQuery('missions:folders', { project: project_slug }, verified.token)
      const shaped = withSlugs(project_slug, rows).find(f => String(f.id) === String(folderId))
      if (!shaped) return res.status(502).json({ error: 'folder created but not found on re-read' })
      const { mission_slugs, ...folder } = shaped
      return res.status(201).json({ folder: { ...folder, created_by: verified.userId } })
    } catch (e) {
      return res.status(502).json({ error: 'insert failed', detail: String(e?.message || e) })
    }
  }

  // PUT: assign mission to folder (folder_slug=null takes it out of every folder)
  if (req.method === 'PUT') {
    const body = await readBody(req)
    const project_slug = String(body.project_slug || '').trim().toLowerCase()
    const mission_slug = String(body.mission_slug || '').trim()
    const folder_slug = body.folder_slug == null ? null : String(body.folder_slug).trim().toLowerCase() || null
    if (!project_slug || !mission_slug) return res.status(400).json({ error: 'project_slug and mission_slug required' })

    let verified
    try {
      verified = await verifyTenant(await scopeWorld(body.client || body.client_id, req), req)
    } catch (e) {
      if (e instanceof AuthError) return res.status(e.status).json({ error: e.message })
      return res.status(500).json({ error: String(e?.message || e) })
    }
    try {
      let folderId = null
      if (folder_slug) {
        const rows = await convexQuery('missions:folders', { project: project_slug }, verified.token).catch(() => [])
        const target = withSlugs(project_slug, rows).find(f => f.slug === folder_slug)
        if (!target) return res.status(404).json({ error: `no folder "${folder_slug}" in project "${project_slug}"` })
        folderId = target.id
      }
      await convexMutation('missions:assign', { missionSlug: mission_slug, folderId, project: project_slug }, verified.token)
      return res.status(200).json({
        assignment: {
          project_slug,
          mission_slug,
          folder_slug,
          updated_at: new Date().toISOString(),
          updated_by: verified.userId,
        },
      })
    } catch (e) {
      return res.status(502).json({ error: 'upsert failed', detail: String(e?.message || e) })
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, OPTIONS')
  return res.status(405).json({ error: 'method not allowed' })
}
