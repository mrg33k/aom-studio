// useChatSend -- all send paths for ChatPanel.
// Owns the send-idempotency refs (no overlapping sends, no same-text
// double-submits within 2s), the reply-to chip ref mirror, and the three
// send entry points: handleSend (keyboard default for agent chat),
// sendAgentText (voice-friendly), sendProjectText / handleProjectSend /
// handleProjectKeyDown (project chat). All three paths POST to
// /api/dashboard/chat-bridge and open an SSE stream on success.
//
// R3b: dropped the sendAgentTextRef/sendProjectTextRef input params —
// the shell populates those refs from the returned callbacks so the
// attach/recording hooks that consume the refs stay decoupled from Send.
import { useCallback, useEffect, useRef } from 'react'

export default function useChatSend({
  input,
  setInput,
  sending,
  setSending,
  selectedAgent,
  selectedProject,
  worldId,
  userIdentity,
  inputRef,
  setMessages,
  pendingAttachmentsRef,
  setPendingAttachments,
  replyTo,
  setReplyTo,
  setAgentPreviews,
  startBridgeStream,
  onMessageSent,
}) {
  // ── Idempotency refs (block overlap + same-text within 2s) ───────────────
  const inFlightSendRef = useRef(false)
  const lastSendSigRef = useRef({ sig: '', ts: 0 })

  // Ref mirror of replyTo so handlers don't need it in their deps lists.
  const replyToRef = useRef(null)
  useEffect(() => { replyToRef.current = replyTo }, [replyTo])

  // ── handleSend: text-input default for agent chat ─────────────────────────
  const handleSend = useCallback(async () => {
    const rawText = input.trim()
    if (!rawText || sending || !selectedAgent) return
    const cleanText = rawText
    const attSnapshot = pendingAttachmentsRef.current
    const sig = `${selectedAgent.slug}:${cleanText}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (inFlightSendRef.current) return
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const replySnap = replyToRef.current
    const quotePrefix = replySnap?.snippet
      ? `> ${replySnap.type === 'task' ? `Re: task "${replySnap.label || ''}"` : 'Re'}: "${replySnap.snippet.length > 240 ? replySnap.snippet.slice(0, 237) + '…' : replySnap.snippet}"\n\n`
      : ''
    const text = quotePrefix + cleanText + attSuffix
    setInput('')
    if (attSnapshot.length) setPendingAttachments([])
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)
    if (replySnap) setReplyTo(null)

    // Optimistic user message
    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: 'corner-dashboard',
      ...(replySnap?.type === 'message' ? { reply_to: replySnap.id } : {}),
    }])

    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: {
        agent: selectedAgent.slug,
        text: previewText,
        timestamp: now,
        id: tempUserId,
        isUnread: false,
      },
    }))

    try {
      const bridgeResult = await fetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: selectedAgent.slug,
          message: text,
          room: selectedAgent.slug,
          project: '',
          client_id: worldId,
          ...userIdentity,
          ...(replySnap?.type === 'message' ? { reply_to: replySnap.id } : {}),
          ...(replySnap ? { metadata: { reply_to_kind: replySnap.type, reply_to_id: replySnap.id } } : {}),
        }),
      }).then(r => r.json()).catch(() => null)
      if (bridgeResult?.messageId) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: bridgeResult.messageId } : m))
        if (!bridgeResult.fallback) {
          startBridgeStream(bridgeResult.messageId, selectedAgent.slug)
        }
      }
      onMessageSent?.()
    } catch (err) {
      console.error('[ChatPanel] send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [input, sending, selectedAgent, worldId, userIdentity, setInput, setSending, setMessages, setPendingAttachments, setReplyTo, setAgentPreviews, startBridgeStream, pendingAttachmentsRef, inputRef, onMessageSent])

  // ── sendAgentText: programmatic (voice transcription) ────────────────────
  const sendAgentText = useCallback(async (rawText) => {
    if (!rawText?.trim() || !selectedAgent || !worldId) return
    const attSnapshot = pendingAttachmentsRef.current
    const trimmed = rawText.trim()
    if (!trimmed) return
    const sig = `${selectedAgent.slug}:${trimmed}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (inFlightSendRef.current) return
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const replySnap = replyToRef.current
    const quotePrefix = replySnap?.snippet
      ? `> ${replySnap.type === 'task' ? `Re: task "${replySnap.label || ''}"` : 'Re'}: "${replySnap.snippet.length > 240 ? replySnap.snippet.slice(0, 237) + '…' : replySnap.snippet}"\n\n`
      : ''
    const text = quotePrefix + trimmed + attSuffix
    if (attSnapshot.length) setPendingAttachments([])
    if (replySnap) setReplyTo(null)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)
    const now = new Date().toISOString()
    const tempUserId = `temp-user-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: 'corner-dashboard',
      ...(replySnap?.type === 'message' ? { reply_to: replySnap.id } : {}),
    }])
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: { agent: selectedAgent.slug, text: previewText, timestamp: now, id: tempUserId, isUnread: false },
    }))
    try {
      const bridgeResult = await fetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: selectedAgent.slug,
          message: text,
          room: selectedAgent.slug,
          project: '',
          client_id: worldId,
          ...userIdentity,
          ...(replySnap?.type === 'message' ? { reply_to: replySnap.id } : {}),
          ...(replySnap ? { metadata: { reply_to_kind: replySnap.type, reply_to_id: replySnap.id } } : {}),
        }),
      }).then(r => r.json()).catch(() => null)
      if (bridgeResult?.messageId) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: bridgeResult.messageId } : m))
        if (!bridgeResult.fallback) {
          startBridgeStream(bridgeResult.messageId, selectedAgent.slug)
        }
      }
      onMessageSent?.()
    } catch (err) {
      console.error('[ChatPanel] agent send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [selectedAgent, worldId, userIdentity, startBridgeStream, setInput, setSending, setMessages, setPendingAttachments, setReplyTo, setAgentPreviews, pendingAttachmentsRef, inputRef, onMessageSent])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ── sendProjectText: project chat send path ──────────────────────────────
  const sendProjectText = useCallback(async (rawText) => {
    if (!rawText?.trim() || !selectedProject || !worldId) return
    const trimmed = rawText.trim()
    // R6: the project chat pseudo-agent ('project:<slug>') is dead. Project
    // messages now go out as agent='elon' with project=<slug> so Elon's
    // tmux listener routes them and his queue-task.py can auto-pick the
    // right repo. agentKey is still used for the temp optimistic message so
    // the fetch/subscribe filters below can find it during the swap.
    const agentKey = 'elon'
    const projectSlug = selectedProject.slug
    const attSnapshot = pendingAttachmentsRef.current
    const sig = `${agentKey}:${trimmed}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (inFlightSendRef.current) return
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const replySnap = replyToRef.current
    const quotePrefix = replySnap?.snippet
      ? `> ${replySnap.type === 'task' ? `Re: task "${replySnap.label || ''}"` : 'Re'}: "${replySnap.snippet.length > 240 ? replySnap.snippet.slice(0, 237) + '…' : replySnap.snippet}"\n\n`
      : ''
    const text = quotePrefix + trimmed + attSuffix
    if (attSnapshot.length) setPendingAttachments([])
    if (replySnap) setReplyTo(null)
    setSending(true)
    const projectClientId = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    const now = new Date().toISOString()
    const tempUserId = `temp-proj-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: agentKey,
      text,
      timestamp: now,
      source: 'corner-dashboard',
      ...(replySnap?.type === 'message' ? { reply_to: replySnap.id } : {}),
    }])

    try {
      const bridgeResult = await fetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentKey,
          message: text,
          room: `project:${projectSlug}`,
          project: projectSlug,
          client_id: projectClientId,
          ...userIdentity,
          ...(replySnap?.type === 'message' ? { reply_to: replySnap.id } : {}),
          ...(replySnap ? { metadata: { reply_to_kind: replySnap.type, reply_to_id: replySnap.id } } : {}),
        }),
      }).then(r => r.json()).catch(() => null)
      if (bridgeResult?.messageId) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: bridgeResult.messageId } : m))
        if (!bridgeResult.fallback) {
          startBridgeStream(bridgeResult.messageId, agentKey)
        }
      }
      onMessageSent?.()
    } catch (err) {
      console.error('[ChatPanel] project send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [selectedProject, worldId, userIdentity, startBridgeStream, setSending, setMessages, setPendingAttachments, setReplyTo, pendingAttachmentsRef, inputRef, onMessageSent])

  const handleProjectSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendProjectText(text)
  }, [input, sending, sendProjectText, setInput, inputRef])

  const handleProjectKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleProjectSend() }
  }, [handleProjectSend])

  return {
    inFlightSendRef, lastSendSigRef,
    replyToRef,
    handleSend, handleKeyDown,
    sendAgentText,
    sendProjectText,
    handleProjectSend, handleProjectKeyDown,
  }
}
