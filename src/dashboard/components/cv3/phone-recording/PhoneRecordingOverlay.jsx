// PhoneRecordingOverlay -- PR1 of corner:phone-recording.
//
// Full-screen recording surface that replaces the inline phone button.
// States: RECORDING (red dot + timer + Stop) → TRANSCRIBING (spinner)
//         → DONE (transcript preview, auto-close) | ERROR (message + Close)
//
// Mounted by CornerV3 when phoneOverlayOpen is true. Reads all state from
// useTelephone hook passed as props -- no local recording logic.
import { useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'

export default function PhoneRecordingOverlay({
  isRecording,
  isTranscribing,
  micError,
  elapsed,
  lastTranscript,
  onToggle,
  onClose,
}) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  // Auto-close 2 s after transcript dispatched successfully
  useEffect(() => {
    if (!lastTranscript || isRecording || isTranscribing) return
    const t = setTimeout(onClose, 2000)
    return () => clearTimeout(t)
  }, [lastTranscript, isRecording, isTranscribing, onClose])

  return (
    <>
      <style>{`
        @keyframes pro-pulse { 0%,100% { opacity:.55;transform:scale(1); } 50% { opacity:1;transform:scale(1.35); } }
        @keyframes pro-spin  { to { transform:rotate(360deg); } }
        @keyframes pro-fade  { from { opacity:0; } to { opacity:1; } }
      `}</style>
      <div
        data-testid="phone-recording-overlay"
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(6,10,20,0.97)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 24,
          animation: 'pro-fade 0.18s ease-out',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* ── RECORDING ─────────────────────────────────────────────────── */}
        {isRecording && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                background: '#EF4444', flexShrink: 0,
                animation: 'pro-pulse 1.2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 36, fontWeight: 700, color: C.text,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.04em',
              }}>
                {mm}:{ss}
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.muted,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Recording
            </span>
            <button
              onClick={onToggle}
              style={{
                marginTop: 8,
                padding: '14px 52px', borderRadius: 16, border: 'none',
                background: '#EF4444', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              Stop
            </button>
          </>
        )}

        {/* ── TRANSCRIBING ──────────────────────────────────────────────── */}
        {!isRecording && isTranscribing && (
          <>
            <div style={{
              width: 32, height: 32,
              border: `3px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: '50%',
              animation: 'pro-spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>
              Transcribing…
            </span>
          </>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────────── */}
        {!isRecording && !isTranscribing && micError && (
          <>
            <span style={{
              fontSize: 13, fontWeight: 600, color: '#F87171',
              textAlign: 'center', maxWidth: 280, lineHeight: 1.5,
            }}>
              {micError}
            </span>
            <button
              onClick={onClose}
              style={{
                padding: '10px 32px', borderRadius: 12,
                border: `1px solid ${C.border2}`,
                background: 'transparent', color: C.muted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </>
        )}

        {/* ── DONE ──────────────────────────────────────────────────────── */}
        {!isRecording && !isTranscribing && !micError && lastTranscript && (
          <>
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.green,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              Transcript sent
            </span>
            <p style={{
              fontSize: 13, color: C.text2, lineHeight: 1.6,
              maxWidth: 320, textAlign: 'center', margin: 0, padding: '0 16px',
            }}>
              {lastTranscript.slice(0, 200)}{lastTranscript.length > 200 ? '…' : ''}
            </p>
          </>
        )}

        {/* ── CLOSE button (top-right, hidden while actively recording) ── */}
        {!isRecording && (
          <button
            data-testid="phone-recording-overlay-close"
            onClick={onClose}
            title="Close"
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${C.border}`,
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </>
  )
}
