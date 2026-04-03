// VoiceToggle.jsx
// Small pill toggle: "Chat | Voice"
// Lives in the chat header. Switches between text input and VoiceChat.
//
// Supports two APIs:
//   Pill mode (existing):    <VoiceToggle mode={voiceMode} onChange={setVoiceMode} />
//   Button mode (new):       <VoiceToggle isActive={bool} onToggle={fn} />

import React from 'react'

// Microphone SVG icons for active/inactive states
function MicIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {active && (
        <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
      )}
    </svg>
  )
}

export default function VoiceToggle({ mode, onChange, disabled, isActive, onToggle }) {
  // Button mode: standalone voice chat toggle
  if (onToggle !== undefined || isActive !== undefined) {
    return (
      <button
        onClick={() => onToggle && onToggle()}
        title={isActive ? 'Voice chat active -- click to stop' : 'Start voice chat'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 20,
          border: `1px solid ${isActive ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: '0.02em',
          transition: 'all 150ms ease',
          background: isActive
            ? 'rgba(59,130,246,0.25)'
            : 'rgba(255,255,255,0.06)',
          color: isActive ? '#60A5FA' : '#6B7280',
          outline: 'none',
          boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.2)' : 'none',
          animation: isActive ? 'voicePulse 2s ease-in-out infinite' : 'none',
        }}
      >
        <MicIcon active={isActive} />
        {isActive ? 'Voice On' : 'Voice'}
        <style>{`
          @keyframes voicePulse {
            0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.2); }
            50% { box-shadow: 0 0 18px rgba(59,130,246,0.45); }
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
