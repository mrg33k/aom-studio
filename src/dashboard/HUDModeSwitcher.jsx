// HUD Mode Switcher - Game-style polish
// Bobby2: Drop-in replacement for ModeSwitcher in GameDashboard.jsx
// Import and swap when ready: import { HUDModeSwitcher } from './HUDModeSwitcher.jsx'
//
// Changes from original:
// - Blue palette (matches HUD spec, not amber #E85D26)
// - Keyboard shortcuts ALWAYS visible (not just hover)
// - Active mode has animated underline with spring bounce
// - Crossy Road spring physics on all interactions
// - Font sizes bumped (14px -> 16px, shortcut 10px -> 12px)
// - Game-style active glow behind selected mode

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, ListTodo, LayoutDashboard } from 'lucide-react'

const MODES = {
  game: { id: 'game', label: 'GAME', icon: Map, key: '1' },
  checklist: { id: 'checklist', label: 'CHECKLIST', icon: ListTodo, key: '2' },
  megaboard: { id: 'megaboard', label: 'MEGABOARD', icon: LayoutDashboard, key: '3' },
}

const ACCENT = '#3B9EFF'       // Blue accent (matches HUD)
const ACCENT_GLOW = 'rgba(59, 158, 255, 0.25)'
const TEXT_ACTIVE = '#EDF2FA'
const TEXT_HOVER = '#8BA4C4'
const TEXT_IDLE = '#4A6080'

export function HUDModeSwitcher({ currentMode, onModeSwitch, isMobile }) {
  const [hoveredMode, setHoveredMode] = useState(null)
  const containerRef = useRef(null)
  const modeList = [MODES.game, MODES.checklist, MODES.megaboard]

  if (isMobile) return null

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 2,
        position: 'relative', height: 52,
        background: 'rgba(100, 180, 255, 0.03)',
        borderRadius: 14,
        padding: '0 4px',
        border: '1.5px solid rgba(100, 180, 255, 0.08)',
      }}
    >
      {modeList.map(mode => {
        const active = currentMode === mode.id
        const Icon = mode.icon
        const isHovered = hoveredMode === mode.id

        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeSwitch(mode.id)}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            whileHover={{
              y: -3,
              transition: { type: 'spring', stiffness: 500, damping: 12 }
            }}
            whileTap={{
              scale: 0.88, y: 3,
              transition: { type: 'spring', stiffness: 600, damping: 18 }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 20px', height: 44,
              background: active
                ? `linear-gradient(180deg, rgba(59,158,255,0.15) 0%, rgba(59,158,255,0.05) 100%)`
                : 'none',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              color: active ? TEXT_ACTIVE : isHovered ? TEXT_HOVER : TEXT_IDLE,
              fontFamily: "'Inter Tight', 'Space Grotesk', sans-serif",
              fontSize: 16,
              fontWeight: active ? 800 : 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'color 150ms ease, background 200ms ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Active mode glow effect */}
            {active && (
              <motion.div
                layoutId="mode-glow"
                style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(180deg, ${ACCENT_GLOW} 0%, transparent 100%)`,
                  borderRadius: 10,
                  pointerEvents: 'none',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}

            {/* Active indicator bar at bottom */}
            {active && (
              <motion.div
                layoutId="mode-indicator"
                style={{
                  position: 'absolute', bottom: 0, left: 8, right: 8,
                  height: 3, borderRadius: 2,
                  background: ACCENT,
                  boxShadow: `0 0 10px ${ACCENT_GLOW}`,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              />
            )}

            <Icon
              size={18}
              style={{
                color: active ? ACCENT : 'inherit',
                position: 'relative', zIndex: 1,
                filter: active ? `drop-shadow(0 0 4px ${ACCENT_GLOW})` : 'none',
              }}
            />

            <span style={{ position: 'relative', zIndex: 1 }}>
              {mode.label}
            </span>

            {/* Keyboard shortcut hint - ALWAYS visible, not just on hover */}
            <span style={{
              marginLeft: 4,
              background: active ? 'rgba(59,158,255,0.15)' : 'rgba(100,180,255,0.06)',
              border: `1px solid ${active ? 'rgba(59,158,255,0.3)' : 'rgba(100,180,255,0.1)'}`,
              borderRadius: 4, padding: '1px 5px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600, fontSize: 12,
              color: active ? ACCENT : TEXT_IDLE,
              position: 'relative', zIndex: 1,
              lineHeight: 1.3,
              transition: 'all 200ms ease',
            }}>
              {mode.key}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

// Mobile version: bottom tab bar with game-style treatment
export function HUDMobileModeBar({ currentMode, onModeSwitch }) {
  const modeList = [MODES.game, MODES.checklist, MODES.megaboard]

  return (
    <div style={{
      position: 'fixed', bottom: 56, left: 0, right: 0, zIndex: 29,
      height: 48,
      background: 'rgba(8, 16, 32, 0.95)',
      backdropFilter: 'blur(16px)',
      borderTop: '2px solid rgba(100, 180, 255, 0.1)',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {modeList.map(mode => {
        const active = currentMode === mode.id
        const Icon = mode.icon
        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeSwitch(mode.id)}
            whileTap={{ scale: 0.9 }}
            style={{
              flex: 1, height: 48,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? ACCENT : TEXT_IDLE,
              minWidth: 48, minHeight: 48,
              position: 'relative',
            }}
          >
            <Icon size={20} />
            <span style={{
              fontSize: 10, fontWeight: active ? 800 : 600,
              fontFamily: "'Inter Tight', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {mode.label}
            </span>

            {/* Active dot indicator */}
            {active && (
              <motion.div
                layoutId="mobile-mode-dot"
                style={{
                  position: 'absolute', bottom: 4,
                  width: 6, height: 6, borderRadius: '50%',
                  background: ACCENT,
                  boxShadow: `0 0 8px ${ACCENT_GLOW}`,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
