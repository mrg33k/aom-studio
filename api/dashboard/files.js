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

  // ---- GET briefs from INDEX.json (no Supabase needed) -----------------
  if (req.method === 'GET' && req.query.type === 'briefs') {
    const project = req.query.project
    if (!project) return res.status(400).json({ error: 'project required' })
    try {
      const indexPath = join(process.cwd(), 'docs', 'briefs', 'INDEX.json')
      const raw = readFileSync(indexPath, 'utf-8')
      const index = JSON.parse(raw)
      const briefs = index[project] || []
      return res.status(200).json({ briefs })
    } catch {
      return res.status(200).json({ briefs: [] })
    }
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
      const url = `${SUPABASE_URL}/rest/v1/${TEXT_TABLE}?client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=100`
      const sbRes = await fetch(url, { headers: dbHeaders() })
      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }
      const rows = await sbRes.json()
      return res.status(200).json({ files: rows })
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
