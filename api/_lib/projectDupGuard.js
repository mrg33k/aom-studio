// api/_lib/projectDupGuard.js: blocks minting a PROJECT whose topic already
// has a home. The "missions randomly turn themselves into projects" disease:
// the chat and voice novel-topic flows checked only the projects table before
// inserting, so social / outreach / deck / brand were each minted as projects
// while a mission already carried the work.
//
// A candidate slug is a twin when its tail, with singular/plural and
// punctuation-squashed variants, matches, same tenant:
//   1. a live mission room in the world (Convex rooms, kind mission),
//   2. a mission in the bundled registry (disk truth at deploy time),
//   3. an ACTIVE project with a near-name (social vs socials).
// Exact project-slug matches are NOT twins here; callers already handle
// those idempotently by returning the existing row.
//
// corner:retire-supabase R2: reads rooms:listRooms and projects:list instead
// of the Supabase agent_status and projects tables. `supabaseUrl` and
// `headers` are still accepted (and ignored) so the two callers did not change.

import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { convexQuery } from './verifyTenant.js'

const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function variants(slug) {
  const t = String(slug || '').toLowerCase().trim()
  const v = new Set([t, squash(t)])
  if (t.endsWith('s')) {
    v.add(t.slice(0, -1))
    v.add(squash(t.slice(0, -1)))
  } else {
    v.add(t + 's')
    v.add(squash(t + 's'))
  }
  v.delete('')
  return v
}

export async function findProjectSlugTwin({ slug, clientId }) {
  const cand = variants(slug)
  if (!cand.size || !clientId) return null

  // 1. Live mission rooms for this tenant (covers missions newer than the deploy).
  try {
    const rooms = await convexQuery('rooms:listRooms', { worldId: String(clientId), filter: 'mission' })
    for (const room of Array.isArray(rooms) ? rooms : []) {
      const legacy = String(room.legacyRoomId || '')
      const tail = (legacy ? legacy.split(':').pop() : String(room.title || '')).toLowerCase().replace(/\s+/g, '-')
      if (cand.has(tail) || cand.has(squash(tail))) {
        return { kind: 'mission', slug: legacy ? legacy.split(':').slice(2).join(':') : tail }
      }
    }
  } catch { /* guard must never block creation on a read hiccup */ }

  // 2. Bundled missions registry (disk truth at deploy time).
  const items = Array.isArray(missionsRegistry)
    ? missionsRegistry
    : missionsRegistry.missions || []
  for (const m of items) {
    const tail = String(m.raw_slug || m.folder_name || '').toLowerCase()
    if (tail && (cand.has(tail) || cand.has(squash(tail)))) {
      return { kind: 'mission', slug: m.slug || tail }
    }
  }

  // 3. Active projects with a near-name (exact slug handled by the caller).
  try {
    const projects = await convexQuery('projects:list', { worldSlug: String(clientId), activeOnly: true })
    for (const row of Array.isArray(projects) ? projects : []) {
      const p = String(row.slug || '').toLowerCase()
      if (p === String(slug).toLowerCase()) continue
      if (cand.has(p) || cand.has(squash(p))) {
        return { kind: 'project', slug: row.slug }
      }
    }
  } catch { /* same: fail open */ }

  return null
}
