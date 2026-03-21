// FloatingActionButton.jsx
// Single persistent FAB anchored bottom-LEFT above the HUD (where mini-map used to be).
// Expands upward to reveal action options with staggered fade-in.
// Matches day/night theme. Always above HUD (z:40) -- this sits at z:55.

import { useState, useEffect, useRef } from 'react'

const OPTIONS = [
  { id: 'new-project', label: 'New Project', icon: '▣' },
  { id: 'new-agent',   label: 'New Agent',   icon: '◎' },
]

// Bottom offset for FAB: sits 16px above the HUD bottom bar (~56px tall) plus margin
const FAB_BOTTOM = 64 // px -- sits just above HUD, inside game window area
const FAB_LEFT   = 16 // px -- bottom-left (where mini-map used to be)
const FAB_SIZE   = 56 // px -- main button diameter
const OPTION_H   = 40 // px -- each option row height
const OPTION_GAP = 8  // px -- gap between options

export default function FloatingActionButton({ isNightMode, isMobile }) {
  const [open, setOpen] = useState(false)
  const fabRef = useRef(null)

  // Dismiss on outside click / touch
  useEffect(() => {
    if (!open) return
    const dismiss = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', dismiss, true)
    document.addEventListener('touchstart', dismiss, true)
    return () => {
      document.removeEventListener('mousedown', dismiss, true)
      document.removeEventListener('touchstart', dismiss, true)
    }
  }, [open])

  const handleAction = (id) => {
    setOpen(false)
    if (id === 'new-project') alert('New Project coming soon')
    if (id === 'new-agent')   alert('New Agent coming soon')
  }

  // Theme tokens
  const glowColor  = isNightMode ? '120,80,255'  : '59,130,246'
  const bgMain     = isNightMode
    ? 'radial-gradient(circle at 40% 35%, rgba(100,60,220,0.95), rgba(30,20,80,0.98))'
    : 'radial-gradient(circle at 40% 35%, rgba(59,130,246,0.95), rgba(15,27,60,0.98))'
  const optionBg   = isNightMode ? 'rgba(20,12,50,0.96)' : 'rgba(10,20,50,0.96)'
  const optionBorder = isNightMode ? 'rgba(120,80,255,0.35)' : 'rgba(59,130,246,0.35)'

  return (
    <div
      ref={fabRef}
      style={{
        position: 'fixed',
        bottom: FAB_BOTTOM,
        left: FAB_LEFT,
        zIndex: 55,
        display: 'flex',
        flexDirection: 'column-reverse', // stack grows upward
        alignItems: 'center',
        gap: OPTION_GAP,
        pointerEvents: 'auto',
      }}
    >
      {/* Option buttons -- render first (column-reverse means they appear above FAB) */}
      {OPTIONS.map((opt, i) => (
        <div
          key={opt.id}
          onClick={() => handleAction(opt.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: OPTION_H,
            padding: '0 16px 0 12px',
            background: optionBg,
            border: `1.5px solid ${optionBorder}`,
            borderRadius: OPTION_H / 2,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(20px)',
            boxShadow: `0 4px 16px rgba(${glowColor},0.25), 0 0 0 1px rgba(${glowColor},0.1)`,
            // Staggered fade-in
            opacity: open ? 1 : 0,
            transform: open
              ? 'translateY(0) scale(1)'
              : 'translateY(12px) scale(0.92)',
            transition: open
              ? `opacity 180ms ease ${i * 55}ms, transform 220ms cubic-bezier(0.34,1.56,0.64,1) ${i * 55}ms`
              : `opacity 120ms ease ${(OPTIONS.length - 1 - i) * 40}ms, transform 150ms ease ${(OPTIONS.length - 1 - i) * 40}ms`,
            pointerEvents: open ? 'auto' : 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isNightMode
              ? 'rgba(120,80,255,0.18)'
              : 'rgba(59,130,246,0.18)'
            e.currentTarget.style.borderColor = isNightMode
              ? 'rgba(120,80,255,0.6)'
              : 'rgba(59,130,246,0.6)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = optionBg
            e.currentTarget.style.borderColor = optionBorder
          }}
        >
          <span style={{
            fontSize: 14,
            lineHeight: 1,
            filter: `drop-shadow(0 0 4px rgba(${glowColor},0.6))`,
          }}>
            {opt.icon}
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Inter Tight', 'Inter', sans-serif",
            letterSpacing: '0.06em',
            color: isNightMode ? 'rgba(200,180,255,0.9)' : 'rgba(180,210,255,0.9)',
            userSelect: 'none',
          }}>
            {opt.label}
          </span>
        </div>
      ))}

      {/* Main FAB button */}
      <button
        aria-label={open ? 'Close actions' : 'Open actions'}
        onClick={() => setOpen(v => !v)}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: bgMain,
          boxShadow: open
            ? `0 0 0 3px rgba(${glowColor},0.5), 0 6px 28px rgba(${glowColor},0.55), 0 0 50px rgba(${glowColor},0.25)`
            : `0 0 0 1.5px rgba(${glowColor},0.4), 0 4px 20px rgba(${glowColor},0.4), 0 0 30px rgba(${glowColor},0.15)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'box-shadow 250ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
          transform: open ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)',
          outline: 'none',
          position: 'relative',
          overflow: 'visible',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.boxShadow = `0 0 0 2px rgba(${glowColor},0.55), 0 6px 28px rgba(${glowColor},0.55), 0 0 40px rgba(${glowColor},0.22)`
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.boxShadow = `0 0 0 1.5px rgba(${glowColor},0.4), 0 4px 20px rgba(${glowColor},0.4), 0 0 30px rgba(${glowColor},0.15)`
          }
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

      {/* Keyframes injected once */}
      <style>{`
        @keyframes fabRingPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(1.18); }
        }
      `}</style>
    </div>
  )
}
