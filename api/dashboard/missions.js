// GET /api/dashboard/missions?project=<slug>
//   Returns direct-child missions of <slug>, i.e. scaffold_file events whose
//   agent matches exactly '<slug>:<one-segment>'. Deeper missions are reached
//   by passing their parent path (e.g. project='corner:music-pack').
//
// R39-3: Missions render in project drawer as file-like rows.
// corner:retire-supabase (2026-09-03): the events come from the Convex events
// table (events:find with an agent prefix). Was the Supabase events table.
//
// Response shape:
//   { missions: [
//       { slug: 'music-pack', path: 'corner:music-pack', name: 'Music Pack',
//         file_count: 6, updated_at: '2026-04-22T...' },
//       ...
//     ] }

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery } from '../_lib/reportsStore.js'

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const project = String(req.query.project || '').trim()
  if (!project) return res.status(400).json({ error: 'project required' })

  // GET was unauthenticated and honored any ?project=, so any caller could read
  // an arbitrary tenant's mission tree (cross-tenant metadata leak). Require the
  // caller prove access to the project, same gate as missions-created.js.
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

  let rows = []
  try {
    const found = await convexQuery('events:find', {
      event_type: SCAFFOLD_EVENT_TYPE,
      agent_prefix: prefix,
      order: 'desc',
      limit: 500,
    })
    if (Array.isArray(found)) rows = found
  } catch {
    return res.status(500).json({ error: 'events query failed' })
  }

  // Roll rows up by direct child. Only the NEXT segment under <project>
  // counts as a mission we surface at this level. Deeper missions belong
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
    // Count a file once (one scaffold_file row per file).
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
