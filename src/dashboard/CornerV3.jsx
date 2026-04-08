// CornerV3.jsx -- Dashboard v2: Two-row nav + world switcher
// Route: /dashboard/v2
//
// Layout:
//   Row 1: AOM logo | WorldSelector | bell icon + user avatar
//   Row 2: Home / Tasks (badge) / Chat (badge) tabs
//
// All styling is inline -- no CSS modules.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from './lib/supabase.js'
import {
  getClientId,
  setClientIdFromUser,
  setWorldOverride,
  getUserWorld,
} from './lib/clientConfig.js'
import { useTasks } from './hooks/useTasks'
import { useDataPipe } from './hooks/useDataPipe'
import WorldSelector from './components/WorldSelector.jsx'
import VoiceToggle from './components/VoiceToggle.jsx'
import VoiceChat from './components/VoiceChat.jsx'

// ── Color palette (dark-first) ────────────────────────────────────────────────

const C = {
  bg:        '#06090F',
  bg2:       '#0B1018',
  s1:        '#111827',
  s2:        '#1A2035',
  s3:        '#222942',
  border:    'rgba(255,255,255,0.04)',
  border2:   'rgba(255,255,255,0.08)',
  text:      '#F1F5F9',
  text2:     '#94A3B8',
  muted:     '#475569',
  dim:       '#334155',
  accent:    '#10B981',
  accent2:   '#34D399',
  accentBg:  'rgba(16,185,129,0.08)',
  yellow:    '#EAB308',
  green:     '#22C55E',
  purple:    '#A78BFA',
  blue:      '#60A5FA',
  pink:      '#F472B6',
  orange:    '#FB923C',
  teal:      '#2DD4BF',
  red:       '#EF4444',
}

// ── AOM Logo mark ─────────────────────────────────────────────────────────────

function AomLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.04em', color: C.text, fontFamily: "'Inter', sans-serif" }}>
        Corne<span style={{ color: C.accent }}>r</span>.
      </span>
    </div>
  )
}

// ── Bell icon ─────────────────────────────────────────────────────────────────

function BellIcon({ hasNew = false }) {
  return (
    <button
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        borderRadius: 10,
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 150ms ease, border 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
      aria-label="Notifications"
    >
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
        stroke={C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {hasNew && (
        <span style={{
          position: 'absolute',
          top: 5,
          right: 5,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: C.red,
          border: '1.5px solid ' + C.bg,
        }} />
      )}
    </button>
  )
}

// ── User avatar ───────────────────────────────────────────────────────────────

function UserAvatar({ user }) {
  const initial = user?.email?.[0]?.toUpperCase() || user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div style={{
      width: 32,
      height: 32,
      borderRadius: 9,
      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{initial}</span>
      }
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ count }) {
  if (!count || count <= 0) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      background: C.red,
      color: '#fff',
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
      padding: '0 5px',
      lineHeight: 1,
      flexShrink: 0,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────

function Tab({ label, icon, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        padding: '0 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${C.blue}` : '2px solid transparent',
        cursor: 'pointer',
        color: active ? C.blue : C.muted,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        fontFamily: "'Inter', sans-serif",
        transition: 'color 150ms ease, border-color 150ms ease',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#94A3B8' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.muted }}
    >
      {icon}
      {label}
      {badge}
    </button>
  )
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function HomeIcon({ color }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function TasksIcon({ color }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function ChatIcon({ color }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

// ── Status dot config ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  BUILDING: { color: '#22C55E', pulse: true,  label: 'Building'  },
  PLANNING: { color: '#F59E0B', pulse: false, label: 'Planning'  },
  QA:       { color: '#3B9EFF', pulse: false, label: 'QA'        },
  QUEUED:   { color: '#F59E0B', pulse: false, label: 'Queued'    },
  IDLE:     { color: '#3D4D60', pulse: false, label: 'Idle'      },
}

function getStatusCfg(status) {
  return STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.IDLE
}

// ── Agent avatar (color circle + initial) ─────────────────────────────────────

function AgentAvatar({ name, color, size = 38 }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: color || '#3B9EFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: `0 0 0 1px rgba(255,255,255,0.08)`,
    }}>
      <span style={{
        fontSize: size * 0.42,
        fontWeight: 700,
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1,
      }}>{initial}</span>
    </div>
  )
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const cfg = getStatusCfg(status)
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: cfg.color,
      flexShrink: 0,
      boxShadow: cfg.pulse ? `0 0 6px ${cfg.color}` : 'none',
      animation: cfg.pulse ? 'cvPulse 1.8s ease-in-out infinite' : 'none',
    }} />
  )
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, lastMessage, onClick }) {
  const [hovered, setHovered] = useState(false)
  const cfg = getStatusCfg(agent.status)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(agent)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 10,
        background: hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
        cursor: 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease',
        marginBottom: 6,
      }}
    >
      {/* Avatar */}
      <AgentAvatar name={agent.name} color={agent.color} size={40} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{agent.name}</span>
          <StatusDot status={agent.status} />
          <span style={{
            fontSize: 11,
            color: cfg.color,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            opacity: 0.85,
          }}>{cfg.label}</span>
        </div>

        {/* Last message preview */}
        {lastMessage ? (
          <div style={{
            fontSize: 12,
            color: C.muted,
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.35,
          }}>{lastMessage.text}</div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(80,100,128,0.5)', fontFamily: "'Inter', sans-serif", fontStyle: 'italic' }}>
            No recent messages
          </div>
        )}
      </div>

      {/* Timestamp */}
      {lastMessage?.timestamp && (
        <div style={{
          fontSize: 11,
          color: 'rgba(80,100,128,0.7)',
          fontFamily: "'Inter', sans-serif",
          flexShrink: 0,
        }}>
          {lastMessage.timestamp}
        </div>
      )}
    </div>
  )
}

// ── Home panel with agent cards ────────────────────────────────────────────────

function HomePanel({ user, agents, inboxItems, onSelectAgent }) {
  // Build a quick lookup: agent slug -> inbox item (last message preview)
  const inboxMap = useMemo(() => {
    const m = {}
    for (const item of (inboxItems || [])) {
      if (item.agent) m[item.agent] = item
    }
    return m
  }, [inboxItems])

  // Derive greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const displayName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there'

  // Sort agents: active first (non-IDLE), then idle
  const sortedAgents = useMemo(() => {
    if (!agents) return []
    return [...agents].sort((a, b) => {
      const aActive = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
      const bActive = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
      return aActive - bActive
    })
  }, [agents])

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '24px 20px 32px',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Hero greeting ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: C.text,
          lineHeight: 1.2,
          marginBottom: 4,
        }}>
          {greeting}, {displayName}
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {sortedAgents.filter(a => a.status?.toUpperCase() !== 'IDLE').length > 0
            ? `${sortedAgents.filter(a => a.status?.toUpperCase() !== 'IDLE').length} agent${sortedAgents.filter(a => a.status?.toUpperCase() !== 'IDLE').length > 1 ? 's' : ''} active`
            : 'All agents idle'}
        </div>
      </div>

      {/* ── Pulse keyframe (injected once) ─────────────────────────────────── */}
      <style>{`@keyframes cvPulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Section label ───────────────────────────────────────────────────── */}
      {sortedAgents.length > 0 && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.muted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Your Team ({sortedAgents.length})
        </div>
      )}

      {/* ── Agent cards ─────────────────────────────────────────────────────── */}
      {sortedAgents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 8, color: C.muted }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={8} r={4}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span style={{ fontSize: 13 }}>No agents found</span>
        </div>
      ) : (
        sortedAgents.map(agent => (
          <AgentCard
            key={agent.slug}
            agent={agent}
            lastMessage={inboxMap[agent.slug] || null}
            onClick={onSelectAgent}
          />
        ))
      )}
    </div>
  )
}

// ── Status color helpers ──────────────────────────────────────────────────────

function getStatusColor(status) {
  switch (status) {
    case 'building':  return { dot: '#22C55E', glow: '0 0 6px rgba(34,197,94,0.6)',  border: 'rgba(34,197,94,0.2)',  bg: 'rgba(34,197,94,0.05)' }
    case 'qa':        return { dot: '#3B9EFF', glow: '0 0 6px rgba(59,158,255,0.5)', border: 'rgba(59,158,255,0.2)', bg: 'rgba(59,158,255,0.05)' }
    case 'queued':    return { dot: '#F59E0B', glow: 'none',                          border: 'rgba(245,158,11,0.15)', bg: 'rgba(245,158,11,0.03)' }
    case 'planning':  return { dot: '#A78BFA', glow: 'none',                          border: 'rgba(167,139,250,0.15)', bg: 'rgba(167,139,250,0.03)' }
    case 'classifying': return { dot: '#FB923C', glow: 'none',                        border: 'rgba(251,146,60,0.15)', bg: 'rgba(251,146,60,0.03)' }
    case 'done':      return { dot: '#22C55E', glow: 'none',                          border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)' }
    case 'failed':    return { dot: '#EF4444', glow: 'none',                          border: 'rgba(239,68,68,0.2)',  bg: 'rgba(239,68,68,0.04)' }
    default:          return { dot: '#506480', glow: 'none',                          border: 'rgba(255,255,255,0.06)', bg: 'rgba(255,255,255,0.04)' }
  }
}

// ── Card color palette for shipped tasks ─────────────────────────────────────
const SHIPPED_CARD_COLORS = [
  '#EAB308',
  '#22C55E',
  '#A78BFA',
  '#60A5FA',
  '#F472B6',
  '#FB923C',
  '#2DD4BF',
]

const AGENT_CARD_COLOR_MAP = {
  bobby:   '#FB923C',
  colton:  '#FB923C',
  steffen: '#A78BFA',
  gary:    '#2DD4BF',
  alex:    '#22C55E',
  tony:    '#22C55E',
  jacob:   '#EAB308',
  elon:    '#60A5FA',
  cleo:    '#F472B6',
}

function getShippedCardColor(task, index) {
  const agent = (task.agent_identity || task.agentIdentity || '').toLowerCase()
  return AGENT_CARD_COLOR_MAP[agent] || SHIPPED_CARD_COLORS[index % SHIPPED_CARD_COLORS.length]
}

// ── Static project filter pills ───────────────────────────────────────────────
const PROJECT_PILLS = ['All', 'Corner', 'AOM', 'Ambition', 'ISA', 'Sourcing']

function TasksPanel({ queued, rightNow, done }) {
  const [searchQuery,   setSearchQuery]   = useState('')
  const [activeProject, setActiveProject] = useState('all')

  const active    = [...(rightNow || []), ...(queued || [])]
  const completed = done || []

  // Filter helper -- project pill matches title keyword or agent identity
  function filterTasks(tasks) {
    return tasks.filter(t => {
      const title  = (t.title || t.text || '').toLowerCase()
      const matchQ = !searchQuery || title.includes(searchQuery.toLowerCase())
      const agent  = (t.agent_identity || t.agentIdentity || '').toLowerCase()
      const matchP = activeProject === 'all'
        || title.includes(activeProject.toLowerCase())
        || agent.includes(activeProject.toLowerCase())
      return matchQ && matchP
    })
  }

  const filteredActive    = filterTasks(active)
  const filteredCompleted = filterTasks(completed)

  // Weekly stats derived from completed tasks
  const withQA    = completed.filter(t => t.qa_score || t.qaScore)
  const avgQA     = withQA.length > 0
    ? (withQA.reduce((s, t) => s + Number(t.qa_score || t.qaScore || 0), 0) / withQA.length).toFixed(1)
    : null
  const passCount = withQA.filter(t => Number(t.qa_score || t.qaScore || 0) >= 8).length
  const passRate  = withQA.length > 0 ? Math.round((passCount / withQA.length) * 100) : null

  // Per-day task counts for M-S bar chart
  const now         = new Date()
  const dayOfWeek   = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart   = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - daysFromMon)

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0] // Mon=0 ... Sun=6
  for (const t of completed) {
    const ts = t.completed_at || t.updated_at || t.created_at
    if (!ts) continue
    const date = new Date(ts)
    if (date >= weekStart) {
      const d   = date.getDay()
      const idx = d === 0 ? 6 : d - 1
      dailyCounts[idx]++
    }
  }
  const maxDailyCount = Math.max(...dailyCounts, 1)
  const weekTotal     = dailyCounts.reduce((s, c) => s + c, 0)
  const DAY_LABELS    = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const MIN_BAR_H     = 4
  const MAX_BAR_H     = 36

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* Keyframes for animated progress bars */}
      <style>{`
        @keyframes cv3-progress-sweep {
          0%   { width: 25% }
          50%  { width: 72% }
          100% { width: 25% }
        }
        @keyframes bld {
          0%   { width: 5% }
          50%  { width: 60% }
          100% { width: 90% }
        }
      `}</style>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Search + Filters */}
        <div style={{ marginBottom: 16 }}>
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 10px 7px 30px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                color: C.text,
                fontSize: 13,
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                  fontSize: 16, lineHeight: 1, padding: 0,
                }}
              >×</button>
            )}
          </div>

          {/* Static project filter pills */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {PROJECT_PILLS.map(p => {
              const key      = p === 'All' ? 'all' : p.toLowerCase()
              const isActive = activeProject === key
              return (
                <button
                  key={p}
                  onClick={() => setActiveProject(key)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: isActive ? '1px solid rgba(59,158,255,0.45)' : '1px solid rgba(255,255,255,0.07)',
                    background: isActive ? 'rgba(59,158,255,0.14)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? C.accent : C.muted,
                    letterSpacing: '0.04em',
                    transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >{p}</button>
              )
            })}
          </div>
        </div>

        {/* Building Now */}
        {filteredActive.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Building Now ({filteredActive.length})
            </div>
            {filteredActive.map((t, i) => (
              <div
                key={t.id}
                style={{
                  padding: '14px 16px',
                  marginBottom: 8,
                  borderRadius: 14,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  background: '#1A2035',
                  border: '1px solid rgba(234,179,8,0.1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                {/* Animated top progress bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: 2,
                  background: '#FACC15',
                  animation: 'bld 5s ease-in-out infinite',
                  borderRadius: '14px 14px 0 0',
                }} />

                {/* Card content row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  {/* Left: title + tags */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#FACC15', fontSize: 14, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title || t.text || 'Untitled task'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      {t.agent_identity || t.agentIdentity ? (
                        <span style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {t.agent_identity || t.agentIdentity}
                        </span>
                      ) : null}
                      {t.attempt_count > 1 ? (
                        <span style={{ color: '#475569', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Attempt {t.attempt_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {/* Right: score + label */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#FACC15', fontSize: 12, fontWeight: 800, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.qa_score || t.qaScore || '...'}
                    </div>
                    <div style={{ color: '#475569', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>
                      {t.status === 'right_now' ? 'Building' : 'Queued'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shipped tasks */}
        {filteredCompleted.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Shipped ({filteredCompleted.length})
            </div>
            {filteredCompleted.slice(0, 20).map((t, i) => {
              const cardColor = getShippedCardColor(t, i)
              const qa        = t.qa_score || t.qaScore
              const agent     = t.agent_identity || t.agentIdentity
              const project   = t.project_name || t.projectName
              const isFailed  = t.status === 'failed'
              return (
                <div key={t.id} style={{
                  padding: '14px 16px',
                  marginBottom: 8,
                  borderRadius: 14,
                  backgroundColor: isFailed ? 'rgba(239,68,68,0.15)' : cardColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}>
                  {/* Left: title + agent/project */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: isFailed ? '#F0F4FF' : '#0A0A0A', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title || t.text || 'Untitled task'}
                    </div>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: isFailed ? 'rgba(240,244,255,0.5)' : 'rgba(10,10,10,0.5)', marginTop: 4, fontWeight: 700 }}>
                      {[agent, project].filter(Boolean).join(' · ') || (isFailed ? 'Failed' : 'Shipped')}
                    </div>
                  </div>
                  {/* Right: QA score */}
                  {qa && (
                    <div style={{ fontSize: 20, fontWeight: 800, color: isFailed ? '#EF4444' : '#0A0A0A', flexShrink: 0, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                      {qa}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Weekly Stats Bar */}
        {completed.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 16,
          }}>
            {/* Header */}
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
              This Week
            </div>

            {/* 7 vertical bars for M-S */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: MAX_BAR_H + 16, marginBottom: 10 }}>
              {DAY_LABELS.map((label, i) => {
                const count  = dailyCounts[i]
                const barH   = count > 0 ? Math.round((count / maxDailyCount) * (MAX_BAR_H - MIN_BAR_H)) + MIN_BAR_H : MIN_BAR_H
                const isFuture = i > (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
                    <div style={{
                      width: '100%',
                      height: barH,
                      borderRadius: 3,
                      background: isFuture
                        ? 'rgba(255,255,255,0.06)'
                        : count > 0
                          ? '#60A5FA'
                          : 'rgba(255,255,255,0.08)',
                      transition: 'height 0.3s ease',
                    }} />
                    <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  </div>
                )
              })}
            </div>

            {/* 3 metrics */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: C.text }}>
                Tasks: {completed.length}
              </div>
              {passRate !== null && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#22C55E' }}>
                  Pass Rate: {passRate}%
                </div>
              )}
              {avgQA !== null && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: C.accent }}>
                  Avg QA Score: {avgQA}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredActive.length === 0 && filteredCompleted.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 8, paddingTop: 60 }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
            </svg>
            <span style={{ fontSize: 13 }}>{searchQuery || activeProject !== 'all' ? 'No matching tasks' : 'No tasks'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Time formatter (relative) ─────────────────────────────────────────────────

function formatChatTime(ts) {
  if (!ts) return ''
  try {
    const date = new Date(ts)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay === 1) return 'yesterday'
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString()
  } catch { return '' }
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({ agents, inboxItems, worldId, initialAgent }) {
  const [selectedAgent, setSelectedAgent] = useState(initialAgent || null)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus]     = useState('idle')
  const [voiceVolume, setVoiceVolume]     = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)

  // Build unread map: agent slug -> inbox item (last unread message)
  const unreadMap = useMemo(() => {
    const m = {}
    for (const item of (inboxItems || [])) {
      if (item.agent) m[item.agent] = item
    }
    return m
  }, [inboxItems])

  // Agents sorted: unread first, then active, then idle
  const chattableAgents = useMemo(() => {
    return (agents || [])
      .filter(a => a.slug && a.name)
      .sort((a, b) => {
        const aU = unreadMap[a.slug] ? 0 : 1
        const bU = unreadMap[b.slug] ? 0 : 1
        if (aU !== bU) return aU - bU
        const aAct = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        const bAct = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        return aAct - bAct
      })
  }, [agents, unreadMap])

  // Load message history when agent selected
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    setLoadingMsgs(true)
    setMessages([])
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', worldId)
      .eq('agent', selectedAgent.slug)
      .order('timestamp', { ascending: true })
      .limit(60)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data)
      })
  }, [selectedAgent, worldId])

  // Realtime: watch for new messages in this thread
  useEffect(() => {
    if (!selectedAgent || !supabase || !worldId) return
    const channel = supabase
      .channel(`cv3-thread-${worldId}-${selectedAgent.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          if (msg.agent === selectedAgent.slug) {
            // Deduplicate: skip if we already have this id (from optimistic insert)
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedAgent, worldId])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when thread opens
  useEffect(() => {
    if (selectedAgent) setTimeout(() => inputRef.current?.focus(), 100)
  }, [selectedAgent])

  // Keep a ref so handleSend can read current messages without stale closure
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !selectedAgent) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)

    // Optimistic user message
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: new Date().toISOString(),
      source: 'corner-dashboard',
    }])

    // Build Gemini-format history from the last 20 messages for context
    const history = messagesRef.current.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }],
    }))

    try {
      // Run in parallel: persist user message + get AI response
      const [saveResult, geminiResult] = await Promise.allSettled([
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: selectedAgent.slug,
            text,
            role: 'user',
            source: 'corner-dashboard',
            client_id: worldId,
          }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agent: selectedAgent.slug,
            client_id: worldId,
            history,
          }),
        }).then(r => r.json()),
      ])

      // Replace temp user msg with real DB id -- prevents realtime duplicate
      if (saveResult.status === 'fulfilled' && saveResult.value?.message?.id) {
        const realMsg = saveResult.value.message
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...realMsg } : m))
      }

      // Append AI response
      if (geminiResult.status === 'fulfilled' && geminiResult.value?.reply) {
        const reply = geminiResult.value.reply
        const tempAgentId = `temp-agent-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempAgentId,
          role: 'agent',
          agent: selectedAgent.slug,
          text: reply,
          timestamp: new Date().toISOString(),
          source: 'gemini',
        }])
        // Persist AI response; swap temp id for real one when saved
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: selectedAgent.slug,
            text: reply,
            role: 'agent',
            source: 'gemini',
            client_id: worldId,
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data?.message?.id) {
              setMessages(prev => prev.map(m => m.id === tempAgentId ? { ...data.message } : m))
            }
          })
          .catch(() => {})
      }
    } catch (err) {
      console.error('[ChatPanel] send error:', err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, selectedAgent, worldId])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleFileSelection = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !selectedAgent || !supabase || !worldId) return
    // Reset input so the same file can be re-selected later
    e.target.value = ''
    setUploading(true)
    for (const file of files) {
      try {
        const filePath = `attachments/${worldId}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file, { upsert: false })
        if (uploadError) {
          console.error('[ChatPanel] upload error:', uploadError)
          continue
        }
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
        const publicUrl = urlData?.publicUrl
        if (!publicUrl) continue

        // Optimistic message
        const tempId = `temp-attach-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempId,
          role: 'user',
          agent: selectedAgent.slug,
          text: `Attached file: ${file.name}`,
          timestamp: new Date().toISOString(),
          source: 'corner-dashboard',
          attachment_url: publicUrl,
          file_mime_type: file.type,
          file_size: file.size,
        }])

        // Persist to DB
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: selectedAgent.slug,
            text: `Attached file: ${file.name}`,
            role: 'user',
            source: 'corner-dashboard',
            client_id: worldId,
            attachment_url: publicUrl,
            file_mime_type: file.type,
            file_size: file.size,
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data?.message?.id) {
              setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
            }
          })
          .catch(() => {})
      } catch (err) {
        console.error('[ChatPanel] file attach error:', err)
      }
    }
    setUploading(false)
  }, [selectedAgent, worldId])

  // ── Agent list ───────────────────────────────────────────────────────────────

  if (!selectedAgent) {
    return (
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.muted,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
        }}>
          Direct Messages
        </div>

        {chattableAgents.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingTop: 60, gap: 8, color: C.muted,
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 13 }}>No agents available</span>
          </div>
        ) : (
          chattableAgents.map(agent => {
            const lastMsg    = unreadMap[agent.slug]
            const hasUnread  = !!lastMsg
            return (
              <button
                key={agent.slug}
                onClick={() => setSelectedAgent(agent)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 6,
                  transition: 'background 150ms ease, border-color 150ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                }}
              >
                {/* Avatar + unread dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <AgentAvatar name={agent.name} color={agent.color} size={40} />
                  {hasUnread && (
                    <span style={{
                      position: 'absolute', top: -3, right: -3,
                      width: 10, height: 10, borderRadius: '50%',
                      background: C.accent, border: `2px solid ${C.bg}`,
                    }} />
                  )}
                </div>

                {/* Name + preview */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: hasUnread ? 700 : 600,
                      color: hasUnread ? C.text : 'rgba(240,244,255,0.8)',
                      fontFamily: "'Inter', sans-serif",
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{agent.name}</span>
                    <StatusDot status={agent.status} />
                  </div>
                  {lastMsg ? (
                    <div style={{
                      fontSize: 12,
                      color: hasUnread ? C.muted : 'rgba(80,100,128,0.5)',
                      fontWeight: hasUnread ? 500 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: "'Inter', sans-serif",
                    }}>{lastMsg.text}</div>
                  ) : (
                    <div style={{
                      fontSize: 12, color: 'rgba(80,100,128,0.4)',
                      fontStyle: 'italic', fontFamily: "'Inter', sans-serif",
                    }}>No messages yet</div>
                  )}
                </div>

                {/* Timestamp + chevron */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {lastMsg?.timestamp && (
                    <span style={{ fontSize: 10, color: 'rgba(80,100,128,0.6)', fontFamily: "'Inter', sans-serif" }}>
                      {formatChatTime(lastMsg.timestamp)}
                    </span>
                  )}
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                    stroke="rgba(80,100,128,0.4)" strokeWidth={2.5}
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            )
          })
        )}
      </div>
    )
  }

  // ── Thread view ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Thread header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.95)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => { setSelectedAgent(null); setMessages([]); setIsVoiceActive(false) }}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A0A0A0', fontSize: 18, lineHeight: 1,
          }}
        >
          &#x2190;
        </button>
        {/* Circle avatar with agent initial */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          backgroundColor: selectedAgent.color || '#3B9EFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {(selectedAgent.name || '?')[0].toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 14, fontWeight: 'bold', color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block',
          }}>{selectedAgent.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{
              backgroundColor: 'green', borderRadius: '50%',
              width: 8, height: 8, display: 'inline-block', flexShrink: 0, verticalAlign: 'middle',
            }} />
            <span style={{ fontSize: 11, color: C.muted, lineHeight: 1 }}>Online</span>
          </div>
        </div>
        <VoiceToggle
          isActive={isVoiceActive}
          onToggle={() => setIsVoiceActive(v => !v)}
          status={voiceStatus}
          volumeLevel={voiceVolume}
        />
      </div>

      {/* Voice chat panel -- replaces messages when active */}
      {isVoiceActive && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <VoiceChat
            agentSlug={selectedAgent.slug}
            agentColor={selectedAgent.color}
            clientId={worldId}
            onTranscript={(text, role) => {
              setMessages(prev => [...prev, {
                id: `voice-${role}-${Date.now()}`,
                role: role === 'model' ? 'agent' : 'user',
                agent: selectedAgent.slug,
                text,
                timestamp: new Date().toISOString(),
                source: 'voice',
              }])
            }}
            onStatusChange={(s) => {
              setVoiceStatus(s)
              if (s === 'idle') setIsVoiceActive(false)
            }}
            onVolumeChange={setVoiceVolume}
          />
        </div>
      )}

      {/* Messages scroll area */}
      {!isVoiceActive && <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>

        {loadingMsgs && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
          </div>
        )}

        {!loadingMsgs && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingTop: 60,
          }}>
            <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={44} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
              {selectedAgent.name}
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 6,
              }}
            >
              {!isUser && (
                <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={22} />
              )}
              <div style={{ maxWidth: '78%', minWidth: 0 }}>
                <div style={{
                  padding: '9px 13px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: 13, lineHeight: 1.5,
                  color: isUser ? '#fff' : C.text,
                  background: isUser
                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    : 'rgba(255,255,255,0.06)',
                  border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                  {msg.attachment_url && (
                    <div style={{ marginTop: msg.text ? 8 : 0 }}>
                      {msg.file_mime_type && msg.file_mime_type.startsWith('image/') ? (
                        <img
                          src={msg.attachment_url}
                          alt={msg.text}
                          style={{
                            maxWidth: 200, maxHeight: 150,
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.15)',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            textDecoration: 'none', color: 'inherit',
                            maxWidth: 240,
                          }}
                        >
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0 }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {msg.text.replace('Attached file: ', '')}
                            </div>
                            {msg.file_size != null && (
                              <div style={{ fontSize: 11, color: isUser ? 'rgba(255,255,255,0.6)' : C.muted }}>
                                {msg.file_size < 1024 * 1024
                                  ? `${Math.round(msg.file_size / 1024)} KB`
                                  : `${(msg.file_size / (1024 * 1024)).toFixed(1)} MB`}
                              </div>
                            )}
                          </div>
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 10, color: 'rgba(80,100,128,0.55)',
                  marginTop: 3,
                  textAlign: isUser ? 'right' : 'left',
                  paddingRight: isUser ? 4 : 0,
                  paddingLeft: isUser ? 0 : 4,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {formatChatTime(msg.timestamp)}
                </div>
              </div>
              {isUser && (
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>P</span>
                </div>
              )}
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>}

      {/* Input area */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.95)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleFileSelection}
          />
          {/* Paperclip attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file"
            style={{
              width: 36, height: 36, flexShrink: 0,
              borderRadius: 10,
              background: uploading ? 'rgba(59,158,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: uploading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms ease',
            }}
          >
            {uploading ? (
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.15)',
                borderTopColor: C.accent,
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke={C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            )}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedAgent.name}…`}
            rows={1}
            style={{
              flex: 1,
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: C.text,
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              minHeight: 36,
              maxHeight: 100,
              overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: 36, height: 36, flexShrink: 0,
              borderRadius: 10,
              background: input.trim() && !sending
                ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: input.trim() && !sending ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms ease',
            }}
          >
            {sending ? (
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: C.muted,
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                stroke={input.trim() ? '#fff' : C.muted}
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CornerV3() {
  const [currentUser, setCurrentUser]   = useState(null)
  const [worldId, setWorldId]           = useState(getClientId())
  const [tab, setTab]                   = useState('home')
  const [unreadChat, setUnreadChat]     = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)

  const { queued, rightNow, done } = useTasks()
  // useDataPipe provides agents (with realtime status) and inboxItems (last message per agent)
  const { agents, inboxItems } = useDataPipe(null)
  // tabRef keeps the realtime callback fresh without resubscribing on every tab change
  const tabRef = useRef(tab)

  // Active task count: queued + building/qa
  const activeTaskCount = (queued?.length || 0) + (rightNow?.length || 0)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user)
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setCurrentUser(user)
      if (user) {
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Keep tabRef in sync so realtime callback always sees current tab without resubscribing
  useEffect(() => { tabRef.current = tab }, [tab])

  // ── Chat unread count (realtime) ──────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return

    // Reset unread when switching worlds
    setUnreadChat(0)

    const channel = supabase
      .channel(`cornerv3-messages-${worldId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        () => {
          // Only increment unread if not currently on chat tab (reads tabRef to avoid resubscribe)
          setUnreadChat(prev => tabRef.current === 'chat' ? 0 : prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [worldId])

  // Clear unread when switching to chat
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab)
    if (newTab === 'chat') setUnreadChat(0)
  }, [])

  // Select an agent and switch to chat tab
  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent)
    setTab('chat')
    setUnreadChat(0)
  }, [])

  // ── World switching ───────────────────────────────────────────────────────

  const handleEnterWorld = useCallback((world) => {
    setWorldOverride(world.world)
    setWorldId(world.world)
  }, [])

  const handleReturnToMyWorld = useCallback(() => {
    setWorldOverride(null)
    const myWorld = getUserWorld()
    setWorldId(myWorld)
  }, [])

  // ── Nav heights ───────────────────────────────────────────────────────────

  const ROW1_H = 44
  const ROW2_H = 36
  const NAV_H  = ROW1_H + ROW2_H

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── NAV BAR ────────────────────────────────────────────────────────── */}
      <nav style={{
        width: '100%',
        height: NAV_H,
        background: C.s1,
        borderBottom: '1px solid ' + C.border,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>

        {/* Row 1: Logo | World | Bell + Avatar */}
        <div style={{
          height: ROW1_H,
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px 0px 16px',
          gap: 12,
          borderBottom: '1px solid ' + C.border,
        }}>
          {/* Left: Logo */}
          <AomLogo />

          {/* Center: WorldSelector */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <WorldSelector
              currentWorldId={worldId}
              currentUser={currentUser}
              onEnterWorld={handleEnterWorld}
              onReturnToMyWorld={handleReturnToMyWorld}
              isNightMode={true}
              isMobile={false}
            />
          </div>

          {/* Right: Bell + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BellIcon hasNew={unreadChat > 0} />
            <UserAvatar user={currentUser} />
          </div>
        </div>

        {/* Row 2: Nav tabs */}
        <div style={{
          height: ROW2_H,
          display: 'flex',
          alignItems: 'stretch',
          padding: '8px 16px 8px 16px',
          gap: 2,
        }}>
          <Tab
            label="Home"
            icon={<HomeIcon color={tab === 'home' ? C.blue : C.muted} />}
            active={tab === 'home'}
            onClick={() => handleTabChange('home')}
            badge={null}
          />
          <Tab
            label="Tasks"
            icon={<TasksIcon color={tab === 'tasks' ? C.blue : C.muted} />}
            active={tab === 'tasks'}
            onClick={() => handleTabChange('tasks')}
            badge={<Badge count={activeTaskCount} />}
          />
          <Tab
            label="Chat"
            icon={<ChatIcon color={tab === 'chat' ? C.blue : C.muted} />}
            active={tab === 'chat'}
            onClick={() => handleTabChange('chat')}
            badge={<Badge count={unreadChat} />}
          />

          {/* Nav stats: hidden on mobile (< 768px) */}
          <div style={{
            display: window.innerWidth < 768 ? 'none' : 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, fontFamily: "'JetBrains Mono', monospace" }}>
              {rightNow?.length || 0} Building
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
              {done?.length || 0} Done
            </span>
          </div>
        </div>

      </nav>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'home'  && <HomePanel user={currentUser} agents={agents} inboxItems={inboxItems} onSelectAgent={handleSelectAgent} />}
        {tab === 'tasks' && <TasksPanel queued={queued} rightNow={rightNow} done={done} />}
        {tab === 'chat'  && <ChatPanel agents={agents} inboxItems={inboxItems} worldId={worldId} initialAgent={selectedAgent} />}
      </div>

    </div>
  )
}
