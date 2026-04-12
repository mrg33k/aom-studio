// VoiceToggle.jsx -- Mic button that manages voice session lifecycle
// Embeds into ChatPanel input bar. Shows state: idle / connecting / listening / speaking / error.

import { useCallback } from 'react'
import { useVoiceChat } from './hooks/useVoiceChat.js'
import VoiceVisualizer from './VoiceVisualizer.jsx'
import { getClientId } from './lib/clientConfig.js'

export default function VoiceToggle({ agentSlug, agentColor, onTranscript }) {
  const clientId = getClientId()
  const voice = useVoiceChat({ agentSlug, clientId, onTranscript })

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    if (voice.isConnected || voice.isListening) {
      voice.disconnect()
    } else {
      voice.connect()
    }
  }, [voice])

  const color = agentColor || '#60A5FA'
  const isActive = voice.isConnected || voice.isListening
  const isConnecting = !voice.isConnected && voice.isListening // mic granted, ws connecting

  // Determine tooltip
  let title = 'Start voice chat'
  if (voice.error) title = voice.error
  else if (isConnecting) title = 'Connecting...'
  else if (voice.isSpeaking) title = 'Agent is speaking'
  else if (isActive) title = 'Stop voice chat'

  // Button style based on state
  let bg = 'var(--bv-input-bg)'
  let borderColor = 'var(--bv-input-border)'
  let iconColor = 'var(--bv-muted)'

  if (voice.error) {
    bg = 'rgba(239,68,68,0.1)'
    borderColor = 'rgba(239,68,68,0.5)'
    iconColor = '#EF4444'
  } else if (voice.isSpeaking) {
    bg = `${color}15`
    borderColor = `${color}60`
    iconColor = color
  } else if (isActive) {
    bg = 'rgba(34,197,94,0.1)'
    borderColor = 'rgba(34,197,94,0.5)'
    iconColor = '#22C55E'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {/* Agent-speaking visualizer -- shows inline next to button */}
      {voice.isSpeaking && (
        <VoiceVisualizer active={true} color={color} size={18} />
      )}

      <button
        type="button"
        onClick={handleClick}
        title={title}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: `1.5px solid ${borderColor}`,
          background: bg,
          color: iconColor,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!voice.error && !isActive) {
            e.currentTarget.style.color = 'var(--bv-text)'
            e.currentTarget.style.borderColor = color
          }
        }}
        onMouseLeave={e => {
          if (!voice.error && !isActive) {
            e.currentTarget.style.color = iconColor
            e.currentTarget.style.borderColor = borderColor
          }
        }}
      >
        {/* Connecting spinner ring */}
        {isConnecting && (
          <div style={{
            position: 'absolute', inset: -1,
            borderRadius: 8,
            border: '2px solid transparent',
            borderTopColor: color,
            animation: 'spin 0.8s linear infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* Listening pulse ring */}
        {isActive && !isConnecting && !voice.isSpeaking && (
          <div style={{
            position: 'absolute', inset: -3,
            borderRadius: 10,
            border: '1.5px solid rgba(34,197,94,0.5)',
            animation: 'voicePulse 1.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <MicIcon muted={voice.isSpeaking} size={16} />
      </button>

      {/* CSS animations injected once */}
      <style>{`
        @keyframes voicePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function MicIcon({ muted, size = 16 }) {
  if (muted) {
    // Mic with slash = agent speaking, user muted
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}
