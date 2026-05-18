// GET /api/dashboard/missions-tree?client=<worldId>
//
// corner:task-rooms R5 — three-tier left-rail tree.
//
// Returns the live Project > Mission > Task tree for a given world. Pulls
// from the in-repo missions registry (src/dashboard/data/missions.json,
// already used by Drawer.jsx) plus an active-tasks query against Supabase
// scoped by client_id + shared-project ids (mirrors the useTasks filter).
//
// Response shape:
//   {
//     projects: [
//       {
//         slug, name,
//         missions: [
//           { slug, name, tasks: [{ id, title, status, agent }] }
//         ],
//         unfiled_tasks: [{ id, title, status, agent }]   // no mission_slug
//       }
//     ]
//   }
//
// A task is filed under a mission when:
//   - metadata.mission_slug matches the mission's <project>:<slug>, OR
//   - text references `--mission <project>:<slug>` (legacy briefs)
// Otherwise it lands in unfiled_tasks under the project.

import { extractJwt } from '../_lib/verifyTenant.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'
const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

// Active task statuses: anything not done|failed|dismissed.
const ACTIVE_STATUSES = ['queued', 'running', 'waiting', 'blocked', 'needs_input']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const jwt = extractJwt(req)
  if (!jwt) return res.status(401).json({ error: 'jwt required' })

  const clientId = String(req.query.client || 'aom').trim().toLowerCase()

  // Load shared project slugs so the tree mirrors the user's task panel.
  let sharedSlugs = []
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?select=projects(slug,is_active)&client_id=eq.${encodeURIComponent(clientId)}`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      sharedSlugs = (rows || [])
        .map(x => x?.projects?.is_active && x?.projects?.slug)
        .filter(Boolean)
    }
  } catch { /* keep sharedSlugs empty on failure */ }

  const clientIds = [clientId, ...sharedSlugs.map(s => `shared:${s}`)]
  // Mirror the Path A widen from useTasks.js so aom viewers see Ben tasks.
  if (clientId === 'aom') clientIds.push('ben')

  // corner:mission-rooms — tasks retired 2026-05-17 (Patrik). The mission
  // registry + per-mission last_message_at is the only signal now. No more
  // task query, no more "1 in flight" labels, no more unfiled_tasks.
  const tasks = []

  // R4 — fetch the newest message per mission_slug so the drawer can light
  // an "active" dot from real activity instead of the flat mission status
  // field. Pulls the last 14 days of mission-tagged messages and reduces
  // to one row per mission (the first hit wins because results come back
  // desc by created_at). Capped at 500 rows to keep the response tight.
  const missionLastSeenAt = new Map()
  try {
    const sinceIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?select=created_at,metadata&metadata->>mission_slug=not.is.null&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=500`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      for (const row of (rows || [])) {
        const rawSlug = row?.metadata?.mission_slug
        const at = row?.created_at
        if (!rawSlug || !at) continue
        const slug = canonicalizeMissionSlug(rawSlug, MISSION_SLUG_LOOKUP)
        if (!missionLastSeenAt.has(slug)) missionLastSeenAt.set(slug, at)
      }
    }
  } catch { /* dot just won't light; missions still render */ }

  // mission-rooms reframe: the mission is the unit of work, not the task.
  // Seed every project + mission from the on-disk registry (built at
  // build time by scripts/build-missions-registry.cjs from corner/missions
  // and corner/users/<u>/projects/<p>/missions). Then enrich each mission
  // with any active tasks queued against it. Missions without active tasks
  // still surface — their status comes from the mission's CONTEXT.md.
  const projectMap = new Map()
  function getProject(slug, name) {
    if (!projectMap.has(slug)) {
      projectMap.set(slug, { slug, name: name || slug, missions: new Map(), unfiled_tasks: [] })
    }
    return projectMap.get(slug)
  }

  for (const m of (missionsRegistry?.missions || [])) {
    const proj = getProject(m.project_slug)
    proj.missions.set(m.slug, {
      slug: m.slug,
      name: m.name || m.raw_slug || m.slug,
      // R-MP-3 — workstream grouping. Null means top-level / Other bucket.
      workstream: m.workstream || null,
      status: m.status || null,
      is_done: !!m.is_done,
      last_updated: m.last_updated || null,
      last_message_at: missionLastSeenAt.get(m.slug) || null,
      path: m.path || null,
      tasks: [],
    })
  }

  for (const t of tasks) {
    const projectSlug = t.project || (t.metadata && t.metadata.project) || 'unsorted'
    const proj = getProject(projectSlug)
    let missionSlug = null
    if (t.metadata && typeof t.metadata === 'object') {
      missionSlug = t.metadata.mission_slug || t.metadata.mission || null
    }
    if (!missionSlug && typeof t.text === 'string') {
      const mm = t.text.match(/--mission\s+([\w:-]+)/)
      if (mm) missionSlug = mm[1]
    }
    const taskEntry = {
      id: t.id,
      title: t.title || '',
      status: t.status,
      agent: t.agent_identity || t.agent || null,
      client_id: t.client_id,
    }
    if (missionSlug) {
      if (!proj.missions.has(missionSlug)) {
        // Mission tagged on a task but not in the registry (legacy slug or
        // freshly-scaffolded since the last build). Surface it anyway so
        // the user can follow up.
        const display = missionSlug.startsWith(projectSlug + ':')
          ? missionSlug.slice(projectSlug.length + 1)
          : missionSlug
        proj.missions.set(missionSlug, {
          slug: missionSlug,
          name: display,
          status: 'in-progress',
          is_done: false,
          last_message_at: missionLastSeenAt.get(missionSlug) || null,
          tasks: [],
        })
      }
      proj.missions.get(missionSlug).tasks.push(taskEntry)
    } else {
      proj.unfiled_tasks.push(taskEntry)
    }
  }

  const projects = []
  for (const proj of projectMap.values()) {
    const missions = []
    for (const m of proj.missions.values()) missions.push(m)
    missions.sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
      return (a.name || '').localeCompare(b.name || '')
    })

    // R-MP-3 — group by workstream. Missions with workstream:null fall
    // into the "Other" bucket. Workstream order: alphabetical by name,
    // with "Other" last so explicit workstreams render at the top.
    const workstreamMap = new Map()
    for (const m of missions) {
      const ws = m.workstream || '_other'
      if (!workstreamMap.has(ws)) workstreamMap.set(ws, [])
      workstreamMap.get(ws).push(m)
    }
    const workstreams = []
    for (const [slug, list] of workstreamMap.entries()) {
      workstreams.push({
        slug,
        name: slug === '_other' ? 'Other' : deriveDisplayName(slug),
        missions: list,
      })
    }
    workstreams.sort((a, b) => {
      if (a.slug === '_other') return 1
      if (b.slug === '_other') return -1
      return (a.name || '').localeCompare(b.name || '')
    })

    projects.push({
      slug: proj.slug,
      name: proj.name,
      // Flat list kept for backwards-compat with existing consumers
      // (Drawer.jsx + the cv4 mission-tree mockup before R-MP-4 wires
      // the nested shape). Nested workstreams added in parallel.
      missions,
      workstreams,
      unfiled_tasks: proj.unfiled_tasks,
    })
  }
  projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return res.status(200).json({
    projects,
    registry_generated_at: missionsRegistry?.generated_at || null,
  })
}

function deriveDisplayName(slug) {
  return String(slug || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
