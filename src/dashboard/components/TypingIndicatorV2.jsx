// TypingIndicatorV2 -- minimal bouncing dots while waiting for relay response
// compact=true  : fits inside a message bubble (ChatBar inline)
// compact=false : stands alone below messages (UnifiedPanel, ChatDashboard)
//
// 2026-05-13: dropped the user-visible "went quiet" / "clear & retry" / "poke"
// surface entirely. The earlier auto-/clear-on-stall (removed 2026-05-12) was
// destructive; the manual button it left behind was anxiety inducing and not
// useful — by the time it shows, recovery is already underway upstream:
//   * sse-bridge.py is now under launchd (KeepAlive=true), so streaming
//     always opens for live dashboard sends.
//   * relay-keepalive.py auto-restarts dead Claude processes inside tmux
//     (HANG_THRESHOLD=180s, HANG_HARD_MAX=600s).
//   * the Convex dispatcher (ai.dispatchMessage) hands the turn to the agent and the keepalive pokes
//     within ~3s when the bridge POST loses its stream.
// All the user needs to see is the dots. If the agent really hangs past those
// safety nets, the user can resend; we don't ask them to poke or clear.
//
// `stalled` is still accepted (parent-driven from MessageList wall-clock) and
// reflected in data-state for tests and telemetry, but not rendered.
import React, { useEffect } from 'react'

let _stylesInjected = false
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const s = document.createElement('style')
  s.id = 'tw-v2-styles'
  s.textContent = `
    @keyframes twDotBounce { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }
    @keyframes twDotVegas { 0%,100%{transform:translateY(0);opacity:0.6} 30%{transform:translateY(-5px);opacity:1} 60%{transform:translateY(0);opacity:0.7} }
  `
  document.head.appendChild(s)
}

export function TypingIndicatorV2({
  streaming,
  stalled = false,
  agentColor = '#3B82F6',
  agentSlug,
  compact = false,
  // Accepted for backwards compatibility with existing call sites; not used.
  stepActiveRecently,
  agentName,
  onPoke,
  onStall,
  worldId,
  isDaytime,
}) {
  useEffect(() => { ensureStyles() }, [])

  if (!streaming) return null

  if (compact) {
    return (
      <div
        data-testid={`typing-indicator-${agentSlug || ''}`}
        data-state={stalled ? 'stall' : 'working'}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: agentColor,
              opacity: 0.8,
              animation: `twDotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </span>
      </div>
    )
  }

  return (
    <div
      data-testid={`typing-indicator-${agentSlug || ''}`}
      data-state={stalled ? 'stall' : 'working'}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: agentColor,
            opacity: 1,
            animation: `twDotVegas 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </span>
    </div>
  )
}
