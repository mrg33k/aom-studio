/**
 * CharacterAnimations.jsx
 * Bobby3: Character movement and animation system for Corner dashboard.
 *
 * Tasks implemented:
 *   1. Hop movement (sprite-based 3-frame cycle, 200ms)
 *   2. Idle bounce (sine wave Y oscillation, per-agent offset)
 *   3. State transitions (hop + sprite swap at peak + scale pulse)
 *   4. Speaking animation (faster bounce + speech bubble with spring)
 *   5. Celebration (high jump + confetti + gold glow)
 *
 * Design DNA: Crossy Road. Characters BOUNCE and HOP. Nothing is static.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ---- CONSTANTS ---------------------------------------------------------------

const SPRITE_AGENTS = [
  'patrik','mom','alex','steve','steffen','bobby','colton',
  'cleo','tony','jacob','elmo','elon','pixel'
]

const HOP_FRAME_DURATION = 66 // ms per frame
const HOP_TOTAL_DURATION = 200 // ms total (3 frames)

const IDLE_BOUNCE_AMPLITUDE = 2.5 // px
const IDLE_BOUNCE_PERIOD = 2000 // ms
const WORKING_BOUNCE_PERIOD = 600 // ms (faster for working)
const SPEAKING_BOUNCE_PERIOD = 800 // ms

const CELEBRATION_JUMP_HEIGHT = 18 // px (3x normal hop)
const CELEBRATION_DURATION = 800 // ms

// Agent signature colors for glow effects
const AGENT_COLORS = {
  patrik: '#FFA726', mom: '#E85D26', alex: '#3B82F6', steve: '#0891B2',
  steffen: '#FFB74D', bobby: '#9C27B0', colton: '#5C6BC0', cleo: '#FF7043',
  tony: '#EC407A', jacob: '#8BC34A', elmo: '#EF4444', elon: '#4CAF50',
  pixel: '#00BCD4',
}

// DEPRECATED(engine-swap): DIRECTION SUPPORT -- Was: CSS-based left/right sprite flip. REPLACED BY TODO(engine): SPRITE LAYER COMPOSITING (engine handles sprite flip/rotation natively). Council decision 2026-03-17. Do not build in React/CSS.
// TODO(engine): 2D ENGINE -- SPRITE LAYER COMPOSITING -- Characters must render as engine-managed sprites with z-index layering. Each agent = sprite actor with idle/walk/work animation states. Engine handles draw order, occlusion, and direction flipping. Replace current CSS-animated div overlays with engine sprite nodes. Ref: Council engine-swap directive.

// ---- SPRITE STATE MAPPING (mirrors GameDashboard) ----------------------------
function getSpriteState(status, isSpeaking) {
  if (isSpeaking) return 'speaking'
  switch (status) {
    case 'WORKING':  return 'working'
    case 'WAITING':  return 'thinking'
    case 'DONE':     return 'done'
    case 'BLOCKED':  return 'idle'
    case 'PAUSED':   return 'idle'
    default:         return 'idle'
  }
}

// ---- RANDOM OFFSET PER AGENT (so they don't sync) ----------------------------
// Deterministic hash based on agent slug so it's stable across renders
function getPhaseOffset(agentSlug) {
  let hash = 0
  for (let i = 0; i < agentSlug.length; i++) {
    hash = ((hash << 5) - hash) + agentSlug.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash % 1000) / 1000 // 0..1
}

// ---- HOP CYCLE (Task 1) -----------------------------------------------------
// Plays the 3-frame hop sprite cycle: ground -> peak -> landing -> ground
// Returns current frame name and transform values

function useHopCycle(agentSlug, trigger) {
  const [hopFrame, setHopFrame] = useState(null) // null = not hopping, 'ground'|'peak'|'landing'
  const [isHopping, setIsHopping] = useState(false)
  const timeoutRef = useRef(null)

  const startHop = useCallback(() => {
    if (isHopping) return
    setIsHopping(true)
    setHopFrame('ground')

    // Frame 0: Ground (66ms)
    timeoutRef.current = setTimeout(() => {
      setHopFrame('peak')
      // Frame 1: Peak (66ms)
      timeoutRef.current = setTimeout(() => {
        setHopFrame('landing')
        // Frame 2: Landing (66ms)
        timeoutRef.current = setTimeout(() => {
          setHopFrame(null)
          setIsHopping(false)
        }, HOP_FRAME_DURATION)
      }, HOP_FRAME_DURATION)
    }, HOP_FRAME_DURATION)
  }, [isHopping])

  // Trigger hop when the trigger value changes
  useEffect(() => {
    if (trigger) startHop()
  }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Return transform values based on current hop frame
  const hopTransform = useMemo(() => {
    switch (hopFrame) {
      case 'ground':
        return { y: 0, scaleX: 1, scaleY: 1, shadowScale: 1, shadowOpacity: 0.35 }
      case 'peak':
        return { y: -14, scaleX: 0.95, scaleY: 1.08, shadowScale: 0.7, shadowOpacity: 0.2 }
      case 'landing':
        return { y: 2, scaleX: 1.1, scaleY: 0.88, shadowScale: 1.2, shadowOpacity: 0.45 }
      default:
        return { y: 0, scaleX: 1, scaleY: 1, shadowScale: 1, shadowOpacity: 0.25 }
    }
  }, [hopFrame])

  const hopSpriteSrc = hopFrame
    ? `/corner/sprites/hop/${agentSlug}-hop-${hopFrame}.png`
    : null

  return { isHopping, hopFrame, hopTransform, hopSpriteSrc, startHop }
}

// ---- IDLE BOUNCE (Task 2) ---------------------------------------------------
// Subtle Y oscillation via sine wave with per-agent phase offset

function useIdleBounce(agentSlug, isActive) {
  const [bounceY, setBounceY] = useState(0)
  const [shadowScale, setShadowScale] = useState(1)
  const rafRef = useRef(null)
  const startTimeRef = useRef(null)
  const phaseOffset = useMemo(() => getPhaseOffset(agentSlug), [agentSlug])

  useEffect(() => {
    if (!isActive) {
      setBounceY(0)
      setShadowScale(1)
      return
    }

    startTimeRef.current = performance.now()

    const animate = (now) => {
      const elapsed = now - startTimeRef.current
      const phase = (elapsed / IDLE_BOUNCE_PERIOD + phaseOffset) * Math.PI * 2
      const y = Math.sin(phase) * IDLE_BOUNCE_AMPLITUDE
      setBounceY(y)
      // Shadow inversely scales with height
      setShadowScale(1 - (y / IDLE_BOUNCE_AMPLITUDE) * 0.15)
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isActive, phaseOffset])

  return { bounceY, shadowScale }
}

// ---- STATE TRANSITION (Task 3) -----------------------------------------------
// Detects status changes, triggers hop, swaps sprite at peak, scale pulse on land

function useStateTransition(agentSlug, status, isSpeaking) {
  const [prevStatus, setPrevStatus] = useState(status)
  const [transitionTrigger, setTransitionTrigger] = useState(0)
  const [spriteOverride, setSpriteOverride] = useState(null)
  const [scalePulse, setScalePulse] = useState(1)
  const prevStatusRef = useRef(status)
  const targetSpriteState = getSpriteState(status, isSpeaking)

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      // Status changed! Trigger a hop transition
      prevStatusRef.current = status
      setPrevStatus(status)
      setTransitionTrigger(t => t + 1)

      // Keep old sprite during hop, swap at peak (66ms in)
      const oldSprite = getSpriteState(prevStatusRef.current, false)
      setSpriteOverride(oldSprite)

      // Swap sprite at hop peak
      setTimeout(() => {
        setSpriteOverride(null) // Use new state sprite
      }, HOP_FRAME_DURATION)

      // Scale pulse on landing
      setTimeout(() => {
        setScalePulse(1.1)
        setTimeout(() => setScalePulse(1), 150)
      }, HOP_FRAME_DURATION * 2)
    }
  }, [status])

  return { transitionTrigger, spriteOverride, scalePulse, targetSpriteState }
}

// ---- SPEAKING ANIMATION (Task 4) --------------------------------------------
// Faster bounce + growing speech bubble with spring physics

function useSpeakingAnimation(isSpeaking) {
  const [bubbleScale, setBubbleScale] = useState(0)
  const [speakBounceY, setSpeakBounceY] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (isSpeaking) {
      startRef.current = performance.now()

      // Spring-grow the bubble: 0 -> overshoot 1.15 -> settle at 1.0
      setBubbleScale(0)
      const springGrow = () => {
        const elapsed = performance.now() - startRef.current
        if (elapsed < 150) {
          setBubbleScale(elapsed / 150 * 1.15) // overshoot
        } else if (elapsed < 300) {
          setBubbleScale(1.15 - (elapsed - 150) / 150 * 0.15) // settle
        } else {
          setBubbleScale(1.0)
        }
      }

      // Animate speaking bounce
      const animate = (now) => {
        const elapsed = now - startRef.current
        springGrow()

        const phase = (elapsed / SPEAKING_BOUNCE_PERIOD) * Math.PI * 2
        const y = Math.sin(phase) * 3 // faster, slightly more amplitude
        setSpeakBounceY(y)
        rafRef.current = requestAnimationFrame(animate)
      }

      rafRef.current = requestAnimationFrame(animate)
    } else {
      // Shrink bubble
      setBubbleScale(0)
      setSpeakBounceY(0)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isSpeaking])

  return { bubbleScale, speakBounceY }
}

// ---- CELEBRATION (Task 5) ---------------------------------------------------
// Big jump + confetti particles + gold glow

function useCelebration(agentSlug) {
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [jumpY, setJumpY] = useState(0)
  const [confettiParticles, setConfettiParticles] = useState([])
  const [glowOpacity, setGlowOpacity] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  const celebrate = useCallback(() => {
    if (isCelebrating) return
    setIsCelebrating(true)
    startRef.current = performance.now()

    // Generate confetti particles
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 60,
      y: -Math.random() * 40 - 10,
      size: 3 + Math.random() * 4,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][i % 6],
      rotation: Math.random() * 360,
      speed: 0.5 + Math.random() * 1.5,
      drift: (Math.random() - 0.5) * 2,
    }))
    setConfettiParticles(particles)

    const animate = (now) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / CELEBRATION_DURATION, 1)

      // Jump arc (parabolic)
      const jumpProgress = progress < 0.4
        ? progress / 0.4 // going up
        : 1 - (progress - 0.4) / 0.6 // coming down
      const jumpArc = Math.sin(jumpProgress * Math.PI)
      setJumpY(-jumpArc * CELEBRATION_JUMP_HEIGHT)

      // Gold glow pulse
      setGlowOpacity(jumpArc * 0.6)

      // Update confetti positions
      setConfettiParticles(prev => prev.map(p => ({
        ...p,
        y: p.y + p.speed * 2,
        x: p.x + p.drift,
        rotation: p.rotation + 5,
      })))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setIsCelebrating(false)
        setJumpY(0)
        setGlowOpacity(0)
        setConfettiParticles([])
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [isCelebrating])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { isCelebrating, jumpY, confettiParticles, glowOpacity, celebrate }
}


// ---- DUST PARTICLES (landing effect) ----------------------------------------
function DustParticles({ active, size }) {
  if (!active) return null
  const particles = [
    { dx: -8, delay: 0 },
    { dx: 8, delay: 30 },
    { dx: -4, delay: 60 },
    { dx: 12, delay: 20 },
  ]
  return (
    <div style={{ position: 'absolute', bottom: 0, left: '50%', pointerEvents: 'none', zIndex: 1 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            left: p.dx,
            width: size * 0.06,
            height: size * 0.06,
            borderRadius: '50%',
            background: 'rgba(180, 160, 130, 0.5)',
            animation: `dustBurst 300ms ease-out ${p.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  )
}

// ---- SPEECH BUBBLE -----------------------------------------------------------
function SpeechBubble({ visible, scale, agentColor }) {
  if (!visible || scale <= 0) return null
  return (
    <div style={{
      position: 'absolute',
      top: -24,
      left: '50%',
      transform: `translateX(-50%) scale(${scale})`,
      transformOrigin: 'bottom center',
      transition: scale > 0 ? 'none' : 'transform 150ms ease-in',
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 8,
      padding: '3px 8px',
      boxShadow: `0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px ${agentColor}33`,
      display: 'flex',
      gap: 3,
      alignItems: 'center',
      zIndex: 20,
      pointerEvents: 'none',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: '50%',
          background: agentColor || '#666',
          animation: `speechDot 1.2s ease-in-out ${i * 200}ms infinite`,
        }} />
      ))}
      {/* Tail */}
      <div style={{
        position: 'absolute',
        bottom: -5,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(255,255,255,0.95)',
      }} />
    </div>
  )
}

// ---- CONFETTI OVERLAY -------------------------------------------------------
function ConfettiOverlay({ particles, spriteSize }) {
  if (!particles || particles.length === 0) return null
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      zIndex: 25,
      overflow: 'visible',
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `calc(50% + ${p.x}px)`,
          top: `calc(50% + ${p.y}px)`,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: p.id % 3 === 0 ? '50%' : '1px',
          transform: `rotate(${p.rotation}deg)`,
          opacity: Math.max(0, 1 - Math.abs(p.y) / 60),
        }} />
      ))}
    </div>
  )
}

// ---- GOLD GLOW (celebration) ------------------------------------------------
function CelebrationGlow({ opacity, agentColor }) {
  if (opacity <= 0) return null
  return (
    <div style={{
      position: 'absolute',
      inset: -12,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${agentColor || '#FFD700'}${Math.round(opacity * 40).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
      pointerEvents: 'none',
      zIndex: 1,
    }} />
  )
}


// ==============================================================================
// ANIMATED AGENT CHARACTER (replaces static AgentCharacterHTML)
// ==============================================================================

export function AnimatedAgentCharacter({
  color,
  status,
  agentSlug,
  isSpeaking = false,
  roomW,
  roomH,
  onCelebrate, // callback when celebration should trigger (from parent)
}) {
  const hasSpriteFile = agentSlug && SPRITE_AGENTS.includes(agentSlug)
  const agentColor = AGENT_COLORS[agentSlug] || color || '#FFD87A'

  // Character at 22% of room
  const spriteSize = Math.min(roomW, roomH) * 0.22

  // Task 3: State transitions (detects status changes, triggers hop)
  const {
    transitionTrigger,
    spriteOverride,
    scalePulse,
    targetSpriteState,
  } = useStateTransition(agentSlug, status, isSpeaking)

  // Task 1: Hop movement
  const { isHopping, hopFrame, hopTransform, hopSpriteSrc, startHop } = useHopCycle(agentSlug, transitionTrigger)

  // Task 2: Idle bounce (active when NOT hopping and NOT celebrating)
  const isIdleOrWorking = !isHopping && (status === 'IDLE' || status === 'WORKING' || status === 'WAITING' || status === 'PAUSED' || status === 'BLOCKED')
  const { bounceY, shadowScale: idleShadowScale } = useIdleBounce(agentSlug, isIdleOrWorking && !isSpeaking)

  // Task 4: Speaking animation
  const { bubbleScale, speakBounceY } = useSpeakingAnimation(isSpeaking)

  // Task 5: Celebration
  const { isCelebrating, jumpY, confettiParticles, glowOpacity, celebrate } = useCelebration(agentSlug)

  // Expose celebrate to parent via callback ref
  useEffect(() => {
    if (onCelebrate) {
      onCelebrate.current = celebrate
    }
  }, [celebrate, onCelebrate])

  // Auto-trigger celebration when agent status changes to DONE
  const prevStatusForCelebration = useRef(status)
  useEffect(() => {
    if (status === 'DONE' && prevStatusForCelebration.current !== 'DONE') {
      // Delay celebration until after the state transition hop
      setTimeout(() => celebrate(), HOP_TOTAL_DURATION + 100)
    }
    prevStatusForCelebration.current = status
  }, [status, celebrate])

  if (!hasSpriteFile) {
    return (
      <div style={{
        position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        width: spriteSize * 0.4, height: spriteSize * 0.4, borderRadius: '50%',
        background: color, opacity: 0.9, boxShadow: `0 4px 12px ${color}66`,
      }} />
    )
  }

  // Compute sprite source: hop sprite takes priority, then override, then target state
  const spriteSrc = isHopping && hopSpriteSrc
    ? hopSpriteSrc
    : `/corner/sprites/${agentSlug}-${spriteOverride || targetSpriteState}.png`

  // Compute final Y offset: hop > celebration > speaking > idle bounce
  let finalY = 0
  let finalScaleX = 1
  let finalScaleY = 1
  let finalShadowScale = 1
  let finalShadowOpacity = 0.25

  if (isHopping) {
    finalY = hopTransform.y
    finalScaleX = hopTransform.scaleX
    finalScaleY = hopTransform.scaleY
    finalShadowScale = hopTransform.shadowScale
    finalShadowOpacity = hopTransform.shadowOpacity
  } else if (isCelebrating) {
    finalY = jumpY
    finalShadowScale = 1 + (jumpY / CELEBRATION_JUMP_HEIGHT) * 0.3
    finalShadowOpacity = 0.25 + Math.abs(jumpY / CELEBRATION_JUMP_HEIGHT) * 0.2
  } else if (isSpeaking) {
    finalY = speakBounceY
    finalShadowScale = 1 - (speakBounceY / 3) * 0.1
  } else {
    finalY = bounceY
    finalShadowScale = idleShadowScale
  }

  // Apply scale pulse from state transition
  finalScaleX *= scalePulse
  finalScaleY *= scalePulse

  const isWorking = status === 'WORKING'
  const isThinking = status === 'WAITING'
  const isDone = status === 'DONE'
  const showDust = isHopping && hopFrame === 'landing'

  return (
    <div style={{
      position: 'absolute', bottom: '8%', left: '50%',
      transform: `translateX(-50%) translateY(${finalY}px) scaleX(${finalScaleX}) scaleY(${finalScaleY})`,
      width: spriteSize, height: spriteSize,
      pointerEvents: 'none', zIndex: 2,
      transition: isHopping ? 'none' : 'transform 60ms linear',
    }}>
      {/* Celebration glow */}
      <CelebrationGlow opacity={glowOpacity} agentColor={agentColor} />

      {/* Confetti */}
      <ConfettiOverlay particles={confettiParticles} spriteSize={spriteSize} />

      {/* Speech bubble (Task 4) */}
      <SpeechBubble visible={isSpeaking} scale={bubbleScale} agentColor={agentColor} />

      {/* Shadow beneath sprite */}
      <div style={{
        position: 'absolute', bottom: -4, left: '50%',
        transform: `translateX(-50%) scaleX(${finalShadowScale})`,
        width: spriteSize * 0.7, height: spriteSize * 0.15,
        background: 'rgba(0,0,0,0.25)', borderRadius: '50%', filter: 'blur(3px)',
        opacity: finalShadowOpacity,
        transition: isHopping ? 'none' : 'transform 60ms linear, opacity 60ms linear',
      }} />

      {/* Dust particles on landing */}
      <DustParticles active={showDust} size={spriteSize} />

      {/* Sprite image -- full silhouette, no circle clipping, no blend mode corruption */}
      <div style={{
        width: spriteSize, height: spriteSize, overflow: 'hidden', position: 'relative',
      }}>
        {/* NOTE: 2.6x oversizing + -30% offset zooms into the character center of 256x256 spritesheets.
            If sprite dimensions change, this framing needs updating. Ideally PNGs should be pre-framed. */}
        <img
          src={spriteSrc}
          alt=""
          style={{
            position: 'absolute',
            top: '-30%', left: '-30%',
            width: spriteSize * 2.6,
            height: spriteSize * 2.6,
            maxWidth: 'none',
            imageRendering: 'pixelated',
            display: 'block',
            filter: isWorking ? `drop-shadow(0 0 8px ${color}66)` : 'none',
            transition: 'filter 400ms ease',
          }}
        />
      </div>

      {/* Working glow pulse */}
      {isWorking && !isHopping && !isCelebrating && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          animation: 'characterGlow 2s ease-in-out infinite',
        }} />
      )}

      {/* Thinking dots above sprite */}
      {isThinking && !isHopping && (
        <div style={{
          position: 'absolute', top: -12, right: -4,
          display: 'flex', gap: 3,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#F59E0B',
              animation: `dotPulse 0.8s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Done checkmark */}
      {isDone && !isCelebrating && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 18, height: 18, borderRadius: '50%',
          background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(16,185,129,0.4)',
        }}>
          <svg width={10} height={8} viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}


// ==============================================================================
// CSS KEYFRAMES (injected once)
// ==============================================================================

export function CharacterAnimationStyles() {
  return (
    <style>{`
      @keyframes dustBurst {
        0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
        100% { transform: translate(var(--dx, 5px), -8px) scale(2); opacity: 0; }
      }
      @keyframes speechDot {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-3px); opacity: 1; }
      }
    `}</style>
  )
}
