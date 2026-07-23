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

// Realtime contract (2026-07-02): prefer the LIVE registry snapshot that the Mac's
// launchd job (com.aom-ea.missions-registry, 60s interval) writes to
// corner/users/aom/missions/master-loop/deliverables/missions-registry-live.json — mission renames and status changes reach
// the tree within ~a minute instead of waiting for a deploy. The deploy-baked import
// above stays as the fallback (tunnel down, local dev). Cached for 30s per warm
// lambda so tree renders don't pay a tunnel round-trip each time. The ghost guard
// below also benefits: generated_at now advances every minute, so renamed missions
// stop resurfacing from stale mission_created events within a minute too.
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com'
const LIVE_REGISTRY_PATH = 'corner/users/aom/missions/master-loop/deliverables/missions-registry-live.json'
let _registryCache = { at: 0, registry: null, lookup: null }
async function loadRegistry(force) {
  const now = Date.now()
  if (!force && _registryCache.registry && now - _registryCache.at < 30000) return _registryCache
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const r = await fetch(
      `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(LIVE_REGISTRY_PATH)}`,
      { headers: { 'User-Agent': 'aom-vercel-proxy' }, signal: ctrl.signal },
    ).finally(() => clearTimeout(t))
    if (r.ok) {
      const fresh = await r.json()
      if (fresh && Array.isArray(fresh.missions)) {
        _registryCache = { at: now, registry: fresh, lookup: buildSlugLookup(fresh) }
        return _registryCache
      }
    }
  } catch { /* fall through to the bundled registry */ }
  _registryCache = { at: now, registry: missionsRegistry, lookup: MISSION_SLUG_LOOKUP }
  return _registryCache
}

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

// corner:left-menu R5 — sort missions by recent activity (newest
// last_message_at first), matching the project-level recency sort. Among
// missions with no recent activity, keep active ahead of done, then alpha.
function byMissionRecency(a, b) {
  const ta = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0
  const tb = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0
  if (ta !== tb) return tb - ta
  if (!!a?.is_done !== !!b?.is_done) return a?.is_done ? 1 : -1
  return (a?.name || '').localeCompare(b?.name || '')
}

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

  // Live-first mission registry (see loadRegistry above). bust=1 skips the 30s
  // cache — the dashboard sends it on the refetch right after a rename/move so
  // the change is visible immediately instead of a cache-window later.
  const { registry: liveRegistry, lookup: liveSlugLookup } = await loadRegistry(!!req.query.bust)

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

  // corner:corner-ui-cv6 wd40 DEF-4: archived projects (is_active=false) must
  // vanish from the tree too. Shared projects are already gated above, but the
  // own-world path seeds every registry/dynamic/event project unfiltered —
  // an archived project with a disk home (or lingering agent_status/event
  // rows) would keep rendering. Collected here, excluded after the merge.
  let archivedProjectSlugs = new Set()
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?is_active=eq.false&select=slug`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      archivedProjectSlugs = new Set((rows || []).map(x => x?.slug).filter(Boolean))
    }
  } catch { /* on failure archived rooms over-show; safer than hiding live ones */ }

  const clientIds = [clientId, ...sharedSlugs.map(s => `shared:${s}`)]
  // Mirror the Path A widen from useTasks.js so aom viewers see Ben tasks.
  if (clientId === 'aom') clientIds.push('ben')

  // R3-isolation — build the set of project slugs this client owns so the
  // registry loop below can skip missions from other worlds. AOM is the
  // super-admin and sees everything (allowedProjectSlugs stays null).
  let allowedProjectSlugs = null
  if (clientId !== 'aom') {
    const ownSlugs = new Set(sharedSlugs)
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&select=slug`,
        { headers: supabaseHeaders() },
      )
      if (r.ok) {
        const rows = await r.json()
        for (const row of (rows || [])) {
          if (row?.slug) ownSlugs.add(row.slug)
        }
      }
    } catch { /* on failure: allowedProjectSlugs stays null → over-show is safer than hard error */ }
    allowedProjectSlugs = ownSlugs
  }

  // corner:mission-rooms — tasks retired 2026-05-17 (Patrik). The mission
  // registry + per-mission last_message_at is the only signal now. No more
  // task query, no more "1 in flight" labels, no more unfiled_tasks.
  const tasks = []

  // Fetch the newest message per PROJECT and per MISSION so the drawer can
  // sort both lists by real recent activity (and light the "active" dot).
  //
  // Two design points that matter:
  //
  //  1. NO mission_slug filter. Project-level chat (messages with no
  //     mission_slug) MUST count toward a project's recency — otherwise a
  //     project the user actively chats in, but not inside a specific
  //     mission, never floats up. (This was the "I was in Holistic an hour
  //     ago but it's buried" bug: her recent messages were project-level,
  //     so the mission-only query missed them and the project sank.) Every
  //     message carries a `project` field, including mission-tagged ones, so
  //     one unfiltered query feeds both maps — project recency is the max
  //     across all of a project's messages, mission recency is per slug.
  //
  //  2. `timestamp`, not `created_at`. The messages table's column is
  //     `timestamp`; querying created_at 400s, the r.ok guard swallows it,
  //     and every recency value ends up null — silently defeating the sort.
  //
  // 60-day window (was 14d — longer so recency reflects more than two weeks)
  // and a 2000-row cap so quieter projects/missions aren't starved out of
  // the newest rows by a noisy world.
  const missionLastSeenAt = new Map()
  const projectLastSeenAt = new Map()
  try {
    const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?select=timestamp,project,metadata&timestamp=gte.${encodeURIComponent(sinceIso)}&order=timestamp.desc&limit=2000`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      for (const row of (rows || [])) {
        const at = row?.timestamp
        if (!at) continue
        // Project-level recency (first hit per project wins — rows are desc).
        const proj = row?.project
        if (proj && !projectLastSeenAt.has(proj)) projectLastSeenAt.set(proj, at)
        // Mission-level recency (only mission-tagged rows).
        const rawSlug = row?.metadata?.mission_slug
        if (rawSlug) {
          // Canonicalize within the row's own project (Bug 1) so a bare mission
          // slug lights recency under its true parent, not a foreign project.
          const slug = canonicalizeMissionSlug(rawSlug, liveSlugLookup, row?.project)
          if (!missionLastSeenAt.has(slug)) missionLastSeenAt.set(slug, at)
        }
      }
    }
  } catch { /* dot just won't light; missions still render */ }

  // R78-p9c: fetch dynamically-created missions from agent_status (type='mission').
  // These are missions created via the drawer that aren't yet in the on-disk
  // registry (build-missions-registry.cjs runs at build time, not on demand).
  // Slug format: "<projectSlug>:<missionSlug>", e.g. "corner:imagegen-composer".
  const dynamicMissions = []
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_status?type=eq.mission&client_id=eq.${encodeURIComponent(clientId)}&select=slug,name,color`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      for (const row of (rows || [])) {
        if (!row?.slug || !row.slug.includes(':')) continue
        const colonIdx = row.slug.indexOf(':')
        const projectSlug = row.slug.slice(0, colonIdx)
        const missionSlug = row.slug.slice(colonIdx + 1)
        dynamicMissions.push({ projectSlug, missionSlug, name: row.name || missionSlug, fullSlug: row.slug })
      }
    }
  } catch { /* swallow — registry missions still render */ }

  // corner:mission-panel — fetch CLI-scaffolded missions from the events store.
  // missions-tree previously saw missions from only two sources: the static
  // registry (built at deploy time by build-missions-registry.cjs) and
  // agent_status (drawer-created). Missions scaffolded via scripts/new-mission.py
  // write `mission_created` events to the `events` table — a third source the
  // tree never read, so a CLI-created mission (e.g. corner:billing-june-15)
  // never appeared until the next build+deploy. This query closes that gap so
  // new missions show LIVE. Payload mirrors missions-created.js:
  //   { project, mission|mission_slug, description, file_count }; agent="<project>:<mission>".
  // NOT client-scoped (mission events carry no reliable client_id), so tenant
  // isolation is enforced at merge time via allowedProjectSlugs below.
  const eventMissions = []
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?event_type=eq.mission_created&select=agent,payload,timestamp&order=timestamp.desc&limit=500`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      for (const row of (rows || [])) {
        const p = row?.payload || {}
        const projectSlug = (p.project || '').toString()
        const missionSlug = (p.mission || p.mission_slug || '').toString()
        if (!projectSlug || !missionSlug) continue
        eventMissions.push({
          projectSlug,
          missionSlug,
          name: deriveDisplayName(missionSlug),
          last_updated: row.timestamp || null,
        })
      }
    }
  } catch { /* swallow — registry + agent_status missions still render */ }

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

  for (const m of (liveRegistry?.missions || [])) {
    // Skip missions whose project belongs to a different tenant.
    if (allowedProjectSlugs !== null && !allowedProjectSlugs.has(m.project_slug)) continue
    const proj = getProject(m.project_slug)
    proj.missions.set(m.slug, {
      slug: m.slug,
      raw_slug: m.raw_slug || null,
      folder_name: m.folder_name || null,
      parent_raw_slug: m.parent_raw_slug || null,
      depth: typeof m.depth === 'number' ? m.depth : 0,
      name: m.name || m.raw_slug || m.slug,
      // R-MP-3 — workstream grouping (legacy). Null means top-level / Other bucket.
      workstream: m.workstream || null,
      status: m.status || null,
      is_done: !!m.is_done,
      last_updated: m.last_updated || null,
      last_message_at: missionLastSeenAt.get(m.slug) || null,
      path: m.path || null,
      tasks: [],
    })
  }

  // Registry missions key by full slug ("<project>:<slug>") while dynamic
  // sources key by the short slug — so a .has() check alone misses the case
  // where the same mission exists in both (e.g. a drawer-created mission that
  // landed in the registry on a later deploy, while its agent_status row
  // lives on forever). Also compare against registry raw_slugs to dedupe.
  function projectHasMission(proj, shortSlug, fullSlug) {
    if (proj.missions.has(shortSlug) || proj.missions.has(fullSlug)) return true
    for (const x of proj.missions.values()) {
      if (x.raw_slug && x.raw_slug === shortSlug) return true
      // corner:corner-ui-cv6 restructure (2026-06-25) — a mission moved into a
      // nested home gets a compound raw_slug (corner-ui-cv6-chat-composer) while
      // its original mission_created event / agent_status row still keys by the
      // leaf folder name ("composer"). Without this the event re-adds the mission
      // as a FLAT root, duplicating the nested registry copy. Dedupe by folder.
      if (x.folder_name && x.folder_name === shortSlug) return true
    }
    return false
  }

  // Add dynamic missions (drawer-created) if not already in the registry.
  for (const dm of dynamicMissions) {
    const proj = getProject(dm.projectSlug)
    if (!projectHasMission(proj, dm.missionSlug, dm.fullSlug)) {
      proj.missions.set(dm.missionSlug, {
        slug: dm.missionSlug,
        name: dm.name,
        status: 'in-progress',
        is_done: false,
        last_message_at: missionLastSeenAt.get(dm.missionSlug) || missionLastSeenAt.get(dm.fullSlug) || null,
        tasks: [],
      })
    }
  }

  // Add events-store missions (CLI-scaffolded via new-mission.py) if not
  // already present from the registry or agent_status. Tenant isolation is
  // enforced HERE because the events query above is not client-scoped.
  //
  // Ghost guard (2026-06-26): a mission_created event lives forever, but a
  // mission can be RENAMED or MOVED on disk (e.g. the corner restructure folded
  // "infra" into "general", "cv4-redesign" into "older-versions"). Its old event
  // then has no registry match and re-surfaces as a FLAT root, polluting the tree.
  // The registry build timestamp (generated_at) is the cutoff: if the build saw
  // the disk AFTER this event fired and still did not include the mission, the
  // mission was deliberately removed/renamed — drop the ghost. An event NEWER than
  // the last build is a genuinely-new mission not yet baked in — keep it (the
  // original reason this merge exists). Null/unparseable timestamps fall through
  // to the old keep-it behaviour so a missing date never hides a real mission.
  const registryBuiltAt = Date.parse(liveRegistry?.generated_at || '') || 0
  for (const em of eventMissions) {
    if (allowedProjectSlugs !== null && !allowedProjectSlugs.has(em.projectSlug)) continue
    const proj = getProject(em.projectSlug)
    const fullSlug = `${em.projectSlug}:${em.missionSlug}`
    const eventAt = Date.parse(em.last_updated || '') || 0
    if (registryBuiltAt && eventAt && eventAt < registryBuiltAt && !projectHasMission(proj, em.missionSlug, fullSlug)) {
      continue // ghost: pre-dates the registry build that omitted it
    }
    if (!projectHasMission(proj, em.missionSlug, fullSlug)) {
      proj.missions.set(em.missionSlug, {
        slug: em.missionSlug,
        name: em.name,
        status: 'in-progress',
        is_done: false,
        last_updated: em.last_updated,
        last_message_at: missionLastSeenAt.get(em.missionSlug) || missionLastSeenAt.get(fullSlug) || null,
        tasks: [],
      })
    }
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

  // wd40 DEF-4: strip archived projects after every merge source has run
  // (registry, agent_status, mission_created events, tasks) so none of them
  // can resurrect an archived room.
  for (const slug of archivedProjectSlugs) projectMap.delete(slug)

  const projects = []
  for (const proj of projectMap.values()) {
    const missions = []
    for (const m of proj.missions.values()) missions.push(m)
    missions.sort(byMissionRecency)

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

    // R-MP-2 — nested tree. Build a parent → children mapping using
    // raw_slug + parent_raw_slug from the registry. Missions whose
    // parent_raw_slug is null become tree roots. Children attach to
    // their parents recursively. Sort siblings by is_done then name.
    const childrenByParent = new Map()
    const knownRawSlugs = new Set(missions.map(m => m.raw_slug).filter(Boolean))
    for (const m of missions) {
      // corner:left-menu — non-registry missions (drawer-created via
      // agent_status, CLI-scaffolded via mission_created events, or derived
      // from a tagged task) carry no raw_slug. They used to be skipped here,
      // which dropped them from `tree` entirely — and since Drawer.jsx
      // prefers `tree` over the flat list whenever the tree is non-empty,
      // any NEW mission added to a project that already had registry
      // missions was invisible until the next deploy rebuilt the registry.
      // Treat their slug as the raw key so they render as tree roots.
      const parentKey = (m.parent_raw_slug && knownRawSlugs.has(m.parent_raw_slug))
        ? m.parent_raw_slug
        : null
      if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, [])
      childrenByParent.get(parentKey).push(m)
    }
    function buildSubtree(parentRawSlug) {
      const list = (childrenByParent.get(parentRawSlug) || []).slice()
      list.sort(byMissionRecency)
      return list.map(m => ({ ...m, children: buildSubtree(m.raw_slug || m.slug) }))
    }
    const tree = buildSubtree(null)

    // Project-level recency = newest message anywhere in the project
    // (project chat OR any mission). Falls back to the max mission timestamp
    // if the project field wasn't on the rows for some reason.
    let projectLastMessageAt = projectLastSeenAt.get(proj.slug) || null
    for (const m of missions) {
      if (m.last_message_at && (!projectLastMessageAt || m.last_message_at > projectLastMessageAt)) {
        projectLastMessageAt = m.last_message_at
      }
    }

    projects.push({
      slug: proj.slug,
      name: proj.name,
      // Newest activity anywhere in the project — drives the project-list
      // recency sort in Drawer.jsx. Includes project-level chat, not just
      // mission-tagged messages.
      last_message_at: projectLastMessageAt,
      // Flat list kept for backwards-compat with existing consumers
      // (Drawer.jsx + the cv4 mission-tree mockup before R-MP-2 wires
      // the nested shape). Workstreams + tree added in parallel.
      missions,
      workstreams,
      tree,
      unfiled_tasks: proj.unfiled_tasks,
    })
  }
  projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return res.status(200).json({
    projects,
    registry_generated_at: liveRegistry?.generated_at || null,
  })
}

function deriveDisplayName(slug) {
  return String(slug || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
