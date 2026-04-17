import { C } from '../../../lib/cv3Colors.js'
import { useChatVoiceCtx } from '../chat/ChatPanelContext.jsx'

// Voice-active UI that replaces the input bar: animated waveform bars,
// connection status line, live transcript, mute + hangup controls.
export default function ProjectVoiceModeBar() {
  const {
    voiceStatus, voiceTranscriptText, voiceChatRef,
    voiceMuted, setVoiceMuted,
    setIsVoiceActive, setVoiceTranscriptText,
  } = useChatVoiceCtx()
  return (
    <div style={{
      padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
      background: C.bg2,
      borderTop: '1px solid ' + C.border,
      flexShrink: 0,
    }}>
      <style>{`
        @keyframes vw { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
      `}</style>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 3, height: 40, marginBottom: 8,
      }}>
        {[
          { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
          { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
          { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
        ].map((bar, i) => (
          <div key={i} style={{
            width: 3, height: bar.h, borderRadius: 2,
            background: C.accent,
            animation: `vw 1s ease-in-out ${bar.d} infinite`,
          }} />
        ))}
      </div>
      <div style={{
        textAlign: 'center', fontSize: 12, fontWeight: 600,
        color: C.accent, fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 4,
      }}>
        {voiceStatus === 'connecting' ? 'Connecting...'
          : voiceStatus === 'speaking' ? 'Speaking...'
          : voiceStatus === 'error' ? 'Error'
          : 'Listening...'}
      </div>
      <div style={{
        fontSize: 13, color: C.text2, textAlign: 'center',
        minHeight: 18, padding: '0 20px',
      }}>
        {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
      }}>
        <button
          onClick={() => {
            voiceChatRef.current?.toggleMute()
            setVoiceMuted(v => !v)
          }}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: '1px solid ' + C.border,
            background: voiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
            color: voiceMuted ? '#F87171' : C.muted,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
          }}
        >
          M
        </button>
        <button
          onClick={() => {
            voiceChatRef.current?.stop()
            setIsVoiceActive(false)
            setVoiceMuted(false)
            setVoiceTranscriptText('')
          }}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none',
            background: C.red, color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
          }}
        >
          &#x00D7;
        </button>
      </div>
    </div>
  )
}
