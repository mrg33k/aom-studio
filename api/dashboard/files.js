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
      const fromIndex = Object.entries(index).flatMap(([slug, entries]) =>
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

    // Per-project: INDEX.json entries + this project's scaffold rows.
    // Pass clientId for symmetry; fetchScaffoldBriefs(slug, clientId)
    // currently scopes by slug only (slug→tenant is 1:1 today), but the
    // tenant arg is forwarded for the future audit pass that will assert
    // the requested project belongs to the requesting tenant.
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
      const listPrefix = prefix || ''
      const url = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`
      const sbRes = await fetch(url, {
        method: 'POST',
        headers: { ...storageHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: listPrefix,
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        }),
      })
      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }
      const items = await sbRes.json()
      const mapped = (Array.isArray(items) ? items : [])
        .filter(item => item.name && item.name !== '' && !item.name.endsWith('/'))
        .map(item => ({
          id: item.id || item.name,
          name: item.name,
          date: item.created_at,
          url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${listPrefix}${item.name}`,
        }))
      return res.status(200).json({ files: mapped })
    }

    if (type === 'text') {
      const clientId = client || 'aom'
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

      const scaffolds = await fetchScaffoldBriefs(clientId)
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
      // Returns a signed upload URL for the client to PUT the file directly to Supabase Storage.
      // This keeps the service role key server-side while allowing direct-to-Supabase uploads.
      const { path: filePath, contentType } = body
      if (!filePath || !contentType) {
        return res.status(400).json({ error: 'path and contentType required' })
      }

      const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${filePath}`
      const sbRes = await fetch(url, {
        method: 'POST',
        headers: { ...storageHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsert: false }),
      })
      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }
      const data = await sbRes.json()
      // Supabase returns { url: "/object/upload/sign/..." } (no /storage/v1 prefix)
      const signedPath = data.signedURL || data.url
      if (!signedPath) {
        return res.status(500).json({ error: 'Supabase did not return a signed URL' })
      }
      let fullUploadUrl
      if (signedPath.startsWith('http')) {
        fullUploadUrl = signedPath
      } else if (signedPath.startsWith('/storage/')) {
        fullUploadUrl = `${SUPABASE_URL}${signedPath}`
      } else {
        // Supabase returns /object/... without /storage/v1 prefix
        fullUploadUrl = `${SUPABASE_URL}/storage/v1${signedPath}`
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`
      return res.status(200).json({ uploadUrl: fullUploadUrl, publicUrl })
    }

    if (action === 'save-text') {
      const { client_id, filename, content } = body
      if (!filename || !content) {
        return res.status(400).json({ error: 'filename and content required' })
      }
      const payload = {
        client_id: client_id || 'aom',
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
