// FloatingCallBar -- persistent call status bar, fixed to viewport bottom.
// Self-gates: returns null when no call is active.
// Mounts as sibling to the main content inside CornerV3 shell.
import { C } from '../../../lib/cv3Colors.js'
import { useLiveCall } from '../../../providers/LiveCallProvider.jsx'

const STATUS_LABELS = {
  connecting: 'Connecting…',
  listening: 'Listening',
  speaking: 'Speaking',
  error: 'Error',
}

export default function FloatingCallBar() {
  const { isActive, session, status, endCall } = useLiveCall()
  if (!isActive || !session) return null

  const isPulsing = status === 'listening' || status === 'speaking'
  const dotColor = status === 'error' ? C.red : C.accent

  return (
    <>
      <style>{`@keyframes lcb-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
      <div
        data-testid="floating-call-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          background: C.s2,
          borderTop: '1px solid rgba(16,185,129,0.2)',
          padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
            animation: isPulsing ? 'lcb-pulse 1.2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {session.agentSlug}
          </span>
          {STATUS_LABELS[status] && (
            <span style={{ fontSize: 11, color: C.muted }}>
              {STATUS_LABELS[status]}
            </span>
          )}
        </div>
        <button
          data-testid="floating-call-bar-hangup"
          onClick={endCall}
          style={{
            padding: '6px 14px', borderRadius: 14,
            background: C.red, border: 'none',
            color: '#fff', fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          End
        </button>
      </div>
    </>
  )
}
