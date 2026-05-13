// Shared small components extracted from CornerV3.jsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { C, getStatusCfg } from '../../lib/cv3Colors.js'

export function Badge({ count, color }) {
  if (!count || count <= 0) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 14,
      height: 14,
      borderRadius: 7,
      background: color || C.accent,
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

export function Tab({ label, icon, active, onClick, badge, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid || `tab-${String(label || '').toLowerCase()}`}
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

// fallow-ignore-next-line complexity
export function AgentAvatar({ name, color, size = 38 }) {
  const initial = (name || '?')[0].toUpperCase()

  // If color is an image URL (http/data URI) or a CSS url() value, extract
  // the URL and render as <img objectFit=cover> to prevent background-repeat
  // tiling (the "4-square mosaic" bug when background-image tiles by default).
  let imageUrl = null
  if (color) {
    if (color.startsWith('http') || color.startsWith('data:image')) {
      imageUrl = color
    } else if (color.startsWith('url(')) {
      const m = color.match(/url\(['"]?([^'")\s]+)['"]?\)/)
      if (m) imageUrl = m[1]
    }
  }

  // sprites-v2 files are 2x2 idle-frame sheets. Render the top-left frame only
  // (img sized 200% inside an overflow-hidden parent, positioned absolutely so
  // flex centering doesn't pull the center crop in).
  const isSpriteSheet = imageUrl && /\/sprites-v2\//.test(imageUrl)

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: imageUrl ? 'transparent' : (color || '#3B9EFF'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: `0 0 0 1px rgba(255,255,255,0.08)`,
      overflow: 'hidden',
      position: isSpriteSheet ? 'relative' : undefined,
    }}>
      {imageUrl
        ? (isSpriteSheet
            ? <img src={imageUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '200%', height: '200%', objectFit: 'cover', objectPosition: '0% 0%' }} />
            : <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
        : <span style={{
            fontSize: size * 0.42,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1,
          }}>{initial}</span>
      }
    </div>
  )
}

export function StatusDot({ status }) {
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

export function BellIcon({ count = 0, onClick }) {
  return (
    <button
      onClick={onClick}
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
        stroke={count > 0 ? C.accent : C.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          background: C.accent,
          border: '2px solid ' + C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          fontWeight: 800,
          color: '#000',
          fontFamily: "'JetBrains Mono', monospace",
          padding: '0 3px',
          lineHeight: 1,
          pointerEvents: 'none',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

// Format chat time (e.g. "2m ago", "Yesterday")
export function formatChatTime(ts) {
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

// Convert blob to base64
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Linkify URLs in user messages (plain text -> clickable links)
export function LinkifyText({ text }) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#93bbfc', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(147,187,252,0.3)', wordBreak: 'break-all' }}>{part}</a>
      : part
  )
}

// Swipeable card with action buttons revealed on swipe-left
export function SwipeCard({ children, actions, style }) {
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
  const onMouseDown = useCallback((e) => {
    if (offsetX < 0) { e.preventDefault(); e.stopPropagation(); setOffsetX(0) }
  }, [offsetX])

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, marginBottom: 6, ...style }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'stretch',
      }}>
        {actions.map((action, i) => (
          <button key={i} onClick={action.onClick} style={{
            width: 56, border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            color: '#fff', background: action.color || C.s3,
          }}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease',
          position: 'relative', zIndex: 1,
          background: C.bg2,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Task status colors (returns object with dot, glow, border, bg)
export function getStatusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'building':
    case 'working':   return { dot: '#22C55E', glow: '0 0 6px rgba(34,197,94,0.6)',  border: 'rgba(34,197,94,0.2)',  bg: 'rgba(34,197,94,0.05)' }
    case 'qa':        return { dot: '#3B9EFF', glow: '0 0 6px rgba(59,158,255,0.5)', border: 'rgba(59,158,255,0.2)', bg: 'rgba(59,158,255,0.05)' }
    case 'queued':    return { dot: '#F59E0B', glow: 'none',                          border: 'rgba(245,158,11,0.15)', bg: 'rgba(245,158,11,0.03)' }
    case 'planning':  return { dot: '#A78BFA', glow: 'none',                          border: 'rgba(167,139,250,0.15)', bg: 'rgba(167,139,250,0.03)' }
    case 'classifying': return { dot: '#FB923C', glow: 'none',                        border: 'rgba(251,146,60,0.15)', bg: 'rgba(251,146,60,0.03)' }
    case 'done':      return { dot: '#22C55E', glow: 'none',                          border: 'rgba(255,255,255,0.04)', bg: 'rgba(255,255,255,0.02)' }
    case 'failed':    return { dot: '#EF4444', glow: 'none',                          border: 'rgba(239,68,68,0.2)',  bg: 'rgba(239,68,68,0.04)' }
    default:          return { dot: '#506480', glow: 'none',                          border: 'rgba(255,255,255,0.06)', bg: 'rgba(255,255,255,0.04)' }
  }
}

const SHIPPED_CARD_COLORS = ['#EAB308', '#22C55E', '#A78BFA', '#60A5FA', '#F472B6', '#FB923C', '#2DD4BF']
const AGENT_CARD_COLOR_MAP = {
  bobby: '#FB923C', colton: '#FB923C', steffen: '#A78BFA', gary: '#2DD4BF',
  alex: '#22C55E', tony: '#22C55E', jacob: '#EAB308', elon: '#60A5FA', cleo: '#F472B6',
}

export function getShippedCardColor(task, index) {
  const agent = (task.agent_identity || task.agentIdentity || '').toLowerCase()
  return AGENT_CARD_COLOR_MAP[agent] || SHIPPED_CARD_COLORS[index % SHIPPED_CARD_COLORS.length]
}
