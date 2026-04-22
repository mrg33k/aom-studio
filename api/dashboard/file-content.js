// GET /api/dashboard/file-content?slug=<slug>
// GET /api/dashboard/file-content?project=<slug>&filename=<name>   (R37b — scaffold lookup)
//
// Two read paths:
// 1. Legacy: ?slug=<slug> reads a build-time generated brief from
//    src/data/briefs/<slug>.json. Slug validated to prevent path traversal.
// 2. R37b: ?project=<slug>&filename=<filename.md> looks up the scaffold row in
//    Supabase events (event_type='scaffold_file', agent=project,
//    payload->>filename=filename), markdown→HTML via `marked`, returns it in the
//    same shape so the dashboard viewer overlay treats it like any other brief.

import { readFileSync } from 'fs'
import { join } from 'path'
import { marked } from 'marked'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVENTS_TABLE = 'events'
const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false })

function dbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function fetchScaffoldRow(project, filename) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const qs = [
    `event_type=eq.${encodeURIComponent(SCAFFOLD_EVENT_TYPE)}`,
    `agent=eq.${encodeURIComponent(project)}`,
    `payload->>filename=eq.${encodeURIComponent(filename)}`,
    'select=id,agent,payload,timestamp',
    'order=timestamp.desc',
    'limit=1',
  ].join('&')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?${qs}`, { headers: dbHeaders() })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'public, max-age=60')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { slug, project, filename } = req.query

  // R37b: scaffold lookup path
  if (project && filename) {
    if (!/^[a-z][a-z0-9-]*$/.test(String(project)) || String(project).length > 50) {
      return res.status(400).json({ error: 'Invalid project' })
    }
    if (!/^[A-Za-z0-9._/-]+$/.test(String(filename)) || String(filename).length > 80 || String(filename).includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    const row = await fetchScaffoldRow(String(project), String(filename))
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

  // Legacy slug path — build-time briefs
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
