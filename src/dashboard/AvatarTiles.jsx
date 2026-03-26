import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef, useMemo, useCallback } from 'react'
import { ALL_ROOMS } from './gridSpec.js'
import { getClientId } from './lib/clientConfig.js'
import {
  Wrench, BarChart3, Palette, Terminal, Megaphone, Video, Mail, Share2,
  Shield, Eye, Cpu, Bot, Crown, Camera, Heart, Lightbulb, FolderKanban,
  Briefcase, Zap, Globe, Music, Gamepad2, Rocket, Flame, Star, Anchor,
  Code, Database, Layers, PenTool, Target, Compass, Gem, Sun,
} from 'lucide-react'

// ---- ICON MAP ----
const AGENT_ICONS = {
  bobby: Wrench, steve: BarChart3, steffen: Palette, elon: Terminal,
  gary: Megaphone, cleo: Video, jacob: Mail, tony: Share2,
  patrik: Crown, mom: Eye, alex: Lightbulb, colton: Cpu,
  elmo: Shield, paige: Heart, pixel: Bot, mark: Camera,
}

// All available icons for the picker
const ALL_ICONS = {
  Wrench, BarChart3, Palette, Terminal, Megaphone, Video, Mail, Share2,
  Shield, Eye, Cpu, Bot, Crown, Camera, Heart, Lightbulb, FolderKanban,
  Briefcase, Zap, Globe, Music, Gamepad2, Rocket, Flame, Star, Anchor,
  Code, Database, Layers, PenTool, Target, Compass, Gem, Sun,
}

const ICON_NAMES = Object.keys(ALL_ICONS)

const PROJECT_ICON = FolderKanban

// Preset colors for the color picker
const COLOR_PRESETS = [
  '#3B82F6', '#60A5FA', '#2563EB', '#1D4ED8', // blues
  '#22C55E', '#4CAF50', '#16A34A', '#15803D', // greens
  '#F59E0B', '#F97316', '#EF4444', '#DC2626', // warm
  '#9C27B0', '#A78BFA', '#8B5CF6', '#7C3AED', // purples
  '#EC4899', '#F43F5E', '#06B6D4', '#14B8A6', // pink/teal
  '#C9A84C', '#FF6B35', '#7C9A72', '#6B7280', // earth/gray
]

// ---- CONTEXT MENU ITEM ----
function CtxItem({ label, onClick, color }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '9px 14px', fontSize: 13, fontWeight: 500,
        color: color || '#EDF2FA', cursor: 'pointer',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {label}
    </div>
  )
}

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
  drawerSnap,
  mobileHudHeight,
  initialFocusRoom = null,
}, ref) {
  const rooms = roomsProp && roomsProp.length > 0 ? roomsProp : ALL_ROOMS
  const visible = useMemo(() => rooms.filter(r => !r.hidden), [rooms])
  const [contextMenu, setContextMenu] = useState(null)
  const [subMenu, setSubMenu] = useState(null) // 'color' | 'icon' | 'rename' | null
  const [renameValue, setRenameValue] = useState('')
  const [customizations, setCustomizations] = useState({}) // slug -> { color, icon, nickname }
  const longPressRef = useRef(null)
  const customsLoadedRef = useRef(false)
  const renameInputRef = useRef(null)

  // Load customizations from preferences API on mount
  useEffect(() => {
    if (customsLoadedRef.current) return
    customsLoadedRef.current = true
    const clientId = getClientId()
    fetch(`/api/dashboard/preferences?key=agent_customizations&client=${encodeURIComponent(clientId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && typeof data.value === 'object') {
          setCustomizations(data.value)
        }
      })
      .catch(() => {})
  }, [])

  // Save customizations (debounced)
  const saveTimerRef = useRef(null)
  const saveCustomizations = useCallback((newCustoms) => {
    setCustomizations(newCustoms)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'agent_customizations',
          client_id: getClientId(),
          value: newCustoms,
        }),
      }).catch(() => {})
    }, 500)
  }, [])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e) => {
      // Don't close if clicking inside menu
      if (e.target.closest?.('[data-ctx-menu]')) return
      setContextMenu(null)
      setSubMenu(null)
    }
    setTimeout(() => window.addEventListener('click', handler), 0)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  // Focus rename input when submenu opens
  useEffect(() => {
    if (subMenu === 'rename' && renameInputRef.current) {
      setTimeout(() => renameInputRef.current?.focus(), 50)
    }
  }, [subMenu])

  useImperativeHandle(ref, () => ({
    triggerCelebration: () => {},
    focusRoom: () => {},
    resetLayout: () => {},
    addRoom: () => {},
  }))

  const isActive = (slug) => {
    const st = agentStatus[slug]?.status
    return st === 'working' || st === 'active'
  }

  const featuredSlug = visible.find(r => isActive(r.slug))?.slug || visible[0]?.slug

  // Apply customization: get resolved color, icon, name for a room
  const getCustom = (slug, room) => {
    const c = customizations[slug] || {}
    return {
      color: c.color || room.color || '#60A5FA',
      Icon: c.icon ? (ALL_ICONS[c.icon] || AGENT_ICONS[slug] || PROJECT_ICON) : (AGENT_ICONS[slug] || PROJECT_ICON),
      name: c.nickname || room.name || slug,
    }
  }

  const handleColorChange = (slug, newColor) => {
    const newCustoms = { ...customizations, [slug]: { ...customizations[slug], color: newColor } }
    saveCustomizations(newCustoms)
  }

  const handleIconChange = (slug, iconName) => {
    const newCustoms = { ...customizations, [slug]: { ...customizations[slug], icon: iconName } }
    saveCustomizations(newCustoms)
    setSubMenu(null)
    setContextMenu(null)
  }

  const handleRename = (slug, newName, isGlobal) => {
    if (!newName.trim()) return
    if (isGlobal) {
      // TODO: API call to rename across all files (Supabase agent_status.name)
      // For now, save as nickname + flag that global was requested
      const newCustoms = { ...customizations, [slug]: { ...customizations[slug], nickname: newName.trim(), globalRename: true } }
      saveCustomizations(newCustoms)
    } else {
      const newCustoms = { ...customizations, [slug]: { ...customizations[slug], nickname: newName.trim() } }
      saveCustomizations(newCustoms)
    }
    setSubMenu(null)
    setContextMenu(null)
  }

  const menuStyle = {
    position: 'fixed', zIndex: 1000, minWidth: 200,
    background: 'rgba(12,16,30,0.97)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(96,165,250,0.25)', borderRadius: 12,
    padding: '6px 0',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  const headerStyle = {
    padding: '6px 14px 8px', fontSize: 11, fontWeight: 700,
    color: 'rgba(96,165,250,0.7)', letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(96,165,250,0.12)', marginBottom: 4,
  }

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch',
      background: '#050A14', padding: '12px',
    }}>
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
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: isMobile ? 10 : 14,
        position: 'relative', zIndex: 1,
      }}>
        {visible.map((room, i) => {
          const slug = room.slug
          const { color, Icon, name } = getCustom(slug, room)
          const st = agentStatus[slug]?.status || 'idle'
          const active = st === 'working' || st === 'active'
          const isSel = selectedRoom === slug
          const isHov = extHover === slug
          const isFeatured = slug === featuredSlug
          const hasUnread = unreadAgents[slug] > 0

          return (
            <div
              key={slug}
              onClick={() => onRoomClick?.(slug)}
              onMouseEnter={() => setExtHover?.(slug)}
              onMouseLeave={() => setExtHover?.(null)}
              onContextMenu={(e) => {
                e.preventDefault()
                setSubMenu(null)
                setContextMenu({ x: e.clientX, y: e.clientY, slug, roomName: name })
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0]
                longPressRef.current = setTimeout(() => {
                  setSubMenu(null)
                  setContextMenu({ x: touch.clientX, y: touch.clientY, slug, roomName: name })
                }, 600)
              }}
              onTouchEnd={() => clearTimeout(longPressRef.current)}
              onTouchMove={() => clearTimeout(longPressRef.current)}
              style={{
                '--tile-c': color,
                borderRadius: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer',
                minHeight: isFeatured ? (isMobile ? 280 : 340) : (isMobile ? 140 : 180),
                gridRow: isFeatured ? 'span 2' : 'span 1',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                padding: isMobile ? 14 : 18,
                background: `linear-gradient(145deg,
                  color-mix(in srgb, ${color} 8%, #0a1428) 0%,
                  color-mix(in srgb, ${color} 25%, #060b18) 50%,
                  color-mix(in srgb, ${color} 45%, #030612) 100%)`,
                border: active || isSel || isHov
                  ? `1.5px solid color-mix(in srgb, ${color} ${active || isSel ? 50 : 35}%, transparent)`
                  : `1.5px solid color-mix(in srgb, ${color} 20%, transparent)`,
                boxShadow: active || isSel
                  ? `0 4px 30px color-mix(in srgb, ${color} 20%, transparent)`
                  : isHov ? `0 4px 20px color-mix(in srgb, ${color} 12%, transparent)` : 'none',
                transform: isHov && !isMobile ? 'translateY(-2px)' : 'none',
                animation: `tileSlide 0.4s ease ${0.03 * (i + 1)}s backwards${active ? ', glowPulse 2s ease-in-out infinite alternate' : ''}`,
                '--glow-c15': `color-mix(in srgb, ${color} 15%, transparent)`,
                '--glow-c30': `color-mix(in srgb, ${color} 30%, transparent)`,
                '--glow-c10': `color-mix(in srgb, ${color} 10%, transparent)`,
                transition: 'transform 0.2s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6))', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '-30%', right: '-30%', width: '80%', height: '80%', background: `radial-gradient(circle, color-mix(in srgb, ${color} 20%, transparent), transparent 70%)`, pointerEvents: 'none' }} />

              {/* Center icon */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -55%)', pointerEvents: 'none', opacity: active ? 0.15 : 0.08, transition: 'opacity 0.3s ease' }}>
                <Icon size={isFeatured ? (isMobile ? 80 : 100) : (isMobile ? 56 : 72)} strokeWidth={1.2} style={{ color: '#fff' }} />
              </div>

              {/* Status + unread */}
              {(active || hasUnread) && (
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
                  {hasUnread && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", border: '2px solid rgba(5,10,20,0.5)', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                      {unreadAgents[slug] > 9 ? '9+' : unreadAgents[slug]}
                    </div>
                  )}
                  {active && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}`, animation: 'livePulse 1.2s ease-in-out infinite' }} />
                  )}
                </div>
              )}

              {/* Name + role */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: isFeatured ? (isMobile ? 22 : 26) : (isMobile ? 18 : 20), fontWeight: 800, color: '#EDF2FA', letterSpacing: '-0.01em', fontFamily: "'Inter', system-ui, sans-serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>
                  {name}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: color, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2, fontFamily: "'Inter', system-ui, sans-serif", textShadow: `0 0 12px ${color}40` }}>
                  {room.role || room.type || ''}
                </div>
              </div>

              {isSel && (
                <div style={{ position: 'absolute', inset: -1, borderRadius: 21, border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}60, inset 0 0 20px ${color}15`, pointerEvents: 'none', zIndex: 3 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ---- CONTEXT MENU ---- */}
      {contextMenu && !subMenu && (
        <div data-ctx-menu style={{ ...menuStyle, left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          <div style={headerStyle}>{contextMenu.roomName}</div>
          <CtxItem label="Open Chat" onClick={() => { onOpenChat?.(contextMenu.slug); setContextMenu(null) }} />
          <CtxItem label="Send Message" onClick={() => { onSendMessage?.(contextMenu.slug); setContextMenu(null) }} />
          <CtxItem label="View Tasks" onClick={() => { onViewTasks?.(contextMenu.slug); setContextMenu(null) }} />
          <div style={{ height: 1, background: 'rgba(96,165,250,0.12)', margin: '4px 0' }} />
          <CtxItem label="Change Color" onClick={() => setSubMenu('color')} />
          <CtxItem label="Change Icon" onClick={() => setSubMenu('icon')} />
          <CtxItem label="Rename" onClick={() => { setRenameValue(contextMenu.roomName); setSubMenu('rename') }} />
        </div>
      )}

      {/* ---- COLOR PICKER SUB-MENU ---- */}
      {contextMenu && subMenu === 'color' && (
        <div data-ctx-menu style={{ ...menuStyle, left: contextMenu.x, top: contextMenu.y, minWidth: 240 }} onClick={e => e.stopPropagation()}>
          <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span onClick={() => setSubMenu(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>←</span>
            Change Color
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, padding: '8px 12px' }}>
            {COLOR_PRESETS.map(c => {
              const isSelected = (customizations[contextMenu.slug]?.color || '') === c
              return (
                <div
                  key={c}
                  onClick={() => { handleColorChange(contextMenu.slug, c); setSubMenu(null); setContextMenu(null) }}
                  style={{
                    width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                    border: isSelected ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: isSelected ? `0 0 12px ${c}80` : `0 0 8px ${c}30`,
                    transition: 'transform 100ms, box-shadow 100ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = `0 0 14px ${c}60` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = isSelected ? `0 0 12px ${c}80` : `0 0 8px ${c}30` }}
                />
              )
            })}
          </div>
          {/* Reset option */}
          <CtxItem label="Reset to Default" color="#6B7280" onClick={() => {
            const newCustoms = { ...customizations }
            if (newCustoms[contextMenu.slug]) { delete newCustoms[contextMenu.slug].color }
            saveCustomizations(newCustoms)
            setSubMenu(null); setContextMenu(null)
          }} />
        </div>
      )}

      {/* ---- ICON PICKER SUB-MENU ---- */}
      {contextMenu && subMenu === 'icon' && (
        <div data-ctx-menu style={{ ...menuStyle, left: contextMenu.x, top: contextMenu.y, minWidth: 280 }} onClick={e => e.stopPropagation()}>
          <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span onClick={() => setSubMenu(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>←</span>
            Change Icon
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, padding: '8px 12px', maxHeight: 240, overflowY: 'auto' }}>
            {ICON_NAMES.map(iconName => {
              const IconComp = ALL_ICONS[iconName]
              const isSelected = (customizations[contextMenu.slug]?.icon || '') === iconName
              const tileColor = customizations[contextMenu.slug]?.color || rooms.find(r => r.slug === contextMenu.slug)?.color || '#60A5FA'
              return (
                <div
                  key={iconName}
                  onClick={() => handleIconChange(contextMenu.slug, iconName)}
                  title={iconName}
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? `${tileColor}25` : 'transparent',
                    border: isSelected ? `1.5px solid ${tileColor}60` : '1.5px solid transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${tileColor}15`}
                  onMouseLeave={e => e.currentTarget.style.background = isSelected ? `${tileColor}25` : 'transparent'}
                >
                  <IconComp size={18} strokeWidth={1.8} style={{ color: isSelected ? tileColor : '#8BA4C4' }} />
                </div>
              )
            })}
          </div>
          <CtxItem label="Reset to Default" color="#6B7280" onClick={() => {
            const newCustoms = { ...customizations }
            if (newCustoms[contextMenu.slug]) { delete newCustoms[contextMenu.slug].icon }
            saveCustomizations(newCustoms)
            setSubMenu(null); setContextMenu(null)
          }} />
        </div>
      )}

      {/* ---- RENAME SUB-MENU ---- */}
      {contextMenu && subMenu === 'rename' && (
        <div data-ctx-menu style={{ ...menuStyle, left: contextMenu.x, top: contextMenu.y, minWidth: 260, padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
          <div style={{ ...headerStyle, padding: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span onClick={() => setSubMenu(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>←</span>
            Rename
          </div>
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(contextMenu.slug, renameValue, false) }}
            placeholder="New name..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'rgba(15,25,50,0.8)', border: '1.5px solid rgba(96,165,250,0.25)',
              color: '#EDF2FA', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none', marginBottom: 10,
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(96,165,250,0.5)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(96,165,250,0.25)'}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleRename(contextMenu.slug, renameValue, false)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(59,130,246,0.15)', color: '#60A5FA', fontSize: 12, fontWeight: 700,
                fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em',
              }}
            >
              Nickname Only
            </button>
            <button
              onClick={() => handleRename(contextMenu.slug, renameValue, true)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: 12, fontWeight: 700,
                fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em',
              }}
            >
              Rename Everywhere
            </button>
          </div>
          {customizations[contextMenu.slug]?.nickname && (
            <CtxItem label="Reset to Original" color="#6B7280" onClick={() => {
              const newCustoms = { ...customizations }
              if (newCustoms[contextMenu.slug]) { delete newCustoms[contextMenu.slug].nickname; delete newCustoms[contextMenu.slug].globalRename }
              saveCustomizations(newCustoms)
              setSubMenu(null); setContextMenu(null)
            }} />
          )}
        </div>
      )}
    </div>
  )
})

export default AvatarTiles
