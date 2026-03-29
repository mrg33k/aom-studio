// TypingIndicatorV2 -- minimal bouncing dots while waiting for relay response
// compact=true  : fits inside a message bubble (ChatBar inline)
// compact=false : stands alone below messages (UnifiedPanel, ChatDashboard)
import React, { useState, useEffect, useRef } from 'react'

const POKE_MS = 300_000  // 5min (poke button appears)

let _stylesInjected = false
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const s = document.createElement('style')
  s.id = 'tw-v2-styles'
  s.textContent = `
    @keyframes twDotBounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }
    @keyframes twDotVegas { 0%,100%{transform:translateY(0);opacity:0.6} 30%{transform:translateY(-5px);opacity:1} 60%{transform:translateY(0);opacity:0.7} }
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

  useEffect(() => { ensureStyles() }, [])

  // Track elapsed only to trigger poke button at 5min -- no longer displayed
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
    }, 1000)
    return () => clearInterval(tick)
  }, [streaming])

  if (!streaming) return null

  const showPoke = msElapsed >= POKE_MS && !pokeUsed

  const handlePoke = () => {
    setPokeUsed(true)
    onPoke?.(`${agentName ? agentName + ', you' : 'Hey,'} still there?`)
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', flexWrap: 'wrap' }}>
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
              background: '#EF444415',
              border: '1px solid #EF444435',
              borderRadius: 5, padding: '2px 8px',
              color: '#EF4444', fontSize: 10, fontWeight: 700,
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
      </div>

      {/* Poke button (5min+) */}
      {showPoke && (
        <button
          onClick={handlePoke}
          style={{
            alignSelf: 'flex-start',
            background: '#EF444412',
            border: '1px solid #EF444430',
            borderRadius: 8, padding: '5px 14px',
            color: '#EF4444', fontSize: 12, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer', letterSpacing: '0.04em',
            transition: 'all 150ms',
            animation: 'twPokeIn 0.35s ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#EF444425'
            e.currentTarget.style.borderColor = '#EF444450'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#EF444412'
            e.currentTarget.style.borderColor = '#EF444430'
          }}
        >
          Poke {agentName || 'agent'}
        </button>
      )}
    </div>
  )
}
