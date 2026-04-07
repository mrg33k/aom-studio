// HUD Notification Badge + Toast System
// Bobby2: Provides badge count on chat icon and toast notifications
// when agents finish tasks or new relay messages arrive.
// Does NOT conflict with GameDashboard.jsx's existing NotificationToast.
// This component lives in the HUD strip (GameHUD.jsx) only.
//
// DONE(bobby2): Toast click action -- dispatches 'corner-navigate-agent' custom event with { agentSlug }. GameDashboard listens for this to switch rooms.
// DONE(bobby2): Notification sound -- Web Audio API chime: ascending triad for completions, descending for blocked, neutral for system. 0.08 gain (subtle).
// DONE(bobby2): Notification history panel -- bell click toggles full notification log panel. Shows all notifications from events table, grouped by time, with dismiss-all.
// DONE(bobby2): Notification plain English -- humanizeNotification() strips commit hashes, jargon, @mentions, TODO counts. Extracts SHIPPED items. Truncates to 120 chars. Toast reads like a human update.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, MessageSquare, CheckCircle2, AlertTriangle, Zap, Clock, Trash2 } from 'lucide-react'
import { AGENTS } from './gridSpec.js'
import { useToast } from './hooks/useToast.js'

const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const HUD_COLORS = {
  panelBgSolid: '#081020',
  accent: '#3B9EFF',
  textPrimary: '#EDF2FA',
  textSecondary: '#8BA4C4',
  textMuted: '#4A6080',
  divider: 'rgba(100, 180, 255, 0.10)',
}

// Toast types with game-style colors
const TOAST_CONFIG = {
  message: { icon: MessageSquare, color: '#3B9EFF', label: 'Message' },
  complete: { icon: CheckCircle2, color: '#22C55E', label: 'Complete' },
  blocked: { icon: AlertTriangle, color: '#EF4444', label: 'Blocked' },
  system: { icon: Zap, color: '#F59E0B', label: 'System' },
}

// Hook: polls relay outbox for unread messages
function useRelayBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const lastSeenRef = useRef(0)

  useEffect(() => {
    if (!IS_LOCAL) return

    const poll = async () => {
      try {
        const res = await fetch('/api/local/file?path=context/relay-outbox.jsonl')
        if (!res.ok) return
        const json = await res.json()
        if (!json.content) return

        const lines = json.content.trim().split('\n').filter(Boolean)
        const newCount = lines.length

        // Count messages newer than what we've seen
        if (newCount > lastSeenRef.current) {
          setUnreadCount(newCount - lastSeenRef.current)
        }
      } catch {}
    }

    poll()
    const timer = setInterval(poll, 30000)
    return () => clearInterval(timer)
  }, [])

  const clearBadge = useCallback(() => {
    setUnreadCount(0)
    // Update lastSeen to current count
    if (IS_LOCAL) {
      fetch('/api/local/file?path=context/relay-outbox.jsonl')
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.content) {
            lastSeenRef.current = json.content.trim().split('\n').filter(Boolean).length
          }
        })
        .catch(() => {})
    }
  }, [])

  return { unreadCount, clearBadge }
}

// Game-style notification chime using Web Audio API (no audio files needed)
function playNotificationChime(type = 'complete') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    // Different tones by notification type
    if (type === 'complete') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523, ctx.currentTime) // C5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08) // E5
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16) // G5
    } else if (type === 'blocked') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(330, ctx.currentTime) // E4
      osc.frequency.setValueAtTime(262, ctx.currentTime + 0.12) // C4
    } else {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
      osc.frequency.setValueAtTime(523, ctx.currentTime + 0.1) // C5
    }

    gain.gain.setValueAtTime(0.08, ctx.currentTime) // Subtle volume
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // Audio not available, silently ignore
  }
}

// Humanize raw notification text: strip commit hashes, jargon, technical logs.
// "Bobby just pushed v3" not "commit a7f2c91 merged to main."
function humanizeNotification(raw, agentName) {
  if (!raw) return raw
  let msg = raw

  // Strip commit hashes (7-char hex like a7f2c91, or full 40-char)
  msg = msg.replace(/\b[0-9a-f]{7,40}\b/gi, '')
  // Strip commit ranges (fa3df21..f5c31ab)
  msg = msg.replace(/\b[0-9a-f]{7}\.\.[0-9a-f]{7}\b/gi, '')
  // Strip parenthetical commit lists like (e8a152f, a98d618)
  msg = msg.replace(/\([0-9a-f, ]{7,}\)/gi, '')
  // Strip "build N:" and "session N:" prefixes
  msg = msg.replace(/\b(?:build|session)\s*\d+\s*[:\-]/gi, '')
  // Strip @mentions like @Steffen @Steve
  msg = msg.replace(/@\w+/g, '')
  // Strip "N commits pushed" -> "pushed updates"
  msg = msg.replace(/\d+\s*commits?\s*pushed/gi, 'pushed updates')
  // Strip "commit" word when standalone
  msg = msg.replace(/\bcommit\b/gi, '')
  // Strip REMAINING TODOs sections
  msg = msg.replace(/REMAINING\s*TODOs?:.*$/i, '')
  // Strip "N TODOs resolved" detail
  msg = msg.replace(/\d+\s*TODOs?\s*resolved[^.]*\.?/gi, '')
  // Clean up double spaces and trailing punctuation
  msg = msg.replace(/\s{2,}/g, ' ').replace(/\(\s*\)/g, '').replace(/,\s*,/g, ',').trim()
  // Strip leading punctuation/whitespace
  msg = msg.replace(/^[\s:,.\-]+/, '').trim()

  // Extract the SHIPPED items if present (most useful part)
  const shippedMatch = msg.match(/SHIPPED:\s*(.+?)(?:\.\s*(?:REMAINING|$)|\s*$)/i)
  if (shippedMatch) {
    msg = shippedMatch[1].trim()
  }

  // Extract TASK FINISHED summary
  const taskMatch = msg.match(/TASK\s*FINISHED:\s*\w+\s*[-–]\s*(.+)/i)
  if (taskMatch) {
    msg = taskMatch[1].trim()
  }

  // Truncate to ~120 chars for toast display
  if (msg.length > 120) {
    msg = msg.slice(0, 117) + '...'
  }

  return msg || raw
}

// Hook: polls events table for toast notifications + full notification history (consolidated)
// Previously two separate hooks (useAgentNotifications at 8s + useFullNotificationHistory at 10s)
// hitting the same endpoint. Now one poll serves both.
function useAgentNotifications() {
  const [notifications, setNotifications] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const lastSeenIdRef = useRef(null)
  const dismissedRef = useRef(new Set())

  useEffect(() => {
    const poll = async () => {
      if (document.hidden) return // Skip when tab not visible
      try {
        const { getClientId } = await import('../lib/clientConfig.js')
        const clientId = getClientId()
        const res = await fetch(`/api/dashboard/supabase-status?client=${encodeURIComponent(clientId)}`)
        if (!res.ok) return
        const data = await res.json()
        const events = data.events || []

        // --- Build full history (was useFullNotificationHistory) ---
        const historyTypes = new Set(['task_completed', 'task_failed', 'task_started', 'qa_passed', 'build_pushed'])
        const historyEntries = events
          .filter(ev => historyTypes.has(ev.event_type))
          .map((ev, i) => {
            const agent = ev.agent || 'system'
            const name = agent.charAt(0).toUpperCase() + agent.slice(1)
            const rawMessage = ev.payload?.description || ev.payload?.task || ev.payload?.text || `${name} task update`
            const type = ev.event_type === 'task_failed' ? 'blocked'
              : ev.event_type === 'task_completed' || ev.event_type === 'qa_passed' || ev.event_type === 'build_pushed' ? 'complete'
              : 'system'
            return {
              id: `hist-${ev.id || i}`,
              time: ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              agentSlug: agent,
              agentName: name,
              message: humanizeNotification(rawMessage, name),
              rawMessage,
              type,
            }
          })
        setHistory(historyEntries)
        setHistoryLoading(false)

        // --- Toast notifications ---
        const relevantTypes = new Set(['task_completed', 'task_failed', 'qa_passed', 'build_pushed'])
        const relevant = events.filter(ev => relevantTypes.has(ev.event_type))

        if (relevant.length === 0) return

        const newestId = relevant[0]?.id
        if (lastSeenIdRef.current === null) {
          lastSeenIdRef.current = newestId
          return
        }

        if (newestId === lastSeenIdRef.current) return

        const newEvents = []
        for (const ev of relevant) {
          if (ev.id === lastSeenIdRef.current) break
          newEvents.push(ev)
        }

        const newNotifs = newEvents.map((ev, i) => {
          const agent = ev.agent || 'system'
          const name = agent.charAt(0).toUpperCase() + agent.slice(1)
          const rawMessage = ev.payload?.description || ev.payload?.task || ev.payload?.text || `${name} task update`
          const type = ev.event_type === 'task_failed' ? 'blocked' : 'complete'

          return {
            id: `notif-${ev.id || Date.now()}-${i}`,
            time: ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now',
            agentSlug: agent,
            agentName: name,
            message: humanizeNotification(rawMessage, name),
            type,
            createdAt: Date.now(),
          }
        }).filter(n => !dismissedRef.current.has(n.message))

        if (newNotifs.length > 0) {
          const hasBlocked = newNotifs.some(n => n.type === 'blocked')
          const hasComplete = newNotifs.some(n => n.type === 'complete')
          playNotificationChime(hasBlocked ? 'blocked' : hasComplete ? 'complete' : 'system')
          setNotifications(prev => [...newNotifs, ...prev].slice(0, 10))
        }

        lastSeenIdRef.current = newestId
      } catch {}
    }

    poll()
    const timer = setInterval(poll, 30000)
    return () => clearInterval(timer)
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications(prev => {
      const found = prev.find(n => n.id === id)
      if (found) dismissedRef.current.add(found.message)
      return prev.filter(n => n.id !== id)
    })
  }, [])

  const dismissAll = useCallback(() => {
    notifications.forEach(n => dismissedRef.current.add(n.message))
    setNotifications([])
  }, [notifications])

  return { notifications, dismiss, dismissAll, history, historyLoading }
}

// Badge component (sits on the chat icon or bell) -- pill with "N updates" label
export function NotificationBadge({ count, style }) {
  if (!count || count <= 0) return null

  const label = count > 9 ? '9+ updates' : `${count} ${count === 1 ? 'update' : 'updates'}`

  return (
    <motion.div
      key={count} // re-animate on count change
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 14 }}
      style={{
        position: 'absolute', top: -10, right: -6,
        height: 18, borderRadius: 10,
        background: '#EF4444',
        border: `2px solid ${HUD_COLORS.panelBgSolid}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 7px',
        boxShadow: '0 0 10px rgba(239,68,68,0.6), 0 0 20px rgba(239,68,68,0.25)',
        animation: 'hudBadgePulse 2.5s ease-in-out',
        zIndex: 5,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span style={{
        fontSize: 10, fontWeight: 800, color: '#FFF',
        fontFamily: "'Inter Tight', sans-serif",
        lineHeight: 1, letterSpacing: '0.01em',
      }}>
        {label}
      </span>
    </motion.div>
  )
}

// Full notification history panel (opens from bell click, anchored above HUD)
// History data comes from useAgentNotifications (consolidated poll) via props.
function NotificationHistoryPanel({ onClose, history, loading }) {
  const panelRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    const keyHandler = (e) => { if (e.key === 'Escape') onClose() }
    // Delay listener to avoid closing immediately on the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('keydown', keyHandler)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 20,
        width: 380,
        maxHeight: 480,
        background: 'rgba(8, 16, 32, 0.97)',
        backdropFilter: 'blur(24px)',
        border: '2px solid rgba(100, 180, 255, 0.22)',
        borderRadius: 14,
        boxShadow: '0 -12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,180,255,0.08)',
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 8,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: `1px solid ${HUD_COLORS.divider}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color={HUD_COLORS.accent} />
          <span style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 16, fontWeight: 800,
            color: HUD_COLORS.textPrimary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Notifications
          </span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12, fontWeight: 600,
            color: HUD_COLORS.textMuted,
          }}>
            {history.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(100,180,255,0.06)',
            border: `1px solid ${HUD_COLORS.divider}`,
            borderRadius: 6, cursor: 'pointer',
            color: HUD_COLORS.textMuted, padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = HUD_COLORS.textSecondary; e.currentTarget.style.background = 'rgba(100,180,255,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.color = HUD_COLORS.textMuted; e.currentTarget.style.background = 'rgba(100,180,255,0.06)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Notification list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '4px 0',
      }} className="hud-scroll">
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 32, color: HUD_COLORS.textMuted,
            fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
          }}>
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', textAlign: 'center',
          }}>
            <Bell size={28} color={HUD_COLORS.textMuted} style={{ opacity: 0.4, marginBottom: 12 }} />
            <span style={{
              color: HUD_COLORS.textMuted,
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
            }}>
              No notifications yet
            </span>
          </div>
        ) : (
          history.slice(0, 50).map((n, i) => {
            const config = TOAST_CONFIG[n.type] || TOAST_CONFIG.system
            const Icon = config.icon
            const agent = n.agentSlug ? AGENTS.find(a => a.slug === n.agentSlug) : null

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => {
                  if (n.agentSlug) {
                    window.dispatchEvent(new CustomEvent('corner-navigate-agent', { detail: { agentSlug: n.agentSlug } }))
                    onClose()
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 16px',
                  borderBottom: `1px solid ${HUD_COLORS.divider}`,
                  cursor: n.agentSlug ? 'pointer' : 'default',
                  transition: 'background 80ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,180,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {/* Type icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `${config.color}15`,
                  border: `1.5px solid ${config.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <Icon size={13} color={config.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13, fontWeight: 700,
                      color: agent?.color || config.color,
                    }}>
                      {n.agentName}
                    </span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11, color: HUD_COLORS.textMuted,
                    }}>
                      {n.time}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 13, color: HUD_COLORS.textSecondary,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}>
                    {n.message}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

// Bell button with badge + notification history panel toggle
export function HUDBellButton({ onClick }) {
  const { unreadCount, clearBadge } = useRelayBadge()
  const { notifications, history, historyLoading } = useAgentNotifications()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [glowing, setGlowing] = useState(false)
  const prevCountRef = useRef(0)
  const totalCount = unreadCount + notifications.length

  // Trigger glow animation when new notifications arrive
  useEffect(() => {
    if (totalCount > prevCountRef.current) {
      setGlowing(true)
      const t = setTimeout(() => setGlowing(false), 2000)
      prevCountRef.current = totalCount
      return () => clearTimeout(t)
    }
    prevCountRef.current = totalCount
  }, [totalCount])

  const handleClick = useCallback(() => {
    setHistoryOpen(prev => {
      if (!prev) clearBadge() // Clear badge when opening panel
      return !prev
    })
  }, [clearBadge])

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        onClick={handleClick}
        animate={glowing ? {
          scale: [1, 1.15, 1.05, 1],
          transition: { duration: 0.4, ease: 'easeOut' }
        } : {}}
        whileHover={{ scale: 1.1, y: -2, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'relative',
          width: 44, height: 44, borderRadius: 8,
          background: historyOpen ? 'rgba(59,158,255,0.2)' : totalCount > 0 ? 'rgba(59,158,255,0.12)' : 'rgba(100,180,255,0.04)',
          border: `1.5px solid ${historyOpen ? 'rgba(59,158,255,0.5)' : totalCount > 0 ? 'rgba(59,158,255,0.3)' : HUD_COLORS.divider}`,
          color: historyOpen ? HUD_COLORS.accent : totalCount > 0 ? HUD_COLORS.accent : HUD_COLORS.textMuted,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 150ms ease',
          boxShadow: glowing
            ? '0 0 16px rgba(59,158,255,0.7), 0 0 32px rgba(59,158,255,0.3)'
            : totalCount > 0 ? '0 0 8px rgba(59,158,255,0.2)' : 'none',
        }}
        title={totalCount > 0 ? `${totalCount} notification${totalCount > 1 ? 's' : ''}` : 'Notification history'}
      >
        <Bell size={16} />
        <NotificationBadge count={historyOpen ? 0 : totalCount} />
      </motion.button>

      {/* History panel anchored above bell */}
      <AnimatePresence>
        {historyOpen && (
          <NotificationHistoryPanel onClose={() => setHistoryOpen(false)} history={history} loading={historyLoading} />
        )}
      </AnimatePresence>
    </div>
  )
}

// HUD toast system (slides in from right, auto-dismiss)
export function HUDToasts() {
  const { notifications, dismiss } = useAgentNotifications()
  const [hoveredId, setHoveredId] = useState(null)

  // Auto-dismiss after 5s (pause on hover)
  useEffect(() => {
    const timers = notifications
      .filter(n => n.id !== hoveredId)
      .map(n => {
        const age = Date.now() - n.createdAt
        const remaining = Math.max(0, 5000 - age)
        return setTimeout(() => dismiss(n.id), remaining)
      })
    return () => timers.forEach(clearTimeout)
  }, [notifications, hoveredId, dismiss])

  return (
    <div style={{
      position: 'fixed', top: 80, left: 16, zIndex: 50,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {notifications.slice(0, 3).map(n => {
          const config = TOAST_CONFIG[n.type] || TOAST_CONFIG.system
          const Icon = config.icon
          const agent = n.agentSlug ? AGENTS.find(a => a.slug === n.agentSlug) : null
          const isHovered = hoveredId === n.id

          return (
            <motion.div
              key={n.id}
              initial={{ x: -340, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -340, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 22, stiffness: 250 }}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                if (n.agentSlug) {
                  window.dispatchEvent(new CustomEvent('corner-navigate-agent', { detail: { agentSlug: n.agentSlug } }))
                  dismiss(n.id)
                }
              }}
              style={{
                width: 300, pointerEvents: 'auto',
                background: 'rgba(10, 15, 30, 0.95)',
                backdropFilter: 'blur(16px)',
                border: `2px solid ${config.color}33`,
                borderLeft: `4px solid ${config.color}`,
                borderRadius: 10,
                boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${config.color}15`,
                padding: '12px 14px',
                position: 'relative',
                overflow: 'hidden',
                cursor: n.agentSlug ? 'pointer' : 'default',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `${config.color}20`,
                  border: `1.5px solid ${config.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={12} color={config.color} />
                </div>
                <span style={{
                  color: agent?.color || config.color, fontSize: 13, fontWeight: 700,
                  fontFamily: "'Inter Tight', sans-serif",
                }}>
                  {n.agentName}
                </span>
                <span style={{
                  marginLeft: 'auto', color: HUD_COLORS.textMuted,
                  fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {n.time}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isHovered ? HUD_COLORS.textPrimary : HUD_COLORS.textMuted,
                    padding: 2, transition: 'color 150ms',
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Message */}
              <div style={{
                color: HUD_COLORS.textPrimary, fontSize: 14,
                fontFamily: "'Inter', system-ui, sans-serif",
                lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {n.message}
              </div>

              {/* Auto-dismiss progress bar */}
              {!isHovered && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: 2, background: `${config.color}55`,
                    borderRadius: '0 0 8px 8px',
                  }}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Task-queued toast overlay (bottom-right, driven by ToastProvider context)
export function TaskQueuedToasts() {
  const { toasts, dismissToast } = useToast()

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 10,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(8, 20, 40, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(59, 158, 255, 0.25)',
              borderLeft: '3px solid #3B9EFF',
              borderRadius: 10,
              padding: '10px 14px 10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: 200,
              maxWidth: 320,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(59,158,255,0.1)',
            }}
          >
            <Zap size={14} color="#3B9EFF" style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1,
              fontSize: 13,
              color: '#EDF2FA',
              fontFamily: "'Inter', system-ui, sans-serif",
              lineHeight: 1.4,
            }}>
              {t.message}
            </span>
            <button
              onClick={() => dismissToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)',
                padding: 2,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// CSS for badge pulse animation + bell glow
export const HUD_NOTIFICATION_STYLES = `
  @keyframes hudBadgePulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(239,68,68,0.6), 0 0 20px rgba(239,68,68,0.25); }
    50% { transform: scale(1.08); box-shadow: 0 0 16px rgba(239,68,68,0.8), 0 0 30px rgba(239,68,68,0.4); }
  }
`
