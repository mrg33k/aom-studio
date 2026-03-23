// TypingIndicatorV2 -- typewriter phrases (cocky -> steady -> honest),
// 15s phrase cycle, green/yellow/red timer pill, poke button at 5min.
//
// compact=true  : fits inside a message bubble (ChatBar inline)
// compact=false : stands alone below messages (UnifiedPanel, ChatDashboard)
import React, { useState, useEffect, useRef } from 'react'
import { getPhrasedTyping } from '../agentTypingPhrases'

// Phase thresholds (ms)
const COCKY_END  = 60_000   // 0-60s
const STEADY_END = 180_000  // 60s-3min
const POKE_MS    = 300_000  // 5min
const MS_PER_PHRASE = 15_000 // each phrase gets 15s
const CHAR_DELAY = 55        // ms per character (typewriter speed)

// Inject animation keyframes once (works in any host component)
let _stylesInjected = false
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const s = document.createElement('style')
  s.id = 'tw-v2-styles'
  s.textContent = `
    @keyframes twCursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes twDotBounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }
    @keyframes twDotVegas { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} 60%{transform:translateY(0)} }
    @keyframes twPokeIn { 0%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:translateY(0)} }
  `
  document.head.appendChild(s)
}

export function TypingIndicatorV2({
  streaming,
  agentSlug,
  agentColor = '#3B82F6',
  agentName,
  onPoke,
  isDaytime = true,
  compact = false,
}) {
  const [msElapsed, setMsElapsed] = useState(0)
  const [pokeUsed, setPokeUsed] = useState(false)
  const startRef = useRef(null)

  // Inject styles on first render
  useEffect(() => { ensureStyles() }, [])

  // Master tick at 80ms for smooth typewriter + accurate timer
  useEffect(() => {
    if (!streaming) {
      setMsElapsed(0)
      setPokeUsed(false)
      startRef.current = null
      return
    }
    startRef.current = Date.now()
    const tick = setInterval(() => {
      if (startRef.current) setMsElapsed(Date.now() - startRef.current)
    }, 80)
    return () => clearInterval(tick)
  }, [streaming])

  if (!streaming) return null

  const elapsed = Math.floor(msElapsed / 1000)

  // Phase
  const phase = msElapsed < COCKY_END ? 'cocky'
    : msElapsed < STEADY_END ? 'steady'
    : 'honest'

  // Timer color: green -> yellow -> red
  const timerColor = phase === 'cocky' ? '#22C55E'
    : phase === 'steady' ? '#F59E0B'
    : '#EF4444'

  // Which 15s slot within the current phase
  const phaseStartMs = phase === 'cocky' ? 0
    : phase === 'steady' ? COCKY_END
    : STEADY_END
  const msInPhase  = msElapsed - phaseStartMs
  const slotIdx    = Math.floor(msInPhase / MS_PER_PHRASE)
  const msInSlot   = msInPhase % MS_PER_PHRASE

  // Current phrase + typewriter
  const phaseList    = getPhrasedTyping(agentSlug)[phase]
  const currentPhrase = phaseList[slotIdx % phaseList.length]
  const charIdx      = Math.min(Math.floor(msInSlot / CHAR_DELAY), currentPhrase.length)
  const displayText  = currentPhrase.slice(0, charIdx)
  const showCursor   = charIdx < currentPhrase.length

  // Timer label
  const min = Math.floor(elapsed / 60)
  const sec = elapsed % 60
  const timerLabel = min > 0
    ? `${min}m${sec.toString().padStart(2, '0')}s`
    : `${elapsed}s`

  const showPoke = msElapsed >= POKE_MS && !pokeUsed

  const handlePoke = () => {
    setPokeUsed(true)
    onPoke?.(`${agentName ? agentName + ', you' : 'Hey,'} still there?`)
  }

  if (compact) {
    // Inside message bubble (ChatBar)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 2px', flexWrap: 'wrap',
      }}>
        {/* Typewriter phrase */}
        <span style={{
          color: agentColor, fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.9, minWidth: 80,
        }}>
          {displayText}
          {showCursor && (
            <span style={{ animation: 'twCursorBlink 0.7s ease-in-out infinite' }}>▋</span>
          )}
        </span>

        {/* Timer pill */}
        <span style={{
          fontSize: 10, fontWeight: 700, color: timerColor,
          fontFamily: "'JetBrains Mono', monospace",
          background: timerColor + '18',
          padding: '1px 6px', borderRadius: 5,
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          transition: 'color 600ms ease, background 600ms ease',
        }}>
          {timerLabel}
        </span>

        {/* Bouncing dots */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: agentColor, opacity: 0.8,
              animation: `twDotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </span>

        {/* Poke button (5min+) */}
        {showPoke && (
          <button
            onClick={handlePoke}
            style={{
              background: timerColor + '15',
              border: `1px solid ${timerColor}35`,
              borderRadius: 5, padding: '2px 8px',
              color: timerColor, fontSize: 10, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer', flexShrink: 0,
              animation: 'twPokeIn 0.35s ease-out',
            }}
          >
            poke
          </button>
        )}
      </div>
    )
  }

  // Full mode: below messages (UnifiedPanel, ChatDashboard)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Vegas bounce dots */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: agentColor,
              animation: `twDotVegas 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </span>

        {/* Typewriter phrase */}
        <span style={{
          color: agentColor, fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500, opacity: 0.92, minWidth: 100,
        }}>
          {displayText}
          {showCursor && (
            <span style={{
              animation: 'twCursorBlink 0.7s ease-in-out infinite', opacity: 0.8,
            }}>▋</span>
          )}
        </span>

        {/* Timer pill */}
        <span style={{
          fontSize: 11, fontWeight: 700, color: timerColor,
          fontFamily: "'JetBrains Mono', monospace",
          background: timerColor + '15',
          border: `1px solid ${timerColor}25`,
          padding: '2px 8px', borderRadius: 6,
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          transition: 'color 600ms ease, background 600ms ease, border-color 600ms ease',
        }}>
          {timerLabel}
        </span>
      </div>

      {/* Poke button (5min+) */}
      {showPoke && (
        <button
          onClick={handlePoke}
          style={{
            alignSelf: 'flex-start',
            background: timerColor + '12',
            border: `1px solid ${timerColor}30`,
            borderRadius: 8, padding: '5px 14px',
            color: timerColor, fontSize: 12, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer', letterSpacing: '0.04em',
            transition: 'all 150ms',
            animation: 'twPokeIn 0.35s ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = timerColor + '25'
            e.currentTarget.style.borderColor = timerColor + '50'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = timerColor + '12'
            e.currentTarget.style.borderColor = timerColor + '30'
          }}
        >
          Poke {agentName || 'agent'}
        </button>
      )}
    </div>
  )
}
