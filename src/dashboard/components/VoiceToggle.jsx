// VoiceToggle.jsx
// Small pill toggle: "Chat | Voice"
// Lives in the chat header. Switches between text input and VoiceChat.
//
// Supports two APIs:
//   Pill mode (existing):    <VoiceToggle mode={voiceMode} onChange={setVoiceMode} />
//   Button mode (new):       <VoiceToggle isActive={bool} onToggle={fn} />

import React from 'react'

// Microphone SVG icons for active/inactive states
function MicIcon({ active, color = 'currentColor' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

export default function VoiceToggle({ mode, onChange, disabled, isActive, onToggle, status = 'idle', volumeLevel = 0 }) {
  // Button mode: standalone voice chat toggle
  if (onToggle !== undefined || isActive !== undefined) {
    // Derive visual state from status prop (fallback: isActive boolean)
    const vStatus = status !== 'idle' ? status : (isActive ? 'listening' : 'idle')

    const stateConfig = {
      idle:       { color: '#6B7280', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.08)', shadow: 'none',                             anim: 'none',                   label: 'Voice' },
      connecting: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', shadow: '0 0 12px rgba(245,158,11,0.2)',      anim: 'voiceConnecting 1.2s ease-in-out infinite', label: 'Connecting' },
      listening:  { color: '#60A5FA', bg: 'rgba(59,130,246,0.18)',  border: 'rgba(96,165,250,0.45)', shadow: '0 0 18px rgba(59,130,246,0.35)',     anim: 'voicePulse 2s ease-in-out infinite',         label: 'Listening' },
      speaking:   { color: '#34D399', bg: 'rgba(52,211,153,0.15)',   border: 'rgba(52,211,153,0.45)', shadow: '0 0 18px rgba(52,211,153,0.35)',     anim: 'voiceSpeaking 0.9s ease-in-out infinite',    label: 'Speaking' },
      error:      { color: '#F87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(248,113,113,0.35)', shadow: '0 0 10px rgba(239,68,68,0.2)',       anim: 'none',                   label: 'Error' },
    }
    const cfg = stateConfig[vStatus] || stateConfig.idle

    // Volume-reactive styles: override CSS animation with data-driven scale + glow when listening
    const isVolumeActive = vStatus === 'listening' && volumeLevel > 0.05
    const volScale = isVolumeActive ? 1 + volumeLevel * 0.06 : 1
    const volGlowHex = isVolumeActive ? Math.round(volumeLevel * 120).toString(16).padStart(2, '0') : ''
    const volShadow = isVolumeActive
      ? `0 0 ${Math.round(volumeLevel * 24)}px ${cfg.color}${volGlowHex}`
      : cfg.shadow

    return (
      <button
        onClick={() => onToggle && onToggle()}
        title={isActive ? 'Voice active -- click to stop' : 'Start voice chat'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 13px',
          borderRadius: 20,
          border: `1.5px solid ${cfg.border}`,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          transition: isVolumeActive
            ? 'box-shadow 60ms linear, transform 60ms linear'
            : 'all 180ms ease',
          background: cfg.bg,
          color: cfg.color,
          outline: 'none',
          boxShadow: volShadow,
          animation: isVolumeActive ? 'none' : cfg.anim,
          transform: `scale(${volScale})`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Live dot for active states */}
        {vStatus !== 'idle' && vStatus !== 'error' && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.color}`,
            flexShrink: 0,
            animation: 'voiceDot 1.5s ease-in-out infinite',
          }} />
        )}
        <MicIcon active={isActive} color={cfg.color} />
        {cfg.label}
        <style>{`
          @keyframes voicePulse {
            0%, 100% { box-shadow: 0 0 12px rgba(59,130,246,0.25); border-color: rgba(96,165,250,0.45); }
            50% { box-shadow: 0 0 24px rgba(59,130,246,0.55); border-color: rgba(96,165,250,0.7); }
          }
          @keyframes voiceSpeaking {
            0%, 100% { box-shadow: 0 0 12px rgba(52,211,153,0.25); border-color: rgba(52,211,153,0.4); }
            50% { box-shadow: 0 0 26px rgba(52,211,153,0.6); border-color: rgba(52,211,153,0.75); }
          }
          @keyframes voiceConnecting {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(245,158,11,0.15); }
            50% { opacity: 0.7; box-shadow: 0 0 18px rgba(245,158,11,0.4); }
          }
          @keyframes voiceDot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.7); }
          }
        `}</style>
      </button>
    )
  }

  // Pill mode: existing Chat | Voice toggle
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 20,
      padding: '2px 3px',
      gap: 2,
      border: '1px solid rgba(255,255,255,0.08)',
      flexShrink: 0,
    }}>
      <button
        onClick={() => !disabled && onChange('chat')}
        style={{
          padding: '3px 10px',
          borderRadius: 16,
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.02em',
          transition: 'all 150ms ease',
          background: mode === 'chat' ? 'rgba(59,130,246,0.25)' : 'transparent',
          color: mode === 'chat' ? '#93C5FD' : '#6B7280',
          outline: 'none',
        }}
      >
        Chat
      </button>
      <button
        onClick={() => !disabled && onChange('voice')}
        style={{
          padding: '3px 10px',
          borderRadius: 16,
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.02em',
          transition: 'all 150ms ease',
          background: mode === 'voice' ? 'rgba(239,68,68,0.25)' : 'transparent',
          color: mode === 'voice' ? '#FCA5A5' : '#6B7280',
          outline: 'none',
        }}
      >
        Voice
      </button>
    </div>
  )
}
