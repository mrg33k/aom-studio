import { C } from '../../../lib/cv3Colors.js'
import { LinkifyText, AgentAvatar, formatChatTime } from '../shared.jsx'
import ChatMessageRenderer from '../../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../../TypingIndicatorV2.jsx'
import StepThread from '../shared/StepThread.jsx'
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
  useChatContextMenuCtx,
} from '../chat/ChatPanelContext.jsx'

// Scrollable messages area with all bubble variants: task status, chain card,
// voice transcript (Gemini Live), and regular user/assistant message with
// attachments. Also renders the loading/empty states and typing indicator.
// Also owns the right-click/long-press context menu for messages.
export default function MessageList() {
  const {
    selectedAgent, currentUser, displayName, allTasks, agents, worldId,
  } = useChatCore()
  const {
    messages, loadingMsgs, messagesEndRef, userProfiles,
    stepsByMessageId = {},
  } = useChatMessagesCtx()
  const {
    sending, setSending, isAgentTyping, setIsAgentTyping, sendAgentTextRef,
  } = useChatSendCtx()

  // R73: invoked by TypingIndicatorV2 after the stall-CTA hits
  // /api/dashboard/clear-context. Unmount the typing UI so the user sees
  // an unmistakable reset instead of an indefinite spin.
  const handleTypingStall = () => {
    setSending?.(false)
    setIsAgentTyping?.(false)
  }
  const {
    needsVerificationIds,
    handleMessageFollowUp, handleMessageNeedsVerification,
    handleMessageResearch, handleMessageSendTo,
  } = useChatContextMenuCtx()

  const { msgMenu, setMsgMenu, openMsgMenu, startLongPress, cancelLongPress } = useThreadMsgMenu()
  const { respondedSet, awaitingResponse } = useThreadMessageStatus(messages)

  return (
    <>
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>

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
          <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={44} />
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
            {selectedAgent.name}
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
        </div>
      )}

      {messages.filter(m => !(m.source === 'bridge-stream' && m._streaming && !m.text)).map(msg => {
        const isUser = msg.role === 'user'
        const agSenderName = msg.user_name || (isUser ? displayName : null)
        const agSenderInitial = agSenderName ? agSenderName[0].toUpperCase() : 'U'
        const agIsOtherUser = isUser && msg.user_name && msg.user_name !== displayName
        const agSenderColor = isUser ? (agIsOtherUser ? '#7C3AED' : '#2563EB') : selectedAgent?.color || '#3B82F6'
        const agProfile = msg.user_id ? (msg.user_id === currentUser?.id ? { avatar_url: currentUser?.user_metadata?.avatar_url } : userProfiles[msg.user_id]) : null
        const agAvatar = agProfile?.avatar_url || null

        // Task status cards (Steffen's CV3 design). One helper dispatches
        // checkpoint / task-runner / task-completion / task-notification and
        // the rex "Task Created" announcements into the shared card.
        const taskCard = renderTaskCardForMessage(msg, { selectedAgent, formatTime: formatChatTime })
        if (taskCard) {
          return <div key={msg.id}>{taskCard}</div>
        }

        // Chain card: posted by chat-bridge when user sends "a >> b >> c" and
        // by task-complete.sh when a chain finishes or blocks. msg.metadata holds
        // chain_id, chain_total, chain_status ('queued'|'complete'|'blocked'),
        // chain_tasks: [{id, seq, title, status}].
        if (msg.source === 'chain-card') {
          const cm = msg.metadata || {}
          const chainTotal = cm.chain_total || (cm.chain_tasks || []).length || 0
          const chainStatus = cm.chain_status || 'queued'
          // Try to resolve up-to-date task statuses from allTasks if available.
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
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 6,
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '10px 12px',
                borderRadius: 12,
                background: headerBg,
                border: `1px solid ${headerBorder}`,
                fontFamily: "'Inter', sans-serif",
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: headerColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 6px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,0.18)',
                      }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: d.c,
                          boxShadow: d.pulse ? `0 0 0 4px ${d.c}22` : 'none',
                          animation: d.pulse ? 'cv3pulse 1.4s ease-in-out infinite' : 'none',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: 'rgba(148,163,184,0.7)',
                          fontFamily: "'JetBrains Mono', monospace",
                          minWidth: 28,
                        }}>
                          {t.seq}/{chainTotal}
                        </span>
                        <span style={{
                          fontSize: 12,
                          color: 'rgba(226,232,240,0.92)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {t.title}
                        </span>
                        <span style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: d.c,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {d.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div style={{
                  fontSize: 9,
                  color: 'rgba(148,163,184,0.45)',
                  marginTop: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {formatChatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          )
        }

        // Voice transcript turns: the live Gemini-Live layer persists each turn
        // to the DB so Patrik can scroll back through the call, but the
        // supabase-listener does NOT forward these to the terminal agent. They
        // get a distinct indigo treatment so Patrik can tell at a glance that
        // these were spoken (via Gemini) and didn't reach Elon. Only the
        // post-call voice-summary Haiku message actually lands in Elon's inbox.
        if (msg.source === 'voice') {
          const isVoiceUser = msg.role === 'user'
          const voiceBg = 'rgba(129,140,248,0.10)'
          const voiceBorder = '1px dashed rgba(129,140,248,0.35)'
          const voiceAccent = '#A5B4FC'
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isVoiceUser ? 'flex-end' : 'flex-start',
                marginBottom: 6,
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: 12,
                background: voiceBg,
                border: voiceBorder,
                fontFamily: "'Inter', sans-serif",
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: voiceAccent,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {isVoiceUser ? 'Patrik (voice)' : 'Gemini (voice)'}
                  </span>
                  <span style={{
                    fontSize: 7,
                    fontWeight: 700,
                    color: 'rgba(129,140,248,0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: 'rgba(129,140,248,0.15)',
                  }}>
                    not sent to {selectedAgent.name}
                  </span>
                </div>
                <div style={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'rgba(226,232,240,0.78)',
                  fontStyle: 'italic',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 9,
                  color: 'rgba(129,140,248,0.45)',
                  marginTop: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {formatChatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          )
        }

        const msgFlagged = needsVerificationIds?.has?.(msg.id)
        return (
          <div
            key={msg.id}
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
              marginBottom: isUser ? 4 : 12,
            }}
          >
            {!isUser && (
              <div style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={28} />
              </div>
            )}
            <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
              {/* R65-impl: live-thread step chain. Renders above the final
                  reply while steps accumulate; settles dim once the parent
                  message.text is non-empty. */}
              {!isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0 && (
                <div style={{ marginBottom: msg.text ? 10 : 0 }}>
                  <StepThread
                    steps={stepsByMessageId[msg.id]}
                    settled={Boolean(msg.text)}
                    isError={msg.metadata?.status === 'error'}
                    agentColor={selectedAgent?.color || '#3B82F6'}
                  />
                </div>
              )}
              {/* Text bubble -- hidden when text is only the attachment label.
                  R75-r65-c: assistant replies that have a settled step chain
                  above them get the R65-design v3 container treatment
                  (border + radius 8 + padding) so the final message reads as
                  the anchor Steffen designed. Plain assistant replies (no
                  chain) stay bare. User bubbles unchanged. */}
              {msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: ')) && (() => {
                const hasChain = !isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0
                if (isUser) {
                  return (
                    <div style={{
                      padding: '10px 16px',
                      borderRadius: '18px 18px 4px 18px',
                      fontSize: 14, lineHeight: 1.6,
                      color: '#fff',
                      background: agSenderColor,
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
              {isUser && msg.user_name && msg.user_name !== displayName && (
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 3, marginTop: -2, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}>
                  {msg.user_name}
                </div>
              )}
              {/* Attachments -- rendered outside bubble using Steffen's styles */}
              {(() => {
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
                const items = atts.map((att, idx) => {
                  const isImage = att.mime && att.mime.startsWith('image/')
                  if (isImage) {
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          borderRadius: 16,
                          overflow: 'hidden',
                          maxWidth: '70%',
                          cursor: 'pointer',
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
                      key={idx}
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        background: C.s2,
                        border: '1px solid ' + C.border,
                        borderRadius: 14,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        maxWidth: '75%',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: C.accentBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        color: C.accent,
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
              <div style={{
                fontSize: 11, color: 'rgba(120,140,165,0.5)',
                marginTop: 4,
                textAlign: isUser ? 'right' : 'left',
                paddingRight: isUser ? 2 : 0,
                paddingLeft: isUser ? 0 : 2,
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: 2,
              }}>
                {formatChatTime(msg.timestamp)}
                {isUser && <MessageChecks msgId={msg.id} isResponded={respondedSet.has(msg.id)} />}
                {msgFlagged && (
                  <span style={{ marginLeft: 6 }}>
                    <NeedsVerificationBadge testId={`msg-verify-badge-${msg.id}`} label="Needs QA" />
                  </span>
                )}
              </div>
              {isUser && msg.status && !String(msg.id).startsWith('temp-') && !respondedSet.has(msg.id) && (
                <MessageStatusLabel status={msg.status} />
              )}
            </div>
            {isUser && (
              <div title={agSenderName || 'User'} style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: agAvatar ? 'transparent' : agSenderColor,
                border: agAvatar ? '1px solid rgba(255,255,255,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {agAvatar
                  ? <img src={agAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{agSenderInitial}</span>
                }
              </div>
            )}
          </div>
        )
      })}
      {(sending || awaitingResponse || isAgentTyping) && (
        <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
          {/* R75-r65: live-thread chain. The first slice shows a synthetic
              step while the reply is in flight so the user sees the R65
              design immediately — the chain + pulsing dot is the feel,
              replacing the bare "typing…" experience. When worker emission
              lands richer steps (via relay-emit-step.py), they'll render
              in this slot too. TypingIndicatorV2 stays below for the R73
              fail-loud stall CTA at 45s. */}
          <StepThread
            steps={[{
              id: 'synthetic-thinking',
              step_index: 0,
              text: `${selectedAgent?.name || 'Agent'} is thinking…`,
              status: 'in_progress',
            }]}
            settled={false}
            isError={false}
            agentColor={selectedAgent?.color || '#3B82F6'}
          />
          <TypingIndicatorV2
            streaming={true}
            agentColor={selectedAgent?.color || '#3B82F6'}
            agentName={selectedAgent?.name}
            agentSlug={selectedAgent?.slug}
            onPoke={(text) => sendAgentTextRef?.current?.(text)}
            onStall={handleTypingStall}
            worldId={worldId || 'aom'}
            compact={true}
          />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Right-click / long-press context menu for messages */}
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
