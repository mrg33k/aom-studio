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

// Attachment list for the kit Step Thread cards (images / video / file links),
// reusing the same extraction the bubble render uses. Token-agnostic (kit tokens).
function MessageAttachments({ msg }) {
  const atts = getAttachments(msg)
  const imgErr = msg.metadata?.image_error
  if (!atts.length && !imgErr) return null
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
             style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {att.name || 'Attachment'}
          </a>
        ) : null
      })}
      {imgErr && <div style={{ fontSize: 13, color: '#EF4444' }}>Image generation failed: {String(imgErr).slice(0, 200)}</div>}
    </div>
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
  // kit: wear the Claude-kit glass skin (nebula ground + light-frost cards) so the
  // chat matches every other mobile tool screen instead of reading as an old surface.
  // When true we force data-theme="glass" and alias the cv6 tokens to kit tokens
  // (see kit.css .cvg-kit). Desktop keeps the user's own theme (kit=false).
  kit = false,
  onSend,
  onBack,
  // previewMessages: preview/Storybook only — seed the thread directly and skip
  // Supabase so /cv6kit can render real bubbles with no auth. Undefined in production.
  previewMessages,
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
    // Preview/Storybook: render the given thread without touching Supabase.
    if (previewMessages) {
      setMessages(previewMessages)
      setLoading(false)
      return
    }
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
  }, [target?.slug, target?.type, worldId, target?.missionSlug, reloadKey, previewMessages])

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

  // ── KIT mode (mobile): render the live conversation in the Claude-kit Step
  // Thread design from the design system (corner/missions/corner-ui-cv6/
  // deliverables/design-system-2026-06-21/ui_kits/tools/chat.html).
  // A vertical timeline with goal line, progress bars, done/snag/decision/working/
  // upnext step cards, choice buttons, and a live composer.
  // Same data layer as the bubble render below; only the presentation differs.
  if (kit) {
    const headInitials = (target?.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'
    const statusLine = (isSending || awaitingReply) ? 'working · step' : 'working now'

    // Map real messages to step cards. Each step is built from message metadata
    // or rendered as a raw message if no metadata is present.
    const steps = messages
      .filter(m => !isHiddenLoopCue(m))
      .map((msg) => {
        const isUser = msg.role === 'user' || msg.agent === 'user' || msg.sender === 'user'
        return {
          id: msg.id,
          kind: isUser ? 'user' : 'assistant',
          title: (msg.text || msg.content || '').split('\n')[0].slice(0, 60),
          text: msg.text || msg.content || '',
          status: msg.metadata?.step_status || (isUser ? 'user' : 'message'),
          time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
          choices: msg.metadata?.choices || [],
          msg,
        }
      })

    // Count completed steps for progress bar
    const doneCount = steps.filter(s => s.status === 'done').length
    const totalSteps = Math.max(steps.length + (awaitingReply ? 1 : 0), 4)

    const stepIcon = (status) => {
      if (status === 'done') return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
      )
      if (status === 'snag') return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01" /><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>
      )
      if (status === 'working') return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 1.1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
      )
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
      )
    }

    const bgByStatus = (status) => {
      if (status === 'done') return 'var(--success-weak)'
      if (status === 'snag') return 'var(--warn-weak, rgba(251,191,36,.16))'
      if (status === 'working') return 'var(--accent-weak)'
      return 'var(--chip)'
    }

    return (
      <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
          @keyframes barGlow { 0% { margin-left: -40% } 100% { margin-left: 100% } }
          [data-cv6kit][data-theme="glass"] .cmr-content a, [data-cv6kit][data-theme="glass"] .message-content a { color: var(--accent); text-decoration-color: rgba(91,155,255,.4) }
          [data-cv6kit][data-theme="glass"] .cmr-content code, [data-cv6kit][data-theme="glass"] .message-content code { color: #e2e8f0; background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.08) }
          [data-cv6kit][data-theme="glass"] .cmr-content pre code, [data-cv6kit][data-theme="glass"] .message-content pre code { color: #cbd5e1 }
          [data-cv6kit][data-theme="glass"] .cmr-content blockquote, [data-cv6kit][data-theme="glass"] .message-content blockquote { color: rgba(243,244,246,.62); border-left-color: rgba(91,155,255,.5) }
        `}</style>

        {/* header — back + agent avatar + name + status */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px', borderBottom: '1px solid var(--divider)' }}>
          <div onClick={onBack} role="button" aria-label="Back" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </div>
          <div style={{ position: 'relative', flex: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{headInitials}</div>
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--ground)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{target?.name || 'Conversation'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusLine}</div>
          </div>
        </div>

        {/* thread — step timeline */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 8px' }}>
          {loading && <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--faint)', fontSize: 14 }}>Loading…</div>}

          {!loading && loadError && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>{loadError}</div>
              <button onClick={() => setReloadKey(k => k + 1)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Try again</button>
            </div>
          )}

          {!loading && !loadError && steps.length === 0 && !awaitingReply && (
            <div className="glassy" style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, fontSize: 13.5, color: 'var(--muted)' }}>No messages yet. Say hello.</div>
          )}

          {/* Goal line — title + progress bar */}
          {steps.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Goal</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.02em', color: 'var(--muted)', marginLeft: 'auto' }}>{doneCount} of {totalSteps}</span>
            </div>
          )}

          {/* Step nodes */}
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1
            return (
              <div key={step.id} style={{ position: 'relative', paddingLeft: 50, paddingBottom: 16 }}>
                {!isLast && <span style={{ position: 'absolute', left: 18, top: 38, bottom: -4, width: 2, background: 'var(--divider)' }} />}
                <div style={{ position: 'absolute', left: 0, top: 0, width: 38, height: 38, borderRadius: '50%', background: bgByStatus(step.status), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', zIndex: 1 }}>
                  {stepIcon(step.status)}
                </div>

                {step.kind === 'user' ? (
                  <div style={{ borderRadius: 14, padding: '12px 13px', background: 'var(--accent-weak)', border: '1px solid var(--accent-weak)' }}>
                    <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.5 }}>{step.text}</div>
                  </div>
                ) : (
                  <div className="glassy" style={{ borderRadius: 14, padding: '13px 16px', background: 'var(--surface)', border: '1px solid var(--hair)' }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{step.title}</div>
                    {step.text && step.text.length > step.title.length && (
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', marginTop: 3 }}>
                        {step.text.slice(step.title.length + 1)}
                      </div>
                    )}
                    {step.choices.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 11 }}>
                        {step.choices.map((choice, ci) => (
                          <div key={ci} style={{ borderRadius: 12, padding: '11px 12px', background: ci === 0 ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid ' + (ci === 0 ? 'var(--accent)' : 'var(--hair)'), cursor: 'pointer' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: ci === 0 ? '#fff' : 'var(--fg)' }}>{choice}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Working node */}
          {awaitingReply && (
            <div style={{ position: 'relative', paddingLeft: 50, paddingBottom: 16 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', zIndex: 1 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 1.1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
              </div>
              <div className="glassy" style={{ borderRadius: 14, padding: '12px 13px', background: 'var(--surface)', border: '1px solid var(--hair)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Working</span>
                  <span style={{ display: 'inline-flex', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: 'var(--accent)', background: 'var(--accent-weak)' }}>In progress</span>
                </div>
                {stepText && stepText !== 'Working…' && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)', marginTop: 4 }}>{stepText}</div>}
                <div style={{ marginTop: 11, height: 6, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ width: '40%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)', animation: 'barGlow 1.4s ease-in-out infinite' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* failed-send banner */}
        {sendError && (
          <div style={{ flex: 'none', padding: '0 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <span style={{ fontSize: 13, color: '#EF4444' }}>{sendError}</span>
              <button onClick={() => { if (lastFailedText) setInput(lastFailedText); setSendError(''); handleSend() }} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Retry</button>
            </div>
          </div>
        )}

        {/* composer */}
        <div style={{ flex: 'none', borderTop: '1px solid var(--divider)', padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ground)' }}>
          <button style={{ width: 42, height: 42, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: 'var(--ring-accent)', cursor: 'pointer' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5c.8-1.2 4.2-1.2 5 0" /></svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Nudge ${target?.name || 'the agent'}, or jump in…`}
            disabled={isSending}
            rows={1}
            style={{ flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', padding: '11px 14px', fontSize: 14, fontFamily: 'var(--font-sans)', lineHeight: 1.4, resize: 'none', outline: 'none' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || isSending} aria-label="Send" style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: (input.trim() && !isSending) ? 'var(--accent)' : 'var(--surface-2)', color: (input.trim() && !isSending) ? '#fff' : 'var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: (input.trim() && !isSending) ? 'pointer' : 'not-allowed' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        </div>
      </div>
    )
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
            {/* Shrink-wrap the bubble and cap it at 85% of the ROW (this column is a
                direct flex child of the row, so the % resolves against full width).
                The previous flex:0 gave the user column a 0% basis, so the bubble's
                own 85% maxWidth collapsed to one character per line. alignItems puts
                the bubble on its correct side; the bubble fills this capped column. */}
            <div style={{ flex: '0 1 auto', minWidth: 0, maxWidth: 'min(680px, 85%)', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
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
                  maxWidth: '100%',
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

 {/* Step indicator, shows the assistant's current step while it works */}
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