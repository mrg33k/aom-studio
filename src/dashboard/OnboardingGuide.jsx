import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ---- ONBOARDING GUIDE ---------------------------------------------------
// Shows on first visit to Corner. Overlays the game with a dark/blur layer.
// Elon walks the user through 4 steps: Welcome > Name > Agent > Done.
// Marks complete via localStorage('corner_onboarded').
// Works with or without Supabase. No backend changes required.
// -------------------------------------------------------------------------

const ORANGE = '#E85D26'

const STEPS = [
  {
    id: 'welcome',
    sprite: 'speaking',
    heading: 'Hey. Welcome to Corner.',
    body: "I'm Elon. I keep things running.\nLet me show you around real quick.",
    primary: "Let's go",
    showSkip: true,
  },
  {
    id: 'name',
    sprite: 'thinking',
    heading: 'What should we call your workspace?',
    body: "Your company name, team name — whatever fits.\nYou can change this later.",
    primary: 'Next',
    input: true,
    placeholder: 'e.g. Acme Corp, AOM Studio...',
  },
  {
    id: 'agent',
    sprite: 'working',
    heading: 'Your first agent is ready.',
    body: "Agents live in rooms. Rooms live in your office.\nClick a room to chat, assign tasks, and get work done.",
    primary: 'Add my first agent',
    showRoom: true,
  },
  {
    id: 'done',
    sprite: 'done',
    heading: "You're in.",
    body: "Your office is set up.\nThe team is ready. Let's get to work.",
    primary: 'Open my office',
  },
]

// Faint hex outlines scattered in the background -- hint at the grid
function HexGridHints({ activeStep }) {
  const positions = [
    { x: '12%', y: '22%', delay: 0.0 },
    { x: '28%', y: '12%', delay: 0.08 },
    { x: '48%', y: '18%', delay: 0.16 },
    { x: '68%', y: '12%', delay: 0.24 },
    { x: '84%', y: '22%', delay: 0.10 },
    { x: '14%', y: '64%', delay: 0.20 },
    { x: '32%', y: '74%', delay: 0.05 },
    { x: '52%', y: '68%', delay: 0.28 },
    { x: '72%', y: '74%', delay: 0.12 },
    { x: '86%', y: '62%', delay: 0.18 },
  ]

  // On "agent" step, one hex glows orange
  const glowIdx = activeStep >= 2 ? 4 : -1

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: i === glowIdx ? 0.45 : 0.07,
            scale: 1,
          }}
          transition={{ delay: pos.delay + 0.2, duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -50%)',
            width: 72,
            height: 72,
            border: `1.5px solid ${i === glowIdx ? ORANGE : 'rgba(255,255,255,0.5)'}`,
            clipPath: 'polygon(50% 0%, 99% 25%, 99% 75%, 50% 100%, 1% 75%, 1% 25%)',
            boxShadow: i === glowIdx ? `0 0 24px rgba(232,93,38,0.5), inset 0 0 16px rgba(232,93,38,0.15)` : 'none',
            transition: 'border-color 0.4s, box-shadow 0.4s',
          }}
        />
      ))}
    </div>
  )
}

// Floating ambient particle dots in the background
function AmbientDots() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    x: `${8 + (i * 91 % 84)}%`,
    y: `${10 + (i * 73 % 80)}%`,
    size: 2 + (i % 3),
    delay: i * 0.15,
    dur: 3 + (i % 4),
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {dots.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.04, 0.12, 0.04] }}
          transition={{ delay: d.delay, duration: d.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: d.x, top: d.y,
            width: d.size, height: d.size,
            borderRadius: '50%',
            background: '#fff',
          }}
        />
      ))}
    </div>
  )
}

// Room preview card shown on the "agent" step
function RoomPreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.4, type: 'spring', bounce: 0.35 }}
      style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'rgba(232,93,38,0.08)',
        border: '1px solid rgba(232,93,38,0.3)',
        borderRadius: 10,
        boxShadow: '0 0 20px rgba(232,93,38,0.12)',
      }}
    >
      <img
        src="/corner/sprites/elon-idle.png"
        alt=""
        style={{ width: 40, height: 40, imageRendering: 'pixelated' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          Elon's Office
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
          System orchestrator
        </div>
      </div>
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 8px #4ade80',
        }}
      />
    </motion.div>
  )
}

export default function OnboardingGuide({ onComplete }) {
  const [step, setStep] = useState(0)
  const [workspaceName, setWorkspaceName] = useState('')
  const [exiting, setExiting] = useState(false)
  const inputRef = useRef(null)
  const current = STEPS[step]

  // Auto-focus name input when we land on step 1
  useEffect(() => {
    if (current.input) {
      const timer = setTimeout(() => inputRef.current?.focus(), 350)
      return () => clearTimeout(timer)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setExiting(true)
    setTimeout(onComplete, 550)
  }

  const handlePrimary = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      if (workspaceName.trim()) {
        localStorage.setItem('corner_workspace_name', workspaceName.trim())
      }
      localStorage.setItem('corner_onboarded', '1')
      dismiss()
    }
  }

  const handleSkip = () => {
    localStorage.setItem('corner_onboarded', '1')
    dismiss()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && current.input) {
      handlePrimary()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Backdrop: blurs and darkens the office behind */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(12px) brightness(0.14) saturate(0.4)',
          WebkitBackdropFilter: 'blur(12px) brightness(0.14) saturate(0.4)',
          background: 'rgba(8, 11, 22, 0.72)',
        }}
      />

      {/* Ambient atmosphere */}
      <AmbientDots />
      <HexGridHints activeStep={step} />

      {/* Radial glow behind content */}
      <div
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(232,93,38,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main content column */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          padding: '0 16px',
          width: '100%',
          maxWidth: 400,
        }}
      >
        {/* Elon sprite */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.sprite}
            initial={{ scale: 0.75, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: 'relative' }}
          >
            <motion.img
              src={`/corner/sprites/elon-${current.sprite}.png`}
              alt="Elon"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
              style={{
                width: 112,
                height: 112,
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 10px 28px rgba(232,93,38,0.45))',
                display: 'block',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Bubble pointer triangle */}
        <div
          style={{
            width: 0, height: 0,
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderBottom: '9px solid rgba(255,255,255,0.07)',
            marginTop: 2,
          }}
        />

        {/* Speech bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: 16,
              padding: '24px 26px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <h2
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                marginBottom: 10,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {current.heading}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 14,
                margin: 0,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}
            >
              {current.body}
            </p>

            {/* Workspace name input */}
            {current.input && (
              <input
                ref={inputRef}
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={current.placeholder}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 18,
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 9,
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(232,93,38,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.14)' }}
              />
            )}

            {/* First room preview card */}
            {current.showRoom && <RoomPreviewCard />}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            marginTop: 20,
            width: '100%',
          }}
        >
          <motion.button
            onClick={handlePrimary}
            whileHover={{ scale: 1.04, boxShadow: '0 6px 28px rgba(232,93,38,0.55)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%',
              background: ORANGE,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '13px 0',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px rgba(232,93,38,0.38)',
              transition: 'box-shadow 0.2s',
            }}
          >
            {current.primary}
          </motion.button>

          {current.showSkip && (
            <button
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.28)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 8px',
                letterSpacing: '-0.01em',
              }}
            >
              Skip tour
            </button>
          )}
        </div>

        {/* Step progress dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 22 : 6,
                background: i === step ? ORANGE : 'rgba(255,255,255,0.16)',
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                height: 6,
                borderRadius: 3,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
