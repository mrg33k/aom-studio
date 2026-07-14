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
import { isSuperAdmin, isAdminOverride } from '../lib/clientConfig'
import { authFetch } from '../lib/authFetch'

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
  // Create world modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState(null)
  const [createError, setCreateError] = useState(null)

  const btnRef = useRef(null)
  const wrapperRef = useRef(null)
  const dropdownRef = useRef(null)

  // Fetch worlds for the authenticated session.
  const fetchWorlds = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    setError(null)
    try {
      const r = await authFetch('/api/worlds')
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

  // Fetch on mount to know world count before user clicks (enables canOpenPicker)
  useEffect(() => {
    if (currentUser?.id) fetchWorlds()
  }, [currentUser?.id, fetchWorlds])

  // Fetch on open (lazy load — no-op if mount fetch already ran)
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
    if (!canOpenPicker) return
    // Admin viewing another world: clicking opens dropdown with just "Return" option
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
  const isAdmin = isSuperAdmin(currentUser?.id)
  const viewingOtherWorld = isAdmin && isAdminOverride()
  const canOpenPicker = isAdmin || worlds.length > 1
  const activeWorld = worlds.find(w => w.world === currentWorldId)
  const activeLabel = activeWorld?.name
    || (currentWorldId === 'q' ? 'QA' : (currentWorldId || 'AOM').toUpperCase())
  const activeInitial = activeLabel[0]?.toUpperCase() || 'A'

  // Any user with >1 world can open the picker and see the world list
  // Create World stays admin-only
  const showWorldList = canOpenPicker && !isOverriding
  const showCreateWorld = isAdmin && !viewingOtherWorld

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
          cursor: canOpenPicker ? 'pointer' : 'default',
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
        {/* ws-arrow (only when picker can open) */}
        {canOpenPicker && (
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
        )}
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

              {/* World list (any multi-world user when not overriding) */}
              {showWorldList && <div style={{ maxHeight: 280, overflowY: 'auto' }} role="presentation">
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
              </div>}

              {/* Create World button (admin only) */}
              {showCreateWorld && (
                <button
                  onClick={() => { setOpen(false); setCreateOpen(true); setCreateName(''); setCreateEmail(''); setCreateResult(null); setCreateError(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '10px 10px',
                    borderTop: `1px solid ${C.border}`,
                    background: 'transparent', border: 'none', borderRadius: 0,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: C.accent, fontFamily: "'Inter', sans-serif",
                    textAlign: 'left', transition: 'background 0.15s',
                    marginTop: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create World
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Create World Modal */}
      {createOpen && createPortal(
        <div
          onClick={() => { if (!creating) setCreateOpen(false) }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 380, maxWidth: '90vw', background: C.s1,
            border: `1px solid ${C.border2}`, borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            padding: 24,
          }}>
            {!createResult ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
                  Create a new world
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
                  They'll get an EA agent ready to onboard them.
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>Name</div>
                  <input
                    autoFocus
                    value={createName}
                    onChange={e => { setCreateName(e.target.value); setCreateError(null) }}
                    placeholder="Their name or company"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#F1F5F9',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border2}`,
                      borderRadius: 8, outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>Email</div>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={e => { setCreateEmail(e.target.value); setCreateError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter' && createName.trim() && createEmail.trim() && !creating) handleCreate() }}
                    placeholder="their@email.com"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#F1F5F9',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border2}`,
                      borderRadius: 8, outline: 'none',
                    }}
                  />
                </div>

                {createError && (
                  <div style={{ fontSize: 12, color: '#F87171', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
                    {createError}
                  </div>
                )}

                <button
                  disabled={creating || !createName.trim() || !createEmail.trim()}
                  onClick={async () => {
                    setCreating(true)
                    setCreateError(null)
                    try {
                      const r = await authFetch('/api/dashboard/create-world', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: createName.trim(), email: createEmail.trim() }),
                      })
                      const data = await r.json()
                      if (data.ok) {
                        setCreateResult(data)
                      } else {
                        setCreateError(data.error || 'Failed to create world')
                      }
                    } catch (err) {
                      setCreateError(err.message)
                    }
                    setCreating(false)
                  }}
                  style={{
                    width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                    fontFamily: "'Inter', sans-serif", color: '#fff',
                    background: creating || !createName.trim() || !createEmail.trim()
                      ? C.muted : 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none', borderRadius: 10, cursor: creating ? 'default' : 'pointer',
                    boxShadow: creating ? 'none' : '0 4px 16px rgba(16,185,129,0.2)',
                    transition: 'all 0.2s',
                  }}
                >
                  {creating ? 'Creating...' : 'Create World'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.accent, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
                  World created
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border2}`,
                  borderRadius: 10, padding: 16, marginBottom: 16,
                  fontFamily: "'SF Mono', 'JetBrains Mono', monospace", fontSize: 12.5,
                  color: '#CBD5E1', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {createResult.invite_text}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(createResult.invite_text)
                    }}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif", color: '#fff',
                      background: C.accent, border: 'none', borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Copy invite
                  </button>
                  <button
                    onClick={() => { setCreateOpen(false); setCreateResult(null); fetchWorlds() }}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif", color: C.text2,
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border2}`,
                      borderRadius: 8, cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
