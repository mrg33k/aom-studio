/**
 * useBridge -- WebSocket hook for Terminal Bridge
 *
 * Connects a chat box to a Claude agent via the Terminal Bridge server.
 * Handles: connection, reconnection, sending messages, streaming responses,
 * read receipt checks, and connection status.
 *
 * Usage:
 *   const bridge = useBridge('elon')
 *   bridge.send('Fix the onboarding loop')
 *   // bridge.status: 'connecting' | 'connected' | 'disconnected'
 *   // bridge.streaming: true/false
 *   // bridge.check: null | 'single' | 'double' | 'blue'
 *   // bridge.messages: [{ role, content, time }]
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Bridge agents (super agents with direct terminal connections)
export const BRIDGE_AGENTS = ['elon', 'gary', 'bobby']

// Bridge server URL -- Cloudflare tunnel provides wss:// with real cert
// Bridge URL from env, or fallback to Cloudflare tunnel. Update VITE_BRIDGE_URL in .env.production when tunnel URL changes.
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'wss://bridge.aheadofmarket.com'

export function isBridgeAgent(slug) {
  return BRIDGE_AGENTS.includes(slug)
}

export function useBridge(agentSlug, { enabled = true } = {}) {
  const [status, setStatus] = useState('disconnected')
  const [check, setCheck] = useState(null) // read receipt state
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('') // accumulated streaming text
  const [lastResponse, setLastResponse] = useState(null) // { text, time }

  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const streamBuffer = useRef('')

  // Connect to bridge
  const connect = useCallback(() => {
    if (!enabled || !agentSlug || !BRIDGE_AGENTS.includes(agentSlug)) return

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const url = `${BRIDGE_URL}/agent/${agentSlug}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        // Don't set connected yet, wait for ACK
        // Keepalive ping every 30s to prevent idle timeout
        ws._pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }

        switch (msg.type) {
          case 'connected':
            setStatus('connected')
            break

          case 'check':
            // Read receipt: single (received) -> double (stored) -> blue (processing)
            setCheck(msg.state)
            if (msg.state === 'blue') {
              setStreaming(true)
              streamBuffer.current = ''
              setStreamText('')
            }
            break

          case 'delta':
            // Real-time text chunk from Claude
            streamBuffer.current += msg.text
            setStreamText(streamBuffer.current)
            break

          case 'text':
            // Complete text block (may be partial or final)
            if (msg.done) {
              setStreamText(msg.text || streamBuffer.current)
            }
            break

          case 'tool':
            // Agent is using a tool (visible as subtle indicator)
            // Could show "Reading files..." or "Running command..."
            break

          case 'done':
            // Response complete -- keep check state (blue) so last user message stays read
            setStreaming(false)
            const finalText = msg.text || streamBuffer.current
            setStreamText('')
            streamBuffer.current = ''
            setLastResponse({
              text: finalText,
              time: new Date().toISOString(),
            })
            break

          case 'error':
            setStreaming(false)
            setCheck(null)
            setLastResponse({
              text: `Error: ${msg.message}`,
              time: new Date().toISOString(),
              error: true,
            })
            break

          case 'status':
            if (msg.status === 'disconnected') {
              setStatus('disconnected')
            }
            break
        }
      }

      ws.onclose = () => {
        if (ws._pingInterval) clearInterval(ws._pingInterval)
        setStatus('disconnected')
        wsRef.current = null
        // If we were mid-stream when disconnect happened, recover the UI
        setStreaming(prev => {
          if (prev) {
            // Was streaming -- surface an error response so UI doesn't stay stuck
            setStreamText('')
            streamBuffer.current = ''
            setLastResponse({
              text: 'Connection lost. Message may still be processing.',
              time: new Date().toISOString(),
              error: true,
            })
          }
          return false
        })
        // Auto-reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        // onclose will fire after this
      }

    } catch {
      setStatus('disconnected')
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [agentSlug, enabled])

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    if (!enabled) return

    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, enabled])

  // Reset check state -- call before sending a new message to clear stale receipt
  const resetCheck = useCallback(() => {
    setCheck(null)
  }, [])

  // Send a message
  const send = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[Bridge] Not connected, cannot send')
      return false
    }

    wsRef.current.send(JSON.stringify({ type: 'message', text }))
    setCheck(null)
    setStreaming(false)
    setStreamText('')
    streamBuffer.current = ''
    return true
  }, [])

  return {
    status,      // 'connecting' | 'connected' | 'disconnected'
    check,       // null | 'single' | 'double' | 'blue'
    streaming,   // true when agent is processing/responding
    streamText,  // accumulated streaming text (real-time)
    lastResponse, // { text, time, error? } -- latest complete response
    send,        // (text) => boolean
    resetCheck,  // () => void -- reset check to null before sending a new message
    connected: status === 'connected',
  }
}
