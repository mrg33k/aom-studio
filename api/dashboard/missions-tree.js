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

  // Load all active tasks for those client_ids.
  const inClause = encodeURIComponent('(' + clientIds.map(c => '"' + c + '"').join(',') + ')')
  const statusClause = encodeURIComponent('(' + ACTIVE_STATUSES.map(s => '"' + s + '"').join(',') + ')')
  let tasks = []
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?select=id,title,status,agent_identity,agent,project,metadata,client_id&client_id=in.${inClause}&status=in.${statusClause}&order=priority.desc,created_at.desc&limit=500`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) tasks = await r.json()
  } catch { tasks = [] }

  // Build the project -> mission_slug -> tasks map.
  const projectMap = new Map()
  function getProject(slug, name) {
    if (!projectMap.has(slug)) {
      projectMap.set(slug, { slug, name: name || slug, missions: new Map(), unfiled_tasks: [] })
    }
    return projectMap.get(slug)
  }

  for (const t of tasks) {
    const projectSlug = t.project || (t.metadata && t.metadata.project) || 'unsorted'
    const proj = getProject(projectSlug)
    let missionSlug = null
    if (t.metadata && typeof t.metadata === 'object') {
      missionSlug = t.metadata.mission_slug || t.metadata.mission || null
    }
    if (!missionSlug && typeof t.text === 'string') {
      const m = t.text.match(/--mission\s+([\w:-]+)/)
      if (m) missionSlug = m[1]
    }
    const taskEntry = {
      id: t.id,
      title: t.title || '',
      status: t.status,
      agent: t.agent_identity || t.agent || null,
      client_id: t.client_id,
    }
    if (missionSlug) {
      // Strip the `<project>:` prefix for display when it matches the project.
      const display = missionSlug.startsWith(projectSlug + ':')
        ? missionSlug.slice(projectSlug.length + 1)
        : missionSlug
      if (!proj.missions.has(missionSlug)) {
        proj.missions.set(missionSlug, { slug: missionSlug, name: display, tasks: [] })
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
    missions.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    projects.push({
      slug: proj.slug,
      name: proj.name,
      missions,
      unfiled_tasks: proj.unfiled_tasks,
    })
  }
  projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return res.status(200).json({ projects })
}
