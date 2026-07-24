// api/_lib/projectDupGuard.js — corner:one-write-path R11 (2026-07-24).
//
// Blocks minting a PROJECT whose topic already has a home. The "missions
// randomly turn themselves into projects" disease: the chat and voice
// novel-topic flows checked only the projects table before inserting, so
// social / outreach / deck / brand were each minted as projects while a
// mission already carried the work (R10 guarded mission creation only).
//
// A candidate slug is a twin when its tail — with singular/plural and
// punctuation-squashed variants — matches, same tenant:
//   1. a live mission tile (agent_status type='mission'),
//   2. a mission in the bundled registry (disk truth at deploy time),
//   3. an ACTIVE project with a near-name (social vs socials).
// Exact project-slug matches are NOT twins here; callers already handle
// those idempotently by returning the existing row.

import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }

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

export async function findProjectSlugTwin({ supabaseUrl, headers, slug, clientId }) {
  const cand = variants(slug)
  if (!cand.size) return null

  // 1. Live mission tiles for this tenant (covers tiles newer than the deploy).
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/agent_status?type=eq.mission&client_id=eq.${encodeURIComponent(clientId)}&select=slug`,
      { headers }
    )
    if (r.ok) {
      for (const row of await r.json()) {
        const tail = String(row.slug || '').split(':').pop().toLowerCase()
        if (cand.has(tail) || cand.has(squash(tail))) {
          return { kind: 'mission', slug: row.slug }
        }
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
    const r = await fetch(
      `${supabaseUrl}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.true&select=slug`,
      { headers }
    )
    if (r.ok) {
      for (const row of await r.json()) {
        const p = String(row.slug || '').toLowerCase()
        if (p === String(slug).toLowerCase()) continue
        if (cand.has(p) || cand.has(squash(p))) {
          return { kind: 'project', slug: row.slug }
        }
      }
    }
  } catch { /* same: fail open */ }

  return null
}
