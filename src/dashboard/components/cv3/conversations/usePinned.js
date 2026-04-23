// usePinned -- R58 (session 20). Universal pin/unpin state for agents +
// projects, persisted per-world in localStorage.
//
// VISION: "Pin/unpin is a universal affordance, not a hero-only button.
// Every agent card and every project card exposes pin/unpin through a
// three-dot menu (and right-click on desktop). Pinned items live at the
// top, unpinned items fall into the main list."
//
// Generalizes R19e's EA-only `aom_ea_hero_hidden` flag. The EA slug is
// seeded into the pinned set on first mount so a fresh user sees the EA
// pinned by default (R19e VISION: "The EA hero pin is a default, not a
// fixture"). Because `agents` loads async, the seed is deferred to an
// effect that waits for defaultEaSlug to become known.
import { useCallback, useEffect, useRef, useState } from 'react'

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
  const [pinned, setPinned] = useState(() => readSet(key) || new Set())

  // Seed the EA on first mount IF storage was empty AND defaultEaSlug is
  // known. Because agents load async, we defer seeding to an effect that
  // watches defaultEaSlug. `seededRef` starts true when storage already
  // has a value — the user has an explicit pin state and we respect it.
  const seededRef = useRef(readSet(key) !== null)
  useEffect(() => {
    if (seededRef.current) return
    if (!defaultEaSlug) return
    seededRef.current = true
    const legacyHidden = readLegacyEaHidden()
    if (!legacyHidden) {
      setPinned(prev => {
        if (prev.has(defaultEaSlug)) return prev
        const next = new Set(prev); next.add(defaultEaSlug); return next
      })
    }
    // If legacy says "hidden", leave the empty set alone; that's
    // "EA unpinned" in the new schema.
  }, [defaultEaSlug])

  useEffect(() => {
    // Don't overwrite storage before the seed runs. Before the first
    // effect fires, `seededRef.current` is false only when we had no
    // stored value AND no defaultEaSlug yet; in that window the set is
    // empty so skipping the write just delays persistence by a tick.
    if (!seededRef.current) return
    writeSet(key, pinned)
  }, [key, pinned])

  const pin = useCallback((slug) => {
    if (!slug) return
    seededRef.current = true
    setPinned(prev => {
      if (prev.has(slug)) return prev
      const next = new Set(prev); next.add(slug); return next
    })
  }, [])
  const unpin = useCallback((slug) => {
    if (!slug) return
    seededRef.current = true
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
