// GET  /api/dashboard/files?type=briefs&project={slug|all}&client={world}   INDEX.json + scaffold docs
// GET  /api/dashboard/files?type=text&client={world}                         scaffold docs as text files
// GET  /api/dashboard/files?type=uploads&client={world}[&project=&mission=&agent=&limit=]
// GET  /api/dashboard/files?type=mirror&client={world}[&project=]            files rows across the world's rooms
// GET  /api/dashboard/files?type=mirror&client={world}&id={fileId}&content=1 one file's metadata
// GET  /api/dashboard/files?type=organize&client={world}[&project=]          mirror + uploads + review in one call
// GET  /api/dashboard/files?type=images                                      retired, returns an empty list
// POST /api/dashboard/files  { action: 'save-text', client_id, filename, content }  appends a scaffold doc
//
// corner:retire-supabase (2026-09-03). Every read is Convex:
//   scaffold docs  -> events:find (event_type scaffold_file), newest per file
//   tenant projects -> projects:list
//   uploads        -> messages:listSince + messages:listWithAttachments
//   mirror rows    -> rooms:listRooms + files:getFiles (the Convex files table)
//   save-text      -> tasks:logEvent (scaffold_file)
// Gone with Supabase: the corner-files Storage bucket (type=images lists
// nothing), the text_files table (type=text is scaffold docs only) and the
// disk mirror table project_files (type=mirror is the Convex files table).
// The events ledger is append-only, so DELETE is 410 for both kinds.

import { readFileSync } from 'fs'
import { join } from 'path'
import { attachmentsOfMessage } from '../_lib/uploadsIdentity.js'
import { fileRefFromChatAttachment } from '../_lib/fileRef.js'
import { buildFilesTruthSnapshot } from '../_lib/filesTruth.js'
import { buildReviewTruthSnapshot } from '../_lib/reviewTruth.js'
import { collectFromMessages, fetchDecisions } from './review-queue.js'

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

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'
const ROOM_SCAN_CAP = 80

function iso(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

// Project slugs this tenant holds (own rows plus grants). Archived rows are
// included so callers can also hide their files.
async function tenantProjects(clientId, token) {
  try {
    const rows = await convexQuery('projects:list', { worldSlug: clientId, includeShared: true, includeArchived: true }, token)
    return Array.isArray(rows) ? rows : []
  } catch { return [] }
}

// Scaffold .md docs from the events ledger as brief-shaped objects. The ledger
// is append-only: the newest row per (project, filename) is the document.
//   slug present       -> that project only
//   no slug + clientId -> every project of the tenant
//   neither            -> [] (never scan the whole ledger for nobody)
async function fetchScaffoldBriefs(slug, clientId, token) {
  let slugFilter = null
  if (slug) {
    slugFilter = [slug]
  } else if (clientId) {
    slugFilter = (await tenantProjects(clientId, token)).map(p => p.slug).filter(Boolean)
    if (!slugFilter.length) return []
  } else {
    return []
  }
  const allowed = new Set(slugFilter)
  let rows = []
  try {
    if (slugFilter.length === 1) {
      rows = await convexQuery('events:find', { event_type: SCAFFOLD_EVENT_TYPE, agent: slugFilter[0], order: 'desc', limit: 500 }, token)
    } else {
      rows = await convexQuery('events:find', { event_type: SCAFFOLD_EVENT_TYPE, order: 'desc', limit: 2000 }, token)
    }
  } catch { rows = [] }
  const seen = new Set()
  const out = []
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const agent = String(row.agent || '')
    const root = agent.split(':')[0]
    if (!allowed.has(agent) && !allowed.has(root)) continue
    const payload = row.payload || {}
    const filename = String(payload.filename || '')
    if (!filename.endsWith('.md')) continue
    const key = `${agent}::${filename}`
    if (seen.has(key)) continue
    seen.add(key)
    const ts = payload.updated_at || row.timestamp || null
    out.push({
      id: row.id,
      title: filename,
      filename,
      slug: filename.replace(/^.*\//, '').replace(/\.md$/, ''),
      project: agent || null,
      source: 'scaffold',
      content: payload.content || '',
      updated_at: ts,
      dateFormatted: ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    })
  }
  return out
}

function kindOfMime(mime, name) {
  const m = String(mime || '')
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m === 'application/pdf') return 'pdf'
  if (/\.(md|txt|json|csv|ya?ml)$/i.test(String(name || ''))) return 'text'
  return 'file'
}

// The Convex files table, walked room by room for the world. Shaped like the
// old disk-mirror rows so Organize keeps rendering.
async function fetchMirrorFilesForTenant({ clientId, project = null, token }) {
  const files = []
  let truncated = false
  try {
    const rooms = await convexQuery('rooms:listRooms', { worldId: clientId }, token)
    let picked = (Array.isArray(rooms) ? rooms : []).filter(r => !project || String(r.project || '').toLowerCase() === project)
    if (picked.length > ROOM_SCAN_CAP) { picked = picked.slice(0, ROOM_SCAN_CAP); truncated = true }
    const perRoom = await Promise.all(picked.map(async room => {
      const rows = await convexQuery('files:getFiles', { roomId: String(room._id) }, token).catch(() => [])
      return (Array.isArray(rows) ? rows : []).map(f => ({
        id: f._id,
        room_id: String(room._id),
        project: room.project || null,
        rel_path: f.name,
        name: f.name,
        ext: (String(f.name || '').match(/\.([A-Za-z0-9]+)$/) || [, ''])[1].toLowerCase(),
        kind: kindOfMime(f.mimeType, f.name),
        mime: f.mimeType || null,
        size: f.size ?? null,
        status: f.status || null,
        updated_at: iso(f.createdAt),
        last_editor: f.uploadedBy || null,
        storage_ref: f.storageId ? `convex://${f.storageId}` : null,
      }))
    }))
    for (const rows of perRoom) files.push(...rows)
    files.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
  } catch { /* return whatever we have */ }

  // Hide rows from archived or inactive projects; unarchive brings them back.
  try {
    const archived = new Set((await tenantProjects(clientId, token)).filter(p => p.archived || p.isActive === false).map(p => p.slug))
    if (archived.size) {
      for (let i = files.length - 1; i >= 0; i--) if (archived.has(files[i].project)) files.splice(i, 1)
    }
  } catch { /* over-show on failure; never hide live files by accident */ }

  return { files, truncated }
}

// Chat uploads for the world: human messages carrying attachments. One
// world-wide read (messages:listSince) finds the rooms; the per-room read
// (messages:listWithAttachments) resolves storage URLs.
async function fetchUploadFilesForTenant({ clientId, project = null, mission = null, agent = null, limit = 1000, token }) {
  const cap = Math.min(parseInt(limit || '500', 10) || 500, 1000)
  let recent = []
  try {
    recent = await convexQuery('messages:listSince', { worldSlug: clientId, since: 0, role: 'user', limit: 2000 }, token)
  } catch { recent = [] }
  const roomIds = []
  for (const r of (Array.isArray(recent) ? recent : [])) {
    const has = (Array.isArray(r.attachments) && r.attachments.length) || attachmentsOfMessage(r.metadata || {}).length
    if (has && !roomIds.includes(String(r.roomId))) roomIds.push(String(r.roomId))
  }
  const perRoom = await Promise.all(roomIds.slice(0, ROOM_SCAN_CAP).map(async roomId => {
    const r = await convexQuery('messages:listWithAttachments', { roomId, limit: 500 }, token).catch(() => null)
    return r && Array.isArray(r.messages) ? r.messages : []
  }))
  const roomMeta = new Map()
  for (const r of (Array.isArray(recent) ? recent : [])) roomMeta.set(String(r.roomId), r)

  const out = []
  const seenUrls = new Set()
  function pushAtt({ row, attachment, url: attUrl, mime, size, name, ts, who, proj, missionSlug, agentSlug }) {
    if (!attUrl || seenUrls.has(attUrl)) return
    seenUrls.add(attUrl)
    let displayName = name
    if (!displayName) {
      try { displayName = decodeURIComponent(attUrl.split('/').pop().split('?')[0]) }
      catch { displayName = attUrl.split('/').pop() }
    }
    const message = {
      id: String(row._id),
      project: proj || null,
      user_name: who || null,
      timestamp: ts,
      text: row.text || '',
      metadata: {
        ...((row && row.metadata && typeof row.metadata === 'object') ? row.metadata : {}),
        project_slug: proj || null,
        mission_slug: missionSlug || null,
        agent_slug: agentSlug || null,
      },
    }
    const fileRef = fileRefFromChatAttachment({
      attachment: { ...(attachment || {}), url: attUrl, mime, size, name: displayName },
      message,
      sourceKind: 'upload',
      tenantId: clientId,
    })
    out.push({
      id: attUrl,
      name: displayName,
      path: displayName,
      relativePath: displayName,
      date: ts,
      size: size ?? null,
      mime: mime || null,
      uploader: who || null,
      url: attUrl,
      project: proj || null,
      mission: missionSlug || null,
      agent: agentSlug || null,
      health_status: fileRef.health.status,
      file_ref: fileRef,
    })
  }

  for (const rows of perRoom) {
    for (const row of rows) {
      if ((row.role || (row.agentSlug ? 'assistant' : 'user')) !== 'user') continue
      const md = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {}
      const meta = roomMeta.get(String(row.roomId)) || {}
      const scope = {
        proj: meta.project || md.project_slug || null,
        missionSlug: md.mission_slug || null,
        agentSlug: md.agent_slug || null,
      }
      if (project && String(scope.proj || '').toLowerCase() !== project) continue
      if (mission && String(scope.missionSlug || '').toLowerCase() !== mission) continue
      if (agent && String(scope.agentSlug || '').toLowerCase() !== agent) continue
      const ts = iso(row.createdAt)
      const who = row.userName || null
      const atts = [...(Array.isArray(row.attachments) ? row.attachments : []), ...attachmentsOfMessage(md)]
      for (const a of atts) {
        pushAtt({ row, attachment: a, url: a.url, mime: a.mime, size: a.size, name: a.name, ts, who, ...scope })
      }
      if (out.length >= cap) return out
    }
  }
  return out
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // ---- GET briefs from INDEX.json (+ scaffold merge) -------------------
  if (req.method === 'GET' && req.query.type === 'briefs') {
    const project = req.query.project
    const clientId = req.query.client ? String(req.query.client).trim().toLowerCase() : ''
    if (!project) return res.status(400).json({ error: 'project required' })
    if (!clientId) return res.status(400).json({ error: 'client (tenant) required for tenant scoping' })
    let verified
    try { verified = await verifyTenant(clientId, req) }
    catch (e) { return res.status(e.status || 403).json({ error: e.message || 'forbidden', briefs: [] }) }

    let index = {}
    try {
      const indexPath = join(process.cwd(), 'docs', 'briefs', 'INDEX.json')
      index = JSON.parse(readFileSync(indexPath, 'utf-8'))
    } catch { index = {} }

    const tenantSlugs = new Set((await tenantProjects(clientId, verified.token)).map(p => p.slug).filter(Boolean))

    if (project === 'all') {
      const fromIndex = Object.entries(index)
        .filter(([slug]) => tenantSlugs.has(slug))
        .flatMap(([slug, entries]) => (Array.isArray(entries) ? entries : []).map(b => ({ ...b, project: slug })))
      const fromScaffold = await fetchScaffoldBriefs(null, clientId, verified.token)
      const seen = new Set(fromIndex.map(b => `${b.project || ''}::${b.slug || b.filename || b.title || ''}`))
      const merged = [
        ...fromIndex,
        ...fromScaffold.filter(s => !seen.has(`${s.project || ''}::${s.slug || s.filename || ''}`)),
      ]
      merged.sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
      return res.status(200).json({ briefs: merged })
    }

    // Per-project: the project must belong to (or be shared with) the tenant.
    if (!tenantSlugs.has(String(project))) {
      return res.status(200).json({ briefs: [] })
    }
    const fromIndex = index[project] || []
    const fromScaffold = await fetchScaffoldBriefs(String(project), clientId, verified.token)
    const seen = new Set(fromIndex.map(b => b.slug || b.filename || b.title || ''))
    const merged = [
      ...fromIndex,
      ...fromScaffold.filter(s => !seen.has(s.slug || s.filename || '')),
    ]
    merged.sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
    return res.status(200).json({ briefs: merged })
  }

  // ---- GET: list files -------------------------------------------------
  if (req.method === 'GET') {
    const { type, client } = req.query

    if (type === 'images') {
      // The corner-files Storage bucket went with Supabase. The one legacy
      // caller (CV3 tasks drawer) degrades to an empty list.
      return res.status(200).json({ files: [], retired: true })
    }

    if (type === 'organize') {
      const clientId = client ? String(client).trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [], uploads: [] })
      let verified
      try { verified = await verifyTenant(clientId, req) }
      catch (e) { return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [], uploads: [] }) }

      const project = req.query.project ? String(req.query.project).trim().toLowerCase() : null
      const [mirrorResult, uploads, reviewRows, decisions] = await Promise.all([
        fetchMirrorFilesForTenant({ clientId, project, token: verified.token }),
        fetchUploadFilesForTenant({ clientId, project, limit: req.query.uploadLimit || '1000', token: verified.token }),
        Promise.resolve(collectFromMessages(clientId)).catch(() => []),
        Promise.resolve(fetchDecisions(clientId)).catch(() => []),
      ])
      const review = buildReviewTruthSnapshot({ items: reviewRows, decisions, view: 'waiting', limit: 5000 })
      const filesTruth = buildFilesTruthSnapshot({
        tenantId: clientId,
        mirrorRows: mirrorResult.files,
        uploadRows: uploads,
        reviewItems: review.items,
        reviewTotal: review.total,
      })
      return res.status(200).json({
        files: filesTruth.files,
        uploads: filesTruth.uploads,
        review: { items: filesTruth.reviewItems, total: review.total, counts: review.counts, newest_ts: review.newest_ts },
        files_truth: filesTruth,
        truncated: mirrorResult.truncated,
      })
    }

    if (type === 'uploads') {
      const clientId = client ? client.toString().trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [] })
      let verified
      try { verified = await verifyTenant(clientId, req) }
      catch (e) { return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [] }) }
      const project = req.query.project ? String(req.query.project).trim().toLowerCase() : null
      const mission = req.query.mission ? String(req.query.mission).trim().toLowerCase() : null
      const agent = req.query.agent ? String(req.query.agent).trim().toLowerCase() : null
      const files = await fetchUploadFilesForTenant({ clientId, project, mission, agent, limit: req.query.limit || '500', token: verified.token })
      return res.status(200).json({ files })
    }

    if (type === 'mirror') {
      const clientId = client ? String(client).trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [] })
      let verified
      try { verified = await verifyTenant(clientId, req) }
      catch (e) { return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [] }) }

      const project = req.query.project ? String(req.query.project).trim().toLowerCase() : null
      const result = await fetchMirrorFilesForTenant({ clientId, project, token: verified.token })

      // Single-file fetch (lazy, on open). The Convex files row carries no
      // inline content; the bytes live in storage behind storage_ref.
      if (req.query.id) {
        const file = result.files.find(f => String(f.id) === String(req.query.id)) || null
        return res.status(200).json({ file: file ? { ...file, content: null } : null })
      }
      return res.status(200).json({ files: result.files, truncated: result.truncated })
    }

    if (type === 'text') {
      const clientId = client ? String(client).trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [] })
      let verified
      try { verified = await verifyTenant(clientId, req) }
      catch (e) { return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [] }) }
      // Callers pass either a world or a project slug as `client`. A world
      // yields every project's docs; a project slug yields that project's.
      const asWorld = await fetchScaffoldBriefs(null, clientId, verified.token)
      const scaffolds = asWorld.length ? asWorld : await fetchScaffoldBriefs(clientId, null, verified.token)
      const files = scaffolds.map(s => ({
        id: s.id,
        client_id: s.project,
        filename: s.filename,
        content: s.content,
        type: 'text',
        created_at: s.updated_at,
        updated_at: s.updated_at,
      }))
      return res.status(200).json({ files })
    }

    return res.status(400).json({ error: 'type required (briefs, text, uploads, mirror or organize)' })
  }

  // ---- POST: save a text file as a scaffold doc -------------------------
  if (req.method === 'POST') {
    const body = req.body || {}
    const { action } = body

    if (action === 'sign-upload') {
      // Direct-to-storage uploads were retired with the Storage bucket. File
      // bytes go through POST /api/dashboard/file-upload (the tunnel).
      return res.status(410).json({
        error: 'sign-upload is retired. Route file bytes through POST /api/dashboard/file-upload instead.',
      })
    }

    if (action === 'save-text') {
      const { client_id, filename, content } = body
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content required' })
      }
      const clientId = String(client_id || '').trim().toLowerCase()
      if (!clientId) return res.status(400).json({ error: 'client_id required' })
      if (!/^[A-Za-z0-9._/-]+$/.test(String(filename)) || String(filename).includes('..')) {
        return res.status(400).json({ error: 'invalid filename' })
      }
      let verified
      try { verified = await verifyTenant(clientId, req) }
      catch (e) { return res.status(e.status || 403).json({ error: e.message || 'forbidden' }) }
      const now = new Date().toISOString()
      const payload = { filename: String(filename), content: String(content), updated_at: now, tenant_id: clientId }
      try {
        const r = await convexMutation('tasks:logEvent', {
          key: CONVEX_KEY,
          event: { timestamp: now, agent: clientId, event_type: SCAFFOLD_EVENT_TYPE, payload },
        }, verified.token)
        return res.status(200).json({ ok: true, file: { id: r?.id || null, client_id: clientId, filename: payload.filename, content: payload.content, type: 'text', created_at: now, updated_at: now } })
      } catch (err) {
        return res.status(502).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: 'invalid action' })
  }

  // ---- DELETE: nothing to delete here any more --------------------------
  if (req.method === 'DELETE') {
    return res.status(410).json({
      error: 'delete is retired: the Storage bucket is gone and scaffold docs live in an append-only ledger. Overwrite a doc by saving it again.',
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
