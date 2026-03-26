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
// Error boundary wrapper to prevent blank screen crashes
class AvatarTilesErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('[AvatarTiles] Render crash:', error, info) }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { padding: 20, color: '#EF4444', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14 }
      }, `Dashboard Error: ${this.state.error?.message || 'Unknown'}. Try refreshing.`)
    }
    return this.props.children
  }
}

const AvatarTilesInner = forwardRef(function AvatarTilesInner({
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
  const allVisible = useMemo(() => rooms.filter(r => !r.hidden), [rooms])

  // Ordered tile list (drag-to-reorder). Persists to Supabase preferences.
  const [tileOrder, setTileOrder] = useState(null) // null = use default order
  const orderLoadedRef = useRef(false)

  // Load saved tile order
  useEffect(() => {
    if (orderLoadedRef.current) return
    orderLoadedRef.current = true
    const clientId = getClientId()
    fetch(`/api/dashboard/preferences?key=tile_order&client=${encodeURIComponent(clientId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          setTileOrder(data.value)
        }
      })
      .catch(() => {})
  }, [])

  // Save tile order (debounced)
  const orderSaveRef = useRef(null)
  const saveTileOrder = useCallback((order) => {
    setTileOrder(order)
    if (orderSaveRef.current) clearTimeout(orderSaveRef.current)
    orderSaveRef.current = setTimeout(() => {
      fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'tile_order', client_id: getClientId(), value: order }),
      }).catch(() => {})
    }, 800)
  }, [])

  // Apply ordering: use saved order, then append any new rooms not in saved order
  const visible = useMemo(() => {
    if (!tileOrder || tileOrder.length === 0) return allVisible
    const slugSet = new Set(allVisible.map(r => r.slug))
    const ordered = tileOrder.filter(s => slugSet.has(s)).map(s => allVisible.find(r => r.slug === s))
    const remaining = allVisible.filter(r => !tileOrder.includes(r.slug))
    return [...ordered, ...remaining]
  }, [allVisible, tileOrder])

  // Drag state
  const [dragSlug, setDragSlug] = useState(null)
  const [dragOverSlug, setDragOverSlug] = useState(null)
  const dragStartRef = useRef(null)
  const didDragRef = useRef(false)

  const handleDragStart = useCallback((slug, e) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    didDragRef.current = false
    setDragSlug(slug)
  }, [])

  const handleDragOver = useCallback((slug) => {
    if (!dragSlug || slug === dragSlug) return
    didDragRef.current = true
    setDragOverSlug(slug)
  }, [dragSlug])

  const handleDragEnd = useCallback(() => {
    if (dragSlug && dragOverSlug && dragSlug !== dragOverSlug) {
      const currentOrder = visible.map(r => r.slug)
      const fromIdx = currentOrder.indexOf(dragSlug)
      const toIdx = currentOrder.indexOf(dragOverSlug)
      if (fromIdx !== -1 && toIdx !== -1) {
        const newOrder = [...currentOrder]
        newOrder.splice(fromIdx, 1)
        newOrder.splice(toIdx, 0, dragSlug)
        saveTileOrder(newOrder)
      }
    }
    setDragSlug(null)
    setDragOverSlug(null)
  }, [dragSlug, dragOverSlug, visible, saveTileOrder])

  // Pinned favorites (top section). Auto-populated from last 5 used if empty.
  const [pinnedSlugs, setPinnedSlugs] = useState([])
  const pinnedLoadedRef = useRef(false)
  useEffect(() => {
    if (pinnedLoadedRef.current) return
    pinnedLoadedRef.current = true
    const clientId = getClientId()
    fetch(`/api/dashboard/preferences?key=tile_pinned&client=${encodeURIComponent(clientId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && Array.isArray(data.value)) setPinnedSlugs(data.value)
      })
      .catch(() => {})
  }, [])
  const savePinned = useCallback((pins) => {
    setPinnedSlugs(pins)
    fetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'tile_pinned', client_id: getClientId(), value: pins }),
    }).catch(() => {})
  }, [])

  // Track last used for auto-populating top section
  const trackUsed = useCallback((slug) => {
    if (pinnedSlugs.includes(slug)) return // already pinned manually
    // Auto-pin logic handled by section rendering (last 5 active agents)
  }, [pinnedSlugs])

  // Split visible into sections
  const sections = useMemo(() => {
    const slugSet = new Set(visible.map(r => r.slug))
    // Top section: manually pinned OR auto last 5 active/recently-used agents
    const manualPins = pinnedSlugs.filter(s => slugSet.has(s))
    let topSlugs = manualPins.length > 0
      ? manualPins
      : visible.filter(r => {
          const st = agentStatus[r.slug]?.status
          return st === 'working' || st === 'active'
        }).slice(0, 5).map(r => r.slug)
    // If still empty, use first 5
    if (topSlugs.length === 0) topSlugs = visible.slice(0, 5).map(r => r.slug)

    const topSet = new Set(topSlugs)
    const top = topSlugs.map(s => visible.find(r => r.slug === s)).filter(Boolean)
    const agents = visible.filter(r => !topSet.has(r.slug) && (r.type === 'agent' || !r.type))
    const projects = visible.filter(r => !topSet.has(r.slug) && r.type === 'project')
    return { top, agents, projects }
  }, [visible, pinnedSlugs, agentStatus])

  // Background image upload
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleUploadBackground = useCallback(async (slug, file) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    try {
      // Get signed upload URL from Vercel API
      const clientId = getClientId()
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `tile-bg-${slug}-${Date.now()}.${ext}`
      const uploadRes = await fetch(`/api/dashboard/files?action=upload&path=${encodeURIComponent(`${clientId}/${slug}/${filename}`)}&contentType=${encodeURIComponent(file.type)}`)
      if (!uploadRes.ok) throw new Error('Failed to get upload URL')
      const { signedUrl } = await uploadRes.json()
      // Upload to Supabase storage
      await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      // Build public URL
      const publicUrl = signedUrl.split('?')[0].replace('/storage/v1/object/upload/sign/', '/storage/v1/object/public/')
      // Save to customizations
      const newCustoms = { ...customizations, [slug]: { ...customizations[slug], backgroundImage: publicUrl } }
      saveCustomizations(newCustoms)
    } catch (err) {
      console.error('[AvatarTiles] Upload failed:', err)
    }
    setUploading(false)
    setSubMenu(null)
    setContextMenu(null)
  }, [customizations, saveCustomizations])

  const handleRemoveBackground = useCallback((slug) => {
    const newCustoms = { ...customizations }
    if (newCustoms[slug]) delete newCustoms[slug].backgroundImage
    saveCustomizations(newCustoms)
    setSubMenu(null)
    setContextMenu(null)
  }, [customizations, saveCustomizations])

  const [contextMenu, setContextMenu] = useState(null)
  const [subMenu, setSubMenu] = useState(null)
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
      backgroundImage: c.backgroundImage || null,
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
      width: '100%', height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 1,
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

      {/* ---- SECTION RENDERER ---- */}
      {[
        { key: 'top', label: 'Favorites', items: sections.top, horizontal: isMobile },
        { key: 'agents', label: 'Agents', items: sections.agents, horizontal: false },
        { key: 'projects', label: 'Projects', items: sections.projects, horizontal: false },
      ].filter(s => s.items.length > 0).map(section => (
        <div key={section.key} style={{ marginBottom: isMobile ? 16 : 20 }}>
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 4px', marginBottom: 8,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#4A6080',
              fontFamily: "'Inter', system-ui, sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {section.label}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(59,130,246,0.1)' }} />
            <span style={{ fontSize: 10, color: '#3A5570', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {section.items.length}
            </span>
          </div>

          {/* Tile grid (horizontal scroll on mobile for top section) */}
          <div style={{
            display: section.horizontal ? 'flex' : 'grid',
            ...(section.horizontal
              ? { gap: 10, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: 4, scrollbarWidth: 'none' }
              : { gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }
            ),
            position: 'relative', zIndex: 1,
          }}>
            {section.items.map((room, i) => {
              const slug = room.slug
              const { color, Icon, name, backgroundImage } = getCustom(slug, room)
              const st = agentStatus[slug]?.status || 'idle'
              const active = st === 'working' || st === 'active'
              const isSel = selectedRoom === slug
              const isHov = extHover === slug
              const hasUnread = unreadAgents[slug] > 0
              const isDragging = dragSlug === slug
              const isDropTarget = dragOverSlug === slug && dragSlug !== slug

              return (
                <div
                  key={slug}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', slug); handleDragStart(slug, e) }}
                  onDragOver={(e) => { e.preventDefault(); handleDragOver(slug) }}
                  onDragEnter={(e) => { e.preventDefault(); handleDragOver(slug) }}
                  onDrop={(e) => { e.preventDefault(); handleDragEnd() }}
                  onDragEnd={handleDragEnd}
                  onClick={() => { if (!didDragRef.current) { onRoomClick?.(slug); trackUsed(slug) } }}
                  onMouseEnter={() => setExtHover?.(slug)}
                  onMouseLeave={() => setExtHover?.(null)}
                  onContextMenu={(e) => { e.preventDefault(); setSubMenu(null); setContextMenu({ x: e.clientX, y: e.clientY, slug, roomName: name, section: section.key }) }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0]
                    longPressRef.current = setTimeout(() => { setSubMenu(null); setContextMenu({ x: touch.clientX, y: touch.clientY, slug, roomName: name, section: section.key }) }, 600)
                  }}
                  onTouchEnd={() => clearTimeout(longPressRef.current)}
                  onTouchMove={() => clearTimeout(longPressRef.current)}
                  style={{
                    '--tile-c': color,
                    borderRadius: 20, overflow: 'hidden', position: 'relative',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    ...(section.horizontal
                      ? { minWidth: isMobile ? 140 : 180, minHeight: isMobile ? 120 : 150, flexShrink: 0 }
                      : { minHeight: isMobile ? 140 : 180 }
                    ),
                    outline: isDropTarget ? '2px dashed rgba(96,165,250,0.6)' : 'none', outlineOffset: -2,
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    padding: isMobile ? 12 : 18,
                    background: backgroundImage
                      ? `url(${backgroundImage}) center/cover no-repeat`
                      : `linear-gradient(145deg, color-mix(in srgb, ${color} 8%, #0a1428) 0%, color-mix(in srgb, ${color} 25%, #060b18) 50%, color-mix(in srgb, ${color} 45%, #030612) 100%)`,
                    border: active || isSel || isHov
                      ? `1.5px solid color-mix(in srgb, ${color} ${active || isSel ? 50 : 35}%, transparent)`
                      : `1.5px solid color-mix(in srgb, ${color} 20%, transparent)`,
                    boxShadow: active || isSel ? `0 4px 30px color-mix(in srgb, ${color} 20%, transparent)` : isHov ? `0 4px 20px color-mix(in srgb, ${color} 12%, transparent)` : 'none',
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
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -55%)', pointerEvents: 'none', opacity: active ? 0.15 : 0.08, transition: 'opacity 0.3s ease' }}>
                    <Icon size={section.horizontal ? (isMobile ? 48 : 64) : (isMobile ? 56 : 72)} strokeWidth={1.2} style={{ color: '#fff' }} />
                  </div>
                  {(active || hasUnread) && (
                    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 5, zIndex: 2 }}>
                      {hasUnread && <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", border: '2px solid rgba(5,10,20,0.5)' }}>{unreadAgents[slug] > 9 ? '9+' : unreadAgents[slug]}</div>}
                      {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, animation: 'livePulse 1.2s ease-in-out infinite' }} />}
                    </div>
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: section.horizontal ? (isMobile ? 15 : 18) : (isMobile ? 18 : 20), fontWeight: 800, color: '#EDF2FA', letterSpacing: '-0.01em', fontFamily: "'Inter', system-ui, sans-serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1.2 }}>{name}</div>
                    <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: color, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2, fontFamily: "'Inter', system-ui, sans-serif", textShadow: `0 0 12px ${color}40` }}>{room.role || room.type || ''}</div>
                  </div>
                  {isSel && <div style={{ position: 'absolute', inset: -1, borderRadius: 21, border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}60, inset 0 0 20px ${color}15`, pointerEvents: 'none', zIndex: 3 }} />}
                </div>
              )
            })}
          </div>
        </div>
      ))}

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
          <div style={{ height: 1, background: 'rgba(96,165,250,0.12)', margin: '4px 0' }} />
          <CtxItem label="Set Background" onClick={() => setSubMenu('background')} />
          <div style={{ height: 1, background: 'rgba(96,165,250,0.12)', margin: '4px 0' }} />
          {pinnedSlugs.includes(contextMenu.slug)
            ? <CtxItem label="Unpin from Top" color="#F59E0B" onClick={() => { savePinned(pinnedSlugs.filter(s => s !== contextMenu.slug)); setContextMenu(null) }} />
            : <CtxItem label="Pin to Top" color="#22C55E" onClick={() => { savePinned([...pinnedSlugs, contextMenu.slug]); setContextMenu(null) }} />
          }
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

      {/* ---- BACKGROUND SUB-MENU ---- */}
      {contextMenu && subMenu === 'background' && (
        <div data-ctx-menu style={{ ...menuStyle, left: contextMenu.x, top: contextMenu.y, minWidth: 220 }} onClick={e => e.stopPropagation()}>
          <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span onClick={() => setSubMenu(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>←</span>
            Set Background
          </div>
          <CtxItem label={uploading ? 'Uploading...' : 'Upload Image'} onClick={() => {
            if (uploading) return
            fileInputRef.current?.click()
          }} />
          <CtxItem label="Generate Background" color="#A78BFA" onClick={() => {
            // Generate a themed gradient based on agent color
            const c = customizations[contextMenu.slug]?.color || rooms.find(r => r.slug === contextMenu.slug)?.color || '#60A5FA'
            // Create a more dramatic gradient as a "generated" background
            const canvas = document.createElement('canvas')
            canvas.width = 400; canvas.height = 400
            const ctx = canvas.getContext('2d')
            // Radial gradient with agent color
            const grad = ctx.createRadialGradient(120, 100, 20, 200, 200, 300)
            grad.addColorStop(0, c + 'CC')
            grad.addColorStop(0.4, c + '44')
            grad.addColorStop(1, '#030612')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, 400, 400)
            // Add some noise dots
            for (let n = 0; n < 80; n++) {
              const nx = Math.random() * 400, ny = Math.random() * 400
              ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`
              ctx.beginPath()
              ctx.arc(nx, ny, Math.random() * 2 + 0.5, 0, Math.PI * 2)
              ctx.fill()
            }
            const dataUrl = canvas.toDataURL('image/png')
            const newCustoms = { ...customizations, [contextMenu.slug]: { ...customizations[contextMenu.slug], backgroundImage: dataUrl } }
            saveCustomizations(newCustoms)
            setSubMenu(null)
            setContextMenu(null)
          }} />
          {customizations[contextMenu.slug]?.backgroundImage && (
            <CtxItem label="Remove Background" color="#EF4444" onClick={() => handleRemoveBackground(contextMenu.slug)} />
          )}
        </div>
      )}

      {/* Hidden file input for background upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && contextMenu) handleUploadBackground(contextMenu.slug, file)
          e.target.value = ''
        }}
      />
    </div>
  )
})

const AvatarTiles = forwardRef(function AvatarTiles(props, ref) {
  return React.createElement(AvatarTilesErrorBoundary, null,
    React.createElement(AvatarTilesInner, { ...props, ref })
  )
})

export default AvatarTiles
