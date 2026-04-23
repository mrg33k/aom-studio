// usePinned -- R58 (session 20). Universal pin/unpin state for agents +
// projects, persisted per-world in localStorage.
//
// VISION: "Pin/unpin is a universal affordance, not a hero-only button.
// Every agent card and every project card exposes pin/unpin through a
// three-dot menu (and right-click on desktop). Pinned items live at the
// top, unpinned items fall into the main list."
//
// Generalizes R19e's EA-only `aom_ea_hero_hidden` flag. The EA slug is
// included in the default pinned set for a fresh user so the EA still
// reads as pinned by default (R19e VISION: "The EA hero pin is a default,
// not a fixture"). Users who unpin the EA end up with a pinned set that
// excludes it.
//
// Storage keys are world-scoped so Ben's world has different pins than
// Patrik's AOM world without leaking either direction.
import { useCallback, useEffect, useState } from 'react'

const AGENTS_KEY = (world) => `aom_pinned_agents_${world || 'default'}`
const PROJECTS_KEY = (world) => `aom_pinned_projects_${world || 'default'}`
const LEGACY_EA_HIDDEN_KEY = 'aom_ea_hero_hidden'

function readSet(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return new Set(parsed.filter(s => typeof s === 'string'))
  } catch { return null }
}

function writeSet(key, set) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {}
}

function readLegacyEaHidden() {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(LEGACY_EA_HIDDEN_KEY) === '1' } catch { return false }
}

export function usePinnedAgents({ world, defaultEaSlug }) {
  const key = AGENTS_KEY(world)
  const [pinned, setPinned] = useState(() => {
    const stored = readSet(key)
    if (stored) return stored
    // First-load migration: if the legacy R19e flag said "hidden", the EA
    // starts unpinned; otherwise the EA is pinned by default. Either way we
    // persist so the legacy flag becomes irrelevant going forward.
    const legacyHidden = readLegacyEaHidden()
    const seed = new Set()
    if (defaultEaSlug && !legacyHidden) seed.add(defaultEaSlug)
    return seed
  })

  useEffect(() => { writeSet(key, pinned) }, [key, pinned])

  const pin = useCallback((slug) => {
    if (!slug) return
    setPinned(prev => {
      if (prev.has(slug)) return prev
      const next = new Set(prev); next.add(slug); return next
    })
  }, [])
  const unpin = useCallback((slug) => {
    if (!slug) return
    setPinned(prev => {
      if (!prev.has(slug)) return prev
      const next = new Set(prev); next.delete(slug); return next
    })
  }, [])
  const isPinned = useCallback((slug) => pinned.has(slug), [pinned])
  return { pinned, pin, unpin, isPinned }
}

export function usePinnedProjects({ world }) {
  const key = PROJECTS_KEY(world)
  const [pinned, setPinned] = useState(() => readSet(key) || new Set())
  useEffect(() => { writeSet(key, pinned) }, [key, pinned])
  const pin = useCallback((slug) => {
    if (!slug) return
    setPinned(prev => {
      if (prev.has(slug)) return prev
      const next = new Set(prev); next.add(slug); return next
    })
  }, [])
  const unpin = useCallback((slug) => {
    if (!slug) return
    setPinned(prev => {
      if (!prev.has(slug)) return prev
      const next = new Set(prev); next.delete(slug); return next
    })
  }, [])
  const isPinned = useCallback((slug) => pinned.has(slug), [pinned])
  return { pinned, pin, unpin, isPinned }
}
