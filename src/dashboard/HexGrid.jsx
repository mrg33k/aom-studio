import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ALL_ROOMS } from './gridSpec.js'
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

// Row sizes matching gridSpec ALL_ROOMS order
const ROW_SIZES = [4, 4, 5, 4, 1]

function getGridPos(index) {
  let consumed = 0
  for (let r = 0; r < ROW_SIZES.length; r++) {
    if (index < consumed + ROW_SIZES[r]) {
      return { row: r, col: index - consumed }
    }
    consumed += ROW_SIZES[r]
  }
  return { row: ROW_SIZES.length, col: index - consumed }
}

function getRowSize(row) {
  return row < ROW_SIZES.length ? ROW_SIZES[row] : 6
}

function gridToPixel(row, col, rowSize, maxCols) {
  const maxRowWidth = maxCols * HEX_W
  const rowWidth = rowSize * HEX_W
  const rowOffset = (maxRowWidth - rowWidth) / 2
  const oddOffset = row % 2 !== 0 ? HEX_W * 0.5 : 0
  return {
    x: rowOffset + col * HEX_W + oddOffset,
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
  // These props exist on CanvasOffice but aren't needed for CSS grid:
  drawerSnap,
  mobileHudHeight,
  initialFocusRoom = null,
}, ref) {
  const containerRef = useRef(null)
  const [slotOrder, setSlotOrder] = useState(() => ALL_ROOMS.filter(r => !r.hidden).map(r => r.slug))
  const [dragSlug, setDragSlug] = useState(null)
  const [dragPos, setDragPos] = useState(null) // { x, y }
  const [contextMenu, setContextMenu] = useState(null)
  const [toast, setToast] = useState(null)
  const [hiddenRooms, setHiddenRooms] = useState(new Set())
  const [focusedRoom, setFocusedRoom] = useState(initialFocusRoom || null)
  const dragStartRef = useRef(null) // { clientX, clientY, offsetX, offsetY }
  const didDragRef = useRef(false)

  const metaRef = useRef({})
  useEffect(() => {
    const m = {}
    for (const r of ALL_ROOMS) m[r.slug] = r
    metaRef.current = m
  }, [])

  useImperativeHandle(ref, () => ({
    triggerCelebration: () => {},
    focusRoom: (roomId) => setFocusedRoom(roomId && slotOrder.includes(roomId) ? roomId : null),
    resetLayout: () => {
      setSlotOrder(ALL_ROOMS.filter(r => !r.hidden).map(r => r.slug))
      setHiddenRooms(new Set())
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

  // ---- Position map ----
  const maxCols = Math.max(...ROW_SIZES)
  const visible = slotOrder.filter(s => !hiddenRooms.has(s))

  const posMap = {}
  visible.forEach((slug, i) => {
    const { row, col } = getGridPos(i)
    posMap[slug] = gridToPixel(row, col, getRowSize(row), maxCols)
  })

  const gridW = maxCols * HEX_W + HEX_W
  const totalRows = visible.length > 0 ? getGridPos(visible.length - 1).row + 2 : 2
  const gridH = totalRows * HEX_ROW_H + HEX_H * 0.25 + 40

  // ---- DRAG ----
  const onDown = useCallback((e, slug) => {
    if (e.button === 2) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    const pos = posMap[slug]
    if (!pos) return
    didDragRef.current = false
    dragStartRef.current = { clientX: cx, clientY: cy, offX: cx - rect.left - pos.x, offY: cy - rect.top - pos.y }
    setDragSlug(slug)
    setDragPos(pos)
  }, [posMap])

  useEffect(() => {
    if (!dragSlug) return
    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !dragStartRef.current) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      const dx = cx - dragStartRef.current.clientX
      const dy = cy - dragStartRef.current.clientY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDragRef.current = true
      setDragPos({
        x: cx - rect.left - dragStartRef.current.offX,
        y: cy - rect.top - dragStartRef.current.offY,
      })
    }
    const onUp = () => {
      if (didDragRef.current && dragPos) {
        let bestSlug = null, bestDist = Infinity
        for (const [s, p] of Object.entries(posMap)) {
          if (s === dragSlug) continue
          const d = Math.hypot(dragPos.x - p.x, dragPos.y - p.y)
          if (d < bestDist && d < HEX_W * 0.8) { bestDist = d; bestSlug = s }
        }
        if (bestSlug) {
          setSlotOrder(prev => {
            const next = [...prev]
            const a = next.indexOf(dragSlug)
            const b = next.indexOf(bestSlug)
            if (a >= 0 && b >= 0) { next[a] = bestSlug; next[b] = dragSlug }
            return next
          })
        }
      }
      setDragSlug(null)
      setDragPos(null)
      dragStartRef.current = null
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
  }, [dragSlug, dragPos, posMap])

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
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const m = metaRef.current[slug] || {}
    setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, roomId: slug, roomName: m.name || slug })
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
        width: '100%', height: '100%', position: 'relative', overflow: 'auto',
        background: bg, userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: isMobile ? 'manipulation' : 'pan-x pan-y',
        WebkitTouchCallout: 'none', zIndex: 1,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) { setFocusedRoom(null); setContextMenu(null) } }}
    >
      <div style={{ position: 'relative', width: gridW, height: gridH, margin: '40px auto', minHeight: '100%' }}>
        {/* SVG subtle hex outlines */}
        <svg style={{ position: 'absolute', inset: 0, width: gridW, height: gridH, pointerEvents: 'none', zIndex: 0 }}>
          {visible.map((slug) => {
            const p = posMap[slug]
            if (!p) return null
            const cx = p.x + HEX_W / 2, cy = p.y + HEX_H / 2, r = HEX_W / 2 - 2
            const pts = Array.from({ length: 6 }, (_, i) => {
              const a = (Math.PI / 180) * (60 * i - 30)
              return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
            }).join(' ')
            return <polygon key={`g-${slug}`} points={pts} fill="none" stroke="rgba(59,130,246,0.08)" strokeWidth="1" />
          })}
        </svg>

        {/* Hex tiles */}
        {visible.map((slug) => {
          const meta = metaRef.current[slug] || ALL_ROOMS.find(r => r.slug === slug) || {}
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
          const x = isDrag && dragPos ? dragPos.x : p.x
          const y = isDrag && dragPos ? dragPos.y : p.y

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

              {/* Focus ring */}
              {(isSel || isFoc) && <div style={{ position: 'absolute', inset: -2, clipPath: HEX_CLIP, WebkitClipPath: HEX_CLIP, border: '2px solid rgba(37,99,235,0.6)', pointerEvents: 'none', zIndex: 6 }} />}
            </div>
          )
        })}

        {/* Context menu */}
        {contextMenu && (
          <div
            style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, zIndex: 100, minWidth: 180, background: 'rgba(12,16,30,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, padding: '6px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: "'Inter',system-ui,sans-serif" }}
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
              <CtxItem label={`Show Hidden (${hiddenRooms.size})`} icon="\u25CE" onClick={() => { setHiddenRooms(new Set()); setSlotOrder(ALL_ROOMS.filter(r => !r.hidden).map(r => r.slug)); setContextMenu(null); showToast('All rooms restored') }} />
            )}
            <CtxItem label="Reset Room Order" icon="\u2316" onClick={() => { setSlotOrder(ALL_ROOMS.filter(r => !r.hidden).map(r => r.slug)); setHiddenRooms(new Set()); setContextMenu(null); showToast('Layout reset') }} />
          </div>
        )}
      </div>

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
