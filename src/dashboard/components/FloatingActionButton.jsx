// FloatingActionButton.jsx
// Draggable FAB with radial menu: New Agent, New Project, Create Group.
// Persists position to localStorage. Tap opens menu, drag repositions.

import { useState, useRef, useCallback, useEffect } from 'react'
import { UserPlus, FolderPlus, Users } from 'lucide-react'
import CreateRoomModal from './CreateRoomModal.jsx'

const FAB_SIZE = 48
const STORAGE_KEY = 'fab-position'

// Default position: bottom-right with safe margins
function getDefaultPos(isMobile) {
  return {
    x: (typeof window !== 'undefined' ? window.innerWidth : 375) - FAB_SIZE - 16,
    y: (typeof window !== 'undefined' ? window.innerHeight : 800) - FAB_SIZE - (isMobile ? 140 : 80),
  }
}

export default function FloatingActionButton({ isNightMode, isMobile, sidebarWidthPct = 0, onRoomCreated }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('agent') // 'agent' | 'project' | 'group'
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return getDefaultPos(isMobile)
  })

  const dragRef = useRef(null)
  const startRef = useRef(null)
  const didDragRef = useRef(false)
  const fabRef = useRef(null)

  // Clamp position within viewport
  const clamp = useCallback((x, y) => {
    const maxX = window.innerWidth - FAB_SIZE - 8
    const maxY = window.innerHeight - FAB_SIZE - 8
    return { x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) }
  }, [])

  // Save position
  const savePos = useCallback((p) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
  }, [])

  // Drag handlers
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return
    didDragRef.current = false
    startRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y, startX: e.clientX, startY: e.clientY }
    dragRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pos])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || !startRef.current) return
    const dx = Math.abs(e.clientX - startRef.current.startX)
    const dy = Math.abs(e.clientY - startRef.current.startY)
    if (dx > 5 || dy > 5) didDragRef.current = true
    const newPos = clamp(e.clientX - startRef.current.x, e.clientY - startRef.current.y)
    setPos(newPos)
  }, [clamp])

  const onPointerUp = useCallback((e) => {
    if (!dragRef.current) return
    dragRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (didDragRef.current) {
      savePos(pos)
    }
  }, [pos, savePos])

  const handleClick = useCallback(() => {
    if (didDragRef.current) return // Was a drag, not a click
    setMenuOpen(prev => !prev)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (fabRef.current?.contains(e.target)) return
      setMenuOpen(false)
    }
    setTimeout(() => document.addEventListener('pointerdown', handler), 0)
    return () => document.removeEventListener('pointerdown', handler)
  }, [menuOpen])

  // Theme
  const glowColor = isNightMode ? '120,80,255' : '59,130,246'
  const bgMain = isNightMode
    ? 'radial-gradient(circle at 40% 35%, rgba(100,60,220,0.95), rgba(30,20,80,0.98))'
    : 'radial-gradient(circle at 40% 35%, rgba(59,130,246,0.95), rgba(15,27,60,0.98))'

  const menuItems = [
    { label: 'New Agent', icon: UserPlus, color: '#22C55E', type: 'agent', angle: -90 },
    { label: 'New Project', icon: FolderPlus, color: '#3B82F6', type: 'project', angle: -45 },
    { label: 'Create Group', icon: Users, color: '#F59E0B', type: 'group', angle: 0 },
  ]

  // Compute menu item positions (radial from FAB center)
  const MENU_RADIUS = 95
  const getItemPos = (angle) => ({
    x: Math.cos((angle * Math.PI) / 180) * MENU_RADIUS,
    y: Math.sin((angle * Math.PI) / 180) * MENU_RADIUS,
  })

  // Determine which direction to expand menu based on FAB position
  const isNearRight = pos.x > window.innerWidth * 0.6
  const isNearBottom = pos.y > window.innerHeight * 0.6
  const baseAngle = isNearRight
    ? (isNearBottom ? 200 : 110) // expand left/up or left/down
    : (isNearBottom ? 280 : 20) // expand right/up or right/down

  return (
    <>
      <div
        ref={fabRef}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 55,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Menu items (radial) */}
        {menuOpen && menuItems.map((item, i) => {
          const angle = baseAngle + (i * 65)
          const itemPos = getItemPos(angle)
          const ItemIcon = item.icon
          return (
            <div
              key={item.type}
              onClick={() => {
                setModalType(item.type)
                setModalOpen(true)
                setMenuOpen(false)
              }}
              style={{
                position: 'absolute',
                left: FAB_SIZE / 2 + itemPos.x - 23,
                top: FAB_SIZE / 2 + itemPos.y - 23,
                width: 46, height: 46, borderRadius: 14,
                background: `${item.color}20`,
                border: `1.5px solid ${item.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${item.color}30`,
                animation: `fabItemPop 0.2s ease ${i * 0.05}s backwards`,
                transition: 'transform 100ms, box-shadow 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = `0 4px 20px ${item.color}50` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 16px ${item.color}30` }}
            >
              <ItemIcon size={20} strokeWidth={2} style={{ color: item.color }} />
            </div>
          )
        })}

        {/* Labels (below icons) */}
        {menuOpen && menuItems.map((item, i) => {
          const angle = baseAngle + (i * 65)
          const itemPos = getItemPos(angle)
          return (
            <div
              key={`label-${item.type}`}
              style={{
                position: 'absolute',
                left: FAB_SIZE / 2 + itemPos.x - 40,
                top: FAB_SIZE / 2 + itemPos.y + 28,
                width: 80, textAlign: 'center',
                fontSize: 11, fontWeight: 700,
                color: item.color,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '0.04em',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                animation: `fabItemPop 0.2s ease ${i * 0.05 + 0.1}s backwards`,
                pointerEvents: 'none',
              }}
            >
              {item.label}
            </div>
          )
        })}

        {/* FAB button */}
        <button
          aria-label="Add"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleClick}
          style={{
            width: FAB_SIZE, height: FAB_SIZE, borderRadius: '50%',
            border: 'none', cursor: dragRef.current ? 'grabbing' : 'grab',
            background: bgMain,
            boxShadow: `0 0 0 1.5px rgba(${glowColor},0.4), 0 4px 20px rgba(${glowColor},0.4), 0 0 30px rgba(${glowColor},0.15)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: menuOpen ? 'transform 200ms ease' : 'box-shadow 250ms ease',
            transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            outline: 'none', position: 'relative', overflow: 'visible',
          }}
        >
          <span style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            border: `2px solid rgba(${glowColor},0.3)`,
            animation: menuOpen ? 'none' : 'fabRingPulse 2.4s ease-in-out',
            pointerEvents: 'none',
          }} />
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.95)" strokeWidth={2.5} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px rgba(${glowColor},0.8))` }}
          >
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes fabRingPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 0.1; transform: scale(1.25); }
        }
        @keyframes fabItemPop {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <CreateRoomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        isNightMode={isNightMode}
        defaultType={modalType}
        onRoomCreated={(room) => {
          setModalOpen(false)
          onRoomCreated?.(room)
        }}
      />
    </>
  )
}
