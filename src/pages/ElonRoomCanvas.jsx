import React, { useState, useCallback, useEffect, useRef } from 'react'
import CanvasRoom from '../dashboard/CanvasRoom.jsx'

// ElonRoomCanvas: Full-screen dark view showing ONLY Elon's server room.
// Centered on screen, dark background (#0D0D1A), no other rooms.
// Integrates production furniture sprites (server-rack, desk, monitor, chair).
// Alpha-channel click detection. Responsive to viewport size.
//
// Route: /elon-room

const DARK_BG = '#0D0D1A'
const ROOM_NAME = 'Elon'
const ROOM_ROLE = 'Systems Engineer'

export default function ElonRoomCanvas() {
  const [clicked, setClicked] = useState(null)
  const [viewportInfo, setViewportInfo] = useState({ w: 0, h: 0 })
  const containerRef = useRef(null)

  // Track viewport size for responsive room sizing
  useEffect(() => {
    const update = () => {
      setViewportInfo({ w: window.innerWidth, h: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleRoomClick = useCallback((roomId, coords) => {
    setClicked({ roomId, ...coords, time: Date.now() })
    // Clear click feedback after 1.5s
    setTimeout(() => setClicked(null), 1500)
  }, [])

  // Room size: fit to viewport with padding, max 600px
  const padding = 48
  const maxRoomSize = Math.min(
    viewportInfo.w - padding * 2,
    viewportInfo.h - padding * 2 - 80, // leave room for label
    600
  )
  const roomSize = Math.max(maxRoomSize, 200)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: DARK_BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    }}>
      {/* Subtle radial gradient for depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Room label (above) */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: 'rgba(76, 175, 80, 0.08)',
          border: '1px solid rgba(76, 175, 80, 0.2)',
          borderRadius: 6,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#4CAF50',
            boxShadow: '0 0 8px rgba(76,175,80,0.5)',
          }} />
          <span style={{
            color: '#E8E3DC',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {ROOM_NAME}
          </span>
          <span style={{
            color: '#6B6560',
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 600,
          }}>
            {ROOM_ROLE}
          </span>
        </div>
      </div>

      {/* Canvas Room (centered) */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: roomSize,
          height: roomSize,
          zIndex: 1,
        }}
      >
        <CanvasRoom
          roomId="elon"
          isActive={true}
          useProductionFurniture={true}
          onClick={handleRoomClick}
        />

        {/* Click feedback overlay */}
        {clicked && (
          <div style={{
            position: 'absolute',
            left: `${(clicked.x / 512) * 100}%`,
            top: `${(clicked.y / 512) * 100}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid rgba(76,175,80,0.8)',
              animation: 'clickRipple 0.6s ease-out forwards',
            }} />
          </div>
        )}
      </div>

      {/* Room info (below) */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        marginTop: 16,
        color: '#6B6560',
        fontSize: 12,
        fontFamily: 'monospace',
      }}>
        <div style={{ marginBottom: 4 }}>
          Canvas: 512x512 | Layers: 6 | Furniture: 4 production sprites
        </div>
        <div>
          Alpha-channel click detection | {viewportInfo.w}x{viewportInfo.h} viewport
        </div>
        {clicked && (
          <div style={{
            marginTop: 8,
            color: '#4CAF50',
            fontWeight: 600,
          }}>
            Clicked at ({clicked.x}, {clicked.y})
          </div>
        )}
      </div>

      {/* Back link */}
      <a
        href="/dashboard"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: '#6B6560',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          padding: '6px 12px',
          border: '1px solid rgba(107,101,96,0.3)',
          borderRadius: 4,
          transition: 'all 200ms',
          zIndex: 10,
        }}
        onMouseEnter={e => {
          e.target.style.color = '#E8E3DC'
          e.target.style.borderColor = 'rgba(232,227,220,0.3)'
        }}
        onMouseLeave={e => {
          e.target.style.color = '#6B6560'
          e.target.style.borderColor = 'rgba(107,101,96,0.3)'
        }}
      >
        Back to Dashboard
      </a>
    </div>
  )
}

// Inject click ripple animation
if (typeof document !== 'undefined') {
  const styleId = 'elon-room-canvas-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes clickRipple {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }
}
