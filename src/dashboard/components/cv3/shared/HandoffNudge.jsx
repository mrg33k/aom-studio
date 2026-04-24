// R75-b3 -- session-hygiene nudge. Reads visibility + actions from useChatCore.
// Replaces the inline lavender banner duplicated in ThreadView + ProjectChatView
// and adds a third mount point on the home surface (ConversationsView).
//
// Three actions:
//   accept  -- writes handoff-requested event + clears exchange count (fresh start)
//   snooze  -- pushes the next nudge out by +5 to +10 turns
//   dismiss -- hides for this chat until the chat is switched or reset
import { useChatCore } from '../chat/ChatPanelContext.jsx'

const WRAP = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 8, padding: '8px 14px',
  background: 'rgba(99,102,241,0.1)',
  borderTop: '1px solid rgba(99,102,241,0.2)',
  flexShrink: 0,
}
const LABEL = { fontSize: 12, color: '#A5B4FC', fontFamily: "'Inter', sans-serif", flex: 1 }
const BTN_PRIMARY = {
  background: 'rgba(99,102,241,0.25)',
  border: '1px solid rgba(99,102,241,0.4)',
  color: '#C7D2FE',
  fontSize: 11,
  fontFamily: "'Inter', sans-serif",
  padding: '4px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  flexShrink: 0,
}
const BTN_GHOST = { ...BTN_PRIMARY, background: 'transparent', border: '1px solid rgba(99,102,241,0.25)', color: 'rgba(165,180,252,0.8)' }
const BTN_DISMISS = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(165,180,252,0.6)', fontSize: 16, lineHeight: 1,
  padding: '0 4px', flexShrink: 0,
}

export default function HandoffNudge() {
  const { showHandoffNudge, acceptHandoffNudge, snoozeHandoffNudge, dismissHandoffNudge } = useChatCore()
  if (!showHandoffNudge) return null
  return (
    <div data-testid="handoff-nudge" style={WRAP}>
      <span style={LABEL}>Want to write a handoff and start fresh?</span>
      <button data-testid="handoff-nudge-accept" style={BTN_PRIMARY} onClick={acceptHandoffNudge}>Write handoff</button>
      <button data-testid="handoff-nudge-snooze" style={BTN_GHOST} onClick={snoozeHandoffNudge}>Snooze</button>
      <button data-testid="handoff-nudge-dismiss" style={BTN_DISMISS} onClick={dismissHandoffNudge} aria-label="Dismiss">×</button>
    </div>
  )
}
