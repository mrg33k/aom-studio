// useBridgeStream -- SSE streaming from the chat-bridge endpoint.
// Extracted from ChatPanel.jsx (R2b split). Owns the "assistant is typing"
// flag plus the fetch/reader loop that streams response chunks into the
// messages array as a temp assistant entry, which the Realtime subscription
// later swaps for the real Supabase row.
import { useCallback, useRef, useState } from 'react'

export default function useBridgeStream({ setMessages }) {
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const bridgeAbortRef = useRef(null)

  const startBridgeStream = useCallback((messageId, agentSlug) => {
    setIsAgentTyping(true)
    const tempAsstId = `bridge-stream-${messageId}`

    // Insert placeholder assistant message
    setMessages(prev => [...prev, {
      id: tempAsstId,
      role: 'assistant',
      agent: agentSlug,
      text: '',
      timestamp: new Date().toISOString(),
      source: 'bridge-stream',
      _streaming: true,
    }])

    const controller = new AbortController()
    bridgeAbortRef.current = controller

    fetch(`/api/dashboard/chat-bridge?stream=${encodeURIComponent(messageId)}`, {
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        setIsAgentTyping(false)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'chunk' && event.text) {
              fullText += event.text
              const snap = fullText
              setMessages(prev => prev.map(m => m.id === tempAsstId ? { ...m, text: snap } : m))
            } else if (event.type === 'done' || event.type === 'fallback') {
              setIsAgentTyping(false)
              // Mark streaming complete. The Realtime subscription may replace
              // this temp message with the real Supabase row (dedup by text match).
              setMessages(prev => prev.map(m => m.id === tempAsstId ? { ...m, _streaming: false } : m))
              return
            } else if (event.type === 'error') {
              setIsAgentTyping(false)
              return
            }
          } catch {}
        }
      }
      setIsAgentTyping(false)
    }).catch(() => {
      setIsAgentTyping(false)
    })
  }, [setMessages])

  return { isAgentTyping, setIsAgentTyping, bridgeAbortRef, startBridgeStream }
}
