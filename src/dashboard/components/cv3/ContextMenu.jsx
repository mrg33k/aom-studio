// Shared right-click context menu primitive + MessageContextMenu + TaskContextMenu.
// Styling matches CV3 TaskStatusCard (Steffen's language): s1 surface, border2 edges,
// 14px radius, inter/jetbrains type. Portals to document.body so viewport clamping
// works regardless of parent stacking context.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { C } from '../../lib/cv3Colors.js'

const MENU_WIDTH = 224

// items: [{ key, label, description?, icon?, variant?, hasSubmenu?, disabled?, onSelect }]
// onSelect returns null | false | undefined to close, or 'keep' to keep the menu open
// (used for picker rows that render sub-choices inline).
// fallow-ignore-next-line unused-export
export function ContextMenu({ open, x, y, items, onClose, testId }) {
  const ref = useRef(null)
  const [highlight, setHighlight] = useState(0)
  const [pos, setPos] = useState({ left: x, top: y })

  useEffect(() => { setHighlight(0) }, [open])

  // Viewport clamping: once rendered, measure and nudge back onto the screen.
  useEffect(() => {
    if (!open) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = ref.current?.offsetWidth || MENU_WIDTH
    const height = ref.current?.offsetHeight || 300
    let left = x
    let top = y
    if (left + width + 8 > vw) left = Math.max(8, vw - width - 8)
    if (top + height + 8 > vh) top = Math.max(8, vh - height - 8)
    if (left < 8) left = 8
    if (top < 8) top = 8
    setPos({ left, top })
  }, [open, x, y, items?.length])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.()
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => {
          const enabled = items.map((it, i) => !it.disabled ? i : -1).filter(i => i >= 0)
          if (!enabled.length) return h
          const idx = enabled.indexOf(h)
          return enabled[(idx + 1) % enabled.length]
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => {
          const enabled = items.map((it, i) => !it.disabled ? i : -1).filter(i => i >= 0)
          if (!enabled.length) return h
          const idx = enabled.indexOf(h)
          return enabled[(idx - 1 + enabled.length) % enabled.length]
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const it = items[highlight]
        if (it && !it.disabled) {
          const r = it.onSelect?.()
          if (r !== 'keep') onClose?.()
        }
      }
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, items, highlight, onClose])

  if (!open) return null

  const node = (
    <div
      ref={ref}
      data-test-id={testId}
      role="menu"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: MENU_WIDTH,
        zIndex: 9999,
        background: C.s1,
        border: '1px solid ' + C.border2,
        borderRadius: 14,
        padding: 6,
        boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,185,129,0.04)',
        fontFamily: "'Inter', sans-serif",
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) => {
        const isHi = i === highlight && !it.disabled
        const danger = it.variant === 'danger'
        const color = danger ? C.red : C.text
        return (
          <div
            key={it.key}
            role="menuitem"
            data-test-id={it.testId}
            aria-disabled={it.disabled ? 'true' : 'false'}
            onMouseEnter={() => !it.disabled && setHighlight(i)}
            onClick={(e) => {
              e.stopPropagation()
              if (it.disabled) return
              const r = it.onSelect?.()
              if (r !== 'keep') onClose?.()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 10,
              cursor: it.disabled ? 'default' : 'pointer',
              background: isHi ? 'rgba(16,185,129,0.10)' : 'transparent',
              color,
              opacity: it.disabled ? 0.4 : 1,
              transition: 'background 0.12s',
            }}
          >
            {it.icon && (
              <span style={{
                width: 16, height: 16, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: danger ? C.red : (isHi ? C.accent : C.text2),
              }}>{it.icon}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{it.label}</div>
              {it.description && (
                <div style={{
                  fontSize: 10.5,
                  color: C.muted,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.02em',
                }}>{it.description}</div>
              )}
            </div>
            {it.hasSubmenu && (
              <span style={{ color: C.muted, fontSize: 10 }}>▸</span>
            )}
          </div>
        )
      })}
    </div>
  )
  return createPortal(node, document.body)
}

// ---------------------------------------------------------------------------
// Shared icon set (inherits currentColor so highlight state shows accent)
// ---------------------------------------------------------------------------
const Icon = {
  reply: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
    </svg>
  ),
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  verify: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  research: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>
    </svg>
  ),
  send: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  move: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
}

// ---------------------------------------------------------------------------
// Message right-click menu. Reply + Copy + four actions + optional agent sub-picker.
// ---------------------------------------------------------------------------
export function MessageContextMenu({
  open, x, y, message, agents = [], onClose,
  onReply, onFollowUp, onNeedsVerification, onResearch, onSendTo,
}) {
  const [stage, setStage] = useState('root') // 'root' | 'agents'
  useEffect(() => { if (!open) setStage('root') }, [open])

  if (!open || !message) return null

  if (stage === 'agents') {
    const items = (agents || [])
      .filter(a => a?.slug)
      .sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug))
      .map(a => ({
        key: a.slug,
        label: a.name || a.slug,
        description: a.role || a.slug,
        testId: `msg-ctx-sendto-${a.slug}`,
        onSelect: () => onSendTo?.(a),
      }))
    if (!items.length) {
      items.push({ key: 'none', label: 'No agents available', disabled: true })
    }
    return (
      <ContextMenu
        open
        x={x}
        y={y}
        testId="msg-ctx-agent-picker"
        items={items}
        onClose={onClose}
      />
    )
  }

  const items = [
    {
      key: 'reply',
      label: 'Reply',
      description: 'quote in composer',
      icon: Icon.reply,
      testId: 'msg-ctx-reply',
      onSelect: () => (onReply || onFollowUp)?.(message),
    },
    {
      key: 'copy',
      label: 'Copy',
      description: 'copy message text',
      icon: Icon.copy,
      testId: 'msg-ctx-copy',
      onSelect: () => {
        const t = message?.text || ''
        if (t) navigator.clipboard?.writeText(t).catch(() => {})
      },
    },
    {
      key: 'needs-verification',
      label: 'Needs verification',
      description: 'flag for QA',
      icon: Icon.verify,
      testId: 'msg-ctx-needs-verification',
      onSelect: () => onNeedsVerification?.(message),
    },
    {
      key: 'research',
      label: 'Research',
      description: 'create research task',
      icon: Icon.research,
      testId: 'msg-ctx-research',
      onSelect: () => onResearch?.(message),
    },
    {
      key: 'send-to',
      label: 'Send to…',
      description: 'crosspost to an agent',
      icon: Icon.send,
      testId: 'msg-ctx-send-to',
      hasSubmenu: true,
      onSelect: () => { setStage('agents'); return 'keep' },
    },
  ]

  return (
    <ContextMenu
      open
      x={x}
      y={y}
      testId="msg-ctx-root"
      items={items}
      onClose={onClose}
    />
  )
}

// ---------------------------------------------------------------------------
// Task right-click menu. Same four slots, last one is Move-to (not Send-to).
// ---------------------------------------------------------------------------
export function TaskContextMenu({
  open, x, y, task, projects = [], onClose,
  onFollowUp, onNeedsVerification, onResearch, onMoveTo,
}) {
  const [stage, setStage] = useState('root') // 'root' | 'projects'
  useEffect(() => { if (!open) setStage('root') }, [open])

  if (!open || !task) return null

  if (stage === 'projects') {
    const items = (projects || [])
      .filter(p => p?.slug)
      .sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug))
      .map(p => ({
        key: p.slug,
        label: p.name || p.slug,
        description: p.slug,
        testId: `task-ctx-moveto-${p.slug}`,
        disabled: (task.project || '').toLowerCase() === String(p.slug).toLowerCase(),
        onSelect: () => onMoveTo?.(p),
      }))
    if (!items.length) {
      items.push({ key: 'none', label: 'No projects available', disabled: true })
    }
    return (
      <ContextMenu
        open
        x={x}
        y={y}
        testId="task-ctx-project-picker"
        items={items}
        onClose={onClose}
      />
    )
  }

  const items = [
    {
      key: 'follow-up',
      label: 'Follow-up',
      description: 'reply tied to this task',
      icon: Icon.reply,
      testId: 'task-ctx-follow-up',
      onSelect: () => onFollowUp?.(task),
    },
    {
      key: 'needs-verification',
      label: 'Needs verification',
      description: 'spawn verify sub-task',
      icon: Icon.verify,
      testId: 'task-ctx-needs-verification',
      onSelect: () => onNeedsVerification?.(task),
    },
    {
      key: 'research',
      label: 'Research',
      description: 'spawn research sub-task',
      icon: Icon.research,
      testId: 'task-ctx-research',
      onSelect: () => onResearch?.(task),
    },
    {
      key: 'move-to',
      label: 'Move to…',
      description: 'change project',
      icon: Icon.move,
      testId: 'task-ctx-move-to',
      hasSubmenu: true,
      onSelect: () => { setStage('projects'); return 'keep' },
    },
  ]

  return (
    <ContextMenu
      open
      x={x}
      y={y}
      testId="task-ctx-root"
      items={items}
      onClose={onClose}
    />
  )
}

// ---------------------------------------------------------------------------
// Reply-to chip rendered above the composer when a follow-up has been queued.
// target: { type: 'message'|'task', id, label, snippet, attachment_kind?, attachment_url? }
// ---------------------------------------------------------------------------
// fallow-ignore-next-line complexity
export function ReplyToChip({ target, onDismiss }) {
  if (!target) return null
  const type = target.type === 'task' ? 'task' : 'message'
  const label = target.label || (target.type === 'task' ? 'task' : 'message')
  const snippet = (target.snippet || '').replace(/\s+/g, ' ').trim()
  const hasVideoThumb = target.attachment_kind === 'video' && target.attachment_url
  const hasImageThumb = target.attachment_kind === 'image' && target.attachment_url
  const hasAudio = target.attachment_kind === 'audio'
  return (
    <div
      data-test-id="reply-to-chip"
      style={{
        maxWidth: 560,
        margin: '0 auto 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 10,
        background: 'rgba(16,185,129,0.10)',
        border: '1px solid rgba(16,185,129,0.28)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span style={{
        fontSize: 9,
        fontWeight: 800,
        color: C.accent,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}>Replying to {type}</span>
      {hasVideoThumb && (
        <video
          src={target.attachment_url}
          preload="metadata"
          muted
          style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: '#000' }}
        />
      )}
      {hasImageThumb && (
        <img
          src={target.attachment_url}
          alt=""
          style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      {hasAudio && (
        <span style={{
          width: 32, height: 32, borderRadius: 4, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(16,185,129,0.15)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </span>
      )}
      <span style={{
        fontSize: 12,
        color: 'rgba(226,232,240,0.75)',
        flex: 1,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label ? `${label}` : ''}{label && snippet ? ' · ' : ''}{snippet ? `"${snippet.length > 80 ? snippet.slice(0, 77) + '…' : snippet}"` : (hasVideoThumb || hasImageThumb || hasAudio ? `[${target.attachment_kind}]` : '')}
      </span>
      <button
        data-test-id="reply-to-chip-dismiss"
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          width: 22, height: 22, borderRadius: 6,
          background: 'transparent',
          border: 'none',
          color: C.muted,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
          lineHeight: 1,
        }}
        title="Dismiss"
      >×</button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile bottom action sheet (rises from bottom on long-press).
// ---------------------------------------------------------------------------
// fallow-ignore-next-line complexity
export function MobileActionSheet({ open, message, onClose, onReply, onCopy, onNeedsVerification, onResearch }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !message) return null

  const actions = [
    {
      key: 'reply', label: 'Reply', icon: Icon.reply,
      onTap: () => { onReply?.(message); onClose?.() },
    },
    {
      key: 'copy', label: 'Copy Text', icon: Icon.copy,
      // fallow-ignore-next-line complexity
      onTap: () => {
        const t = message?.text || ''
        if (t) navigator.clipboard?.writeText(t).catch(() => {})
        onClose?.()
      },
    },
    {
      key: 'verify', label: 'Needs verification', icon: Icon.verify,
      onTap: () => { onNeedsVerification?.(message); onClose?.() },
    },
    {
      key: 'research', label: 'Research', icon: Icon.research,
      onTap: () => { onResearch?.(message); onClose?.() },
    },
  ]

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.45)',
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          zIndex: 9991,
          background: 'linear-gradient(180deg, #1a2030, #111827)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px 20px 0 0',
          padding: '12px 0 calc(16px + env(safe-area-inset-bottom, 0px))',
          fontFamily: "'Inter', sans-serif",
          animation: 'slideUpSheet 0.22s ease',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.18)',
          margin: '0 auto 14px',
        }} />
        {/* Message preview */}
        {message.text && (
          <div style={{
            margin: '0 16px 12px',
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            fontSize: 12, color: 'rgba(226,232,240,0.55)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis',
            lineHeight: 1.5,
          }}>
            {message.text.length > 120 ? message.text.slice(0, 117) + '…' : message.text}
          </div>
        )}
        {actions.map(action => (
          <button
            key={action.key}
            onClick={action.onTap}
            data-test-id={`sheet-${action.key}`}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              color: '#E2E8F0',
              cursor: 'pointer',
              fontSize: 15, fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onTouchStart={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onTouchEnd={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ color: C.accent, display: 'flex', alignItems: 'center' }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            width: 'calc(100% - 32px)',
            margin: '8px 16px 0',
            padding: '14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: 'rgba(226,232,240,0.7)',
            cursor: 'pointer',
            fontSize: 15, fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Cancel
        </button>
      </div>
      <style>{`@keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  )
  return createPortal(sheet, document.body)
}

// ---------------------------------------------------------------------------
// "Needs verification" badge (shared between messages + tasks).
// ---------------------------------------------------------------------------
export function NeedsVerificationBadge({ onClick, label = 'Needs verification', testId }) {
  return (
    <span
      data-test-id={testId}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 10,
        background: 'rgba(234,179,8,0.14)',
        border: '1px solid rgba(234,179,8,0.35)',
        fontSize: 10,
        fontWeight: 800,
        color: '#FDE68A',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: '#FACC15',
        boxShadow: '0 0 0 3px rgba(250,204,21,0.20)',
      }} />
      {label}
    </span>
  )
}
