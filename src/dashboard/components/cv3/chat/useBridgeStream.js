// useBridgeStream -- SSE streaming from the chat-bridge endpoint.
// Extracted from ChatPanel.jsx (R2b split). Owns the "assistant is typing"
// flag plus the fetch/reader loop that streams response chunks into the
// messages array as a temp assistant entry, which the Realtime subscription
// later swaps for the real Supabase row.
import { useCallback, useRef, useState } from 'react'
import { authFetch } from '../../../lib/authFetch.js'

export default function useBridgeStream({ setMessages, refetchHistoryRef }) {
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const bridgeAbortRef = useRef(null)
  const refetchTimerRef = useRef(null)

  const startBridgeStream = useCallback((messageId, agentSlug) => {
    setIsAgentTyping(true)
    const tempAsstId = `bridge-stream-${messageId}`

    // The backend persists each thought-segment as its own Supabase row as the
    // turn unfolds (sse-room-bridge.py _complete_turn). Those normally arrive
    // via Realtime, but the socket silently drops on token expiry / backgrounded
    // tab / channel error, so the live chain never renders and the turn reads as
    // dead. Pull history now and on a light cadence while the stream is open so
    // the per-segment bubbles appear even when Realtime is down. mergeServerRows
    // dedups, so an extra refetch is idempotent. (council 2026-06-13, step 2 #1)
    const pullSegments = () => { try { refetchHistoryRef?.current?.() } catch {} }
    pullSegments()
    if (refetchTimerRef.current) clearInterval(refetchTimerRef.current)
    refetchTimerRef.current = setInterval(pullSegments, 2500)
    const stopPulling = () => {
      if (refetchTimerRef.current) {
        clearInterval(refetchTimerRef.current)
        refetchTimerRef.current = null
      }
      // One final pull so the closing segment lands even if it was written
      // between the last interval tick and the stream's done event.
      pullSegments()
    }

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

    authFetch(`/api/dashboard/chat-bridge?stream=${encodeURIComponent(messageId)}`, {
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        stopPulling()
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
              stopPulling()
              setIsAgentTyping(false)
              // Mark streaming complete. The Realtime subscription may replace
              // this temp message with the real Supabase row (dedup by text match).
              setMessages(prev => prev.map(m => m.id === tempAsstId ? { ...m, _streaming: false } : m))
              return
            } else if (event.type === 'error') {
              stopPulling()
              setIsAgentTyping(false)
              return
            }
          } catch {}
        }
      }
      // Stream ended without explicit done/fallback — clear streaming flag so
      // the render gate doesn't permanently hide the placeholder.
      stopPulling()
      setMessages(prev => prev.map(m => m.id === tempAsstId ? { ...m, _streaming: false } : m))
      setIsAgentTyping(false)
    }).catch(() => {
      stopPulling()
      setIsAgentTyping(false)
    })
  }, [setMessages, refetchHistoryRef])

  return { isAgentTyping, setIsAgentTyping, bridgeAbortRef, startBridgeStream }
}
