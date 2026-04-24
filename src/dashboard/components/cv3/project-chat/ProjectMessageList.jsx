import { useMemo, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { LinkifyText, formatChatTime } from '../shared.jsx'
import ChatMessageRenderer from '../../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../../TypingIndicatorV2.jsx'
import StepThread from '../shared/StepThread.jsx'
import DocUpdatesStripe from '../shared/DocUpdateCard.jsx'
import { renderTaskCardForMessage } from '../TaskStatusCard.jsx'
import { NeedsVerificationBadge, MessageContextMenu } from '../ContextMenu.jsx'
import useProjectChatMsgMenu from './useProjectChatMsgMenu.js'
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

// Scrollable messages area for project chat. Renders:
// - Task status cards for task-* / checkpoint messages (via TaskStatusCard)
// - Regular user / agent bubbles with avatar + name + timestamp
// - NeedsVerification badge per flagged message
// - Typing indicator while `sending`
// Hidden (display:none) while search results are being shown.
// Also owns the right-click/long-press context menu for messages.
export default function ProjectMessageList() {
  const {
    selectedProject, displayName, currentUser, agents, worldId,
  } = useChatCore()
  const { messages, loadingMsgs, messagesEndRef, userProfiles, stepsByMessageId = {} } = useChatMessagesCtx()
  const { sending, setSending, isAgentTyping, setIsAgentTyping } = useChatSendCtx()

  // R73: stall CTA clears typing state so the indicator unmounts.
  const handleTypingStall = () => {
    setSending?.(false)
    setIsAgentTyping?.(false)
  }
  const { chatSearchOpen, chatSearchResults } = useChatSearchCtx()
  const {
    needsVerificationIds,
    handleMessageFollowUp, handleMessageNeedsVerification,
    handleMessageResearch, handleMessageSendTo,
  } = useChatContextMenuCtx()

  const { msgMenu, setMsgMenu, openMsgMenu, startLongPress, cancelLongPress } = useProjectChatMsgMenu()
  const projColor = selectedProject?.color || '#6B8AB0'
  const hidden = chatSearchOpen && chatSearchResults && chatSearchResults.length > 0

  // R50b: partition around the most-recent kickoff message so pre-ratification
  // chatter collapses under a "show earlier messages" affordance.
  const { preKickoff, postKickoff, hasCutoff } = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return { preKickoff: [], postKickoff: [], hasCutoff: false }
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
  }, [messages])

  const [earlierExpanded, setEarlierExpanded] = useState(false)

  return (
    <>
    <div data-testid="project-message-list" style={{
      flex: 1, overflowY: 'auto',
      padding: '12px 14px',
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column', gap: 6,
    }}>
      {/* R75-h1: surface recent VISION/BUILD/CONTEXT/RESEARCH edits for this project. */}
      {selectedProject?.slug && (
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
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
            border: `1px solid ${projColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              background: projColor,
              boxShadow: `0 0 10px ${projColor}77`,
            }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
            {selectedProject?.name || 'Project'}
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
        </div>
      )}
      {hasCutoff && preKickoff.length > 0 && (
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
      {(hasCutoff
        ? (earlierExpanded ? [...preKickoff, ...postKickoff] : postKickoff)
        : messages
      ).map(msg => {
        // Task status cards: render task-completion / task-runner / checkpoint
        // messages as the CV3 card (Steffen's design) instead of a plain bubble.
        // Mirrors ThreadView so project-room crossposts also get the card.
        const taskCard = renderTaskCardForMessage(msg, { formatTime: formatChatTime })
        if (taskCard) {
          return <div key={msg.id}>{taskCard}</div>
        }
        const isUser = msg.role === 'user'
        const senderName = msg.user_name || (isUser ? displayName : null)
        const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
        const isOtherUser = isUser && msg.user_name && msg.user_name !== displayName
        const senderColor = isUser ? (isOtherUser ? '#7C3AED' : '#2563EB') : projColor
        const senderProfile = msg.user_id ? (msg.user_id === currentUser?.id ? { avatar_url: currentUser?.user_metadata?.avatar_url } : userProfiles[msg.user_id]) : null
        const senderAvatar = senderProfile?.avatar_url || null
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
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${projColor}33, ${projColor}18)`,
                border: `1px solid ${projColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                alignSelf: 'flex-start', marginTop: 2,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: projColor }} />
              </div>
            )}
            <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
              {isUser && isOtherUser && (
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 3, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}>
                  {msg.user_name}
                </div>
              )}
              {/* R65-impl: live-thread step chain for assistant replies. */}
              {!isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0 && (
                <div style={{ marginBottom: msg.text ? 10 : 0 }}>
                  <StepThread
                    steps={stepsByMessageId[msg.id]}
                    settled={Boolean(msg.text)}
                    isError={msg.metadata?.status === 'error'}
                    agentColor={projColor}
                  />
                </div>
              )}
              {/* R75-r65-c: assistant replies under a settled step chain get
                  the R65-design v3 container. Plain replies stay bare. */}
              {(() => {
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
              <div style={{
                fontSize: 11, color: 'rgba(120,140,165,0.4)',
                marginTop: 4,
                textAlign: isUser ? 'right' : 'left',
                paddingRight: isUser ? 2 : 0,
                paddingLeft: isUser ? 0 : 2,
                fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: 6,
              }}>
                <span>{formatChatTime(msg.timestamp)}</span>
                {msgFlagged && (
                  <NeedsVerificationBadge testId={`msg-verify-badge-${msg.id}`} label="Needs QA" />
                )}
              </div>
            </div>
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
                  : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{senderInitial}</span>
                }
              </div>
            )}
          </div>
        )
      })}
      {sending && (
        <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
          {/* R75-r65: live-thread chain (same pattern as 1:1 MessageList). */}
          <StepThread
            steps={[{
              id: 'synthetic-thinking',
              step_index: 0,
              text: `${selectedProject?.name || 'Project'} agent is thinking…`,
              status: 'in_progress',
            }]}
            settled={false}
            isError={false}
            agentColor={projColor}
          />
          <TypingIndicatorV2
            streaming={true}
            agentColor={projColor}
            agentSlug={selectedProject?.slug || 'project'}
            agentName={selectedProject?.name}
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
