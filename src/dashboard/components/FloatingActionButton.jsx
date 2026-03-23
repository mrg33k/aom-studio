// FloatingActionButton.jsx
// Single persistent FAB anchored top-right of game viewport.
// Tap opens role picker modal directly (no intermediate dropdown).
// Always above game content (z:55).

import { useState } from 'react'
import CreateRoomModal from './CreateRoomModal.jsx'

// Position: top-right corner of game map area
// FAB_TOP uses CSS calc to clear the nav bar (48px mobile / 52px desktop) + safe-area-inset-top + margin.
// Written as a string so it can be used directly in the style prop.
const FAB_TOP_CSS = 'calc(52px + env(safe-area-inset-top, 0px) + 16px)'
const FAB_RIGHT = 16  // px
const FAB_SIZE  = 48  // px -- main button diameter

export default function FloatingActionButton({ isNightMode, isMobile, sidebarWidthPct = 0, onRoomCreated }) {
  const [modalOpen, setModalOpen] = useState(false)

  // Theme tokens
  const glowColor = isNightMode ? '120,80,255' : '59,130,246'
  const bgMain = isNightMode
    ? 'radial-gradient(circle at 40% 35%, rgba(100,60,220,0.95), rgba(30,20,80,0.98))'
    : 'radial-gradient(circle at 40% 35%, rgba(59,130,246,0.95), rgba(15,27,60,0.98))'

  const rightVal = sidebarWidthPct > 0
    ? `calc(max(${sidebarWidthPct}%, 300px) + ${FAB_RIGHT}px)`
    : `${FAB_RIGHT}px`

  return (
    <>
      {/* Main FAB button */}
      <div
        style={{
          position: 'fixed',
          top: FAB_TOP_CSS,
          right: rightVal,
          transition: 'right 250ms ease',
          zIndex: 55,
          pointerEvents: 'auto',
        }}
      >
        <button
          aria-label="Add a room"
          onClick={() => setModalOpen(true)}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: bgMain,
            boxShadow: `0 0 0 1.5px rgba(${glowColor},0.4), 0 4px 20px rgba(${glowColor},0.4), 0 0 30px rgba(${glowColor},0.15)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'box-shadow 250ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
            outline: 'none',
            position: 'relative',
            overflow: 'visible',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = `0 0 0 2px rgba(${glowColor},0.55), 0 6px 28px rgba(${glowColor},0.55), 0 0 40px rgba(${glowColor},0.22)`
            e.currentTarget.style.transform = 'scale(1.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = `0 0 0 1.5px rgba(${glowColor},0.4), 0 4px 20px rgba(${glowColor},0.4), 0 0 30px rgba(${glowColor},0.15)`
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {/* Glow ring animation */}
          <span style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '50%',
            border: `2px solid rgba(${glowColor},0.3)`,
            animation: 'fabRingPulse 2.4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          {/* + icon */}
          <svg
            width={22} height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px rgba(${glowColor},0.8))` }}
          >
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes fabRingPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(1.18); }
        }
      `}</style>

      {/* Role picker + name modal */}
      <CreateRoomModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        isNightMode={isNightMode}
        onRoomCreated={(room) => {
          setModalOpen(false)
          onRoomCreated?.(room)
        }}
      />
    </>
  )
}
