// WorldSelector.jsx -- World Selector Step 3: Dropdown UI
//
// Self-contained dropdown that fetches worlds from the Supabase `worlds` table
// (via /api/worlds?user_id=...) and lets the user switch between them.
//
// Props:
//   currentWorldId  string  -- active world slug (from getClientId())
//   currentUser     object  -- Supabase auth user
//   onEnterWorld    fn(w)   -- called with world object { world: slug, name, id, color }
//   onReturnToMyWorld fn()  -- called when user clicks "Return to My World"
//   isNightMode     bool
//   isMobile        bool
//
// Data shape emitted to onEnterWorld: { id, world (slug), name, color }
// This matches the shape the existing handleEnterWorld() expects.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

const SUPER_ADMIN_ID = '833f6828-1dae-409c-a24b-1438f46544d0'

// Default color if config.color is not set
const DEFAULT_WORLD_COLOR = '#3B9EFF'

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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

  const btnRef = useRef(null)
  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)

  // Fetch worlds from /api/worlds?user_id=... (worlds table via RLS / service role)
  const fetchWorlds = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/worlds?user_id=${encodeURIComponent(currentUser.id)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const raw = data.worlds || []
      // Normalize to { id, world (slug), name, color, role }
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

  // iOS back gesture: push history entry when dropdown opens
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
      const dropW = 260
      const left = Math.min(rect.left, Math.max(0, window.innerWidth - dropW - 8))
      setDropdownPos({ top: rect.bottom + 8, left })
    }
  }

  const handleSelect = (w) => {
    onEnterWorld?.(w)
    setOpen(false)
    setFocusIdx(-1)
  }

  const myWorld = currentUser?.user_metadata?.world || 'aom'
  const isOverriding = currentWorldId && currentWorldId !== myWorld

  // Display name for the active world -- try to match from loaded worlds, fallback to slug
  const activeWorld = worlds.find(w => w.world === currentWorldId)
  const activeColor = activeWorld?.color || DEFAULT_WORLD_COLOR
  const activeLabel = activeWorld?.name
    || (currentWorldId === 'q' ? 'QA' : (currentWorldId || 'AOM').toUpperCase())

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: open
            ? hexToRgba(activeColor, 0.15)
            : hexToRgba(activeColor, 0.08),
          border: open
            ? `1.5px solid ${hexToRgba(activeColor, 0.55)}`
            : `1.5px solid ${hexToRgba(activeColor, 0.28)}`,
          borderRadius: 8,
          padding: isMobile ? '4px 8px' : '5px 11px',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = hexToRgba(activeColor, 0.12)
            e.currentTarget.style.borderColor = hexToRgba(activeColor, 0.4)
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = hexToRgba(activeColor, 0.08)
            e.currentTarget.style.borderColor = hexToRgba(activeColor, 0.28)
          }
        }}
        aria-label="Switch world"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Color dot */}
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: activeColor,
          boxShadow: `0 0 5px ${hexToRgba(activeColor, 0.7)}`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: isMobile ? 12 : 13,
          fontWeight: 800,
          color: activeColor,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '0.06em',
        }}>
          {activeLabel}
        </span>
        {isOverriding && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#F59E0B',
            background: 'rgba(245,158,11,0.14)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 3,
            padding: '1px 4px',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>VIEW</span>
        )}
        <svg
          width={10} height={10} viewBox="0 0 24 24" fill="none"
          stroke={activeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
            flexShrink: 0,
            opacity: 0.8,
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown -- rendered via portal to escape overflow:hidden on the top bar */}
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
                minWidth: 220,
                maxWidth: 300,
                width: 260,
                background: 'linear-gradient(135deg, rgba(8,18,44,0.99) 0%, rgba(6,14,36,0.99) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(59,130,246,0.25)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.08)',
                overflow: 'hidden',
                zIndex: 9999,
                outline: 'none',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '10px 14px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontFamily: "'Inter', sans-serif",
                  marginBottom: 4,
                }}>
                  Worlds {loading ? '…' : worlds.length > 0 ? `(${worlds.length})` : ''}
                </div>
                {/* Active world indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: activeColor,
                    boxShadow: `0 0 6px ${hexToRgba(activeColor, 0.7)}`,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: activeColor,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '0.06em',
                  }}>
                    {activeLabel}
                  </span>
                  {isOverriding && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#F59E0B',
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 4,
                      padding: '1px 5px',
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>VIEWING</span>
                  )}
                </div>
                {currentUser?.email && (
                  <div style={{
                    fontSize: 12,
                    color: '#475569',
                    fontFamily: "'Inter', sans-serif",
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {currentUser.email}
                  </div>
                )}
              </div>

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
                    minHeight: 40,
                    padding: '0 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'background 100ms ease',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.07)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#F59E0B',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    Return to {myWorld.toUpperCase()}
                  </span>
                </button>
              )}

              {/* World list */}
              <div style={{ maxHeight: 260, overflowY: 'auto' }} role="presentation">
                {loading && (
                  <div style={{
                    padding: '14px 14px',
                    fontSize: 13,
                    color: '#475569',
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
                    Loading…
                  </div>
                )}

                {!loading && error && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#EF4444', fontFamily: "'Inter', sans-serif" }}>
                    {error}
                  </div>
                )}

                {!loading && !error && worlds.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#475569', fontFamily: "'Inter', sans-serif" }}>
                    No worlds found
                  </div>
                )}

                {!loading && !error && worlds.map((w) => {
                  const isCurrent = w.world === currentWorldId
                  const worldColor = w.color || DEFAULT_WORLD_COLOR
                  return (
                    <button
                      key={w.id}
                      data-world-item
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => handleSelect(w)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        minHeight: 44,
                        padding: '0 14px',
                        background: isCurrent
                          ? hexToRgba(worldColor, 0.1)
                          : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 100ms ease',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={e => {
                        if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = isCurrent
                          ? hexToRgba(worldColor, 0.1)
                          : 'transparent'
                      }}
                    >
                      {/* Color dot / avatar */}
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: isCurrent
                          ? hexToRgba(worldColor, 0.2)
                          : 'rgba(255,255,255,0.06)',
                        border: isCurrent
                          ? `1.5px solid ${hexToRgba(worldColor, 0.4)}`
                          : '1.5px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: 'relative',
                      }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: isCurrent ? worldColor : '#64748B',
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          {(w.name || w.world)[0]?.toUpperCase() || 'W'}
                        </span>
                        {/* Active pulse dot */}
                        {isCurrent && (
                          <span style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: worldColor,
                            boxShadow: `0 0 5px ${hexToRgba(worldColor, 0.8)}`,
                            border: '1.5px solid rgba(6,14,36,0.99)',
                          }} />
                        )}
                      </div>

                      {/* Name + slug */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: isCurrent ? worldColor : '#F1F5F9',
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {w.name}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: '#475569',
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          {w.world}
                          {w.role && w.role !== 'member' && (
                            <span style={{ marginLeft: 5, color: '#334155' }}>{w.role}</span>
                          )}
                        </div>
                      </div>

                      {/* Checkmark if active */}
                      {isCurrent && (
                        <svg
                          width={14} height={14} viewBox="0 0 24 24" fill="none"
                          stroke={worldColor} strokeWidth={2.5}
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
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
