import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, X, ChevronUp, ChevronDown,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, GitCommit, Terminal, Maximize2, Minimize2,
  ListTodo, FolderKanban, Calendar, Plus, ArrowLeft,
} from 'lucide-react'

// ---- CONFIG ----------------------------------------------------------------
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'

const AGENTS = [
  { slug: 'bobby',   name: 'Bobby',   role: 'Web Dev',           color: '#9C27B0', monitorColor: '#CE93D8', floor: 'wood' },
  { slug: 'colton',  name: 'Colton',  role: 'Backup Builder',    color: '#7E57C2', monitorColor: '#B39DDB', floor: 'wood' },
  { slug: 'cleo',    name: 'Cleo',    role: 'Content Creator',   color: '#FF7043', monitorColor: '#FFAB91', floor: 'wood' },
  { slug: 'tony',    name: 'Tony',    role: 'Social Media',      color: '#EC407A', monitorColor: '#F48FB1', floor: 'wood' },
  { slug: 'elon',    name: 'Elon',    role: 'Systems Engineer',  color: '#4CAF50', monitorColor: '#81C784', floor: 'tile' },
  { slug: 'elmo',    name: 'Elmo',    role: 'QA Gate',           color: '#EF5350', monitorColor: '#EF9A9A', floor: 'tile' },
  { slug: 'steffen', name: 'Steffen', role: 'Creative Director', color: '#FFB74D', monitorColor: '#FFE0B2', floor: 'wood' },
  { slug: 'alex',    name: 'Alex',    role: 'Strategist',        color: '#42A5F5', monitorColor: '#90CAF9', floor: 'wood' },
  { slug: 'steve',   name: 'Steve',   role: 'AI Advisory Lead',  color: '#26A69A', monitorColor: '#80CBC4', floor: 'wood' },
  { slug: 'jacob',   name: 'Jacob',   role: 'Outreach',          color: '#FFA726', monitorColor: '#FFCC80', floor: 'wood' },
  { slug: 'mom',     name: 'Mom',     role: 'Orchestrator',      color: '#AB47BC', monitorColor: '#CE93D8', floor: 'wood' },
  { slug: 'paige',   name: 'Paige',   role: 'Client Success',    color: '#66BB6A', monitorColor: '#A5D6A7', floor: 'wood' },
  { slug: 'pixel',   name: 'Pixel',   role: 'Extension',         color: '#78909C', monitorColor: '#B0BEC5', floor: 'wood' },
]

// Floor plan grid positions (col, row) - matches Steffen's ASCII layout
// Grid unit = 1 room width. L-shaped building.
const FLOOR_PLAN = {
  patrik:  { col: 0, row: 0, w: 1, h: 1, label: 'Corner Office', isPatrik: true },
  mom:     { col: 1, row: 0, w: 1, h: 1, label: 'Command Center' },
  alex:    { col: 2, row: 0, w: 1, h: 1, label: 'Strategy Room' },
  steve:   { col: 3, row: 0, w: 1, h: 1, label: 'Advisory Lab' },
  steffen: { col: 0, row: 1, w: 1, h: 1, label: 'Design Studio' },
  hall:    { col: 1, row: 1, w: 2, h: 1, label: 'Main Hall', isHall: true },
  jacob:   { col: 3, row: 1, w: 1, h: 1, label: 'Outreach Office' },
  bobby:   { col: 0, row: 2, w: 1, h: 1, label: 'Dev Lab' },
  colton:  { col: 1, row: 2, w: 1, h: 1, label: 'Builder Bay' },
  cleo:    { col: 2, row: 2, w: 1, h: 1, label: 'Content Studio' },
  tony:    { col: 3, row: 2, w: 1, h: 1, label: 'Social Hub' },
  elmo:    { col: 1, row: 3, w: 1, h: 1, label: 'QA Lab' },
  elon:    { col: 2, row: 3, w: 1, h: 1, label: 'Server Room' },
}

const STATUS_CONFIG = {
  WORKING:  { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',  label: 'Working',  pulseColor: '#22C55E' },
  IDLE:     { color: '#78716C', bg: 'rgba(120,113,108,0.15)', label: 'Idle',     pulseColor: '#78716C' },
  BLOCKED:  { color: '#EF4444', bg: 'rgba(239,68,68,0.15)',  label: 'Blocked',  pulseColor: '#EF4444' },
  DONE:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'Done',     pulseColor: '#3B82F6' },
  WAITING:  { color: '#EAB308', bg: 'rgba(234,179,8,0.15)',  label: 'Waiting',  pulseColor: '#EAB308' },
  PAUSED:   { color: '#F97316', bg: 'rgba(249,115,22,0.15)', label: 'Paused',   pulseColor: '#F97316' },
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

function useDashboardData(interval = 30000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastRaw = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/status')
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
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [fetchData, interval])

  return { data, error, loading }
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
  return `${days}d ago`
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
    <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360 }} className={shake ? 'animate-shake' : ''}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ color: '#FFD87A', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>CORNER</div>
          <h1 style={{ color: '#F5F0EB', fontSize: 24, fontWeight: 900, fontStyle: 'italic', fontFamily: "'Inter Tight', sans-serif", letterSpacing: '-0.02em' }}>Your Office</h1>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%', background: '#141822', border: '1px solid #2A3040', color: '#F5F0EB',
            padding: '12px 16px', fontSize: 16, fontFamily: 'JetBrains Mono, monospace',
            outline: 'none', borderRadius: 2,
          }}
        />
        <button type="submit" style={{
          width: '100%', marginTop: 12, background: '#E85D26', color: 'white',
          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 13,
          padding: '12px', border: 'none', cursor: 'pointer', borderRadius: 2,
        }}>
          Enter
        </button>
      </form>
      <style>{`.animate-shake { animation: shake 0.5s ease-in-out; }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }`}</style>
    </div>
  )
}

// ---- ISOMETRIC ROOM --------------------------------------------------------
// Each room renders as an isometric box with floor, walls, furniture, and agent
function IsometricRoom({ room, slug, agent, agentStatus, isHovered, isSelected, onClick, cellSize }) {
  const floorPlan = FLOOR_PLAN[slug]
  if (!floorPlan) return null

  const status = agentStatus?.status || 'IDLE'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const isActive = status === 'WORKING'
  const isPatrik = floorPlan.isPatrik
  const isHall = floorPlan.isHall

  // Room dimensions in pixels
  const roomW = cellSize * (floorPlan.w || 1)
  const roomH = cellSize * (floorPlan.h || 1)
  const wallHeight = cellSize * 0.55

  // Floor colors
  const floorColors = {
    wood: { base: '#C4956A', dark: '#A87B52', light: '#D4A87A' },
    tile: { base: '#8B9DAF', dark: '#6B7D8F', light: '#9BADBF' },
  }
  const floorType = agent?.floor || (isHall ? 'wood' : 'wood')
  const fc = floorColors[floorType] || floorColors.wood

  // Room-specific lighting
  const lightColor = isActive ? cfg.pulseColor : (agent?.monitorColor || '#FFB74D')
  const lightIntensity = isActive ? 0.3 : 0.15
  const windowGlow = isPatrik || floorPlan.row === 0 || floorPlan.col === 0 || floorPlan.col === 3

  return (
    <g
      onClick={() => !isHall && onClick && onClick(slug)}
      style={{ cursor: isHall ? 'default' : 'pointer' }}
    >
      {/* Floor */}
      <rect
        x={0} y={0} width={roomW} height={roomH}
        fill={fc.base}
        stroke={fc.dark}
        strokeWidth={0.5}
      />

      {/* Floor pattern - wood grain or tiles */}
      {floorType === 'wood' && (
        <>
          {Array.from({ length: Math.floor(roomW / 12) }).map((_, i) => (
            <line key={`grain-${i}`} x1={i * 12 + 6} y1={0} x2={i * 12 + 6} y2={roomH}
              stroke={fc.dark} strokeWidth={0.3} opacity={0.3} />
          ))}
        </>
      )}
      {floorType === 'tile' && (
        <>
          {Array.from({ length: Math.floor(roomW / 16) }).map((_, i) => (
            <React.Fragment key={`tile-${i}`}>
              <line x1={i * 16} y1={0} x2={i * 16} y2={roomH} stroke={fc.dark} strokeWidth={0.5} opacity={0.4} />
              {Array.from({ length: Math.floor(roomH / 16) }).map((_, j) => (
                <line key={`tile-h-${j}`} x1={0} y1={j * 16} x2={roomW} y2={j * 16} stroke={fc.dark} strokeWidth={0.5} opacity={0.4} />
              ))}
            </React.Fragment>
          ))}
        </>
      )}

      {/* Room ambient glow */}
      <rect
        x={0} y={0} width={roomW} height={roomH}
        fill={lightColor}
        opacity={lightIntensity}
      />

      {/* Window light spill from exterior walls */}
      {windowGlow && (
        <rect
          x={2} y={2} width={roomW - 4} height={roomH * 0.3}
          fill="#FFD87A"
          opacity={0.08}
          rx={2}
        />
      )}

      {/* Agent-specific furniture */}
      {!isHall && !isPatrik && agent && (
        <RoomFurniture slug={slug} roomW={roomW} roomH={roomH} agent={agent} isActive={isActive} />
      )}

      {/* Patrik's room furniture */}
      {isPatrik && (
        <PatrikRoomFurniture roomW={roomW} roomH={roomH} />
      )}

      {/* Main Hall furniture */}
      {isHall && (
        <MainHallFurniture roomW={roomW} roomH={roomH} />
      )}

      {/* Agent character */}
      {!isHall && !isPatrik && agent && (
        <AgentCharacter
          x={roomW * 0.7}
          y={roomH * 0.65}
          color={agent.color}
          status={status}
          name={agent.name}
        />
      )}

      {/* Status indicator light */}
      {!isHall && !isPatrik && (
        <circle
          cx={roomW - 8}
          cy={8}
          r={4}
          fill={cfg.color}
          opacity={isActive ? 1 : 0.6}
        >
          {isActive && (
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          )}
        </circle>
      )}

      {/* Room label */}
      <text
        x={roomW / 2}
        y={roomH - 6}
        textAnchor="middle"
        fill="#F5F0EB"
        fontSize={9}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={700}
        letterSpacing="0.05em"
        opacity={0.85}
      >
        {isPatrik ? 'PATRIK' : isHall ? 'MAIN HALL' : (agent?.name?.toUpperCase() || slug.toUpperCase())}
      </text>

      {/* Hover/selected overlay */}
      {(isHovered || isSelected) && !isHall && (
        <rect
          x={0} y={0} width={roomW} height={roomH}
          fill={isSelected ? '#E85D26' : '#FFD87A'}
          opacity={isSelected ? 0.12 : 0.08}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Room border */}
      <rect
        x={0} y={0} width={roomW} height={roomH}
        fill="none"
        stroke={isSelected ? '#E85D26' : (isHovered && !isHall ? '#FFD87A' : '#4A5568')}
        strokeWidth={isSelected ? 2 : 1}
      />
    </g>
  )
}

// ---- ROOM FURNITURE COMPONENTS ---------------------------------------------
function RoomFurniture({ slug, roomW, roomH, agent, isActive }) {
  const deskW = roomW * 0.45
  const deskH = roomH * 0.22
  const deskX = roomW * 0.1
  const deskY = roomH * 0.15

  const monitorColor = agent.monitorColor || '#4FC3F7'

  switch (slug) {
    case 'elon':
      return (
        <g>
          {/* Server racks */}
          {[0, 1, 2].map(i => (
            <g key={`rack-${i}`}>
              <rect x={roomW * 0.55 + i * 18} y={roomH * 0.1} width={14} height={roomH * 0.55}
                fill="#1A1A2E" stroke="#2A2A3E" strokeWidth={0.5} />
              {/* Blinking lights */}
              {[0, 1, 2, 3, 4, 5].map(j => (
                <circle key={`light-${j}`}
                  cx={roomW * 0.55 + i * 18 + 7}
                  cy={roomH * 0.15 + j * (roomH * 0.07)}
                  r={1.5}
                  fill={j % 2 === 0 ? '#4CAF50' : '#2196F3'}
                >
                  <animate attributeName="opacity"
                    values={`${0.3 + Math.random() * 0.4};${0.8 + Math.random() * 0.2};${0.3 + Math.random() * 0.4}`}
                    dur={`${1 + Math.random() * 2}s`}
                    repeatCount="indefinite"
                    begin={`${Math.random() * 2}s`}
                  />
                </circle>
              ))}
            </g>
          ))}
          {/* Terminal */}
          <rect x={deskX} y={deskY} width={deskW * 0.8} height={deskH} fill="#2A2A1E" rx={1} />
          <rect x={deskX + 3} y={deskY + 2} width={deskW * 0.8 - 6} height={deskH * 0.65}
            fill="#0D1A0D" rx={1} />
          {/* Green terminal text */}
          {[0, 1, 2].map(i => (
            <rect key={`text-${i}`}
              x={deskX + 5} y={deskY + 4 + i * 4}
              width={deskW * 0.5 - Math.random() * 10} height={1.5}
              fill="#4CAF50" opacity={0.7}
            >
              {isActive && (
                <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
              )}
            </rect>
          ))}
          {/* Exposed conduit */}
          <path d={`M0,${roomH * 0.1} Q${roomW * 0.15},${roomH * 0.05} ${roomW * 0.3},${roomH * 0.1}`}
            fill="none" stroke="#4A5568" strokeWidth={1.5} opacity={0.5} />
        </g>
      )

    case 'bobby':
      return (
        <g>
          {/* Triple monitor setup */}
          <rect x={deskX} y={deskY} width={deskW * 1.2} height={deskH} fill="#5D4037" rx={1} />
          {[0, 1, 2].map(i => (
            <g key={`mon-${i}`}>
              <rect x={deskX + 2 + i * (deskW * 0.38)}
                y={deskY - deskH * 0.6}
                width={deskW * 0.35} height={deskH * 0.55}
                fill="#1A1A2E" stroke="#2A2A3E" strokeWidth={0.5} rx={1} />
              <rect x={deskX + 3 + i * (deskW * 0.38)}
                y={deskY - deskH * 0.55}
                width={deskW * 0.33} height={deskH * 0.45}
                fill={i === 1 ? '#1A0A2E' : '#0D1A2E'} rx={1} />
              {/* Code lines */}
              {[0, 1, 2].map(j => (
                <rect key={`code-${j}`}
                  x={deskX + 5 + i * (deskW * 0.38)}
                  y={deskY - deskH * 0.5 + j * 3.5}
                  width={deskW * 0.2 - Math.random() * 8}
                  height={1.2}
                  fill={['#CE93D8', '#4FC3F7', '#81C784'][i]}
                  opacity={0.6}
                />
              ))}
            </g>
          ))}
          {/* Purple LED underglow */}
          <rect x={deskX - 1} y={deskY + deskH} width={deskW * 1.22} height={3}
            fill="#9C27B0" opacity={0.4}>
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
          </rect>
          {/* Keyboard */}
          <rect x={deskX + deskW * 0.15} y={deskY + deskH * 0.3} width={deskW * 0.5} height={deskH * 0.35}
            fill="#333" rx={1} stroke="#444" strokeWidth={0.3} />
          {/* Headphones */}
          <ellipse cx={deskX + deskW * 1.05} cy={deskY + deskH * 0.4} rx={5} ry={3} fill="#333" stroke="#555" strokeWidth={0.5} />
        </g>
      )

    case 'steffen':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW} height={deskH} fill="#8D6E63" rx={1} />
          {/* iMac-style monitor */}
          <rect x={deskX + 5} y={deskY - deskH * 0.3} width={deskW * 0.6} height={deskH * 0.6}
            fill="#E0E0E0" rx={2} stroke="#BDBDBD" strokeWidth={0.5} />
          <rect x={deskX + 7} y={deskY - deskH * 0.25} width={deskW * 0.56} height={deskH * 0.45}
            fill="#1A237E" rx={1} />
          {/* Color wheel on screen */}
          <circle cx={deskX + 7 + deskW * 0.28} cy={deskY - deskH * 0.05} r={6}
            fill="none" stroke="#E85D26" strokeWidth={2} opacity={0.7} />
          <circle cx={deskX + 7 + deskW * 0.28} cy={deskY - deskH * 0.05} r={3}
            fill="#FFB74D" opacity={0.5} />
          {/* Mood board */}
          <rect x={roomW * 0.6} y={roomH * 0.05} width={roomW * 0.3} height={roomH * 0.35}
            fill="#5D4037" rx={1} />
          {[0, 1, 2, 3].map(i => (
            <rect key={`swatch-${i}`}
              x={roomW * 0.62 + (i % 2) * (roomW * 0.13)}
              y={roomH * 0.08 + Math.floor(i / 2) * (roomH * 0.14)}
              width={roomW * 0.1} height={roomH * 0.1}
              fill={['#E85D26', '#FFD87A', '#7C9A72', '#4FC3F7'][i]}
              opacity={0.7} rx={1}
            />
          ))}
          {/* Arched window indicator */}
          <path d={`M${roomW * 0.02},${roomH * 0.4} Q${roomW * 0.02},${roomH * 0.1} ${roomW * 0.12},${roomH * 0.1} L${roomW * 0.12},${roomH * 0.4}`}
            fill="none" stroke="#FFD87A" strokeWidth={1.5} opacity={0.3} />
        </g>
      )

    case 'cleo':
      return (
        <g>
          {/* Editing desk */}
          <rect x={deskX} y={deskY + 5} width={deskW} height={deskH} fill="#5D4037" rx={1} />
          {/* Editing monitors */}
          <rect x={deskX + 2} y={deskY - 8} width={deskW * 0.55} height={deskH * 0.65}
            fill="#1A1A1A" rx={1} />
          {/* Timeline bars on screen */}
          {[0, 1, 2, 3].map(i => (
            <rect key={`timeline-${i}`}
              x={deskX + 4}
              y={deskY - 6 + i * 3}
              width={deskW * 0.4 - i * 3}
              height={1.5}
              fill={['#FF7043', '#FFB74D', '#4FC3F7', '#81C784'][i]}
              opacity={0.6}
            />
          ))}
          {/* Camera on tripod */}
          <rect x={roomW * 0.65} y={roomH * 0.2} width={8} height={6} fill="#333" rx={1} />
          <line x1={roomW * 0.69} y1={roomH * 0.2 + 6} x2={roomW * 0.66} y2={roomH * 0.45} stroke="#555" strokeWidth={1} />
          <line x1={roomW * 0.69} y1={roomH * 0.2 + 6} x2={roomW * 0.72} y2={roomH * 0.45} stroke="#555" strokeWidth={1} />
          {/* Desk lamp */}
          <line x1={deskX + deskW + 5} y1={deskY + 10} x2={deskX + deskW + 12} y2={deskY - 2} stroke="#8D6E63" strokeWidth={1.5} />
          <circle cx={deskX + deskW + 12} cy={deskY - 4} r={4} fill="#FFB74D" opacity={0.4}>
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>
      )

    case 'mom':
      return (
        <g>
          {/* Standing desk */}
          <rect x={deskX} y={deskY} width={deskW * 0.9} height={deskH * 0.8} fill="#5D4037" rx={1} />
          {/* Multiple monitors */}
          {[0, 1].map(i => (
            <g key={`mon-${i}`}>
              <rect x={deskX + i * (deskW * 0.43)} y={deskY - deskH * 0.7}
                width={deskW * 0.4} height={deskH * 0.6} fill="#1A1A2E" rx={1} />
              {/* Agent status dots on screens */}
              {[0, 1, 2, 3].map(j => (
                <circle key={`dot-${j}`}
                  cx={deskX + i * (deskW * 0.43) + 6 + j * 6}
                  cy={deskY - deskH * 0.4}
                  r={2}
                  fill={['#22C55E', '#EAB308', '#EF4444', '#3B82F6'][j]}
                  opacity={0.7}
                />
              ))}
            </g>
          ))}
          {/* Pipeline board on wall */}
          <rect x={roomW * 0.55} y={roomH * 0.05} width={roomW * 0.35} height={roomH * 0.4}
            fill="#37474F" rx={1} />
          <text x={roomW * 0.72} y={roomH * 0.15} textAnchor="middle" fill="#F5F0EB" fontSize={5}
            fontFamily="JetBrains Mono, monospace" opacity={0.5}>PIPELINE</text>
          {/* Arrow flow */}
          {[0, 1, 2].map(i => (
            <rect key={`pipe-${i}`}
              x={roomW * 0.58 + i * (roomW * 0.1)}
              y={roomH * 0.22}
              width={roomW * 0.08} height={4}
              fill={['#E85D26', '#22C55E', '#3B82F6'][i]} opacity={0.5} rx={1}
            />
          ))}
        </g>
      )

    case 'alex':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.8} height={deskH} fill="#5D4037" rx={1} />
          {/* Laptop */}
          <rect x={deskX + 3} y={deskY} width={deskW * 0.4} height={deskH * 0.5}
            fill="#333" rx={1} />
          <rect x={deskX + 4} y={deskY + 1} width={deskW * 0.38} height={deskH * 0.35}
            fill="#1A237E" rx={1} />
          {/* Bookshelf */}
          <rect x={roomW * 0.6} y={roomH * 0.05} width={roomW * 0.3} height={roomH * 0.5}
            fill="#5D4037" rx={1} />
          {[0, 1, 2, 3].map(i => (
            <rect key={`book-${i}`}
              x={roomW * 0.62 + i * (roomW * 0.065)}
              y={roomH * 0.08}
              width={roomW * 0.05} height={roomH * 0.12}
              fill={['#1565C0', '#C62828', '#2E7D32', '#E65100'][i]} opacity={0.6} rx={0.5}
            />
          ))}
          {/* Globe */}
          <circle cx={deskX + deskW * 0.7} cy={deskY + 8} r={5} fill="none" stroke="#42A5F5" strokeWidth={0.8} opacity={0.4} />
          <line x1={deskX + deskW * 0.7 - 5} y1={deskY + 8} x2={deskX + deskW * 0.7 + 5} y2={deskY + 8}
            stroke="#42A5F5" strokeWidth={0.5} opacity={0.3} />
        </g>
      )

    case 'steve':
      return (
        <g>
          {/* Clean desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.8} height={deskH} fill="#5D4037" rx={1} />
          {/* Laptop showing schema */}
          <rect x={deskX + 3} y={deskY} width={deskW * 0.4} height={deskH * 0.5} fill="#333" rx={1} />
          <rect x={deskX + 4} y={deskY + 1} width={deskW * 0.38} height={deskH * 0.35} fill="#0D2137" rx={1} />
          {/* Architecture diagram lines on screen */}
          {[0, 1, 2].map(i => (
            <line key={`arch-${i}`}
              x1={deskX + 6} y1={deskY + 3 + i * 3}
              x2={deskX + 6 + deskW * 0.2 - i * 4} y2={deskY + 3 + i * 3}
              stroke="#26A69A" strokeWidth={0.8} opacity={0.5} />
          ))}
          {/* Architecture diagrams on wall */}
          <rect x={roomW * 0.5} y={roomH * 0.05} width={roomW * 0.4} height={roomH * 0.3}
            fill="#37474F" rx={1} />
          {/* Flow diagram */}
          <rect x={roomW * 0.55} y={roomH * 0.1} width={8} height={5} fill="#26A69A" opacity={0.5} rx={1} />
          <line x1={roomW * 0.55 + 8} y1={roomH * 0.125} x2={roomW * 0.55 + 14} y2={roomH * 0.125}
            stroke="#80CBC4" strokeWidth={0.5} opacity={0.4} />
          <rect x={roomW * 0.55 + 14} y={roomH * 0.1} width={8} height={5} fill="#26A69A" opacity={0.5} rx={1} />
          {/* Calculator */}
          <rect x={deskX + deskW * 0.55} y={deskY + 8} width={7} height={9} fill="#444" rx={1} />
        </g>
      )

    case 'jacob':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.9} height={deskH} fill="#5D4037" rx={1} />
          {/* Monitor with CRM */}
          <rect x={deskX + 2} y={deskY - 8} width={deskW * 0.55} height={deskH * 0.65} fill="#1A1A2E" rx={1} />
          {/* CRM rows */}
          {[0, 1, 2, 3].map(i => (
            <rect key={`crm-${i}`}
              x={deskX + 4} y={deskY - 6 + i * 3}
              width={deskW * 0.45} height={1.5}
              fill="#FFA726" opacity={0.4 + i * 0.1} />
          ))}
          {/* Phoenix map on wall */}
          <rect x={roomW * 0.6} y={roomH * 0.05} width={roomW * 0.3} height={roomH * 0.35}
            fill="#37474F" rx={1} />
          {/* Map pins */}
          {[0, 1, 2, 3, 4].map(i => (
            <circle key={`pin-${i}`}
              cx={roomW * 0.65 + Math.random() * roomW * 0.2}
              cy={roomH * 0.1 + Math.random() * roomH * 0.25}
              r={1.5} fill="#EF4444" opacity={0.6} />
          ))}
          {/* Phone */}
          <rect x={deskX + deskW * 0.65} y={deskY + 7} width={5} height={8} fill="#333" rx={1} />
          {/* Coffee cups */}
          <circle cx={deskX + deskW * 0.85} cy={deskY + 10} r={3} fill="#8D6E63" stroke="#6D4C41" strokeWidth={0.5} />
          <circle cx={deskX + deskW * 0.85 + 7} cy={deskY + 12} r={2.5} fill="#795548" stroke="#5D4037" strokeWidth={0.5} />
        </g>
      )

    case 'elmo':
      return (
        <g>
          {/* Clean desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 1.1} height={deskH} fill="#ECEFF1" rx={1} />
          {/* Dual monitors */}
          {[0, 1].map(i => (
            <g key={`mon-${i}`}>
              <rect x={deskX + 2 + i * (deskW * 0.52)} y={deskY - 8}
                width={deskW * 0.48} height={deskH * 0.65} fill="#1A1A2E" rx={1} />
              {/* Screenshots on screen */}
              <rect x={deskX + 4 + i * (deskW * 0.52)} y={deskY - 6}
                width={deskW * 0.4} height={deskH * 0.45}
                fill={i === 0 ? '#1B5E20' : '#B71C1C'} opacity={0.3} rx={1} />
            </g>
          ))}
          {/* Checklist on wall */}
          <rect x={roomW * 0.65} y={roomH * 0.05} width={roomW * 0.25} height={roomH * 0.35}
            fill="#FFF9C4" rx={1} />
          {[0, 1, 2, 3].map(i => (
            <g key={`check-${i}`}>
              <rect x={roomW * 0.67} y={roomH * 0.1 + i * (roomH * 0.07)}
                width={3} height={3} fill="none" stroke="#333" strokeWidth={0.5} />
              {i < 2 && (
                <line x1={roomW * 0.67} y1={roomH * 0.1 + i * (roomH * 0.07) + 1.5}
                  x2={roomW * 0.67 + 3} y2={roomH * 0.1 + i * (roomH * 0.07) + 1.5}
                  stroke="#EF4444" strokeWidth={1} />
              )}
            </g>
          ))}
          {/* Red pen */}
          <line x1={deskX + deskW * 0.9} y1={deskY + 8}
            x2={deskX + deskW * 1.0} y2={deskY + 14}
            stroke="#EF4444" strokeWidth={1.5} />
          {/* Magnifying glass */}
          <circle cx={deskX + deskW * 0.8} cy={deskY + 10} r={4}
            fill="none" stroke="#78909C" strokeWidth={1} />
          <line x1={deskX + deskW * 0.8 + 3} y1={deskY + 13}
            x2={deskX + deskW * 0.8 + 6} y2={deskY + 16}
            stroke="#78909C" strokeWidth={1.5} />
        </g>
      )

    case 'colton':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.9} height={deskH} fill="#5D4037" rx={1} />
          {/* Dual monitors */}
          {[0, 1].map(i => (
            <g key={`mon-${i}`}>
              <rect x={deskX + 2 + i * (deskW * 0.42)} y={deskY - 6}
                width={deskW * 0.38} height={deskH * 0.55} fill="#1A1A2E" rx={1} />
              {[0, 1, 2].map(j => (
                <rect key={`code-${j}`}
                  x={deskX + 4 + i * (deskW * 0.42)}
                  y={deskY - 4 + j * 3}
                  width={deskW * 0.25 - j * 2}
                  height={1.2}
                  fill="#B39DDB" opacity={0.5} />
              ))}
            </g>
          ))}
          {/* Component library on wall */}
          <rect x={roomW * 0.6} y={roomH * 0.08} width={roomW * 0.3} height={roomH * 0.3}
            fill="#37474F" rx={1} />
          {[0, 1, 2, 3].map(i => (
            <rect key={`comp-${i}`}
              x={roomW * 0.62 + (i % 2) * (roomW * 0.14)}
              y={roomH * 0.1 + Math.floor(i / 2) * (roomH * 0.12)}
              width={roomW * 0.11} height={roomH * 0.08}
              fill="#7E57C2" opacity={0.3} rx={1} />
          ))}
        </g>
      )

    case 'tony':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.8} height={deskH} fill="#5D4037" rx={1} />
          {/* Phone screens */}
          {[0, 1, 2].map(i => (
            <g key={`phone-${i}`}>
              <rect x={deskX + 3 + i * 12} y={deskY - 2}
                width={9} height={16} fill="#1A1A2E" rx={2} stroke="#333" strokeWidth={0.5} />
              <rect x={deskX + 4 + i * 12} y={deskY}
                width={7} height={12} fill={['#E91E63', '#1565C0', '#000'][i]} opacity={0.4} rx={1} />
            </g>
          ))}
          {/* Content calendar */}
          <rect x={roomW * 0.5} y={roomH * 0.05} width={roomW * 0.4} height={roomH * 0.4}
            fill="#FFF" opacity={0.1} rx={1} />
          {/* Calendar grid */}
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={`cal-${i}`}
              x={roomW * 0.53 + (i % 4) * (roomW * 0.09)}
              y={roomH * 0.12 + Math.floor(i / 4) * (roomH * 0.1)}
              width={roomW * 0.07} height={roomH * 0.07}
              fill={['#EC407A', '#42A5F5', '#66BB6A', '#FFA726'][i % 4]}
              opacity={0.3} rx={1}
            />
          ))}
          {/* Ring light */}
          <circle cx={roomW * 0.85} cy={roomH * 0.55} r={8}
            fill="none" stroke="#FFD87A" strokeWidth={1.5} opacity={0.3}>
            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="5s" repeatCount="indefinite" />
          </circle>
        </g>
      )

    case 'paige':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.8} height={deskH} fill="#5D4037" rx={1} />
          {/* Monitor */}
          <rect x={deskX + 3} y={deskY - 6} width={deskW * 0.5} height={deskH * 0.55} fill="#1A1A2E" rx={1} />
          {/* Client health bars */}
          {[0, 1, 2].map(i => (
            <g key={`health-${i}`}>
              <rect x={deskX + 5} y={deskY - 4 + i * 4}
                width={deskW * 0.35} height={2}
                fill="#333" rx={1} />
              <rect x={deskX + 5} y={deskY - 4 + i * 4}
                width={deskW * (0.35 - i * 0.08)} height={2}
                fill={['#22C55E', '#EAB308', '#EF4444'][i]} rx={1} />
            </g>
          ))}
          {/* Notepad */}
          <rect x={deskX + deskW * 0.6} y={deskY + 7} width={10} height={12} fill="#FFF9C4" rx={1} />
        </g>
      )

    case 'pixel':
      return (
        <g>
          {/* Desk */}
          <rect x={deskX} y={deskY + 5} width={deskW * 0.7} height={deskH} fill="#5D4037" rx={1} />
          {/* VS Code window */}
          <rect x={deskX + 3} y={deskY - 6} width={deskW * 0.5} height={deskH * 0.55} fill="#1E1E2E" rx={1} />
          {/* Sidebar */}
          <rect x={deskX + 3} y={deskY - 6} width={deskW * 0.1} height={deskH * 0.55} fill="#252530" rx={1} />
          {/* Extension icon */}
          <rect x={deskX + 5} y={deskY - 3} width={3} height={3} fill="#78909C" opacity={0.5} rx={0.5} />
        </g>
      )

    default:
      return (
        <g>
          <rect x={deskX} y={deskY + 5} width={deskW * 0.8} height={deskH} fill="#5D4037" rx={1} />
          <rect x={deskX + 3} y={deskY - 3} width={deskW * 0.45} height={deskH * 0.5} fill="#1A1A2E" rx={1} />
        </g>
      )
  }
}

function PatrikRoomFurniture({ roomW, roomH }) {
  return (
    <g>
      {/* Walnut desk */}
      <rect x={roomW * 0.15} y={roomH * 0.25} width={roomW * 0.5} height={roomH * 0.2}
        fill="#6D4C41" rx={1} />
      {/* Laptop */}
      <rect x={roomW * 0.2} y={roomH * 0.2} width={roomW * 0.2} height={roomH * 0.12}
        fill="#333" rx={1} />
      <rect x={roomW * 0.21} y={roomH * 0.21} width={roomW * 0.18} height={roomH * 0.08}
        fill="#0D1A2E" rx={1} />
      {/* Coffee mug */}
      <circle cx={roomW * 0.55} cy={roomH * 0.32} r={3} fill="#8D6E63" stroke="#6D4C41" strokeWidth={0.5} />
      {/* Steam */}
      <path d={`M${roomW * 0.55},${roomH * 0.28} Q${roomW * 0.57},${roomH * 0.24} ${roomW * 0.55},${roomH * 0.2}`}
        fill="none" stroke="#F5F0EB" strokeWidth={0.5} opacity={0.2}>
        <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3s" repeatCount="indefinite" />
      </path>
      {/* Small plant */}
      <circle cx={roomW * 0.45} cy={roomH * 0.28} r={3} fill="#4CAF50" opacity={0.5} />
      <rect x={roomW * 0.43} y={roomH * 0.3} width={4} height={3} fill="#8D6E63" rx={0.5} />
      {/* Pendant light */}
      <line x1={roomW * 0.4} y1={0} x2={roomW * 0.4} y2={roomH * 0.08} stroke="#B8860B" strokeWidth={0.8} />
      <polygon points={`${roomW * 0.35},${roomH * 0.08} ${roomW * 0.45},${roomH * 0.08} ${roomW * 0.42},${roomH * 0.14} ${roomW * 0.38},${roomH * 0.14}`}
        fill="#B8860B" opacity={0.7} />
      <circle cx={roomW * 0.4} cy={roomH * 0.12} r={8} fill="#FFD87A" opacity={0.06}>
        <animate attributeName="opacity" values="0.04;0.08;0.04" dur="6s" repeatCount="indefinite" />
      </circle>
      {/* Mood board on wall */}
      <rect x={roomW * 0.65} y={roomH * 0.05} width={roomW * 0.25} height={roomH * 0.3}
        fill="#37474F" rx={1} />
      {/* Window light on two walls */}
      <rect x={0} y={0} width={3} height={roomH} fill="#FFD87A" opacity={0.06} />
      <rect x={0} y={0} width={roomW} height={3} fill="#FFD87A" opacity={0.06} />
    </g>
  )
}

function MainHallFurniture({ roomW, roomH }) {
  return (
    <g>
      {/* Couch */}
      <rect x={roomW * 0.1} y={roomH * 0.35} width={roomW * 0.25} height={roomH * 0.25}
        fill="#5D4037" rx={2} />
      <rect x={roomW * 0.11} y={roomH * 0.36} width={roomW * 0.23} height={roomH * 0.15}
        fill="#795548" rx={2} />
      {/* Whiteboard with PIPELINE */}
      <rect x={roomW * 0.4} y={roomH * 0.05} width={roomW * 0.5} height={roomH * 0.35}
        fill="#ECEFF1" rx={1} />
      <text x={roomW * 0.65} y={roomH * 0.15} textAnchor="middle" fill="#333" fontSize={6}
        fontFamily="JetBrains Mono, monospace" fontWeight={700} opacity={0.6}>PIPELINE</text>
      {/* Pipeline flow arrows */}
      {['#E85D26', '#AB47BC', '#42A5F5', '#FFB74D', '#9C27B0', '#EF5350'].map((c, i) => (
        <rect key={`pflow-${i}`}
          x={roomW * 0.42 + i * (roomW * 0.075)}
          y={roomH * 0.22}
          width={roomW * 0.06} height={4}
          fill={c} opacity={0.5} rx={1} />
      ))}
      {/* Potted plant */}
      <circle cx={roomW * 0.15} cy={roomH * 0.15} r={8} fill="#4CAF50" opacity={0.4} />
      <circle cx={roomW * 0.15} cy={roomH * 0.15} r={5} fill="#66BB6A" opacity={0.3} />
      <rect x={roomW * 0.15 - 4} y={roomH * 0.15 + 5} width={8} height={6} fill="#8D6E63" rx={1} />
      {/* Coffee station */}
      <rect x={roomW * 0.85} y={roomH * 0.5} width={roomW * 0.1} height={roomH * 0.15}
        fill="#5D4037" rx={1} />
      <rect x={roomW * 0.86} y={roomH * 0.48} width={8} height={6} fill="#333" rx={1} />
    </g>
  )
}

// ---- AGENT CHARACTER -------------------------------------------------------
function AgentCharacter({ x, y, color, status, name }) {
  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'

  return (
    <g>
      {/* Shadow */}
      <ellipse cx={x} cy={y + 6} rx={5} ry={2} fill="#000" opacity={0.2} />

      {/* Body */}
      <rect x={x - 4} y={y - 4} width={8} height={10} fill={color} rx={2} opacity={0.9}>
        {isWorking && (
          <animate attributeName="y" values={`${y - 4};${y - 5};${y - 4}`} dur="2s" repeatCount="indefinite" />
        )}
      </rect>

      {/* Head */}
      <circle cx={x} cy={y - 8} r={5} fill={color}>
        {isWorking && (
          <animate attributeName="cy" values={`${y - 8};${y - 9};${y - 8}`} dur="2s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Eyes */}
      <circle cx={x - 1.5} cy={y - 8.5} r={1} fill="#FFF" opacity={0.9} />
      <circle cx={x + 1.5} cy={y - 8.5} r={1} fill="#FFF" opacity={0.9} />

      {/* Working: glow pulse */}
      {isWorking && (
        <circle cx={x} cy={y - 4} r={12} fill={color} opacity={0.1}>
          <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.05;0.1" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Thinking: floating dots */}
      {isThinking && (
        <g>
          {[0, 1, 2].map(i => (
            <circle key={`think-${i}`}
              cx={x + 8 + i * 4} cy={y - 14}
              r={1.5} fill="#EAB308" opacity={0.6}>
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite"
                begin={`${i * 0.2}s`} />
            </circle>
          ))}
        </g>
      )}

      {/* Done: checkmark */}
      {isDone && (
        <g>
          <circle cx={x + 7} cy={y - 12} r={4} fill="#3B82F6" opacity={0.8} />
          <path d={`M${x + 5},${y - 12} L${x + 7},${y - 10} L${x + 10},${y - 14}`}
            fill="none" stroke="#FFF" strokeWidth={1.2} />
        </g>
      )}
    </g>
  )
}

// ---- ISOMETRIC OFFICE (main game view) -------------------------------------
function IsometricOffice({ agentStatus, onRoomClick, selectedRoom, hoveredRoom, setHoveredRoom, zoom }) {
  // Calculate grid dimensions
  const CELL_SIZE = 120
  const GRID_COLS = 4
  const GRID_ROWS = 4

  const svgW = CELL_SIZE * GRID_COLS + 40
  const svgH = CELL_SIZE * GRID_ROWS + 40

  const rooms = Object.entries(FLOOR_PLAN)

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      padding: 20,
    }}>
      <div style={{
        transform: `scale(${zoom}) rotateX(55deg) rotateZ(-45deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transformOrigin: 'center center',
        filter: 'drop-shadow(0 20px 60px rgba(255,216,122,0.06))',
      }}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`-20 -20 ${svgW} ${svgH}`}
          style={{ overflow: 'visible' }}
        >
          {/* SVG defs */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="buildingGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#FFD87A" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFD87A" stopOpacity="0" />
            </radialGradient>
            {/* Window light gradient */}
            <linearGradient id="windowWarmth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD87A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FFD87A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Building ground shadow */}
          <ellipse cx={svgW / 2 - 20} cy={svgH / 2 + 30} rx={svgW * 0.55} ry={svgH * 0.3}
            fill="#000" opacity={0.15} />

          {/* Building ground glow */}
          <rect x={-40} y={-40} width={svgW + 40} height={svgH + 40}
            fill="url(#buildingGlow)" />

          {/* Render rooms - back to front for proper layering */}
          {rooms.map(([slug, plan]) => {
            const agent = AGENTS.find(a => a.slug === slug)
            const x = plan.col * CELL_SIZE
            const y = plan.row * CELL_SIZE

            return (
              <g
                key={slug}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHoveredRoom(slug)}
                onMouseLeave={() => setHoveredRoom(null)}
              >
                <IsometricRoom
                  room={plan}
                  slug={slug}
                  agent={agent}
                  agentStatus={agentStatus[slug]}
                  isHovered={hoveredRoom === slug}
                  isSelected={selectedRoom === slug}
                  onClick={onRoomClick}
                  cellSize={CELL_SIZE}
                />
              </g>
            )
          })}

          {/* Building exterior walls (thicker border around the L-shape) */}
          {/* Top row */}
          <line x1={0} y1={0} x2={CELL_SIZE * 4} y2={0} stroke="#5A6578" strokeWidth={3} />
          {/* Right side top */}
          <line x1={CELL_SIZE * 4} y1={0} x2={CELL_SIZE * 4} y2={CELL_SIZE * 3} stroke="#5A6578" strokeWidth={3} />
          {/* Step in the L */}
          <line x1={CELL_SIZE * 4} y1={CELL_SIZE * 3} x2={CELL_SIZE * 3} y2={CELL_SIZE * 3} stroke="#5A6578" strokeWidth={3} />
          {/* Right side of south extension */}
          <line x1={CELL_SIZE * 3} y1={CELL_SIZE * 3} x2={CELL_SIZE * 3} y2={CELL_SIZE * 4} stroke="#5A6578" strokeWidth={3} />
          {/* Bottom of south extension */}
          <line x1={CELL_SIZE * 3} y1={CELL_SIZE * 4} x2={CELL_SIZE * 1} y2={CELL_SIZE * 4} stroke="#5A6578" strokeWidth={3} />
          {/* Left side of south extension */}
          <line x1={CELL_SIZE * 1} y1={CELL_SIZE * 4} x2={CELL_SIZE * 1} y2={CELL_SIZE * 3} stroke="#5A6578" strokeWidth={3} />
          {/* Bottom left */}
          <line x1={CELL_SIZE * 1} y1={CELL_SIZE * 3} x2={0} y2={CELL_SIZE * 3} stroke="#5A6578" strokeWidth={3} />
          {/* Left side */}
          <line x1={0} y1={CELL_SIZE * 3} x2={0} y2={0} stroke="#5A6578" strokeWidth={3} />

          {/* Exterior ground decorations */}
          {/* Small path to entrance */}
          <rect x={CELL_SIZE * 1.7} y={CELL_SIZE * 4 + 4} width={CELL_SIZE * 0.6} height={20}
            fill="#3A4050" rx={2} opacity={0.5} />

          {/* CORNER sign at the entrance */}
          <g transform={`translate(${CELL_SIZE * 2}, ${CELL_SIZE * 4 + 30})`}>
            <rect x={-35} y={-10} width={70} height={20} fill="#1A1A2E" rx={3} stroke="#5A6578" strokeWidth={1} />
            <text x={0} y={5} textAnchor="middle" fill="#FFD87A" fontSize={10}
              fontFamily="JetBrains Mono, monospace" fontWeight={700} letterSpacing="0.25em">
              CORNER
            </text>
          </g>

          {/* Exterior bench */}
          <rect x={-15} y={CELL_SIZE * 1.5} width={8} height={20} fill="#5D4037" rx={1} opacity={0.4} />

          {/* Exterior tree */}
          <circle cx={CELL_SIZE * 4 + 20} cy={CELL_SIZE * 0.8} r={12} fill="#2E7D32" opacity={0.3} />
          <circle cx={CELL_SIZE * 4 + 20} cy={CELL_SIZE * 0.8} r={8} fill="#388E3C" opacity={0.25} />
          <rect x={CELL_SIZE * 4 + 18} y={CELL_SIZE * 0.8 + 8} width={4} height={8} fill="#5D4037" opacity={0.3} rx={1} />
        </svg>
      </div>
    </div>
  )
}

// ---- TASK HUD (top drawer) -------------------------------------------------
function TaskHUD({ data, isOpen, onToggle }) {
  const [tab, setTab] = useState('session')
  const tabs = [
    { id: 'session', label: 'Last Session', icon: Clock },
    { id: 'project', label: 'By Project', icon: FolderKanban },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
    { id: 'add', label: 'Add New', icon: Plus },
  ]

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(10,15,30,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #2A3040',
      transition: 'max-height 0.3s ease',
      maxHeight: isOpen ? 320 : 0,
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid #1A2030',
        padding: '0 16px',
      }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? '#FFD87A' : '#78716C',
                borderBottom: active ? '2px solid #FFD87A' : '2px solid transparent',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                transition: 'color 0.2s',
              }}
            >
              <Icon size={12} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '12px 16px', maxHeight: 260, overflowY: 'auto' }}>
        {tab === 'session' && <SessionTab data={data} />}
        {tab === 'project' && <ProjectTab data={data} />}
        {tab === 'upcoming' && <UpcomingTab />}
        {tab === 'add' && <AddTaskTab />}
      </div>
    </div>
  )
}

function SessionTab({ data }) {
  const feed = data?.pipelineFeed || []
  if (feed.length === 0) return <EmptyTab message="No recent activity" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {feed.slice(0, 10).map((entry, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, alignItems: 'flex-start',
          padding: '6px 8px',
          background: 'rgba(26,32,48,0.5)',
          borderRadius: 2,
        }}>
          <span style={{ color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, marginTop: 1 }}>
            {timeAgo(entry.time)}
          </span>
          <div style={{ minWidth: 0 }}>
            {entry.agent && (
              <span style={{ color: '#E85D26', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 6 }}>
                {entry.agent}
              </span>
            )}
            <span style={{ color: '#A8A29E', fontSize: 12 }}>{entry.description}</span>
            {entry.commitHash && (
              <a href={entry.commitUrl} target="_blank" rel="noopener"
                style={{ marginLeft: 6, color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none' }}>
                {entry.commitHash}
              </a>
            )}
          </div>
        </div>
      ))}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div style={{
            color: '#78716C', fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
            marginBottom: 4,
          }}>{group}</div>
          {items.map(a => (
            <div key={a.slug} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
              background: 'rgba(26,32,48,0.3)', borderRadius: 2, marginBottom: 2,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: (STATUS_CONFIG[a.status] || STATUS_CONFIG.IDLE).color, flexShrink: 0,
              }} />
              <span style={{ color: '#F5F0EB', fontSize: 12, fontWeight: 600, width: 60 }}>{a.name}</span>
              <span style={{ color: '#A8A29E', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.currentTask || 'Standing by'}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function UpcomingTab() {
  return <EmptyTab message="Upcoming tasks will sync from punch-list.md" />
}

function AddTaskTab() {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ color: '#78716C', fontSize: 11, marginBottom: 8 }}>
        Quick-add a task (sends to relay)
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="What needs to happen?"
          style={{
            flex: 1, background: '#141822', border: '1px solid #2A3040', color: '#F5F0EB',
            padding: '8px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif',
            outline: 'none', borderRadius: 2,
          }}
        />
        <button style={{
          background: '#E85D26', color: '#FFF', border: 'none', padding: '8px 16px',
          fontWeight: 700, fontSize: 12, cursor: 'pointer', borderRadius: 2,
        }}>
          Add
        </button>
      </div>
    </div>
  )
}

function EmptyTab({ message }) {
  return (
    <div style={{
      padding: '24px 0', textAlign: 'center',
      color: '#78716C', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
    }}>
      {message}
    </div>
  )
}

// ---- CHAT BAR (bottom) -----------------------------------------------------
function ChatBar({ activeAgent, onSelectAgent, agentStatus, isMobile }) {
  const [expanded, setExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const currentAgent = activeAgent
    ? AGENTS.find(a => a.slug === activeAgent)
    : AGENTS.find(a => a.slug === 'elon') // Default to Elon

  const status = agentStatus[currentAgent?.slug]?.status || 'IDLE'
  const task = agentStatus[currentAgent?.slug]?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [expanded])

  // Reset messages when switching agents
  useEffect(() => {
    setMessages([])
  }, [activeAgent])

  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: currentAgent.slug,
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + data.text }
                  }
                  return updated
                })
              } else if (data.type === 'done') {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last) updated[updated.length - 1] = { ...last, streaming: false }
                  return updated
                })
              } else if (data.type === 'error') {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last) updated[updated.length - 1] = { ...last, content: `Error: ${data.error}`, streaming: false }
                  return updated
                })
              }
            } catch {}
          }
        }
      } else {
        const data = await res.json()
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) {
            updated[updated.length - 1] = {
              ...last,
              content: data.reply || data.error || 'No response',
              streaming: false,
            }
          }
          return updated
        })
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last) {
          updated[updated.length - 1] = {
            ...last,
            content: `Connection error: ${err.message}`,
            streaming: false,
          }
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const chatHeight = fullscreen ? '100vh' : (expanded ? '40vh' : 0)

  return (
    <div style={{
      position: fullscreen ? 'fixed' : 'relative',
      bottom: 0, left: 0, right: 0,
      zIndex: fullscreen ? 100 : 20,
      display: 'flex', flexDirection: 'column',
      background: fullscreen ? '#0A0F1E' : 'transparent',
    }}>
      {/* Expanded chat area */}
      <AnimatePresence>
        {(expanded || fullscreen) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: chatHeight, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'rgba(10,15,30,0.97)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid #2A3040',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px',
              borderBottom: '1px solid #1A2030',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg.color,
                }} />
                <span style={{ color: '#F5F0EB', fontSize: 14, fontWeight: 700 }}>{currentAgent?.name}</span>
                <span style={{ color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                  {currentAgent?.role}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setFullscreen(!fullscreen)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#78716C',
                }}>
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button onClick={() => { setExpanded(false); setFullscreen(false) }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#78716C',
                }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#78716C', fontSize: 13 }}>
                  Chat with <span style={{ color: '#F5F0EB', fontWeight: 700 }}>{currentAgent?.name}</span>
                  <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{task}</div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 8,
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: 2,
                    fontSize: 13,
                    lineHeight: 1.5,
                    ...(msg.role === 'user'
                      ? { background: 'rgba(232,93,38,0.12)', color: '#F5F0EB', border: '1px solid rgba(232,93,38,0.2)' }
                      : { background: 'rgba(26,32,48,0.8)', color: '#F5F0EB', border: '1px solid #2A3040' }
                    ),
                  }}>
                    {msg.role === 'assistant' && (
                      <div style={{ color: cfg.color, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                        {currentAgent?.name}
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                    {msg.streaming && (
                      <span style={{ display: 'inline-block', width: 6, height: 16, background: '#E85D26', marginLeft: 2, animation: 'pulse 1s infinite' }} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar (always visible) */}
      <form onSubmit={sendMessage} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px',
        background: 'rgba(20,24,34,0.98)',
        borderTop: '1px solid #2A3040',
      }}>
        {/* Agent avatar */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#F5F0EB', padding: '4px 8px',
            borderRadius: 2,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: currentAgent?.color || '#78716C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#FFF',
          }}>
            {currentAgent?.name?.charAt(0)}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{currentAgent?.name}</span>
          {expanded ? <ChevronDown size={12} style={{ color: '#78716C' }} /> : <ChevronUp size={12} style={{ color: '#78716C' }} />}
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => { if (!expanded) setExpanded(true) }}
          placeholder={`Message ${currentAgent?.name}...`}
          disabled={streaming}
          style={{
            flex: 1, background: '#0F1320', border: '1px solid #2A3040', color: '#F5F0EB',
            padding: '10px 14px', fontSize: 14, borderRadius: 2,
            outline: 'none', fontFamily: 'Inter, sans-serif',
          }}
        />

        {/* Send */}
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          style={{
            background: input.trim() ? '#E85D26' : '#2A3040',
            color: '#FFF', border: 'none', padding: 10, cursor: input.trim() ? 'pointer' : 'default',
            borderRadius: 2, transition: 'background 0.2s',
            opacity: streaming ? 0.5 : 1,
          }}
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

// ---- THROUGHPUT BAR --------------------------------------------------------
function ThroughputBar({ throughput }) {
  if (!throughput) return null

  const metrics = [
    { label: 'Working', value: throughput.working || 0, color: '#22C55E' },
    { label: 'Done', value: throughput.doneToday || 0, color: '#3B82F6' },
    { label: 'Blocked', value: throughput.blocked || 0, color: '#EF4444' },
    { label: 'Idle', value: throughput.idle || 0, color: '#78716C' },
    { label: 'Commits', value: throughput.commitsToday || 0, color: '#F5F0EB' },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: '6px 16px',
      background: 'rgba(20,24,34,0.6)',
      borderBottom: '1px solid #1A2030',
    }}>
      {metrics.map(m => (
        <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{
            fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: m.color,
            fontFamily: "'Inter Tight', sans-serif",
          }}>
            {m.value}
          </span>
          <span style={{
            fontSize: 8, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', color: '#78716C',
          }}>
            {m.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- ROOM DETAIL SIDEBAR ---------------------------------------------------
function RoomDetailSidebar({ slug, agent, agentStatus, onClose, onChat }) {
  const status = agentStatus?.status || 'IDLE'
  const task = agentStatus?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  const floorPlan = FLOOR_PLAN[slug]

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 320, maxWidth: '100%',
        background: 'rgba(10,15,30,0.97)',
        backdropFilter: 'blur(16px)',
        borderLeft: '1px solid #2A3040',
        display: 'flex', flexDirection: 'column',
        zIndex: 30,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', borderBottom: '1px solid #1A2030',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 4,
            background: agent?.color || '#78716C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#FFF',
          }}>
            {agent?.name?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{ color: '#F5F0EB', fontSize: 16, fontWeight: 700 }}>{agent?.name || slug}</div>
            <div style={{ color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {agent?.role || floorPlan?.label || ''}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716C', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Status */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: cfg.bg,
          borderRadius: 2,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
          <span style={{ color: cfg.color, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase' }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Current task */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ color: '#78716C', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
          Current Task
        </div>
        <div style={{ color: '#A8A29E', fontSize: 13, lineHeight: 1.5 }}>{task}</div>
      </div>

      {/* Last completion */}
      {agentStatus?.lastCompletion && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ color: '#78716C', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
            Last Completion
          </div>
          <div style={{ color: '#A8A29E', fontSize: 12, lineHeight: 1.5 }}>
            {agentStatus.lastCompletion.description}
          </div>
          <div style={{ color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
            {agentStatus.lastCompletion.date}
          </div>
        </div>
      )}

      {/* Room info */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ color: '#78716C', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
          Room
        </div>
        <div style={{ color: '#A8A29E', fontSize: 12 }}>{floorPlan?.label || slug}</div>
      </div>

      {/* Chat button */}
      <div style={{ padding: '12px 16px', marginTop: 'auto' }}>
        <button
          onClick={() => onChat(slug)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#E85D26', color: '#FFF', border: 'none',
            padding: '12px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', borderRadius: 2,
          }}
        >
          <MessageSquare size={14} />
          Chat with {agent?.name || slug}
        </button>
      </div>
    </motion.div>
  )
}

// ---- MAIN GAME DASHBOARD ---------------------------------------------------
export default function GameDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('dash-auth') === '1')
  const [clock, setClock] = useState(azTime())
  const [hudOpen, setHudOpen] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [hoveredRoom, setHoveredRoom] = useState(null)
  const [chatAgent, setChatAgent] = useState(null)
  const [zoom, setZoom] = useState(0.85)
  const { data, error, loading } = useDashboardData(30000)
  const isMobile = useIsMobile()

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setClock(azTime()), 60000)
    return () => clearInterval(timer)
  }, [])

  // URL-based agent selection
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/dashboard\/agent\/(.+)/)
    if (match) {
      const slug = match[1]
      setSelectedRoom(slug)
      setChatAgent(slug)
    }
  }, [])

  // Update URL
  useEffect(() => {
    if (chatAgent) {
      window.history.replaceState(null, '', `/dashboard/agent/${chatAgent}`)
    } else if (selectedRoom) {
      window.history.replaceState(null, '', `/dashboard`)
    } else {
      window.history.replaceState(null, '', '/dashboard')
    }
  }, [chatAgent, selectedRoom])

  // Agent status lookup
  const agentStatus = useMemo(() => {
    if (!data?.agents) return {}
    const map = {}
    for (const a of data.agents) map[a.slug] = a
    return map
  }, [data])

  const handleRoomClick = (slug) => {
    const plan = FLOOR_PLAN[slug]
    if (!plan || plan.isHall || plan.isPatrik) return
    if (slug === selectedRoom) {
      // Double-click: open chat
      setChatAgent(slug)
    } else {
      setSelectedRoom(slug)
    }
  }

  const handleChat = (slug) => {
    setChatAgent(slug)
    setSelectedRoom(slug)
  }

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0A0F1E',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(10,15,30,0.95)',
        borderBottom: '1px solid #1A2030',
        flexShrink: 0,
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            color: '#FFD87A',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.3em', textTransform: 'uppercase',
          }}>CORNER</div>
          <h1 style={{
            color: '#F5F0EB', fontSize: 16, fontWeight: 900, fontStyle: 'italic',
            fontFamily: "'Inter Tight', sans-serif",
            letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0,
          }}>
            Your Office
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} style={{
              background: 'none', border: '1px solid #2A3040', color: '#78716C',
              width: 24, height: 24, cursor: 'pointer', borderRadius: 2, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>-</button>
            <span style={{ color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', width: 35, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} style={{
              background: 'none', border: '1px solid #2A3040', color: '#78716C',
              width: 24, height: 24, cursor: 'pointer', borderRadius: 2, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
          {/* HUD toggle */}
          <button onClick={() => setHudOpen(!hudOpen)} style={{
            background: 'none', border: '1px solid #2A3040', color: '#78716C',
            padding: '4px 8px', cursor: 'pointer', borderRadius: 2,
            fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <ListTodo size={12} />
            HUD
            {hudOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          <span style={{ color: '#78716C', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{clock}</span>
        </div>
      </header>

      {/* Throughput bar */}
      <ThroughputBar throughput={data?.throughput} />

      {/* Task HUD */}
      <TaskHUD data={data} isOpen={hudOpen} onToggle={() => setHudOpen(!hudOpen)} />

      {/* Main game area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', perspective: '1000px' }}>
        <IsometricOffice
          agentStatus={agentStatus}
          onRoomClick={handleRoomClick}
          selectedRoom={selectedRoom}
          hoveredRoom={hoveredRoom}
          setHoveredRoom={setHoveredRoom}
          zoom={zoom}
        />

        {/* Room detail sidebar */}
        <AnimatePresence>
          {selectedRoom && FLOOR_PLAN[selectedRoom] && !FLOOR_PLAN[selectedRoom].isHall && (
            <RoomDetailSidebar
              key={selectedRoom}
              slug={selectedRoom}
              agent={AGENTS.find(a => a.slug === selectedRoom)}
              agentStatus={agentStatus[selectedRoom]}
              onClose={() => setSelectedRoom(null)}
              onChat={handleChat}
            />
          )}
        </AnimatePresence>

        {/* Window light animation overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(255,216,122,0.02) 0%, transparent 70%)',
        }}>
          <div style={{
            position: 'absolute', top: '10%', left: '10%',
            width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(255,183,77,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'windowLight 30s ease-in-out infinite',
          }} />
        </div>
      </div>

      {/* Chat bar */}
      <ChatBar
        activeAgent={chatAgent}
        onSelectAgent={setChatAgent}
        agentStatus={agentStatus}
        isMobile={isMobile}
      />

      {/* Error indicator */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#EF4444', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 12px', borderRadius: 2, zIndex: 50,
        }}>
          Status update failed. Showing cached data.
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div style={{
          position: 'fixed', inset: 0, background: '#0A0F1E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={24} style={{ color: '#FFD87A', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#78716C', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>Loading your office...</span>
          </div>
        </div>
      )}

      {/* Global ambient styles */}
      <style>{`
        @keyframes windowLight {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
          50% { transform: translate(20px, -10px) scale(1.1); opacity: 0.06; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A3040; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #3A4050; }
      `}</style>
    </div>
  )
}
