import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ALL_ROOMS } from './gridSpec.js'
import { supabase } from './lib/supabase.js'
import { getClientId } from './lib/clientConfig.js'
import {
  Wrench, BarChart3, Palette, Terminal, Megaphone, Video, Mail, Share2,
  Shield, Eye, Cpu, Bot, Crown, Camera, Heart, Lightbulb, FolderKanban,
} from 'lucide-react'

// ---- ICON MAP ----
const AGENT_ICONS = {
  bobby: Wrench,
  steve: BarChart3,
  steffen: Palette,
  elon: Terminal,
  gary: Megaphone,
  cleo: Video,
  jacob: Mail,
  tony: Share2,
  patrik: Crown,
  mom: Eye,
  alex: Lightbulb,
  colton: Cpu,
  elmo: Shield,
  paige: Heart,
  pixel: Bot,
  mark: Camera,
}

const PROJECT_ICON = FolderKanban

// ---- HEX GEOMETRY (pointy-top) ----
const HEX_W = 130
const HEX_H = HEX_W * (2 / Math.sqrt(3))
const HEX_ROW_H = HEX_H * 0.75
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

// Row sizes: compute from room count when rooms are dynamic.
// Default matches gridSpec ALL_ROOMS order: [4, 4, 5, 4, 1]
const DEFAULT_ROW_SIZES = [4, 4, 5, 4, 1]

function computeRowSizes(count) {
  if (count <= 0) return [1]
  // For small counts (e.g. Q with 1-2 agents), single rows of up to 5
  const rows = []
  let remaining = count
  while (remaining > 0) {
    const rowSize = Math.min(remaining, remaining <= 9 ? 4 : 5)
    rows.push(rowSize)
    remaining -= rowSize
  }
  return rows
}

function getGridPos(index, rowSizes) {
  let consumed = 0
  for (let r = 0; r < rowSizes.length; r++) {
    if (index < consumed + rowSizes[r]) {
      return { row: r, col: index - consumed }
    }
    consumed += rowSizes[r]
  }
  return { row: rowSizes.length, col: index - consumed }
}

const GRID_COLS = 8
const GRID_ROWS = 6
const LEFT_MARGIN = HEX_W * 0.5

function gridToPixel(row, col) {
  const oddOffset = row % 2 !== 0 ? HEX_W * 0.5 : 0
  return {
    x: LEFT_MARGIN + col * HEX_W + oddOffset,
    y: row * HEX_ROW_H,
  }
}

function getStatusBorder(status) {
  switch (status) {
    case 'working': case 'active':
      return { bc: 'rgba(37,99,235,0.9)', bs: '0 0 20px rgba(37,99,235,0.4), inset 0 0 20px rgba(37,99,235,0.1)' }
    case 'blocked':
      return { bc: 'rgba(245,158,11,0.8)', bs: '0 0 16px rgba(245,158,11,0.3)' }
    default:
      return { bc: 'rgba(59,130,246,0.2)', bs: 'none' }
  }
}

// ---- COMPONENT ----
const HexGrid = forwardRef(function HexGrid({
  agentStatus = {},
  onRoomClick,
  selectedRoom,
  hoveredRoom: extHover,
  setHoveredRoom: setExtHover,
  isNightMode = true,
  isMobile = false,
  onOpenChat,
  onSendMessage,
  onViewTasks,
  onSetAsHome,
  unreadAgents = {},
  rooms: roomsProp,
  // These props exist on CanvasOffice but aren't needed for CSS grid:
  drawerSnap,
  mobileHudHeight,
  initialFocusRoom = null,
}, ref) {
  // Use prop rooms if provided, otherwise fall back to gridSpec ALL_ROOMS (AOM default)
  const rooms = roomsProp && roomsProp.length > 0 ? roomsProp : ALL_ROOMS
  const rowSizes = rooms === ALL_ROOMS ? DEFAULT_ROW_SIZES : computeRowSizes(rooms.filter(r => !r.hidden).length)

  const containerRef = useRef(null)
  const gridRef = useRef(null) // inner grid div for accurate position calculations
  const [slotOrder, setSlotOrder] = useState(() => rooms.filter(r => !r.hidden).map(r => r.slug))
  const [dragSlug, setDragSlug] = useState(null)
  const [dragGridPos, setDragGridPos] = useState(null) // {row, col} -- snapped grid position while dragging
  const [contextMenu, setContextMenu] = useState(null)
  const [toast, setToast] = useState(null)
  const [hiddenRooms, setHiddenRooms] = useState(new Set())
  // roomPositions: slug -> {row, col} -- persisted to Supabase user_preferences
  const [roomGridPositions, setRoomGridPositions] = useState(() => {
    const positions = {}
    const slugs = rooms.filter(r => !r.hidden).map(r => r.slug)
    slugs.forEach((slug, i) => {
      const { row, col } = getGridPos(i, rowSizes)
      positions[slug] = { row, col }
    })
    return positions
  })
  const positionsLoadedRef = useRef(false)

  // Load positions from Vercel API on mount (bypasses RLS)
  useEffect(() => {
    if (positionsLoadedRef.current) return
    positionsLoadedRef.current = true
    const clientId = getClientId()
    fetch(`/api/dashboard/preferences?key=hex_positions&client=${encodeURIComponent(clientId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && typeof data.value === 'object' && Object.keys(data.value).length > 0) {
          setRoomGridPositions(data.value)
        }
      })
      .catch(() => {})
  }, [])

  // Save positions via Vercel API whenever they change (debounced)
  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'hex_positions', client_id: getClientId(), value: roomGridPositions }),
      }).catch(() => {})
    }, 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [roomGridPositions])
  const [focusedRoom, setFocusedRoom] = useState(initialFocusRoom || null)
  const swapTimerRef = useRef(null) // timer for 3s hold-to-swap
  const swapTargetRef = useRef(null) // slug being hovered for swap
  const [swapProgress, setSwapProgress] = useState(null) // { slug, startTime } for visual indicator
  const didDragRef = useRef(false)

  // Sync slotOrder + positions when rooms prop changes (e.g. world switch)
  const roomsSigRef = useRef(rooms.map(r => r.slug).join(','))
  useEffect(() => {
    const sig = rooms.map(r => r.slug).join(',')
    if (sig !== roomsSigRef.current) {
      roomsSigRef.current = sig
      const slugs = rooms.filter(r => !r.hidden).map(r => r.slug)
      setSlotOrder(slugs)
      const newRowSizes = rooms === ALL_ROOMS ? DEFAULT_ROW_SIZES : computeRowSizes(slugs.length)
      const positions = {}
      slugs.forEach((slug, i) => {
        const { row, col } = getGridPos(i, newRowSizes)
        positions[slug] = { row, col }
      })
      setRoomGridPositions(positions)
    }
  }, [rooms])

  const metaRef = useRef({})
  useEffect(() => {
    const m = {}
    for (const r of rooms) m[r.slug] = r
    metaRef.current = m
  }, [rooms])

  useImperativeHandle(ref, () => ({
    triggerCelebration: () => {},
    focusRoom: (roomId) => setFocusedRoom(roomId && slotOrder.includes(roomId) ? roomId : null),
    resetLayout: () => {
      const slugs = rooms.filter(r => !r.hidden).map(r => r.slug)
      setSlotOrder(slugs)
      setHiddenRooms(new Set())
      const positions = {}
      slugs.forEach((slug, i) => {
        const { row, col } = getGridPos(i, rowSizes)
        positions[slug] = { row, col }
      })
      setRoomGridPositions(positions)
    },
    addRoom: ({ slug, name, color, type = 'agent' }) => {
      if (!slug) return
      metaRef.current[slug] = { slug, name, color, type, hidden: false }
      setSlotOrder(prev => prev.includes(slug) ? prev : [...prev, slug])
    },
  }), [slotOrder])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  // ---- Position map: slug -> pixel {x, y} from grid positions ----
  const visible = slotOrder.filter(s => !hiddenRooms.has(s))
  const occupiedSlots = {} // "row,col" -> slug
  const posMap = {}
  visible.forEach((slug) => {
    const gp = roomGridPositions[slug]
    if (!gp) return
    posMap[slug] = gridToPixel(gp.row, gp.col)
    occupiedSlots[`${gp.row},${gp.col}`] = slug
  })

  const gridW = LEFT_MARGIN + GRID_COLS * HEX_W + HEX_W
  const gridH = GRID_ROWS * HEX_ROW_H + HEX_H * 0.25 + 40

  // Find nearest grid slot to a pixel position
  const pixelToNearestSlot = useCallback((px, py) => {
    let bestRow = 0, bestCol = 0, bestDist = Infinity
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const { x, y } = gridToPixel(r, c)
        const d = Math.hypot(px - x - HEX_W / 2, py - y - HEX_H / 2)
        if (d < bestDist) { bestDist = d; bestRow = r; bestCol = c }
      }
    }
    return { row: bestRow, col: bestCol }
  }, [])

  // ---- DRAG: snap-to-grid, 3s hold for swap ----
  const onDown = useCallback((e, slug) => {
    if (e.button === 2) return
    didDragRef.current = false
    setDragSlug(slug)
    setDragGridPos(roomGridPositions[slug] || null)
  }, [roomGridPositions])

  const clearSwapTimer = useCallback(() => {
    if (swapTimerRef.current) { clearTimeout(swapTimerRef.current); swapTimerRef.current = null }
    swapTargetRef.current = null
    setSwapProgress(null)
  }, [])

  useEffect(() => {
    if (!dragSlug) return
    const onMove = (e) => {
      const rect = (gridRef.current || containerRef.current)?.getBoundingClientRect()
      if (!rect) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      didDragRef.current = true

      // Find nearest grid slot to cursor (relative to inner grid, not outer container)
      const px = cx - rect.left
      const py = cy - rect.top
      const nearest = pixelToNearestSlot(px, py)
      const slotKey = `${nearest.row},${nearest.col}`
      const occupant = occupiedSlots[slotKey]

      if (!occupant || occupant === dragSlug) {
        // Empty slot or own slot: snap here immediately
        setDragGridPos(nearest)
        clearSwapTimer()
      } else {
        // Occupied slot: start 3s swap timer if not already timing this target
        setDragGridPos(nearest) // visually show we're hovering this slot
        if (swapTargetRef.current !== occupant) {
          clearSwapTimer()
          swapTargetRef.current = occupant
          setSwapProgress({ slug: occupant, startTime: Date.now() })
          swapTimerRef.current = setTimeout(() => {
            // 3s hold complete: swap positions
            setRoomGridPositions(prev => {
              const dragGP = prev[dragSlug]
              const targetGP = prev[occupant]
              if (!dragGP || !targetGP) return prev
              return { ...prev, [dragSlug]: targetGP, [occupant]: dragGP }
            })
            setDragSlug(null)
            setDragGridPos(null)
            clearSwapTimer()
            showToast('Swapped')
          }, 3000)
        }
      }
    }
    const onUp = () => {
      if (didDragRef.current && dragGridPos) {
        const slotKey = `${dragGridPos.row},${dragGridPos.col}`
        const occupant = occupiedSlots[slotKey]
        if (!occupant || occupant === dragSlug) {
          // Drop on empty slot: move here
          setRoomGridPositions(prev => ({ ...prev, [dragSlug]: { row: dragGridPos.row, col: dragGridPos.col } }))
        }
        // If occupied and timer hasn't fired, just return to original position (do nothing)
      }
      setDragSlug(null)
      setDragGridPos(null)
      clearSwapTimer()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragSlug, dragGridPos, occupiedSlots, pixelToNearestSlot, clearSwapTimer, showToast])

  const handleClick = useCallback((slug) => {
    if (didDragRef.current) return
    if (focusedRoom === slug) {
      onOpenChat?.(slug)
    } else {
      setFocusedRoom(slug)
      onRoomClick?.(slug)
    }
  }, [focusedRoom, onRoomClick, onOpenChat])

  const onCtx = useCallback((e, slug) => {
    e.preventDefault()
    const m = metaRef.current[slug] || {}
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: slug, roomName: m.name || slug })
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setFocusedRoom(null); setContextMenu(null) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const bg = isNightMode ? 'rgba(8,15,35,0.95)' : 'rgba(30,60,140,0.8)'

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        background: bg, userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTouchCallout: 'none', zIndex: 1,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) { setFocusedRoom(null); setContextMenu(null) } }}
    >
      <div ref={gridRef} style={{ position: 'relative', width: gridW, height: gridH }}>
        {/* SVG subtle hex outlines */}
        <svg style={{ position: 'absolute', inset: 0, width: gridW, height: gridH, pointerEvents: 'none', zIndex: 0 }}>
          {Array.from({ length: GRID_ROWS }, (_, row) =>
            Array.from({ length: GRID_COLS }, (_, col) => {
              const { x, y } = gridToPixel(row, col)
              const cx = x + HEX_W / 2, cy = y + HEX_H / 2, r = HEX_W / 2 - 2
              const pts = Array.from({ length: 6 }, (_, i) => {
                const a = (Math.PI / 180) * (60 * i - 30)
                return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
              }).join(' ')
              return <polygon key={`bg-${row}-${col}`} points={pts} fill="none" stroke="rgba(59,130,246,0.18)" strokeWidth="1" />
            })
          )}
        </svg>

        {/* Hex tiles */}
        {visible.map((slug) => {
          const meta = metaRef.current[slug] || rooms.find(r => r.slug === slug) || {}
          const p = posMap[slug]
          if (!p) return null
          const isDrag = dragSlug === slug
          const st = agentStatus[slug]?.status || 'idle'
          const sb = getStatusBorder(st)
          const isSel = selectedRoom === slug
          const isHov = extHover === slug
          const isFoc = focusedRoom === slug
          const hasUn = unreadAgents[slug] > 0
          const Icon = AGENT_ICONS[slug] || PROJECT_ICON
          const isSwapTarget = swapProgress?.slug === slug
          // When dragging: snap to grid pos. Otherwise: use assigned grid position.
          const displayPos = isDrag && dragGridPos ? gridToPixel(dragGridPos.row, dragGridPos.col) : p
          const x = displayPos.x
          const y = displayPos.y

          return (
            <div
              key={slug}
              style={{
                position: 'absolute', left: x, top: y, width: HEX_W, height: HEX_H,
                clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP,
                background: isSel || isFoc ? 'rgba(37,99,235,0.25)' : isHov ? 'rgba(30,60,120,0.95)' : 'rgba(30,60,120,0.85)',
                cursor: isDrag ? 'grabbing' : 'pointer',
                transition: isDrag ? 'none' : 'left 0.2s ease, top 0.2s ease, background 0.15s ease',
                zIndex: isDrag ? 50 : (isSel || isFoc ? 10 : 1),
                filter: isDrag ? 'brightness(1.1)' : 'none',
              }}
              onMouseDown={(e) => onDown(e, slug)}
              onTouchStart={(e) => onDown(e, slug)}
              onClick={() => handleClick(slug)}
              onContextMenu={(e) => onCtx(e, slug)}
              onMouseEnter={() => setExtHover?.(slug)}
              onMouseLeave={() => setExtHover?.(null)}
            >
              {/* Border overlay */}
              <div style={{ position: 'absolute', inset: 0, clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP, border: `1.5px solid ${sb.bc}`, boxShadow: sb.bs, pointerEvents: 'none' }} />
              {/* Glass gradient */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)', pointerEvents: 'none' }} />

              {/* Content */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 8px' }}>
                <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: '#EDF2FA', fontFamily: "'Inter',system-ui,sans-serif", textAlign: 'center', lineHeight: 1.2, maxWidth: HEX_W - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  {meta.name || slug}
                </div>
                <Icon size={isMobile ? 18 : 20} strokeWidth={1.8} style={{ color: meta.color || 'rgba(96,165,250,0.6)', opacity: st === 'working' || st === 'active' ? 1 : 0.6, flexShrink: 0, transition: 'opacity 200ms ease' }} />
                <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(200,214,229,0.45)', fontFamily: "'Inter',system-ui,sans-serif", textAlign: 'center', maxWidth: HEX_W - 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.role || meta.type || ''}
                </div>
              </div>

              {/* Unread badge */}
              {hasUn && (
                <div style={{ position: 'absolute', top: '18%', right: '18%', width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',system-ui,sans-serif", border: '2px solid rgba(30,60,120,0.85)', zIndex: 5 }}>
                  {unreadAgents[slug] > 9 ? '9+' : unreadAgents[slug]}
                </div>
              )}

              {/* Swap progress indicator (3s hold) */}
              {isSwapTarget && (
                <div style={{
                  position: 'absolute', inset: 0, clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP,
                  background: 'rgba(245,158,11,0.15)',
                  border: '2px solid rgba(245,158,11,0.6)',
                  pointerEvents: 'none', zIndex: 7,
                  animation: 'hexSwapFill 3s linear forwards',
                }} />
              )}

              {/* Focus ring */}
              {(isSel || isFoc) && <div style={{ position: 'absolute', inset: -2, clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP, border: '2px solid rgba(37,99,235,0.6)', pointerEvents: 'none', zIndex: 6 }} />}
            </div>
          )
        })}

        {/* Context menu -- fixed position for accurate placement regardless of container centering */}
        {contextMenu && (
          <div
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 1000, minWidth: 180, background: 'rgba(12,16,30,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, padding: '6px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: "'Inter',system-ui,sans-serif" }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '6px 14px 8px', fontSize: 11, fontWeight: 700, color: 'rgba(96,165,250,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid rgba(96,165,250,0.12)', marginBottom: 4 }}>
              {contextMenu.roomName}
            </div>
            <CtxItem label="Open Chat" icon="\u{1F4AC}" accent onClick={() => { onOpenChat?.(contextMenu.roomId); setContextMenu(null) }} />
            <CtxItem label="Send Message" icon="\u2197" onClick={() => { onSendMessage?.(contextMenu.roomId); setContextMenu(null) }} />
            <CtxItem label="View Tasks" icon="\u2713" onClick={() => { onViewTasks?.(contextMenu.roomId); setContextMenu(null) }} />
            <CtxItem label="Set as Home" icon="\u2302" onClick={() => { onSetAsHome?.(contextMenu.roomId); showToast(`${contextMenu.roomName} set as home`); setContextMenu(null) }} />
            <div style={{ height: 1, background: 'rgba(96,165,250,0.12)', margin: '4px 0' }} />
            <CtxItem label="Hide Room" icon="\u2715" onClick={() => { setHiddenRooms(prev => new Set([...prev, contextMenu.roomId])); setSlotOrder(prev => prev.filter(s => s !== contextMenu.roomId)); setContextMenu(null); showToast('Room hidden') }} />
            {hiddenRooms.size > 0 && (
              <CtxItem label={`Show Hidden (${hiddenRooms.size})`} icon="\u25CE" onClick={() => { setHiddenRooms(new Set()); setSlotOrder(rooms.filter(r => !r.hidden).map(r => r.slug)); setContextMenu(null); showToast('All rooms restored') }} />
            )}
            <CtxItem label="Reset Room Order" icon="\u2316" onClick={() => {
              const slugs = rooms.filter(r => !r.hidden).map(r => r.slug)
              setSlotOrder(slugs)
              setHiddenRooms(new Set())
              const positions = {}
              slugs.forEach((s, i) => { const g = getGridPos(i, rowSizes); positions[s] = { row: g.row, col: g.col } })
              setRoomGridPositions(positions)
              setContextMenu(null)
              showToast('Layout reset')
            }} />
          </div>
        )}
      </div>

      {/* Swap animation keyframe */}
      <style>{`@keyframes hexSwapFill { 0% { opacity: 0.2; } 100% { opacity: 0.8; } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(12,16,30,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, padding: '10px 20px', color: '#EDF2FA', fontSize: 13, fontWeight: 500, fontFamily: "'Inter',system-ui,sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  )
})

export default HexGrid

function CtxItem({ label, icon, onClick, accent = false }) {
  const [h, setH] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ padding: '7px 14px', fontSize: 13, fontWeight: accent ? 600 : 500, color: h ? '#60A5FA' : accent ? '#93C5FD' : 'rgba(200,214,229,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: h ? 'rgba(96,165,250,0.08)' : 'transparent', transition: 'background 0.1s, color 0.1s' }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
      {label}
    </div>
  )
}
