// Corner C3: WebSocket Real-Time Hook
// Provides real-time events from the WebSocket server.
// Feature-flagged: NEXT_PUBLIC_WS_ENABLED. Falls back to SSE when unavailable.
//
// Event types:
//   agent_state_change, token_stream, task_complete,
//   task_created, handoff, error_recovery, system_status

import { useState, useEffect, useRef, useCallback } from 'react'

const WS_ENABLED = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_WS_ENABLED === 'true')
  : false

const IS_LOCAL = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const WS_PORT = 3001
const HEARTBEAT_INTERVAL = 30000 // 30s
const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000] // exponential backoff
const MAX_MISSED_PONGS = 3

// Connection states
const STATE = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
}

export function useWebSocket(options = {}) {
  const { onEvent, enabled = true } = options
  const [connectionState, setConnectionState] = useState(STATE.DISCONNECTED)
  const [lastEvent, setLastEvent] = useState(null)
  const wsRef = useRef(null)
  const heartbeatRef = useRef(null)
  const missedPongsRef = useRef(0)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const eventQueueRef = useRef([]) // queue messages during disconnect
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const wsUrl = IS_LOCAL
    ? `ws://localhost:${WS_PORT}`
    : null // Production WebSocket URL would go here

  const dispatch = useCallback((event) => {
    setLastEvent(event)
    onEventRef.current?.(event)
  }, [])

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    missedPongsRef.current = 0
    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
        missedPongsRef.current++
        if (missedPongsRef.current >= MAX_MISSED_PONGS) {
          // Too many missed pongs, force reconnect
          wsRef.current.close()
        }
      }
    }, HEARTBEAT_INTERVAL)
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!wsUrl || !enabled || !WS_ENABLED) return

    setConnectionState(STATE.CONNECTING)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionState(STATE.CONNECTED)
        reconnectAttemptRef.current = 0
        startHeartbeat()

        // Replay queued events
        if (eventQueueRef.current.length > 0) {
          eventQueueRef.current.forEach(msg => {
            ws.send(JSON.stringify(msg))
          })
          eventQueueRef.current = []
        }

        dispatch({
          type: 'system_status',
          status: 'connected',
          timestamp: new Date().toISOString(),
        })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle pong
          if (data.type === 'pong') {
            missedPongsRef.current = 0
            return
          }

          dispatch(data)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => {
        // Error handling done in onclose
      }

      ws.onclose = () => {
        stopHeartbeat()
        wsRef.current = null

        // Attempt reconnect
        const attempt = reconnectAttemptRef.current
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)]

        setConnectionState(STATE.RECONNECTING)
        dispatch({
          type: 'system_status',
          status: 'reconnecting',
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
        })

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current++
          connect()
        }, delay)
      }
    } catch {
      setConnectionState(STATE.DISCONNECTED)
    }
  }, [wsUrl, enabled, startHeartbeat, stopHeartbeat, dispatch])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    stopHeartbeat()
    if (wsRef.current) {
      wsRef.current.onclose = null // prevent reconnect on intentional close
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionState(STATE.DISCONNECTED)
  }, [stopHeartbeat])

  // Send a message through WebSocket
  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      // Queue for when connection restores
      eventQueueRef.current.push(message)
    }
  }, [])

  // Send a chat message to a specific agent
  const sendChat = useCallback((agentSlug, content, history = []) => {
    send({
      type: 'chat_message',
      agent: agentSlug,
      content,
      history,
      timestamp: new Date().toISOString(),
    })
  }, [send])

  // Connect on mount (if enabled)
  useEffect(() => {
    if (enabled && WS_ENABLED && IS_LOCAL) {
      connect()
    }
    return () => disconnect()
  }, [enabled, connect, disconnect])

  return {
    connectionState,
    isConnected: connectionState === STATE.CONNECTED,
    isReconnecting: connectionState === STATE.RECONNECTING,
    lastEvent,
    send,
    sendChat,
    disconnect,
    reconnect: connect,
    wsEnabled: WS_ENABLED,
  }
}

// Typed event filter hooks for specific event types
export function useAgentStateEvents(wsHook, agentSlug) {
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!wsHook.lastEvent) return
    const e = wsHook.lastEvent
    if (e.type === 'agent_state_change' && (!agentSlug || e.agent === agentSlug)) {
      setState(e)
    }
  }, [wsHook.lastEvent, agentSlug])
  return state
}

export function useTokenStream(wsHook, agentSlug) {
  const [token, setToken] = useState(null)
  useEffect(() => {
    if (!wsHook.lastEvent) return
    const e = wsHook.lastEvent
    if (e.type === 'token_stream' && (!agentSlug || e.agent === agentSlug)) {
      setToken(e)
    }
  }, [wsHook.lastEvent, agentSlug])
  return token
}

export { STATE as WS_STATE }
