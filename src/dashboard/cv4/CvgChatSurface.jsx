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
import { authFetch } from '../lib/authFetch.js'
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx'

// chat-4 / parity: pull image + file attachments off a message the same way the
// cv4 thread does — explicit metadata.attachments[] first, then the single
// metadata.attachment, then the top-level attachment_url column.
// Filter to entries that are objects with usable string url/name fields to prevent
// crashes on malformed entries (undefined.startsWith crashes the render).
function getAttachments(msg) {
  const meta = (msg && msg.metadata) || {}
  if (Array.isArray(meta.attachments) && meta.attachments.length) {
    return meta.attachments.filter(a => a && typeof a === 'object' && (typeof a.url === 'string' || typeof a.name === 'string'))
  }
  if (meta.attachment && meta.attachment.url) return [meta.attachment]
  if (msg && msg.attachment_url) return [{ url: msg.attachment_url, mime: msg.file_mime_type, name: msg.file_name }]
  return []
}

function isImageAtt(att) {
  if (!att) return false
  if (att.mime && String(att.mime).startsWith('image/')) return true
  const urlOrName = String(att.url || att.name || '')
  return /\.(png|jpe?g|gif|webp|svg|bmp|heic)$/i.test(urlOrName)
}

// An image attachment that, if it fails to load (dead URL, failed generation),
// shows a clear in-conversation message instead of a silent broken icon. chat-4.
function ChatImageAttachment({ att }) {
  const [broken, setBroken] = useState(false)
  if (broken || !att.url) {
    return (
      <div style={{
        fontSize: 13, color: '#EF4444', padding: '10px 12px',
        border: '1px solid var(--cv6-divider)', borderRadius: 8,
        background: 'var(--cv6-surface)',
      }}>
        We couldn't show this image. The image may have failed to generate.
      </div>
    )
  }
  return (
    <img
      src={att.url}
      alt={att.name || 'image'}
      onError={() => setBroken(true)}
      onClick={() => { if (typeof att.url === 'string') window.open(att.url, '_blank', 'noopener') }}
      style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, display: 'block', cursor: 'pointer' }}
    />
  )
}

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
  if (!m || !m.metadata) return false
  // view-1: steer-control rows are not chat — never render them.
  if (m.metadata.view_command) return true
  return !!(m.role === 'user' && m.metadata.master_loop)
}

// Lightweight inline markdown for chat bubbles. HTML is escaped first, then only
// our own controlled tags are injected, so this is safe for user + AI text.
// Handles `code`, **bold**, *italic*. Newlines are kept via whiteSpace:pre-wrap.
function renderInlineMarkdown(text) {
  if (!text) return ''
  let s = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  s = s.replace(/`([^`]+)`/g, '<code style="font-family:\'Space Mono\',monospace;font-size:0.9em;background:var(--cv6-hover);padding:1px 4px;border-radius:3px">$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  return s
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
  // Step indicator: while a turn is in flight we show the assistant's current
  // step (real step events from /api/dashboard/message-steps), or "Working…".
  const [awaitingReply, setAwaitingReply] = useState(false)
  const [stepText, setStepText] = useState('')
  const [loadError, setLoadError] = useState('')   // chat-2: surface a failed load
  const [sendError, setSendError] = useState('')   // chat-1: surface a failed send
  const [reloadKey, setReloadKey] = useState(0)     // bump to retry loadHistory
  const [lastFailedText, setLastFailedText] = useState('') // chat-1: retry payload

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
    setLoadError('')

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

          if (error) throw error
          const filtered = (data || [])
            .reverse()
            .filter(m => !isHiddenLoopCue(m))
          setMessages(filtered)
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

          if (error) throw error
          const filtered = (data || [])
            .filter(matchesMission)
            .reverse()
          setMessages(filtered)
        }
      } catch (e) {
        console.error('[CvgChatSurface] load history error', e)
        setLoadError('We could not load this conversation.')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [target?.slug, target?.type, worldId, target?.missionSlug, reloadKey])

  // Real-time subscription
  useEffect(() => {
    if (!target || !worldId || !supabase) return

    let active = true
    let channel = null

    const handleInsert = (payload) => {
      const msg = payload.new
      if (!msg || !msg.id) return
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

      // An assistant reply ends the in-flight turn → hide the step indicator.
      const isUserMsg = msg.role === 'user' || msg.agent === 'user' || msg.sender === 'user'
      if (!isUserMsg) {
        setAwaitingReply(false)
        setStepText('')
      }
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

  // Step indicator: while awaiting a reply, poll the real step events for this
  // surface and show the assistant's current step. Service-role proxied endpoint
  // (events table has RLS). Falls back to "Working…" until a step lands. A 60s
  // safety net clears the indicator if no reply ever arrives.
  useEffect(() => {
    if (!awaitingReply || !worldId) return
    let active = true
    const qs = new URLSearchParams({ client_id: worldId, limit: '20' })
    if (target?.type === 'agent') qs.set('agent', target.slug)
    else if (target?.type === 'project') qs.set('project', target.slug)

    const poll = async () => {
      if (!active) return
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      try {
        const r = await authFetch(`/api/dashboard/message-steps?${qs.toString()}`, { signal: controller.signal })
        if (!r.ok || !active) return
        const d = await r.json()
        const steps = Array.isArray(d.steps) ? d.steps : []
        // Latest in-progress step wins; else latest step text.
        const sorted = steps.slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        const live = sorted.find(s => s.status === 'in_progress') || sorted[0]
        if (active && live && live.text) setStepText(live.text)
      } catch (e) {
        // Ignore aborts; keep last step text
        if (e?.name !== 'AbortError') { /* keep last */ }
      } finally {
        clearTimeout(timeoutId)
      }
    }
    poll()
    const t = setInterval(poll, 2000)
    const safety = setTimeout(() => { if (active) { setAwaitingReply(false); setStepText('') } }, 60000)
    return () => { active = false; clearInterval(t); clearTimeout(safety) }
  }, [awaitingReply, worldId, target?.slug, target?.type])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return

    const text = input.trim()
    setInput('')
    setIsSending(true)
    setAwaitingReply(true)
    setStepText('Working…')
    setSendError('')

    try {
      // Call parent's onSend handler with the target + text
      // Parent is CornerVG.handleCvgChatSend, which routes to chat-bridge or supabase-messages
      if (onSend) {
        await onSend(target, text)
      }
      setLastFailedText('')
    } catch (e) {
      console.error('[CvgChatSurface] send failed', e)
      // chat-1: don't lose the message or hang the indicator — surface it + offer retry.
      setSendError("Your message didn't send.")
      setLastFailedText(text)
      setInput(text)
      setAwaitingReply(false)
      setStepText('')
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
          gap: 0,
          padding: '24px',
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

        {!loading && loadError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', fontSize: 14 }}>
            <div>
              <p style={{ margin: '0 0 10px', color: 'var(--cv6-text-secondary)' }}>{loadError}</p>
              <button onClick={() => setReloadKey(k => k + 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Try again</button>
            </div>
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
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

          // Extract sender name and format timestamp
          const senderName = msg.sender_display || msg.sender || msg.agent || 'Assistant'
          const timestamp = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            : ''

          return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
              gap: 8,
              marginBottom: 14,
            }}
          >
            {!isUser && (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--cv6-accent-success)',
                  color: 'var(--cv6-ground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {senderName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flex: isUser ? 0 : 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!isUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cv6-text-primary)' }}>
                    {senderName}
                  </span>
                  {timestamp && (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--cv6-text-tertiary)' }}>
                      {timestamp}
                    </span>
                  )}
                </div>
              )}
              <div
                /* Assistant bubbles are surface-coloured, so on the light-glass theme
                   they inherit the on-photo WHITE text token and render white-on-white
                   (illegible). Tagging the bubble as a card pulls it into the approved
                   glass-card rule (cv6.css) that flips text to dark on light surfaces —
                   same treatment every other card already uses. User bubbles ride the
                   accent fill + white text, so they stay untagged. */
                data-cv6-card={!isUser ? '' : undefined}
                style={{
                  maxWidth: 'min(680px, 85%)',
                  padding: isUser ? '11px 15px' : '12px 15px',
                  borderRadius: isUser ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
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
                  fontSize: isUser ? '14.5px' : '15px',
                  lineHeight: '1.62',
                  wordBreak: 'break-word',
                }}
              >
                {/* CV4 chat renderer: clean markdown (lists, bold, links), no raw symbols */}
                {(msg.text || msg.content) && <ChatMessageRenderer content={msg.text || msg.content} />}
                {/* chat-4 / parity: render image + file attachments, and surface a
                    failed image as a clear message instead of nothing. */}
                {(() => {
                  const atts = getAttachments(msg)
                  const imgErr = msg.metadata?.image_error
                  if (!atts.length && !imgErr) return null
                  return (
                    <div style={{ marginTop: (msg.text || msg.content) ? 8 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {atts.map((att, i) => {
                        const urlOrName = String(att.url || att.name || '')
                        const isVideo = (att.mime || '').startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(urlOrName)
                        if (isImageAtt(att)) return <ChatImageAttachment key={i} att={att} />
                        if (isVideo && att.url) return (
                          <video key={i} controls preload="metadata" src={att.url}
                                 style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, display: 'block', background: '#000' }} />
                        )
                        return att.url ? (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer"
                             style={{ fontSize: 13, color: isUser ? 'white' : 'var(--cv6-accent-primary)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                            {att.name || 'Attachment'}
                          </a>
                        ) : null
                      })}
                      {imgErr && (
                        <div style={{ fontSize: 13, color: '#EF4444' }}>
                          Image generation failed: {String(imgErr).slice(0, 200)}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
          )
        })}

        {/* Step indicator — shows the assistant's current step while it works */}
        {awaitingReply && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, marginBottom: 14 }}>
            <div
              data-cv6-card=""
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                maxWidth: 'min(680px, 85%)', padding: '14px 15px', borderRadius: '18px 18px 18px 5px',
                background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)',
                color: 'var(--cv6-text-secondary)', fontSize: 14, lineHeight: '1.5',
              }}
            >
              <span style={{ display: 'inline-flex', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cv6-accent-primary)', animation: 'cv6-step-bounce 1.2s ease-in-out infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cv6-accent-primary)', animation: 'cv6-step-bounce 1.2s ease-in-out 0.2s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cv6-accent-primary)', animation: 'cv6-step-bounce 1.2s ease-in-out 0.4s infinite' }} />
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stepText || 'Working…'}</span>
            </div>
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
        {/* chat-1: a failed send shows here with a one-tap retry; the text is also restored to the box. */}
        {sendError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)' }}>
            <span style={{ fontSize: 13, color: '#EF4444' }}>{sendError}</span>
            <button onClick={() => { if (lastFailedText) { setInput(lastFailedText); } setSendError(''); handleSend(); }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>Retry</button>
          </div>
        )}

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
              borderRadius: 22,
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
              borderRadius: 22,
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
        @keyframes cv6-step-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
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
