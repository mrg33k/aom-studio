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

// AUTH (r7:open-agent-surface, 2026-07-27). The `?project=&filename=` path
// returns a project's SCAFFOLD CANON — the VISION / BUILD / CONTEXT markdown
// that rule 5 makes every agent read as the bible for that room. It was
// unauthenticated with `Access-Control-Allow-Origin: *`, and its only tenant
// check was `if (client_id)` — i.e. it ran when the CALLER chose to supply the
// world, and was skipped entirely when they did not. Omitting one optional
// query param read any world's canon anonymously. A gate the attacker opts into
// is not a gate.
//
// Replaced with verifyProjectAccess on the ROOT project slug, which is the
// helper written for exactly this question: it admits the holder world, any
// world holding a project_access grant, the holder's admins, and — for the
// unregistered projects that legitimately have no projects row — a world with
// participation evidence. So AOM's grants into the arsenal-held projects keep
// working for ordinary members, and a stranger gets 403 instead of the canon.
//
// The legacy `?slug=` path is untouched: it reads a build-time brief baked into
// the deployed bundle, carries no tenant, and gating it would break the public
// brief viewer for nothing.

import { readFileSync } from 'fs'
import { join } from 'path'
import { marked } from 'marked'
import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js'

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

// (The old `tenantOwnsProject` helper is gone with the optional gate it served.
// It also returned TRUE on every error and on a missing projects row, so the 4
// live unregistered projects — blacknight, bridge-smoke, pala, rex — were
// wide open even when a caller did supply client_id. verifyProjectAccess
// handles that case on participation evidence instead of on a fail-open.)

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
    // r7: the tenant gate is MANDATORY and runs against the caller's verified
    // session, not against a world string they chose to send (or omit).
    // Mission paths are colon-joined under a root project — `corner:one-corner`
    // is canon belonging to `corner` — so access is decided on the root slug.
    const rootProject = String(project).split(':')[0]
    try {
      await verifyProjectAccess(rootProject, req)
    } catch (err) {
      if (err instanceof TenantAuthError) return sendAuthError(res, err)
      return res.status(500).json({ error: err?.message || 'auth check failed' })
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
