import { useMemo } from 'react'

// Message status: checkmarks + persistent typing.
// Build a set of user message IDs that have been "responded to" (an assistant
// message exists after them in the thread). Also detect if the agent hasn't
// responded to the latest user message yet -> show typing indicator.
export default function useThreadMessageStatus(messages) {
  return useMemo(() => {
    const responded = new Set()
    let awaiting = false
    // Walk messages in order. Each assistant message "responds to" the most
    // recent preceding user message.
    let lastUserMsgId = null
    for (const m of messages) {
      if (m.role === 'user') {
        lastUserMsgId = m.id
      } else if (m.role === 'assistant' && lastUserMsgId) {
        responded.add(lastUserMsgId)
        lastUserMsgId = null
      }
    }
    // If the last message is from the user and has a real ID, agent hasn't responded
    if (lastUserMsgId && !String(lastUserMsgId).startsWith('temp-')) {
      awaiting = true
    }
    return { respondedSet: responded, awaitingResponse: awaiting }
  }, [messages])
}
