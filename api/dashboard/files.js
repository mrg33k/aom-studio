// GET  /api/dashboard/files?type=images&prefix={prefix}
// GET  /api/dashboard/files?type=text&client={clientId}
// GET  /api/dashboard/files?type=briefs&project={slug}  -- reads docs/briefs/INDEX.json
// POST /api/dashboard/files  { action: 'sign-upload', path, contentType }  -- returns signed upload URL
// POST /api/dashboard/files  { action: 'save-text', client_id, filename, content }
// DELETE /api/dashboard/files?type=image&path={path}
// DELETE /api/dashboard/files?type=text&id={id}
//
// Server-side Supabase proxy for file storage + text_files table.
// Uses service role key -- never exposes it to the browser.
// Upload flow: client gets signed URL from here, then PUTs file directly to Supabase Storage (no body size limit).

import { readFileSync } from 'fs'
import { join } from 'path'
import { verifyTenant } from '../_lib/verifyTenant.js'
import { UPLOADS_ROLE_FILTER, UPLOADS_PRESENCE_FILTERS, attachmentsOfMessage } from '../_lib/uploadsIdentity.js'
import { fileRefFromChatAttachment } from '../_lib/fileRef.js'
import { buildFilesTruthSnapshot } from '../_lib/filesTruth.js'
import { buildReviewTruthSnapshot } from '../_lib/reviewTruth.js'
import { collectFromMessages, fetchDecisions } from './review-queue.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const BUCKET = 'corner-files'
const TEXT_TABLE = 'text_files'
const EVENTS_TABLE = 'events'
const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

// R30: pull scaffold .md rows from the `events` table (schema-free, no-DDL
// storage per the AOM Supabase rule). Returns brief-shaped objects so the
// dashboard Files/AllFiles readers can consume them alongside INDEX.json +
// text_files rows.
//
// R77-files-isolation (2026-04-25): the `slug` parameter scopes to a single
// project (`events.agent` = project slug). For cross-project (project=all)
// the caller MUST pass `clientId` so we can scope to that tenant's projects
// only — the events table has no client_id column, so we resolve tenant →
// project slugs via the projects table first, then filter events by
// `agent IN (slug list)`. Calling fetchScaffoldBriefs(null, null) without a
// tenant returns []  to prevent global cross-tenant leak.
async function fetchScaffoldBriefs(slug, clientId = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return []

  // Resolve which agent slugs we'll filter by:
  //   slug present       → just that one (caller already named it)
  //   no slug + clientId → fetch the tenant's project slugs from `projects`
  //   neither            → leak guard: return []
  let slugFilter = null
  if (slug) {
    slugFilter = [slug]
  } else if (clientId) {
    try {
      const projUrl = `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&select=slug`
      const projR = await fetch(projUrl, { headers: dbHeaders() })
      if (projR.ok) {
        const projRows = await projR.json()
        slugFilter = (Array.isArray(projRows) ? projRows : []).map(p => p.slug).filter(Boolean)
      }
    } catch {
      slugFilter = []
    }
    // No projects under this tenant → no scaffolds to surface.
    if (!slugFilter || slugFilter.length === 0) return []
  } else {
    // Neither a slug nor a tenant. Refuse to scan the entire events table —
    // that's the leak path. (Pre-R77 this returned every tenant's scaffolds.)
    return []
  }

  const parts = [
    `event_type=eq.${encodeURIComponent(SCAFFOLD_EVENT_TYPE)}`,
    'select=id,agent,payload,timestamp',
    'order=timestamp.desc',
    'limit=500',
  ]
  if (slugFilter.length === 1) {
    parts.unshift(`agent=eq.${encodeURIComponent(slugFilter[0])}`)
  } else {
    // PostgREST `in.()` syntax — join with commas, parens around the list.
    const inList = slugFilter.map(s => encodeURIComponent(s)).join(',')
    parts.unshift(`agent=in.(${inList})`)
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?${parts.join('&')}`, {
      headers: dbHeaders(),
    })
    if (!r.ok) return []
    const rows = await r.json()
    return (Array.isArray(rows) ? rows : [])
      .map(row => {
        const payload = row.payload || {}
        const filename = String(payload.filename || '')
        if (!filename.endsWith('.md')) return null
        const title = filename
        const derivedSlug = filename.replace(/^.*\//, '').replace(/\.md$/, '')
        const ts = payload.updated_at || row.timestamp || null
        const dateFormatted = ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        return {
          id: row.id,
          title,
          filename,
          slug: derivedSlug,
          project: row.agent || null,
          source: 'scaffold',
          content: payload.content || '',
          updated_at: ts,
          dateFormatted,
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function storageHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  }
}

function dbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

async function fetchUploadFilesForTenant({ clientId, project = null, mission = null, agent = null, limit = 1000 }) {
  const sel = 'id,client_id,project,metadata,user_name,timestamp,text'
  const baseFilters = [
    `client_id=eq.${encodeURIComponent(clientId)}`,
    UPLOADS_ROLE_FILTER,
    `select=${sel}`,
    'order=timestamp.desc',
    `limit=${Math.min(parseInt(limit || '500', 10) || 500, 1000)}`,
  ]
  if (project) baseFilters.push(`or=(project.eq.${encodeURIComponent(project)},and(project.is.null,metadata->>project_slug.eq.${encodeURIComponent(project)}))`)
  if (mission) baseFilters.push(`metadata->>mission_slug=eq.${encodeURIComponent(mission)}`)
  if (agent) baseFilters.push(`metadata->>agent_slug=eq.${encodeURIComponent(agent)}`)

  const [singleF, multiF] = UPLOADS_PRESENCE_FILTERS
  const urlSingle = `${SUPABASE_URL}/rest/v1/messages?${baseFilters.join('&')}&${singleF}`
  const urlMulti = `${SUPABASE_URL}/rest/v1/messages?${baseFilters.join('&')}&${multiF}`

  let rowsSingle = [], rowsMulti = []
  try {
    const [rS, rM] = await Promise.all([
      fetch(urlSingle, { headers: dbHeaders() }),
      fetch(urlMulti, { headers: dbHeaders() }),
    ])
    if (rS.ok) rowsSingle = await rS.json()
    if (rM.ok) rowsMulti = await rM.json()
  } catch { /* best-effort */ }

  const byId = new Map()
  for (const row of [...rowsSingle, ...rowsMulti]) {
    if (row && row.id) byId.set(row.id, row)
  }

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
    const fileRef = fileRefFromChatAttachment({
      attachment: {
        ...(attachment || {}),
        url: attUrl,
        mime,
        size,
        name: displayName,
      },
      message: {
        ...(row || {}),
        project: proj || row?.project || null,
        metadata: {
          ...((row && row.metadata && typeof row.metadata === 'object') ? row.metadata : {}),
          project_slug: proj || null,
          mission_slug: missionSlug || null,
          agent_slug: agentSlug || null,
        },
      },
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

  for (const row of [...byId.values()]) {
    const md = row?.metadata
    if (!md || typeof md !== 'object') continue
    const scope = {
      proj: row.project || md.project_slug || null,
      missionSlug: md.mission_slug || null,
      agentSlug: md.agent_slug || null,
    }
    for (const a of attachmentsOfMessage(md)) {
      pushAtt({
        row,
        attachment: a,
        url: a.url,
        mime: a.mime,
        size: a.size,
        name: a.name,
        ts: row.timestamp,
        who: row.user_name || null,
        ...scope,
      })
    }
  }

  return out
}

async function fetchMirrorFilesForTenant({ clientId, project = null }) {
  const cols = 'id,project,rel_path,name,ext,kind,size,updated_at,last_editor,storage_ref'
  const PAGE = 1000
  const HARD_CAP = 20000
  const files = []
  let offset = 0
  let truncated = false
  try {
    while (offset < HARD_CAP) {
      let url = `${SUPABASE_URL}/rest/v1/project_files`
        + `?client_id=eq.${encodeURIComponent(clientId)}`
        + `&is_deleted=eq.false&select=${cols}`
        + `&order=updated_at.desc&limit=${PAGE}&offset=${offset}`
      if (project) url += `&project=eq.${encodeURIComponent(project)}`
      const r = await fetch(url, { headers: dbHeaders() })
      if (!r.ok) break
      const rows = await r.json()
      if (!Array.isArray(rows) || rows.length === 0) break
      files.push(...rows)
      if (rows.length < PAGE) break
      offset += PAGE
      if (offset >= HARD_CAP) truncated = true
    }
  } catch { /* return whatever we have */ }

  try {
    const ar = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.false&select=slug`,
      { headers: dbHeaders() },
    )
    if (ar.ok) {
      const rows = await ar.json()
      const archived = new Set((rows || []).map(p => p?.slug).filter(Boolean))
      if (archived.size) {
        for (let i = files.length - 1; i >= 0; i--) {
          if (archived.has(files[i].project)) files.splice(i, 1)
        }
      }
    }
  } catch { /* over-show on failure; never hide live files by accident */ }

  return { files, truncated }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // ---- GET briefs from INDEX.json (+ scaffold merge) -------------------
  if (req.method === 'GET' && req.query.type === 'briefs') {
    const project = req.query.project
    // R77-files-isolation: every briefs request must name the calling
    // tenant (`client`). project=all WITHOUT a client used to fall through
    // to fetchScaffoldBriefs(null), which scanned the entire events table
    // and returned every tenant's scaffolds. Now: no client → 400.
    // The dashboard caller sources `client` from worldId
    // (useTasksPanel.js, briefs fetch).
    const clientId = req.query.client
    if (!project) return res.status(400).json({ error: 'project required' })
    if (!clientId) return res.status(400).json({ error: 'client (tenant) required for tenant scoping' })

    // INDEX.json (human-authored briefs) — same read as before
    let index = {}
    try {
      const indexPath = join(process.cwd(), 'docs', 'briefs', 'INDEX.json')
      index = JSON.parse(readFileSync(indexPath, 'utf-8'))
    } catch { index = {} }

    if (project === 'all') {
      // R77-files-isolation: scope INDEX.json + scaffold rows to the
      // tenant's project slugs only. INDEX.json is a global file (every
      // tenant ships with the same one) — without filtering, an arsenal
      // caller would see corner / aom-website / ambition-mechanical
      // briefs that belong to AOM.
      let tenantSlugs = new Set()
      try {
        const projUrl = `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&select=slug`
        const projR = await fetch(projUrl, { headers: dbHeaders() })
        if (projR.ok) {
          const projRows = await projR.json()
          tenantSlugs = new Set((Array.isArray(projRows) ? projRows : []).map(p => p.slug).filter(Boolean))
        }
      } catch { /* leave set empty → no fromIndex briefs returned */ }

      const fromIndex = Object.entries(index)
        .filter(([slug]) => tenantSlugs.has(slug))
        .flatMap(([slug, entries]) =>
          (Array.isArray(entries) ? entries : []).map(b => ({ ...b, project: slug }))
        )

      // R30 — scaffold output (VISION / BUILD / RESEARCH / CONTEXT / last-
      // conversation + research/*) is stored as `events` rows with
      // event_type='scaffold_file'.
      // R77-files-isolation: scope to clientId's project slugs only.
      const fromScaffold = await fetchScaffoldBriefs(null, clientId)

      // Dedupe: prefer INDEX entries; skip scaffold rows that duplicate slug/filename within the same project
      const seen = new Set(fromIndex.map(b => `${b.project || ''}::${b.slug || b.filename || b.title || ''}`))
      const merged = [
        ...fromIndex,
        ...fromScaffold.filter(s => !seen.has(`${s.project || ''}::${s.slug || s.filename || ''}`)),
      ]
      merged.sort((a, b) => {
        const da = a.updated_at || a.created_at || ''
        const db = b.updated_at || b.created_at || ''
        return String(db).localeCompare(String(da))
      })
      return res.status(200).json({ briefs: merged })
    }

    // Per-project: assert the project belongs to the requesting tenant.
    // Slug→tenant is 1:1 today (per R77-t10 cleanup) but enforce explicitly
    // so a `?project=corner&client=arsenal` URL doesn't leak AOM's corner
    // briefs into an arsenal session.
    let tenantOwnsProject = false
    try {
      const ownUrl = `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&slug=eq.${encodeURIComponent(project)}&select=slug&limit=1`
      const ownR = await fetch(ownUrl, { headers: dbHeaders() })
      if (ownR.ok) {
        const ownRows = await ownR.json()
        tenantOwnsProject = Array.isArray(ownRows) && ownRows.length > 0
      }
    } catch { /* leave false */ }
    if (!tenantOwnsProject) {
      return res.status(200).json({ briefs: [] })
    }
    const fromIndex = index[project] || []
    const fromScaffold = await fetchScaffoldBriefs(project, clientId)
    const seen = new Set(fromIndex.map(b => b.slug || b.filename || b.title || ''))
    const merged = [
      ...fromIndex,
      ...fromScaffold.filter(s => !seen.has(s.slug || s.filename || '')),
    ]
    merged.sort((a, b) => {
      const da = a.updated_at || a.created_at || ''
      const db = b.updated_at || b.created_at || ''
      return String(db).localeCompare(String(da))
    })
    return res.status(200).json({ briefs: merged })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // ---- GET: list files -------------------------------------------------
  if (req.method === 'GET') {
    const { type, prefix, client } = req.query

    if (type === 'images') {
      // HARD-GATE (corner:audit R4b, 2026-07-21). This reader lists the corner-files
      // Storage bucket and returns public byte URLs. It used to take req.query.prefix
      // verbatim with NO tenant check + permissive CORS -- any unauthenticated caller
      // could enumerate EVERY tenant's objects (cross-tenant leak). The bucket is a
      // retired byte store (CV6 Files no longer reads it; only the legacy CV3 tasks
      // drawer does, and it degrades gracefully to an empty list). We keep the endpoint
      // for that one caller but now REQUIRE a verified tenant and FORCE the listing
      // under the tenant's own world segment, so cross-prefix enumeration is impossible.
      const clientId = client ? String(client).trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client (tenant) required', files: [] })
      try {
        await verifyTenant(clientId, req)
      } catch (e) {
        return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [] })
      }
      // Mirror layout is <world>/<project>/... -- force the world segment, stripping any
      // leading slash and '..' so a caller can never reach outside their own namespace.
      const worldSeg = `${clientId}/`
      let listPrefix = String(prefix || '').replace(/^\/+/, '').replace(/\.\.(\/|$)/g, '')
      if (!listPrefix.startsWith(worldSeg)) listPrefix = `${worldSeg}${listPrefix}`
      const recursive = req.query.recursive === '1' || req.query.recursive === 'true'

      // ── Supabase Storage list ──
      // Default: single-level listing (folders + immediate files).
      // recursive=1: depth-first walk so we return every file under the prefix
      // with full path. Folders surface as items with id=null + no metadata.
      async function listOne(p) {
        const url = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`
        const r = await fetch(url, {
          method: 'POST',
          headers: { ...storageHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prefix: p,
            limit: 500,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
          }),
        })
        if (!r.ok) return []
        const items = await r.json()
        return Array.isArray(items) ? items : []
      }

      function isFolderItem(item) {
        // Supabase returns folders as { id: null, name: 'foo', metadata: null }
        return item && (item.id === null || item.id === undefined) && !item.metadata
      }

      const allFiles = []
      async function walk(prefixPath, depth) {
        const items = await listOne(prefixPath)
        const folderPromises = []
        for (const item of items) {
          if (!item.name || item.name === '') continue
          if (isFolderItem(item)) {
            if (recursive && depth > 0) {
              folderPromises.push(walk(`${prefixPath}${item.name}/`, depth - 1))
            }
            continue
          }
          // Leaf file. Capture full path so the client can build a tree.
          const fullPath = `${prefixPath}${item.name}`
          allFiles.push({
            id: item.id || fullPath,
            name: item.name,
            path: fullPath,
            relativePath: fullPath.startsWith(listPrefix) ? fullPath.slice(listPrefix.length) : fullPath,
            date: item.created_at,
            size: item?.metadata?.size || null,
            url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fullPath}`,
          })
        }
        if (folderPromises.length) await Promise.all(folderPromises)
      }

      // depth=4 is plenty for project/mission/round trees and bounds the
      // worst-case fan-out (15 dirs × 15 × 15 × 15 = 50k calls is impossible
      // because we stop walking once a leaf has no further folders).
      await walk(listPrefix, recursive ? 4 : 0)

      return res.status(200).json({ files: allFiles })
    }

    if (type === 'organize') {
      const clientId = client ? String(client).trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [], uploads: [] })
      try {
        await verifyTenant(clientId, req)
      } catch (e) {
        return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [], uploads: [] })
      }

      const project = req.query.project ? String(req.query.project).trim().toLowerCase() : null
      const [mirrorResult, uploads, reviewRows, decisions] = await Promise.all([
        fetchMirrorFilesForTenant({ clientId, project }),
        fetchUploadFilesForTenant({ clientId, project, limit: req.query.uploadLimit || '1000' }),
        collectFromMessages(clientId),
        fetchDecisions(clientId),
      ])
      const review = buildReviewTruthSnapshot({
        items: reviewRows,
        decisions,
        view: 'waiting',
        limit: 5000,
      })
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
        review: {
          items: filesTruth.reviewItems,
          total: review.total,
          counts: review.counts,
          newest_ts: review.newest_ts,
        },
        files_truth: filesTruth,
        truncated: mirrorResult.truncated,
      })
    }

    // type=uploads (R79-f14, 2026-05-25): pull every chat-uploaded file for
    // the world (+ optional project) by scanning the `messages` table. Chat
    // uploads land on the RAG server tunnel and never enter Supabase Storage,
    // so this is the only way the FilesPanel sees them. Returns rows shaped
    // like the type=images response so the panel merges them uniformly.
    if (type === 'uploads') {
      const clientId = client ? client.toString().trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [] })
      const project = req.query.project ? String(req.query.project).trim().toLowerCase() : null
      const mission = req.query.mission ? String(req.query.mission).trim().toLowerCase() : null
      const agent = req.query.agent ? String(req.query.agent).trim().toLowerCase() : null
      const limit = Math.min(parseInt(req.query.limit || '500', 10) || 500, 1000)

      // TENANT ISOLATION (2026-07-12, corner:one-corner M4): same guard as
      // type=mirror — the messages table holds every world's uploads, so the
      // JWT must prove access to the requested client before we read it.
      try {
        await verifyTenant(clientId, req)
      } catch (e) {
        return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [] })
      }

      // R79-f19 (2026-05-29): uploads now carry chat scope on metadata so the
      // right-rail file browser can filter to "files uploaded in THIS chat":
      //   - metadata.project_slug = '<slug>'    (project + mission rooms)
      //   - metadata.mission_slug = '<slug>'    (mission room only)
      //   - metadata.agent_slug   = '<slug>'    (1:1 agent room only)
      // Pre-R79-f19 rows won't have these; project= filter alone surfaces
      // every project upload (mission rooms inclusive) so historical files
      // stay visible at the project level.
      //
      // Schema reality (verified 2026-05-25): the messages table does NOT
      // have top-level attachment_url / file_mime_type / file_size columns.
      // The supabase-messages.js POST conditionally spreads those fields, but
      // they are silently dropped at insert because the columns don't exist.
      // Every upload's metadata lives in:
      //   - metadata.attachment   = { url, mime, size, name }      (single)
      //   - metadata.attachments  = [ { url, mime, size, name } ]  (multi)
      // Timestamp column is `timestamp` (not created_at).
      //
      // Strategy: two scoped PostgREST queries using jsonb path filters
      // (metadata->attachment=not.is.null + metadata->attachments=not.is.null),
      // merge by message id, then extract every attachment from the metadata.
      // 2026-07-13 (corner:review-loop R16): the uploads identity (role filter,
      // the two metadata shapes, attachment extraction) is now the SHARED
      // definition in api/_lib/uploadsIdentity.js — the same one review-queue.js
      // uses, so a file can never show in Organize but vanish from Review (or
      // vice versa), and agent messages that happen to carry attachment metadata
      // never count as "my uploads".
      const sel = 'id,client_id,project,metadata,user_name,timestamp,text'
      const baseFilters = [
        `client_id=eq.${encodeURIComponent(clientId)}`,
        UPLOADS_ROLE_FILTER,
        `select=${sel}`,
        'order=timestamp.desc',
        `limit=${limit}`,
      ]
      // 2026-05-29 R79-f22: project filter is permissive in the same way as
      // mission. Match rows where the project column equals the slug OR rows
      // where the column is null but metadata.project_slug equals the slug.
      // Without this, uploads from clients that didn't pass `project` in the
      // POST body (or fell through detectProjectFromText) get dropped from
      // every project view despite carrying the right metadata.
      if (project) baseFilters.push(`or=(project.eq.${encodeURIComponent(project)},and(project.is.null,metadata->>project_slug.eq.${encodeURIComponent(project)}))`)
      // 2026-05-30 R79-f23 Leg 2 R2: drop the permissive OR-NULL bandaid —
      // it was the workaround for chat uploads that didn't carry mission
      // scope. chatUploadsP was retired in the same round (FilesPanel.jsx
      // now reads /list-chat-files), so this endpoint's only remaining
      // consumers (if any) get the strict mission filter they need.
      if (mission) baseFilters.push(`metadata->>mission_slug=eq.${encodeURIComponent(mission)}`)
      if (agent) baseFilters.push(`metadata->>agent_slug=eq.${encodeURIComponent(agent)}`)

      const [singleF, multiF] = UPLOADS_PRESENCE_FILTERS
      const urlSingle = `${SUPABASE_URL}/rest/v1/messages?${baseFilters.join('&')}&${singleF}`
      const urlMulti = `${SUPABASE_URL}/rest/v1/messages?${baseFilters.join('&')}&${multiF}`

      let rowsSingle = [], rowsMulti = []
      try {
        const [rS, rM] = await Promise.all([
          fetch(urlSingle, { headers: dbHeaders() }),
          fetch(urlMulti, { headers: dbHeaders() }),
        ])
        if (rS.ok) rowsSingle = await rS.json()
        if (rM.ok) rowsMulti = await rM.json()
      } catch { /* best-effort */ }

      // Merge + dedupe by message id so a row that somehow carries both
      // single and multi shapes doesn't double-process.
      const byId = new Map()
      for (const row of [...rowsSingle, ...rowsMulti]) {
        if (row && row.id) byId.set(row.id, row)
      }
      const rows = [...byId.values()]

      const out = []
      const seenUrls = new Set()
      function pushAtt({ row, attachment, url: attUrl, mime, size, name, ts, who, proj, missionSlug, agentSlug }) {
        if (!attUrl || seenUrls.has(attUrl)) return
        seenUrls.add(attUrl)
        // The RAG tunnel URL ends with the uuid-prefixed filename; strip
        // the prefix to a stable display name when the metadata didn't
        // carry one.
        let displayName = name
        if (!displayName) {
          try { displayName = decodeURIComponent(attUrl.split('/').pop().split('?')[0]) }
          catch { displayName = attUrl.split('/').pop() }
        }
        const fileRef = fileRefFromChatAttachment({
          attachment: {
            ...(attachment || {}),
            url: attUrl,
            mime,
            size,
            name: displayName,
          },
          message: {
            ...(row || {}),
            project: proj || row?.project || null,
            metadata: {
              ...((row && row.metadata && typeof row.metadata === 'object') ? row.metadata : {}),
              project_slug: proj || null,
              mission_slug: missionSlug || null,
              agent_slug: agentSlug || null,
            },
          },
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
          // 2026-07-12 (corner:one-corner M4): chat scope rides along so Organize
          // can slot each upload under its project + mission in the tree.
          project: proj || null,
          mission: missionSlug || null,
          agent: agentSlug || null,
          health_status: fileRef.health.status,
          file_ref: fileRef,
        })
      }

      for (const row of (Array.isArray(rows) ? rows : [])) {
        const ts = row.timestamp
        const who = row.user_name || null
        const md = row.metadata
        if (!md || typeof md !== 'object') continue
        // Scope: the project column is authoritative; metadata.project_slug covers
        // rows that landed without it (R79-f22). mission/agent come from metadata.
        const scope = {
          proj: row.project || md.project_slug || null,
          missionSlug: md.mission_slug || null,
          agentSlug: md.agent_slug || null,
        }
        // Both attachment shapes, via the shared uploads identity (one extraction
        // path with review-queue.js — see api/_lib/uploadsIdentity.js).
        for (const a of attachmentsOfMessage(md)) {
          pushAtt({ row, attachment: a, url: a.url, mime: a.mime, size: a.size, name: a.name, ts, who, ...scope })
        }
      }

      return res.status(200).json({ files: out })
    }

    // ---- type=mirror: the project_files disk mirror (Organize, Phase 1) ----
    // Source of truth for "every file in a project", written by
    // scripts/file-mirror-watcher.py. List returns METADATA ONLY (no content)
    // so a 7k-file world doesn't ship megabytes each poll; content is fetched
    // per file on open via ?type=mirror&id=<uuid>&content=1.
    if (type === 'mirror') {
      const clientId = client ? String(client).trim().toLowerCase() : ''
      if (!clientId) return res.status(400).json({ error: 'client required', files: [] })

      // TENANT ISOLATION (hard requirement): the project_files table holds EVERY
      // world's files, so a caller must NOT read a world that isn't theirs. Verify
      // the JWT proves access to `clientId` (own world, world-admin, or super-admin
      // = Patrik via the world override). A forged ?client= param is rejected here.
      try {
        await verifyTenant(clientId, req)
      } catch (e) {
        return res.status(e.status || 403).json({ error: e.message || 'forbidden', files: [] })
      }

      // Single-file content fetch (lazy, on open).
      if (req.query.id) {
        const cols = 'id,project,rel_path,name,ext,kind,size,content,storage_ref,updated_at,last_editor'
        const url = `${SUPABASE_URL}/rest/v1/project_files`
          + `?id=eq.${encodeURIComponent(req.query.id)}`
          + `&client_id=eq.${encodeURIComponent(clientId)}`
          + `&is_deleted=eq.false&select=${cols}&limit=1`
        try {
          const r = await fetch(url, { headers: dbHeaders() })
          if (!r.ok) return res.status(200).json({ file: null })
          const rows = await r.json()
          return res.status(200).json({ file: Array.isArray(rows) && rows[0] ? rows[0] : null })
        } catch {
          return res.status(200).json({ file: null })
        }
      }

      // Metadata list. Paginate internally so PostgREST's default 1000-row cap
      // never silently truncates a large world (no silent truncation rule).
      // storage_ref rides along (null for most rows): rows mirrored from OUTSIDE
      // the users tree (Corner platform missions, corner:one-corner M7) carry
      // 'ea://<true-repo-path>' so the client can build the real tunnel path —
      // deriving it from project+rel_path would point at a dir that doesn't exist.
      const project = req.query.project
      const cols = 'id,project,rel_path,name,ext,kind,size,updated_at,last_editor,storage_ref'
      const PAGE = 1000
      const HARD_CAP = 20000
      const files = []
      let offset = 0
      let truncated = false
      try {
        while (offset < HARD_CAP) {
          let url = `${SUPABASE_URL}/rest/v1/project_files`
            + `?client_id=eq.${encodeURIComponent(clientId)}`
            + `&is_deleted=eq.false&select=${cols}`
            + `&order=updated_at.desc&limit=${PAGE}&offset=${offset}`
          if (project) url += `&project=eq.${encodeURIComponent(project)}`
          const r = await fetch(url, { headers: dbHeaders() })
          if (!r.ok) break
          const rows = await r.json()
          if (!Array.isArray(rows) || rows.length === 0) break
          files.push(...rows)
          if (rows.length < PAGE) break
          offset += PAGE
          if (offset >= HARD_CAP) truncated = true
        }
      } catch { /* return whatever we have */ }

      // corner:corner-ui-cv6 wd40 DEF-4: hide mirror rows from ARCHIVED
      // projects. Organize rebuilds its tree from these rows (orphan groups
      // resurrect any slug with files, prettified from the slug), so an
      // archived project ghosted back in an hour after archiving. Rows are
      // not deleted — unarchive brings the files straight back.
      try {
        const ar = await fetch(
          `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.false&select=slug`,
          { headers: dbHeaders() },
        )
        if (ar.ok) {
          const rows = await ar.json()
          const archived = new Set((rows || []).map(p => p?.slug).filter(Boolean))
          if (archived.size) {
            for (let i = files.length - 1; i >= 0; i--) {
              if (archived.has(files[i].project)) files.splice(i, 1)
            }
          }
        }
      } catch { /* over-show on failure; never hide live files by accident */ }

      return res.status(200).json({ files, truncated })
    }

    if (type === 'text') {
      const clientId = client || ''
      // Legacy text_files read (best-effort; the table was never migrated in
      // the current Supabase project so this is usually empty). Primary
      // source of truth for scaffold MDs is the `events` table via
      // fetchScaffoldBriefs — see R30.
      let rows = []
      try {
        const url = `${SUPABASE_URL}/rest/v1/${TEXT_TABLE}?client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=100`
        const sbRes = await fetch(url, { headers: dbHeaders() })
        if (sbRes.ok) {
          const parsed = await sbRes.json()
          if (Array.isArray(parsed)) rows = parsed
        }
      } catch { /* best-effort */ }

      // R10-9 fix: pass null+clientId so we get every project's scaffolds in
      // this world (was clientId alone → treated as project slug → zero hits).
      const scaffolds = await fetchScaffoldBriefs(null, clientId)
      const seen = new Set(rows.map(r => r.filename || r.name || ''))
      const merged = [
        ...rows,
        ...scaffolds.filter(s => !seen.has(s.filename)).map(s => ({
          id: s.id,
          client_id: s.project,
          filename: s.filename,
          content: s.content,
          type: 'text',
          created_at: s.updated_at,
          updated_at: s.updated_at,
        })),
      ]
      return res.status(200).json({ files: merged })
    }

    return res.status(400).json({ error: 'type required (images or text)' })
  }

  // ---- POST: sign upload URL or save text file -------------------------
  if (req.method === 'POST') {
    const body = req.body || {}
    const { action } = body

    if (action === 'sign-upload') {
      // RETIRED (corner:audit R4a, 2026-07-21). This action signed a direct-to-
      // Supabase-Storage upload URL for the corner-files bucket -- a bytes-into-Storage
      // violation of the hard platform invariant: file BYTES never touch Supabase
      // Storage (Supabase holds only rows; bytes live on disk, served via the
      // rag.aheadofmarket.com tunnel). No caller remains in the app. Uploads route
      // through the tunnel binary endpoint instead (POST /api/dashboard/file-upload
      // -> rag-server /upload-file). Return 410 Gone so any straggler fails loud.
      return res.status(410).json({
        error: 'sign-upload is retired: direct-to-Supabase-Storage uploads are not allowed. Route file bytes through POST /api/dashboard/file-upload (rag.aheadofmarket.com tunnel) instead.',
      })
    }

    if (action === 'save-text') {
      const { client_id, filename, content } = body
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content required' })
      }
      const payload = {
        client_id: client_id || '',
        filename,
        content,
        type: 'text',
      }
      const url = `${SUPABASE_URL}/rest/v1/${TEXT_TABLE}`
      const sbRes = await fetch(url, {
        method: 'POST',
        headers: dbHeaders(),
        body: JSON.stringify(payload),
      })
      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }
      const inserted = await sbRes.json()
      return res.status(200).json({ ok: true, file: (Array.isArray(inserted) ? inserted[0] : inserted) || payload })
    }

    return res.status(400).json({ error: 'invalid action' })
  }

  // ---- DELETE: remove image or text file --------------------------------
  if (req.method === 'DELETE') {
    const { type, path: filePath, id } = req.query

    if (type === 'image' && filePath) {
      const decodedPath = decodeURIComponent(filePath)
      const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}`
      const sbRes = await fetch(url, {
        method: 'DELETE',
        headers: { ...storageHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [decodedPath] }),
      })
      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }
      return res.status(200).json({ ok: true })
    }

    if (type === 'text' && id) {
      const url = `${SUPABASE_URL}/rest/v1/${TEXT_TABLE}?id=eq.${encodeURIComponent(id)}`
      const sbRes = await fetch(url, {
        method: 'DELETE',
        headers: dbHeaders(),
      })
      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'type + path (for image) or id (for text) required' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
