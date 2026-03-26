import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef, useMemo } from 'react'
import { ALL_ROOMS } from './gridSpec.js'
import {
  Wrench, BarChart3, Palette, Terminal, Megaphone, Video, Mail, Share2,
  Shield, Eye, Cpu, Bot, Crown, Camera, Heart, Lightbulb, FolderKanban,
} from 'lucide-react'

// ---- ICON MAP (shared with HexGrid) ----
const AGENT_ICONS = {
  bobby: Wrench,
  steve: BarChart3,
  steffen: Palette,
  elon: Terminal,
  gary: Megaphone,
  cleo: Video,
  jacob: Mail,
  tony: Share2,
  patrik: Crown,
  mom: Eye,
  alex: Lightbulb,
  colton: Cpu,
  elmo: Shield,
  paige: Heart,
  pixel: Bot,
  mark: Camera,
}

const PROJECT_ICON = FolderKanban

// ---- COMPONENT ----
const AvatarTiles = forwardRef(function AvatarTiles({
  agentStatus = {},
  onRoomClick,
  selectedRoom,
  hoveredRoom: extHover,
  setHoveredRoom: setExtHover,
  isNightMode = true,
  isMobile = false,
  onOpenChat,
  onSendMessage,
  onViewTasks,
  onSetAsHome,
  unreadAgents = {},
  rooms: roomsProp,
  // Passthrough props (not used but accepted for compatibility)
  drawerSnap,
  mobileHudHeight,
  initialFocusRoom = null,
}, ref) {
  const rooms = roomsProp && roomsProp.length > 0 ? roomsProp : ALL_ROOMS
  const visible = useMemo(() => rooms.filter(r => !r.hidden), [rooms])
  const [contextMenu, setContextMenu] = useState(null)
  const longPressRef = useRef(null)

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  useImperativeHandle(ref, () => ({
    triggerCelebration: () => {},
    focusRoom: () => {},
    resetLayout: () => {},
    addRoom: () => {},
  }))

  // Determine which agents are active (working/active status)
  const isActive = (slug) => {
    const st = agentStatus[slug]?.status
    return st === 'working' || st === 'active'
  }

  // Featured tile: first active agent, or first agent
  const featuredSlug = visible.find(r => isActive(r.slug))?.slug || visible[0]?.slug

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch',
      background: '#050A14',
      padding: '12px',
    }}>
      {/* CSS Animations */}
      <style>{`
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes rotateBorder { to { --angle: 360deg; } }
        @keyframes glowPulse {
          0% { box-shadow: 0 4px 20px var(--glow-c15); }
          100% { box-shadow: 0 4px 40px var(--glow-c30), 0 0 60px var(--glow-c10); }
        }
        @keyframes tileSlide { from { opacity: 0; transform: translateY(30px) scale(0.9); } }
        @keyframes livePulse {
          0%, 100% { box-shadow: 0 0 6px var(--tile-c); }
          50% { box-shadow: 0 0 16px var(--tile-c), 0 0 30px color-mix(in srgb, var(--tile-c) 40%, transparent); }
        }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        position: 'relative',
        zIndex: 1,
      }}>
        {visible.map((room, i) => {
          const slug = room.slug
          const color = room.color || '#60A5FA'
          const st = agentStatus[slug]?.status || 'idle'
          const active = st === 'working' || st === 'active'
          const isSel = selectedRoom === slug
          const isFeatured = slug === featuredSlug
          const hasUnread = unreadAgents[slug] > 0
          const Icon = AGENT_ICONS[slug] || PROJECT_ICON

          return (
            <div
              key={slug}
              onClick={() => onRoomClick?.(slug)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, slug, roomName: room.name || slug })
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0]
                longPressRef.current = setTimeout(() => {
                  setContextMenu({ x: touch.clientX, y: touch.clientY, slug, roomName: room.name || slug })
                }, 600)
              }}
              onTouchEnd={() => clearTimeout(longPressRef.current)}
              onTouchMove={() => clearTimeout(longPressRef.current)}
              style={{
                '--tile-c': color,
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                minHeight: isFeatured ? 280 : 140,
                gridRow: isFeatured ? 'span 2' : 'span 1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 14,
                background: `linear-gradient(145deg,
                  color-mix(in srgb, ${color} 8%, #0a1428) 0%,
                  color-mix(in srgb, ${color} 25%, #060b18) 50%,
                  color-mix(in srgb, ${color} 45%, #030612) 100%)`,
                border: active || isSel
                  ? `1.5px solid color-mix(in srgb, ${color} 50%, transparent)`
                  : `1.5px solid color-mix(in srgb, ${color} 20%, transparent)`,
                boxShadow: active || isSel
                  ? `0 4px 30px color-mix(in srgb, ${color} 20%, transparent)`
                  : 'none',
                animation: `tileSlide 0.4s ease ${0.03 * (i + 1)}s backwards${active ? ', glowPulse 2s ease-in-out infinite alternate' : ''}`,
                '--glow-c15': `color-mix(in srgb, ${color} 15%, transparent)`,
                '--glow-c30': `color-mix(in srgb, ${color} 30%, transparent)`,
                '--glow-c10': `color-mix(in srgb, ${color} 10%, transparent)`,
                transition: 'transform 0.2s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Gradient overlay for text readability */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6))',
                pointerEvents: 'none',
              }} />

              {/* Top-right glow orb */}
              <div style={{
                position: 'absolute', top: '-30%', right: '-30%',
                width: '80%', height: '80%',
                background: `radial-gradient(circle, color-mix(in srgb, ${color} 20%, transparent), transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Center icon (large, ghosted) */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -55%)',
                pointerEvents: 'none',
                opacity: active ? 0.15 : 0.08,
                transition: 'opacity 0.3s ease',
              }}>
                <Icon
                  size={isFeatured ? 80 : 56}
                  strokeWidth={1.2}
                  style={{ color: '#fff' }}
                />
              </div>

              {/* Status indicator (top right) */}
              {(active || hasUnread) && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                  zIndex: 2,
                }}>
                  {hasUnread && (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#EF4444', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      border: '2px solid rgba(5,10,20,0.5)',
                      boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                    }}>
                      {unreadAgents[slug] > 9 ? '9+' : unreadAgents[slug]}
                    </div>
                  )}
                  {active && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 10px ${color}`,
                      animation: 'livePulse 1.2s ease-in-out infinite',
                    }} />
                  )}
                </div>
              )}

              {/* Name + role at bottom */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: isFeatured ? 22 : 18,
                  fontWeight: 800,
                  color: '#EDF2FA',
                  letterSpacing: '-0.01em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  lineHeight: 1.2,
                }}>
                  {room.name || slug}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: color,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  textShadow: `0 0 12px ${color}40`,
                }}>
                  {room.role || room.type || ''}
                </div>
              </div>

              {/* Selected ring */}
              {isSel && (
                <div style={{
                  position: 'absolute', inset: -1,
                  borderRadius: 21,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 20px ${color}60, inset 0 0 20px ${color}15`,
                  pointerEvents: 'none', zIndex: 3,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y,
            zIndex: 1000, minWidth: 180,
            background: 'rgba(12,16,30,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10,
            padding: '6px 0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '6px 14px 8px', fontSize: 11, fontWeight: 700,
            color: 'rgba(96,165,250,0.7)', letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(96,165,250,0.12)', marginBottom: 4,
          }}>
            {contextMenu.roomName}
          </div>
          {[
            { label: 'Open Chat', fn: () => onOpenChat?.(contextMenu.slug) },
            { label: 'Send Message', fn: () => onSendMessage?.(contextMenu.slug) },
            { label: 'View Tasks', fn: () => onViewTasks?.(contextMenu.slug) },
          ].map(item => (
            <div
              key={item.label}
              onClick={() => { item.fn(); setContextMenu(null) }}
              style={{
                padding: '9px 14px', fontSize: 13, fontWeight: 500,
                color: '#EDF2FA', cursor: 'pointer',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default AvatarTiles
