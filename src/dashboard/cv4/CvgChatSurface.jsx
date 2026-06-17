// CvgChatSurface.jsx — CV6-styled live conversation surface for /cvg.
// Live-wired to Supabase for real-time message streaming.
//
// Responsibilities:
//   1. Load conversation history from Supabase (agent or project thread)
//   2. Live-subscribe to message INSERTs + UPDATEs for the target
//   3. Message thread (user + assistant bubbles, CV6-styled, theme-aware)
//   4. Composer (textarea + send button, CV6-styled)
//   5. Step indicator (animated row showing assistant's current task)
//
// Props:
//   - worldId: string (for context routing)
//   - target: { type: 'agent'|'project', name, slug, project?, missionSlug? }
//   - theme: 'light'|'dark' (inherited from parent, applied to data-theme)
//   - onSend: (sel, text) => Promise<void> (called by parent, e.g. handleCvgChatSend)
//   - onBack: () => void
//
// Design system:
//   - All colors via var(--cv6-*) tokens (auto dark/light cascade via css)
//   - Typography: Inter (body) + Space Mono (mono labels)
//   - Message width: max 720px (comfortable reading)
//   - Padding/gaps: 14px card base, 8px section gaps

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// Helper: filter messages by mission scope (same logic as cv3 useChatMessages)
function makeMissionMatcher(missionSlug) {
  return (m) => {
    const tag = (m && m.metadata && m.metadata.mission_slug) || ''
    if (missionSlug) {
      // Show messages tagged for this mission, OR untagged room-level messages.
      // Replies from the bridge may arrive untagged; dropping them left the
      // thread empty even though the send succeeded. Tagged-for-another-mission
      // messages are still excluded (they carry that mission's tag).
      if (!tag) return true
      return tag === missionSlug || tag.endsWith(':' + missionSlug)
    }
    return !tag
  }
}

// Helper: drop messages with hidden master-loop metadata
function isHiddenLoopCue(m) {
  return !!(m && m.role === 'user' && m.metadata && m.metadata.master_loop)
}

export default function CvgChatSurface({
  worldId,
  target,
  theme = 'light',
  onSend,
  onBack,
}) {
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load message history on mount or when target changes
  useEffect(() => {
    if (!target || !worldId || !supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    setMessages([])

    const loadHistory = async () => {
      try {
        if (target.type === 'agent') {
          // Load agent thread: agent=target.slug, no project, not hidden loop cues
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('client_id', worldId)
            .eq('agent', target.slug)
            .or('project.is.null,project.eq.')
            .order('timestamp', { ascending: false })
            .limit(200)

          if (!error && data) {
            const filtered = data
              .reverse()
              .filter(m => !isHiddenLoopCue(m))
            setMessages(filtered)
          }
        } else if (target.type === 'project') {
          // Load project chat: project=target.slug OR agent=project:target.slug
          // Support both owner (worldId) and shared (shared:slug) channels
          const sharedCid = `shared:${target.slug}`
          const clientIds = worldId === sharedCid ? [sharedCid] : [worldId, sharedCid]
          const matchesMission = makeMissionMatcher(target.missionSlug)

          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .in('client_id', clientIds)
            .or(`project.eq.${target.slug},agent.eq.project:${target.slug}`)
            .order('timestamp', { ascending: false })
            .limit(400)

          if (!error && data) {
            const filtered = data
              .filter(matchesMission)
              .reverse()
            setMessages(filtered)
          }
        }
      } catch (e) {
        console.error('[CvgChatSurface] load history error', e)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [target?.slug, target?.type, worldId, target?.missionSlug])

  // Real-time subscription
  useEffect(() => {
    if (!target || !worldId || !supabase) return

    let active = true
    let channel = null

    const handleInsert = (payload) => {
      const msg = payload.new
      if (!active) return
      if (msg.client_id !== worldId) return
      if (isHiddenLoopCue(msg)) return

      if (target.type === 'agent') {
        // Agent thread: filter on agent + no project
        if (msg.agent !== target.slug) return
        if (msg.project) return
      } else if (target.type === 'project') {
        // Project chat: filter on project OR legacy agent=project:slug
        const isLegacy = msg.agent === `project:${target.slug}`
        const isCurrent = msg.project === target.slug
        if (!isLegacy && !isCurrent) return

        // Mission filtering
        const matchesMission = makeMissionMatcher(target.missionSlug)
        if (!matchesMission(msg)) return
      }

      // Dedup + add
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }

    const handleUpdate = (payload) => {
      const msg = payload.new
      if (!msg?.id || !active) return
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
    }

    // Set up subscription
    channel = supabase
      .channel(`cvg-chat-${worldId}-${target.slug}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        handleInsert,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
        handleUpdate,
      )
      .subscribe()

    return () => {
      active = false
      if (channel) {
        try { supabase.removeChannel(channel) } catch (_) {}
      }
    }
  }, [target?.slug, target?.type, worldId, target?.missionSlug])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return

    const text = input.trim()
    setInput('')
    setIsSending(true)

    try {
      // Call parent's onSend handler with the target + text
      // Parent is CornerVG.handleCvgChatSend, which routes to chat-bridge or supabase-messages
      if (onSend) {
        await onSend(target, text)
      }
    } catch (e) {
      console.error('[CvgChatSurface] send failed', e)
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, onSend, target])

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
        {loading && (
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
              <p style={{ margin: 0 }}>Loading conversation…</p>
            </div>
          </div>
        )}

        {!loading && messages.length === 0 && (
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
        {messages.map((msg) => {
          // Messages mark the sender via role OR agent ('user') depending on the
          // write path (supabase-messages sets role:'user'; chat-bridge stores the
          // user turn with agent='user'). Treat either as the user bubble.
          const isUser = msg.role === 'user' || msg.agent === 'user' || msg.sender === 'user'
          return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
              gap: 8,
            }}
          >
            <div
              style={{
                maxWidth: 'min(720px, 85%)',
                padding: '12px 14px',
                borderRadius: 8,
                background:
                  isUser
                    ? 'var(--cv6-accent-primary)'
                    : 'var(--cv6-surface)',
                border:
                  isUser
                    ? 'none'
                    : '1px solid var(--cv6-divider)',
                color:
                  isUser
                    ? 'white'
                    : 'var(--cv6-text-primary)',
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {/* Messages from Supabase have .text field, not .content */}
              {msg.text || msg.content}
            </div>
          </div>
          )
        })}

        {/* Step indicator — FUTURE: will render busyStep from bridge stream */}

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
 * ─── WIRING STATUS ───
 *
 * LIVE WIRED (R1):
 * ✓ MESSAGE LOADING — Supabase queries for both agent + project threads
 * ✓ LIVE STREAMING — Realtime subscriptions on INSERT + UPDATE
 * ✓ SEND ROUTING — onSend handler passed to parent (CornerVG.handleCvgChatSend)
 * ✓ MISSION FILTERING — Project chats support mission-scope isolation
 * ✓ THEME INHERITANCE — theme prop applied to [data-cv6] root
 *
 * REMAINING (future rounds):
 * - STEP INDICATOR / busyStep — Wire bridge stream for animated step display
 * - MESSAGE OPTIMISM — Add temp/bridge-stream message prefixes like cv3
 * - ATTACHMENTS — Wire file upload + preview rendering
 *
 * Note: The busyStep prop was removed from the signature since we're not yet
 * streaming bridge updates. When steps are wired, add it back and connect
 * to the events table subscription (event_type='message_step').
 */
