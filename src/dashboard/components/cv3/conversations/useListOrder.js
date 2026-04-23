// useListOrder -- R59 (session 20). Drag-to-reorder persistence helper.
//
// VISION: "Within the agents list, users can drag agents up and down.
// Within the projects list, users can drag projects. Reorder persists.
// Chronological-by-last-message is the default sort; drag overrides
// when the user wants a specific order."
//
// Storage keys per kind + world:
//   aom_agent_order_<world>  = array of agent slugs in display order
//   aom_project_order_<world> = array of project slugs in display order
//
// Missing slugs keep their chrono/alpha fallback position — the stored
// order is a partial override, not a complete replacement. Dragging a
// single card up slots it ahead of its neighbors; unknown new items
// (agents added later) still land by chrono rules.
import { useCallback, useEffect, useRef, useState } from 'react'

const AGENT_KEY = (world) => `aom_agent_order_${world || 'default'}`
const PROJECT_KEY = (world) => `aom_project_order_${world || 'default'}`

function readOrder(key) {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : []
  } catch { return [] }
}

function writeOrder(key, order) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(order)) } catch {}
}

function useOrder(key) {
  const [order, setOrder] = useState(() => readOrder(key))
  // Keep order in sync when the key changes (world switch).
  const keyRef = useRef(key)
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key
      setOrder(readOrder(key))
    }
  }, [key])

  useEffect(() => { writeOrder(key, order) }, [key, order])

  const move = useCallback((fromSlug, toSlug) => {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return
    setOrder(prev => {
      // Start from the existing explicit order plus any new slugs
      // (we don't know the full list here — callers pass only from/to).
      const set = new Set(prev)
      if (!set.has(fromSlug)) prev = [...prev, fromSlug]
      if (!set.has(toSlug)) prev = [...prev, toSlug]
      const next = prev.filter(s => s !== fromSlug)
      const idx = next.indexOf(toSlug)
      if (idx < 0) return [...next, fromSlug]
      next.splice(idx, 0, fromSlug)
      return next
    })
  }, [])
  const reset = useCallback(() => setOrder([]), [])
  return { order, move, reset }
}

export function useAgentOrder(world) { return useOrder(AGENT_KEY(world)) }
export function useProjectOrder(world) { return useOrder(PROJECT_KEY(world)) }

// applyOrder -- takes the chrono-sorted array + the stored order, and
// returns a new array where slugs named in `order` are slotted in
// `order` position; slugs absent from `order` keep their relative
// chrono position but appear after the ordered group.
export function applyOrder(chrono, order, getSlug = (x) => x.slug) {
  if (!Array.isArray(order) || order.length === 0) return chrono
  const bySlug = new Map(chrono.map(x => [getSlug(x), x]))
  const orderedPart = []
  for (const slug of order) {
    if (bySlug.has(slug)) {
      orderedPart.push(bySlug.get(slug))
      bySlug.delete(slug)
    }
  }
  // Remaining (non-ordered) keep their chrono position from the original list.
  const restPart = chrono.filter(x => bySlug.has(getSlug(x)))
  return [...orderedPart, ...restPart]
}
