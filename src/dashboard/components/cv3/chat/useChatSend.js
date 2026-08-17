// useChatSend -- all send paths for ChatPanel.
// Owns the send-idempotency refs (no same-text double-submits within 2s),
// the reply-to chip ref mirror, and the three
// send entry points: handleSend (keyboard default for agent chat),
// sendAgentText (voice-friendly), sendProjectText / handleProjectSend /
// handleProjectKeyDown (project chat). All three paths POST to
// /api/dashboard/chat-bridge and open an SSE stream on success.
//
// R-send-lock (corner:dashboard-speed, 2026-06-12): sends are NON-BLOCKING.
// The composer used to lock on `sending`/`inFlightSendRef` for the full
// chat-bridge POST round trip — and that POST blocks on the local bridge
// daemon's ack (BRIDGE_TIMEOUT 3s + overhead ≈ 3-4s on a slow lane). Any
// Enter inside the window was silently dropped: the user typed, pressed
// send, nothing rendered, and the message sat in the composer until they
// pressed again ("you almost think it's not sending then it pops in").
// Now every send fires immediately with its own optimistic bubble and temp
// id; only the same-text-within-2s dedup remains as double-submit
// protection. Overlapping POSTs are safe — the bridge already queues turns
// per room, and the realtime INSERT swap matches temps by role+text.
//
// R3b: dropped the sendAgentTextRef/sendProjectTextRef input params —
// the shell populates those refs from the returned callbacks so the
// attach/recording hooks that consume the refs stay decoupled from Send.
import { useCallback, useEffect, useRef } from 'react'
import { useCornerData, useCornerNav } from '../../../CornerContext.jsx'
import { authFetch } from '../../../lib/authFetch.js'
import { bumpContextMeter } from '../session/ContextFullnessMeter.jsx'
import { getProjectEA } from '../../../data/project-ea.js'

// corner:gemini-workers R10 — /cvg is the Gemini workbench surface. Every
// send from /cvg carries an explicit model override so the room bridge runs
// the turn on the Gemini lane regardless of the room's saved model pref.
// The live /dashboard surface sends no override and rides the saved prefs.
function cvgModelOverride() {
  // Gemini turned OFF for cost (2026-06-22, corner:corner-ui-cv6). No override —
  // every surface rides the room's saved Claude pref. Rebuild the Gemini lane
  // later per corner/missions/corner-ui-cv6/GEMINI-WIRING-PRESERVED.md.
  return {}
}

// Wraps an email into a Mail Room context block prepended to the user's
// message. The EA reads this and understands: "this is what we're replying
// to. Use the /api/dashboard/mail/send tool when the user confirms send."
function buildMailContext(email) {
  if (!email) return ''
  const from = email.from?.name
    ? `${email.from.name} <${email.from.email}>`
    : (email.from?.email || '(unknown)')
  const subject = email.subject || '(no subject)'
  const snippet = email.snippet || ''
  return [
 '[Mail Room context, the user wants to reply to this email]',
    `From: ${from}`,
    `Subject: ${subject}`,
    `Gmail-ID: ${email.id}`,
    email.threadId ? `Thread-ID: ${email.threadId}` : null,
    '',
    snippet ? `Preview: ${snippet}` : null,
    '',
 'Draft a reply with the user. When they say "send it" or "looks good, send", call /api/dashboard/mail/send with the resulting body. Always end with their signature (the server appends it automatically).',
    '---',
    '',
  ].filter(v => v !== null).join('\n')
}

// fallow-ignore-next-line complexity
const buildReplyMeta = (snap) => snap?.type === 'message' ? {
  message_id: snap.id,
  snippet: snap.snippet || null,
  sender: snap.label || null,
  attachment_kind: snap.attachment_kind || null,
  attachment_url: snap.attachment_url || null,
} : null

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
  pasteChipsRef,
  clearPasteChips,
  selectedImageTool,
  setSelectedImageTool,
}) {
  // R14e-3: read agents from CornerContext so sendProjectText can resolve the
  // EA slug from role flags instead of hardcoding 'elon'. Read here (not
  // threaded via props) to keep all R14e-3 surface area inside cv3/chat/.
  const { agents } = useCornerData()
  // CV4 Mail Room (corner:cv4-tools-mail R1): read selectedMail from
  // CornerNav so handleSend can prepend the email context. Cleared on send.
  const { activeTool, selectedMail, setSelectedMail } = useCornerNav()
  // ── Idempotency refs ──────────────────────────────────────────────────────
  // inFlightSendRef is informational only (R-send-lock) — it no longer gates
  // sends. lastSendSigRef blocks same-text double-submits within 2s.
  const inFlightSendRef = useRef(false)
  const lastSendSigRef = useRef({ sig: '', ts: 0 })
  const lastSentRef = useRef('')
  // Temp ids carry a random suffix so two sends in the same millisecond
  // (possible now that sends overlap) can't collide.
  const makeTempId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Ref mirror of replyTo so handlers don't need it in their deps lists.
  const replyToRef = useRef(null)
  useEffect(() => { replyToRef.current = replyTo }, [replyTo])

  // Ref mirror of selectedMail — keeps handleSend out of its deps list.
  const selectedMailRef = useRef(null)
  useEffect(() => { selectedMailRef.current = (activeTool === 'mail' ? selectedMail : null) }, [activeTool, selectedMail])

  // ── Image-gen branch ──────────────────────────────────────────────────────
  // When the user has selected an image tool in the composer (ImageGenPicker),
  // send paths short-circuit here instead of POSTing to chat-bridge. Posts to
  // /api/dashboard/image-gen with { tool, prompt, agent, project, client_id },
  // shows an optimistic user message, then appends the result image as an
  // assistant message when the response comes back. Clears the tool selection
  // either way so the next message goes through the normal chat path.
  const runImageGen = useCallback(async ({ tool, prompt, agentKey, projectSlug, clientId }) => {
    if (!prompt?.trim() || !tool) return
    const now = new Date().toISOString()
    const tempUserId = `temp-imggen-user-${Date.now()}`
    const tempAssistId = `temp-imggen-assist-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: agentKey || selectedAgent?.slug || 'image-gen',
      text: `🖼️ [${tool}] ${prompt}`,
      timestamp: now,
      source: 'corner-dashboard',
      ...userIdentity,
    }, {
      id: tempAssistId,
      role: 'assistant',
      agent: 'image-gen',
      text: `Generating image with ${tool}…`,
      timestamp: now,
      source: 'image-gen',
      pending: true,
    }])
    setSending(true)
    try {
      const resp = await authFetch('/api/dashboard/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool,
          prompt,
          agent: agentKey || selectedAgent?.slug || null,
          project: projectSlug || null,
          client_id: clientId || worldId,
          ...userIdentity,
        }),
      }).then(r => r.json()).catch(err => ({ error: String(err) }))
      const errorText = resp?.error || (!resp?.url && !resp?.b64 ? 'No image returned' : null)
      setMessages(prev => prev.map(m => {
        if (m.id !== tempAssistId) return m
        if (errorText) {
          return { ...m, text: `Image generation failed (${tool}): ${errorText}`, pending: false, error: true }
        }
        const url = resp.url || (resp.b64 ? `data:image/png;base64,${resp.b64}` : null)
        return {
          ...m,
          text: prompt,
          attachments: url ? [{ url, mime: 'image/png', name: `${tool}-${Date.now()}.png` }] : [],
          image_tool: tool,
          pending: false,
        }
      }))
      onMessageSent?.()
    } catch (err) {
      console.error('[ChatPanel] image-gen error:', err)
      setMessages(prev => prev.map(m => m.id === tempAssistId
        ? { ...m, text: `Image generation failed (${tool}): ${err?.message || err}`, pending: false, error: true }
        : m))
    } finally {
      setSending(false)
      setSelectedImageTool?.(null)
      inputRef.current?.focus()
    }
  }, [setMessages, setSending, setSelectedImageTool, selectedAgent, worldId, userIdentity, onMessageSent, inputRef])

  // ── handleSend: text-input default for agent chat ─────────────────────────
  const handleSend = useCallback(async () => {
    // Fall back to the DOM value so programmatic input (browser automation,
    // MCP computer.type) that bypasses React's onChange still submits.
    const rawText = (input || inputRef.current?.value || '').trim()
    const chips = pasteChipsRef?.current || []
    if ((!rawText && !chips.length) || !selectedAgent) return
    // Image-gen branch: when a tool is pinned, route to /api/dashboard/image-gen
    // instead of chat-bridge. Skips the agent reply path entirely.
    if (selectedImageTool) {
      setInput('')
      await runImageGen({
        tool: selectedImageTool,
        prompt: rawText,
        agentKey: selectedAgent.slug,
        projectSlug: null,
        clientId: worldId,
      })
      return
    }
    if (rawText) lastSentRef.current = rawText
    const cleanText = rawText
    const attSnapshot = pendingAttachmentsRef.current
    const chipsKey = chips.map(c => c.id).join(',')
    const sig = `${selectedAgent.slug}:${cleanText}:${chipsKey}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const chipsSuffix = chips.length
      ? '\n\n' + chips.map(c => c.text).join('\n\n')
      : ''
    const replySnap = replyToRef.current
    const quotePrefix = replySnap?.snippet
      ? `> ${replySnap.type === 'task' ? `Re: task "${replySnap.label || ''}"` : 'Re'}: "${replySnap.snippet.length > 240 ? replySnap.snippet.slice(0, 237) + '…' : replySnap.snippet}"\n\n`
      : ''
    const mailSnap = selectedMailRef.current
    const mailContext = buildMailContext(mailSnap)
    const text = mailContext + quotePrefix + cleanText + chipsSuffix + attSuffix
    setInput('')
    if (chips.length) clearPasteChips?.()
    if (attSnapshot.length) setPendingAttachments([])
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)
    if (replySnap) setReplyTo(null)
    if (mailSnap) setSelectedMail(null)

    // Optimistic user message
    const now = new Date().toISOString()
    const tempUserId = makeTempId('temp-user')
    const replyMeta = buildReplyMeta(replySnap)
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: 'corner-dashboard',
      ...userIdentity,
      ...(replyMeta ? { metadata: { reply_to: replyMeta } } : {}),
    }])
    // R27e: bump the context-fullness meter on each user send (agent chat).
    bumpContextMeter(selectedAgent.slug)

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
      if (selectedAgent.isTaskRoom) {
        // R6 corner:task-rooms — route through /api/dashboard/task-message.
        // For done/failed tasks the endpoint enqueues a fresh follow-up
        // task with the prior transcript re-hydrated; for running/blocked/
        // waiting the message lands as a mid-flight nudge the sub-agent
        // picks up via sub-agent-poll-inbox.sh. The chat template's
        // realtime channel on `agent=task:<id>` delivers the insert back
        // to this view automatically, so we drop the optimistic temp once
        // the server row arrives.
        const terminal = selectedAgent.taskStatus === 'done' || selectedAgent.taskStatus === 'failed'
        const r = await authFetch('/api/dashboard/task-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: selectedAgent.taskId,
            text,
            client_id: selectedAgent.taskClientId || worldId,
            terminal,
          }),
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(j?.error || ('HTTP ' + r.status))
        }
        if (j?.message?.id) {
          setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: j.message.id } : m))
        }
        onMessageSent?.()
      } else {
        const bridgeResult = await authFetch('/api/dashboard/chat-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: selectedAgent.slug,
            message: text,
            room: selectedAgent.slug,
            project: '',
            client_id: worldId,
            ...cvgModelOverride(),
            ...userIdentity,
            ...(replyMeta ? { metadata: { reply_to: replyMeta } } : {}),
          }),
        }).then(r => r.json()).catch(() => null)
        if (bridgeResult?.messageId) {
          setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: bridgeResult.messageId } : m))
          if (!bridgeResult.fallback) {
            startBridgeStream(bridgeResult.messageId, selectedAgent.slug)
          }
        }
        onMessageSent?.()
      }
    } catch (err) {
      console.error('[ChatPanel] send error:', err)
    } finally {
      setSending(false)
      inFlightSendRef.current = false
      inputRef.current?.focus()
    }
  }, [input, sending, selectedAgent, worldId, userIdentity, setInput, setSending, setMessages, setPendingAttachments, setReplyTo, setAgentPreviews, startBridgeStream, pendingAttachmentsRef, inputRef, onMessageSent, selectedImageTool, runImageGen])

  // ── sendAgentText: programmatic (voice transcription) ────────────────────
  const sendAgentText = useCallback(async (rawText) => {
    if (!rawText?.trim() || !selectedAgent || !worldId) {
      console.warn('[sendAgentText] bailed: hasText=', !!rawText?.trim(), 'selectedAgent=', selectedAgent?.slug || null, 'worldId=', worldId || null)
      return
    }
    const attSnapshot = pendingAttachmentsRef.current
    const trimmed = rawText.trim()
    if (!trimmed) return
    const sig = `${selectedAgent.slug}:${trimmed}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) {
      console.warn('[sendAgentText] bailed: dedup window (same text within 2s)')
      return
    }
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
    const tempUserId = makeTempId('temp-user')
    const replyMetaVoice = buildReplyMeta(replySnap)
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: selectedAgent.slug,
      text,
      timestamp: now,
      source: 'corner-dashboard',
      ...userIdentity,
      ...(replyMetaVoice ? { metadata: { reply_to: replyMetaVoice } } : {}),
    }])
    // R27e: bump the context-fullness meter on each user send (voice path).
    bumpContextMeter(selectedAgent.slug)
    const previewText = 'You: ' + (text.length > 70 ? text.slice(0, 70) + '...' : text)
    setAgentPreviews(prev => ({
      ...prev,
      [selectedAgent.slug]: { agent: selectedAgent.slug, text: previewText, timestamp: now, id: tempUserId, isUnread: false },
    }))
    try {
      const bridgeResult = await authFetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: selectedAgent.slug,
          message: text,
          room: selectedAgent.slug,
          project: '',
          client_id: worldId,
          ...userIdentity,
          ...(replyMetaVoice ? { metadata: { reply_to: replyMetaVoice } } : {}),
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
    } else if (e.key === 'ArrowUp' && !input?.trim() && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const el = e.target
      if (el && el.selectionStart === 0 && el.selectionEnd === 0 && lastSentRef.current) {
        e.preventDefault()
        setInput(lastSentRef.current)
        requestAnimationFrame(() => {
          try { el.setSelectionRange(lastSentRef.current.length, lastSentRef.current.length) } catch {}
        })
      }
    }
  }, [handleSend, input, setInput])

  // ── sendProjectText: project chat send path ──────────────────────────────
  const sendProjectText = useCallback(async (rawText) => {
    const chips = pasteChipsRef?.current || []
    if ((!rawText?.trim() && !chips.length) || !selectedProject || !worldId) {
      console.warn('[sendProjectText] bailed: hasText=', !!rawText?.trim(), 'hasChips=', chips.length > 0, 'selectedProject=', selectedProject?.slug || null, 'worldId=', worldId || null)
      return
    }
    const trimmed = rawText?.trim() || ''
    // Image-gen branch (project chat).
    if (selectedImageTool && trimmed) {
      await runImageGen({
        tool: selectedImageTool,
        prompt: trimmed,
        agentKey: null,
        projectSlug: selectedProject.slug,
        clientId: selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId,
      })
      return
    }
    // R14e-3: project chat still routes through the tenant's EA (same
    // envelope pattern R6 introduced — agent=<ea_slug>, project=<slug> —
    // so the EA's tmux listener + queue-task.py picks the right repo),
    // but the EA is resolved from role flags on the agents payload
    // instead of the hardcoded 'elon' literal. In Patrik's world this
    // still resolves to 'elon'; in Ben's world it resolves to his EA.
    // Fallback to 'elon' only when the agents payload hasn't loaded —
    // prevents a blank agent slug in the optimistic POST during cold
    // boot. Once agents are in, the role-based lookup wins.
    // Resolve the project's EA through the shared helper so every send path
    // (text chat, voice handoff, etc.) agrees on the agent slug for a given
    // (project, mission) tuple. See src/dashboard/data/project-ea.js.
    const agentKey = getProjectEA(selectedProject, agents) || 'elon'
    const projectSlug = selectedProject.slug
    const attSnapshot = pendingAttachmentsRef.current
    const chipsKey = chips.map(c => c.id).join(',')
    const sig = `${agentKey}:${trimmed}:${chipsKey}:${attSnapshot.map(a => a.id).join(',')}`
    const nowMs = Date.now()
    if (lastSendSigRef.current.sig === sig && nowMs - lastSendSigRef.current.ts < 2000) return
    inFlightSendRef.current = true
    lastSendSigRef.current = { sig, ts: nowMs }
    const attSuffix = attSnapshot.length
      ? '\n' + attSnapshot.map(a => `[Attached file: ${a.name}\n${a.url}]`).join('\n')
      : ''
    const chipsSuffix = chips.length
      ? '\n\n' + chips.map(c => c.text).join('\n\n')
      : ''
    const replySnap = replyToRef.current
    const quotePrefix = replySnap?.snippet
      ? `> ${replySnap.type === 'task' ? `Re: task "${replySnap.label || ''}"` : 'Re'}: "${replySnap.snippet.length > 240 ? replySnap.snippet.slice(0, 237) + '…' : replySnap.snippet}"\n\n`
      : ''
    const text = quotePrefix + trimmed + chipsSuffix + attSuffix
    if (chips.length) clearPasteChips?.()
    if (attSnapshot.length) setPendingAttachments([])
    if (replySnap) setReplyTo(null)
    setSending(true)
    const projectClientId = selectedProject.isShared ? `shared:${selectedProject.slug}` : worldId
    const now = new Date().toISOString()
    const tempUserId = makeTempId('temp-proj')
    const replyMetaProj = buildReplyMeta(replySnap)
    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'user',
      agent: agentKey,
      text,
      timestamp: now,
      source: 'corner-dashboard',
      ...userIdentity,
      ...(replyMetaProj ? { metadata: { reply_to: replyMetaProj } } : {}),
    }])
    // R27e: bump the context-fullness meter on each user send (project chat).
    bumpContextMeter(agentKey)

    // R3 corner:mission-rooms — if the user entered this room via a
    // mission click, selectedProject carries missionSlug. Pass it through
    // so the bridge can load the mission scaffold as system prompt.
    const missionSlugForSend = selectedProject?.missionSlug || null
    try {
      const bridgeResult = await authFetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: agentKey,
          message: text,
          room: `project:${projectSlug}`,
          project: projectSlug,
          ...(missionSlugForSend ? { mission: missionSlugForSend } : {}),
          client_id: projectClientId,
          ...cvgModelOverride(),
          ...userIdentity,
          ...(replyMetaProj || missionSlugForSend
            ? { metadata: {
                ...(replyMetaProj ? { reply_to: replyMetaProj } : {}),
                ...(missionSlugForSend ? { mission_slug: missionSlugForSend } : {}),
              } }
            : {}),
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
  }, [selectedProject, worldId, userIdentity, agents, startBridgeStream, setSending, setMessages, setPendingAttachments, setReplyTo, pendingAttachmentsRef, inputRef, onMessageSent, selectedImageTool, runImageGen])

  const handleProjectSend = useCallback(async () => {
    const hasChips = pasteChipsRef?.current?.length > 0
    // Fall back to the DOM value for programmatic/MCP input that bypasses React onChange.
    const text = (input || inputRef.current?.value || '').trim()
    if (!text && !hasChips) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendProjectText(text)
  }, [input, sending, sendProjectText, setInput, inputRef, pasteChipsRef])

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