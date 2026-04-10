// CornerV3.jsx -- Dashboard v2: Two-row nav + world switcher
// Route: /dashboard/v2
//
// Layout:
//   Row 1: AOM logo | WorldSelector | bell icon + user avatar
//   Row 2: Chat (badge) / Tasks (badge) tabs
//
// All styling is inline -- no CSS modules.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Reorder } from 'framer-motion'
import { supabase } from './lib/supabase.js'
import {
  getClientId,
  setClientIdFromUser,
  setWorldOverride,
  getUserWorld,
} from './lib/clientConfig.js'
import { useTasks } from './hooks/useTasks'
import { useDataPipe } from './hooks/useDataPipe'
import { useProjects } from './hooks/useProjects'
import { formatRelativeTime } from './timeUtils'
import WorldSelector from './components/WorldSelector.jsx'
import VoiceChat from './components/VoiceChat.jsx'
import ChatMessageRenderer from './components/ChatMessageRenderer.jsx'
// ProjectCard import removed -- projects now render as inline cards matching agent card style

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
        Corner<span style={{ color: C.accent }}>.</span>
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
        background: C.s1,
        border: '1px solid ' + C.border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 150ms ease, border 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.border = '1px solid ' + C.border2 }}
      onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.border = '1px solid ' + C.border }}
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
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: C.accent,
          border: '1.5px solid ' + C.bg,
        }} />
      )}
    </button>
  )
}

// ── User avatar with profile name edit popover ───────────────────────────────

function UserAvatar({ user, onUserUpdate }) {
  const initial = user?.email?.[0]?.toUpperCase() || user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'
  const avatarUrl = user?.user_metadata?.avatar_url

  const [open, setOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const popoverRef = useRef(null)

  // Sync input when popover opens
  useEffect(() => {
    if (open) {
      setNameInput(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')
    }
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSave = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
      if (!error && data?.user && onUserUpdate) onUserUpdate(data.user)
      setOpen(false)
    } catch (_) { /* silent */ }
    setSaving(false)
  }

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{initial}</span>
        }
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: 36,
          right: 0,
          width: 240,
          background: C.s1,
          border: `1px solid ${C.border2}`,
          borderRadius: 12,
          padding: 16,
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
            Display name
          </div>
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              color: C.text,
              background: C.s2,
              border: `1px solid ${C.border2}`,
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !nameInput.trim()}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '7px 0',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              color: '#fff',
              background: saving || !nameInput.trim() ? C.muted : C.accent,
              border: 'none',
              borderRadius: 8,
              cursor: saving || !nameInput.trim() ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
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
      minWidth: 14,
      height: 14,
      borderRadius: 7,
      background: C.accent,
      color: '#000',
      fontSize: 8,
      fontWeight: 800,
      fontFamily: "'JetBrains Mono', monospace",
      padding: '0 4px',
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
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 18px',
        background: 'transparent',
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        color: active ? C.text : C.muted,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        transition: 'color 150ms ease',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = C.text2 }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.muted }}
    >
      {icon}
      {label}
      {badge}
      {active && (
        <span style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: 2,
          background: C.accent,
          borderRadius: 1,
        }} />
      )}
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
  BUILDING: { color: C.yellow,  pulse: false, label: 'Building'  },
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

const agentColors = {
  rex:     '#10B981',
  bobby:   '#EAB308',
  colton:  '#EAB308',
  steffen: '#A78BFA',
  cleo:    '#F472B6',
  elon:    '#60A5FA',
  gary:    '#FB923C',
  alex:    '#22C55E',
  tony:    '#22C55E',
  jacob:   '#FACC15',
}

function AgentCard({ agent, lastMessage, unreadCount, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false)
  const bgColor = agentColors[agent.slug] || '#60A5FA'
  const initial = (agent.name || '?')[0].toUpperCase()
  // cv3.html 3-state status model: on (accent) | busy/building (yellow) | off (dim)
  const statusUpper = agent.status?.toUpperCase()
  const statusColor = statusUpper === 'IDLE' ? C.dim : statusUpper === 'BUILDING' ? C.yellow : C.accent
  const statusLabel = statusUpper === 'IDLE' ? 'Idle' : statusUpper === 'BUILDING' ? 'Building' : 'Online'
  const statusGlow = statusUpper === 'BUILDING' ? '0 0 6px rgba(234,179,8,0.5)' : 'none'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(agent)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: hovered ? C.s2 : C.s1,
        border: `1px solid ${hovered ? C.border2 : isSelected ? 'rgba(16,185,129,0.15)' : C.border}`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 150ms ease, border-color 150ms ease, transform 120ms ease, box-shadow 120ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {/* Active accent left bar -- shown for currently selected chat agent */}
      {isSelected && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />
      )}

      {/* 38px circle avatar */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontWeight: 800,
        fontSize: 15,
        color: '#000',
        fontFamily: "'Inter', sans-serif",
      }}>{initial}</div>

      {/* Info: name + preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
            {agent.name}
          </span>
          {lastMessage?.timestamp && (
            <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
              {formatChatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: C.muted,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: "'Inter', sans-serif",
        }}>
          {lastMessage?.text || agent.role || 'No recent messages'}
        </div>
      </div>

      {/* Right: status + unread count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 9, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: statusColor,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: statusColor,
            boxShadow: statusGlow,
          }} />
          {statusLabel}
        </div>
        {unreadCount > 0 && (
          <div style={{
            minWidth: 18, height: 18, borderRadius: 9,
            background: C.accent, color: '#000',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Rotating greeting messages ────────────────────────────────────────────────

const _timeOfDay = () => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const GREETINGS = [
  (name) => `Hey ${name}, what are we working on?`,
  (name) => `What's on the agenda, ${name}?`,
  (name) => `What are we shipping today, ${name}?`,
  (name) => `Let's build something great, ${name}.`,
  (name) => `Ready when you are, ${name}.`,
  (name) => `What's the move, ${name}?`,
  (name) => `Back at it, ${name}. What's first?`,
  (name) => `Good ${_timeOfDay()}, ${name}. Let's go.`,
]

const VOICE_OPTIONS = [
  { id: 'kore',          label: 'Kore',          desc: 'Firm' },
  { id: 'puck',          label: 'Puck',          desc: 'Upbeat' },
  { id: 'charon',        label: 'Charon',        desc: 'Informative' },
  { id: 'aoede',         label: 'Aoede',         desc: 'Breezy' },
  { id: 'fenrir',        label: 'Fenrir',        desc: 'Excitable' },
  { id: 'orus',          label: 'Orus',          desc: 'Firm' },
  { id: 'zephyr',        label: 'Zephyr',        desc: 'Bright' },
  { id: 'leda',          label: 'Leda',          desc: 'Youthful' },
  { id: 'callirrhoe',    label: 'Callirrhoe',    desc: 'Easy-going' },
  { id: 'autonoe',       label: 'Autonoe',       desc: 'Bright' },
  { id: 'enceladus',     label: 'Enceladus',     desc: 'Breathy' },
  { id: 'iapetus',       label: 'Iapetus',       desc: 'Clear' },
  { id: 'umbriel',       label: 'Umbriel',       desc: 'Easy-going' },
  { id: 'algieba',       label: 'Algieba',       desc: 'Smooth' },
  { id: 'despina',       label: 'Despina',       desc: 'Smooth' },
  { id: 'erinome',       label: 'Erinome',       desc: 'Clear' },
  { id: 'algenib',       label: 'Algenib',       desc: 'Gravelly' },
  { id: 'rasalgethi',    label: 'Rasalgethi',    desc: 'Informative' },
  { id: 'laomedeia',     label: 'Laomedeia',     desc: 'Upbeat' },
  { id: 'achernar',      label: 'Achernar',      desc: 'Soft' },
  { id: 'alnilam',       label: 'Alnilam',       desc: 'Firm' },
  { id: 'schedar',       label: 'Schedar',       desc: 'Even' },
  { id: 'gacrux',        label: 'Gacrux',        desc: 'Mature' },
  { id: 'pulcherrima',   label: 'Pulcherrima',   desc: 'Forward' },
  { id: 'achird',        label: 'Achird',        desc: 'Friendly' },
  { id: 'zubenelgenubi', label: 'Zubenelgenubi', desc: 'Casual' },
  { id: 'vindemiatrix',  label: 'Vindemiatrix',  desc: 'Gentle' },
  { id: 'sadachbia',     label: 'Sadachbia',     desc: 'Lively' },
  { id: 'sadaltager',    label: 'Sadaltager',    desc: 'Knowledgeable' },
  { id: 'sulafat',       label: 'Sulafat',       desc: 'Warm' },
]

// ── Home panel with agent cards ────────────────────────────────────────────────

function HomePanel({ user, agents, inboxItems, onSelectAgent, selectedAgentSlug }) {
  const [greetingIdx, setGreetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Build a quick lookup: agent slug -> last inbox item (message preview)
  const inboxMap = useMemo(() => {
    const m = {}
    for (const item of (inboxItems || [])) {
      if (item.agent) m[item.agent] = item
    }
    return m
  }, [inboxItems])

  // Count unread messages per agent (uses isUnread flag from useDataPipe)
  const unreadCounts = useMemo(() => {
    const counts = {}
    for (const item of (inboxItems || [])) {
      if (item.agent && item.isUnread) counts[item.agent] = (counts[item.agent] || 0) + 1
    }
    return counts
  }, [inboxItems])

  // Pick a new random greeting each time HomePanel mounts (tab switch / navigation)
  useEffect(() => {
    setGreetingIdx(Math.floor(Math.random() * GREETINGS.length))
  }, [])

  const displayName = useMemo(() =>
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there'
  , [user?.id])

  // Find first active agent for hero sub text
  const activeAgent = (agents || []).find(a => a.status?.toUpperCase() !== 'IDLE')

  // ── Drag-to-reorder state ────────────────────────────────────────────────
  // orderedSlugs: the persistent order. null = not yet initialized.
  const [orderedSlugs, setOrderedSlugs] = useState(null)
  const orderInitialized = useRef(false)

  // Initialize order: localStorage first (instant), then Supabase (async fallback)
  useEffect(() => {
    if (!agents?.length || orderInitialized.current) return
    orderInitialized.current = true

    // Try localStorage first (fastest)
    const saved = localStorage.getItem('aom_agent_order')
    if (saved) {
      try {
        setOrderedSlugs(JSON.parse(saved))
        return
      } catch {}
    }

    // Fall back to Supabase agents.display_order
    if (supabase) {
      const clientId = getClientId()
      supabase
        .from('agents')
        .select('slug, display_order')
        .eq('client_id', clientId)
        .order('display_order', { ascending: true })
        .then(({ data }) => {
          if (data?.length) {
            const slugs = data.map(a => a.slug)
            setOrderedSlugs(slugs)
            localStorage.setItem('aom_agent_order', JSON.stringify(slugs))
          } else {
            // Default: active first, then idle
            const defaultSlugs = [...agents]
              .sort((a, b) => {
                const aActive = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
                const bActive = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
                return aActive - bActive
              })
              .map(a => a.slug)
            setOrderedSlugs(defaultSlugs)
          }
        })
    } else {
      // No Supabase -- default order
      const defaultSlugs = [...agents]
        .sort((a, b) => {
          const aActive = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
          const bActive = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
          return aActive - bActive
        })
        .map(a => a.slug)
      setOrderedSlugs(defaultSlugs)
    }
  }, [agents])

  // Derive display list: order from orderedSlugs, live data from agents
  const displayAgents = useMemo(() => {
    if (!agents?.length) return []
    if (!orderedSlugs) {
      // Before initialization: active first
      return [...agents].sort((a, b) => {
        const aActive = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        const bActive = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        return aActive - bActive
      })
    }
    const agentMap = Object.fromEntries(agents.map(a => [a.slug, a]))
    const ordered = orderedSlugs.map(s => agentMap[s]).filter(Boolean)
    // Append any newly added agents not yet in saved order
    const savedSet = new Set(orderedSlugs)
    const extras = agents.filter(a => !savedSet.has(a.slug))
    return [...ordered, ...extras]
  }, [agents, orderedSlugs])

  const handleReorder = useCallback((newAgents) => {
    const newSlugs = newAgents.map(a => a.slug)
    setOrderedSlugs(newSlugs)
    localStorage.setItem('aom_agent_order', JSON.stringify(newSlugs))
    // Persist display_order to agents table (fire-and-forget, cross-device)
    if (supabase) {
      const clientId = getClientId()
      const updates = newAgents.map((a, i) =>
        supabase
          .from('agents')
          .update({ display_order: (i + 1) * 10 })
          .eq('slug', a.slug)
          .eq('client_id', clientId)
      )
      Promise.all(updates).then(results => {
        const failed = results.find(r => r.error)
        if (failed) console.warn('[Corner] display_order update failed:', failed.error?.message)
      })
    }
  }, [])

  return (
    <div style={{ flex: 1, overflowY: 'auto', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Pulse keyframe (injected once) ─────────────────────────────────── */}
      <style>{`@keyframes cvPulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '20px 14px 10px' : '28px 20px 12px', position: 'relative' }}>
        {/* Radial gradient glow */}
        <div style={{
          position: 'absolute', top: -20, left: 0, right: 0, height: 140,
          background: 'radial-gradient(ellipse at 30% 40%, rgba(16,185,129,0.035), transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Sub text with status dot */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: activeAgent ? C.accent : C.dim,
            boxShadow: activeAgent ? `0 0 6px ${C.accent}` : 'none',
            animation: activeAgent ? 'cvPulse 1.8s ease-in-out infinite' : 'none',
          }} />
          {activeAgent ? `${activeAgent.name} is online` : 'All agents idle'}
        </div>

        {/* Rotating heading */}
        <h1 style={{
          fontSize: isMobile ? '26px' : 'clamp(26px, 5.5vw, 40px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.04em',
          color: C.text,
          margin: 0,
          fontFamily: "'Inter', sans-serif",
        }}>
          {GREETINGS[greetingIdx](displayName)}
        </h1>
      </div>

      {/* ── Section label ───────────────────────────────────────────────────── */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: "'JetBrains Mono', monospace",
        padding: '18px 20px 8px',
      }}>
        Your Team
      </div>

      {/* ── Agent cards ─────────────────────────────────────────────────────── */}
      {displayAgents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 8, color: C.muted }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={8} r={4}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span style={{ fontSize: 13 }}>No agents found</span>
        </div>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={displayAgents}
          onReorder={handleReorder}
          style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: isMobile ? '0 12px' : '0 16px', listStyle: 'none', margin: 0 }}
        >
          {displayAgents.map(agent => (
            <Reorder.Item
              as="div"
              key={agent.slug}
              value={agent}
              style={{ touchAction: 'none', cursor: 'grab' }}
              whileDrag={{ scale: 1.02, boxShadow: '0 5px 20px rgba(0,0,0,0.35)', zIndex: 10 }}
            >
              <AgentCard
                agent={agent}
                lastMessage={inboxMap[agent.slug] || null}
                unreadCount={unreadCounts[agent.slug] || 0}
                onClick={onSelectAgent}
                isSelected={agent.slug === selectedAgentSlug}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <div style={{ height: 20 }} />
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

// ── Project filter pills (loaded from Supabase projects table) ────────────────

function TasksPanel({ queued, rightNow, waiting, done, worldId, refreshTasks }) {
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeProject, setActiveProject] = useState('all')
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [projectName,            setProjectName]            = useState('')
  const [selectedColor,          setSelectedColor]          = useState('#10B981')
  const [shippedLimit,           setShippedLimit]           = useState(50)
  const [projectNames,           setProjectNames]           = useState([])
  const [taskInput,              setTaskInput]              = useState('')
  const [taskInputFocused,       setTaskInputFocused]       = useState(false)
  const [taskSubmitting,         setTaskSubmitting]         = useState(false)
  const [expandedTask,           setExpandedTask]           = useState(null)
  const [taskThread,             setTaskThread]             = useState([])
  const [threadLoading,          setThreadLoading]          = useState(false)
  const taskInputRef = useRef(null)
  const runnerSignaledRef = useRef(false)

  // Fetch task thread messages when a task is expanded
  const toggleTaskExpand = useCallback(async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null)
      setTaskThread([])
      return
    }
    setExpandedTask(taskId)
    setThreadLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('text,timestamp,role,source')
        .eq('agent', `task:${taskId}`)
        .order('timestamp', { ascending: true })
        .limit(30)
      setTaskThread(data || [])
    } catch { setTaskThread([]) }
    setThreadLoading(false)
  }, [expandedTask])
  const { projects: taskProjects } = useProjects()

  // Auto-start runner when Tasks tab opens and there are queued tasks
  useEffect(() => {
    if (runnerSignaledRef.current) return
    if (queued?.length > 0 || rightNow?.length > 0) {
      runnerSignaledRef.current = true
      fetch('/api/dashboard/task-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startRunner' }),
      }).catch(() => {})
    }
  }, [queued, rightNow])

  // ── Instant task maker: submit handler ──────────────────────────────────────
  const handleTaskSubmit = useCallback(async () => {
    const text = taskInput.trim()
    if (!text || taskSubmitting) return

    setTaskSubmitting(true)
    try {
      const clientId = worldId || getClientId()
      const res = await fetch('/api/dashboard/v2-task-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: text,
          description: text,
          status: 'queued',
          priority: 0,
          client_id: clientId,
          created_by: 'dashboard',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[task-maker] API error:', err)
      } else {
        setTaskInput('')
        // Refresh tasks to pick up the new one immediately
        if (refreshTasks) refreshTasks()
      }
    } catch (err) {
      console.error('[task-maker] Network error:', err)
    } finally {
      setTaskSubmitting(false)
    }
  }, [taskInput, taskSubmitting, worldId, refreshTasks])

  const handleTaskInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTaskSubmit()
    }
  }, [handleTaskSubmit])

  // Load project names from Supabase on mount
  useEffect(() => {
    if (!supabase) return
    supabase.from('projects').select('name,slug').eq('is_active', true).order('name')
      .then(({ data }) => {
        if (data) setProjectNames(data.map(p => p.name))
      })
  }, [])

  const active    = [...(rightNow || []), ...(queued || [])]
  const completed = done || []
  const waitingTasks = waiting || []

  // Reply input state for waiting tasks
  const [waitingReply, setWaitingReply] = useState({})
  const [waitingReplySending, setWaitingReplySending] = useState({})

  // Project pills from Supabase projects table
  const projectPills = ['All', ...projectNames]

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
  const isDismissed       = t => t.metadata?.dismissed === true
  const filteredFailed    = filterTasks(completed.filter(t => t.status === 'failed' && !isDismissed(t)))
  const filteredCompleted = filterTasks(completed.filter(t => t.status !== 'failed' && !isDismissed(t)))

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
  const MIN_BAR_H     = 2
  const MAX_BAR_H     = 19

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

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
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Search + Filters */}
        <div style={{ marginBottom: 16 }}>
          {/* Search input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: C.s1,
            border: '1px solid ' + (searchFocused ? 'rgba(16,185,129,0.15)' : C.border),
            borderRadius: 12,
            padding: '9px 14px',
            transition: 'border-color 0.2s',
            marginBottom: 10,
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                  fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
              >×</button>
            )}
          </div>

          {/* Project filter pills */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {projectPills.map(p => {
              const key      = p === 'All' ? 'all' : p.toLowerCase()
              const isActive = activeProject === key
              return (
                <button
                  key={p}
                  onClick={() => setActiveProject(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid ' + C.border,
                    background: isActive ? 'rgba(16,185,129,0.1)' : C.s1,
                    color: isActive ? C.accent : C.text2,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >{p}</button>
              )
            })}
            <button
              onClick={() => {
                if (!showCreateProjectModal) { setProjectName(''); setSelectedColor('#10B981'); }
                setShowCreateProjectModal(prev => !prev);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid ' + C.border,
                background: C.s1,
                color: C.text2,
                fontFamily: "'Inter', sans-serif",
              }}
            >+</button>
          </div>
        </div>

        {/* Building Now */}
        {filteredActive.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Building Now
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                {filteredActive.length}
              </span>
            </div>
            {filteredActive.map((t, i) => {
              const isBuilding = t.status === 'building' || t.status === 'qa'
              const cardColor = isBuilding ? '#22C55E' : '#EAB308'
              const cardBorder = isBuilding ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.1)'
              const statusLabel = t.status === 'building' ? 'Building' : t.status === 'qa' ? 'QA' : t.status === 'planning' ? 'Planning' : t.status === 'classifying' ? 'Classifying' : 'Queued'
              return (
              <div
                key={t.id}
                onClick={() => toggleTaskExpand(t.id)}
                style={{
                  padding: '14px 16px',
                  marginBottom: 8,
                  borderRadius: 14,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  background: '#1A2035',
                  border: `1px solid ${expandedTask === t.id ? 'rgba(255,255,255,0.15)' : cardBorder}`,
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
                {/* Animated top progress bar -- only for actively building/qa */}
                {isBuilding && <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: 2,
                  background: cardColor,
                  animation: 'bld 5s ease-in-out infinite',
                  borderRadius: '14px 14px 0 0',
                }} />}
                {/* Animated yellow bar for queued */}
                {!isBuilding && <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: 2,
                  background: cardColor,
                  animation: 'bld 8s ease-in-out infinite',
                  borderRadius: '14px 14px 0 0',
                  opacity: 0.6,
                }} />}

                {/* Card content row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  {/* Left: title + tags */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: cardColor, fontSize: 14, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap' }}>
                      {t.title || t.text || 'Untitled task'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      {t.project_id && (() => {
                        const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
                        return proj ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
                      })()}
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
                      <span style={{ color: C.dim, fontSize: 9 }}>{expandedTask === t.id ? '▾' : '▸'}</span>
                    </div>
                  </div>
                  {/* Right: score + label */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: cardColor, fontSize: 12, fontWeight: 800, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.qa_score || t.qaScore || '...'}
                    </div>
                    <div style={{ color: t.status === 'building' ? cardColor : t.status === 'queued' ? C.dim : C.muted, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>
                      {statusLabel}
                    </div>
                  </div>
                </div>
                {/* Expandable thread */}
                {expandedTask === t.id && (
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                    {threadLoading ? (
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                    ) : taskThread.length === 0 ? (
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events yet.</div>
                    ) : taskThread.map((m, idx) => (
                      <div key={idx} style={{
                        fontSize: 11, color: C.text2, lineHeight: 1.4,
                        padding: '3px 0',
                        fontFamily: "'JetBrains Mono', monospace",
                        borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      }}>
                        <span style={{ color: C.dim, fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                        {' '}
                        <span>{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )})}

          </div>
        )}

        {/* Weekly Stats Bar -- always visible, matches cv3.html .stats */}
        <div style={{
          background: C.s1,
          border: '1px solid ' + C.border,
          borderRadius: 14,
          padding: '12px 14px',
          margin: '14px -4px 16px',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8,
          }}>This Week</div>

          {/* 7-day bar chart: M T W T F S S */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 32 }}>
            {DAY_LABELS.map((label, i) => {
              const count    = dailyCounts[i]
              const isFuture = i > (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
              const barH     = count > 0 ? Math.round((count / maxDailyCount) * (MAX_BAR_H - MIN_BAR_H)) + MIN_BAR_H : MIN_BAR_H
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 3 }}>
                  <div style={{
                    width: '100%',
                    height: barH,
                    borderRadius: 3,
                    background: isFuture || count === 0 ? 'rgba(255,255,255,0.06)' : C.accent,
                    minHeight: 2,
                    transition: 'height 0.3s ease',
                  }} />
                  <div style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: C.dim,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{label}</div>
                </div>
              )
            })}
          </div>

          {/* Metrics row: Tasks, Pass Rate, Avg QA */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid ' + C.border,
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{weekTotal}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Tasks</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{passRate !== null ? passRate + '%' : '--'}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Pass Rate</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, textAlign: 'center', color: C.text }}>{avgQA !== null ? avgQA : '--'}</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', textAlign: 'center' }}>Avg QA</div>
            </div>
          </div>
        </div>

        {/* Waiting for input -- skill tasks that need human direction */}
        {waitingTasks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Needs Input
              </span>
            </div>
            {waitingTasks.map((t) => {
              const agent = t.agent_identity || t.agentIdentity || 'agent'
              const question = t.metadata?.checkpoint?.question || 'Waiting for your input...'
              const replyText = waitingReply[t.id] || ''
              const sending = waitingReplySending[t.id] || false
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '14px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{agent}</span>
                    <span style={{ fontSize: 9, color: C.dim }}>needs input</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(240,244,255,0.7)', lineHeight: 1.2, marginBottom: 8 }}>
                    {t.title || t.text || 'Untitled task'}
                  </div>
                  <div style={{
                    fontSize: 13, color: '#F59E0B', lineHeight: 1.4,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.1)',
                    marginBottom: 10,
                  }}>
                    {question}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setWaitingReply(prev => ({ ...prev, [t.id]: e.target.value }))}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && replyText.trim() && !sending) {
                          setWaitingReplySending(prev => ({ ...prev, [t.id]: true }))
                          await fetch('/api/dashboard/task-action', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'resume', taskId: t.id, payload: { answer: replyText.trim() } }),
                          })
                          setWaitingReply(prev => ({ ...prev, [t.id]: '' }))
                          setWaitingReplySending(prev => ({ ...prev, [t.id]: false }))
                        }
                      }}
                      placeholder="Reply..."
                      style={{
                        flex: 1, padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, color: C.text,
                        fontSize: 13, fontFamily: "'Inter', sans-serif",
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (!replyText.trim() || sending) return
                        setWaitingReplySending(prev => ({ ...prev, [t.id]: true }))
                        await fetch('/api/dashboard/task-action', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'resume', taskId: t.id, payload: { answer: replyText.trim() } }),
                        })
                        setWaitingReply(prev => ({ ...prev, [t.id]: '' }))
                        setWaitingReplySending(prev => ({ ...prev, [t.id]: false }))
                      }}
                      disabled={!replyText.trim() || sending}
                      style={{
                        padding: '8px 14px', borderRadius: 10,
                        background: replyText.trim() && !sending ? '#F59E0B' : 'rgba(255,255,255,0.05)',
                        border: 'none', cursor: replyText.trim() && !sending ? 'pointer' : 'default',
                        color: replyText.trim() && !sending ? '#000' : C.muted,
                        fontSize: 12, fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {sending ? '...' : 'Reply'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Failed tasks -- requeue or dismiss */}
        {filteredFailed.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Failed
              </span>
              <button
                onClick={async () => {
                  for (const t of filteredFailed) {
                    await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                  }
                }}
                style={{ fontSize: 10, fontWeight: 600, color: C.dim, cursor: 'pointer', letterSpacing: '0.02em', background: 'none', border: 'none', padding: '4px 0', WebkitTapHighlightColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = C.muted }}
                onMouseLeave={e => { e.currentTarget.style.color = C.dim }}
              >
                Clear all
              </button>
            </div>
            {filteredFailed.map((t) => {
              const qa = t.qa_score || t.qaScore
              const agent = t.agent_identity || t.agentIdentity
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTaskExpand(t.id)}
                  style={{
                    padding: '14px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)',
                    border: expandedTask === t.id ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(240,244,255,0.6)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap' }}>
                        {t.title || t.text || 'Untitled task'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        {agent && <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(240,244,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{agent}</span>}
                        {qa && <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444', letterSpacing: '0.06em' }}>QA {qa}/10</span>}
                        <span style={{ color: C.dim, fontSize: 9 }}>{expandedTask === t.id ? '▾' : '▸'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'requeue', taskId: t.id }) })
                        }}
                        style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Requeue
                      </button>
                      <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await fetch('/api/dashboard/task-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', taskId: t.id }) })
                        }}
                        style={{ fontSize: 11, fontWeight: 600, color: C.dim, cursor: 'pointer', padding: '4px 8px', background: 'none', border: 'none', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  {/* Expandable thread */}
                  {expandedTask === t.id && (
                    <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                      {threadLoading ? (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                      ) : taskThread.length === 0 ? (
                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events.</div>
                      ) : taskThread.map((m, idx) => (
                        <div key={idx} style={{
                          fontSize: 11, color: C.text2, lineHeight: 1.4,
                          padding: '3px 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          borderBottom: idx < taskThread.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        }}>
                          <span style={{ color: C.dim, fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                          {' '}
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Shipped tasks */}
        {filteredCompleted.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                Shipped
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                {filteredCompleted.length}
              </span>
            </div>
            {filteredCompleted.slice(0, shippedLimit).map((t, i) => {
              const cardColor = getShippedCardColor(t, i)
              const qa        = t.qa_score || t.qaScore
              const agent     = t.agent_identity || t.agentIdentity
              const project   = t.project_name || t.projectName
              const isFailed     = t.status === 'failed'
              const isDark       = isFailed
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTaskExpand(t.id)}
                  style={{
                    padding: '14px 16px',
                    marginBottom: 8,
                    borderRadius: 14,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    backgroundColor: isFailed ? 'rgba(239,68,68,0.15)' : cardColor,
                    opacity: 1,
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    {/* Left: title + tags */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#F0F4FF' : '#0A0A0A', lineHeight: 1.2, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap', textDecoration: 'none' }}>
                        {t.title || t.text || 'Untitled task'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                        {t.project_id && (() => {
                          const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
                          return proj ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
                        })()}
                        {agent && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(240,244,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {agent}
                          </span>
                        )}
                        {project && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(240,244,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {project}
                          </span>
                        )}
                        {!agent && !project && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(240,244,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {isFailed ? 'Failed' : 'Shipped'}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Right: QA score + label */}
                    {qa && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: isFailed ? '#EF4444' : 'rgba(0,0,0,0.55)', lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                          {qa}
                        </div>
                        <div style={{ fontSize: 8, fontWeight: 600, color: isDark ? 'rgba(240,244,255,0.3)' : 'rgba(0,0,0,0.3)', textTransform: 'uppercase', textAlign: 'right', marginTop: 2 }}>
                          QA
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Expandable thread */}
                  {expandedTask === t.id && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, paddingTop: 8 }}>
                      {threadLoading ? (
                        <div style={{ fontSize: 11, color: isDark ? C.dim : 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
                      ) : taskThread.length === 0 ? (
                        <div style={{ fontSize: 11, color: isDark ? C.dim : 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>No pipeline events.</div>
                      ) : taskThread.map((m, idx) => (
                        <div key={idx} style={{
                          fontSize: 11, color: isDark ? C.text2 : 'rgba(0,0,0,0.5)', lineHeight: 1.4,
                          padding: '3px 0',
                          fontFamily: "'JetBrains Mono', monospace",
                          borderBottom: idx < taskThread.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'}` : 'none',
                        }}>
                          <span style={{ color: isDark ? C.dim : 'rgba(0,0,0,0.25)', fontSize: 9 }}>{(m.timestamp || '').slice(11, 19)}</span>
                          {' '}
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredCompleted.length > shippedLimit && (
              <div
                onClick={() => setShippedLimit(prev => prev + 50)}
                style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.muted, cursor: 'pointer', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                Show more ({filteredCompleted.length - shippedLimit} remaining)
              </div>
            )}
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

      {/* ── Task creation input bar (CV3 pill design) ── */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (taskInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: taskInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            ref={taskInputRef}
            type="text"
            placeholder="Add a task..."
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            onFocus={() => setTaskInputFocused(true)}
            onBlur={() => setTaskInputFocused(false)}
            onKeyDown={handleTaskInputKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {/* Action buttons inside pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Attach */}
            <button title="Attach" onClick={() => {}} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            {/* Commands */}
            <button title="Commands" onClick={() => {}} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </button>
          </div>
          {/* Mic button (hidden when text present) */}
          {!taskInput.trim() && (
            <button title="Voice" onClick={() => {}} style={{
              width: 42, height: 42, borderRadius: '50%',
              background: C.accent, border: 'none',
              color: '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'transform 0.15s, box-shadow 0.2s',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {/* Send button (shown when text present) */}
          {taskInput.trim() && (
            <button
              title="Create task"
              onClick={handleTaskSubmit}
              disabled={taskSubmitting}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: taskSubmitting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                opacity: taskSubmitting ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {taskSubmitting ? (
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
        >
          <div
            style={{
              background: C.s1,
              border: '1px solid ' + C.border2,
              borderRadius: 16,
              padding: 24,
              width: 300,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
              New Project
            </div>

            <input
              type="text"
              placeholder="Project name..."
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              style={{
                background: C.bg2,
                border: '1px solid ' + C.border2,
                borderRadius: 8,
                padding: '8px 12px',
                color: C.text,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              {['#EAB308', '#22C55E', '#A78BFA', '#F59E0B', '#10B981', '#F97316'].map(color => (
                <div
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    outline: selectedColor === color ? '2px solid rgba(255,255,255,0.25)' : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreateProjectModal(false); setProjectName(''); setSelectedColor('#10B981') }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + C.border2,
                  background: 'none',
                  color: C.text2,
                  fontFamily: "'Inter', sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: C.accent,
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                }}
              >Create</button>
            </div>
          </div>
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

// ── Swipeable card with action buttons revealed on swipe-left ────────────────
function SwipeCard({ children, actions, style }) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const moved = useRef(false)
  const actionsWidth = actions.length * 56

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    moved.current = false
    setSwiping(true)
  }, [])
  const onTouchMove = useCallback((e) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (!moved.current && Math.abs(dy) > Math.abs(dx)) { setSwiping(false); return }
    moved.current = true
    const clamped = Math.max(-actionsWidth, Math.min(0, dx + (offsetX < -10 ? -actionsWidth : 0)))
    setOffsetX(clamped)
  }, [swiping, actionsWidth, offsetX])
  const onTouchEnd = useCallback(() => {
    setSwiping(false)
    setOffsetX(prev => prev < -actionsWidth / 2 ? -actionsWidth : 0)
  }, [actionsWidth])
  // Desktop: click away to close
  const onMouseDown = useCallback((e) => {
    if (offsetX < 0) { e.preventDefault(); e.stopPropagation(); setOffsetX(0) }
  }, [offsetX])

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, marginBottom: 6, ...style }}>
      {/* Action buttons behind */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'stretch',
      }}>
        {actions.map((a, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); a.onAction(); setOffsetX(0) }} style={{
            width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            background: a.bg || 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            {a.icon}
            <span style={{ fontSize: 9, fontWeight: 700, color: a.color || '#fff', letterSpacing: '0.02em' }}>{a.label}</span>
          </button>
        ))}
      </div>
      {/* Foreground card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 200ms ease',
          position: 'relative', zIndex: 1,
          background: C.bg,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function ChatPanel({ agents, inboxItems, worldId, initialAgent, onSelectAgent, onSelectProject, onBack, currentUser, allTasks = [] }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [selectedAgent, setSelectedAgent] = useState(initialAgent || null)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [chatInputFocused, setChatInputFocused] = useState(false)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceStatus, setVoiceStatus]     = useState('idle')
  const [voiceVolume, setVoiceVolume]     = useState(0)
  const [voiceTranscriptText, setVoiceTranscriptText] = useState('')
  const [voiceMuted, setVoiceMuted]       = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const fileInputRef   = useRef(null)
  const voiceChatRef   = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const sendProjectTextRef = useRef(null)
  const sendAgentTextRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micError, setMicError] = useState(null)
  const [inlineProject, setInlineProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [conversationFilter, setConversationFilter] = useState('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [agentVoices, setAgentVoices] = useState({})
  const [chatNameInput, setChatNameInput] = useState('')

  // ── Greeting + last login ─────────────────────────────────────────────────
  const [greetingIdx, setGreetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))
  // Memoize on user ID so the displayed name stays stable during tab switches
  // and agent selection — it only re-derives when the user identity changes.
  const displayName = useMemo(() =>
    currentUser?.user_metadata?.full_name?.split(' ')[0] ||
    currentUser?.email?.split('@')[0] ||
    'there'
  , [currentUser?.id])
  const lastLoginText = formatRelativeTime(currentUser?.last_sign_in_at)

  // ── User identity for multi-user message tracking ──────────────────────────
  const userIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  // ── Collapsible section states (Favorites=open, Agents=closed, Projects=closed) ──
  const [sectionStates, setSectionStates] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aom_section_states'))
      // Force agents/projects open (v2 default change). Old localStorage may have false.
      if (saved && typeof saved === 'object') return { ...saved, favorites: true, agents: true, projects: true }
    } catch {}
    return { favorites: true, agents: true, projects: true }
  })
  const toggleSection = useCallback((key) => {
    setSectionStates(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('aom_section_states', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // ── Unread counts per agent ──────────────────────────────────────────────
  const unreadCounts = useMemo(() => {
    const counts = {}
    for (const item of (inboxItems || [])) {
      if (item.agent && item.isUnread) counts[item.agent] = (counts[item.agent] || 0) + 1
    }
    return counts
  }, [inboxItems])

  // ── Favorites + muted state ──────────────────────────────────────────────
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aom_favorites')) || [] } catch { return [] }
  })
  const [mutedSlugs, setMutedSlugs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aom_muted')) || [] } catch { return [] }
  })
  const isFav = useCallback((type, slug) => favorites.some(f => f.type === type && f.slug === slug), [favorites])
  const isMuted = useCallback((slug) => mutedSlugs.includes(slug), [mutedSlugs])
  const toggleFav = useCallback((type, slug) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.type === type && f.slug === slug)
      const next = exists ? prev.filter(f => !(f.type === type && f.slug === slug)) : [...prev, { type, slug }]
      localStorage.setItem('aom_favorites', JSON.stringify(next))
      return next
    })
  }, [])
  const toggleMute = useCallback((slug) => {
    setMutedSlugs(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
      localStorage.setItem('aom_muted', JSON.stringify(next))
      return next
    })
  }, [])

  const { isLoading: projectsLoading, isError: projectsError, projects } = useProjects()

  const selectedProject = useMemo(() => {
    if (inlineProject) return inlineProject
    if (!projectId || !projects?.length) return null
    return projects.find(p => String(p.id) === String(projectId)) || null
  }, [projectId, projects, inlineProject])

  // ── Per-chat voice selection ──────────────────────────────────────────────
  const currentChatKey = selectedAgent?.slug || (selectedProject ? `project:${selectedProject.slug}` : null)
  const currentVoice = currentChatKey ? (agentVoices[currentChatKey] || 'kore') : 'kore'

  // Load agent voices from DB on worldId change
  useEffect(() => {
    if (!worldId) return
    fetch(`/api/dashboard/agent-voice?client=${encodeURIComponent(worldId)}`)
      .then(r => r.ok ? r.json() : { voices: {} })
      .then(({ voices }) => { if (voices) setAgentVoices(voices) })
      .catch(() => {})
  }, [worldId])

  const selectVoice = useCallback((voice) => {
    if (!currentChatKey) return
    setAgentVoices(prev => ({ ...prev, [currentChatKey]: voice }))
    fetch('/api/dashboard/agent-voice', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: currentChatKey, voice, client_id: worldId }),
    }).catch(() => {})
  }, [currentChatKey, worldId])

  // Initialise rename input when modal opens
  useEffect(() => {
    if (settingsOpen) {
      const name = selectedAgent ? selectedAgent.name : (selectedProject?.name || '')
      setChatNameInput(name)
    }
  }, [settingsOpen, selectedAgent, selectedProject])

  const saveRoomName = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed || !currentChatKey) return
    const slug = currentChatKey.startsWith('project:')
      ? currentChatKey.replace('project:', '')
      : currentChatKey
    fetch(`/api/dashboard/agent-status?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(trimmed)}&client_id=${encodeURIComponent(worldId)}`, {
      method: 'PATCH',
    }).catch(() => {})
  }, [currentChatKey, worldId])

  // Fetch latest message per agent (comprehensive -- covers all agents, not just missing from inboxItems)
  const [agentPreviews, setAgentPreviews] = useState({})
  useEffect(() => {
    if (!supabase || !worldId || !agents?.length) return
    const slugs = agents.filter(a => a.slug).map(a => a.slug)
    if (slugs.length === 0) return

    // Fetch latest message for every agent to ensure fresh baseline
    Promise.all(slugs.map(slug =>
      supabase
        .from('messages')
        .select('agent, text, timestamp, id, role')
        .eq('client_id', worldId)
        .eq('agent', slug)
        .order('timestamp', { ascending: false })
        .limit(1)
        .then(({ data }) => data?.[0] || null)
    )).then(results => {
      const previews = {}
      for (const msg of results) {
        if (msg?.agent) {
          previews[msg.agent] = {
            agent: msg.agent,
            text: (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : ''),
            timestamp: msg.timestamp,
            id: msg.id,
            isUnread: msg.role !== 'user',
          }
        }
      }
      setAgentPreviews(previews)
    })
  }, [agents, worldId])

  // Realtime: update agent previews when any new message arrives
  useEffect(() => {
    if (!supabase || !worldId) return
    const channel = supabase
      .channel(`cv3-previews-${worldId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          if (!msg?.agent) return
          const preview = {
            agent: msg.agent,
            text: (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : ''),
            timestamp: msg.timestamp,
            id: msg.id,
            isUnread: msg.role !== 'user',
          }
          setAgentPreviews(prev => {
            const existing = prev[msg.agent]
            // Only update if this message is newer
            if (existing && existing.timestamp > msg.timestamp) return prev
            return { ...prev, [msg.agent]: preview }
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [worldId])

  // Fetch latest message per project (stored under agent key "project:{slug}") for search filtering
  const [projectPreviews, setProjectPreviews] = useState({})
  useEffect(() => {
    if (!supabase || !worldId || !projects?.length) return
    const slugs = projects.filter(p => p.slug).map(p => p.slug)
    if (!slugs.length) return
    Promise.all(slugs.map(slug =>
      supabase.from('messages').select('agent, text, timestamp')
        .eq('client_id', worldId).eq('agent', `project:${slug}`)
        .order('timestamp', { ascending: false }).limit(1)
        .then(({ data }) => data?.[0] || null)
    )).then(results => {
      const previews = {}
      for (const msg of results) {
        if (msg?.agent) previews[msg.agent] = { text: (msg.text || '').slice(0, 80), timestamp: msg.timestamp }
      }
      setProjectPreviews(previews)
    })
  }, [projects, worldId])

  // Build unread map: agent slug -> inbox item (last message preview)
  // Merges inboxItems (from useDataPipe) with agentPreviews, preferring newest timestamp
  const unreadMap = useMemo(() => {
    const m = {}
    // Start with agentPreviews (fresh fetch + realtime updates)
    for (const [slug, preview] of Object.entries(agentPreviews)) {
      m[slug] = preview
    }
    // Merge inboxItems, but only if they have a newer timestamp
    for (const item of (inboxItems || [])) {
      if (!item.agent) continue
      const existing = m[item.agent]
      if (!existing || (item.timestamp && item.timestamp > existing.timestamp)) {
        m[item.agent] = item
      }
    }
    return m
  }, [inboxItems, agentPreviews])

  // Agents sorted: most recent message first (like iMessage), then active, then idle
  const chattableAgents = useMemo(() => {
    return (agents || [])
      .filter(a => a.slug && a.name)
      .sort((a, b) => {
        const aMsg = unreadMap[a.slug]
        const bMsg = unreadMap[b.slug]
        const aTime = aMsg?.timestamp || ''
        const bTime = bMsg?.timestamp || ''
        // Sort by most recent message timestamp (descending)
        if (aTime && bTime) return bTime > aTime ? 1 : bTime < aTime ? -1 : 0
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        // No messages: active first
        const aAct = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        const bAct = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        return aAct - bAct
      })
  }, [agents, unreadMap])

  // Pins section: only explicitly pinned agents + projects, sorted by most recent message, max 5
  const pinnedItems = useMemo(() => {
    const items = []
    // Add pinned agents
    for (const agent of (agents || [])) {
      if (!agent.slug || !agent.name || !isFav('agent', agent.slug)) continue
      const lastMsg = unreadMap[agent.slug]
      items.push({ type: 'agent', data: agent, timestamp: lastMsg?.timestamp || '' })
    }
    // Add pinned projects
    for (const project of (projects || [])) {
      if (!project.slug || !isFav('project', project.slug)) continue
      const lastMsg = unreadMap[`project:${project.slug}`]
      items.push({ type: 'project', data: project, timestamp: lastMsg?.timestamp || '' })
    }
    // Sort by most recent message timestamp descending
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
      if (a.timestamp && !b.timestamp) return -1
      if (!a.timestamp && b.timestamp) return 1
      return 0
    })
    return items.slice(0, 5)
  }, [agents, projects, isFav, unreadMap])

  const topAgentSlugs = useMemo(() => new Set(
    pinnedItems.filter(i => i.type === 'agent').map(i => i.data.slug)
  ), [pinnedItems])

  const topProjectSlugs = useMemo(() => new Set(
    pinnedItems.filter(i => i.type === 'project').map(i => i.data.slug)
  ), [pinnedItems])

  // Agent-project association map from tasks (agent slug → Set of project IDs they've worked on)
  const agentProjectIds = useMemo(() => {
    const map = {}
    for (const task of (allTasks || [])) {
      const slug = task.agent_identity || task.agentIdentity
      if (!slug) continue
      if (!map[slug]) map[slug] = new Set()
      if (task.project_id) map[slug].add(String(task.project_id))
    }
    return map
  }, [allTasks])

  // Search-filtered agent list (excludes pinned)
  const filteredVisibleAgents = useMemo(() => {
    const base = chattableAgents.filter(a => !topAgentSlugs.has(a.slug))
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    const matchingProjectIds = new Set(
      (projects || []).filter(p => (p.name || '').toLowerCase().includes(q)).map(p => String(p.id))
    )
    return base.filter(a => {
      if ((a.name || '').toLowerCase().includes(q)) return true
      if ((a.role || '').toLowerCase().includes(q)) return true
      const preview = unreadMap[a.slug]
      if (preview?.text?.toLowerCase().includes(q)) return true
      if (matchingProjectIds.size > 0) {
        const agentProjs = agentProjectIds[a.slug]
        if (agentProjs) {
          for (const pid of matchingProjectIds) { if (agentProjs.has(pid)) return true }
        }
      }
      return false
    })
  }, [chattableAgents, topAgentSlugs, searchQuery, unreadMap, projects, agentProjectIds])

  // Search-filtered project list (excludes pinned)
  const filteredVisibleProjects = useMemo(() => {
    const base = (projects || []).filter(p => !topProjectSlugs.has(p.slug))
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    return base.filter(p => {
      if ((p.name || '').toLowerCase().includes(q)) return true
      if ((p.slug || '').toLowerCase().includes(q)) return true
      const preview = projectPreviews[`project:${p.slug}`]
      if (preview?.text?.toLowerCase().includes(q)) return true
      return false
    })
  }, [projects, topProjectSlugs, searchQuery, projectPreviews])

  // Search-filtered pinned items
  const filteredPinnedItems = useMemo(() => {
    if (!searchQuery) return pinnedItems
    const q = searchQuery.toLowerCase()
    return pinnedItems.filter(item => {
      if (item.type === 'agent') {
        const a = item.data
        if ((a.name || '').toLowerCase().includes(q)) return true
        if ((a.role || '').toLowerCase().includes(q)) return true
        const preview = unreadMap[a.slug]
        if (preview?.text?.toLowerCase().includes(q)) return true
        return false
      }
      if (item.type === 'project') {
        const p = item.data
        if ((p.name || '').toLowerCase().includes(q)) return true
        if ((p.slug || '').toLowerCase().includes(q)) return true
        const preview = projectPreviews[`project:${p.slug}`]
        if (preview?.text?.toLowerCase().includes(q)) return true
        return false
      }
      return false
    })
  }, [pinnedItems, searchQuery, unreadMap, projectPreviews])

  // ── Unified Conversations list: agents + projects sorted by most recent message ──
  const conversationItems = useMemo(() => {
    const items = []
    // Add non-pinned agents
    for (const agent of filteredVisibleAgents) {
      const lastMsg = unreadMap[agent.slug]
      items.push({ type: 'agent', data: agent, timestamp: lastMsg?.timestamp || '' })
    }
    // Add non-pinned projects
    for (const project of filteredVisibleProjects) {
      const preview = projectPreviews[`project:${project.slug}`]
      items.push({ type: 'project', data: project, timestamp: preview?.timestamp || '' })
    }
    // Sort by most recent message timestamp descending, then alphabetically
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
      if (a.timestamp && !b.timestamp) return -1
      if (!a.timestamp && b.timestamp) return 1
      // No messages: sort alphabetically by name
      const aName = (a.data.name || '').toLowerCase()
      const bName = (b.data.name || '').toLowerCase()
      return aName < bName ? -1 : aName > bName ? 1 : 0
    })
    return items
  }, [filteredVisibleAgents, filteredVisibleProjects, unreadMap, projectPreviews])

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
      .order('timestamp', { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data.reverse())
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
            setMessages(prev => {
              // Deduplicate: skip if we already have this id (from optimistic insert)
              if (prev.some(m => m.id === msg.id)) return prev
              // Voice messages: replace temp voice entry (voice-user-* / voice-model-*) with the
              // real DB row so we don't show the same utterance twice.
              if (msg.source === 'voice') {
                const tempRole = msg.role === 'user' ? 'user' : 'agent'
                const tempIdx = prev.findIndex(m =>
                  m.source === 'voice' &&
                  m.text === msg.text &&
                  m.role === tempRole &&
                  typeof m.id === 'string' && m.id.startsWith('voice-')
                )
                if (tempIdx !== -1) {
                  const next = [...prev]
                  next[tempIdx] = msg
                  return next
                }
              }
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedAgent, worldId])

  // Load project messages when a project is selected
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    setLoadingMsgs(true)
    setMessages([])
    supabase
      .from('messages')
      .select('*')
      .eq('client_id', worldId)
      .eq('agent', `project:${selectedProject.slug}`)
      .order('timestamp', { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        setLoadingMsgs(false)
        if (!error && data) setMessages(data)
      })
  }, [worldId, selectedProject, selectedAgent])

  // Realtime subscription for project messages
  useEffect(() => {
    if (selectedAgent || !supabase || !worldId || !selectedProject) return
    const channel = supabase
      .channel(`cv3-project-${worldId}-${selectedProject.slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        (payload) => {
          const msg = payload.new
          if (msg.agent === `project:${selectedProject.slug}`) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              // Voice messages: replace temp voice entry to prevent duplicates
              if (msg.source === 'voice') {
                const tempRole = msg.role === 'user' ? 'user' : 'agent'
                const tempIdx = prev.findIndex(m =>
                  m.source === 'voice' &&
                  m.text === msg.text &&
                  m.role === tempRole &&
                  typeof m.id === 'string' && m.id.startsWith('voice-')
                )
                if (tempIdx !== -1) {
                  const next = [...prev]
                  next[tempIdx] = msg
                  return next
                }
              }
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [worldId, selectedProject, selectedAgent])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when thread opens; close settings menu on navigation
  useEffect(() => {
    if (selectedAgent) setTimeout(() => inputRef.current?.focus(), 100)
    setSettingsOpen(false)
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
    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: 'corner-dashboard',
    }])

    // Optimistic preview update so agent list shows "You: ..." immediately
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: {
        agent: selectedAgent.slug,
        text: previewText,
        timestamp: now,
        id: tempUserId,
        isUnread: false,
      },
    }))

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
            ...userIdentity,
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
            ...userIdentity,
            project_id: selectedProject?.id || null,
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
        const replyTime = new Date().toISOString()
        const tempAgentId = `temp-agent-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempAgentId,
          role: 'agent',
          agent: selectedAgent.slug,
          text: reply,
          timestamp: replyTime,
          source: 'gemini',
        }])
        // Update preview with AI reply so agent list is current
        const replyPreview = (reply.length > 80 ? reply.slice(0, 80) + '...' : reply)
        setAgentPreviews(prev => ({
          ...prev,
          [selectedAgent.slug]: {
            agent: selectedAgent.slug,
            text: replyPreview,
            timestamp: replyTime,
            id: tempAgentId,
            isUnread: false,
          },
        }))
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

  // Core send logic for agent chat -- accepts text directly so voice transcription can call it
  const sendAgentText = useCallback(async (text) => {
    if (!text?.trim() || !selectedAgent || !worldId) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)
    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: 'corner-dashboard',
    }])
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: { agent: selectedAgent.slug, text: previewText, timestamp: now, id: tempUserId, isUnread: false },
    }))
    const history = messagesRef.current.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || '' }],
    }))
    try {
      const [saveResult, geminiResult] = await Promise.allSettled([
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: selectedAgent.slug, text, role: 'user', source: 'corner-dashboard', client_id: worldId, ...userIdentity }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, agent: selectedAgent.slug, client_id: worldId, history, project_id: selectedProject?.id || null, ...userIdentity }),
        }).then(r => r.json()),
      ])
      if (saveResult.status === 'fulfilled' && saveResult.value?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.value.message } : m))
      }
      if (geminiResult.status === 'fulfilled' && geminiResult.value?.reply) {
        const reply = geminiResult.value.reply
        const replyTime = new Date().toISOString()
        const tempAgentId = `temp-agent-${Date.now()}`
        setMessages(prev => [...prev, { id: tempAgentId, role: 'agent', agent: selectedAgent.slug, text: reply, timestamp: replyTime, source: 'gemini' }])
        setAgentPreviews(prev => ({
          ...prev,
          [selectedAgent.slug]: { agent: selectedAgent.slug, text: reply.length > 80 ? reply.slice(0, 80) + '...' : reply, timestamp: replyTime, id: tempAgentId, isUnread: false },
        }))
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: selectedAgent.slug, text: reply, role: 'agent', source: 'gemini', client_id: worldId }),
        }).then(r => r.json()).then(data => {
          if (data?.message?.id) setMessages(prev => prev.map(m => m.id === tempAgentId ? { ...data.message } : m))
        }).catch(() => {})
      }
    } catch (err) {
      console.error('[ChatPanel] agent send error:', err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [selectedAgent, worldId, selectedProject])

  useEffect(() => { sendAgentTextRef.current = sendAgentText }, [sendAgentText])

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
            ...userIdentity,
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

  // Core send logic shared by typed input and voice transcription
  const sendProjectText = useCallback(async (text) => {
    if (!text?.trim() || !selectedProject || !worldId) return
    setSending(true)
    const agentKey = `project:${selectedProject.slug}`
    const now = new Date().toISOString()
    const tempUserId = `temp-proj-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: agentKey,
      text,
      timestamp: now,
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
          body: JSON.stringify({ agent: agentKey, text, role: 'user', source: 'corner-dashboard', client_id: worldId, ...userIdentity }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            project_slug: selectedProject.slug,
            project_id: selectedProject.id || null,
            client_id: worldId,
            history,
            ...userIdentity,
          }),
        }).then(r => r.json()),
      ])

      // Replace temp user msg with real DB id
      if (saveResult.status === 'fulfilled' && saveResult.value?.message?.id) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...saveResult.value.message } : m))
      }

      // Append AI response
      if (geminiResult.status === 'fulfilled' && geminiResult.value?.reply) {
        const reply = geminiResult.value.reply
        const replyTime = new Date().toISOString()
        const tempAgentId = `temp-proj-reply-${Date.now()}`
        setMessages(prev => [...prev, {
          id: tempAgentId,
          role: 'agent',
          agent: agentKey,
          text: reply,
          timestamp: replyTime,
          source: 'gemini',
        }])
        // Persist AI response
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agentKey,
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
      console.error('[ChatPanel] project send error:', err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [sending, selectedProject, worldId])

  // Keep a stable ref so the recorder onstop callback (set at record-start) always reaches the latest sendProjectText
  useEffect(() => { sendProjectTextRef.current = sendProjectText }, [sendProjectText])

  const handleProjectSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendProjectText(text)
  }, [input, sending, sendProjectText])

  const handleProjectKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProjectSend() }
  }, [handleProjectSend])

  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      setMicError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioChunksRef.current = []
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(t => t.stop())
          setIsTranscribing(true)
          try {
            const base64 = await blobToBase64(blob)
            const res = await fetch('/api/dashboard/v2-transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_base64: base64, mime_type: 'audio/webm' }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (data.text?.trim()) {
              await sendProjectTextRef.current?.(data.text.trim())
            } else {
              setMicError('No speech detected. Try again.')
            }
          } catch (err) {
            console.error('[ChatPanel] transcription error:', err)
            setMicError('Failed to transcribe audio. Check your connection.')
          } finally {
            setIsTranscribing(false)
          }
        }
        recorder.start()
        mediaRecorderRef.current = recorder
        setIsRecording(true)
      } catch (err) {
        console.error('Microphone access denied:', err)
        setMicError('Microphone access denied. Allow mic in browser settings.')
      }
    }
  }, [isRecording])

  // ── Project view ─────────────────────────────────────────────────────────────

  if ((projectId || inlineProject) && !selectedAgent) {
    const projColor = selectedProject?.color || '#6B8AB0'
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Project chat header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(8,14,28,0.95)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { setMessages([]); setInlineProject(null); onBack?.(); if (projectId) navigate('/dashboard') }}
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
          {/* Project color dot */}
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
            border: `1px solid ${projColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: 3,
              background: projColor,
              boxShadow: `0 0 6px ${projColor}66`,
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'block',
            }}>
              {selectedProject?.name || 'Project'}
            </span>
          </div>
          {/* Settings button */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              title="Settings"
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
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
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
                border: `1px solid ${projColor}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: projColor,
                  boxShadow: `0 0 10px ${projColor}77`,
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
                {selectedProject?.name || 'Project'}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
            </div>
          )}
          {messages.map(msg => {
            const isUser = msg.role === 'user'
            const senderName = msg.user_name || (isUser ? displayName : null)
            const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
            const senderColor = isUser ? (msg.user_name && msg.user_name !== displayName ? '#7C3AED' : '#2563EB') : projColor
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
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
                    border: `1px solid ${projColor}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: projColor }} />
                  </div>
                )}
                <div style={{ maxWidth: '78%', minWidth: 0 }}>
                  {isUser && msg.user_name && msg.user_name !== displayName && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 2, fontFamily: "'Inter', sans-serif" }}>
                      {msg.user_name}
                    </div>
                  )}
                  <div style={{
                    padding: '9px 13px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 13, lineHeight: 1.5,
                    color: isUser ? '#fff' : C.text,
                    background: isUser
                      ? `linear-gradient(135deg, ${senderColor} 0%, ${senderColor}dd 100%)`
                      : 'rgba(255,255,255,0.06)',
                    border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    wordBreak: 'break-word',
                    ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
                  }}>
                    {isUser
                      ? msg.text
                      : <ChatMessageRenderer content={msg.text} style={{ fontSize: 13, lineHeight: 1.5, color: C.text }} />
                    }
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
                  <div title={senderName || 'User'} style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: `linear-gradient(135deg, ${senderColor} 0%, ${senderColor}cc 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{senderInitial}</span>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden VoiceChat for project -- mounts when voice is active */}
        {isVoiceActive && (
          <div style={{ display: 'none' }}>
            <VoiceChat
              ref={voiceChatRef}
              agentSlug={`project:${selectedProject?.slug || 'rex'}`}
              agentColor={projColor}
              clientId={worldId}
              autoStart={true}
              initialVoice={currentVoice}
              onVoiceChange={selectVoice}
              onTranscript={(text, role) => {
                setVoiceTranscriptText(text)
                setMessages(prev => [...prev, {
                  id: `voice-${role}-${Date.now()}`,
                  role: role === 'model' ? 'agent' : 'user',
                  agent: `project:${selectedProject?.slug}`,
                  text,
                  timestamp: new Date().toISOString(),
                  source: 'voice',
                }])
              }}
              onStatusChange={(s) => {
                setVoiceStatus(s)
                if (s === 'idle') {
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                }
              }}
              onVolumeChange={setVoiceVolume}
            />
          </div>
        )}

        {/* Voice mode UI -- replaces input bar when voice is active */}
        {isVoiceActive && (
          <div style={{
            padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
            background: C.bg2,
            borderTop: '1px solid ' + C.border,
            flexShrink: 0,
          }}>
            <style>{`
              @keyframes vw { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
            `}</style>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 3, height: 40, marginBottom: 8,
            }}>
              {[
                { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
                { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
                { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
              ].map((bar, i) => (
                <div key={i} style={{
                  width: 3, height: bar.h, borderRadius: 2,
                  background: C.accent,
                  animation: `vw 1s ease-in-out ${bar.d} infinite`,
                }} />
              ))}
            </div>
            <div style={{
              textAlign: 'center', fontSize: 12, fontWeight: 600,
              color: C.accent, fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 4,
            }}>
              {voiceStatus === 'connecting' ? 'Connecting...'
                : voiceStatus === 'speaking' ? 'Speaking...'
                : voiceStatus === 'error' ? 'Error'
                : 'Listening...'}
            </div>
            <div style={{
              fontSize: 13, color: C.text2, textAlign: 'center',
              minHeight: 18, padding: '0 20px',
            }}>
              {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
            }}>
              <button
                onClick={() => {
                  voiceChatRef.current?.toggleMute()
                  setVoiceMuted(v => !v)
                }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: '1px solid ' + C.border,
                  background: voiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                  color: voiceMuted ? '#F87171' : C.muted,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >
                M
              </button>
              <button
                onClick={() => {
                  voiceChatRef.current?.stop()
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  background: C.red, color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >
                &#x00D7;
              </button>
            </div>
          </div>
        )}

        {/* Project chat input -- CV3 pill design, hidden when voice active */}
        {!isVoiceActive && <div style={{
          flexShrink: 0,
          padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          background: C.bg,
          borderTop: '1px solid ' + C.border,
        }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleFileSelection}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: C.s1,
            border: '1.5px solid ' + (chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
            borderRadius: 26,
            padding: '5px 5px 5px 16px',
            maxWidth: 560,
            margin: '0 auto',
            boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
            transition: 'border-color 0.25s, box-shadow 0.25s',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleProjectKeyDown}
              onFocus={() => setChatInputFocused(true)}
              onBlur={() => setChatInputFocused(false)}
              placeholder={`Message ${selectedProject?.name || 'project'}...`}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                title="Attach"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'none', border: 'none',
                  color: uploading ? C.accent : C.muted, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                {uploading ? (
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
              </button>
              <button title="Commands" onClick={() => {}} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </button>
            </div>
            {!input.trim() && (
              <button
                title={isVoiceActive ? 'End voice' : 'Start voice'}
                onClick={() => setIsVoiceActive(true)}
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: C.accent,
                  border: 'none',
                  color: '#000', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.15s, background 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#000"
                  strokeWidth="2.5" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0014 0"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            )}
            {input.trim() && (
              <button
                title="Send"
                onClick={handleProjectSend}
                disabled={sending}
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: C.accent, border: 'none',
                  color: '#000', cursor: sending ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, opacity: sending ? 0.6 : 1,
                  transition: 'transform 0.15s',
                }}
              >
                {sending ? (
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>}
        {/* Chat settings full-screen overlay */}
        {settingsOpen && (
          <div
            onClick={() => setSettingsOpen(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 380,
                maxWidth: '90vw',
                maxHeight: '80vh',
                background: C.s1,
                border: '1px solid ' + C.border2,
                borderRadius: 16,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid ' + C.border,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                  Chat Settings
                </span>
                <button
                  onClick={() => setSettingsOpen(false)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid ' + C.border,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.text2,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                overflowY: 'auto',
                flex: 1,
              }}>
                {/* Room rename */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Room Name
                  </div>
                  <input
                    value={chatNameInput}
                    onChange={e => setChatNameInput(e.target.value)}
                    onBlur={e => saveRoomName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { saveRoomName(e.target.value); e.target.blur() } }}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '8px 12px',
                      color: C.text, fontSize: 13,
                      fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                  />
                </div>
                {/* Voice selection */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Voice
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {VOICE_OPTIONS.map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => selectVoice(id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                          background: currentVoice === id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${currentVoice === id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: currentVoice === id ? '#60A5FA' : C.text1, fontFamily: "'Inter', sans-serif" }}>{label}</div>
                          <div style={{ fontSize: 11, color: C.text2, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                        </div>
                        {currentVoice === id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Agent list ───────────────────────────────────────────────────────────────

  if (!selectedAgent) {
    return (
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* ── Greeting hero ──────────────────────────────────────────────── */}
        <div style={{ paddingBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: C.accent,
              boxShadow: `0 0 6px ${C.accent}`,
            }} />
            {lastLoginText ? `Last login: ${lastLoginText}` : 'Online now'}
          </div>
          <h1 style={{
            fontSize: 'clamp(26px, 5.5vw, 40px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            color: C.text,
            margin: 0,
            fontFamily: "'Inter', sans-serif",
          }}>
            {GREETINGS[greetingIdx](displayName)}
          </h1>
        </div>

        {/* ── Search bar ───────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '8px 12px',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search agents and projects..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'rgba(255,255,255,0.8)',
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, flexShrink: 0,
                }}
              >
                &#x2715;
              </button>
            )}
          </div>
        </div>

        {/* ── Pins section ─────────────────────────────────────── */}
        {filteredPinnedItems.length > 0 && (
          <>
            <div
              onClick={() => toggleSection('favorites')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11, fontWeight: 700, color: C.muted,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: sectionStates.favorites ? 12 : 4,
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <span>Pins <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '1px 6px', letterSpacing: '0.02em' }}>{filteredPinnedItems.length}</span></span>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: sectionStates.favorites ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{ maxHeight: sectionStates.favorites ? 9999 : 0, overflow: 'hidden', transition: 'max-height 300ms ease', marginBottom: sectionStates.favorites ? 16 : 0 }}>
              {filteredPinnedItems.map(item => {
                if (item.type === 'agent') {
                  const agent = item.data
                  const lastMsg    = unreadMap[agent.slug]
                  const unreadCount = unreadCounts[agent.slug] || 0
                  const isActive   = agent.status?.toUpperCase() !== 'IDLE'
                  const muted      = isMuted(agent.slug)
                  const statusInfo = getStatusColor(agent.status)
                  const statusLabel = agent.status === 'building' ? 'Building' : agent.status === 'qa' ? 'QA' : agent.status === 'queued' ? 'Queued' : isActive ? 'Online' : 'Idle'
                  return (
                    <SwipeCard key={`pin-${agent.slug}`} actions={[
                      { label: 'Unpin', bg: C.s2, color: C.accent,
                        icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                        onAction: () => toggleFav('agent', agent.slug) },
                      { label: muted ? 'Unmute' : 'Mute', bg: 'rgba(255,255,255,0.06)', color: C.muted,
                        icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><path d={muted ? "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" : "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}/></svg>,
                        onAction: () => toggleMute(agent.slug) },
                    ]}>
                      <button
                        onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '12px 14px',
                          borderRadius: 14,
                          background: C.s1,
                          border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'all 200ms ease',
                          position: 'relative', overflow: 'hidden',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                      >
                        {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />}
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: agent.color || C.accent,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 15, color: '#000',
                        }}>
                          {(agent.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{agent.name}</span>
                              <svg width={10} height={10} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2} style={{ opacity: 0.4 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                              {lastMsg?.timestamp ? formatChatTime(lastMsg.timestamp) : ''}
                            </span>
                          </div>
                          <div style={{
                            fontSize: 12, color: C.muted, marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {lastMsg?.text || 'No messages yet'}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: 9, fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: isActive ? C.accent : agent.status === 'building' ? C.yellow : C.dim,
                          }}>
                            <div style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: statusInfo.dot,
                              boxShadow: statusInfo.glow,
                            }} />
                            {statusLabel}
                          </div>
                          {unreadCount > 0 && (
                            <span style={{
                              minWidth: 18, height: 18, borderRadius: 9,
                              background: C.accent, color: '#000',
                              fontSize: 9, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: "'JetBrains Mono', monospace",
                              padding: '0 4px',
                            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                          )}
                        </div>
                      </button>
                    </SwipeCard>
                  )
                }
                // project item
                const project = item.data
                const pColor = project.color || '#6B8AB0'
                return (
                  <SwipeCard key={`pin-${project.id || project.slug}`} actions={[
                    { label: 'Unpin', bg: C.s2, color: C.accent,
                      icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                      onAction: () => toggleFav('project', project.slug) },
                  ]}>
                    <button
                      onClick={() => { setInlineProject(project); setMessages([]); setSelectedAgent(null); onSelectProject?.(project) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 14px',
                        borderRadius: 14,
                        background: C.s1,
                        border: `1px solid ${C.border}`,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 200ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                        border: `1px solid ${pColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: pColor, boxShadow: `0 0 8px ${pColor}55` }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2} style={{ opacity: 0.4, flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </div>
                      </div>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(80,100,128,0.4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </SwipeCard>
                )
              })}
            </div>
          </>
        )}

        {/* ── Conversations section (unified agents + projects) ──────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
            userSelect: 'none',
          }}
        >
          <span>Conversations{conversationItems.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '1px 6px', letterSpacing: '0.02em' }}>{conversationItems.length}</span>}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'agents', 'projects'].map(f => (
              <button
                key={f}
                onClick={() => setConversationFilter(f)}
                style={{
                  padding: '2px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  background: conversationFilter === f ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                  color: conversationFilter === f ? C.accent : C.muted,
                }}
              >
                {f === 'all' ? 'All' : f === 'agents' ? 'Agents' : 'Projects'}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filtered = conversationFilter === 'all' ? conversationItems
            : conversationItems.filter(i => conversationFilter === 'agents' ? i.type === 'agent' : i.type === 'project')
          return filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingTop: 60, gap: 8, color: C.muted,
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 13 }}>No conversations yet</span>
          </div>
        ) : (
          filtered.map(item => {
            if (item.type === 'agent') {
              const agent = item.data
              const lastMsg    = unreadMap[agent.slug]
              const unreadCount = unreadCounts[agent.slug] || 0
              const isActive   = agent.status?.toUpperCase() !== 'IDLE'
              const pinned     = isFav('agent', agent.slug)
              const muted      = isMuted(agent.slug)
              const statusInfo = getStatusColor(agent.status)
              const statusLabel = agent.status === 'building' ? 'Building' : agent.status === 'qa' ? 'QA' : agent.status === 'queued' ? 'Queued' : isActive ? 'Online' : 'Idle'
              return (
                <SwipeCard key={`conv-${agent.slug}`} actions={[
                  { label: pinned ? 'Unpin' : 'Pin', bg: pinned ? C.s2 : 'rgba(16,185,129,0.2)', color: C.accent,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={pinned ? C.accent : 'none'} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                    onAction: () => toggleFav('agent', agent.slug) },
                  { label: muted ? 'Unmute' : 'Mute', bg: 'rgba(255,255,255,0.06)', color: C.muted,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><path d={muted ? "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" : "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}/></svg>,
                    onAction: () => toggleMute(agent.slug) },
                ]}>
                  <button
                    onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 14px',
                      borderRadius: 14,
                      background: C.s1,
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 200ms ease',
                      position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: agent.color || C.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, color: '#000',
                    }}>
                      {(agent.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{agent.name}</span>
                        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                          {lastMsg?.timestamp ? formatChatTime(lastMsg.timestamp) : ''}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 12, color: C.muted, marginTop: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        {lastMsg?.text || 'No messages yet'}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 9, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: isActive ? C.accent : agent.status === 'building' ? C.yellow : C.dim,
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: statusInfo.dot,
                          boxShadow: statusInfo.glow,
                        }} />
                        {statusLabel}
                      </div>
                      {unreadCount > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9,
                          background: C.accent, color: '#000',
                          fontSize: 9, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: '0 4px',
                        }}>{unreadCount}</span>
                      )}
                    </div>
                  </button>
                </SwipeCard>
              )
            }
            // Project item
            const project = item.data
            const pColor = project.color || '#6B8AB0'
            const pinned = isFav('project', project.slug)
            const pPreview = projectPreviews[`project:${project.slug}`]
            return (
              <SwipeCard key={`conv-${project.id || project.slug}`} actions={[
                { label: pinned ? 'Unpin' : 'Pin', bg: pinned ? C.s2 : 'rgba(16,185,129,0.2)', color: C.accent,
                  icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={pinned ? C.accent : 'none'} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                  onAction: () => toggleFav('project', project.slug) },
                { label: 'Archive', bg: 'rgba(239,68,68,0.15)', color: C.red,
                  icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={2} strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
                  onAction: () => {} },
              ]}>
                <button
                  onClick={() => { setInlineProject(project); setMessages([]); setSelectedAgent(null); onSelectProject?.(project) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '12px 14px',
                    borderRadius: 14,
                    background: C.s1,
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                    border: `1px solid ${pColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: pColor, boxShadow: `0 0 8px ${pColor}55` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {pPreview?.timestamp ? formatChatTime(pPreview.timestamp) : ''}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: C.muted, marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {pPreview?.text || 'No messages yet'}
                    </div>
                  </div>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(80,100,128,0.4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </SwipeCard>
            )
          })
        )
        })()}
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
          onClick={() => { setSelectedAgent(null); setMessages([]); setIsVoiceActive(false); onBack?.() }}
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
        {/* Mic button in header */}
        <button
          onClick={() => {
            if (isVoiceActive) {
              voiceChatRef.current?.stop()
              setIsVoiceActive(false)
              setVoiceMuted(false)
              setVoiceTranscriptText('')
            } else {
              setIsVoiceActive(true)
            }
          }}
          title={isVoiceActive ? 'End voice' : 'Start voice'}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: isVoiceActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: isVoiceActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isVoiceActive ? C.accent : C.muted,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0014 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </button>
        {/* Settings button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            title="Settings"
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden VoiceChat for audio logic -- mounts when voice is active */}
      {isVoiceActive && (
        <div style={{ display: 'none' }}>
          <VoiceChat
            ref={voiceChatRef}
            agentSlug={selectedAgent.slug}
            agentColor={selectedAgent.color}
            clientId={worldId}
            autoStart={true}
            initialVoice={currentVoice}
            onVoiceChange={selectVoice}
            onTranscript={(text, role) => {
              setVoiceTranscriptText(text)
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
              if (s === 'idle') {
                setIsVoiceActive(false)
                setVoiceMuted(false)
                setVoiceTranscriptText('')
              }
            }}
            onVolumeChange={setVoiceVolume}
          />
        </div>
      )}

      {/* Messages scroll area -- always visible */}
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
          const agSenderName = msg.user_name || (isUser ? displayName : null)
          const agSenderInitial = agSenderName ? agSenderName[0].toUpperCase() : 'U'
          const agSenderColor = isUser ? (msg.user_name && msg.user_name !== displayName ? '#7C3AED' : '#2563EB') : selectedAgent?.color || '#3B82F6'

          // Checkpoint: agent needs human input (amber card)
          if (msg.source === 'checkpoint') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '85%', minWidth: 200,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Needs Input
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Inline task card for task-runner lifecycle notifications
          if (msg.source === 'task-runner') {
            const qaMatch = msg.text?.match(/QA:\s*(\d+(?:\.\d+)?)/i)
            const qaScore = qaMatch ? parseFloat(qaMatch[1]) : null
            const isFailed = /fail/i.test(msg.text || '')
            const isStarted = /^task started/i.test(msg.text || '')
            // Extract clean title: first non-empty line
            const taskLines = (msg.text || '').split('\n').filter(l => l.trim())
            const rawTitle = taskLines[0] || ''
            const taskTitle = rawTitle.replace(/^(task\s+(started|complete[d]?|failed|done)[:\s]*)/i, '').trim() || rawTitle
            const taskDesc = taskLines.slice(1).join(' ').trim()
            const headColor = isFailed ? C.red : isStarted ? C.blue : C.accent
            const headBg = isStarted ? 'rgba(96,165,250,0.08)' : C.accentBg
            const headIcon = isFailed ? '!' : isStarted ? '▶' : '✓'
            const headLabel = isFailed ? 'Task Failed' : isStarted ? 'Task Started' : 'Task Complete'
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: C.s1,
                  border: '1px solid ' + C.border,
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '88%',
                }}>
                  {/* mt-head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: headBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: headColor, fontWeight: 800,
                    }}>{headIcon}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: headColor,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{headLabel}</span>
                  </div>
                  {/* mt-title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{taskTitle}</div>
                  {/* mt-desc */}
                  {taskDesc && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{taskDesc}</div>
                  )}
                  {/* mt-foot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {qaScore !== null ? (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: qaScore >= 8 ? 'rgba(34,197,94,0.12)' : qaScore >= 5 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
                        color: qaScore >= 8 ? C.green : qaScore >= 5 ? C.yellow : C.red,
                      }}>QA {qaScore}/10</span>
                    ) : (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: isFailed ? 'rgba(239,68,68,0.12)' : isStarted ? 'rgba(96,165,250,0.12)' : 'rgba(34,197,94,0.12)',
                        color: isFailed ? C.red : isStarted ? C.blue : C.green,
                      }}>{isFailed ? 'Failed' : isStarted ? 'Building' : 'Done'}</span>
                    )}
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>
                      {msg.agent || selectedAgent?.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(80,100,128,0.55)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Inline task card for task-created notifications (rex announcing a new task)
          if (
            msg.source === 'gemini-chat' &&
            msg.agent === 'rex' &&
            msg.text?.toLowerCase().includes('task created')
          ) {
            const textLines = (msg.text || '').split('\n').filter(l => l.trim())
            const firstLine = textLines[0] || ''
            const titleMatch = firstLine.match(/task created[:\s]+(.+)/i)
            const taskTitle = (titleMatch ? titleMatch[1].trim() : firstLine.replace(/task created/i, '').trim()) || 'New Task'
            const taskDesc = textLines.slice(1).join(' ').trim()
            const agentMatch = msg.text?.match(/(?:assigned to|for agent|agent[:\s]+)\s*([A-Za-z]+)/i)
            const taskAgent = agentMatch ? agentMatch[1] : (selectedAgent?.name || '')
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: C.s1,
                  border: '1px solid ' + C.border,
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '88%',
                }}>
                  {/* mt-head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: C.accentBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: C.accent, fontWeight: 800,
                    }}>+</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: C.accent,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>Task Created</span>
                  </div>
                  {/* mt-title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{taskTitle}</div>
                  {/* mt-desc */}
                  {taskDesc && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{taskDesc}</div>
                  )}
                  {/* mt-foot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(234,179,8,0.12)',
                      color: C.yellow,
                    }}>Queued</span>
                    {taskAgent && (
                      <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{taskAgent}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(80,100,128,0.55)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

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
                {/* Text bubble -- hidden when text is only the attachment label */}
                {msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: ')) && (
                  <div style={{
                    padding: '9px 13px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 13, lineHeight: 1.5,
                    color: isUser ? '#fff' : C.text,
                    background: isUser
                      ? `linear-gradient(135deg, ${agSenderColor} 0%, ${agSenderColor}dd 100%)`
                      : 'rgba(255,255,255,0.06)',
                    border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    wordBreak: 'break-word',
                    ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
                  }}>
                    {isUser
                      ? msg.text
                      : <ChatMessageRenderer content={msg.text} style={{ fontSize: 13, lineHeight: 1.5, color: C.text }} />
                    }
                  </div>
                )}
                {isUser && msg.user_name && msg.user_name !== displayName && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 2, marginTop: -2, fontFamily: "'Inter', sans-serif" }}>
                    {msg.user_name}
                  </div>
                )}
                {/* Attachments -- rendered outside bubble using Steffen's styles */}
                {(() => {
                  const atts = (msg.attachments && msg.attachments.length)
                    ? msg.attachments
                    : msg.attachment_url
                      ? [{
                          url: msg.attachment_url,
                          mime: msg.file_mime_type,
                          size: msg.file_size,
                          name: msg.text && msg.text.startsWith('Attached file: ')
                            ? msg.text.replace('Attached file: ', '')
                            : msg.file_name || null,
                        }]
                      : []
                  if (!atts.length) return null
                  const hasText = msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: '))
                  const isMulti = atts.length > 1
                  const items = atts.map((att, idx) => {
                    const isImage = att.mime && att.mime.startsWith('image/')
                    if (isImage) {
                      return (
                        <div
                          key={idx}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            borderRadius: 16,
                            overflow: 'hidden',
                            maxWidth: '70%',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          <img src={att.url} alt="" style={{ width: '100%', display: 'block', borderRadius: 16 }} />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          background: C.s2,
                          border: '1px solid ' + C.border,
                          borderRadius: 14,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          maxWidth: '75%',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: C.accentBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          color: C.accent,
                          fontSize: 11, fontWeight: 800,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {att.name ? att.name.split('.').pop().toUpperCase().slice(0, 4) : 'FILE'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {att.name || 'Attached file'}
                          </div>
                          {att.size != null && (
                            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {att.size < 1024 * 1024
                                ? `${Math.round(att.size / 1024)} KB`
                                : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                  if (isMulti) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '6px 16px', marginTop: hasText ? 6 : 0 }}>
                        {items}
                      </div>
                    )
                  }
                  return <div style={{ marginTop: hasText ? 6 : 0 }}>{items}</div>
                })()}
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
                  background: `linear-gradient(135deg, ${agSenderColor} 0%, ${agSenderColor}cc 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{agSenderInitial}</span>
                </div>
              )}
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice mode UI -- replaces input bar when voice is active */}
      {isVoiceActive && (
        <div style={{
          padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          background: C.bg2,
          borderTop: '1px solid ' + C.border,
          flexShrink: 0,
        }}>
          <style>{`
            @keyframes vw { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
            @keyframes recblink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
          `}</style>
          {/* Waveform bars */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 3, height: 40, marginBottom: 8,
          }}>
            {[
              { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
              { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
              { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
            ].map((bar, i) => (
              <div key={i} style={{
                width: 3, height: bar.h, borderRadius: 2,
                background: C.accent,
                animation: `vw 1s ease-in-out ${bar.d} infinite`,
              }} />
            ))}
          </div>
          {/* Status */}
          <div style={{
            textAlign: 'center', fontSize: 12, fontWeight: 600,
            color: C.accent, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 4,
          }}>
            {voiceStatus === 'connecting' ? 'Connecting...'
              : voiceStatus === 'speaking' ? 'Speaking...'
              : voiceStatus === 'error' ? 'Error'
              : 'Listening...'}
          </div>
          {/* Transcript */}
          <div style={{
            fontSize: 13, color: C.text2, textAlign: 'center',
            minHeight: 18, padding: '0 20px',
          }}>
            {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
          </div>
          {/* Buttons */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
          }}>
            {/* Mute */}
            <button
              onClick={() => {
                voiceChatRef.current?.toggleMute()
                setVoiceMuted(v => !v)
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: '1px solid ' + C.border,
                background: voiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                color: voiceMuted ? '#F87171' : C.muted,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
              }}
            >
              M
            </button>
            {/* End */}
            <button
              onClick={() => {
                voiceChatRef.current?.stop()
                setIsVoiceActive(false)
                setVoiceMuted(false)
                setVoiceTranscriptText('')
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: C.red, color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
              }}
            >
              &#x00D7;
            </button>
          </div>
        </div>
      )}

      {/* Input area -- CV3 pill design, hidden when voice is active */}
      {!isVoiceActive && <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
      }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={handleFileSelection}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setChatInputFocused(true)}
            onBlur={() => setChatInputFocused(false)}
            placeholder={`Message ${selectedAgent.name}...`}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {/* Action buttons inside pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Attach */}
            <button
              title="Attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: uploading ? C.accent : C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {uploading ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>
            {/* Commands */}
            <button title="Commands" onClick={() => {}} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </button>
          </div>
          {/* Voice button (hidden when text present) -- triggers Gemini Live voice */}
          {!input.trim() && (
            <button
              title={isVoiceActive ? 'End voice' : 'Start voice'}
              onClick={() => {
                if (isVoiceActive) {
                  voiceChatRef.current?.stop()
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                } else {
                  setIsVoiceActive(true)
                }
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: isVoiceActive ? 'rgba(16,185,129,0.15)' : C.accent,
                border: isVoiceActive ? '2px solid rgba(16,185,129,0.4)' : 'none',
                color: isVoiceActive ? C.accent : '#000', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s, background 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {/* Send button (shown when text present) */}
          {input.trim() && (
            <button
              title="Send"
              onClick={handleSend}
              disabled={sending}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: sending ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, opacity: sending ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {sending ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>}

      {/* Chat settings full-screen overlay */}
      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 380,
              maxWidth: '90vw',
              maxHeight: '80vh',
              background: C.s1,
              border: '1px solid ' + C.border2,
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid ' + C.border,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                Chat Settings
              </span>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid ' + C.border,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.text2,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* Modal body */}
            <div style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Room rename */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Room Name
                </div>
                <input
                  value={chatNameInput}
                  onChange={e => setChatNameInput(e.target.value)}
                  onBlur={e => saveRoomName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { saveRoomName(e.target.value); e.target.blur() } }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '8px 12px',
                    color: C.text, fontSize: 13,
                    fontFamily: "'Inter', sans-serif", outline: 'none',
                  }}
                />
              </div>
              {/* Voice selection */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Voice
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {VOICE_OPTIONS.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      onClick={() => selectVoice(id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                        background: currentVoice === id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${currentVoice === id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: currentVoice === id ? '#60A5FA' : C.text1, fontFamily: "'Inter', sans-serif" }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                      </div>
                      {currentVoice === id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

// ── Toast notification ────────────────────────────────────────────────────────

function TaskCompletionToast({ message, visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <>
      <style>{`@keyframes su{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: C.s2,
        border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'su 0.3s ease-out',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: C.green,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.text2,
          fontFamily: "'Inter', sans-serif",
        }}>{message}</span>
      </div>
    </>
  )
}

export default function CornerV3() {
  const [currentUser, setCurrentUser]   = useState(null)
  const [worldId, setWorldId]           = useState(getClientId())
  const [tab, setTab]                   = useState('chat')
  const [unreadChat, setUnreadChat]     = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [conversationTarget, setConversationTarget] = useState(null) // { name, type: 'agent'|'project' }
  const [inputBarText, setInputBarText] = useState('')
  const [inputBarSending, setInputBarSending] = useState(false)
  const [inputBarFocused, setInputBarFocused] = useState(false)
  const [rootVoiceActive, setRootVoiceActive] = useState(false)
  const [rootVoiceStatus, setRootVoiceStatus] = useState('idle')
  const [rootVoiceMuted, setRootVoiceMuted]   = useState(false)
  const [rootVoiceTranscript, setRootVoiceTranscript] = useState('')
  const rootVoiceChatRef = useRef(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  const [toast, setToast] = useState({ visible: false, message: '' })
  const prevDoneIdsRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // User identity for multi-user message tracking (parent scope)
  const parentUserIdentity = useMemo(() => ({
    user_id: currentUser?.id || null,
    user_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || null,
  }), [currentUser?.id])

  const { queued, rightNow, waiting, done, allTasks, refresh: refreshTasks } = useTasks()

  // ── Toast: detect newly completed tasks ──────────────────────────────────────
  useEffect(() => {
    if (!done) return
    if (prevDoneIdsRef.current === null) {
      // Seed on first load -- no toast for already-done tasks
      prevDoneIdsRef.current = new Set(done.map(t => t.id))
      return
    }
    const newDone = done.filter(t => !prevDoneIdsRef.current.has(t.id))
    if (newDone.length > 0) {
      const task = newDone[0]
      const title = task.title || task.text || 'Task'
      const label = title.length > 45 ? title.slice(0, 45) + '...' : title
      const wasBuilt = task.qa_score != null && task.qa_score > 0
      setToast({ visible: true, message: `${label} ${wasBuilt ? 'shipped.' : 'done.'}` })
    }
    prevDoneIdsRef.current = new Set(done.map(t => t.id))
  }, [done])
  // useDataPipe provides agents (with realtime status), inboxItems, and projectDefs
  const { agents, inboxItems, projectDefs } = useDataPipe(null)
  // tabRef keeps the realtime callback fresh without resubscribing on every tab change
  const tabRef = useRef(tab)

  // Active task count: queued + building/qa
  const activeTaskCount = (queued?.length || 0) + (rightNow?.length || 0)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return

    // getSession() reads from localStorage (near-instant) rather than making a network
    // request like getUser() does. This seeds currentUser before the first paint cycle.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null
      if (user) {
        setCurrentUser(user)
        setClientIdFromUser(user)
        setWorldId(getClientId())
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      // Only update state when the user identity actually changes.
      // Passing a function to setCurrentUser avoids re-renders on transient
      // events (TOKEN_REFRESHED, USER_UPDATED) where the user ID is the same.
      setCurrentUser(prev => {
        if (user?.id && user.id === prev?.id) return prev
        return user
      })
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

  // Clear unread when switching to chat; Home tab always clears conversation
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab)
    if (newTab === 'chat') {
      setUnreadChat(0)
      setSelectedAgent(null)
      setConversationTarget(null)
    }
  }, [])

  // Select an agent and switch to chat tab
  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(agent)
    setConversationTarget({ name: agent.name, type: 'agent' })
    setTab('chat')
    setUnreadChat(0)
  }, [])

  // Called by ChatPanel when a project is selected
  const handleSelectProject = useCallback((project) => {
    setSelectedAgent(null)
    setConversationTarget({ name: project.name, type: 'project' })
    setTab('chat')
    setUnreadChat(0)
  }, [])

  // Called by ChatPanel back button — clear conversation
  const handleBackFromConversation = useCallback(() => {
    setSelectedAgent(null)
    setConversationTarget(null)
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

  // ── Input bar handlers ────────────────────────────────────────────────────

  const handleInputBarFocus = useCallback(() => {
    // If not already on chat view, open chat with last selected agent or rex
    if (tab !== 'chat') {
      const target = selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0]
      if (target) {
        setSelectedAgent(target)
        setConversationTarget({ name: target.name, type: 'agent' })
      }
      setTab('chat')
      setUnreadChat(0)
    }
  }, [tab, selectedAgent, agents])

  const handleInputBarSend = useCallback(async () => {
    const text = inputBarText.trim()
    if (!text || inputBarSending) return

    // Ensure we have an agent to send to
    const target = selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0]
    if (!target) return

    // Switch to chat tab if not already there
    if (tab !== 'chat') {
      setSelectedAgent(target)
      setConversationTarget({ name: target.name, type: 'agent' })
      setTab('chat')
      setUnreadChat(0)
    }

    setInputBarText('')
    setInputBarSending(true)

    try {
      await Promise.allSettled([
        fetch('/api/dashboard/supabase-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: target.slug,
            text,
            role: 'user',
            source: 'corner-dashboard',
            client_id: worldId,
            ...parentUserIdentity,
          }),
        }).then(r => r.json()),
        fetch('/api/dashboard/v2-gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agent: target.slug,
            client_id: worldId,
            history: [],
            project_id: selectedProject?.id || null,
            ...parentUserIdentity,
          }),
        }).then(r => r.json()),
      ])
    } catch (e) {
      // silent fail -- message already persisted optimistically by ChatPanel
    } finally {
      setInputBarSending(false)
    }
  }, [inputBarText, inputBarSending, selectedAgent, agents, tab, worldId])

  // ── Nav heights ───────────────────────────────────────────────────────────

  const ROW1_H = 44
  const ROW2_H = 36
  const NAV_H  = ROW1_H + ROW2_H

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── NAV BAR ────────────────────────────────────────────────────────── */}
      <nav style={{
        width: '100%',
        flexShrink: 0,
        background: C.bg,
        borderBottom: '1px solid ' + C.border,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>

        {/* Row 1: Logo + World (left) | Bell + Avatar (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 0',
        }}>
          {/* Left: Logo + World switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AomLogo />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellIcon hasNew={unreadChat > 0} />
            <UserAvatar user={currentUser} onUserUpdate={setCurrentUser} />
          </div>
        </div>

        {/* Row 2: Tabs (left) | Stats (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            <Tab
              label="Home"
              icon={<HomeIcon color={tab === 'chat' && !conversationTarget ? C.text : C.muted} />}
              active={tab === 'chat' && !conversationTarget}
              onClick={() => handleTabChange('chat')}
              badge={<Badge count={unreadChat} />}
            />
            {conversationTarget && (
              <Tab
                label={conversationTarget.name}
                icon={<ChatIcon color={tab === 'chat' && conversationTarget ? C.text : C.muted} />}
                active={tab === 'chat' && !!conversationTarget}
                onClick={() => { setTab('chat'); setUnreadChat(0) }}
              />
            )}
            <Tab
              label="Tasks"
              icon={<TasksIcon color={tab === 'tasks' ? C.text : C.muted} />}
              active={tab === 'tasks'}
              onClick={() => handleTabChange('tasks')}
              badge={<Badge count={activeTaskCount} />}
            />
          </div>

          {/* Nav stats: hidden on mobile (< 480px) */}
          <div style={{
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, flexShrink: 0 }} />
              <b style={{ color: C.text2 }}>{rightNow?.length || 0}</b> building
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
              <b style={{ color: C.text2 }}>{done?.length || 0}</b> done
            </span>
          </div>
        </div>

      </nav>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'tasks' && <TasksPanel queued={queued} rightNow={rightNow} waiting={waiting} done={done} worldId={worldId} refreshTasks={refreshTasks} />}
        {tab === 'chat'  && <ChatPanel key={selectedAgent?.slug || 'chat'} agents={agents} inboxItems={inboxItems} worldId={worldId} initialAgent={selectedAgent} onSelectAgent={handleSelectAgent} onSelectProject={handleSelectProject} onBack={handleBackFromConversation} currentUser={currentUser} allTasks={allTasks} />}
      </div>

      {/* ── ROOT VOICE MODE (replaces input bar when active on home/tasks tabs) */}
      {rootVoiceActive && tab !== 'chat' && (
        <>
          <style>{`@keyframes vw-root { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }`}</style>
          {/* Hidden VoiceChat for audio logic */}
          <div style={{ display: 'none' }}>
            <VoiceChat
              ref={rootVoiceChatRef}
              agentSlug={(selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0])?.slug || 'rex'}
              agentColor={C.accent}
              clientId={worldId}
              autoStart={true}
              onTranscript={(text) => setRootVoiceTranscript(text)}
              onStatusChange={(s) => {
                setRootVoiceStatus(s)
                if (s === 'idle') {
                  setRootVoiceActive(false)
                  setRootVoiceMuted(false)
                  setRootVoiceTranscript('')
                }
              }}
            />
          </div>
          {/* Voice mode UI */}
          <div style={{
            flexShrink: 0,
            padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
            background: C.bg2,
            borderTop: '1px solid ' + C.border,
          }}>
            {/* Waveform bars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginBottom: 8 }}>
              {[
                { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
                { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
                { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
              ].map((bar, i) => (
                <div key={i} style={{
                  width: 3, height: bar.h, borderRadius: 2,
                  background: C.accent,
                  animation: `vw-root 1s ease-in-out ${bar.d} infinite`,
                }} />
              ))}
            </div>
            {/* Status */}
            <div style={{
              textAlign: 'center', fontSize: 12, fontWeight: 600,
              color: C.accent, fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 4,
            }}>
              {rootVoiceStatus === 'connecting' ? 'Connecting...'
                : rootVoiceStatus === 'speaking' ? 'Speaking...'
                : rootVoiceStatus === 'error' ? 'Error'
                : 'Listening...'}
            </div>
            {/* Transcript */}
            <div style={{
              fontSize: 13, color: C.text2, textAlign: 'center',
              minHeight: 18, padding: '0 20px',
            }}>
              {rootVoiceTranscript ? `"${rootVoiceTranscript}"` : ''}
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10 }}>
              {/* Mute */}
              <button
                onClick={() => { rootVoiceChatRef.current?.toggleMute(); setRootVoiceMuted(v => !v) }}
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  border: '1px solid ' + C.border,
                  background: rootVoiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                  color: rootVoiceMuted ? '#F87171' : C.muted,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >M</button>
              {/* End */}
              <button
                onClick={() => {
                  rootVoiceChatRef.current?.stop()
                  setRootVoiceActive(false)
                  setRootVoiceMuted(false)
                  setRootVoiceTranscript('')
                }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  background: C.red, color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
                }}
              >&#x00D7;</button>
            </div>
          </div>
        </>
      )}

      {/* ── INPUT BAR (persistent -- hidden on chat tab or when root voice is active) */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
        display: (tab === 'chat' || tab === 'tasks' || rootVoiceActive) ? 'none' : undefined,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (inputBarFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: inputBarFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            type="text"
            placeholder="Start typing or speaking..."
            value={inputBarText}
            onChange={e => setInputBarText(e.target.value)}
            onFocus={() => { setInputBarFocused(true); handleInputBarFocus() }}
            onBlur={() => setInputBarFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputBarSend() } }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Attach */}
            <button title="Attach" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            {/* Commands */}
            <button title="Commands" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </button>
          </div>
          {/* Mic (hidden when text present) */}
          {!inputBarText.trim() && (
            <button title="Voice" onClick={() => setRootVoiceActive(true)} style={{
              width: 42, height: 42, borderRadius: '50%',
              background: C.accent, border: 'none',
              color: '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'transform 0.15s, box-shadow 0.2s',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {/* Send (shown when text present) */}
          {inputBarText.trim() && (
            <button
              title="Send"
              onClick={handleInputBarSend}
              disabled={inputBarSending}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: inputBarSending ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                opacity: inputBarSending ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ────────────────────────────────────────────── */}
      <TaskCompletionToast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />


    </div>
  )
}
