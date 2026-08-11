// GET /api/dashboard/missions?project=<slug>
//   Returns direct-child missions of <slug> — i.e. scaffold_file events whose
//   agent matches exactly '<slug>:<one-segment>'. Deeper missions are reached
//   by passing their parent path (e.g. project='corner:music-pack').
//
// R39-3 — Missions render in project drawer as file-like rows.
//
// Response shape:
//   { missions: [
//       { slug: 'music-pack', path: 'corner:music-pack', name: 'Music Pack',
//         file_count: 6, updated_at: '2026-04-22T...' },
//       ...
//     ] }

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVENTS_TABLE = 'events'
const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function dbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const project = String(req.query.project || '').trim()
  if (!project) return res.status(400).json({ error: 'project required' })

  // GET was unauthenticated and honored any ?project=, so any caller could read
  // an arbitrary tenant's mission tree (cross-tenant metadata leak). Require the
  // caller prove access to the project — same gate as missions-created.js.
  try {
    await verifyProjectAccess(project, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }

  // Anchor the match so 'corner' doesn't bleed into 'corner-adjacent'. The
  // colon separator is the key: agents starting with `<project>:` are
  // descendants; anything else isn't.
  const prefix = `${project}:`
  const encodedPrefix = encodeURIComponent(`${prefix}*`)
  const qs = [
    `event_type=eq.${encodeURIComponent(SCAFFOLD_EVENT_TYPE)}`,
    `agent=like.${encodedPrefix}`,
    'select=agent,payload,timestamp',
    'order=timestamp.desc',
    'limit=500',
  ].join('&')

  let rows = []
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?${qs}`, { headers: dbHeaders() })
    if (r.ok) {
      const parsed = await r.json()
      if (Array.isArray(parsed)) rows = parsed
    }
  } catch {
    return res.status(500).json({ error: 'events query failed' })
  }

  // Roll rows up by direct child. Only the NEXT segment under <project>
  // counts as a mission we surface at this level — deeper missions belong
  // to the parent mission's own drawer (R39-4).
  const byDirectChild = new Map()
  for (const row of rows) {
    const agent = String(row.agent || '')
    if (!agent.startsWith(prefix)) continue
    const rest = agent.slice(prefix.length)
    const childSlug = rest.split(':')[0]
    if (!childSlug) continue
    const childPath = `${project}:${childSlug}`
    const filename = row?.payload?.filename || ''
    const ts = row?.payload?.updated_at || row.timestamp || null
    const entry = byDirectChild.get(childSlug) || {
      slug: childSlug,
      path: childPath,
      name: titleFromSlug(childSlug),
      file_count: 0,
      updated_at: null,
      filenames: new Set(),
    }
    // Count a file once (the scaffold_file table lives as one row per file).
    if (agent === childPath && filename) {
      entry.filenames.add(filename)
    }
    if (ts && (!entry.updated_at || ts > entry.updated_at)) {
      entry.updated_at = ts
    }
    byDirectChild.set(childSlug, entry)
  }

  const missions = Array.from(byDirectChild.values())
    .map(({ filenames, ...rest }) => ({ ...rest, file_count: filenames.size }))
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))

  return res.status(200).json({ missions })
}
