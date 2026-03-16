import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, X, ChevronUp, ChevronDown,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, GitCommit, Terminal, Maximize2, Minimize2,
  ListTodo, FolderKanban, Calendar, Plus, ArrowLeft, Map,
  ZoomIn, ZoomOut, Home,
} from 'lucide-react'
import { GRID_SPEC, ROOM_MAP, AGENTS } from './gridSpec.js'
import { createChatConnection } from './chatConnection.js'
import { renderFurniture } from './FurnitureRenderer.jsx'

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

function useKeyboardShortcuts({ onToggleHud, onToggleChat, onToggleMinimap, onEscape, onAgentSelect, onToggleAnimations, onZoomIn, onZoomOut, onOverview }) {
  useEffect(() => {
    const handler = (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') { e.target.blur(); onEscape?.() }
        return
      }
      switch (e.key.toLowerCase()) {
        case 't': onToggleHud?.(); break
        case 'enter': onToggleChat?.(); break
        case 'escape': onEscape?.(); break
        case 'm': onToggleMinimap?.(); break
        case ' ': e.preventDefault(); onToggleAnimations?.(); break
        case '/': onToggleChat?.(); break
        case '=': case '+': onZoomIn?.(); break
        case '-': onZoomOut?.(); break
        case 'o': onOverview?.(); break
        default:
          if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1
            onAgentSelect?.(idx)
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleHud, onToggleChat, onToggleMinimap, onEscape, onAgentSelect, onToggleAnimations, onZoomIn, onZoomOut, onOverview])
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

// ---- AGENT CHARACTER (Pixel Art Sprite) ------------------------------------
function AgentCharacter({ x, y, color, status, agentSlug, isSpeaking }) {
  const spriteState = getSpriteState(status, isSpeaking)
  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'

  // Sprite size in SVG space - fits within room
  const spriteW = 28
  const spriteH = 28
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)

  if (!hasSpriteFile) {
    // Fallback: colored circle for agents without sprites
    return (
      <g>
        <ellipse cx={x} cy={y + 6} rx={5} ry={2} fill="#000" opacity={0.2} />
        <circle cx={x} cy={y - 4} r={6} fill={color} opacity={0.9} />
        <circle cx={x - 1.5} cy={y - 4.5} r={1} fill="#FFF" opacity={0.9} />
        <circle cx={x + 1.5} cy={y - 4.5} r={1} fill="#FFF" opacity={0.9} />
      </g>
    )
  }

  const spriteSrc = `/corner/sprites/${agentSlug}-${spriteState}.png`

  return (
    <g>
      {/* Shadow beneath sprite */}
      <ellipse cx={x} cy={y + 8} rx={10} ry={3} fill="#000" opacity={0.15} />

      {/* Sprite image - foreignObject for HTML img inside SVG */}
      <foreignObject
        x={x - spriteW / 2} y={y - spriteH + 4}
        width={spriteW} height={spriteH}
        style={{ overflow: 'hidden', pointerEvents: 'none' }}
      >
        <img
          src={spriteSrc}
          alt=""
          style={{
            width: spriteW * 2,
            height: spriteH * 2,
            objectFit: 'cover',
            objectPosition: '0 0',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      </foreignObject>

      {/* Working glow pulse */}
      {isWorking && (
        <circle cx={x} cy={y - spriteH / 2 + 4} r={16} fill={color} opacity={0.08}>
          <animate attributeName="r" values="14;18;14" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.08;0.03;0.08" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Thinking dots above sprite */}
      {isThinking && (
        <g>{[0, 1, 2].map(i => (
          <circle key={i} cx={x + 10 + i * 4} cy={y - spriteH - 2} r={1.5} fill="#F59E0B" opacity={0.6}>
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="0.8s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
          </circle>
        ))}</g>
      )}

      {/* Done checkmark */}
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

// ---- ISOMETRIC ROOM --------------------------------------------------------
function IsometricRoom({ room, agent, agentStatus, isHovered, isSelected, onClick, cellSize }) {
  if (!room) return null

  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const isActive = status === 'WORKING'
  const hasAgent = room.agent !== null

  const roomW = cellSize * room.size.cols
  const roomH = cellSize * room.size.rows

  // Agent color for glow on hover
  const agentColor = room.agentColor || '#FFD87A'

  // Room dimming: Steffen C2.2 spec 4D - 40% inactive, 100% active
  const brightness = isActive ? 1.0 : (status === 'DONE' ? 1.0 : (status === 'IDLE' ? 0.4 : 0.6))

  // Check if this room has a pixel art render
  const hasRoomRender = ROOMS_WITH_RENDERS.includes(room.id)

  // Per-room lighting overlay
  const roomLightOverlay = ROOM_LIGHT_OVERLAYS[room.id]

  return (
    <g
      onClick={() => hasAgent && onClick?.(room.id)}
      style={{ cursor: hasAgent ? 'pointer' : 'default', filter: `brightness(${brightness})`, transition: 'filter 400ms ease' }}
    >
      {/* Room background: pixel art render or SVG fallback */}
      {hasRoomRender ? (
        <>
          {/* Pixel art room render as background (Option B per Steffen) */}
          <foreignObject x={0} y={0} width={roomW} height={roomH} style={{ overflow: 'hidden' }}>
            <img
              src={`/corner/rooms/${room.id === 'main-hall' ? 'main-hall' : room.id + '-room'}.png`}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                imageRendering: 'auto',
              }}
            />
          </foreignObject>

          {/* Per-room lighting personality overlay */}
          {roomLightOverlay && (
            <rect x={0} y={0} width={roomW} height={roomH} fill={roomLightOverlay} style={{ pointerEvents: 'none' }} />
          )}

          {/* Bobby's purple LED underglow (C2.2 spec 4A) */}
          {room.id === 'bobby' && (
            <rect x={0} y={roomH - 8} width={roomW} height={8}
              fill="url(#bobbyLedGlow)" opacity={isActive ? 0.6 : 0.35}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </>
      ) : (
        <>
          {/* SVG fallback for rooms without renders */}
          <rect x={0} y={0} width={roomW} height={roomH}
            fill={room.floorColor || '#C4956A'}
            stroke={room.floor?.startsWith('tile') ? '#6B7D8F' : '#7A5838'}
            strokeWidth={0.5}
          />
          {/* Config-driven SVG furniture (fallback) */}
          {renderFurniture(room.id, roomW, roomH, isActive)}

          {/* Per-room lighting overlay */}
          {roomLightOverlay && (
            <rect x={0} y={0} width={roomW} height={roomH} fill={roomLightOverlay} style={{ pointerEvents: 'none' }} />
          )}
        </>
      )}

      {/* Agent sprite character */}
      {hasAgent && agent && (
        <AgentCharacter
          x={roomW * 0.55}
          y={roomH * 0.7}
          color={agentColor}
          status={status}
          agentSlug={room.id}
        />
      )}

      {/* Active indicator dot (top-right) - Steffen spec: pulsing-dot, 6px */}
      {hasAgent && (
        <circle cx={roomW - 10} cy={10} r={3}
          fill={isActive ? cfg.color : (room.statusColors?.[status === 'IDLE' ? 'idle' : 'active'] || cfg.color)}
          opacity={isActive ? 1 : 0.6}
        >
          {isActive && <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />}
        </circle>
      )}

      {/* Hover/selected glow overlay */}
      {(isHovered || isSelected) && hasAgent && (
        <rect x={0} y={0} width={roomW} height={roomH}
          fill={agentColor}
          opacity={isSelected ? 0.12 : 0.06}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Room border */}
      <rect x={0} y={0} width={roomW} height={roomH} fill="none"
        stroke={isSelected ? agentColor : (isHovered && hasAgent ? agentColor : PALETTE.exteriorWalls)}
        strokeWidth={isSelected ? 2 : 1}
        strokeOpacity={isHovered && hasAgent ? 0.6 : 1}
      />
      {/* Glow on hover per Steffen interactivity spec */}
      {isHovered && hasAgent && (
        <rect x={-2} y={-2} width={roomW + 4} height={roomH + 4} fill="none"
          stroke={agentColor} strokeWidth={1} strokeOpacity={0.15} rx={2}
          style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 4px ${agentColor})` }}
        />
      )}
    </g>
  )
}

// ---- NAMEPLATE (above room) with sprite avatar (C2.2 spec 4C) -------------
function RoomNameplate({ room, agentStatus, isHovered, cellSize }) {
  if (!room || room.agent === null) return null
  const status = agentStatus?.status || 'IDLE'
  const dotColor = status === 'WORKING' ? (room.statusColors?.active || '#22C55E')
    : status === 'WAITING' ? '#F59E0B'
    : (room.statusColors?.idle || '#6B7280')
  const pulse = status === 'WORKING' || status === 'WAITING'
  const task = agentStatus?.currentTask || ''
  const hasSprite = SPRITE_AGENTS.includes(room.id)

  const roomW = cellSize * room.size.cols
  const x = roomW / 2
  const y = -10
  const plateW = hasSprite ? 70 : 60
  const plateX = x - plateW / 2

  return (
    <g>
      {/* Nameplate background */}
      <rect x={plateX} y={y - 8} width={plateW} height={isHovered ? 24 : 16} rx={4}
        fill={PALETTE.nameplate.background} stroke={isHovered ? `${room.agentColor}4D` : PALETTE.nameplate.border} strokeWidth={1}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', transition: 'height 150ms ease' }}
      />
      {/* Tiny sprite avatar (16px) */}
      {hasSprite && (
        <foreignObject x={plateX + 3} y={y - 7} width={14} height={14} style={{ overflow: 'hidden', borderRadius: '50%' }}>
          <img
            src={`/corner/sprites/${room.id}-idle.png`}
            alt=""
            style={{
              width: 28,
              height: 28,
              objectFit: 'cover',
              objectPosition: '0 0',
              imageRendering: 'pixelated',
              display: 'block',
              borderRadius: '50%',
            }}
          />
        </foreignObject>
      )}
      {/* Status dot */}
      <circle cx={hasSprite ? plateX + 21 : x - 20} cy={y} r={3} fill={dotColor}>
        {pulse && <animate attributeName="r" values="3;4;3" dur={status === 'WAITING' ? '0.8s' : '1.5s'} repeatCount="indefinite" />}
      </circle>
      {/* Name */}
      <text x={hasSprite ? plateX + 27 : x - 14} y={y + 3} fill={PALETTE.nameplate.text}
        fontSize={GRID_SPEC.rendering.nameplateFontSize} fontWeight={isHovered ? 700 : GRID_SPEC.rendering.nameplateFontWeight}
        fontFamily={`${GRID_SPEC.rendering.nameplateFont}, sans-serif`}
      >
        {room.agent}
      </text>
      {/* Task on hover */}
      {isHovered && task && (
        <text x={plateX + 3} y={y + 14} fill="#8A847C" fontSize={9}
          fontFamily="Space Grotesk, sans-serif" fontWeight={400}
        >
          {task.length > 22 ? task.slice(0, 22) + '...' : task}
        </text>
      )}
    </g>
  )
}

// ---- ISOMETRIC OFFICE (main game view) with CAMERA SYSTEM ------------------
function IsometricOffice({ agentStatus, onRoomClick, selectedRoom, hoveredRoom, setHoveredRoom, cameraTarget, cameraZoom, isOverview }) {
  const GRID_COLS = 4  // 8 grid cols / 2 cols per room = 4 room columns
  const GRID_ROWS = 4  // max 4 rows

  const svgW = CELL_SIZE * GRID_COLS + 60
  const svgH = CELL_SIZE * GRID_ROWS + 80

  const rooms = GRID_SPEC.rooms

  // Calculate camera translation to center the target room
  // The isometric transform rotates the entire container, so we translate the SVG inside
  // to position the target room at the center of the viewport
  const targetCenter = getRoomCenter(cameraTarget || DEFAULT_AGENT)

  // Center of the SVG world
  const worldCenterX = svgW / 2 - 30
  const worldCenterY = svgH / 2

  // Offset to move target room to center (in SVG space, pre-isometric-transform)
  const offsetX = worldCenterX - targetCenter.x
  const offsetY = worldCenterY - targetCenter.y

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', // HIDDEN not auto - camera controls what you see
      position: 'relative',
    }}>
      <div style={{
        transform: `scale(${cameraZoom}) rotateX(55deg) rotateZ(-45deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transformOrigin: 'center center',
        filter: 'drop-shadow(0 20px 60px rgba(255,216,122,0.06))',
      }}>
        <svg
          width={svgW} height={svgH}
          viewBox={`-30 -30 ${svgW} ${svgH}`}
          style={{ overflow: 'visible' }}
        >
          {/* Inner translate group for camera panning */}
          <g style={{
            transform: isOverview ? 'translate(0, 0)' : `translate(${offsetX}px, ${offsetY}px)`,
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <defs>
              <radialGradient id="buildingGlow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#FFD87A" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#FFD87A" stopOpacity="0" />
              </radialGradient>
              {/* Bobby's purple LED underglow gradient (C2.2 spec 4A) */}
              <linearGradient id="bobbyLedGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9C27B0" stopOpacity="0" />
                <stop offset="40%" stopColor="#9C27B0" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#9C27B0" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Ground plane shadow */}
            <ellipse cx={svgW / 2 - 30} cy={svgH / 2 + 30} rx={svgW * 0.55} ry={svgH * 0.3}
              fill={PALETTE.groundPlane} opacity={GRID_SPEC.rendering.shadowOpacity} />

            {/* Ground glow */}
            <rect x={-50} y={-50} width={svgW + 50} height={svgH + 50} fill="url(#buildingGlow)" />

            {/* Render rooms - sorted by row then col for z-order */}
            {rooms.map(room => {
              const pixelX = (room.position.col / 2) * CELL_SIZE
              const pixelY = room.position.row * CELL_SIZE
              const agent = AGENTS.find(a => a.slug === room.id)

              return (
                <g key={room.id}
                  transform={`translate(${pixelX}, ${pixelY})`}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                >
                  {/* Nameplate above room */}
                  <RoomNameplate
                    room={room}
                    agentStatus={agentStatus[room.id]}
                    isHovered={hoveredRoom === room.id}
                    cellSize={CELL_SIZE}
                  />

                  <IsometricRoom
                    room={room}
                    agent={agent}
                    agentStatus={agentStatus[room.id]}
                    isHovered={hoveredRoom === room.id}
                    isSelected={selectedRoom === room.id}
                    onClick={onRoomClick}
                    cellSize={CELL_SIZE}
                  />
                </g>
              )
            })}

            {/* Exterior walls - thick border around building perimeter */}
            <line x1={0} y1={0} x2={CELL_SIZE * 4} y2={0} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={CELL_SIZE * 4} y1={0} x2={CELL_SIZE * 4} y2={CELL_SIZE * 3} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={CELL_SIZE * 4} y1={CELL_SIZE * 3} x2={CELL_SIZE * 3} y2={CELL_SIZE * 3} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={CELL_SIZE * 3} y1={CELL_SIZE * 3} x2={CELL_SIZE * 3} y2={CELL_SIZE * 4} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={CELL_SIZE * 3} y1={CELL_SIZE * 4} x2={CELL_SIZE * 1} y2={CELL_SIZE * 4} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={CELL_SIZE * 1} y1={CELL_SIZE * 4} x2={CELL_SIZE * 1} y2={CELL_SIZE * 3} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={CELL_SIZE * 1} y1={CELL_SIZE * 3} x2={0} y2={CELL_SIZE * 3} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />
            <line x1={0} y1={CELL_SIZE * 3} x2={0} y2={0} stroke={PALETTE.exteriorWalls} strokeWidth={GRID_SPEC.rendering.wallThicknessExterior} />

            {/* CORNER entrance sign */}
            <g transform={`translate(${CELL_SIZE * 2}, ${CELL_SIZE * 4 + 25})`}>
              <rect x={-35} y={-10} width={70} height={22} fill={GRID_SPEC.entrance.awningColor} rx={3} stroke={PALETTE.exteriorWalls} strokeWidth={1} />
              <text x={0} y={5} textAnchor="middle" fill={GRID_SPEC.entrance.signColor}
                fontSize={GRID_SPEC.entrance.signFontSize} fontFamily={`${GRID_SPEC.entrance.signFont}, sans-serif`}
                fontWeight={GRID_SPEC.entrance.signFontWeight} letterSpacing="0.05em">
                {GRID_SPEC.entrance.sign}
              </text>
            </g>

            {/* Path to entrance */}
            <rect x={CELL_SIZE * 1.7} y={CELL_SIZE * 4 + 2} width={CELL_SIZE * 0.6} height={18}
              fill={PALETTE.groundPlaneEdge} rx={2} opacity={0.5} />

            {/* Exterior bench */}
            <rect x={-15} y={CELL_SIZE * 1.5} width={8} height={20} fill="#5D4037" rx={1} opacity={0.4} />

            {/* Exterior tree */}
            <circle cx={CELL_SIZE * 4 + 20} cy={CELL_SIZE * 0.8} r={12} fill="#2E7D32" opacity={0.3} />
            <circle cx={CELL_SIZE * 4 + 20} cy={CELL_SIZE * 0.8} r={8} fill="#388E3C" opacity={0.25} />
            <rect x={CELL_SIZE * 4 + 18} y={CELL_SIZE * 0.8 + 8} width={4} height={8} fill="#5D4037" opacity={0.3} rx={1} />
          </g>
        </svg>
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

// ---- NOTIFICATION TOAST (top-right) ----------------------------------------
function NotificationToast({ notifications, onDismiss, onClickNotification }) {
  return (
    <div style={{ position: 'fixed', top: 64, right: 16, zIndex: 45, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence>
        {notifications.slice(0, 3).map(n => (
          <motion.div
            key={n.id}
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            onClick={() => onClickNotification?.(n)}
            style={{
              width: 320, cursor: 'pointer',
              background: 'rgba(10, 15, 30, 0.95)',
              border: `1px solid ${n.agentColor || '#E85D26'}33`,
              borderLeft: `3px solid ${n.agentColor || '#E85D26'}`,
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <SpriteAvatar agentSlug={n.agentSlug} size={24} borderColor={n.agentColor || '#E85D26'} />
              <span style={{ color: n.agentColor || '#E85D26', fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>{n.agentName}</span>
              <span style={{ marginLeft: 'auto', color: '#6B7280', fontSize: 10, fontFamily: 'Space Grotesk, sans-serif' }}>{n.time}</span>
            </div>
            <div style={{ color: '#F0ECE6', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {n.message}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ---- TASK HUD (top drawer) - aligned to Steffen c2-hud-spec ----------------
function TaskHUD({ data, isOpen, onToggle, selectedAgent, isMobile }) {
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 35,
    }}>
      {/* Collapsed bar: 48px */}
      <div style={{
        height: 48,
        background: 'rgba(10, 15, 30, 0.85)',
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
        </div>

        {/* Center: Tabs */}
        <div style={{ display: 'flex', gap: isMobile ? 16 : 28, overflowX: isMobile ? 'auto' : 'visible' }}>
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => { setTab(t.id); if (!isOpen) onToggle() }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: active ? PALETTE.signText : '#6B7280',
                  borderBottom: active ? `2px solid ${underlineColor}` : '2px solid transparent',
                  fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '14px 0', transition: 'color 150ms ease',
                }}
                onMouseEnter={e => { if (!active) e.target.style.color = '#A0A0A0' }}
                onMouseLeave={e => { if (!active) e.target.style.color = '#6B7280' }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Right: Expand chevron */}
        <button onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, transition: 'color 150ms' }}
          onMouseEnter={e => e.target.style.color = PALETTE.signText}
          onMouseLeave={e => e.target.style.color = '#6B7280'}
        >
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease' }} />
        </button>
      </div>

      {/* Expanded drawer: 280px */}
      <AnimatePresence>
        {isOpen && (
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.15 }}
              style={{ padding: '16px 20px 20px', height: '100%', overflowY: 'auto' }}
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
      <button onClick={() => setCameraZoom(z => Math.min(2.0, z + 0.15))}
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
  const [showMinimap, setShowMinimap] = useState(true) // ON by default now (zoomed in needs minimap)
  const [notifications, setNotifications] = useState([])

  // CAMERA STATE: zoomed in on main agent by default
  const [cameraTarget, setCameraTarget] = useState(DEFAULT_AGENT)
  const [cameraZoom, setCameraZoom] = useState(1.6) // Zoomed in: room fills ~60% viewport
  const [isOverview, setIsOverview] = useState(false) // false = zoomed in, true = see all

  const { data, error, loading } = useDashboardData()
  const isMobile = useIsMobile()

  // Preload all idle sprites for instant display
  usePreloadSprites()

  // URL-based agent selection
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/dashboard\/agent\/(.+)/)
    if (match) {
      const slug = match[1]
      setSelectedRoom(slug)
      setChatAgent(slug)
      setCameraTarget(slug) // Camera moves to URL agent
    }
  }, [])

  // Update URL
  useEffect(() => {
    if (chatAgent) {
      window.history.replaceState(null, '', `/dashboard/agent/${chatAgent}`)
    } else {
      window.history.replaceState(null, '', '/dashboard')
    }
  }, [chatAgent])

  // Agent status lookup
  const agentStatus = useMemo(() => {
    if (!data?.agents) return {}
    const map = {}
    for (const a of data.agents) map[a.slug] = a
    return map
  }, [data])

  // When overview mode changes, adjust zoom
  useEffect(() => {
    if (isOverview) {
      setCameraZoom(0.7) // Zoomed out to see everything
    } else {
      setCameraZoom(1.6) // Zoomed in
    }
  }, [isOverview])

  const handleRoomClick = (roomId) => {
    const room = ROOM_MAP[roomId]
    if (!room || room.agent === null) return

    // Always move camera to clicked room
    setCameraTarget(roomId)
    setIsOverview(false)

    if (roomId === selectedRoom) {
      // Double click / already selected -> open chat
      setChatAgent(roomId)
    } else {
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
  }

  // Mini-map room click -> move camera
  const handleMinimapRoomClick = (roomId) => {
    setCameraTarget(roomId)
    setSelectedRoom(roomId)
    setIsOverview(false)
    setCameraZoom(1.6)
  }

  // Keyboard shortcuts
  const agentSlugs = AGENTS.filter(a => ROOM_MAP[a.slug]).map(a => a.slug)
  useKeyboardShortcuts({
    onToggleHud: () => setHudOpen(h => !h),
    onToggleChat: () => {
      // Focus chat or open it
    },
    onToggleMinimap: () => setShowMinimap(m => !m),
    onEscape: () => { setSelectedRoom(null); setChatAgent(null); setHudOpen(false) },
    onAgentSelect: (idx) => {
      if (idx < agentSlugs.length) {
        const slug = agentSlugs[idx]
        setSelectedRoom(slug)
        setCameraTarget(slug)
        setIsOverview(false)
      }
    },
    onZoomIn: () => setCameraZoom(z => Math.min(2.0, z + 0.15)),
    onZoomOut: () => setCameraZoom(z => Math.max(0.5, z - 0.15)),
    onOverview: () => setIsOverview(o => !o),
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
      {/* Task HUD (top) */}
      <TaskHUD data={data} isOpen={hudOpen} onToggle={() => setHudOpen(!hudOpen)} selectedAgent={selectedRoom} isMobile={isMobile} />

      {/* Main game area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', perspective: '1000px', paddingTop: 48 }}>
        <IsometricOffice
          agentStatus={agentStatus}
          onRoomClick={handleRoomClick}
          selectedRoom={selectedRoom}
          hoveredRoom={hoveredRoom}
          setHoveredRoom={setHoveredRoom}
          cameraTarget={cameraTarget}
          cameraZoom={cameraZoom}
          isOverview={isOverview}
        />

        {/* Camera controls (floating) */}
        <CameraControls
          cameraZoom={cameraZoom}
          setCameraZoom={setCameraZoom}
          isOverview={isOverview}
          setIsOverview={setIsOverview}
          cameraTarget={cameraTarget}
          setCameraTarget={setCameraTarget}
          onHomeRoom={handleHomeRoom}
        />

        {/* Room detail sidebar */}
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

        {/* Window light animation overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(255,216,122,0.02) 0%, transparent 70%)' }}>
          <div style={{
            position: 'absolute', top: '10%', left: '10%', width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(255,183,77,0.04) 0%, transparent 70%)',
            borderRadius: '50%', animation: 'windowLight 30s ease-in-out infinite',
          }} />
        </div>
      </div>

      {/* Mini-map - ON by default since we're zoomed in */}
      {showMinimap && (
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

      {/* Notification toasts */}
      <NotificationToast notifications={notifications} onClickNotification={(n) => { setChatAgent(n.agentSlug); setSelectedRoom(n.agentSlug); setCameraTarget(n.agentSlug) }} />

      {/* Chat bar (bottom) */}
      <ChatBar
        activeAgent={chatAgent}
        onSelectAgent={setChatAgent}
        agentStatus={agentStatus}
        isMobile={isMobile}
      />

      {/* Error / connection indicator */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 80, left: showMinimap ? 192 : 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#EF4444', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 12px', borderRadius: 4, zIndex: 50,
          transition: 'left 200ms ease',
        }}>
          {IS_LOCAL ? 'Local file read failed. Is AOM-EA accessible?' : 'Status update failed. Showing cached data.'}
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
      `}</style>
    </div>
  )
}
