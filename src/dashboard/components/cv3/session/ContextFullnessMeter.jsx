// ContextFullnessMeter -- R27e (2026-04-21).
//
// A small, unobtrusive bar that lives next to the (future) clear-session
// button on every super-agent chat surface (home EA, 1:1, scoped project
// chat). Same indicator, same place, every chat.
//
// v1 heuristic: turn count since last clear, scaled against a configurable
// ceiling (default 80 = 100%). We don't have direct Claude Code context
// introspection yet, so this is a user-facing proxy: you glance, you see
// green/yellow/red, you decide whether to clear.
//
// Storage: turn count per agent-per-session in localStorage keyed by
// `corner-context-meter:<agent-slug>`. Reset cleanly by calling
// `resetContextMeter(slug)` (hooks directly to R27b's clear flow once
// it ships; for now R27e can be reset manually by dispatching the event).
//
// Testid contract: [data-testid="context-fullness-meter"] with a
// data-fullness="<0-100>" attribute. The acceptance gate reads this to
// assert monotonic increase on send + reset on clear.
//
// Bumping the counter:
//   import { bumpContextMeter } from '.../ContextFullnessMeter.jsx'
//   bumpContextMeter(agentSlug)  -- call on each user send
// Resetting:
//   import { resetContextMeter } from '.../ContextFullnessMeter.jsx'
//   resetContextMeter(agentSlug) -- call when the R27b clear fires

import { useEffect, useState } from 'react'

const CEILING = 80
const STORAGE_PREFIX = 'corner-context-meter:'
const EVENT_BUMP = 'corner:turn-incremented'
const EVENT_RESET = 'corner:turn-reset'
const EVENT_SESSION_CLEAR = 'corner:session-cleared'

function storageKey(slug) {
  return `${STORAGE_PREFIX}${slug || 'unknown'}`
}

function readCount(slug) {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(storageKey(slug))
    const n = parseInt(raw || '0', 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch (_) {
    return 0
  }
}

function writeCount(slug, value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(slug), String(Math.max(0, value)))
  } catch (_) { /* quota or storage disabled */ }
}

export function bumpContextMeter(agentSlug) {
  if (!agentSlug) return
  const next = readCount(agentSlug) + 1
  writeCount(agentSlug, next)
  try {
    window.dispatchEvent(new CustomEvent(EVENT_BUMP, { detail: { agentSlug, value: next } }))
  } catch (_) {}
}

export function resetContextMeter(agentSlug) {
  if (!agentSlug) return
  writeCount(agentSlug, 0)
  try {
    window.dispatchEvent(new CustomEvent(EVENT_RESET, { detail: { agentSlug } }))
  } catch (_) {}
}

function colorFor(pct) {
  if (pct >= 80) return '#EF4444' // red
  if (pct >= 50) return '#EAB308' // yellow
  return '#10B981'                 // green
}

export default function ContextFullnessMeter({ agentSlug }) {
  const [turns, setTurns] = useState(() => readCount(agentSlug))
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    setTurns(readCount(agentSlug))
    const refresh = (e) => {
      const detailSlug = e?.detail?.agentSlug
      if (!detailSlug || detailSlug === agentSlug) {
        setTurns(readCount(agentSlug))
      }
    }
    window.addEventListener(EVENT_BUMP, refresh)
    window.addEventListener(EVENT_RESET, refresh)
    window.addEventListener(EVENT_SESSION_CLEAR, refresh)
    return () => {
      window.removeEventListener(EVENT_BUMP, refresh)
      window.removeEventListener(EVENT_RESET, refresh)
      window.removeEventListener(EVENT_SESSION_CLEAR, refresh)
    }
  }, [agentSlug])

  const pct = Math.min(100, Math.round((turns / CEILING) * 100))
  const fill = colorFor(pct)
  const widthRest = 80
  const widthHover = 150

  return (
    <div
      data-testid="context-fullness-meter"
      data-fullness={pct}
      data-turns={turns}
      data-agent={agentSlug || ''}
      title={`Context ${pct}% (${turns}/${CEILING} turns). Consider clearing at 80%.`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        width: hovered ? widthHover : widthRest,
        padding: '0 8px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 180ms ease, background 180ms ease',
        cursor: 'help',
        fontFamily: "'Inter', system-ui, sans-serif",
        userSelect: 'none',
      }}
    >
      <div style={{
        flex: 1,
        height: 4,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: fill,
          transition: 'width 260ms ease',
        }} />
      </div>
      {hovered && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: fill,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>{pct}%</span>
      )}
    </div>
  )
}
