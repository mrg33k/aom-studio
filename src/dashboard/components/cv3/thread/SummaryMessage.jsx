// SummaryMessage — compact dimmed rendering for agent note-to-self (Acked / summary) replies.
// Distinct from the main chat bubble so users can tell the answer from the agent's internal note.
import React from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime } from '../shared.jsx'
import ChatMessageRenderer from '../../ChatMessageRenderer.jsx'

export default function SummaryMessage({ msg, floatStyle }) {
  return (
    <div
      data-testid="summary-message"
      data-message-id={msg.id}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        paddingLeft: 38,
        marginBottom: 4,
        ...floatStyle,
      }}
    >
      <div style={{
        maxWidth: '80%',
        borderLeft: '2px solid rgba(148,163,184,0.12)',
        paddingLeft: 10,
        opacity: 0.5,
      }}>
        <span style={{
          display: 'inline-block',
          fontSize: 8,
          fontWeight: 800,
          color: C.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 3,
        }}>
          note
        </span>
        <div style={{
          fontSize: 12,
          lineHeight: 1.5,
          color: C.text2,
          wordBreak: 'break-word',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '-0.01em',
        }}>
          <ChatMessageRenderer
            content={msg.text}
            style={{ fontSize: 12, lineHeight: 1.5, color: C.text2 }}
          />
        </div>
        <div style={{
          fontSize: 10,
          color: 'rgba(120,140,165,0.3)',
          marginTop: 2,
          fontFamily: "'Inter', sans-serif",
        }}>
          {formatChatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}
