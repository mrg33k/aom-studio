// GET /api/dashboard/file-content?slug=<slug>
// GET /api/dashboard/file-content?project=<slug>&filename=<name>   (R37b: scaffold lookup)
//
// Two read paths:
// 1. Legacy: ?slug=<slug> reads a build-time generated brief from
//    src/data/briefs/<slug>.json. Slug validated to prevent path traversal.
// 2. R37b: ?project=<slug>&filename=<filename.md> looks up the newest
//    scaffold_file event for that project + filename (Convex events:find),
//    markdown to HTML via `marked`, returned in the same shape so the dashboard
//    viewer overlay treats it like any other brief.
//
// AUTH (r7:open-agent-surface, 2026-07-27). The `?project=&filename=` path
// returns a project's SCAFFOLD CANON, the VISION / BUILD / CONTEXT markdown
// that rule 5 makes every agent read as the bible for that room. It is gated
// by verifyProjectAccess on the ROOT project slug: the holder world, any world
// holding a grant, and (for a project with no registry row) a world that has
// a room for it. A stranger gets 403 instead of the canon.
//
// The legacy `?slug=` path is untouched: it reads a build-time brief baked into
// the deployed bundle, carries no tenant, and gating it would break the public
// brief viewer for nothing.
//
// corner:retire-supabase (2026-09-03): Convex only. No Supabase in this file.

import { readFileSync } from 'fs'
import { join } from 'path'
import { marked } from 'marked'
import { applyCors } from '../_lib/originAllowlist.js'

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

function sendAuthError(res, err) {
  return res.status(err?.status || 403).json({ error: err?.message || 'forbidden' })
}

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false })

// The newest scaffold_file event for this project + filename. The ledger is
// append-only; every rewrite of a stub appends a row, so newest wins.
async function fetchScaffoldRow(project, filename, token) {
  try {
    const rows = await convexQuery('events:find', {
      event_type: SCAFFOLD_EVENT_TYPE,
      agent: project,
      payload_eq: { key: 'filename', value: filename },
      order: 'desc',
      limit: 1,
    }, token)
    return Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  applyCors(req, res, 'GET')
  // Canon is per-world now, so it must not sit in a shared cache.
  res.setHeader('Cache-Control', 'private, no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { slug, project, filename } = req.query

  // R37b: scaffold lookup path
  if (project && filename) {
    // Allow colon-joined mission paths (e.g. 'corner:files-in-app')
    if (!/^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/.test(String(project)) || String(project).length > 80) {
      return res.status(400).json({ error: 'Invalid project' })
    }
    if (!/^[A-Za-z0-9._/-]+$/.test(String(filename)) || String(filename).length > 80 || String(filename).includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    // The tenant gate is MANDATORY and runs against the caller's verified
    // session. Mission paths are colon-joined under a root project, so access
    // is decided on the root slug.
    const rootProject = String(project).split(':')[0]
    let verified
    try {
      verified = await verifyProjectAccess(rootProject, req)
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err)
      return res.status(500).json({ error: err?.message || 'auth check failed' })
    }
    const row = await fetchScaffoldRow(String(project), String(filename), verified.token)
    if (!row) return res.status(404).json({ error: 'Scaffold file not found' })
    const payload = row.payload || {}
    const raw = String(payload.content || '')
    let html = ''
    try { html = marked.parse(raw) } catch { html = `<pre>${raw.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre>` }
    return res.status(200).json({
      slug: String(filename).replace(/^.*\//, '').replace(/\.md$/, ''),
      title: String(filename),
      project: row.agent || project,
      filename: String(filename),
      source: 'scaffold',
      date: payload.updated_at || row.timestamp || '',
      summary: '',
      content: html,
    })
  }

  // Legacy slug path: build-time briefs
  if (!slug || !/^[a-z0-9-]+$/.test(String(slug))) {
    return res.status(400).json({ error: 'Invalid slug' })
  }

  try {
    const filePath = join(process.cwd(), 'src', 'data', 'briefs', `${slug}.json`)
    const raw = readFileSync(filePath, 'utf-8')
    const brief = JSON.parse(raw)
    return res.status(200).json({
      slug: brief.slug || slug,
      title: brief.title || slug,
      agent: brief.agent || '',
      date: brief.dateFormatted || brief.date || '',
      summary: brief.summary || '',
      content: brief.content || '',
    })
  } catch {
    return res.status(404).json({ error: 'Brief not found' })
  }
}
