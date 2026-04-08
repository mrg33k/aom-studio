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

// ── Color palette (dark-first) ────────────────────────────────────────────────

const C = {
  bg:           '#060A12',
  nav:          'rgba(8,14,28,0.98)',
  navBorder:    'rgba(255,255,255,0.06)',
  text:         '#F0F4FF',
  muted:        '#506480',
  accent:       '#3B9EFF',
  accentFaint:  'rgba(59,158,255,0.12)',
  tabActive:    '#60A5FA',
  badge:        '#EF4444',
}

// ── AOM Logo mark ─────────────────────────────────────────────────────────────

function AomLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: 'linear-gradient(135deg, #3B9EFF 0%, #2563EB 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 10px rgba(59,158,255,0.35)',
        flexShrink: 0,
      }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 20h18L12 2z" fill="white" opacity={0.9} />
          <path d="M12 8l-4.5 10h9L12 8z" fill="rgba(0,0,0,0.3)" />
        </svg>
      </div>
      <span style={{
        fontSize: 14,
        fontWeight: 800,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.04em',
      }}>
        AOM
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
        borderRadius: 8,
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
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
          background: C.badge,
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
      borderRadius: 8,
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
      background: C.badge,
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
        borderBottom: active ? `2px solid ${C.tabActive}` : '2px solid transparent',
        cursor: 'pointer',
        color: active ? C.tabActive : C.muted,
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

function AgentCard({ agent, lastMessage }) {
  const [hovered, setHovered] = useState(false)
  const cfg = getStatusCfg(agent.status)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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

function HomePanel({ user, agents, inboxItems }) {
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
      <style>{`@keyframes cvPulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>

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

function TasksPanel({ queued, rightNow, done }) {
  const [searchQuery,    setSearchQuery]    = useState('')
  const [activeProject,  setActiveProject]  = useState('all')

  const active    = [...(rightNow || []), ...(queued || [])]
  const completed = done || []
  const allTasks  = [...active, ...completed]

  // Collect unique agents/projects from all tasks
  const projects = useMemo(() => {
    const seen = new Set()
    allTasks.forEach(t => {
      const label = t.agent_identity || t.agentIdentity
      if (label) seen.add(label)
    })
    return Array.from(seen).sort()
  }, [allTasks])

  // Filter helper
  function filterTasks(tasks) {
    return tasks.filter(t => {
      const title   = (t.title || t.text || '').toLowerCase()
      const matchQ  = !searchQuery || title.includes(searchQuery.toLowerCase())
      const agent   = t.agent_identity || t.agentIdentity || ''
      const matchP  = activeProject === 'all' || agent === activeProject
      return matchQ && matchP
    })
  }

  const filteredActive    = filterTasks(active)
  const filteredCompleted = filterTasks(completed)

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px',
      fontFamily: "'Inter', sans-serif",
    }}>

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
              borderRadius: 7,
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
                fontSize: 14, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Project filter pills */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', ...projects].map(p => (
              <button
                key={p}
                onClick={() => setActiveProject(p)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeProject === p ? '1px solid rgba(59,158,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: activeProject === p ? 'rgba(59,158,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: activeProject === p ? C.accent : C.muted,
                  textTransform: p === 'all' ? 'uppercase' : 'capitalize',
                  letterSpacing: p === 'all' ? '0.06em' : 0,
                  transition: 'all 0.15s',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active tasks */}
      {filteredActive.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Active ({filteredActive.length})
          </div>
          {filteredActive.map(t => {
            const sc = getStatusColor(t.status)
            return (
              <div key={t.id} style={{
                padding: '10px 14px',
                marginBottom: 6,
                borderRadius: 8,
                background: sc.bg,
                border: `1px solid ${sc.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: sc.dot,
                  boxShadow: sc.glow,
                }} />
                <span style={{ fontSize: 13, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title || t.text || 'Untitled task'}
                </span>
                {(t.qa_score || t.qaScore) && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#22C55E',
                    background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                  }}>
                    QA {t.qa_score || t.qaScore}
                  </span>
                )}
                <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, textTransform: 'capitalize' }}>
                  {t.status}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed tasks */}
      {filteredCompleted.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Done ({filteredCompleted.length})
          </div>
          {filteredCompleted.slice(0, 20).map(t => {
            const sc = getStatusColor(t.status)
            return (
              <div key={t.id} style={{
                padding: '8px 14px',
                marginBottom: 4,
                borderRadius: 8,
                background: sc.bg,
                border: `1px solid ${sc.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: 0.65,
              }}>
                {t.status === 'failed' ? (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                ) : (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                <span style={{ fontSize: 13, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title || t.text || 'Untitled task'}
                </span>
                {(t.qa_score || t.qaScore) && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#3B9EFF',
                    background: 'rgba(59,158,255,0.1)', border: '1px solid rgba(59,158,255,0.2)',
                    borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                  }}>
                    QA {t.qa_score || t.qaScore}
                  </span>
                )}
              </div>
            )
          })}
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

function ChatPanel({ agents, inboxItems, worldId }) {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

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

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !selectedAgent) return
    setInput('')
    setSending(true)

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: new Date().toISOString(),
      source: 'corner-dashboard',
    }])

    try {
      await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: selectedAgent.slug,
          text,
          role: 'user',
          source: 'corner-dashboard',
          client_id: worldId,
        }),
      })
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
          onClick={() => { setSelectedAgent(null); setMessages([]) }}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{selectedAgent.name}</span>
            <StatusDot status={selectedAgent.status} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.2 }}>
            {getStatusCfg(selectedAgent.status).label}
          </div>
        </div>
      </div>

      {/* Messages scroll area */}
      <div style={{
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
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.95)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
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
              maxHeight: 80,
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
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
              stroke={input.trim() && !sending ? '#fff' : C.muted}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CornerV3() {
  const [currentUser, setCurrentUser] = useState(null)
  const [worldId, setWorldId]         = useState(getClientId())
  const [tab, setTab]                 = useState('home')
  const [unreadChat, setUnreadChat]   = useState(0)

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

  const ROW1_H = 52
  const ROW2_H = 40
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
        background: C.nav,
        borderBottom: '1px solid ' + C.navBorder,
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
          padding: '0 16px',
          gap: 12,
          borderBottom: '1px solid ' + C.navBorder,
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
          padding: '0 4px',
          gap: 2,
        }}>
          <Tab
            label="Home"
            icon={<HomeIcon color={tab === 'home' ? C.tabActive : C.muted} />}
            active={tab === 'home'}
            onClick={() => handleTabChange('home')}
            badge={null}
          />
          <Tab
            label="Tasks"
            icon={<TasksIcon color={tab === 'tasks' ? C.tabActive : C.muted} />}
            active={tab === 'tasks'}
            onClick={() => handleTabChange('tasks')}
            badge={<Badge count={activeTaskCount} />}
          />
          <Tab
            label="Chat"
            icon={<ChatIcon color={tab === 'chat' ? C.tabActive : C.muted} />}
            active={tab === 'chat'}
            onClick={() => handleTabChange('chat')}
            badge={<Badge count={unreadChat} />}
          />
        </div>

      </nav>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'home'  && <HomePanel user={currentUser} agents={agents} inboxItems={inboxItems} />}
        {tab === 'tasks' && <TasksPanel queued={queued} rightNow={rightNow} done={done} />}
        {tab === 'chat'  && <ChatPanel agents={agents} inboxItems={inboxItems} worldId={worldId} />}
      </div>

    </div>
  )
}
