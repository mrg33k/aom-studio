// Mission-slug canonicalization.
//
// The mission_slug field on messages.metadata has drifted between two forms
// over the life of the dashboard:
//
//   bare:       "deal-bank"
//   canonical:  "space-rising:deal-bank"
//
// The registry (missions-registry.json) only emits the canonical form, but
// historical messages and a few legacy send paths wrote the bare form. Without
// normalization, room views split a single mission's thread across two rooms
// (one filtered by each form) and activity dots fail to light.
//
// This helper resolves any stored slug to the canonical "<project>:<mission>"
// form when the registry knows the mission. If no match exists, the stored
// value is returned unchanged so unknown slugs still render in their own room
// rather than disappearing.

export function buildSlugLookup(registry) {
  const byRaw = new Map()
  const canonicals = new Set()
  for (const m of (registry?.missions || [])) {
    if (m?.slug) canonicals.add(m.slug)
    if (m?.raw_slug && m?.slug) {
      // First registration wins on raw-slug collisions across projects.
      if (!byRaw.has(m.raw_slug)) byRaw.set(m.raw_slug, m.slug)
    }
  }
  return { byRaw, canonicals }
}

// `preferredProject` (optional): the project the row EXPLICITLY belongs to.
// A mission slug is always "<its parent project>:<slug>" by construction, so a
// row that carries project=X and a bare mission slug Y is, by definition, mission
// X:Y — it must never be re-filed under whichever OTHER project happened to
// register the bare slug Y first. Without this, a bare "social" under AOM was
// deterministically canonicalized to "ambition-mechanical:social" (first-wins),
// dragging every subsequent message + room_id + recency into the wrong project
// and making an in-chat correction impossible to keep (corner:front-door Bug 1,
// Patrik 2026-07-22). The global first-wins byRaw lookup stays as the fallback
// for genuinely project-less legacy rows.
export function canonicalizeMissionSlug(stored, registryOrLookup, preferredProject) {
  if (!stored || typeof stored !== 'string') return stored
  if (stored.includes(':')) return stored
  if (preferredProject && String(preferredProject).trim()) {
    return `${String(preferredProject).trim()}:${stored}`
  }
  const lookup = registryOrLookup && registryOrLookup.byRaw
    ? registryOrLookup
    : buildSlugLookup(registryOrLookup)
  return lookup.byRaw.get(stored) || stored
}

export function missionSlugsMatch(storedSlug, targetSlug, registryOrLookup) {
  if (!storedSlug || !targetSlug) return false
  if (storedSlug === targetSlug) return true
  const storedTail = storedSlug.includes(':') ? storedSlug.split(':').pop() : storedSlug
  const targetTail = targetSlug.includes(':') ? targetSlug.split(':').pop() : targetSlug
  if (storedTail !== targetTail) return false
  if (registryOrLookup) {
    const canon = canonicalizeMissionSlug(storedSlug, registryOrLookup)
    return canon === targetSlug || canon === canonicalizeMissionSlug(targetSlug, registryOrLookup)
  }
  return true
}
