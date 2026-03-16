import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, X, ChevronUp, ChevronDown,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, GitCommit, Terminal, Maximize2, Minimize2,
  ListTodo, FolderKanban, Calendar, Plus, ArrowLeft, Map,
  ZoomIn, ZoomOut, Home, LayoutDashboard, Gamepad2, Command,
  ArrowRight, Coffee,
} from 'lucide-react'
import { GRID_SPEC, ROOM_MAP, AGENTS } from './gridSpec.js'
import { createChatConnection, CONNECTION_TYPE } from './chatConnection.js'
import { renderFurniture } from './FurnitureRenderer.jsx'
import { useWebSocket, WS_STATE } from './useWebSocket.js'

const ChecklistMode = lazy(() => import('./ChecklistMode.jsx'))
const MegaboardMode = lazy(() => import('./MegaboardMode.jsx'))
const GameHUD = lazy(() => import('./GameHUD.jsx'))

// ---- MODE CONFIG -----------------------------------------------------------
const MODES = {
  game: { id: 'game', label: 'GAME', icon: Map, key: '1', path: '/dashboard' },
  checklist: { id: 'checklist', label: 'CHECKLIST', icon: ListTodo, key: '2', path: '/dashboard/checklist' },
  megaboard: { id: 'megaboard', label: 'MEGABOARD', icon: LayoutDashboard, key: '3', path: '/dashboard/megaboard' },
}

// ---- CONFIG ----------------------------------------------------------------
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'
const PALETTE = GRID_SPEC.colorPalette
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const DEFAULT_AGENT = 'elon' // Patrik's main agent - camera starts here

const STATUS_CONFIG = {
  WORKING:  { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',  label: 'Active',   pulseColor: '#22C55E' },
  IDLE:     { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: 'Idle',     pulseColor: '#6B7280' },
  BLOCKED:  { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  label: 'Blocked',  pulseColor: '#EF4444' },
  DONE:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'Done',     pulseColor: '#3B82F6' },
  WAITING:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Thinking', pulseColor: '#F59E0B' },
  PAUSED:   { color: '#F97316', bg: 'rgba(249,115,22,0.15)', label: 'Paused',   pulseColor: '#F97316' },
}

// ---- ZOOM DETAIL LEVELS (Steffen c3-room-zoom-spec) -------------------------
const ZOOM_LEVELS = {
  OVERVIEW: { min: 0.5, max: 1.0, scale: 0.7, label: 'Overview' },
  NEIGHBORHOOD: { min: 1.0, max: 2.2, scale: 1.6, label: 'Neighborhood' },
  DETAIL: { min: 2.2, max: 3.5, scale: 2.8, label: 'Detail' },
}

function getDetailLevel(zoom) {
  if (zoom < ZOOM_LEVELS.NEIGHBORHOOD.min) return 'overview'
  if (zoom < ZOOM_LEVELS.DETAIL.min) return 'neighborhood'
  return 'detail'
}

// ---- ROOM ADJACENCY MAP (for pathfinding) -----------------------------------
const ROOM_ADJACENCY = {
  patrik:     ['mom', 'steffen'],
  mom:        ['patrik', 'alex', 'main-hall'],
  alex:       ['mom', 'steve', 'main-hall'],
  steve:      ['alex'],
  steffen:    ['patrik', 'main-hall'],
  'main-hall':['mom', 'alex', 'steffen', 'bobby', 'cleo', 'elmo'],
  bobby:      ['main-hall', 'colton'],
  colton:     ['bobby'],
  cleo:       ['main-hall', 'tony'],
  tony:       ['cleo'],
  elmo:       ['main-hall', 'elon', 'jacob'],
  elon:       ['elmo'],
  jacob:      ['elmo'],
}

// BFS shortest path
function findPath(from, to) {
  if (from === to) return [from]
  const visited = new Set([from])
  const queue = [[from]]
  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]
    const neighbors = ROOM_ADJACENCY[current] || []
    for (const next of neighbors) {
      if (next === to) return [...path, next]
      if (!visited.has(next)) {
        visited.add(next)
        queue.push([...path, next])
      }
    }
  }
  return [from, to] // fallback
}

// Door positions per room (relative to room, in SVG units)
function getDoorPosition(roomId) {
  const room = ROOM_MAP[roomId]
  if (!room) return { x: 40, y: 40 }
  const w = 80 * room.size.cols
  const h = 80 * room.size.rows
  // Door is roughly at the south or east wall opening
  if (room.walls?.south?.includes('door') || room.walls?.south?.includes('open')) return { x: w / 2, y: h - 4 }
  if (room.walls?.east?.includes('door') || room.walls?.east?.includes('open')) return { x: w - 4, y: h / 2 }
  if (room.walls?.north?.includes('door') || room.walls?.north?.includes('open')) return { x: w / 2, y: 4 }
  if (room.walls?.west?.includes('door') || room.walls?.west?.includes('open')) return { x: 4, y: h / 2 }
  return { x: w / 2, y: h - 4 }
}

// ---- CAMERA SYSTEM ---------------------------------------------------------
// Room positions in SVG space (same as IsometricOffice calc)
const CELL_SIZE = 80
function getRoomCenter(roomId) {
  const room = ROOM_MAP[roomId]
  if (!room) return { x: 160, y: 160 }
  const pixelX = (room.position.col / 2) * CELL_SIZE
  const pixelY = room.position.row * CELL_SIZE
  const roomW = CELL_SIZE * (room.size.cols / 2)
  const roomH = CELL_SIZE * room.size.rows
  return {
    x: pixelX + roomW / 2,
    y: pixelY + roomH / 2,
  }
}

// ---- HOOKS -----------------------------------------------------------------
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp)
  useEffect(() => {
    const c = () => setM(window.innerWidth < bp)
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [bp])
  return m
}

function useDashboardData(interval) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastRaw = useRef(null)

  // Local mode: 2s poll. Production: 30s poll.
  const pollInterval = interval || (IS_LOCAL ? 2000 : 30000)
  const endpoint = IS_LOCAL ? '/api/local/status' : '/api/dashboard/status'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`${res.status}`)
      const text = await res.text()
      if (text !== lastRaw.current) {
        lastRaw.current = text
        setData(JSON.parse(text))
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, pollInterval)
    return () => clearInterval(timer)
  }, [fetchData, pollInterval])

  return { data, error, loading }
}

function useKeyboardShortcuts({ onToggleHud, onToggleChat, onToggleMinimap, onEscape, onAgentSelect, onToggleAnimations, onZoomIn, onZoomOut, onOverview, onModeSwitch, onCommandPalette, onShowShortcuts }) {
  useEffect(() => {
    const handler = (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') { e.target.blur(); onEscape?.() }
        return
      }

      // Cmd+K / Ctrl+K: command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onCommandPalette?.()
        return
      }

      switch (e.key) {
        // Mode switching: 1, 2, 3
        case '1': onModeSwitch?.('game'); break
        case '2': onModeSwitch?.('checklist'); break
        case '3': onModeSwitch?.('megaboard'); break

        case '?': onShowShortcuts?.(); break
        default: break
      }

      switch (e.key.toLowerCase()) {
        case 't': onToggleHud?.(); break
        case 'escape': onEscape?.(); break
        case 'm': onToggleMinimap?.(); break
        case ' ': e.preventDefault(); onToggleAnimations?.(); break
        case '/': e.preventDefault(); onToggleChat?.(); break
        case '=': case '+': onZoomIn?.(); break
        case '-': onZoomOut?.(); break
        case 'o': onOverview?.(); break
        default: break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleHud, onToggleChat, onToggleMinimap, onEscape, onAgentSelect, onToggleAnimations, onZoomIn, onZoomOut, onOverview, onModeSwitch, onCommandPalette, onShowShortcuts])
}

// ---- UTILITIES -------------------------------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

function azTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ---- PASSWORD GATE ---------------------------------------------------------
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [shake, setShake] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (pw === DASHBOARD_PASSWORD) {
      sessionStorage.setItem('dash-auth', '1')
      onAuth()
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.background, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360 }} className={shake ? 'animate-shake' : ''}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ color: PALETTE.signText, fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>CORNER</div>
          <h1 style={{ color: '#F5F0EB', fontSize: 24, fontWeight: 900, fontStyle: 'italic', fontFamily: "'Inter Tight', sans-serif", letterSpacing: '-0.02em' }}>Your Office</h1>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" autoFocus
          style={{ width: '100%', background: '#141822', border: '1px solid #2A3040', color: '#F5F0EB', padding: '12px 16px', fontSize: 16, fontFamily: 'JetBrains Mono, monospace', outline: 'none', borderRadius: 2 }} />
        <button type="submit" style={{ width: '100%', marginTop: 12, background: '#E85D26', color: 'white', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 13, padding: '12px', border: 'none', cursor: 'pointer', borderRadius: 2 }}>
          Enter
        </button>
        {IS_LOCAL && (
          <div style={{ textAlign: 'center', marginTop: 12, color: '#4CAF50', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
            LOCAL MODE ACTIVE
          </div>
        )}
      </form>
    </div>
  )
}

// ---- SPRITE STATE MAPPING --------------------------------------------------
// Maps agent status to sprite file state name
// 'speaking' state used when agent is streaming a response in chat
function getSpriteState(status, isSpeaking) {
  if (isSpeaking) return 'speaking'
  switch (status) {
    case 'WORKING':  return 'thinking'
    case 'WAITING':  return 'thinking'
    case 'DONE':     return 'done'
    case 'BLOCKED':  return 'idle'
    case 'PAUSED':   return 'idle'
    default:         return 'idle'
  }
}

// All sprite PNGs are multi-frame spritesheets. We show just the top-left frame.
// The images are 1024x1024 with frames in a 2x2 or 3x3 grid.
// For the agent character in SVG, we use foreignObject to embed an <img> with
// object-fit + object-position to crop to the first frame.
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton','cleo','tony','jacob','elmo','elon','pixel']

// Preload idle sprites on mount
function usePreloadSprites() {
  useEffect(() => {
    SPRITE_AGENTS.forEach(a => {
      const img = new Image()
      img.src = `/corner/sprites/${a}-idle.png`
    })
  }, [])
}

// ---- AGENT CHARACTER (Pixel Art Sprite) - HTML version for div-based rooms --
function AgentCharacterHTML({ color, status, agentSlug, isSpeaking, roomW, roomH }) {
  const spriteState = getSpriteState(status, isSpeaking)
  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'

  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)

  // Character at 22% of room - visible life indicator, room is the star
  const spriteSize = Math.min(roomW, roomH) * 0.22

  if (!hasSpriteFile) {
    return (
      <div style={{
        position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        width: spriteSize * 0.4, height: spriteSize * 0.4, borderRadius: '50%',
        background: color, opacity: 0.9, boxShadow: `0 4px 12px ${color}66`,
      }} />
    )
  }

  const spriteSrc = `/corner/sprites/${agentSlug}-${spriteState}.png`

  return (
    <div style={{
      position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)',
      width: spriteSize, height: spriteSize, pointerEvents: 'none', zIndex: 2,
    }}>
      {/* Shadow beneath sprite */}
      <div style={{
        position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
        width: spriteSize * 0.7, height: spriteSize * 0.15,
        background: 'rgba(0,0,0,0.25)', borderRadius: '50%', filter: 'blur(3px)',
      }} />

      {/* Sprite image - show first frame from 2x2 spritesheet (top-left quadrant)
          Sprite PNGs are 256x256 with 4 frames in 2x2 grid. Each frame is 128x128.
          We render at 2x container size and overflow:hidden crops to top-left frame.
          mix-blend-mode: lighten makes the dark sprite background transparent. */}
      <div style={{
        width: spriteSize, height: spriteSize, overflow: 'hidden', position: 'relative',
        borderRadius: '50%',
        mixBlendMode: 'screen',
      }}>
        {/* Zoom into center of first frame to show character, not dark corners.
            Sprite is 256x256, frame is 128x128. We show frame at 2.6x to zoom into the character. */}
        <img
          src={spriteSrc}
          alt=""
          style={{
            position: 'absolute',
            top: '-30%', left: '-30%',
            width: spriteSize * 2.6,
            height: spriteSize * 2.6,
            maxWidth: 'none',
            imageRendering: 'pixelated',
            display: 'block',
            filter: isWorking ? `drop-shadow(0 0 8px ${color}66)` : 'none',
            transition: 'filter 400ms ease',
          }}
        />
      </div>

      {/* Working glow pulse */}
      {isWorking && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          animation: 'characterGlow 2s ease-in-out infinite',
        }} />
      )}

      {/* Thinking dots above sprite */}
      {isThinking && (
        <div style={{
          position: 'absolute', top: -12, right: -4,
          display: 'flex', gap: 3,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#F59E0B',
              animation: `dotPulse 0.8s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Done checkmark */}
      {isDone && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 18, height: 18, borderRadius: '50%',
          background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(16,185,129,0.4)',
        }}>
          <svg width={10} height={8} viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

// Legacy SVG version kept for compatibility
function AgentCharacter({ x, y, color, status, agentSlug, isSpeaking }) {
  const spriteState = getSpriteState(status, isSpeaking)
  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'
  const spriteW = 28
  const spriteH = 28
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  if (!hasSpriteFile) {
    return (
      <g>
        <ellipse cx={x} cy={y + 6} rx={5} ry={2} fill="#000" opacity={0.2} />
        <circle cx={x} cy={y - 4} r={6} fill={color} opacity={0.9} />
      </g>
    )
  }
  const spriteSrc = `/corner/sprites/${agentSlug}-${spriteState}.png`
  return (
    <g>
      <ellipse cx={x} cy={y + 8} rx={10} ry={3} fill="#000" opacity={0.15} />
      <foreignObject x={x - spriteW / 2} y={y - spriteH + 4} width={spriteW} height={spriteH} style={{ overflow: 'hidden', pointerEvents: 'none' }}>
        <img src={spriteSrc} alt="" style={{ width: spriteW * 2, height: spriteH * 2, objectFit: 'cover', objectPosition: '0 0', imageRendering: 'pixelated', display: 'block' }} />
      </foreignObject>
      {isWorking && (
        <circle cx={x} cy={y - spriteH / 2 + 4} r={16} fill={color} opacity={0.08}>
          <animate attributeName="r" values="14;18;14" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {isThinking && (
        <g>{[0, 1, 2].map(i => (
          <circle key={i} cx={x + 10 + i * 4} cy={y - spriteH - 2} r={1.5} fill="#F59E0B" opacity={0.6}>
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.8s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
          </circle>
        ))}</g>
      )}
      {isDone && (
        <g>
          <circle cx={x + 12} cy={y - spriteH} r={4} fill="#10B981" opacity={0.8} />
          <path d={`M${x + 10},${y - spriteH} L${x + 12},${y - spriteH + 2} L${x + 15},${y - spriteH - 2}`} fill="none" stroke="#FFF" strokeWidth={1.2} />
        </g>
      )}
    </g>
  )
}

// ---- SPRITE AVATAR (HTML, for chat + sidebar) ------------------------------
function SpriteAvatar({ agentSlug, size = 32, borderColor, style: extraStyle }) {
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  const agent = AGENTS.find(a => a.slug === agentSlug)
  const color = borderColor || agent?.color || '#6B7280'

  if (hasSpriteFile) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
        overflow: 'hidden', flexShrink: 0, background: '#0A0F1E',
        ...extraStyle,
      }}>
        <img
          src={`/corner/sprites/${agentSlug}-idle.png`}
          alt=""
          style={{
            width: size * 2,
            height: size * 2,
            objectFit: 'cover',
            objectPosition: '15% 5%',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      </div>
    )
  }

  // Fallback: colored initial circle
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(8, size * 0.35), fontWeight: 700, color, background: `${color}33`,
      flexShrink: 0, ...extraStyle,
    }}>
      {agent?.name?.charAt(0) || '?'}
    </div>
  )
}

// ---- PER-ROOM LIGHTING OVERLAY COLORS (Steffen C2.2 spec 4B) ---------------
const ROOM_LIGHT_OVERLAYS = {
  patrik:    'rgba(255, 216, 122, 0.05)',
  bobby:     'rgba(156, 39, 176, 0.08)',
  elon:      'rgba(76, 175, 80, 0.05)',
  cleo:      'rgba(255, 183, 77, 0.06)',
  steffen:   'rgba(255, 216, 122, 0.07)',
  'main-hall': 'rgba(255, 183, 77, 0.04)',
  elmo:      'rgba(240, 240, 240, 0.06)',
  mom:       'rgba(245, 158, 11, 0.04)',
  alex:      'rgba(59, 130, 246, 0.04)',
  steve:     'rgba(124, 154, 114, 0.04)',
  colton:    'rgba(6, 182, 212, 0.04)',
  tony:      'rgba(236, 72, 153, 0.05)',
  jacob:     'rgba(239, 68, 68, 0.04)',
}

// Rooms that have pixel art room render PNGs
const ROOMS_WITH_RENDERS = [
  'patrik', 'mom', 'alex', 'steve', 'steffen', 'main-hall',
  'bobby', 'colton', 'cleo', 'tony', 'jacob', 'elmo', 'elon',
]

// ---- ROOM TILE (HTML/CSS - uses Gemini renders as backgrounds) -------------
// The renders ARE isometric. No CSS 3D transforms needed. Let the art do the work.
function RoomTile({ room, agent, agentStatus, isHovered, isSelected, onClick, onMouseEnter, onMouseLeave, tileW, tileH, detailLevel, agentAnimation }) {
  if (!room) return null

  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const isActive = status === 'WORKING'
  const hasAgent = room.agent !== null
  const agentColor = room.agentColor || '#FFD87A'
  const isAway = agentAnimation?.state === 'away'
  const baseBrightness = isAway ? 0.3 : (isActive ? 1.0 : (status === 'DONE' ? 0.95 : (status === 'IDLE' ? 0.75 : 0.85)))
  const hasRoomRender = ROOMS_WITH_RENDERS.includes(room.id)
  const roomImgSrc = `/corner/rooms/${room.id === 'main-hall' ? 'main-hall' : room.id + '-room'}.png`
  const showAmbient = detailLevel !== 'overview'

  return (
    <div
      onClick={() => hasAgent && onClick?.(room.id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        width: tileW, height: tileH,
        cursor: hasAgent ? 'pointer' : 'default',
        filter: `brightness(${baseBrightness})`,
        transition: 'filter 400ms ease, transform 200ms ease',
        transform: (isHovered && hasAgent) ? 'scale(1.02)' : 'scale(1)',
        zIndex: (isHovered || isSelected) ? 5 : 1,
      }}
    >
      {/* Room render image - the art IS the depth */}
      {hasRoomRender ? (
        <img
          src={roomImgSrc}
          alt={room.name}
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            display: 'block',
            imageRendering: 'auto',
            borderRadius: 2,
          }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          background: room.floorColor || '#C4956A',
          borderRadius: 2,
        }} />
      )}

      {/* South + East wall thickness (dark borders for 3D wall effect) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.35))',
        pointerEvents: 'none', borderRadius: '0 0 2px 2px',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 3,
        background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.25))',
        pointerEvents: 'none', borderRadius: '0 2px 2px 0',
      }} />

      {/* Light spill from windows (warm radial extending outward) */}
      {showAmbient && room.walls?.north?.includes('window') && (
        <div style={{
          position: 'absolute', top: -12, left: '20%', width: '60%', height: 24,
          background: `radial-gradient(ellipse, ${room.lightColor || '#FFD87A'}20 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(8px)',
        }} />
      )}
      {showAmbient && room.walls?.west?.includes('window') && (
        <div style={{
          position: 'absolute', top: '20%', left: -12, width: 24, height: '60%',
          background: `radial-gradient(ellipse, ${room.lightColor || '#FFD87A'}20 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(8px)',
        }} />
      )}
      {showAmbient && room.walls?.east?.includes('window') && (
        <div style={{
          position: 'absolute', top: '20%', right: -12, width: 24, height: '60%',
          background: `radial-gradient(ellipse, ${room.lightColor || '#FFD87A'}20 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(8px)',
        }} />
      )}

      {/* Bobby's purple LED underglow */}
      {room.id === 'bobby' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
          background: `linear-gradient(to top, rgba(156,39,176,${isActive ? 0.25 : 0.12}), transparent)`,
          pointerEvents: 'none', borderRadius: '0 0 2px 2px',
        }} />
      )}

      {/* Agent sprite character - LARGE AND CENTERED (30-40% of room) */}
      {hasAgent && agent && !isAway && (
        <AgentCharacterHTML
          color={agentColor}
          status={status}
          agentSlug={room.id}
          roomW={tileW}
          roomH={tileH}
        />
      )}

      {/* "Away" badge */}
      {isAway && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 12, padding: '4px 12px',
          color: '#F59E0B', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {agentAnimation?.label || 'Away'}
        </div>
      )}

      {/* Status indicator dot (top-right) */}
      {hasAgent && !isAway && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 8, height: 8, borderRadius: '50%',
          background: isActive ? cfg.color : (room.statusColors?.[status === 'IDLE' ? 'idle' : 'active'] || cfg.color),
          opacity: isActive ? 1 : 0.6,
          boxShadow: isActive ? `0 0 6px ${cfg.color}` : 'none',
          animation: isActive ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
          zIndex: 3,
        }} />
      )}

      {/* Hover/selected glow border */}
      {(isHovered || isSelected) && hasAgent && (
        <div style={{
          position: 'absolute', inset: -2,
          border: `2px solid ${agentColor}`,
          borderRadius: 4,
          opacity: isSelected ? 0.6 : 0.3,
          boxShadow: `0 0 12px ${agentColor}40, inset 0 0 20px ${agentColor}10`,
          pointerEvents: 'none',
          transition: 'opacity 200ms ease',
        }} />
      )}
    </div>
  )
}

// Legacy SVG IsometricRoom kept for fallback
function IsometricRoom({ room, agent, agentStatus, isHovered, isSelected, onClick, cellSize, detailLevel, agentAnimation }) {
  if (!room) return null
  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const isActive = status === 'WORKING'
  const hasAgent = room.agent !== null
  const roomW = cellSize * room.size.cols
  const roomH = cellSize * room.size.rows
  const agentColor = room.agentColor || '#FFD87A'
  const isAway = agentAnimation?.state === 'away'
  const baseBrightness = isAway ? 0.25 : (isActive ? 1.0 : (status === 'DONE' ? 1.0 : (status === 'IDLE' ? 0.4 : 0.6)))
  const hasRoomRender = ROOMS_WITH_RENDERS.includes(room.id)
  const roomLightOverlay = ROOM_LIGHT_OVERLAYS[room.id]
  return (
    <g onClick={() => hasAgent && onClick?.(room.id)} style={{ cursor: hasAgent ? 'pointer' : 'default', filter: `brightness(${baseBrightness})`, transition: 'filter 400ms ease' }}>
      {hasRoomRender ? (
        <foreignObject x={0} y={0} width={roomW} height={roomH} style={{ overflow: 'hidden' }}>
          <img src={`/corner/rooms/${room.id === 'main-hall' ? 'main-hall' : room.id + '-room'}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </foreignObject>
      ) : (
        <rect x={0} y={0} width={roomW} height={roomH} fill={room.floorColor || '#C4956A'} />
      )}
      {hasAgent && agent && !isAway && (
        <AgentCharacter x={roomW * 0.55} y={roomH * 0.7} color={agentColor} status={status} agentSlug={room.id} />
      )}
      <rect x={0} y={0} width={roomW} height={roomH} fill="none" stroke={PALETTE.exteriorWalls} strokeWidth={1} />
    </g>
  )
}

// ---- NAMEPLATE (HTML version for div-based layout) -------------------------
function RoomNameplateHTML({ room, agentStatus, isHovered }) {
  if (!room || room.agent === null) return null
  const status = agentStatus?.status || 'IDLE'
  const dotColor = status === 'WORKING' ? (room.statusColors?.active || '#22C55E')
    : status === 'WAITING' ? '#F59E0B'
    : (room.statusColors?.idle || '#6B7280')
  const pulse = status === 'WORKING' || status === 'WAITING'
  const task = agentStatus?.currentTask || ''
  const hasSprite = SPRITE_AGENTS.includes(room.id)

  return (
    <div style={{
      position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 6,
      background: PALETTE.nameplate.background,
      border: `1px solid ${isHovered ? `${room.agentColor}4D` : PALETTE.nameplate.border}`,
      borderRadius: 6, padding: '3px 10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap', zIndex: 10,
      transition: 'border-color 150ms ease',
    }}>
      {/* Mini sprite avatar */}
      {hasSprite && (
        <div style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          <img src={`/corner/sprites/${room.id}-idle.png`} alt=""
            style={{ width: 32, height: 32, objectFit: 'cover', objectPosition: '0 0', imageRendering: 'pixelated' }} />
        </div>
      )}
      {/* Status dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0,
        animation: pulse ? `statusPulse ${status === 'WAITING' ? '0.8s' : '1.5s'} ease-in-out infinite` : 'none',
      }} />
      {/* Name */}
      <span style={{
        color: PALETTE.nameplate.text,
        fontSize: 11, fontWeight: isHovered ? 700 : 600,
        fontFamily: 'Space Grotesk, sans-serif',
      }}>
        {room.agent}
      </span>
      {/* Task on hover */}
      {isHovered && task && (
        <span style={{ color: '#8A847C', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.length > 22 ? task.slice(0, 22) + '...' : task}
        </span>
      )}
    </div>
  )
}

// Legacy SVG nameplate kept for minimap
function RoomNameplate({ room, agentStatus, isHovered, cellSize }) {
  if (!room || room.agent === null) return null
  const status = agentStatus?.status || 'IDLE'
  const dotColor = status === 'WORKING' ? '#22C55E' : '#6B7280'
  const roomW = cellSize * room.size.cols
  return (
    <g>
      <rect x={roomW / 2 - 30} y={-18} width={60} height={16} rx={4} fill={PALETTE.nameplate.background} stroke={PALETTE.nameplate.border} strokeWidth={1} />
      <circle cx={roomW / 2 - 18} cy={-10} r={3} fill={dotColor} />
      <text x={roomW / 2 - 10} y={-7} fill={PALETTE.nameplate.text} fontSize={11} fontWeight={600} fontFamily="Space Grotesk, sans-serif">{room.agent}</text>
    </g>
  )
}

// ---- ISOMETRIC OFFICE (main game view) - SINGLE IMAGE APPROACH -------------
// Uses full-office-warm-night.png as ONE cohesive building.
// No individual room tiles = no double walls. The north star IS the background.
// Interactive click targets, nameplates, and status dots overlay on top.

// Room hit-target positions mapped to the 1024x1024 full-office image (percentages).
const IMAGE_ROOM_TARGETS = {
  patrik:     { x: 22, y: 7,  w: 16, h: 16, labelY: 5  },
  mom:        { x: 36, y: 7,  w: 16, h: 16, labelY: 5  },
  alex:       { x: 50, y: 7,  w: 16, h: 16, labelY: 5  },
  steve:      { x: 64, y: 7,  w: 16, h: 16, labelY: 5  },
  steffen:    { x: 14, y: 24, w: 16, h: 18, labelY: 22 },
  'main-hall':{ x: 30, y: 24, w: 30, h: 18, labelY: 22 },
  jacob:      { x: 60, y: 24, w: 18, h: 18, labelY: 22 },
  bobby:      { x: 8,  y: 44, w: 16, h: 18, labelY: 42 },
  colton:     { x: 24, y: 44, w: 16, h: 18, labelY: 42 },
  cleo:       { x: 40, y: 44, w: 16, h: 18, labelY: 42 },
  tony:       { x: 56, y: 44, w: 16, h: 18, labelY: 42 },
  elmo:       { x: 24, y: 64, w: 16, h: 16, labelY: 62 },
  elon:       { x: 40, y: 64, w: 16, h: 16, labelY: 62 },
}
// ---- SINGLE-IMAGE APPROACH: uses full-office-warm-night.png ------
function IsometricOffice({ agentStatus, onRoomClick, selectedRoom, hoveredRoom, setHoveredRoom, cameraTarget, cameraZoom, isOverview, onZoomChange, agentAnimations }) {
  // Image display size (px) - scales the 1024x1024 image
  const IMG_SIZE = 880

  const rooms = GRID_SPEC.rooms
  const containerRef = useRef(null)

  // Pan state for click-drag
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const panState = useRef({ dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0, velX: 0, velY: 0 })
  const momentumRef = useRef(null)

  // Scroll wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      onZoomChange?.(z => Math.min(3.5, Math.max(0.3, z + delta)))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [onZoomChange])

  // Click-drag pan with momentum
  const handleMouseDown = useCallback((e) => {
    if (momentumRef.current) cancelAnimationFrame(momentumRef.current)
    panState.current = { dragging: true, startX: e.clientX - panOffset.x, startY: e.clientY - panOffset.y, lastX: e.clientX, lastY: e.clientY, velX: 0, velY: 0 }
  }, [panOffset])

  const handleMouseMove = useCallback((e) => {
    if (!panState.current.dragging) return
    const newX = e.clientX - panState.current.startX
    const newY = e.clientY - panState.current.startY
    panState.current.velX = e.clientX - panState.current.lastX
    panState.current.velY = e.clientY - panState.current.lastY
    panState.current.lastX = e.clientX
    panState.current.lastY = e.clientY
    setPanOffset({ x: newX, y: newY })
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!panState.current.dragging) return
    panState.current.dragging = false
    let vx = panState.current.velX
    let vy = panState.current.velY
    const decay = () => {
      if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return
      vx *= 0.92
      vy *= 0.92
      setPanOffset(prev => ({ x: prev.x + vx, y: prev.y + vy }))
      momentumRef.current = requestAnimationFrame(decay)
    }
    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      momentumRef.current = requestAnimationFrame(decay)
    }
  }, [])

  // Reset pan when camera target changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 })
  }, [cameraTarget, isOverview])

  // Touch support for mobile pan
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (momentumRef.current) cancelAnimationFrame(momentumRef.current)
      panState.current = { dragging: true, startX: t.clientX - panOffset.x, startY: t.clientY - panOffset.y, lastX: t.clientX, lastY: t.clientY, velX: 0, velY: 0 }
    }
  }, [panOffset])

  const handleTouchMove = useCallback((e) => {
    if (!panState.current.dragging || e.touches.length !== 1) return
    const t = e.touches[0]
    const newX = t.clientX - panState.current.startX
    const newY = t.clientY - panState.current.startY
    panState.current.velX = t.clientX - panState.current.lastX
    panState.current.velY = t.clientY - panState.current.lastY
    panState.current.lastX = t.clientX
    panState.current.lastY = t.clientY
    setPanOffset({ x: newX, y: newY })
  }, [])

  // Pinch-to-zoom
  const pinchRef = useRef({ active: false, initialDist: 0, initialZoom: 1 })
  const handleTouchStartPinch = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { active: true, initialDist: Math.hypot(dx, dy), initialZoom: cameraZoom }
    }
  }, [cameraZoom])

  const handleTouchMovePinch = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / pinchRef.current.initialDist
      const newZoom = Math.min(3.5, Math.max(0.3, pinchRef.current.initialZoom * scale))
      onZoomChange?.(() => newZoom)
    }
  }, [onZoomChange])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) pinchRef.current.active = false
    if (e.touches.length === 0) handleMouseUp()
  }, [handleMouseUp])

  const detailLevel = getDetailLevel(cameraZoom)
  const zoomTransition = detailLevel === 'overview' ? '0.5s cubic-bezier(0.4, 0.0, 0.2, 1.0)' : '0.4s cubic-bezier(0.2, 0.9, 0.3, 1.0)'

  // Camera offset centers on the target room using image-space coordinates
  const getRoomCenter = (roomId) => {
    const target = IMAGE_ROOM_TARGETS[roomId]
    if (!target) return { x: IMG_SIZE / 2, y: IMG_SIZE / 2 }
    return {
      x: (target.x + target.w / 2) / 100 * IMG_SIZE,
      y: (target.y + target.h / 2) / 100 * IMG_SIZE,
    }
  }

  const targetPos = getRoomCenter(cameraTarget || DEFAULT_AGENT)
  const cameraOffsetX = isOverview ? 0 : -(targetPos.x - IMG_SIZE / 2)
  const cameraOffsetY = isOverview ? 0 : -(targetPos.y - IMG_SIZE / 2)

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        cursor: panState.current.dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => { handleTouchStart(e); handleTouchStartPinch(e) }}
      onTouchMove={(e) => { handleTouchMove(e); handleTouchMovePinch(e) }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Building container - single cohesive image, no grid of tiles */}
      <div style={{
        transform: `translate(${panOffset.x + cameraOffsetX * cameraZoom}px, ${panOffset.y + cameraOffsetY * cameraZoom}px) scale(${cameraZoom})`,
        transition: panState.current.dragging ? 'none' : `transform ${zoomTransition}`,
        transformOrigin: 'center center',
        position: 'relative',
        width: IMG_SIZE,
        height: IMG_SIZE,
      }}>
        {/* The full office image - ONE cohesive building. No double walls. */}
        <img
          src="/corner/full-office-warm-night.png"
          alt="Corner Office"
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'auto',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Interactive room overlays - click targets, nameplates, status */}
        {rooms.map(room => {
          const target = IMAGE_ROOM_TARGETS[room.id]
          if (!target) return null

          const hasAgent = room.agent !== null
          const status = agentStatus[room.id]?.status || 'IDLE'
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
          const isActive = status === 'WORKING'
          const isHovered = hoveredRoom === room.id
          const isSelected = selectedRoom === room.id
          const agentColor = room.agentColor || '#FFD87A'
          const isAway = agentAnimations?.[room.id]?.state === 'away'
          const showNameplate = detailLevel !== 'detail'

          return (
            <div key={room.id}>
              {/* Nameplate above room */}
              {showNameplate && hasAgent && (
                <div style={{
                  position: 'absolute',
                  left: `${target.x + target.w / 2}%`,
                  top: `${target.labelY}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: PALETTE.nameplate.background,
                  border: `1px solid ${isHovered ? `${agentColor}4D` : PALETTE.nameplate.border}`,
                  borderRadius: 6, padding: '3px 10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap', zIndex: 10,
                  transition: 'border-color 150ms ease',
                  pointerEvents: 'none',
                }}>
                  {SPRITE_AGENTS.includes(room.id) && (
                    <div style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={`/corner/sprites/${room.id}-idle.png`} alt=""
                        style={{ width: 32, height: 32, objectFit: 'cover', objectPosition: '0 0', imageRendering: 'pixelated' }} />
                    </div>
                  )}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isActive ? cfg.color : (room.statusColors?.[status === 'IDLE' ? 'idle' : 'active'] || cfg.color),
                    flexShrink: 0,
                    animation: isActive ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{
                    color: PALETTE.nameplate.text,
                    fontSize: 11, fontWeight: isHovered ? 700 : 600,
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}>
                    {room.agent}
                  </span>
                  {isHovered && agentStatus[room.id]?.currentTask && (
                    <span style={{ color: '#8A847C', fontSize: 9, fontFamily: 'Space Grotesk, sans-serif', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {agentStatus[room.id].currentTask.length > 22 ? agentStatus[room.id].currentTask.slice(0, 22) + '...' : agentStatus[room.id].currentTask}
                    </span>
                  )}
                </div>
              )}

              {/* Click target overlay */}
              <div
                onClick={() => hasAgent && onRoomClick?.(room.id)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                style={{
                  position: 'absolute',
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: `${target.w}%`,
                  height: `${target.h}%`,
                  cursor: hasAgent ? 'pointer' : 'default',
                  zIndex: (isHovered || isSelected) ? 5 : 2,
                  borderRadius: 4,
                  background: (isHovered || isSelected) && hasAgent
                    ? `radial-gradient(ellipse, ${agentColor}18 0%, transparent 70%)`
                    : 'transparent',
                  border: (isHovered || isSelected) && hasAgent
                    ? `2px solid ${agentColor}${isSelected ? '80' : '40'}`
                    : '2px solid transparent',
                  boxShadow: (isHovered || isSelected) && hasAgent
                    ? `0 0 20px ${agentColor}25, inset 0 0 30px ${agentColor}08`
                    : 'none',
                  transition: 'border-color 200ms ease, background 200ms ease, box-shadow 200ms ease',
                }}
              >
                {isAway && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 12, padding: '4px 12px',
                    color: '#F59E0B', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
                    zIndex: 6,
                  }}>
                    {agentAnimations?.[room.id]?.label || 'Away'}
                  </div>
                )}

                {isAway && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    borderRadius: 4, pointerEvents: 'none',
                  }} />
                )}

                {hasAgent && !isAway && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 8, height: 8, borderRadius: '50%',
                    background: cfg.color,
                    opacity: isActive ? 1 : 0.6,
                    boxShadow: isActive ? `0 0 8px ${cfg.color}` : 'none',
                    animation: isActive ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
                    zIndex: 3,
                  }} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- MINI-MAP (bottom-left, Steffen HUD spec) with camera indicator --------
function MiniMap({ rooms, agentStatus, selectedRoom, cameraTarget, cameraZoom, isOverview, onRoomClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', bottom: 80, left: 16, zIndex: 35,
        width: 160, height: 120,
        background: 'rgba(10, 15, 30, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        padding: 8,
      }}
    >
      {/* Title */}
      <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
        MAP {IS_LOCAL && <span style={{ color: '#4CAF50' }}>LOCAL</span>}
      </div>
      <svg width={144} height={96} viewBox="0 0 320 320">
        {rooms.map(room => {
          const x = (room.position.col / 2) * 80
          const y = room.position.row * 80
          const w = (room.size.cols / 2) * 80
          const h = room.size.rows * 80
          const isActive = agentStatus[room.id]?.status === 'WORKING'
          const isCameraHere = cameraTarget === room.id
          return (
            <g key={room.id}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={room.agentColor || '#4A5568'}
                opacity={isActive ? 0.6 : 0.3}
                stroke={isCameraHere ? '#FDF6EC' : (selectedRoom === room.id ? '#FDF6EC' : 'rgba(255,255,255,0.1)')}
                strokeWidth={isCameraHere ? 3 : (selectedRoom === room.id ? 2 : 0.5)}
                rx={2}
                style={{ cursor: room.agent ? 'pointer' : 'default' }}
                onClick={() => room.agent && onRoomClick(room.id)}
              />
              {/* Camera icon on current room */}
              {isCameraHere && !isOverview && (
                <circle cx={x + w / 2} cy={y + h / 2} r={4} fill="#FDF6EC" opacity={0.9}>
                  <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Agent initial */}
              {room.agent && (
                <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill="#FDF6EC" fontSize={10} fontWeight={700} opacity={0.5}>
                  {room.agent?.charAt(0)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </motion.div>
  )
}

// ---- NOTIFICATION TOAST (top-right) - Steffen C3 toast spec ----------------
// 4 types: task_complete (green), handoff (blue), error_recovery (yellow), system (gray)
const TOAST_TYPES = {
  task_complete: { accent: '#22C55E', icon: CheckCircle2, autoDismiss: 5000 },
  handoff: { accent: '#3B82F6', icon: ArrowRight, autoDismiss: 5000 },
  error_recovery: { accent: '#F59E0B', icon: AlertTriangle, autoDismiss: 8000 },
  system: { accent: '#6B7280', icon: Terminal, autoDismiss: 4000 },
}

function NotificationToast({ notifications, onDismiss, onClickNotification, queuedCount }) {
  const [hoveredId, setHoveredId] = useState(null)

  return (
    <div style={{
      position: 'fixed', top: 64, right: 16, zIndex: 45,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}
      role="status" aria-live="polite"
    >
      <AnimatePresence>
        {notifications.slice(0, 3).map(n => {
          const toastType = TOAST_TYPES[n.type] || TOAST_TYPES.system
          const accentColor = toastType.accent
          const EventIcon = toastType.icon
          const isHovered = hoveredId === n.id

          return (
            <motion.div
              key={n.id}
              role="alert"
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              onClick={() => onClickNotification?.(n)}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                width: 320, cursor: n.type !== 'system' ? 'pointer' : 'default',
                background: 'rgba(10, 15, 30, 0.95)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${accentColor}33`,
                borderLeft: `3px solid ${accentColor}`,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
                padding: '12px 14px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SpriteAvatar agentSlug={n.agentSlug} size={24} borderColor={n.agentColor || accentColor} />
                <EventIcon size={14} color={accentColor} />
                <span style={{ color: n.agentColor || accentColor, fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {n.agentName || 'System'}
                </span>
                <span style={{ marginLeft: 'auto', color: '#6B7280', fontSize: 10, fontFamily: 'Space Grotesk, sans-serif' }}>
                  {n.time}
                </span>
                {/* Dismiss button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss?.(n.id) }}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isHovered ? '#F0ECE6' : '#4A5060',
                    padding: 2, transition: 'color 150ms',
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Message */}
              <div style={{
                color: '#F0ECE6', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif',
                lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {n.message}
              </div>

              {/* Dismiss timer progress bar */}
              {!isHovered && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (toastType.autoDismiss || 5000) / 1000, ease: 'linear' }}
                  onAnimationComplete={() => onDismiss?.(n.id)}
                  style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: 2, background: `${accentColor}4D`,
                    borderRadius: '0 0 8px 8px',
                  }}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Queued toast indicator */}
      {queuedCount > 0 && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 9,
          color: '#6B7280', textAlign: 'center', marginTop: 4,
        }}>
          +{queuedCount} more
        </div>
      )}
    </div>
  )
}

// ---- MODE SWITCHER (center of HUD bar) - Steffen c3-mode-switcher-spec -----
function ModeSwitcher({ currentMode, onModeSwitch, isMobile }) {
  const [hoveredMode, setHoveredMode] = useState(null)
  const modeList = [MODES.game, MODES.checklist, MODES.megaboard]

  if (isMobile) {
    // Mobile: bottom tab bar (rendered separately, not here)
    return null
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0, position: 'relative', height: 48,
    }}>
      {modeList.map(mode => {
        const active = currentMode === mode.id
        const Icon = mode.icon
        const isHovered = hoveredMode === mode.id
        return (
          <button
            key={mode.id}
            onClick={() => onModeSwitch(mode.id)}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 48,
              background: 'none', border: 'none',
              borderBottom: active ? '2px solid #E85D26' : '2px solid transparent',
              cursor: 'pointer',
              color: active ? '#FDF6EC' : isHovered ? '#A0A0A0' : '#6B7280',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 12,
              fontWeight: active ? 600 : 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'color 150ms ease',
              position: 'relative',
            }}
          >
            <Icon size={16} style={{ color: active ? '#E85D26' : 'inherit' }} />
            {mode.label}

            {/* Keyboard shortcut hint on hover */}
            {isHovered && !active && (
              <span style={{
                position: 'absolute', top: 6, right: 4,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3, padding: '1px 4px',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 8,
                color: '#6B7280',
              }}>
                {mode.key}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---- MOBILE MODE TAB BAR (Steffen c3-mobile-layout-spec) --------------------
function MobileModeBar({ currentMode, onModeSwitch }) {
  const modeList = [MODES.game, MODES.checklist, MODES.megaboard]

  return (
    <div style={{
      position: 'fixed', bottom: 56, left: 0, right: 0, zIndex: 29,
      height: 44,
      background: 'rgba(10, 15, 30, 0.95)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {modeList.map(mode => {
        const active = currentMode === mode.id
        const Icon = mode.icon
        return (
          <button
            key={mode.id}
            onClick={() => onModeSwitch(mode.id)}
            style={{
              flex: 1, height: 44,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? '#E85D26' : '#6B7280',
              minWidth: 44, minHeight: 44, // Touch target
            }}
          >
            <Icon size={20} />
            {active && (
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#E85D26' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---- MOBILE BOTTOM SHEET (Steffen c3-mobile-layout-spec) --------------------
function MobileBottomSheet({ room, agent, agentStatus, onClose, onChat, onViewTasks }) {
  const [expanded, setExpanded] = useState(false)
  const status = agentStatus?.status || 'IDLE'
  const task = agentStatus?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const agentColor = room?.agentColor || agent?.color || '#6B7280'

  // Swipe down to dismiss
  const startY = useRef(0)
  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    const deltaY = e.changedTouches[0].clientY - startY.current
    if (deltaY > 60) {
      if (expanded) setExpanded(false)
      else onClose()
    } else if (deltaY < -60 && !expanded) {
      setExpanded(true)
    }
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        bottom: 100, // above mode bar + chat bar
        left: 0, right: 0,
        height: expanded ? '60vh' : 200,
        background: 'rgba(10, 15, 30, 0.98)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
        zIndex: 38,
        overflow: 'hidden',
        transition: 'height 300ms ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.15)' }} />
      </div>

      {/* Agent info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
        <SpriteAvatar agentSlug={room?.id} size={40} borderColor={agentColor} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#FDF6EC', fontSize: 18, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>
            {agent?.name || room?.agent}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {agent?.role || room?.role}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 3,
            }}>
              {cfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Current task */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ color: '#F0ECE6', fontSize: 14, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.4 }}>
          {task}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, padding: '0 20px 16px' }}>
        <button onClick={() => onChat(room?.id)} style={{
          flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: `${agentColor}26`, color: agentColor, border: `1px solid ${agentColor}40`,
          borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer',
        }}>
          <MessageSquare size={14} />
          Chat with {agent?.name || 'Agent'}
        </button>
        <button onClick={onViewTasks} style={{
          flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', color: '#F0ECE6', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer',
        }}>
          <ListTodo size={14} />
          View Tasks
        </button>
      </div>

      {/* Expanded content: recent completions */}
      {expanded && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '12px 0 8px' }}>
            Recent
          </div>
          {agentStatus?.lastCompletion ? (
            <div style={{ color: '#A8A29E', fontSize: 12, lineHeight: 1.5, fontFamily: 'Space Grotesk, sans-serif' }}>
              {agentStatus.lastCompletion.description}
              <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                {agentStatus.lastCompletion.date}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', padding: '8px 0' }}>
              No recent completions
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ---- KEYBOARD SHORTCUTS OVERLAY -------------------------------------------
function ShortcutsOverlay({ onClose }) {
  const shortcuts = [
    { key: '1', action: 'Game mode' },
    { key: '2', action: 'Checklist mode' },
    { key: '3', action: 'Megaboard mode' },
    { key: '/', action: 'Focus chat input' },
    { key: 'T', action: 'Toggle Task HUD' },
    { key: 'M', action: 'Toggle mini-map' },
    { key: 'O', action: 'Overview / zoom out' },
    { key: '+/-', action: 'Zoom in / out (0.5x to 3.5x)' },
    { key: 'Scroll', action: 'Scroll wheel zoom' },
    { key: 'Click+Drag', action: 'Pan when zoomed' },
    { key: 'Double-click', action: 'Zoom to detail view' },
    { key: 'Esc', action: 'Close / go back' },
    { key: '?', action: 'Show this overlay' },
    { key: 'Cmd+K', action: 'Command palette' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0C1120', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: 24, width: 360,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
          color: '#FDF6EC', textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: 16,
        }}>
          Keyboard Shortcuts
        </div>
        {shortcuts.map(s => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, color: '#A8A29E',
            }}>
              {s.action}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11,
              color: '#6B7280', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, padding: '2px 8px',
            }}>
              {s.key}
            </span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 16, padding: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: '#6B7280', cursor: 'pointer',
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 12,
          }}
        >
          Close (Esc)
        </button>
      </motion.div>
    </motion.div>
  )
}

// ---- TASK HUD (top drawer) - aligned to Steffen c2-hud-spec ----------------
function TaskHUD({ data, isOpen, onToggle, selectedAgent, isMobile, currentMode, onModeSwitch, detailLevel }) {
  const [tab, setTab] = useState('session')
  const tabs = [
    { id: 'session', label: 'Last Session', icon: Clock },
    { id: 'project', label: 'By Project', icon: FolderKanban },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
    { id: 'add', label: 'Add New', icon: Plus },
  ]

  // Active underline color: agent color or default orange
  const activeAgent = selectedAgent ? AGENTS.find(a => a.slug === selectedAgent) : null
  const underlineColor = activeAgent?.color || '#E85D26'

  // Hide HUD drawer toggle in Checklist mode (Checklist IS the task view)
  const showDrawer = currentMode !== 'checklist'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 35,
    }}>
      {/* Collapsed bar: 48px (36px at detail zoom per Steffen spec) */}
      <div style={{
        height: detailLevel === 'detail' && currentMode === 'game' ? 36 : (isMobile ? 44 : 48),
        transition: 'height 200ms ease',
        background: currentMode === 'megaboard' ? 'rgba(5, 8, 15, 0.95)' : 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Left: CORNER logo + mode badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: PALETTE.signText, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            CORNER
          </span>
          <span style={{ color: '#E85D26', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16 }}>.</span>
          {IS_LOCAL && (
            <span style={{
              fontSize: 8, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              color: '#4CAF50', background: 'rgba(76,175,80,0.1)',
              padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em',
              border: '1px solid rgba(76,175,80,0.2)',
            }}>LOCAL</span>
          )}
          {/* Connection type indicator */}
          {CONNECTION_TYPE === 'websocket' && (
            <span style={{
              fontSize: 8, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              color: '#3B82F6', background: 'rgba(59,130,246,0.1)',
              padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em',
              border: '1px solid rgba(59,130,246,0.2)',
            }}>WS</span>
          )}
        </div>

        {/* Center: Mode Switcher (desktop) */}
        {!isMobile && (
          <ModeSwitcher currentMode={currentMode} onModeSwitch={onModeSwitch} isMobile={isMobile} />
        )}

        {/* Right: Expand chevron (only if drawer is available) */}
        {showDrawer ? (
          <button onClick={onToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = PALETTE.signText}
            onMouseLeave={e => e.target.style.color = '#6B7280'}
          >
            <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease' }} />
          </button>
        ) : (
          <div style={{ width: 24 }} /> // Spacer
        )}
      </div>

      {/* Expanded drawer: 280px */}
      <AnimatePresence>
        {isOpen && showDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: isMobile ? '60vh' : 280, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: 'rgba(10, 15, 30, 0.92)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Sub-tabs inside drawer (moved from collapsed bar per Steffen C3 spec) */}
            <div style={{
              display: 'flex', gap: isMobile ? 16 : 28,
              padding: '0 20px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              {tabs.map(t => {
                const active = tab === t.id
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: active ? PALETTE.signText : '#6B7280',
                      borderBottom: active ? `2px solid ${underlineColor}` : '2px solid transparent',
                      fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '10px 0', transition: 'color 150ms ease',
                    }}
                    onMouseEnter={e => { if (!active) e.target.style.color = '#A0A0A0' }}
                    onMouseLeave={e => { if (!active) e.target.style.color = '#6B7280' }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.15 }}
              style={{ padding: '16px 20px 20px', height: 'calc(100% - 40px)', overflowY: 'auto' }}
              className="hud-scroll"
            >
              {tab === 'session' && <SessionTab data={data} />}
              {tab === 'project' && <ProjectTab data={data} />}
              {tab === 'upcoming' && <UpcomingTab />}
              {tab === 'add' && <AddTaskTab />}
            </motion.div>

            {/* Gradient fade at bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 20,
              background: 'linear-gradient(to bottom, rgba(10, 15, 30, 0) 0%, rgba(10, 15, 30, 0.92) 100%)',
              pointerEvents: 'none',
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Task Item Card (Steffen HUD spec) -------------------------------------
function TaskCard({ entry, agentColor }) {
  const statusBadgeColors = {
    DONE: { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
    ACTIVE: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
    BLOCKED: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
    QUEUED: { bg: 'rgba(107,114,128,0.15)', text: '#6B7280' },
    WORKING: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  }
  const badge = statusBadgeColors[entry.status] || statusBadgeColors.QUEUED

  return (
    <div style={{
      minHeight: 64, background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: 6, padding: '14px 16px',
      cursor: 'pointer', transition: 'background 150ms ease, border-color 150ms ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Agent sprite avatar (tiny, 20px) */}
        {entry.agent ? (
          <SpriteAvatar
            agentSlug={AGENTS.find(a => a.name?.toLowerCase() === entry.agent?.toLowerCase())?.slug}
            size={20}
            borderColor={agentColor}
            style={{ marginTop: 2 }}
          />
        ) : (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor || '#6B7280', marginTop: 4, flexShrink: 0, boxShadow: `0 0 4px ${agentColor || '#6B7280'}4D` }} />
        )}
        {/* Task title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 14, color: '#F0ECE6', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {entry.description || entry.currentTask || 'No task'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {entry.agent && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: agentColor || '#6B7280' }}>
                {entry.agent}
              </span>
            )}
            {entry.status && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: badge.text, background: badge.bg, padding: '2px 8px', borderRadius: 3 }}>
                {entry.status === 'WORKING' ? 'ACTIVE' : entry.status}
              </span>
            )}
            {entry.time && (
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400, fontSize: 11, color: '#6B7280', marginLeft: 'auto' }}>
                {timeAgo(entry.time)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionTab({ data }) {
  const feed = data?.pipelineFeed || []
  if (feed.length === 0) return <EmptyTab message="No recent activity" />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {feed.slice(0, 12).map((entry, i) => {
        const agent = AGENTS.find(a => a.slug === entry.agent?.toLowerCase() || a.name === entry.agent)
        return <TaskCard key={i} entry={entry} agentColor={agent?.color} />
      })}
    </div>
  )
}

function ProjectTab({ data }) {
  const agents = data?.agents || []
  const grouped = {
    'Product Build': agents.filter(a => ['bobby', 'colton', 'steffen', 'elmo'].includes(a.slug)),
    'Strategy': agents.filter(a => ['alex', 'steve', 'mom'].includes(a.slug)),
    'Outreach': agents.filter(a => ['jacob', 'tony', 'paige'].includes(a.slug)),
    'Content': agents.filter(a => ['cleo'].includes(a.slug)),
    'Infrastructure': agents.filter(a => ['elon', 'pixel'].includes(a.slug)),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>{group}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {items.map(a => {
              const specAgent = AGENTS.find(sa => sa.slug === a.slug)
              return <TaskCard key={a.slug} entry={{ ...a, description: a.currentTask, agent: a.name }} agentColor={specAgent?.color} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function UpcomingTab() {
  return <EmptyTab message="Upcoming tasks will sync from punch-list.md" />
}

function AddTaskTab() {
  const [selectedAgent, setSelectedAgent] = useState(null)

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Input */}
      <input type="text" placeholder="Add a task for any agent..."
        style={{
          width: '100%', background: 'transparent',
          border: 'none', borderBottom: '2px solid rgba(255, 255, 255, 0.15)',
          color: '#FDF6EC', padding: '12px 0', fontSize: 14,
          fontFamily: 'Space Grotesk, sans-serif', fontWeight: 400,
          outline: 'none',
        }}
        onFocus={e => e.target.style.borderBottomColor = '#E85D26'}
        onBlur={e => e.target.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
      />

      {/* Agent pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {AGENTS.filter(a => a.slug !== 'paige' && a.slug !== 'pixel').map(a => {
          const sel = selectedAgent === a.slug
          return (
            <button key={a.slug} onClick={() => setSelectedAgent(sel ? null : a.slug)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 28, padding: '4px 12px', borderRadius: 14,
                background: sel ? `${a.color}26` : 'transparent',
                border: `1px solid ${sel ? `${a.color}4D` : 'rgba(255,255,255,0.08)'}`,
                color: sel ? a.color : '#8A847C',
                fontSize: 11, fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif',
                cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >
              <SpriteAvatar agentSlug={a.slug} size={16} borderColor={a.color} />
              {a.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EmptyTab({ message }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: '#6B7280', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif' }}>
      {message}
    </div>
  )
}

// ---- CHAT BAR (bottom) - aligned to Steffen c2-hud-spec --------------------
function ChatBar({ activeAgent, onSelectAgent, agentStatus, isMobile }) {
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [messages, setMessages] = useState({}) // per-agent message history
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const connectionRef = useRef(null)

  const currentAgent = activeAgent
    ? AGENTS.find(a => a.slug === activeAgent)
    : AGENTS.find(a => a.slug === 'elon')

  const agentSlug = currentAgent?.slug || 'elon'
  const currentMessages = messages[agentSlug] || []
  const status = agentStatus[agentSlug]?.status || 'IDLE'
  const task = agentStatus[agentSlug]?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const agentColor = currentAgent?.color || '#E85D26'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 200)
  }, [expanded])

  const updateMessages = (agentSlug, updater) => {
    setMessages(prev => ({ ...prev, [agentSlug]: updater(prev[agentSlug] || []) }))
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    updateMessages(agentSlug, prev => [...prev, { role: 'user', content: text, time: new Date().toISOString() }])
    setStreaming(true)
    updateMessages(agentSlug, prev => [...prev, { role: 'assistant', content: '', streaming: true, time: new Date().toISOString() }])

    // In local mode, also write to relay-outbox for the Telegram bridge
    if (IS_LOCAL) {
      try {
        await fetch('/api/local/relay-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentSlug, message: text, source: 'corner-dashboard' }),
        })
      } catch {}
    }

    // Disconnect previous connection
    connectionRef.current?.disconnect()

    const conn = createChatConnection(
      // onMessage
      (text) => {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: last.content + text }
          return updated
        })
      },
      // onDone
      () => {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) updated[updated.length - 1] = { ...last, streaming: false }
          return updated
        })
        setStreaming(false)
      },
      // onError
      (error) => {
        updateMessages(agentSlug, prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) updated[updated.length - 1] = { ...last, content: `Error: ${error}`, streaming: false }
          return updated
        })
        setStreaming(false)
      }
    )

    connectionRef.current = conn
    await conn.send({
      slug: agentSlug,
      message: text,
      history: currentMessages.map(m => ({ role: m.role, content: m.content })),
    })
  }

  // Chat heights per Steffen spec
  const getHeight = () => {
    if (fullscreen) return '100vh'
    if (expanded) return isMobile ? '100vh' : '40vh'
    return 0
  }

  return (
    <div style={{
      position: fullscreen ? 'fixed' : 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: fullscreen ? 100 : 30,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Expanded chat panel */}
      <AnimatePresence>
        {(expanded || fullscreen) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: getHeight(), opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: fullscreen ? PALETTE.background : 'rgba(10, 15, 30, 0.95)',
              backdropFilter: fullscreen ? 'none' : 'blur(24px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5)',
              borderRadius: fullscreen ? 0 : '16px 16px 0 0',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            {!fullscreen && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255, 255, 255, 0.15)' }} />
              </div>
            )}

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: `0 20px`, height: fullscreen ? 56 : 44,
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {fullscreen && (
                  <button onClick={() => setFullscreen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
                    <ArrowLeft size={18} />
                  </button>
                )}
                <span style={{ color: PALETTE.signText, fontSize: fullscreen ? 16 : 15, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>{currentAgent?.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: agentColor }}>
                    {status === 'WORKING' && <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />}
                  </div>
                  <span style={{ color: agentColor, fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }}>
                    {status === 'WORKING' ? 'Active' : status === 'WAITING' ? 'Thinking...' : 'Idle'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {!fullscreen && (
                  <button onClick={() => setFullscreen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
                    onMouseEnter={e => e.target.style.color = PALETTE.signText} onMouseLeave={e => e.target.style.color = '#6B7280'}>
                    <Maximize2 size={16} />
                  </button>
                )}
                <button onClick={() => { setExpanded(false); setFullscreen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
                  onMouseEnter={e => e.target.style.color = PALETTE.signText} onMouseLeave={e => e.target.style.color = '#6B7280'}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', maxWidth: fullscreen ? 720 : '100%', margin: fullscreen ? '0 auto' : 0, width: '100%' }}>
              {currentMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: 14, fontFamily: 'Space Grotesk, sans-serif' }}>
                  Chat with <span style={{ color: PALETTE.signText, fontWeight: 600 }}>{currentAgent?.name}</span>
                  <div style={{ fontSize: 12, marginTop: 6, color: '#6B7280' }}>{task}</div>
                </div>
              )}
              {currentMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  {msg.role === 'assistant' && (
                    <SpriteAvatar agentSlug={agentSlug} size={fullscreen ? 28 : 20} borderColor={agentColor} style={{ marginRight: 8, marginTop: 2 }} />
                  )}
                  <div>
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      fontSize: fullscreen ? 15 : 14,
                      fontFamily: 'Space Grotesk, sans-serif',
                      lineHeight: 1.55,
                      ...(msg.role === 'user'
                        ? {
                          background: 'rgba(232,93,38,0.12)',
                          border: '1px solid rgba(232,93,38,0.20)',
                          borderRadius: '12px 2px 12px 12px',
                          color: PALETTE.signText,
                        }
                        : {
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '2px 12px 12px 12px',
                          color: '#F0ECE6',
                        }
                      ),
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                      {msg.streaming && !msg.content && (
                        <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: agentColor, animation: `dotPulse 0.6s ease-in-out ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                      )}
                      {msg.streaming && msg.content && (
                        <span style={{ display: 'inline-block', width: 6, height: 16, background: agentColor, marginLeft: 2, animation: 'pulse 1s infinite' }} />
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4, fontFamily: 'Space Grotesk, sans-serif', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {msg.time ? timeAgo(msg.time) : ''}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar inside expanded panel */}
            <form onSubmit={sendMessage} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', height: 56,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0,
            }}>
              <SpriteAvatar agentSlug={agentSlug} size={32} borderColor={agentColor} />
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Message ${currentAgent?.name}...`} disabled={streaming}
                style={{
                  flex: 1, background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8, height: 36, padding: '0 16px',
                  color: PALETTE.signText, fontSize: 14,
                  fontFamily: 'Space Grotesk, sans-serif',
                  outline: 'none', transition: 'border-color 150ms ease',
                }}
                onFocus={e => e.target.style.borderColor = `${agentColor}66`}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              />
              <button type="submit" disabled={!input.trim() || streaming}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: input.trim() ? agentColor : '#2A3040',
                  color: '#FDF6EC', border: 'none',
                  cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: '150ms ease',
                  opacity: streaming ? 0.5 : 1,
                }}>
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed chat bar: 56px */}
      {!expanded && !fullscreen && (
        <form onSubmit={sendMessage} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 56, padding: '0 16px',
          background: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.3)',
        }}>
          {/* Agent avatar */}
          <SpriteAvatar agentSlug={agentSlug} size={32} borderColor={agentColor} />
          <span style={{ color: agentColor, fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', flexShrink: 0 }}>
            {currentAgent?.name}
          </span>

          {/* Input */}
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder={`Message ${currentAgent?.name}...`} disabled={streaming}
            style={{
              flex: 1, background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8, height: 36, padding: '0 16px',
              color: PALETTE.signText, fontSize: 14,
              fontFamily: 'Space Grotesk, sans-serif',
              outline: 'none', margin: '0 8px',
            }}
          />

          {/* Send */}
          <button type="submit" disabled={!input.trim() || streaming}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: input.trim() ? agentColor : '#2A3040',
              color: '#FDF6EC', border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: streaming ? 0.3 : (input.trim() ? 1 : 0.3),
            }}>
            <Send size={16} />
          </button>

          {/* Expand */}
          <button type="button" onClick={() => setExpanded(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4,
          }}>
            <ChevronUp size={16} />
          </button>
        </form>
      )}
    </div>
  )
}

// ---- ROOM DETAIL SIDEBAR ---------------------------------------------------
function RoomDetailSidebar({ room, agent, agentStatus, onClose, onChat }) {
  const status = agentStatus?.status || 'IDLE'
  const task = agentStatus?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const agentColor = room?.agentColor || agent?.color || '#6B7280'

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        position: 'absolute', top: 48, right: 0, bottom: 56, width: 320, maxWidth: '100%',
        background: 'rgba(10, 15, 30, 0.97)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex', flexDirection: 'column',
        zIndex: 32,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SpriteAvatar agentSlug={room?.id} size={36} borderColor={agentColor} />
          <div>
            <div style={{ color: PALETTE.signText, fontSize: 16, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>{agent?.name || room?.agent}</div>
            <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {agent?.role || room?.role || ''}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Status */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: cfg.bg, borderRadius: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
          <span style={{ color: cfg.color, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>{cfg.label}</span>
        </div>
      </div>

      {/* Current task */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Current Task</div>
        <div style={{ color: '#A8A29E', fontSize: 13, lineHeight: 1.5, fontFamily: 'Space Grotesk, sans-serif' }}>{task}</div>
      </div>

      {/* Last completion */}
      {agentStatus?.lastCompletion && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Last Completion</div>
          <div style={{ color: '#A8A29E', fontSize: 12, lineHeight: 1.5 }}>{agentStatus.lastCompletion.description}</div>
          <div style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{agentStatus.lastCompletion.date}</div>
        </div>
      )}

      {/* Room info */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Room</div>
        <div style={{ color: '#A8A29E', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif' }}>{room?.name || 'Unknown'}</div>
        {room?.personality && (
          <div style={{ color: '#6B7280', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif', marginTop: 4, fontStyle: 'italic' }}>{room.personality}</div>
        )}
      </div>

      {/* Data source indicator */}
      {IS_LOCAL && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>Data Source</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50' }} />
            <span style={{ color: '#4CAF50', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>Local filesystem (2s poll)</span>
          </div>
        </div>
      )}

      {/* Chat button */}
      <div style={{ padding: '12px 16px', marginTop: 'auto' }}>
        <button onClick={() => onChat(room?.id)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: agentColor, color: '#FFF', border: 'none',
          padding: 12, fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif',
          cursor: 'pointer', borderRadius: 4,
        }}>
          <MessageSquare size={14} />
          Chat with {agent?.name || room?.agent}
        </button>
      </div>
    </motion.div>
  )
}

// ---- CAMERA CONTROLS (floating, right side) --------------------------------
function CameraControls({ cameraZoom, setCameraZoom, isOverview, setIsOverview, cameraTarget, setCameraTarget, onHomeRoom }) {
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 32,
      display: 'flex', flexDirection: 'column', gap: 4,
      background: 'rgba(10,15,30,0.85)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: 4,
    }}>
      {/* Zoom in */}
      <button onClick={() => setCameraZoom(z => Math.min(3.5, z + 0.15))}
        title="Zoom in (+)"
        style={{
          width: 32, height: 32, background: 'transparent', border: 'none',
          color: '#A0A0A0', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FDF6EC'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#A0A0A0'; e.currentTarget.style.background = 'transparent' }}
      >
        <ZoomIn size={16} />
      </button>

      {/* Zoom level */}
      <span style={{ color: '#6B7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '2px 0' }}>
        {Math.round(cameraZoom * 100)}%
      </span>

      {/* Zoom out */}
      <button onClick={() => setCameraZoom(z => Math.max(0.5, z - 0.15))}
        title="Zoom out (-)"
        style={{
          width: 32, height: 32, background: 'transparent', border: 'none',
          color: '#A0A0A0', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FDF6EC'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#A0A0A0'; e.currentTarget.style.background = 'transparent' }}
      >
        <ZoomOut size={16} />
      </button>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 4px' }} />

      {/* Home / go to main agent */}
      <button onClick={onHomeRoom}
        title={`Go to ${DEFAULT_AGENT} (H)`}
        style={{
          width: 32, height: 32, background: 'transparent', border: 'none',
          color: cameraTarget === DEFAULT_AGENT && !isOverview ? '#E85D26' : '#A0A0A0',
          cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Home size={16} />
      </button>

      {/* Overview toggle */}
      <button onClick={() => setIsOverview(o => !o)}
        title="Overview (O)"
        style={{
          width: 32, height: 32, background: isOverview ? 'rgba(232,93,38,0.15)' : 'transparent', border: 'none',
          color: isOverview ? '#E85D26' : '#A0A0A0',
          cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 150ms, background 150ms',
        }}
        onMouseEnter={e => { if (!isOverview) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { if (!isOverview) e.currentTarget.style.background = 'transparent' }}
      >
        <Map size={16} />
      </button>
    </div>
  )
}

// ---- MAIN GAME DASHBOARD ---------------------------------------------------
export default function GameDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('dash-auth') === '1')
  const [hudOpen, setHudOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const [chatAgent, setChatAgent] = useState(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [showShortcuts, setShowShortcuts] = useState(false)

  // C3: MODE STATE
  const [currentMode, setCurrentMode] = useState(() => {
    // Check URL first, then localStorage, then default to 'game'
    const path = window.location.pathname
    if (path.includes('/checklist')) return 'checklist'
    if (path.includes('/megaboard')) return 'megaboard'
    return localStorage.getItem('corner-mode') || 'game'
  })

  // CAMERA STATE: start in overview to see the full building
  const [cameraTarget, setCameraTarget] = useState(DEFAULT_AGENT)
  const [cameraZoom, setCameraZoom] = useState(0.7)
  const [isOverview, setIsOverview] = useState(true)

  // C3 Step 8: Agent death/error animation state
  // { [agentSlug]: { state: 'away'|'leaving'|'returning', label: 'Away'|'Reconnecting...', x, y } }
  const [agentAnimations, setAgentAnimations] = useState({})

  // C3: Streaming state tracking (for speaking sprite)
  const [streamingAgent, setStreamingAgent] = useState(null)

  const { data, error, loading } = useDashboardData()
  const isMobile = useIsMobile()

  // C3: WebSocket connection
  const wsHook = useWebSocket({
    enabled: true,
    onEvent: useCallback((event) => {
      // Handle WebSocket events for notifications
      if (event.type === 'task_complete' || event.type === 'handoff' || event.type === 'error_recovery') {
        const agentSlug = event.agent || event.from_agent
        const agent = AGENTS.find(a => a.slug === agentSlug)
        setNotifications(prev => [{
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: event.type,
          agentSlug,
          agentName: agent?.name || agentSlug,
          agentColor: agent?.color,
          message: event.message || event.task || `${event.type.replace(/_/g, ' ')}`,
          time: 'just now',
          timestamp: event.timestamp,
        }, ...prev].slice(0, 10))
      }

      // C3 Step 8: Agent death/error animations
      if (event.type === 'error_recovery') {
        const agentSlug = event.agent
        if (event.status === 'disconnected') {
          // Agent leaves: animate walk-out, then set to "away"
          setAgentAnimations(prev => ({
            ...prev,
            [agentSlug]: { state: 'away', label: 'Away' },
          }))
        } else if (event.status === 'reconnecting') {
          setAgentAnimations(prev => ({
            ...prev,
            [agentSlug]: { ...(prev[agentSlug] || {}), state: 'away', label: 'Reconnecting...' },
          }))
        } else if (event.status === 'reconnected') {
          // Agent returns: clear away state after a short delay for walk-back feel
          setTimeout(() => {
            setAgentAnimations(prev => {
              const next = { ...prev }
              delete next[agentSlug]
              return next
            })
          }, 1800)
        }
      }

      // Track streaming agent for speaking sprite
      if (event.type === 'agent_state_change') {
        if (event.state === 'speaking') setStreamingAgent(event.agent)
        else if (event.state === 'idle' || event.state === 'done') {
          if (streamingAgent === event.agent) setStreamingAgent(null)
        }
      }
    }, [streamingAgent]),
  })

  // Preload all idle sprites for instant display
  usePreloadSprites()

  // Mode switching handler
  const handleModeSwitch = useCallback((mode) => {
    setCurrentMode(mode)
    localStorage.setItem('corner-mode', mode)
    // Update URL
    const modeConfig = MODES[mode]
    if (modeConfig) {
      window.history.replaceState(null, '', modeConfig.path)
    }
    // Close HUD drawer when switching modes
    setHudOpen(false)
  }, [])

  // URL-based agent selection
  useEffect(() => {
    const path = window.location.pathname
    const agentMatch = path.match(/\/dashboard\/agent\/(.+)/)
    if (agentMatch) {
      const slug = agentMatch[1]
      setSelectedRoom(slug)
      setChatAgent(slug)
      setCameraTarget(slug)
    }
    const checklistMatch = path.match(/\/dashboard\/checklist\/(.+)/)
    if (checklistMatch) {
      setCurrentMode('checklist')
    }
    const megaMatch = path.match(/\/dashboard\/megaboard\/agent\/(.+)/)
    if (megaMatch) {
      setCurrentMode('megaboard')
    }
  }, [])

  // Update URL based on mode and selected agent
  useEffect(() => {
    if (currentMode === 'game') {
      if (chatAgent) {
        window.history.replaceState(null, '', `/dashboard/agent/${chatAgent}`)
      } else {
        window.history.replaceState(null, '', '/dashboard')
      }
    }
  }, [chatAgent, currentMode])

  // Agent status lookup
  const agentStatus = useMemo(() => {
    if (!data?.agents) return {}
    const map = {}
    for (const a of data.agents) map[a.slug] = a
    return map
  }, [data])

  // When overview mode changes, adjust zoom (Steffen spec: 0.7x overview, 1.6x neighborhood)
  useEffect(() => {
    if (isOverview) {
      setCameraZoom(0.7)
    } else {
      setCameraZoom(1.6)
    }
  }, [isOverview])

  const handleRoomClick = (roomId) => {
    const room = ROOM_MAP[roomId]
    if (!room || room.agent === null) return

    // Always move camera to clicked room
    setCameraTarget(roomId)
    setIsOverview(false)

    if (roomId === selectedRoom) {
      // Already selected: zoom to Level 3 (detail) and open chat
      setCameraZoom(2.8)
      setChatAgent(roomId)
    } else {
      // First click: zoom to Level 2 (neighborhood)
      setCameraZoom(1.6)
      setSelectedRoom(roomId)
    }
  }

  const handleChat = (roomId) => {
    setChatAgent(roomId)
    setSelectedRoom(roomId)
    setCameraTarget(roomId)
    setIsOverview(false)
  }

  const handleHomeRoom = () => {
    setCameraTarget(DEFAULT_AGENT)
    setIsOverview(false)
    setCameraZoom(1.6)
    setSelectedRoom(null)
  }

  // Mini-map room click -> move camera
  const handleMinimapRoomClick = (roomId) => {
    setCameraTarget(roomId)
    setSelectedRoom(roomId)
    setIsOverview(false)
    setCameraZoom(1.6)
  }

  // Notification management
  const handleDismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const visibleNotifications = notifications.slice(0, 3)
  const queuedNotificationCount = Math.max(0, notifications.length - 3)

  // Keyboard shortcuts
  const agentSlugs = AGENTS.filter(a => ROOM_MAP[a.slug]).map(a => a.slug)
  useKeyboardShortcuts({
    onToggleHud: () => setHudOpen(h => !h),
    onToggleChat: () => {
      // Focus chat or open it
    },
    onToggleMinimap: () => setShowMinimap(m => !m),
    onEscape: () => {
      if (showShortcuts) { setShowShortcuts(false); return }
      if (chatAgent) { setChatAgent(null); return }
      if (cameraZoom > 2.2) { setCameraZoom(1.6); return }
      if (selectedRoom) { setSelectedRoom(null); setIsOverview(true); return }
      setHudOpen(false)
    },
    onAgentSelect: null, // Removed: 1-9 now used for mode switching
    onZoomIn: () => setCameraZoom(z => Math.min(3.5, z + 0.15)),
    onZoomOut: () => setCameraZoom(z => Math.max(0.5, z - 0.15)),
    onOverview: () => setIsOverview(o => !o),
    onModeSwitch: handleModeSwitch,
    onCommandPalette: () => { /* Command palette: future C3.1 */ },
    onShowShortcuts: () => setShowShortcuts(s => !s),
  })

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: PALETTE.background,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Task HUD (top) - compact at detail zoom level per Steffen spec */}
      <TaskHUD data={data} isOpen={hudOpen} onToggle={() => setHudOpen(!hudOpen)} selectedAgent={selectedRoom} isMobile={isMobile} currentMode={currentMode} onModeSwitch={handleModeSwitch} detailLevel={getDetailLevel(cameraZoom)} />

      {/* Main content area with mode switching */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingTop: isMobile ? 44 : (getDetailLevel(cameraZoom) === 'detail' && currentMode === 'game' ? 36 : 48), paddingBottom: isMobile ? 100 : 0, transition: 'padding-top 200ms ease' }}>
        <AnimatePresence mode="wait">
          {/* GAME MODE */}
          {currentMode === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <IsometricOffice
                agentStatus={agentStatus}
                onRoomClick={handleRoomClick}
                selectedRoom={selectedRoom}
                hoveredRoom={hoveredRoom}
                setHoveredRoom={setHoveredRoom}
                cameraTarget={cameraTarget}
                cameraZoom={cameraZoom}
                isOverview={isOverview}
                onZoomChange={setCameraZoom}
                agentAnimations={agentAnimations}
              />

              {/* Camera controls (floating, game mode only) */}
              <CameraControls
                cameraZoom={cameraZoom}
                setCameraZoom={setCameraZoom}
                isOverview={isOverview}
                setIsOverview={setIsOverview}
                cameraTarget={cameraTarget}
                setCameraTarget={setCameraTarget}
                onHomeRoom={handleHomeRoom}
              />

              {/* Room detail sidebar (desktop) */}
              {!isMobile && (
                <AnimatePresence>
                  {selectedRoom && ROOM_MAP[selectedRoom] && ROOM_MAP[selectedRoom].agent !== null && (
                    <RoomDetailSidebar
                      key={selectedRoom}
                      room={ROOM_MAP[selectedRoom]}
                      agent={AGENTS.find(a => a.slug === selectedRoom)}
                      agentStatus={agentStatus[selectedRoom]}
                      onClose={() => setSelectedRoom(null)}
                      onChat={handleChat}
                    />
                  )}
                </AnimatePresence>
              )}

              {/* Window light animation overlay - enhanced depth */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {/* Primary warm light */}
                <div style={{
                  position: 'absolute', top: '8%', left: '8%', width: 280, height: 280,
                  background: 'radial-gradient(circle, rgba(255,183,77,0.05) 0%, transparent 60%)',
                  borderRadius: '50%', animation: 'windowLight 30s ease-in-out infinite',
                }} />
                {/* Secondary cool light (depth contrast) */}
                <div style={{
                  position: 'absolute', bottom: '15%', right: '12%', width: 200, height: 200,
                  background: 'radial-gradient(circle, rgba(100,150,255,0.02) 0%, transparent 60%)',
                  borderRadius: '50%', animation: 'windowLight 25s ease-in-out infinite reverse',
                }} />
                {/* Vignette for depth */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.15) 100%)',
                }} />
              </div>
            </motion.div>
          )}

          {/* CHECKLIST MODE */}
          {currentMode === 'checklist' && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13 }}>Loading Checklist...</div>}>
                <ChecklistMode agentStatus={agentStatus} isMobile={isMobile} data={data} />
              </Suspense>
            </motion.div>
          )}

          {/* MEGABOARD MODE */}
          {currentMode === 'megaboard' && (
            <motion.div
              key="megaboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', height: '100%' }}
            >
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13 }}>Loading Megaboard...</div>}>
                <MegaboardMode agentStatus={agentStatus} data={data} isMobile={isMobile} />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mini-map - only in Game mode, ON by default */}
      {showMinimap && currentMode === 'game' && (
        <MiniMap
          rooms={GRID_SPEC.rooms}
          agentStatus={agentStatus}
          selectedRoom={selectedRoom}
          cameraTarget={cameraTarget}
          cameraZoom={cameraZoom}
          isOverview={isOverview}
          onRoomClick={handleMinimapRoomClick}
        />
      )}

      {/* Game HUD (Sims x Chaart) - bottom strip with project pills + agent status */}
      {currentMode === 'game' && (
        <Suspense fallback={null}>
          <GameHUD
            agentStatus={agentStatus}
            throughput={data?.throughput}
            onAgentClick={(slug) => {
              setCameraTarget(slug)
              setSelectedRoom(slug)
              setIsOverview(false)
              setCameraZoom(1.6)
            }}
            isMobile={isMobile}
          />
        </Suspense>
      )}

      {/* Mobile mode tab bar */}
      {isMobile && (
        <MobileModeBar currentMode={currentMode} onModeSwitch={handleModeSwitch} />
      )}

      {/* Mobile bottom sheet (game mode only) */}
      {isMobile && currentMode === 'game' && (
        <AnimatePresence>
          {selectedRoom && ROOM_MAP[selectedRoom] && ROOM_MAP[selectedRoom].agent !== null && (
            <MobileBottomSheet
              key={selectedRoom}
              room={ROOM_MAP[selectedRoom]}
              agent={AGENTS.find(a => a.slug === selectedRoom)}
              agentStatus={agentStatus[selectedRoom]}
              onClose={() => { setSelectedRoom(null); setIsOverview(true) }}
              onChat={handleChat}
              onViewTasks={() => { handleModeSwitch('checklist') }}
            />
          )}
        </AnimatePresence>
      )}

      {/* Notification toasts */}
      <NotificationToast
        notifications={visibleNotifications}
        onDismiss={handleDismissNotification}
        onClickNotification={(n) => {
          handleDismissNotification(n.id)
          if (n.agentSlug) {
            setChatAgent(n.agentSlug)
            setSelectedRoom(n.agentSlug)
            setCameraTarget(n.agentSlug)
            if (currentMode !== 'game') handleModeSwitch('game')
          }
        }}
        queuedCount={queuedNotificationCount}
      />

      {/* Chat bar (bottom) */}
      <ChatBar
        activeAgent={chatAgent}
        onSelectAgent={setChatAgent}
        agentStatus={agentStatus}
        isMobile={isMobile}
      />

      {/* Keyboard shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>

      {/* Error / connection indicator */}
      {error && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 112 : 80, left: showMinimap && currentMode === 'game' ? 192 : 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#EF4444', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 12px', borderRadius: 4, zIndex: 50,
          transition: 'left 200ms ease',
        }}>
          {IS_LOCAL ? 'Local file read failed. Is AOM-EA accessible?' : 'Status update failed. Showing cached data.'}
        </div>
      )}

      {/* WebSocket connection indicator */}
      {wsHook.isReconnecting && (
        <div style={{
          position: 'fixed', bottom: isMobile ? 112 : 80,
          right: 16, zIndex: 50,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          color: '#F59E0B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 12px', borderRadius: 4,
        }}>
          WebSocket reconnecting...
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div style={{ position: 'fixed', inset: 0, background: PALETTE.background, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={24} style={{ color: '#FFD87A', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#6B7280', fontSize: 12, fontFamily: 'Space Grotesk, sans-serif' }}>
              {IS_LOCAL ? 'Loading from local files...' : 'Loading your office...'}
            </span>
          </div>
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @keyframes windowLight {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
          50% { transform: translate(20px, -10px) scale(1.1); opacity: 0.06; }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes dotPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes awayPulse { 0%,100%{opacity:0.8} 50%{opacity:1.0} }
        @keyframes dustDrift {
          0% { transform: translateY(0) translateX(0); opacity: 0.03; }
          50% { transform: translateY(-8px) translateX(4px); opacity: 0.06; }
          100% { transform: translateY(-16px) translateX(-2px); opacity: 0; }
        }
        @keyframes characterGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes statusPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2D3748; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #4A5568; }
        .hud-scroll::-webkit-scrollbar { width: 4px; }
        .hud-scroll::-webkit-scrollbar-thumb { background: #4A5568; }
        /* PWA safe areas */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
        }
        /* Touch action for game viewport */
        .game-viewport { touch-action: none; }
      `}</style>
    </div>
  )
}
