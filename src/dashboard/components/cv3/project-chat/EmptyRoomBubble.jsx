// EmptyRoomBubble -- a single "Where are we?" pill that sits just above
// the composer when a project/mission room has no messages yet. Replaces
// the heavier MissionStateCard + DocUpdatesStripe arrival widgets.
//
// Behavior:
//   - Renders only when messages.length === 0 and not still loading.
//   - Tap fires "Where are we?" into the chat via sendProjectText, then
//     hides immediately so the room can fill with the agent's reply.
//   - Disappears on its own once any message exists in the room.

import { useEffect, useState } from 'react'
import { useChatMessagesCtx, useChatSendCtx, useChatCore } from '../chat/ChatPanelContext.jsx'

export default function EmptyRoomBubble() {
  const { selectedProject } = useChatCore()
  const { messages, loadingMsgs } = useChatMessagesCtx()
  const { sendProjectText } = useChatSendCtx()
  const [kicked, setKicked] = useState(false)

  useEffect(() => { setKicked(false) }, [selectedProject?.slug, selectedProject?.missionSlug])

  if (!selectedProject?.slug) return null
  if (loadingMsgs) return null
  if (Array.isArray(messages) && messages.length > 0) return null
  if (kicked) return null

  const onTap = () => {
    setKicked(true)
    try { sendProjectText?.('Where are we?') } catch (_) {}
  }

  return (
    <div
      data-empty-room-bubble
      style={{
        display: 'flex', justifyContent: 'center',
        padding: '4px 14px 10px 14px',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onTap}
        data-test-id="empty-room-bubble"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12.5, fontWeight: 500,
          letterSpacing: '0.01em',
          padding: '8px 16px',
          borderRadius: 999,
          background: 'rgba(245, 158, 11, 0.08)',
          color: '#fcd34d',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          cursor: 'pointer',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(245, 158, 11, 0.14)'
          e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.42)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'
          e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.28)'
        }}
      >
        Where are we? <span style={{ opacity: 0.7, marginLeft: 2 }}>→</span>
      </button>
    </div>
  )
}
