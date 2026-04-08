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

function TasksPanel({ queued, rightNow, done }) {
  const active = [...(rightNow || []), ...(queued || [])]
  const completed = done || []

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Active ({active.length})
          </div>
          {active.map(t => (
            <div key={t.id} style={{
              padding: '10px 14px',
              marginBottom: 6,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: t.status === 'building' || t.status === 'qa' ? '#22C55E' : '#F59E0B',
                boxShadow: t.status === 'building' ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
              }} />
              <span style={{ fontSize: 13, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title || t.text || 'Untitled task'}
              </span>
              <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, textTransform: 'capitalize' }}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Done ({completed.length})
          </div>
          {completed.slice(0, 20).map(t => (
            <div key={t.id} style={{
              padding: '8px 14px',
              marginBottom: 4,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: 0.6,
            }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 13, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title || t.text || 'Untitled task'}
              </span>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && completed.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 8, paddingTop: 60 }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
          </svg>
          <span style={{ fontSize: 13 }}>No tasks</span>
        </div>
      )}
    </div>
  )
}

function ChatPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: 12,
      color: C.muted,
      fontFamily: "'Inter', sans-serif",
    }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span style={{ fontSize: 14 }}>Chat</span>
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
        {tab === 'chat'  && <ChatPanel />}
      </div>

    </div>
  )
}
