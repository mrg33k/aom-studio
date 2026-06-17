// CvgChatSurface.jsx — CV6-styled live conversation surface for /cvg.
// Replaces the CV4 ChatPanel fallback when opening a conversation on /cvg.
//
// Responsibilities:
//   1. Message thread (user + assistant bubbles, CV6-styled, theme-aware)
//   2. Composer (textarea + send button, CV6-styled)
//   3. Step indicator (animated row showing assistant's current task)
//
// Props:
//   - worldId: string (for context routing)
//   - target: { type: 'agent'|'project', name, slug, project? }
//   - theme: 'light'|'dark' (inherited from parent, applied to data-theme)
//   - messages: array of { id, role: 'user'|'assistant', content, timestamp? }
//   - onSend: (text, attachments?) => void
//   - onBack: () => void
//   - busyStep: string|null (e.g., 'Thinking…', 'Reading files…', null when idle)
//
// Design system:
//   - All colors via var(--cv6-*) tokens (auto dark/light cascade via css)
//   - Typography: Inter (body) + Space Mono (mono labels)
//   - Message width: max 720px (comfortable reading)
//   - Padding/gaps: 14px card base, 8px section gaps
//
// Status: COMPLETE VISUAL SURFACE + DOCUMENTED PROPS
// Next agent must wire: Supabase message loading, streaming, send routing,
// and busyStep signals from the bridge. See "WIRING NEEDED" markers below.

import { useState, useRef, useEffect, useCallback } from 'react'

export default function CvgChatSurface({
  worldId,
  target,
  theme = 'light',
  messages = [],
  onSend,
  onBack,
  busyStep = null,
}) {
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Auto-scroll to bottom when messages change or busyStep updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busyStep])

  const handleSend = useCallback(() => {
    if (!input.trim() || isSending) return

    setIsSending(true)
    const text = input.trim()
    setInput('')

    // WIRING NEEDED: Pass to onSend handler; orchestrator will route
    // through chat-bridge or /api/dashboard/cvg-chat with model override
    // Model comes from parent (CornerVG) via onSend metadata, NOT hardcoded here
    if (onSend) {
      onSend(text, {
        worldId,
        target,
        // model override (if needed) set by parent/caller
      })
    }

    setIsSending(false)
  }, [input, isSending, onSend, worldId, target])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      data-cv6
      data-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--cv6-ground)',
        color: 'var(--cv6-text-primary)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 16,
        lineHeight: 1.5,
      }}
    >
      {/* ── Header: back button + target name ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderBottom: '1px solid var(--cv6-divider)',
          background: 'var(--cv6-surface)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            color: 'var(--cv6-text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--cv6-hover)'
            e.currentTarget.style.color = 'var(--cv6-text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--cv6-text-secondary)'
          }}
          title="Back"
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--cv6-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {target?.name || 'Conversation'}
          </h3>
          {target?.project && (
            <p
              style={{
                margin: 0,
                marginTop: 2,
                fontSize: 12,
                color: 'var(--cv6-text-tertiary)',
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {target.project}
            </p>
          )}
        </div>
      </div>

      {/* ── Message thread (scrollable) ── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '16px',
          background: 'var(--cv6-ground)',
        }}
      >
        {messages.length === 0 && !busyStep && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--cv6-text-tertiary)',
              textAlign: 'center',
              fontSize: 14,
            }}
          >
            <div>
              <p style={{ margin: '0 0 8px' }}>No messages yet.</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--cv6-text-secondary)' }}>
                Type below to start a conversation.
              </p>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 8,
            }}
          >
            <div
              style={{
                maxWidth: 'min(720px, 85%)',
                padding: '12px 14px',
                borderRadius: 8,
                background:
                  msg.role === 'user'
                    ? 'var(--cv6-accent-primary)'
                    : 'var(--cv6-surface)',
                border:
                  msg.role === 'user'
                    ? 'none'
                    : '1px solid var(--cv6-divider)',
                color:
                  msg.role === 'user'
                    ? 'white'
                    : 'var(--cv6-text-primary)',
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Step indicator (animated, shown while busyStep is truthy) */}
        {busyStep && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'var(--cv6-hover)',
              border: '1px solid var(--cv6-divider)',
              color: 'var(--cv6-text-secondary)',
              fontSize: 13,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {/* Pulsing dot */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--cv6-accent-primary)',
                flexShrink: 0,
                animation: 'cv6-chat-pulse 1.5s ease-in-out infinite',
              }}
            />
            <span>{busyStep}</span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer (textarea + send) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '14px 16px',
          borderTop: '1px solid var(--cv6-divider)',
          background: 'var(--cv6-surface)',
          flexShrink: 0,
        }}
      >
        {/* Character count / hint (optional, shown on focus) */}
        {/* WIRING NEEDED: Add paste chips, attachment previews, etc. here */}

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Shift+Enter for new line)"
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'var(--cv6-ground)',
              border: '1px solid var(--cv6-divider)',
              borderRadius: 6,
              color: 'var(--cv6-text-primary)',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.5,
              resize: 'none',
              minHeight: 44,
              maxHeight: 120,
              outline: 'none',
              transition: 'all 0.2s ease-out',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--cv6-accent-primary)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--cv6-divider)'
            }}
            disabled={isSending}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background:
                input.trim() && !isSending
                  ? 'var(--cv6-accent-primary)'
                  : 'var(--cv6-hover)',
              border: 'none',
              borderRadius: 6,
              color: input.trim() && !isSending ? '#ffffff' : 'var(--cv6-text-tertiary)',
              cursor: input.trim() && !isSending ? 'pointer' : 'not-allowed',
              fontSize: 18,
              fontWeight: 600,
              transition: 'all 0.2s ease-out',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isSending) {
                e.currentTarget.style.background = 'var(--cv6-accent-primary-hover)'
              }
            }}
            onMouseLeave={(e) => {
              if (input.trim() && !isSending) {
                e.currentTarget.style.background = 'var(--cv6-accent-primary)'
              }
            }}
            title={isSending ? 'Sending...' : 'Send'}
          >
            {isSending ? '⏳' : '→'}
          </button>
        </div>
      </div>

      {/* ── CSS animations (scoped to this component via data-cv6) ── */}
      <style>{`
        @keyframes cv6-chat-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

/**
 * ─── WIRING CHECKLIST FOR NEXT AGENT ───
 *
 * This component is a COMPLETE VISUAL SURFACE. To wire it live on /cvg:
 *
 * 1. MESSAGE LOADING (initial state)
 *    - Query Supabase `messages` table for the conversation
 *    - Filter by (conversation_id, world_id) from URL params
 *    - Pass as `messages` prop
 *    - Format: array of { id, role: 'user'|'assistant', content, timestamp? }
 *
 * 2. LIVE MESSAGE STREAMING (onSend)
 *    - Wire onSend handler to call `/api/dashboard/chat-bridge`
 *    - OR route through CornerVG's handleCvgChatSend + useChatSend hook
 *    - Pass model override: 'gemini-2.0-flash' (set in onSend callback above)
 *    - Set isSending = true while waiting; false on response
 *    - Append assistant message to messages array
 *
 * 3. STEP INDICATOR (busyStep)
 *    - Wire from bridge stream: watch message.metadata.step_status
 *    - Values: null | 'Thinking…' | 'Reading files…' | 'Writing…' (etc.)
 *    - Update busyStep prop as bridge emits steps
 *    - Set to null when message completes
 *
 * 4. TARGET ROUTING (target prop)
 *    - Extract from URL params (/cvg/project/:slug or /cvg/agent/:slug)
 *    - Shape: { type: 'agent'|'project', name, slug, project? }
 *    - Pass to onSend so bridge knows where to route the message
 *
 * 5. THEME INHERITANCE
 *    - Read from CornerVG's theme state
 *    - Pass as `theme` prop
 *    - CSS auto-applies dark tokens via [data-cv6][data-theme="dark"]
 *
 * Props are fully documented in the JSDoc header.
 * No inline styles require CSS vars — all use var(--cv6-*) which cascade correctly.
 */
