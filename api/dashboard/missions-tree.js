// GET /api/dashboard/missions-tree?client=<worldId>
//
// corner:task-rooms R5: three-tier left-rail tree.
//
// Returns the live Project > Mission tree for a given world. Pulls from the
// in-repo missions registry (src/dashboard/data/missions.json, already used
// by Drawer.jsx) plus live Convex reads scoped to the viewer's world.
//
// corner:retire-supabase (2026-09-03). The four Supabase reads this made
// (project_access, projects, messages, agent_status, events) are now:
//   projects:list     own + shared + archived projects for the world
//   rooms:listRooms   every room the viewer can see, with its newest message,
//                     which gives project and mission recency AND the
//                     drawer-created missions (they are mission rooms)
//   events:find       mission_created events for CLI-scaffolded missions
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

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery } from '../_lib/reportsStore.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'
const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

// Realtime contract (2026-07-02): prefer the LIVE registry snapshot that the Mac's
// launchd job (com.aom-ea.missions-registry, 60s interval) writes to
// corner/users/aom/missions/master-loop/deliverables/missions-registry-live.json. Mission renames and status changes reach
// the tree within about a minute instead of waiting for a deploy. The deploy-baked import
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

// corner:left-menu R5: sort missions by recent activity (newest
// last_message_at first), matching the project-level recency sort. Among
// missions with no recent activity, keep active ahead of done, then alpha.
function byMissionRecency(a, b) {
  const ta = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0
  const tb = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0
  if (ta !== tb) return tb - ta
  if (!!a?.is_done !== !!b?.is_done) return a?.is_done ? 1 : -1
  return (a?.name || '').localeCompare(b?.name || '')
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// The short mission slug of a mission room. The title is the suffix-free fact
// (rooms.ts); the room key's leaf is the fallback for a room with no title.
function missionLeafOf(room) {
  const fromTitle = slugify(room.title)
  if (fromTitle) return fromTitle
  const parts = String(room.legacyRoomId || '').split(':')
  return parts[1] === 'mission' ? slugify(parts.slice(3).join(':') || parts[2] || '') : ''
}

const isoOf = (ms) => (Number.isFinite(Number(ms)) && Number(ms) > 0 ? new Date(Number(ms)).toISOString() : null)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })

  // corner:identity-attribution 2026-07-27: this used to check only that SOME
  // valid JWT was present and then take the world straight off ?client=, so any
  // signed-in user of any world could enumerate another world's whole project +
  // mission tree. verifyTenant is the gate.
  const _clientRaw = req.query.client && String(req.query.client).trim()
  if (!_clientRaw) return res.status(401).json({ error: 'Missing client' })
  let clientId
  try {
    ({ tenant: clientId } = await verifyTenant(String(_clientRaw), req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  // Live-first mission registry (see loadRegistry above). bust=1 skips the 30s
  // cache. The dashboard sends it on the refetch right after a rename/move so
  // the change is visible immediately instead of a cache-window later.
  const { registry: liveRegistry, lookup: liveSlugLookup } = await loadRegistry(!!req.query.bust)

  // The world's own projects plus the ones shared into it, archived included so
  // the archived set below can be built from the same read.
  let ownProjects = []
  let sharedSlugs = []
  let archivedProjectSlugs = new Set()
  try {
    const rows = await convexQuery('projects:list', { worldId: clientId, includeShared: true, includeArchived: true })
    for (const p of (Array.isArray(rows) ? rows : [])) {
      if (!p?.slug) continue
      const archived = p.archived === true || p.isActive === false
      // corner:corner-ui-cv6 wd40 DEF-4: archived projects must vanish from the
      // tree too. Collected here, excluded after the merge.
      if (archived) { archivedProjectSlugs.add(p.slug); continue }
      if (p.sharedRole) sharedSlugs.push(p.slug)
      else ownProjects.push(p)
    }
  } catch { /* keep the lists empty on failure; registry missions still render */ }

  // AOM is the super-admin and seeds every registry project; an archived
  // project in any world stays hidden for it too (that was the old global read).
  if (clientId === 'aom') {
    try {
      const all = await convexQuery('projects:list', { includeArchived: true })
      for (const p of (Array.isArray(all) ? all : [])) {
        if (p?.slug && (p.archived === true || p.isActive === false)) archivedProjectSlugs.add(p.slug)
      }
    } catch { /* on failure archived rooms over-show; safer than hiding live ones */ }
  }

  // R3-isolation: the set of project slugs this client owns so the registry
  // loop below can skip missions from other worlds. AOM is the super-admin and
  // sees everything (allowedProjectSlugs stays null).
  let allowedProjectSlugs = null
  if (clientId !== 'aom') {
    const ownSlugs = new Set(sharedSlugs)
    for (const p of ownProjects) ownSlugs.add(p.slug)
    allowedProjectSlugs = ownSlugs
  }

  // corner:mission-rooms: tasks retired 2026-05-17 (Patrik). The mission
  // registry + per-mission last_message_at is the only signal now. No more
  // task query, no more "1 in flight" labels, no more unfiled_tasks.
  const tasks = []

  // Newest activity per PROJECT and per MISSION so the drawer can sort both
  // lists by real recent activity (and light the "active" dot). Every room
  // carries its newest message, so one rooms read feeds both maps: project
  // recency is the max across all of a project's rooms (project chat AND its
  // missions), mission recency is per mission room. Drawer-created missions
  // are mission rooms too, so the same read is the dynamic-missions source.
  const missionLastSeenAt = new Map()
  const projectLastSeenAt = new Map()
  const dynamicMissions = []
  try {
    const rooms = await convexQuery('rooms:listRooms', { worldId: clientId, filter: 'all' })
    for (const room of (Array.isArray(rooms) ? rooms : [])) {
      if (!room || room.archived) continue
      const proj = room.project ? String(room.project) : null
      const at = isoOf(room.lastMessage?.createdAt)
      if (proj && at) {
        const prev = projectLastSeenAt.get(proj)
        if (!prev || at > prev) projectLastSeenAt.set(proj, at)
      }
      if (room.kind !== 'mission' || !proj) continue
      const short = missionLeafOf(room)
      if (!short) continue
      const fullSlug = `${proj}:${short}`
      if (at) {
        // Canonicalize within the room's own project so a bare mission slug
        // lights recency under its true parent, not a foreign project.
        for (const key of new Set([canonicalizeMissionSlug(short, liveSlugLookup, proj), fullSlug, short])) {
          const prev = missionLastSeenAt.get(key)
          if (!prev || at > prev) missionLastSeenAt.set(key, at)
        }
      }
      dynamicMissions.push({ projectSlug: proj, missionSlug: short, name: room.title || short, fullSlug })
    }
  } catch { /* dot just won't light; missions still render */ }

  // corner:mission-panel: CLI-scaffolded missions from the events ledger.
  // Missions scaffolded via scripts/new-mission.py write `mission_created`
  // events; without this source a CLI-created mission never appeared until the
  // next build+deploy. Payload mirrors missions-created.js:
  //   { project, mission|mission_slug, description, file_count }; agent="<project>:<mission>".
  // NOT client-scoped (mission events carry no reliable client_id), so tenant
  // isolation is enforced at merge time via allowedProjectSlugs below.
  const eventMissions = []
  try {
    const rows = await convexQuery('events:find', { event_type: 'mission_created', order: 'desc', limit: 500 })
    for (const row of (Array.isArray(rows) ? rows : [])) {
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
  } catch { /* swallow; registry + room missions still render */ }

  // mission-rooms reframe: the mission is the unit of work, not the task.
  // Seed every project + mission from the on-disk registry (built at
  // build time by scripts/build-missions-registry.cjs from corner/missions
  // and corner/users/<u>/projects/<p>/missions). Missions without active
  // tasks still surface; their status comes from the mission's CONTEXT.md.
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
      // R-MP-3: workstream grouping (legacy). Null means top-level / Other bucket.
      workstream: m.workstream || null,
      status: m.status || null,
      is_done: !!m.is_done,
      last_updated: m.last_updated || null,
      last_message_at: missionLastSeenAt.get(m.slug) || missionLastSeenAt.get(m.raw_slug) || null,
      path: m.path || null,
      tasks: [],
    })
  }

  // Registered projects with no registry missions still need a node so the
  // rail can show the project itself.
  for (const p of ownProjects) getProject(p.slug, p.name)

  // Registry missions key by full slug ("<project>:<slug>") while dynamic
  // sources key by the short slug, so a .has() check alone misses the case
  // where the same mission exists in both (e.g. a drawer-created mission that
  // landed in the registry on a later deploy, while its room lives on).
  // Also compare against registry raw_slugs to dedupe.
  function projectHasMission(proj, shortSlug, fullSlug) {
    if (proj.missions.has(shortSlug) || proj.missions.has(fullSlug)) return true
    for (const x of proj.missions.values()) {
      if (x.raw_slug && x.raw_slug === shortSlug) return true
      // corner:corner-ui-cv6 restructure (2026-06-25): a mission moved into a
      // nested home gets a compound raw_slug (corner-ui-cv6-chat-composer) while
      // its original mission_created event / room still keys by the leaf folder
      // name ("composer"). Without this the event re-adds the mission as a FLAT
      // root, duplicating the nested registry copy. Dedupe by folder.
      if (x.folder_name && x.folder_name === shortSlug) return true
      if (x.name && slugify(x.name) === shortSlug) return true
    }
    return false
  }

  // Add dynamic missions (mission rooms) if not already in the registry.
  for (const dm of dynamicMissions) {
    if (allowedProjectSlugs !== null && !allowedProjectSlugs.has(dm.projectSlug)) continue
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
  // already present from the registry or the rooms. Tenant isolation is
  // enforced HERE because the events query above is not client-scoped.
  //
  // Ghost guard (2026-06-26): a mission_created event lives forever, but a
  // mission can be RENAMED or MOVED on disk (e.g. the corner restructure folded
  // "infra" into "general", "cv4-redesign" into "older-versions"). Its old event
  // then has no registry match and re-surfaces as a FLAT root, polluting the tree.
  // The registry build timestamp (generated_at) is the cutoff: if the build saw
  // the disk AFTER this event fired and still did not include the mission, the
  // mission was deliberately removed/renamed, so drop the ghost. An event NEWER
  // than the last build is a genuinely-new mission not yet baked in; keep it
  // (the original reason this merge exists). Null/unparseable timestamps fall
  // through to the old keep-it behaviour so a missing date never hides a real mission.
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
  // (registry, rooms, mission_created events) so none of them can resurrect
  // an archived room.
  for (const slug of archivedProjectSlugs) projectMap.delete(slug)

  const projects = []
  for (const proj of projectMap.values()) {
    const missions = []
    for (const m of proj.missions.values()) missions.push(m)
    missions.sort(byMissionRecency)

    // R-MP-3: group by workstream. Missions with workstream:null fall
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

    // R-MP-2: nested tree. Build a parent -> children mapping using
    // raw_slug + parent_raw_slug from the registry. Missions whose
    // parent_raw_slug is null become tree roots. Children attach to
    // their parents recursively. Sort siblings by recency.
    const childrenByParent = new Map()
    const knownRawSlugs = new Set(missions.map(m => m.raw_slug).filter(Boolean))
    for (const m of missions) {
      // corner:left-menu: non-registry missions (room-created or CLI-scaffolded)
      // carry no raw_slug. They used to be skipped here, which dropped them from
      // `tree` entirely. Treat their slug as the raw key so they render as roots.
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
    // (project chat OR any mission). Falls back to the max mission timestamp.
    let projectLastMessageAt = projectLastSeenAt.get(proj.slug) || null
    for (const m of missions) {
      if (m.last_message_at && (!projectLastMessageAt || m.last_message_at > projectLastMessageAt)) {
        projectLastMessageAt = m.last_message_at
      }
    }

    projects.push({
      slug: proj.slug,
      name: proj.name,
      // Newest activity anywhere in the project. Drives the project-list
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
