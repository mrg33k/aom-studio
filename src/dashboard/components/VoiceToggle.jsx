// VoiceToggle.jsx
// Small pill toggle: "Chat | Voice"
// Lives in the chat header. Switches between text input and VoiceChat.

import React from 'react'

export default function VoiceToggle({ mode, onChange, disabled }) {
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
