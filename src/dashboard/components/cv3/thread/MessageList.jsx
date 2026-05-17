import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { C } from '../../../lib/cv3Colors.js'
import { LinkifyText, AgentAvatar, formatChatTime } from '../shared.jsx'
import ChatMessageRenderer from '../../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../../TypingIndicatorV2.jsx'
import StepThread from '../shared/StepThread.jsx'
import useSyntheticChain from '../shared/useSyntheticChain.js'
import DocUpdatesStripe from '../shared/DocUpdateCard.jsx'
import { renderTaskCardForMessage } from '../TaskStatusCard.jsx'
import { NeedsVerificationBadge, MessageContextMenu, MobileActionSheet } from '../ContextMenu.jsx'
import MessageChecks from './MessageChecks.jsx'
import MessageStatusLabel from './MessageStatusLabel.jsx'
import SummaryMessage from './SummaryMessage.jsx'
import useThreadMsgMenu from './useThreadMsgMenu.js'
import useThreadMessageStatus from './useThreadMessageStatus.js'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatSendCtx,
  useChatSearchCtx,
  useChatContextMenuCtx,
} from '../chat/ChatPanelContext.jsx'

function MissionMarkerCard({ msg, projectSlug, floatStyle }) {
  // mission-rooms: condensed in-project marker that says "work was being
  // done over in mission X" without re-printing the transcript. Click =
  // navigate into that mission's room (URL-restore in CornerV4.jsx picks
  // up ?mission= and switches the chat surface).
  const navigate = useNavigate()
  const cm = msg.metadata || {}
  const missionSlug = cm.mission_slug
  const missionName = cm.mission_name || missionSlug
  const count = cm.message_count || 1
  const lastTs = cm.last_activity_ts || msg.timestamp
  const handleOpen = () => {
    if (!projectSlug || !missionSlug) return
    const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
    navigate(`${basePath}/project/${projectSlug}?mission=${encodeURIComponent(missionSlug)}`)
  }
  return (
    <div
      data-testid="mission-marker"
      data-mission-slug={missionSlug}
      style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, ...floatStyle }}
    >
      <button
        type="button"
        onClick={handleOpen}
        style={{
          maxWidth: '85%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(148,163,184,0.06)',
          border: '1px solid rgba(148,163,184,0.18)',
          color: C.text2,
          fontSize: 11,
          letterSpacing: '0.01em',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          color: C.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          mission
        </span>
        <span style={{ fontWeight: 600, color: C.text }}>{missionName}</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.muted }}>{count} {count === 1 ? 'message' : 'messages'}</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.muted }}>{formatChatTime(lastTs)}</span>
        <span style={{ marginLeft: 4, color: C.text2, opacity: 0.7 }}>open ›</span>
      </button>
    </div>
  )
}

function isKickoffMessage(m) {
  const meta = m?.metadata
  if (!meta) return false
  if (typeof meta === 'string') {
    try { return !!JSON.parse(meta)?.kickoff_sweep } catch { return false }
  }
  return !!meta.kickoff_sweep
}

function parseMeta(m) {
  const meta = m?.metadata
  if (!meta) return {}
  if (typeof meta === 'string') { try { return JSON.parse(meta) } catch { return {} } }
  return meta
}

// R78-p2: confirmation card for "create project from chat" flow. Extracted
// from MessageList .map() loop so its useState calls live at component top.
function CreateProjectCard({ msg, worldId, selectedAgent }) {
  const cm = msg.metadata || {}
  const { slug, name, reason } = cm
  const [editName, setEditName] = useState(name || slug)
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const createRes = await fetch('/api/dashboard/create-project-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: editName,
          client_id: worldId,
          agent_slug: selectedAgent?.slug || 'ea',
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json()
        console.error('Create project failed:', err)
        setConfirming(false)
        return
      }
    } catch (err) {
      console.error('Create project error:', err)
      setConfirming(false)
    }
  }

  const handleSkip = () => {}

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '480px', padding: '12px 14px', borderRadius: 10,
        background: 'rgba(99, 102, 241, 0.10)',
        border: '1px solid rgba(99, 102, 241, 0.30)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#A5B4FC',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: "'JetBrains Mono', monospace", marginBottom: 8,
        }}>
          Create Project
        </div>
        {reason && (
          <div style={{
            fontSize: 12, color: 'rgba(226, 232, 240, 0.72)',
            marginBottom: 8, lineHeight: 1.4,
          }}>
            {reason}
          </div>
        )}
        <div style={{
          fontSize: 11, color: 'rgba(148, 163, 184, 0.6)',
          marginBottom: 6, fontFamily: "'JetBrains Mono', monospace",
        }}>
          Slug: {slug}
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{
            display: 'block', fontSize: 10,
            color: 'rgba(148, 163, 184, 0.7)', fontWeight: 600,
            marginBottom: 3, textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Project Name
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={confirming}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 12,
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 4, background: 'rgba(0, 0, 0, 0.2)',
              color: 'rgba(226, 232, 240, 0.9)',
              fontFamily: "'JetBrains Mono', monospace", outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={confirming || !editName.trim()}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
              color: '#fff',
              background: !editName.trim() || confirming
                ? 'rgba(99, 102, 241, 0.3)' : '#4F46E5',
              border: 'none', borderRadius: 4,
              cursor: !editName.trim() || confirming ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {confirming ? 'Creating...' : 'Confirm'}
          </button>
          <button
            onClick={handleSkip}
            disabled={confirming}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.6)',
              background: 'transparent',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 4,
              cursor: confirming ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Skip
          </button>
        </div>
        <div style={{
          fontSize: 9, color: 'rgba(99, 102, 241, 0.45)',
          marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {formatChatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

// Patterns that mark the first line of a summary/ack reply from an agent.
const SUMMARY_PREFIX_RE = /^(acked[.,\s]|ack\.|summary[:\s—]|replied with|done\.\s*$|got it\.|understood\.|noted\.|confirmed\.|logged\.|recorded\.)/i

function isSummaryMessage(msg, arr, idx) {
  if (msg.role !== 'assistant') return false
  if (parseMeta(msg).is_summary) return true
  // Heuristic: second consecutive assistant message within 8s whose first line
  // matches a well-known summary prefix.
  const prev = idx > 0 ? arr[idx - 1] : null
  if (!prev || prev.role !== 'assistant') return false
  const firstLine = (msg.text || '').split('\n')[0].trim()
  if (!SUMMARY_PREFIX_RE.test(firstLine)) return false
  const deltaMs = msg.timestamp && prev.timestamp
    ? new Date(msg.timestamp) - new Date(prev.timestamp)
    : Infinity
  return deltaMs <= 8_000
}

// Unified scrollable messages area for both room types.
// roomType="agent" → super-agent 1:1 thread.
// roomType="project" → project shared room.
// All behavior from both prior components is preserved: chain cards and voice
// transcripts (agent only), kickoff partitioning and DocUpdatesStripe (project
// only), MessageChecks/MessageStatusLabel (agent only), attachments (agent only).
// K2 fix: awaitingResponse is now included in inFlight for both room types.
export default function MessageList({ roomType = 'agent' }) {
  const isProject = roomType === 'project'

  const {
    selectedAgent, selectedProject, currentUser, displayName, allTasks, agents, worldId, isMobile,
  } = useChatCore()
  const {
    messages, loadingMsgs, messagesEndRef, userProfiles,
    stepsByMessageId = {},
  } = useChatMessagesCtx()
  const {
    sending, setSending, isAgentTyping, setIsAgentTyping, sendAgentTextRef,
  } = useChatSendCtx()
  const { chatSearchOpen, chatSearchResults } = useChatSearchCtx()
  const {
    needsVerificationIds,
    handleMessageFollowUp, handleMessageNeedsVerification,
    handleMessageResearch, handleMessageSendTo,
  } = useChatContextMenuCtx()

  const { msgMenu, setMsgMenu, openMsgMenu, startLongPress, cancelLongPress } = useThreadMsgMenu()
  const { respondedSet, awaitingResponse } = useThreadMessageStatus(messages)

  // Hover state for desktop action buttons (desktop only; on mobile long-press fires the sheet)
  const [hoverMsgId, setHoverMsgId] = useState(null)

  // Scroll to a message and briefly flash-highlight it
  const scrollToAndHighlight = useCallback((messageId) => {
    const el = document.querySelector(`[data-message-id="${CSS.escape(String(messageId))}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'background 0.1s ease'
    el.style.background = 'rgba(16,185,129,0.18)'
    el.style.borderRadius = '12px'
    setTimeout(() => {
      el.style.background = ''
      setTimeout(() => { el.style.transition = '' }, 400)
    }, 900)
  }, [])

  // CV4 drawer search dispatches 'cv4:scroll-to-message' on hit click.
  // We retry briefly because the target thread may still be hydrating when
  // the event fires (the user just navigated to it).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e) => {
      const id = e?.detail?.messageId
      if (id == null) return
      let attempts = 0
      const tick = () => {
        const el = document.querySelector(`[data-message-id="${CSS.escape(String(id))}"]`)
        if (el) { scrollToAndHighlight(id); return }
        attempts += 1
        if (attempts < 12) window.setTimeout(tick, 250)
      }
      tick()
    }
    window.addEventListener('cv4:scroll-to-message', handler)
    return () => window.removeEventListener('cv4:scroll-to-message', handler)
  }, [scrollToAndHighlight])

  // R73: invoked by TypingIndicatorV2 after the stall-CTA fires.
  const handleTypingStall = () => {
    setSending?.(false)
    setIsAgentTyping?.(false)
  }

  // K2: awaitingResponse included for both room types. Previously project rooms
  // only had `sending || isAgentTyping`, causing the synthetic chain to collapse
  // prematurely when the POST returned but the assistant reply hadn't arrived yet.
  const inFlightRaw = sending || awaitingResponse || isAgentTyping

  // corner:chat-reliability CR-2 -- terminal-event settling for task rooms.
  // When the chat surface is a task room and the dispatched task has flipped
  // to failed (no reply will ever land), settle the chain with a "Worker
  // failed" final step instead of breathing "Still working" forever.
  // Reads task status from allTasks (already loaded by useTasks).
  const taskRoomId = selectedAgent?.isTaskRoom
    ? (selectedAgent.taskId || (selectedAgent.slug?.startsWith('task:') ? selectedAgent.slug.slice(5) : null))
    : null
  const taskRow = taskRoomId && Array.isArray(allTasks)
    ? allTasks.find(t => t.id === taskRoomId)
    : null
  const taskTerminalFailed = taskRow && (taskRow.status === 'failed')
  // If the originating task was a followup, also watch for the followup row
  // flipping failed. Followups are filtered from the visible list (R6.2)
  // but useTasks returns them in allTasks before that derivation.
  const followupFailed = taskRoomId && Array.isArray(allTasks)
    ? allTasks.some(t => t.status === 'failed' && t.metadata && t.metadata.followup_of === taskRoomId)
    : false
  const inFlight = inFlightRaw && !(taskTerminalFailed || followupFailed)

  // R73-fix: wall-clock stall detection. Moves silence-detection out of
  // TypingIndicatorV2 (which resets its timer on every remount) into MessageList
  // where it survives any subordinate re-render. Fires when the last real user
  // message has been unanswered for 45s and the thread is still in-flight.
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [floatMode, setFloatMode] = useState(false)
  const lastUserMsgRef = useRef(null)

  useEffect(() => {
    if (!inFlight) return
    const tick = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [inFlight])

  const latestRealUserMsg = useMemo(() => {
    if (!inFlight) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'user' && !String(m.id).startsWith('temp-')) return m
    }
    return null
  }, [messages, inFlight])

  const msSinceUser = latestRealUserMsg?.timestamp
    ? nowMs - new Date(latestRealUserMsg.timestamp).getTime()
    : 0

  // If live steps are firing under the latest user msg, the agent is visibly
  // working — suppress the stall signal. Per .claude/rules/live-thread-step-emission.md,
  // step events stream while the agent reads, queues, spawns workers, etc.
  // Seeing dots travel down the chain is the opposite of silence.
  // 2026-05-12: window was 30s and tripped chainStalled mid-routine — Elon
  // routines run 60-90s, and a step at t=5s followed by a tool call would
  // cross the 30s gap and show "clear & retry" while the chain was still
  // demonstrably alive. Bumped to 120s so a chain that has started gets
  // enough headroom for the slowest legit routine before we flag stall.
  const latestUserStepsForStall = latestRealUserMsg
    ? (stepsByMessageId[latestRealUserMsg.id] || [])
    : []
  const lastStepAt = latestUserStepsForStall.length > 0
    ? Math.max(...latestUserStepsForStall.map(s => new Date(s.timestamp || 0).getTime()))
    : 0
  const msSinceLastStep = lastStepAt > 0 ? nowMs - lastStepAt : Infinity
  const stepActiveRecently = msSinceLastStep < 120_000

  // awaitingResponse=true means no assistant message (real or bridge-stream) has
  // arrived yet — strictly the relay path where the agent hasn't replied at all.
  const chainStalled = inFlight && awaitingResponse && msSinceUser >= 45_000 && !stepActiveRecently

  // c76e17f9: skip "Read your message" on turn 2+ (context already established).
  const isFirstTurn = !messages.some(m =>
    m.role === 'assistant' &&
    !String(m.id).startsWith('temp-') &&
    !String(m.id).startsWith('bridge-stream-') &&
    !String(m.id).startsWith('voice-')
  )
  const syntheticSteps = useSyntheticChain(inFlight, isFirstTurn)

  const roomColor = isProject
    ? (selectedProject?.color || '#6B8AB0')
    : (selectedAgent?.color || '#3B82F6')
  const roomName = isProject
    ? (selectedProject?.name || 'Project')
    : (selectedAgent?.name || 'Agent')
  const roomSlug = isProject
    ? (selectedProject?.slug || 'project')
    : selectedAgent?.slug

  // Project rooms hide the list while search results are active.
  const hidden = isProject && chatSearchOpen && chatSearchResults && chatSearchResults.length > 0

  // R50b: project rooms partition messages around the most-recent kickoff so
  // pre-ratification chatter collapses under a "show earlier messages" affordance.
  const { preKickoff, postKickoff, hasCutoff } = useMemo(() => {
    if (!isProject || !Array.isArray(messages) || messages.length === 0) {
      return { preKickoff: [], postKickoff: messages, hasCutoff: false }
    }
    let cutoffIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (isKickoffMessage(messages[i])) { cutoffIdx = i; break }
    }
    if (cutoffIdx <= 0) {
      return { preKickoff: [], postKickoff: messages, hasCutoff: cutoffIdx === 0 }
    }
    return {
      preKickoff: messages.slice(0, cutoffIdx),
      postKickoff: messages.slice(cutoffIdx),
      hasCutoff: true,
    }
  }, [messages, isProject])

  const [earlierExpanded, setEarlierExpanded] = useState(false)

  const renderedMessages = isProject && hasCutoff
    ? (earlierExpanded ? [...preKickoff, ...postKickoff] : postKickoff)
    : messages

  // Float animation: stable filtered array + last-user-msg index for opacity targeting.
  const visibleMessages = useMemo(
    () => renderedMessages.filter(m =>
      !(m.source === 'bridge-stream' && m._streaming && !m.text) &&
      m.source !== 'clear_context'
    ),
    [renderedMessages]
  )
  const lastUserMsgIdx = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].role === 'user') return i
    }
    return -1
  }, [visibleMessages])

  // Activate float mode the moment a send lands; deactivate 500ms after reply arrives.
  useEffect(() => {
    if (inFlight) { setFloatMode(true); return }
    const t = setTimeout(() => setFloatMode(false), 500)
    return () => clearTimeout(t)
  }, [inFlight])

  // Scroll last user message to top of panel when float mode activates.
  useEffect(() => {
    if (!floatMode || !lastUserMsgRef.current) return
    lastUserMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [floatMode])

  // Dev affordance for R75-r65-e gate script.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__r75r65etest__ = { setFloatMode }
    return () => { delete window.__r75r65etest__ }
  }, [])

  // Dev affordance for R75-b9 gate script.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__r75b9test__ = { isSummaryMessage }
    return () => { delete window.__r75b9test__ }
  }, [])

  return (
    <>
    <div
      data-testid={isProject ? 'project-message-list' : undefined}
      data-float-mode={floatMode ? 'true' : undefined}
      style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: hidden ? 'none' : 'flex',
        flexDirection: 'column', gap: 6,
      }}
    >
      {/* Project: surface recent VISION/BUILD/CONTEXT/RESEARCH edits. */}
      {isProject && selectedProject?.slug && (
        <DocUpdatesStripe project={selectedProject.slug} />
      )}

      {loadingMsgs && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
        </div>
      )}

      {!loadingMsgs && messages.length === 0 && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, paddingTop: 60,
        }}>
          {isProject ? (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${roomColor}44, ${roomColor}22)`,
              border: `1px solid ${roomColor}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                background: roomColor,
                boxShadow: `0 0 10px ${roomColor}77`,
              }} />
            </div>
          ) : (
            <AgentAvatar name={selectedAgent.name} slug={selectedAgent.slug} color={selectedAgent.color} size={44} />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
            {roomName}
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
        </div>
      )}

      {/* Project: earlier-messages toggle */}
      {isProject && hasCutoff && preKickoff.length > 0 && (
        <button
          type="button"
          data-testid="show-earlier-messages"
          data-expanded={earlierExpanded ? 'true' : 'false'}
          onClick={() => setEarlierExpanded(v => !v)}
          style={{
            alignSelf: 'center',
            margin: '4px auto 8px',
            padding: '6px 14px',
            fontSize: 12,
            color: C.muted,
            background: 'transparent',
            border: `1px solid ${C.muted}33`,
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {earlierExpanded
            ? `Hide earlier messages (${preKickoff.length})`
            : `Show earlier messages (${preKickoff.length})`}
        </button>
      )}

      {visibleMessages.map((msg, idx, arr) => {
          const isLastUserMsg = floatMode && idx === lastUserMsgIdx
          const fadedByFloat = floatMode && idx < lastUserMsgIdx
          const floatStyle = fadedByFloat
            ? { opacity: 0.12, transition: 'opacity 0.35s ease' }
            : { transition: 'opacity 0.35s ease' }

          // Task status cards (Steffen's CV3 design).
          const taskCard = renderTaskCardForMessage(msg, {
            ...(!isProject && { selectedAgent }),
            formatTime: formatChatTime,
          })
          if (taskCard) return <div key={msg.id} style={floatStyle}>{taskCard}</div>

          // Mission marker (project rooms only): a condensed pill that
          // collapses a run of mission-tagged messages into one row.
          if (isProject && msg.source === 'mission-marker') {
            return (
              <MissionMarkerCard
                key={msg.id}
                msg={msg}
                projectSlug={selectedProject?.slug || msg.metadata?.project_slug}
                floatStyle={floatStyle}
              />
            )
          }

          // Chain card (agent rooms only).
          if (!isProject && msg.source === 'chain-card') {
            const cm = msg.metadata || {}
            const chainTotal = cm.chain_total || (cm.chain_tasks || []).length || 0
            const chainStatus = cm.chain_status || 'queued'
            const liveTasks = (cm.chain_tasks || []).map(t => {
              const live = (typeof allTasks !== 'undefined' && Array.isArray(allTasks))
                ? allTasks.find(a => a.id === t.id) : null
              return live ? { ...t, status: live.status } : t
            })
            const headerColor = chainStatus === 'complete' ? '#34D399'
              : chainStatus === 'blocked' ? '#F87171'
              : '#A5B4FC'
            const headerBg = chainStatus === 'complete' ? 'rgba(52,211,153,0.10)'
              : chainStatus === 'blocked' ? 'rgba(248,113,113,0.10)'
              : 'rgba(99,102,241,0.10)'
            const headerBorder = chainStatus === 'complete' ? 'rgba(52,211,153,0.35)'
              : chainStatus === 'blocked' ? 'rgba(248,113,113,0.45)'
              : 'rgba(99,102,241,0.30)'
            const headerLabel = chainStatus === 'complete' ? `Chain complete · ${chainTotal} steps`
              : chainStatus === 'blocked' ? `Chain blocked at ${cm.blocked_at_seq || '?'}/${chainTotal}`
              : `Chain queued · ${chainTotal} steps`
            const dotFor = (st) => {
              const s = (st || '').toLowerCase()
              if (s === 'done' || s === 'completed') return { c: '#34D399', label: 'done', pulse: false }
              if (s === 'failed' || s === 'rejected' || s === 'cancelled') return { c: '#F87171', label: 'blocked', pulse: false }
              if (s === 'running' || s === 'active' || s === 'building' || s === 'qa' || s === 'planning' || s === 'classifying') return { c: '#FBBF24', label: 'running', pulse: true }
              if (s === 'queued') return { c: '#A5B4FC', label: 'queued', pulse: false }
              if (s === 'waiting') return { c: 'rgba(148,163,184,0.55)', label: 'waiting', pulse: false }
              return { c: 'rgba(148,163,184,0.55)', label: s || 'unknown', pulse: false }
            }
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6, ...floatStyle }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 12px', borderRadius: 12,
                  background: headerBg, border: `1px solid ${headerBorder}`,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: headerColor,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {headerLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {liveTasks.map((t) => {
                      const d = dotFor(t.status)
                      return (
                        <div key={t.id || t.seq} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.18)',
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: d.c,
                            boxShadow: d.pulse ? `0 0 0 4px ${d.c}22` : 'none',
                            animation: d.pulse ? 'cv3pulse 1.4s ease-in-out infinite' : 'none',
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: 'rgba(148,163,184,0.7)',
                            fontFamily: "'JetBrains Mono', monospace",
                            minWidth: 28,
                          }}>
                            {t.seq}/{chainTotal}
                          </span>
                          <span style={{
                            fontSize: 12, color: 'rgba(226,232,240,0.92)',
                            flex: 1, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {t.title}
                          </span>
                          <span style={{
                            fontSize: 8, fontWeight: 700, color: d.c,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {d.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{
                    fontSize: 9, color: 'rgba(148,163,184,0.45)',
                    marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // R78-p2: Create project confirmation card (extracted to component)
          if (!isProject && msg.source === 'create-project-card') {
            return (
              <CreateProjectCard
                key={msg.id}
                msg={msg}
                worldId={worldId}
                selectedAgent={selectedAgent}
              />
            )
          }

          // Voice transcript (agent rooms only).
          if (!isProject && msg.source === 'voice') {
            const isVoiceUser = msg.role === 'user'
            return (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: isVoiceUser ? 'flex-end' : 'flex-start',
                marginBottom: 6,
                ...floatStyle,
              }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                  background: 'rgba(129,140,248,0.10)',
                  border: '1px dashed rgba(129,140,248,0.35)',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: '#A5B4FC',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {isVoiceUser ? 'Patrik (voice)' : 'Gemini (voice)'}
                    </span>
                    <span style={{
                      fontSize: 7, fontWeight: 700, color: 'rgba(129,140,248,0.6)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '1px 5px', borderRadius: 4,
                      background: 'rgba(129,140,248,0.15)',
                    }}>
                      not sent to {selectedAgent.name}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.45,
                    color: 'rgba(226,232,240,0.78)',
                    fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.text}
                  </div>
                  <div style={{
                    fontSize: 9, color: 'rgba(129,140,248,0.45)',
                    marginTop: 4, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // R75-b9: summary/ack replies render compact + dimmed instead of as a
          // normal bubble so the user can distinguish the answer from the agent note.
          if (isSummaryMessage(msg, arr, idx)) {
            return <SummaryMessage key={msg.id} msg={msg} floatStyle={floatStyle} />
          }

          const isUser = msg.role === 'user'
          // c76e17f9: detect turn boundary.
          const prevMsg = idx > 0 ? arr[idx - 1] : null
          const isNewTurn = isUser && prevMsg?.role === 'assistant'
          const senderName = msg.user_name || (isUser ? displayName : null)
          const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
          const isOtherUser = isUser && msg.user_name && msg.user_name !== displayName
          const senderColor = isUser ? (isOtherUser ? '#7C3AED' : '#2563EB') : roomColor
          // Fall back to the current user's avatar for user-role messages
          // that don't carry a user_id (optimistic sends, legacy rows from
          // before user_id tracking, and project messages where the row
          // never gets re-fetched after persist). Without this, the same
          // sender's bubbles flicker between avatar and initial-letter
          // depending on how each row landed.
          const treatAsCurrentUser = isUser && !isOtherUser
          const senderProfile = msg.user_id
            ? (msg.user_id === currentUser?.id
                ? { avatar_url: currentUser?.user_metadata?.avatar_url }
                : userProfiles[msg.user_id])
            : (treatAsCurrentUser ? { avatar_url: currentUser?.user_metadata?.avatar_url } : null)
          const senderAvatar = senderProfile?.avatar_url || null
          const msgFlagged = needsVerificationIds?.has?.(msg.id)
          const userBubbleSteps = isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0
            ? stepsByMessageId[msg.id]
            : null
          // R75-b5: settle when the assistant reply arrives (not just on next user msg).
          // This dims the chain and flips data-status to 'done' the moment the reply lands.
          const hasAssistantReply = userBubbleSteps
            ? arr.slice(idx + 1).some(m => m.role === 'assistant' && !String(m.id).startsWith('temp-'))
            : false

          // Parse reply_to from this message's metadata for quote header rendering
          const msgMeta = parseMeta(msg)
          const replyToData = msgMeta.reply_to && msgMeta.reply_to.message_id ? msgMeta.reply_to : null
          // Find original message for quote header (look up in full messages array)
          const replyOriginal = replyToData ? messages.find(m => String(m.id) === String(replyToData.message_id)) : null

          return (
            <React.Fragment key={msg.id}>
              {/* c76e17f9: inter-turn spine connector. */}
              {isNewTurn && (
                <div aria-hidden="true" style={{ paddingLeft: 28, display: 'flex', height: 18 }}>
                  <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              )}
              <div style={{ position: 'relative', ...floatStyle }}
                onMouseEnter={() => !isMobile && setHoverMsgId(msg.id)}
                onMouseLeave={() => setHoverMsgId(null)}
              >
              {/* Desktop hover action buttons */}
              {!isMobile && hoverMsgId === msg.id && (
                <div style={{
                  position: 'absolute',
                  top: -28,
                  right: isUser ? 0 : undefined,
                  left: isUser ? undefined : 38,
                  display: 'flex',
                  gap: 4,
                  zIndex: 200,
                }}>
                  {[
                    {
                      key: 'reply', title: 'Reply',
                      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>,
                      onClick: () => handleMessageFollowUp(msg),
                    },
                    {
                      key: 'copy', title: 'Copy',
                      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
                      onClick: () => { if (msg.text) navigator.clipboard?.writeText(msg.text).catch(() => {}) },
                    },
                  ].map(btn => (
                    <button
                      key={btn.key}
                      title={btn.title}
                      onClick={btn.onClick}
                      data-test-id={`msg-hover-${btn.key}-${msg.id}`}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(30,41,59,0.92)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(226,232,240,0.8)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; e.currentTarget.style.color = '#34D399' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.92)'; e.currentTarget.style.color = 'rgba(226,232,240,0.8)' }}
                    >
                      {btn.icon}
                    </button>
                  ))}
                </div>
              )}
              <div
                data-test-id="chat-message"
                data-message-id={msg.id}
                data-last-user-msg={isLastUserMsg ? 'true' : undefined}
                ref={isLastUserMsg ? lastUserMsgRef : undefined}
                onContextMenu={(e) => openMsgMenu(e, msg)}
                onTouchStart={(e) => startLongPress(e, msg)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onTouchCancel={cancelLongPress}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 10,
                  marginBottom: userBubbleSteps ? 0 : (isUser ? 4 : 12),
                }}
              >
                {/* Assistant avatar: circle for agents, square gem for projects. */}
                {!isUser && (
                  isProject ? (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `linear-gradient(135deg, ${roomColor}33, ${roomColor}18)`,
                      border: `1px solid ${roomColor}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      alignSelf: 'flex-start', marginTop: 2,
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: roomColor }} />
                    </div>
                  ) : (
                    <div style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                      <AgentAvatar name={selectedAgent.name} slug={selectedAgent.slug} color={selectedAgent.color} size={28} />
                    </div>
                  )
                )}
                <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
                  {/* Quote header: rendered when this message is a reply to another message */}
                  {replyToData && (
                    <div
                      role="button"
                      tabIndex={0}
                      data-test-id={`quote-header-${msg.id}`}
                      onClick={() => scrollToAndHighlight(replyToData.message_id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToAndHighlight(replyToData.message_id) } }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        marginBottom: 4,
                        padding: '5px 10px',
                        borderLeft: '3px solid rgba(16,185,129,0.55)',
                        borderRadius: '0 6px 6px 0',
                        background: 'rgba(16,185,129,0.07)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: 'rgba(52,211,153,0.85)',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.03em',
                          marginBottom: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {replyToData.sender || replyOriginal?.agent || 'message'}
                        </div>
                        <div style={{
                          fontSize: 12, color: 'rgba(226,232,240,0.5)',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {replyToData.snippet || (replyOriginal?.text ? replyOriginal.text.slice(0, 100) : null) || (replyToData.attachment_kind ? `[${replyToData.attachment_kind}]` : '—')}
                        </div>
                      </div>
                      {replyToData.attachment_kind === 'video' && replyToData.attachment_url && (
                        <video
                          src={replyToData.attachment_url}
                          preload="metadata"
                          muted
                          style={{ width: 52, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: '#000' }}
                        />
                      )}
                      {replyToData.attachment_kind === 'image' && replyToData.attachment_url && (
                        <img
                          src={replyToData.attachment_url}
                          alt=""
                          style={{ width: 52, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                    </div>
                  )}
                  {/* Project rooms: other-user name above bubble. */}
                  {isProject && isUser && isOtherUser && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: '#A78BFA',
                      textAlign: 'right', marginBottom: 3,
                      fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
                    }}>
                      {msg.user_name}
                    </div>
                  )}
                  {/* R65-impl: live-thread step chain above assistant reply. */}
                  {!isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0 && (
                    <div style={{ marginBottom: msg.text ? 10 : 0 }}>
                      <StepThread
                        steps={stepsByMessageId[msg.id]}
                        settled={Boolean(msg.text)}
                        isError={msg.metadata?.status === 'error'}
                        agentColor={roomColor}
                      />
                    </div>
                  )}
                  {/* Text bubble */}
                  {msg.text && !((msg.attachment_url || msg.metadata?.attachment?.url) && msg.text.startsWith('Attached file: ')) && (() => {
                    const hasChain = !isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0
                    // Subtle outline on the bubble whose context-menu is open.
                    const isMenuTarget = msgMenu?.message?.id === msg.id
                    const menuOutline = isMenuTarget ? '1.5px solid rgba(52,211,153,0.55)' : null
                    if (isUser) {
                      return (
                        <div data-bubble="user" data-menu-target={isMenuTarget || undefined} style={{
                          padding: '10px 16px',
                          borderRadius: '18px 18px 4px 18px',
                          fontSize: 14, lineHeight: 1.6,
                          color: '#fff',
                          background: senderColor,
                          border: 'none',
                          outline: menuOutline,
                          outlineOffset: isMenuTarget ? 1 : 0,
                          wordBreak: 'break-word',
                          fontFamily: "'Inter', sans-serif",
                          letterSpacing: '-0.01em',
                          whiteSpace: 'pre-wrap',
                          transition: 'outline-color 120ms ease',
                        }}>
                          <LinkifyText text={msg.text} />
                        </div>
                      )
                    }
                    return (
                      <div
                        data-bubble="assistant"
                        data-menu-target={isMenuTarget || undefined}
                        data-testid={hasChain ? 'assistant-final-message' : undefined}
                        style={{
                          padding: hasChain ? '12px 14px' : (isMenuTarget ? '4px 8px' : '2px 0'),
                          borderRadius: hasChain ? 8 : (isMenuTarget ? 6 : 0),
                          border: hasChain ? '1px solid rgba(255,255,255,0.08)' : 'none',
                          outline: menuOutline,
                          outlineOffset: isMenuTarget ? 1 : 0,
                          marginTop: hasChain ? 8 : 0,
                          fontSize: 14, lineHeight: 1.6,
                          color: '#E2E8F0',
                          background: 'transparent',
                          wordBreak: 'break-word',
                          fontFamily: "'Inter', sans-serif",
                          letterSpacing: '-0.01em',
                          transition: 'outline-color 120ms ease',
                        }}
                      >
                        <ChatMessageRenderer content={msg.text} style={{ fontSize: 14, lineHeight: 1.6, color: '#E2E8F0' }} />
                      </div>
                    )
                  })()}
                  {/* Agent rooms: other-user name below bubble. */}
                  {!isProject && isUser && msg.user_name && msg.user_name !== displayName && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: '#A78BFA',
                      textAlign: 'right', marginBottom: 3, marginTop: -2,
                      fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
                    }}>
                      {msg.user_name}
                    </div>
                  )}
                  {/* File / image attachments. Renders in both agent and
                      project rooms so an uploaded file shows the same chip
                      regardless of which surface posted it. */}
                  {(() => {
                    // Three input shapes (in priority): explicit attachments[],
                    // top-level columns (post-migration), metadata.attachment
                    // (pre-migration fallback that works against the live schema today).
                    const metaAtt = msg.metadata?.attachment
                    const attUrl = msg.attachment_url || metaAtt?.url
                    const attMime = msg.file_mime_type || metaAtt?.mime
                    const attSize = msg.file_size ?? metaAtt?.size
                    const attName = metaAtt?.name
                      || (msg.text && msg.text.startsWith('Attached file: ')
                            ? msg.text.replace('Attached file: ', '').split('\n')[0]
                            : msg.file_name || null)
                    const atts = (msg.attachments && msg.attachments.length)
                      ? msg.attachments
                      : attUrl
                        ? [{ url: attUrl, mime: attMime, size: attSize, name: attName }]
                        : []
                    if (!atts.length) return null
                    const hasText = msg.text && !(attUrl && msg.text.startsWith('Attached file: '))
                    const isMulti = atts.length > 1
                    const items = atts.map((att, attIdx) => {
                      const isImage = att.mime && att.mime.startsWith('image/')
                      const isVideo = att.mime && att.mime.startsWith('video/')
                      const isAudio = att.mime && att.mime.startsWith('audio/')
                      const openAttachment = () => {
                        if (!att.url) return
                        try { window.open(att.url, '_blank', 'noopener,noreferrer') } catch (_) {}
                      }
                      if (isVideo) {
                        return (
                          <div
                            key={attIdx}
                            style={{
                              alignSelf: isUser ? 'flex-end' : 'flex-start',
                              borderRadius: 16,
                              overflow: 'hidden',
                              maxWidth: '70%',
                              background: '#000',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                            }}
                          >
                            <video
                              controls
                              preload="metadata"
                              src={att.url}
                              style={{ display: 'block', width: '100%', maxHeight: 480, borderRadius: 16 }}
                            />
                            {att.name && (
                              <div style={{ fontSize: 11, color: C.muted, padding: '6px 10px', background: C.s1 }}>
                                {att.name}
                              </div>
                            )}
                          </div>
                        )
                      }
                      if (isAudio) {
                        return (
                          <div
                            key={attIdx}
                            style={{
                              alignSelf: isUser ? 'flex-end' : 'flex-start',
                              borderRadius: 16,
                              padding: 12,
                              background: `linear-gradient(180deg, ${C.s2}, ${C.s1})`,
                              border: `1px solid ${C.border2}`,
                              maxWidth: 360,
                            }}
                          >
                            <audio controls preload="metadata" src={att.url} style={{ width: '100%' }} />
                            {att.name && (
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{att.name}</div>
                            )}
                          </div>
                        )
                      }
                      if (isImage) {
                        return (
                          <div
                            key={attIdx}
                            role="button"
                            tabIndex={0}
                            title={att.name || 'Open image'}
                            onClick={openAttachment}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAttachment() } }}
                            style={{
                              alignSelf: isUser ? 'flex-end' : 'flex-start',
                              borderRadius: 16, overflow: 'hidden',
                              maxWidth: '70%', cursor: 'pointer',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.02)'
                              e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <img src={att.url} alt={att.name || ''} style={{ width: '100%', display: 'block', borderRadius: 16 }} />
                          </div>
                        )
                      }
                      // ─── Non-image: polished, clickable file card ───
                      const ext = (att.name ? att.name.split('.').pop() : '').toLowerCase()
                      const EXT_COLORS = {
                        pdf: C.red,
                        doc: C.blue, docx: C.blue, rtf: C.blue,
                        xls: C.green, xlsx: C.green, csv: C.green, numbers: C.green,
                        ppt: C.orange, pptx: C.orange, keynote: C.orange,
                        zip: C.orange, rar: C.orange, tar: C.orange, gz: C.orange,
                        mp3: C.purple, wav: C.purple, m4a: C.purple, aac: C.purple, flac: C.purple,
                        mp4: C.pink, mov: C.pink, webm: C.pink, mkv: C.pink, avi: C.pink,
                        txt: C.muted, md: C.muted, log: C.muted,
                        json: C.teal, yml: C.teal, yaml: C.teal, xml: C.teal, html: C.teal,
                        js: C.yellow, jsx: C.yellow, ts: C.yellow, tsx: C.yellow, py: C.yellow,
                      }
                      const tagColor = EXT_COLORS[ext] || C.accent
                      const fileSizeLabel = att.size == null ? null
                        : att.size < 1024
                          ? `${att.size} B`
                          : att.size < 1024 * 1024
                            ? `${Math.round(att.size / 1024)} KB`
                            : `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                      return (
                        <div
                          key={attIdx}
                          role="button"
                          tabIndex={0}
                          title={att.name ? `Open ${att.name}` : 'Open attachment'}
                          onClick={openAttachment}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAttachment() } }}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            background: `linear-gradient(180deg, ${C.s2}, ${C.s1})`,
                            border: `1px solid ${C.border2}`,
                            borderRadius: 16,
                            padding: '12px 14px',
                            display: 'flex', alignItems: 'center', gap: 12,
                            maxWidth: 320, minWidth: 220,
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                            boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 18px rgba(0,0,0,0.4)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                            const hint = e.currentTarget.querySelector('[data-open-hint]')
                            if (hint) hint.style.opacity = '1'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)'
                            e.currentTarget.style.borderColor = C.border2
                            const hint = e.currentTarget.querySelector('[data-open-hint]')
                            if (hint) hint.style.opacity = '0'
                          }}
                        >
                          {/* Document icon block with extension ribbon */}
                          <div style={{
                            position: 'relative',
                            width: 44, height: 52, flexShrink: 0,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                          }}>
                            <svg viewBox="0 0 44 52" width="44" height="52" aria-hidden="true">
                              <defs>
                                <linearGradient id={`docGrad-${msg.id}-${attIdx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
                                  <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M6 2 H28 L40 14 V46 a4 4 0 0 1 -4 4 H6 a4 4 0 0 1 -4 -4 V6 a4 4 0 0 1 4 -4 z"
                                fill={`url(#docGrad-${msg.id}-${attIdx})`}
                                stroke="rgba(255,255,255,0.18)"
                                strokeWidth="1"
                              />
                              <path
                                d="M28 2 V14 H40"
                                fill="none"
                                stroke="rgba(255,255,255,0.22)"
                                strokeWidth="1"
                              />
                              {/* Extension ribbon */}
                              <rect x="2" y="30" width="36" height="14" rx="3" fill={tagColor} />
                              <text
                                x="20" y="40"
                                textAnchor="middle"
                                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                                fontSize="8"
                                fontWeight="800"
                                fill="#0B1018"
                                letterSpacing="0.04em"
                              >
                                {ext ? ext.toUpperCase().slice(0, 5) : 'FILE'}
                              </text>
                            </svg>
                          </div>
                          {/* Filename + size */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600, color: C.text,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              lineHeight: 1.25,
                            }}>
                              {att.name || 'Attached file'}
                            </div>
                            <div style={{
                              marginTop: 2,
                              display: 'flex', alignItems: 'center', gap: 6,
                              fontSize: 10, color: C.muted,
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                              letterSpacing: '0.02em',
                            }}>
                              {fileSizeLabel && <span>{fileSizeLabel}</span>}
                              {fileSizeLabel && <span style={{ opacity: 0.5 }}>·</span>}
                              <span style={{ color: tagColor, fontWeight: 700 }}>
                                {ext ? ext.toUpperCase() : 'FILE'}
                              </span>
                            </div>
                          </div>
                          {/* Open affordance, fades in on hover */}
                          <div
                            data-open-hint
                            style={{
                              flexShrink: 0,
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                              color: C.text2, opacity: 0, transition: 'opacity 0.15s ease',
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                            }}
                          >
                            OPEN
                            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                              <path d="M2 8 L8 2 M4 2 H8 V6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      )
                    })
                    if (isMulti) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '6px 16px', marginTop: hasText ? 6 : 0 }}>
                          {items}
                        </div>
                      )
                    }
                    return <div style={{ marginTop: hasText ? 6 : 0 }}>{items}</div>
                  })()}
                  {/* Timestamp + check marks + verification badge. */}
                  <div style={{
                    fontSize: 11,
                    color: isProject ? 'rgba(120,140,165,0.4)' : 'rgba(120,140,165,0.5)',
                    marginTop: 4,
                    textAlign: isUser ? 'right' : 'left',
                    paddingRight: isUser ? 2 : 0,
                    paddingLeft: isUser ? 0 : 2,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    gap: isProject ? 6 : 2,
                  }}>
                    {isProject
                      ? <span>{formatChatTime(msg.timestamp)}</span>
                      : formatChatTime(msg.timestamp)
                    }
                    {!isProject && isUser && <MessageChecks msgId={msg.id} isResponded={respondedSet.has(msg.id)} />}
                    {msgFlagged && (
                      <span style={isProject ? {} : { marginLeft: 6 }}>
                        <NeedsVerificationBadge testId={`msg-verify-badge-${msg.id}`} label="Needs QA" />
                      </span>
                    )}
                  </div>
                  {/* Agent rooms: message status label. */}
                  {!isProject && isUser && msg.status && !String(msg.id).startsWith('temp-') && (
                    <MessageStatusLabel status={msg.status} replied={respondedSet.has(msg.id)} />
                  )}
                </div>
                {/* User avatar */}
                {isUser && (
                  <div title={senderName || 'User'} style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: senderAvatar ? 'transparent' : senderColor,
                    border: senderAvatar ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {senderAvatar
                      ? <img src={senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{
                          fontSize: isProject ? 11 : 10,
                          fontWeight: 700, color: '#fff',
                          fontFamily: isProject ? "'Inter', sans-serif" : undefined,
                        }}>{senderInitial}</span>
                    }
                  </div>
                )}
              </div>
              </div>{/* end hover wrapper */}
              {/* R75-r65-f: under-user step chain, indented to agent-avatar column. */}
              {userBubbleSteps && (
                <div style={{ paddingLeft: 38, paddingTop: 6, paddingBottom: 12 }}>
                  <StepThread
                    steps={userBubbleSteps}
                    settled={hasAssistantReply}
                    isError={false}
                    agentColor={roomColor}
                  />
                </div>
              )}
              {/* c76e17f9: bridge from user bubble to synthetic chain on turn 2+. */}
              {isUser && !isFirstTurn && inFlight && idx === arr.length - 1 && !userBubbleSteps && (
                <div aria-hidden="true" style={{ paddingLeft: 28, display: 'flex', height: 12 }}>
                  <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}

      {/* R75-r65-g: progressive synthetic chain + stall-CTA typing indicator. */}
      {inFlight && (
        <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
          <StepThread
            steps={syntheticSteps.length > 0 ? syntheticSteps : [{
              id: 'synthetic-thinking',
              step_index: 0,
              text: `${roomName}${isProject ? ' agent' : ''} is thinking…`,
              status: 'in_progress',
            }]}
            settled={false}
            isError={false}
            isStalled={chainStalled}
            agentColor={roomColor}
          />
        </div>
      )}
      {/* corner:chat-reliability CR-2 -- task-room failure final step. */}
      {(taskTerminalFailed || followupFailed) && inFlightRaw && (
        <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
          <StepThread
            steps={[{
              id: 'task-room-failed',
              step_index: 0,
              text: taskTerminalFailed && taskRow?.error
                ? `Worker failed: ${String(taskRow.error).slice(0, 200)}`
                : 'Worker failed. Send another message to retry.',
              status: 'error',
            }]}
            settled={true}
            isError={true}
            agentColor={roomColor}
          />
          <TypingIndicatorV2
            streaming={true}
            stalled={chainStalled}
            stepActiveRecently={stepActiveRecently}
            agentColor={roomColor}
            agentSlug={roomSlug}
            agentName={roomName}
            {...(!isProject && { onPoke: (text) => sendAgentTextRef?.current?.(text) })}
            onStall={handleTypingStall}
            worldId={worldId || 'aom'}
            compact={true}
          />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Right-click / long-press context menu for messages (desktop) */}
    {!isMobile && (
      <MessageContextMenu
        open={!!msgMenu}
        x={msgMenu?.x || 0}
        y={msgMenu?.y || 0}
        message={msgMenu?.message || null}
        agents={agents || []}
        onClose={() => setMsgMenu(null)}
        onReply={(m) => handleMessageFollowUp?.(m)}
        onFollowUp={(m) => handleMessageFollowUp?.(m)}
        onNeedsVerification={(m) => handleMessageNeedsVerification?.(m)}
        onResearch={(m) => handleMessageResearch?.(m)}
        onSendTo={(target) => handleMessageSendTo?.(msgMenu?.message, target)}
      />
    )}
    {/* Mobile long-press action sheet (bottom sheet) */}
    {isMobile && (
      <MobileActionSheet
        open={!!msgMenu}
        message={msgMenu?.message || null}
        onClose={() => setMsgMenu(null)}
        onReply={(m) => handleMessageFollowUp?.(m)}
        onCopy={(m) => { if (m?.text) navigator.clipboard?.writeText(m.text).catch(() => {}) }}
        onNeedsVerification={(m) => handleMessageNeedsVerification?.(m)}
        onResearch={(m) => handleMessageResearch?.(m)}
      />
    )}
    </>
  )
}
