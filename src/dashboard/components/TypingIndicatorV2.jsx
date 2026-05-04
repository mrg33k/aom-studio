// TypingIndicatorV2 -- minimal bouncing dots while waiting for relay response
// compact=true  : fits inside a message bubble (ChatBar inline)
// compact=false : stands alone below messages (UnifiedPanel, ChatDashboard)
//
// R73 (session 22 /007 — fail-loud principle): after SILENCE_MS of no agent
// response the indicator flips to a visible stall state with a one-click
// clear-and-retry CTA. Silence is the worst failure mode — the user can't
// tell working-hard from dead. 45s is past a normal reply window but well
// before the 5min legacy poke. The clear button fires the existing
// /api/dashboard/clear-context endpoint so the agent gets a fresh shell.
import React, { useState, useEffect, useRef } from 'react'
import { authFetch } from '../lib/authFetch.js'

const SILENCE_MS = 45_000  // 45s — R73 stall state kicks in
const POKE_MS = 300_000    // 5min (legacy poke button, kept as deeper fallback)

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
  stalled = false,         // R73-fix: parent-driven stall override (wall-clock, survives remounts)
  agentSlug,
  agentColor = '#3B82F6',
  agentName,
  onPoke,
  onStall,                 // R73: called when user clicks "clear & retry"
  worldId = 'aom',         // R73: needed for clear-context endpoint
  isDaytime = true,
  compact = false,
}) {
  const [msElapsed, setMsElapsed] = useState(0)
  const [pokeUsed, setPokeUsed] = useState(false)
  const [stallCleared, setStallCleared] = useState(false)  // R73: user dismissed the stall
  const [clearState, setClearState] = useState('idle')     // R73: idle|working|done|error
  const startRef = useRef(null)

  useEffect(() => { ensureStyles() }, [])

  // Track elapsed so we can fire R73 stall (45s) and legacy poke (5min).
  useEffect(() => {
    if (!streaming) {
      setMsElapsed(0)
      setPokeUsed(false)
      setStallCleared(false)
      setClearState('idle')
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

  // R73-fix: OR with parent-driven `stalled` so wall-clock detection in
  // MessageList can fire even when this component has remounted (timer reset).
  const showStall = (msElapsed >= SILENCE_MS || stalled) && !stallCleared
  const showPoke = msElapsed >= POKE_MS && !pokeUsed && !showStall

  const handlePoke = () => {
    setPokeUsed(true)
    onPoke?.(`${agentName ? agentName + ', you' : 'Hey,'} still there?`)
  }

  // R73: clear-and-retry. Hits the same endpoint ThreadHeader's clear-context
  // button uses, then signals the parent to drop the streaming state so the
  // indicator unmounts. The agent's tmux survives; only the accumulated
  // Claude Code context is reset so a fresh reply can land.
  const handleClearAndRetry = async () => {
    if (clearState === 'working') return
    setClearState('working')
    try {
      const resp = await authFetch('/api/dashboard/clear-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, client_id: worldId }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setClearState('done')
    } catch (err) {
      setClearState('error')
    }
    setStallCleared(true)
    // Let the parent flip streaming=false so we unmount cleanly.
    onStall?.()
  }

  if (compact) {
    return (
      <div
        data-testid={`typing-indicator-${agentSlug || ''}`}
        data-state={showStall ? 'stall' : 'working'}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', flexWrap: 'wrap' }}
      >
        {/* R73: dots dim when stalled */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: showStall ? '#EF4444' : agentColor,
              opacity: showStall ? 0.5 : 0.8,
              animation: showStall ? 'none' : `twDotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </span>

        {/* R73 stall state — visible break + clear & retry */}
        {showStall && (
          <>
            <span
              data-testid="typing-stall-text"
              style={{
                color: '#EF4444', fontSize: 10, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {agentName || 'Agent'} went quiet
            </span>
            <button
              data-testid={`typing-stall-clear-${agentSlug || ''}`}
              onClick={handleClearAndRetry}
              disabled={clearState === 'working'}
              style={{
                background: '#EF444418',
                border: '1px solid #EF444440',
                borderRadius: 5, padding: '2px 8px',
                color: '#EF4444', fontSize: 10, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: clearState === 'working' ? 'progress' : 'pointer',
                flexShrink: 0,
                animation: 'twPokeIn 0.35s ease-out',
              }}
            >
              {clearState === 'working' ? 'clearing…' : clearState === 'error' ? 'retry' : 'clear & retry'}
            </button>
          </>
        )}

        {/* Legacy poke button (5min+; hidden once stall kicks in) */}
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
    <div
      data-testid={`typing-indicator-${agentSlug || ''}`}
      data-state={showStall ? 'stall' : 'working'}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* R73: dots dim when stalled */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: showStall ? '#EF4444' : agentColor,
              opacity: showStall ? 0.55 : 1,
              animation: showStall ? 'none' : `twDotVegas 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </span>
        {showStall && (
          <span
            data-testid="typing-stall-text"
            style={{
              color: '#EF4444', fontSize: 12, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.02em',
            }}
          >
            {agentName || 'Agent'} went quiet — nothing heard in {Math.floor(msElapsed / 1000)}s
          </span>
        )}
      </div>

      {/* R73 stall CTA */}
      {showStall && (
        <button
          data-testid={`typing-stall-clear-${agentSlug || ''}`}
          onClick={handleClearAndRetry}
          disabled={clearState === 'working'}
          style={{
            alignSelf: 'flex-start',
            background: '#EF444418',
            border: '1px solid #EF444440',
            borderRadius: 8, padding: '5px 14px',
            color: '#EF4444', fontSize: 12, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: clearState === 'working' ? 'progress' : 'pointer',
            letterSpacing: '0.04em',
            transition: 'all 150ms',
            animation: 'twPokeIn 0.35s ease-out',
          }}
        >
          {clearState === 'working' ? 'Clearing…'
           : clearState === 'error' ? 'Retry — clear failed'
           : `Clear ${agentName || 'agent'} + try again`}
        </button>
      )}

      {/* Legacy poke button (5min+; hidden once stall kicks in) */}
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
