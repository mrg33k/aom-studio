// HUD Notification Badge + Toast System
// Bobby2: Provides badge count on chat icon and toast notifications
// when agents finish tasks or new relay messages arrive.
// Does NOT conflict with GameDashboard.jsx's existing NotificationToast.
// This component lives in the HUD strip (GameHUD.jsx) only.
//
// TODO(patrik): Toast click action -- clicking a toast should navigate to the relevant agent/room
// TODO(patrik): Notification sound -- play a subtle game-style chime on new agent completions
// TODO(patrik): Notification history panel -- bell click should show full notification log, not just recent 3

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, MessageSquare, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { AGENTS } from './gridSpec.js'

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
    const timer = setInterval(poll, 5000)
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

// Hook: polls agent-notifications.md for new completions
function useAgentNotifications() {
  const [notifications, setNotifications] = useState([])
  const lastLineCountRef = useRef(0)
  const dismissedRef = useRef(new Set())

  useEffect(() => {
    if (!IS_LOCAL) return

    const poll = async () => {
      try {
        const res = await fetch('/api/local/file?path=context/agent-notifications.md')
        if (!res.ok) return
        const json = await res.json()
        if (!json.content) return

        const lines = json.content.trim().split('\n').filter(l => l.startsWith('['))
        if (lines.length > lastLineCountRef.current) {
          // New notifications arrived
          const newLines = lines.slice(lastLineCountRef.current)
          const newNotifs = newLines.map((line, i) => {
            const timestampMatch = line.match(/^\[([^\]]+)\]/)
            const agentMatch = line.match(/(?:Bobby|Steffen|Cleo|Steve|Elon|Alex|Tony|Jacob|Colton|Elmo|Mom|Paige|Pixel)/i)
            const messageMatch = line.match(/:\s*(.+)$/)

            return {
              id: `notif-${Date.now()}-${i}`,
              time: timestampMatch?.[1] || 'now',
              agentSlug: agentMatch ? agentMatch[0].toLowerCase() : null,
              agentName: agentMatch?.[0] || 'System',
              message: messageMatch?.[1]?.trim() || line,
              type: line.toLowerCase().includes('blocked') ? 'blocked'
                : line.toLowerCase().includes('finish') || line.toLowerCase().includes('ship') || line.toLowerCase().includes('done') ? 'complete'
                : 'system',
              createdAt: Date.now(),
            }
          }).filter(n => !dismissedRef.current.has(n.message))

          if (newNotifs.length > 0) {
            setNotifications(prev => [...newNotifs, ...prev].slice(0, 10))
          }
        }
        lastLineCountRef.current = lines.length
      } catch {}
    }

    poll()
    const timer = setInterval(poll, 8000)
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

  return { notifications, dismiss, dismissAll }
}

// Badge component (sits on the chat icon or bell)
export function NotificationBadge({ count, style }) {
  if (!count || count <= 0) return null

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      style={{
        position: 'absolute', top: -4, right: -4,
        minWidth: 18, height: 18, borderRadius: 9,
        background: '#EF4444',
        border: `2px solid ${HUD_COLORS.panelBgSolid}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 4px',
        boxShadow: '0 0 8px rgba(239,68,68,0.5)',
        animation: 'hudBadgePulse 2s ease-in-out infinite',
        zIndex: 5,
        ...style,
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 800, color: '#FFF',
        fontFamily: "'Inter Tight', sans-serif",
        lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        {count > 9 ? '9+' : count}
      </span>
    </motion.div>
  )
}

// Bell button with badge (to add to HUD strip)
export function HUDBellButton({ onClick }) {
  const { unreadCount } = useRelayBadge()
  const { notifications } = useAgentNotifications()
  const totalCount = unreadCount + notifications.length

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -2, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.9 }}
      style={{
        position: 'relative',
        width: 32, height: 32, borderRadius: 8,
        background: totalCount > 0 ? 'rgba(59,158,255,0.12)' : 'rgba(100,180,255,0.04)',
        border: `1.5px solid ${totalCount > 0 ? 'rgba(59,158,255,0.3)' : HUD_COLORS.divider}`,
        color: totalCount > 0 ? HUD_COLORS.accent : HUD_COLORS.textMuted,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 150ms ease',
      }}
      title={totalCount > 0 ? `${totalCount} notification${totalCount > 1 ? 's' : ''}` : 'No notifications'}
    >
      <Bell size={15} />
      <NotificationBadge count={totalCount} />
    </motion.button>
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
                cursor: 'default',
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

// CSS for badge pulse animation
export const HUD_NOTIFICATION_STYLES = `
  @keyframes hudBadgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`
