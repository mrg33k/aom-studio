// WorldSelector.jsx -- World Switcher Dropdown (cv3.html design)
//
// Props:
//   currentWorldId  string  -- active world slug (from getClientId())
//   currentUser     object  -- Supabase auth user
//   onEnterWorld    fn(w)   -- called with world object { world: slug, name, id, color }
//   onReturnToMyWorld fn()  -- called when user clicks "Return to My World"
//   isNightMode     bool    (unused, kept for API compat)
//   isMobile        bool    (unused, kept for API compat)
//
// Data shape emitted to onEnterWorld: { id, world (slug), name, color }

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

// Color palette matching cv3.html / CornerV3.jsx
const C = {
  s1:       '#111827',
  s2:       '#1A2035',
  border:   'rgba(255,255,255,0.04)',
  border2:  'rgba(255,255,255,0.08)',
  text2:    '#94A3B8',
  muted:    '#475569',
  dim:      '#334155',
  accent:   '#10B981',
  accentBg: 'rgba(16,185,129,0.08)',
  blue:     '#60A5FA',
  orange:   '#FB923C',
  red:      '#EF4444',
  purple:   '#A78BFA',
  pink:     '#F472B6',
  yellow:   '#EAB308',
  teal:     '#2DD4BF',
}

// Preset gradients for world option icons (cycles by index)
const ICON_GRADIENTS = [
  `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
  `linear-gradient(135deg, ${C.orange}, ${C.red})`,
  `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
  `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
  `linear-gradient(135deg, ${C.yellow}, ${C.orange})`,
]

const DEFAULT_WORLD_COLOR = '#3B9EFF'

export default function WorldSelector({
  currentWorldId,
  currentUser,
  onEnterWorld,
  onReturnToMyWorld,
  isNightMode = false,
  isMobile = false,
}) {
  const [open, setOpen] = useState(false)
  const [worlds, setWorlds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [focusIdx, setFocusIdx] = useState(-1)
  const [hoveredItem, setHoveredItem] = useState(null)

  const btnRef = useRef(null)
  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)

  // Fetch worlds from /api/worlds?user_id=...
  const fetchWorlds = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/worlds?user_id=${encodeURIComponent(currentUser.id)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const raw = data.worlds || []
      const normalized = raw.map(w => ({
        id: w.id,
        world: w.slug,
        name: w.name || w.slug?.toUpperCase() || 'World',
        color: w.config?.color || DEFAULT_WORLD_COLOR,
        role: w.role || 'member',
        status: w.status || 'active',
      }))
      setWorlds(normalized)
    } catch (err) {
      setError('Could not load worlds')
      console.error('[WorldSelector] fetch failed:', err)
    }
    setLoading(false)
  }, [currentUser?.id])

  // Fetch on open (lazy load)
  useEffect(() => {
    if (open && worlds.length === 0 && !loading) {
      fetchWorlds()
    }
  }, [open, worlds.length, loading, fetchWorlds])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setOpen(false)
        setFocusIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // iOS back gesture support
  useEffect(() => {
    if (!open) return
    window.history.pushState({ worldSelector: true }, '')
    const handlePopState = () => { setOpen(false); setFocusIdx(-1) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [open])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    setFocusIdx(-1)
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const dropW = 220
      const left = Math.min(rect.left, Math.max(0, window.innerWidth - dropW - 8))
      setDropdownPos({ top: rect.bottom + 4, left })
    }
  }

  const handleSelect = (w) => {
    onEnterWorld?.(w)
    setOpen(false)
    setFocusIdx(-1)
  }

  const myWorld = currentUser?.user_metadata?.world || 'aom'
  const isOverriding = currentWorldId && currentWorldId !== myWorld
  const activeWorld = worlds.find(w => w.world === currentWorldId)
  const activeLabel = activeWorld?.name
    || (currentWorldId === 'q' ? 'QA' : (currentWorldId || 'AOM').toUpperCase())
  const activeInitial = activeLabel[0]?.toUpperCase() || 'A'

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger -- .world-switch */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px 4px 6px',
          background: open ? C.s2 : C.s1,
          border: `1px solid ${open ? C.border2 : C.border}`,
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = C.s2
            e.currentTarget.style.borderColor = C.border2
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = C.s1
            e.currentTarget.style.borderColor = C.border
          }
        }}
        aria-label="Switch world"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* ws-icon */}
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0,
          fontFamily: "'Inter', sans-serif",
        }}>
          {activeInitial}
        </div>
        {/* ws-name */}
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.text2,
          fontFamily: "'Inter', sans-serif",
        }}>
          {activeLabel}
        </span>
        {isOverriding && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: C.yellow,
            background: 'rgba(234,179,8,0.14)',
            border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 3,
            padding: '1px 4px',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>VIEW</span>
        )}
        {/* ws-arrow */}
        <span style={{
          fontSize: 10,
          color: C.dim,
          marginLeft: 2,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 200ms ease',
          lineHeight: 1,
        }}>
          ▾
        </span>
      </button>

      {/* Dropdown -- rendered via portal to escape overflow:hidden */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              role="listbox"
              aria-label="Select world"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              onKeyDown={(e) => {
                const items = dropdownRef.current?.querySelectorAll('[data-world-item]')
                if (!items) return
                if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setFocusIdx(-1) }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  const next = Math.min(focusIdx + 1, items.length - 1)
                  setFocusIdx(next); items[next]?.focus()
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  const prev = Math.max(focusIdx - 1, 0)
                  setFocusIdx(prev); items[prev]?.focus()
                }
              }}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                background: C.s1,
                border: `1px solid ${C.border2}`,
                borderRadius: 12,
                padding: 4,
                minWidth: 200,
                zIndex: 9999,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                outline: 'none',
              }}
            >
              {/* Return to my world (only when viewing another world) */}
              {isOverriding && (
                <button
                  data-world-item
                  onClick={() => { onReturnToMyWorld?.(); setOpen(false) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    background: hoveredItem === '__return' ? C.s2 : 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    marginBottom: 4,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={() => setHoveredItem('__return')}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.yellow,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    Return to {myWorld.toUpperCase()}
                  </span>
                </button>
              )}

              {/* World list */}
              <div style={{ maxHeight: 280, overflowY: 'auto' }} role="presentation">
                {loading && (
                  <div style={{
                    padding: '10px 10px',
                    fontSize: 13,
                    color: C.muted,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <style>{`@keyframes ws-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'ws-spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Loading...
                  </div>
                )}

                {!loading && error && (
                  <div style={{ padding: '10px 10px', fontSize: 13, color: C.red, fontFamily: "'Inter', sans-serif" }}>
                    {error}
                  </div>
                )}

                {!loading && !error && worlds.length === 0 && (
                  <div style={{ padding: '10px 10px', fontSize: 13, color: C.muted, fontFamily: "'Inter', sans-serif" }}>
                    No worlds found
                  </div>
                )}

                {!loading && !error && worlds.map((w, idx) => {
                  const isCurrent = w.world === currentWorldId
                  const isHovered = hoveredItem === w.id
                  const iconGradient = ICON_GRADIENTS[idx % ICON_GRADIENTS.length]
                  const initial = (w.name || w.world)[0]?.toUpperCase() || 'W'
                  return (
                    <div
                      key={w.id}
                      data-world-item
                      role="option"
                      aria-selected={isCurrent}
                      tabIndex={0}
                      onClick={() => handleSelect(w)}
                      onMouseEnter={() => setHoveredItem(w.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(w) } }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: isCurrent ? C.accentBg : isHovered ? C.s2 : 'transparent',
                      }}
                    >
                      {/* .ws-opt-icon */}
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: iconGradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#fff',
                        flexShrink: 0,
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {initial}
                      </div>
                      {/* .ws-opt-name + .ws-opt-type */}
                      <div>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isCurrent ? C.accent : C.text2,
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 140,
                        }}>
                          {w.name}
                        </div>
                        <div style={{
                          fontSize: 10,
                          color: C.muted,
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          {w.world}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
