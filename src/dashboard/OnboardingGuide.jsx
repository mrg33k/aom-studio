import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase.js'

// ---- ONBOARDING GUIDE v5 -----------------------------------------------
// v5: workspace name personalization + ghost office preview + keyboard nav.
// - Step 3 heading uses workspace name: "Your first room is ready, [Name]."
// - Step 4 heading: "[Name] is live."
// - Room card label uses workspace name (captured at step transition)
// - Ghost rooms appear on step 3+: 3 faint hexes hint at team expansion
// - Space/Enter advances non-input steps
// - Exit animation: scale out (1.0 -> 1.06) + fade for a more cinematic feel
// v4: typewriter text effect. Elon "talks" to you.
// - Typing indicator (bouncing dots) shows ~430ms before each step's text
// - Heading streams in at 13ms/char, then body at 22ms/char
// - Orange blinking cursor while typing
// - Click anywhere in the bubble to skip to full text instantly
// v3: dynamic button text on agent step; landing impact ring; Supabase save.
// v2: solid dark bg + room springs in from above.
// v1: backdrop-filter blur + 4-step flow.
// Marks complete via localStorage('corner_onboarded').
// -------------------------------------------------------------------------

const ORANGE = '#E85D26'
const BG = '#060A13'

const STEPS = [
  {
    id: 'welcome',
    sprite: 'speaking',
    heading: 'Hey. Welcome to Corner.',
    body: "I'm Elon. I keep things running around here.\nLet me get your office set up.",
    primary: "Let's go",
    showSkip: true,
  },
  {
    id: 'name',
    sprite: 'thinking',
    heading: 'What should we call your workspace?',
 body: "Your company, your team, whatever fits.\nYou can change this later.",
    primary: 'Got it',
    input: true,
    placeholder: 'e.g. Acme Corp, AOM Studio...',
  },
  {
    id: 'agent',
    sprite: 'working',
    // heading resolved dynamically from workspaceName at step transition
    heading: 'Your first room is ready.',
    body: "Agents live in rooms. Tap a room to chat,\nassign tasks, and get work done.",
    primaryBefore: 'Place my first room',
    primaryAfter: 'Continue',
    showDropIn: true,
  },
  {
    id: 'done',
    sprite: 'done',
    // heading resolved dynamically from workspaceName at step transition
    heading: "Your office is live.",
    body: "Elon's on standby. Tap any room to start.\nThe team is ready when you are.",
    primary: 'Enter Corner',
  },
]

// ---- Hex grid background ---------------------------------------------------
const SPOTLIGHT = { cx: 50, cy: 28, size: 88 } // % of screen

const AMBIENT_HEXES = [
  { cx: 8,  cy: 18, size: 56, delay: 0.0  },
  { cx: 24, cy: 9,  size: 48, delay: 0.07 },
  { cx: 40, cy: 14, size: 64, delay: 0.13 },
  { cx: 60, cy: 14, size: 64, delay: 0.19 },
  { cx: 76, cy: 9,  size: 48, delay: 0.07 },
  { cx: 92, cy: 18, size: 56, delay: 0.0  },
  { cx: 6,  cy: 52, size: 60, delay: 0.09 },
  { cx: 20, cy: 66, size: 52, delay: 0.15 },
  { cx: 36, cy: 74, size: 68, delay: 0.05 },
  { cx: 64, cy: 74, size: 68, delay: 0.11 },
  { cx: 80, cy: 66, size: 52, delay: 0.17 },
  { cx: 94, cy: 52, size: 60, delay: 0.03 },
  { cx: 13, cy: 38, size: 54, delay: 0.21 },
  { cx: 87, cy: 38, size: 54, delay: 0.23 },
]

// Ghost room placeholders -- hint at the team that's coming
// Appear on the agent + done steps to show "there's more space here"
const GHOST_ROOMS = [
  { cx: 22, cy: 42, size: 76, delay: 0.15, label: '···' },
  { cx: 78, cy: 42, size: 76, delay: 0.28, label: '···' },
  { cx: 50, cy: 60, size: 72, delay: 0.40, label: '···' },
]

const HEX_CLIP = 'polygon(50% 0%, 99% 25%, 99% 75%, 50% 100%, 1% 75%, 1% 25%)'

function HexGrid({ roomPlaced, showGhosts }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* ambient */}
      {AMBIENT_HEXES.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.042, scale: 1 }}
          transition={{ delay: h.delay + 0.25, duration: 0.9, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: `${h.cx}%`,
            top: `${h.cy}%`,
            transform: 'translate(-50%, -50%)',
            width: h.size,
            height: h.size,
            border: '1px solid rgba(255,255,255,0.9)',
            clipPath: HEX_CLIP,
          }}
        />
      ))}

      {/* ghost rooms -- hint at future agents */}
      <AnimatePresence>
        {showGhosts && GHOST_ROOMS.map((g, i) => (
          <motion.div
            key={`ghost-${i}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ delay: g.delay, duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${g.cx}%`,
              top: `${g.cy}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                width: g.size,
                height: g.size,
                clipPath: HEX_CLIP,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.015)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11, letterSpacing: '0.1em' }}>
                {g.label}
              </span>
            </div>
            <div style={{ width: 28, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* spotlight hex -- destination for first room */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: roomPlaced ? 0.0 : 0.28 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'absolute',
          left: `${SPOTLIGHT.cx}%`,
          top: `${SPOTLIGHT.cy}%`,
          transform: 'translate(-50%, -50%)',
          width: SPOTLIGHT.size,
          height: SPOTLIGHT.size,
          border: `1.5px solid ${ORANGE}`,
          clipPath: HEX_CLIP,
        }}
      />

      {/* spotlight hex pulse ring -- only when empty */}
      <AnimatePresence>
        {!roomPlaced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            style={{
              position: 'absolute',
              left: `${SPOTLIGHT.cx}%`,
              top: `${SPOTLIGHT.cy}%`,
              transform: 'translate(-50%, -50%)',
              width: SPOTLIGHT.size + 24,
              height: SPOTLIGHT.size + 24,
              border: `1px solid ${ORANGE}`,
              clipPath: HEX_CLIP,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* landing impact ring -- fires once when room is placed */}
      <AnimatePresence>
        {roomPlaced && (
          <motion.div
            key="impact"
            initial={{ opacity: 0.7, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.7 }}
            exit={{}}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: `${SPOTLIGHT.cx}%`,
              top: `${SPOTLIGHT.cy}%`,
              transform: 'translate(-50%, -50%)',
              width: SPOTLIGHT.size,
              height: SPOTLIGHT.size,
              border: `2px solid ${ORANGE}`,
              clipPath: HEX_CLIP,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Ambient floating particles -------------------------------------------
function Particles() {
  const pts = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 67 % 92) + 4,
    y: (i * 53 % 86) + 7,
    r: 1.5 + (i % 3) * 0.5,
    delay: i * 0.18,
    dur: 4 + (i % 5),
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {pts.map((p, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0, 0.09, 0], y: [0, -7, 0] }}
          transition={{ delay: p.delay, duration: p.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r * 2,
            height: p.r * 2,
            borderRadius: '50%',
            background: 'rgba(59,130,246,0.35)',
          }}
        />
      ))}
    </div>
  )
}

// ---- Room card that falls into the spotlight hex ----------------------------
function DroppedRoom({ placed, roomLabel }) {
  return (
    <AnimatePresence>
      {placed && (
        <motion.div
          key="room"
          initial={{ y: -180, opacity: 0, scale: 0.65, rotate: -8 }}
          animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
          exit={{ y: -180, opacity: 0, scale: 0.65 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
          style={{
            position: 'absolute',
            left: `${SPOTLIGHT.cx}%`,
            top: `${SPOTLIGHT.cy}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            pointerEvents: 'none',
          }}
        >
          {/* Hex room */}
          <div
            style={{
              width: SPOTLIGHT.size,
              height: SPOTLIGHT.size,
              clipPath: HEX_CLIP,
              background: 'rgba(232,93,38,0.13)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              position: 'relative',
            }}
          >
            {/* hex border overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: HEX_CLIP,
                border: `2px solid rgba(232,93,38,0.5)`,
                boxSizing: 'border-box',
              }}
            />
            <img
              src="/corner/sprites/elon-idle.png"
              alt="Elon"
              style={{ width: 44, height: 44, imageRendering: 'pixelated', position: 'relative', zIndex: 1 }}
            />
          </div>

          {/* Room label */}
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textAlign: 'center', maxWidth: 110 }}>
            {roomLabel}
          </div>

          {/* Live dot */}
          <motion.div
            animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 10px #4ade80',
              marginTop: -2,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---- Typing indicator (bouncing dots) ------------------------------------
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 22, padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0], opacity: [0.22, 0.7, 0.22] }}
          transition={{ duration: 0.72, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)',
          }}
        />
      ))}
    </div>
  )
}

// ---- Blinking cursor while typing ----------------------------------------
function BlinkCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.52, repeat: Infinity, repeatType: 'reverse' }}
      style={{
        display: 'inline-block',
        width: 2,
        height: '0.85em',
        background: ORANGE,
        marginLeft: 2,
        verticalAlign: 'middle',
        borderRadius: 1,
      }}
    />
  )
}

// ---- SpeechContent: managed typewriter animation -------------------------
// Phases: 'indicator' -> 'heading' -> 'body' -> 'done'
// Click anywhere to skip to full text.
const HEADING_SPEED = 13  // ms / char
const BODY_SPEED    = 22  // ms / char
const INDICATOR_MS  = 420 // dots show this long before text starts
const HEAD_BODY_GAP = 120 // pause between heading done + body start

function SpeechContent({ heading, body }) {
  const [dispH, setDispH] = useState('')
  const [dispB, setDispB] = useState('')
  const [phase, setPhase] = useState('indicator')
  const skipRef = useRef(false)
  const timersRef = useRef([])

  const clearAll = () => {
    timersRef.current.forEach(id => clearTimeout(id))
    timersRef.current = []
  }

  const skip = () => {
    if (skipRef.current) return
    skipRef.current = true
    clearAll()
    setDispH(heading)
    setDispB(body)
    setPhase('done')
  }

  useEffect(() => {
    skipRef.current = false
    setDispH('')
    setDispB('')
    setPhase('indicator')
    timersRef.current = []

    let hIdx = 0
    let bIdx = 0

    const typeBody = () => {
      setPhase('body')
      const tick = () => {
        if (skipRef.current) return
        bIdx++
        setDispB(body.slice(0, bIdx))
        if (bIdx < body.length) {
          const t = setTimeout(tick, BODY_SPEED)
          timersRef.current.push(t)
        } else {
          setPhase('done')
        }
      }
      tick()
    }

    const typeHeading = () => {
      setPhase('heading')
      const tick = () => {
        if (skipRef.current) return
        hIdx++
        setDispH(heading.slice(0, hIdx))
        if (hIdx < heading.length) {
          const t = setTimeout(tick, HEADING_SPEED)
          timersRef.current.push(t)
        } else {
          const t = setTimeout(typeBody, HEAD_BODY_GAP)
          timersRef.current.push(t)
        }
      }
      tick()
    }

    const t0 = setTimeout(typeHeading, INDICATOR_MS)
    timersRef.current.push(t0)

    return clearAll
  }, [heading, body]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onClick={skip}
      style={{ cursor: phase !== 'done' ? 'pointer' : 'default', minHeight: 82 }}
    >
      {phase === 'indicator' ? (
        <TypingIndicator />
      ) : (
        <>
          <h2
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
              marginBottom: (phase === 'body' || phase === 'done') ? 8 : 0,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {dispH}
            {phase === 'heading' && <BlinkCursor />}
          </h2>

          {(phase === 'body' || phase === 'done') && dispB && (
            <p
              style={{
                color: 'rgba(255,255,255,0.48)',
                fontSize: 14,
                margin: 0,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}
            >
              {dispB}
              {phase === 'body' && <BlinkCursor />}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ---- Main component --------------------------------------------------------
export default function OnboardingGuide({ onComplete }) {
  const [step, setStep] = useState(0)
  const [workspaceName, setWorkspaceName] = useState('')
  const [exiting, setExiting] = useState(false)
  const [roomPlaced, setRoomPlaced] = useState(false)
  // true once the spring animation has settled (~650ms after roomPlaced)
  const [roomLanded, setRoomLanded] = useState(false)
  // resolved heading/roomLabel -- captured at step transition so workspace name
  // is frozen in at the moment the user moves forward (not reactive to typing)
  const [resolvedHeading, setResolvedHeading] = useState(STEPS[0].heading)
  const [resolvedRoomLabel, setResolvedRoomLabel] = useState("Elon's Office")
  const inputRef = useRef(null)
  const current = STEPS[step]
  const isAgentStep = current.id === 'agent'
  const isDoneStep = current.id === 'done'
  const showGhosts = isAgentStep || isDoneStep

  // Compute resolved heading when step changes (captures workspace name at that moment)
  useEffect(() => {
    const name = workspaceName.trim()
    if (current.id === 'agent') {
      setResolvedHeading(name ? `Your first room is ready, ${name}.` : 'Your first room is ready.')
      setResolvedRoomLabel(name || "Elon's Office")
    } else if (current.id === 'done') {
      setResolvedHeading(name ? `${name} is live.` : "Your office is live.")
    } else {
      setResolvedHeading(current.heading)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus name input when landing on step 1 -- delay lets bubble animate in
  useEffect(() => {
    if (current.input) {
      const t = setTimeout(() => inputRef.current?.focus(), 380)
      return () => clearTimeout(t)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drop the room in with a small delay after entering the agent step
  useEffect(() => {
    if (isAgentStep) {
      const t1 = setTimeout(() => setRoomPlaced(true), 550)
      // Button text switches after spring settles (~spring duration ~650ms)
      const t2 = setTimeout(() => setRoomLanded(true), 1300)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    } else {
      setRoomPlaced(false)
      setRoomLanded(false)
    }
  }, [isAgentStep])

  const dismiss = () => {
    setExiting(true)
    setTimeout(onComplete, 580)
  }

  const handlePrimary = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      const name = workspaceName.trim()
      if (name) localStorage.setItem('corner_workspace_name', name)
      localStorage.setItem('corner_onboarded', '1')
      // Persist workspace name to Supabase auth metadata if authenticated
      if (name && supabase) {
        supabase.auth.updateUser({ data: { workspace_name: name } }).catch(() => {})
      }
      dismiss()
    }
  }, [step, workspaceName]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = () => {
    localStorage.setItem('corner_onboarded', '1')
    dismiss()
  }

  // Keyboard navigation: Space/Enter advances non-input steps
  useEffect(() => {
    if (current.input) return // let the input handle its own Enter
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handlePrimary()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current.input, handlePrimary])

  // Resolve button label: agent step shows contextual text based on landing state
  const primaryLabel = isAgentStep
    ? (roomLanded ? current.primaryAfter : current.primaryBefore)
    : current.primary

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.06 : 1 }}
      transition={{ duration: 0.52, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}
    >
      {/* Environment layer */}
      <HexGrid roomPlaced={roomPlaced} showGhosts={showGhosts} />
      <Particles />

      {/* Radial center glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          transform: 'translate(-50%, -50%)',
          width: 540,
          height: 540,
          background: 'radial-gradient(circle, rgba(232,93,38,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Room card -- lands in spotlight hex on step 2 */}
      <DroppedRoom placed={roomPlaced} roomLabel={resolvedRoomLabel} />

      {/* Content column -- Elon + speech bubble + CTA */}
      <motion.div
        animate={{ y: isAgentStep ? 60 : 0 }}
        transition={{ duration: 0.38, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 374,
          padding: '0 18px',
        }}
      >
        {/* Elon sprite */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.sprite}
            initial={{ opacity: 0, scale: 0.74, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.86, y: -10 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <motion.img
              src={`/corner/sprites/elon-${current.sprite}.png`}
              alt="Elon"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
              style={{
                width: 106,
                height: 106,
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 10px 30px rgba(232,93,38,0.48))',
                display: 'block',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Bubble pointer */}
        <div
          style={{
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid rgba(255,255,255,0.055)',
            marginTop: 3,
          }}
        />

        {/* Speech bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 11, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.038)',
              border: '1px solid rgba(255,255,255,0.085)',
              borderRadius: 14,
              padding: '22px 24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.055)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            {/* Typewriter speech content -- uses resolved heading (frozen at step transition) */}
            <SpeechContent heading={resolvedHeading} body={current.body} />

            {/* Workspace name input */}
            {current.input && (
              <input
                ref={inputRef}
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePrimary()}
                placeholder={current.placeholder}
                autoComplete="off"
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 16,
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.11)',
                  borderRadius: 9,
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(232,93,38,0.5)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.11)' }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            marginTop: 16,
            width: '100%',
          }}
        >
          <motion.button
            onClick={handlePrimary}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgba(232,93,38,0.58)' }}
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
              boxShadow: '0 4px 22px rgba(232,93,38,0.38)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={primaryLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'block' }}
              >
                {primaryLabel}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {current.showSkip && (
            <button
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.22)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 8px',
                letterSpacing: '-0.01em',
              }}
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === step ? 22 : 6,
                background: i === step ? ORANGE : i < step ? 'rgba(232,93,38,0.35)' : 'rgba(255,255,255,0.14)',
              }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </div>

        {/* Keyboard hint -- subtle, non-intrusive */}
        {!current.input && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em' }}
          >
            press space to continue
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}