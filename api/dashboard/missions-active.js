// GET /api/dashboard/missions-active?world=<worldId>&limit=20
//
// R-DC-5 / R-MP-2 — the Active section feed for the Home view and the
// "right now" tray in project-chat. Cross-project; returns missions that
// are in flight (last_message_at within window OR is_done=false from the
// registry).
//
// Response shape:
//   {
//     missions: [
//       {
//         project_slug, project_name,
//         workstream,
//         slug, name,
//         status, is_done,
//         last_updated, last_message_at
//       }
//     ],
//     total, generated_at
//   }
//
// Patrik open Q (R-MP-2 §Active threshold) — proposed default:
//   status not done AND (last_message_at within 7 days OR is_done=false)
// This endpoint implements that default; tune via ?days=N override.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
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

function titleFromSlug(s) {
  return String(s || '')
    .split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  // corner:identity-attribution 2026-07-27 — ?world= used to be parsed and then
  // never used: the handler checked only that SOME JWT existed and queried
  // messages with no client_id predicate at all, so a Ben-world or Karen-world
  // session saw which AOM missions were hot and when they last moved. The world
  // parameter is now verified AND actually applied, below.
  let worldId
  try {
    ({ tenant: worldId } = await verifyTenant(String(req.query.world || 'aom'), req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90)
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Shared projects this world holds a grant into. A shared room is ONE room
  // whose rows carry client_id='shared:<slug>' — in neither world's namespace,
  // so it has to be named explicitly alongside the world's own rows.
  let sharedSlugs = []
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?select=projects(slug,is_active)&client_id=eq.${encodeURIComponent(worldId)}`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      sharedSlugs = (rows || []).map(x => x?.projects?.is_active && x?.projects?.slug).filter(Boolean)
    }
  } catch { /* keep sharedSlugs empty on failure */ }

  // Project slugs this world may see. `null` = no restriction, kept for the aom
  // super-admin world exactly as missions-tree.js does it (Patrik is admin in
  // every world; the on-disk registry is AOM's own).
  let allowedProjectSlugs = null
  if (worldId !== 'aom') {
    const own = new Set(sharedSlugs)
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(worldId)}&select=slug`,
        { headers: supabaseHeaders() },
      )
      if (r.ok) {
        const rows = await r.json()
        for (const row of (rows || [])) if (row?.slug) own.add(row.slug)
      }
    } catch { /* on failure: over-show rather than hard-error, same as missions-tree */ }
    allowedProjectSlugs = own
  }

  // Pull last_message_at per mission, scoped to recent activity.
  const missionLastSeenAt = new Map()
  try {
    // messages timestamp column is `timestamp`, not `created_at` (querying
    // created_at 400s and silently zeroes out recency). See missions-tree.js.
    const clientIds = [worldId, ...sharedSlugs.map(s => `shared:${s}`)]
    const inList = clientIds.map(c => `"${String(c).replace(/"/g, '')}"`).join(',')
    const recencyScope = `&or=(client_id.in.(${inList}),client_id.is.null)`
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?select=timestamp,metadata&metadata->>mission_slug=not.is.null&timestamp=gte.${encodeURIComponent(sinceIso)}${recencyScope}&order=timestamp.desc&limit=500`,
      { headers: supabaseHeaders() },
    )
    if (r.ok) {
      const rows = await r.json()
      for (const row of (rows || [])) {
        const rawSlug = row?.metadata?.mission_slug
        const at = row?.timestamp
        if (!rawSlug || !at) continue
        const slug = canonicalizeMissionSlug(rawSlug, MISSION_SLUG_LOOKUP)
        if (!missionLastSeenAt.has(slug)) missionLastSeenAt.set(slug, at)
      }
    }
  } catch { /* fall through; we'll still surface registry missions */ }

  // Build candidate list from registry, filter to active.
  const candidates = []
  for (const m of (missionsRegistry?.missions || [])) {
    // Skip done — the Active feed never shows done missions per Patrik
    // SDK Q1 (no Failed, but done is the explicit settled state).
    if (m.is_done) continue
    // Skip missions whose project belongs to another world.
    if (allowedProjectSlugs !== null && !allowedProjectSlugs.has(m.project_slug)) continue
    const lastSeen = missionLastSeenAt.get(m.slug) || null
    candidates.push({
      project_slug: m.project_slug,
      project_name: titleFromSlug(m.project_slug),
      workstream: m.workstream || null,
      slug: m.slug,
      name: m.name || m.raw_slug || m.slug,
      status: m.status || 'in-progress',
      is_done: false,
      last_updated: m.last_updated || null,
      last_message_at: lastSeen,
    })
  }

  // Sort: missions with recent message activity first (desc by ts),
  // then missions without recent activity (desc by last_updated, falling
  // back to name).
  candidates.sort((a, b) => {
    const aHas = !!a.last_message_at
    const bHas = !!b.last_message_at
    if (aHas !== bHas) return aHas ? -1 : 1
    if (aHas && bHas) return b.last_message_at.localeCompare(a.last_message_at)
    if (a.last_updated && b.last_updated) return b.last_updated.localeCompare(a.last_updated)
    if (a.last_updated) return -1
    if (b.last_updated) return 1
    return (a.name || '').localeCompare(b.name || '')
  })

  return res.status(200).json({
    missions: candidates.slice(0, limit),
    total: candidates.length,
    generated_at: missionsRegistry?.generated_at || null,
    threshold_days: days,
  })
}
