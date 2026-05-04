import React, { useMemo, useState, useEffect } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { LinkifyText, AgentAvatar, formatChatTime } from '../shared.jsx'
import ChatMessageRenderer from '../../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../../TypingIndicatorV2.jsx'
import StepThread from '../shared/StepThread.jsx'
import useSyntheticChain from '../shared/useSyntheticChain.js'
import DocUpdatesStripe from '../shared/DocUpdateCard.jsx'
import { renderTaskCardForMessage } from '../TaskStatusCard.jsx'
import { NeedsVerificationBadge, MessageContextMenu } from '../ContextMenu.jsx'
import MessageChecks from './MessageChecks.jsx'
import MessageStatusLabel from './MessageStatusLabel.jsx'
import useThreadMsgMenu from './useThreadMsgMenu.js'
import useThreadMessageStatus from './useThreadMessageStatus.js'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatSendCtx,
  useChatSearchCtx,
  useChatContextMenuCtx,
} from '../chat/ChatPanelContext.jsx'

function isKickoffMessage(m) {
  const meta = m?.metadata
  if (!meta) return false
  if (typeof meta === 'string') {
    try { return !!JSON.parse(meta)?.kickoff_sweep } catch { return false }
  }
  return !!meta.kickoff_sweep
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
    selectedAgent, selectedProject, currentUser, displayName, allTasks, agents, worldId,
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

  // R73: invoked by TypingIndicatorV2 after the stall-CTA fires.
  const handleTypingStall = () => {
    setSending?.(false)
    setIsAgentTyping?.(false)
  }

  // K2: awaitingResponse included for both room types. Previously project rooms
  // only had `sending || isAgentTyping`, causing the synthetic chain to collapse
  // prematurely when the POST returned but the assistant reply hadn't arrived yet.
  const inFlight = sending || awaitingResponse || isAgentTyping

  // R73-fix: wall-clock stall detection. Moves silence-detection out of
  // TypingIndicatorV2 (which resets its timer on every remount) into MessageList
  // where it survives any subordinate re-render. Fires when the last real user
  // message has been unanswered for 45s and the thread is still in-flight.
  const [nowMs, setNowMs] = useState(() => Date.now())
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

  // awaitingResponse=true means no assistant message (real or bridge-stream) has
  // arrived yet — strictly the relay path where the agent hasn't replied at all.
  const chainStalled = inFlight && awaitingResponse && msSinceUser >= 45_000

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

  return (
    <>
    <div
      data-testid={isProject ? 'project-message-list' : undefined}
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
            <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={44} />
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

      {renderedMessages
        .filter(m => !(m.source === 'bridge-stream' && m._streaming && !m.text))
        .map((msg, idx, arr) => {
          // Task status cards (Steffen's CV3 design).
          const taskCard = renderTaskCardForMessage(msg, {
            ...(!isProject && { selectedAgent }),
            formatTime: formatChatTime,
          })
          if (taskCard) return <div key={msg.id}>{taskCard}</div>

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
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6 }}>
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

          // Voice transcript (agent rooms only).
          if (!isProject && msg.source === 'voice') {
            const isVoiceUser = msg.role === 'user'
            return (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: isVoiceUser ? 'flex-end' : 'flex-start',
                marginBottom: 6,
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

          const isUser = msg.role === 'user'
          // c76e17f9: detect turn boundary.
          const prevMsg = idx > 0 ? arr[idx - 1] : null
          const isNewTurn = isUser && prevMsg?.role === 'assistant'
          const senderName = msg.user_name || (isUser ? displayName : null)
          const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
          const isOtherUser = isUser && msg.user_name && msg.user_name !== displayName
          const senderColor = isUser ? (isOtherUser ? '#7C3AED' : '#2563EB') : roomColor
          const senderProfile = msg.user_id
            ? (msg.user_id === currentUser?.id
                ? { avatar_url: currentUser?.user_metadata?.avatar_url }
                : userProfiles[msg.user_id])
            : null
          const senderAvatar = senderProfile?.avatar_url || null
          const msgFlagged = needsVerificationIds?.has?.(msg.id)
          const userBubbleSteps = isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0
            ? stepsByMessageId[msg.id]
            : null
          const hasNewerUserMsg = userBubbleSteps
            ? arr.slice(idx + 1).some(m => m.role === 'user')
            : false

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
              <div
                data-test-id="chat-message"
                data-message-id={msg.id}
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
                      <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={28} />
                    </div>
                  )
                )}
                <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
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
                  {msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: ')) && (() => {
                    const hasChain = !isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0
                    if (isUser) {
                      return (
                        <div style={{
                          padding: '10px 16px',
                          borderRadius: '18px 18px 4px 18px',
                          fontSize: 14, lineHeight: 1.6,
                          color: '#fff',
                          background: senderColor,
                          border: 'none',
                          wordBreak: 'break-word',
                          fontFamily: "'Inter', sans-serif",
                          letterSpacing: '-0.01em',
                          whiteSpace: 'pre-wrap',
                        }}>
                          <LinkifyText text={msg.text} />
                        </div>
                      )
                    }
                    return (
                      <div
                        data-testid={hasChain ? 'assistant-final-message' : undefined}
                        style={{
                          padding: hasChain ? '12px 14px' : '2px 0',
                          borderRadius: hasChain ? 8 : 0,
                          border: hasChain ? '1px solid rgba(255,255,255,0.08)' : 'none',
                          marginTop: hasChain ? 8 : 0,
                          fontSize: 14, lineHeight: 1.6,
                          color: '#E2E8F0',
                          background: 'transparent',
                          wordBreak: 'break-word',
                          fontFamily: "'Inter', sans-serif",
                          letterSpacing: '-0.01em',
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
                  {/* Agent rooms: file/image attachments. */}
                  {!isProject && (() => {
                    const atts = (msg.attachments && msg.attachments.length)
                      ? msg.attachments
                      : msg.attachment_url
                        ? [{
                            url: msg.attachment_url,
                            mime: msg.file_mime_type,
                            size: msg.file_size,
                            name: msg.text && msg.text.startsWith('Attached file: ')
                              ? msg.text.replace('Attached file: ', '')
                              : msg.file_name || null,
                          }]
                        : []
                    if (!atts.length) return null
                    const hasText = msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: '))
                    const isMulti = atts.length > 1
                    const items = atts.map((att, attIdx) => {
                      const isImage = att.mime && att.mime.startsWith('image/')
                      if (isImage) {
                        return (
                          <div
                            key={attIdx}
                            style={{
                              alignSelf: isUser ? 'flex-end' : 'flex-start',
                              borderRadius: 16, overflow: 'hidden',
                              maxWidth: '70%', cursor: 'pointer',
                              transition: 'transform 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                          >
                            <img src={att.url} alt="" style={{ width: '100%', display: 'block', borderRadius: 16 }} />
                          </div>
                        )
                      }
                      return (
                        <div
                          key={attIdx}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            background: C.s2, border: '1px solid ' + C.border,
                            borderRadius: 14, padding: '10px 14px',
                            display: 'flex', alignItems: 'center', gap: 10,
                            maxWidth: '75%', cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: C.accentBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, color: C.accent,
                            fontSize: 11, fontWeight: 800,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {att.name ? att.name.split('.').pop().toUpperCase().slice(0, 4) : 'FILE'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {att.name || 'Attached file'}
                            </div>
                            {att.size != null && (
                              <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                                {att.size < 1024 * 1024
                                  ? `${Math.round(att.size / 1024)} KB`
                                  : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                              </div>
                            )}
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
              {/* R75-r65-f: under-user step chain, indented to agent-avatar column. */}
              {userBubbleSteps && (
                <div style={{ paddingLeft: 38, paddingTop: 6, paddingBottom: 12 }}>
                  <StepThread
                    steps={userBubbleSteps}
                    settled={hasNewerUserMsg}
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
          <TypingIndicatorV2
            streaming={true}
            stalled={chainStalled}
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

    {/* Right-click / long-press context menu for messages. */}
    <MessageContextMenu
      open={!!msgMenu}
      x={msgMenu?.x || 0}
      y={msgMenu?.y || 0}
      message={msgMenu?.message || null}
      agents={agents || []}
      onClose={() => setMsgMenu(null)}
      onFollowUp={(m) => handleMessageFollowUp?.(m)}
      onNeedsVerification={(m) => handleMessageNeedsVerification?.(m)}
      onResearch={(m) => handleMessageResearch?.(m)}
      onSendTo={(target) => handleMessageSendTo?.(msgMenu?.message, target)}
    />
    </>
  )
}
