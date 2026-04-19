// Chat Connection Layer (C3)
// Abstracted so swapping from SSE to WebSocket is a config change, not a rewrite.
// C3: WebSocket is primary. SSE is fallback.
// Feature flags:
//   VITE_WS_ENABLED=true  -> WebSocket path (local only)
//   VITE_V2_CHAT=true     -> Supabase direct write + Realtime subscription (24/7, no tmux)

const WS_ENABLED = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_WS_ENABLED === 'true')
  : false

export const V2_CHAT_ENABLED = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_V2_CHAT === 'true')
  : false

const IS_LOCAL = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// WebSocket Connection (C3 primary path)
class WebSocketConnection {
  constructor(onMessage, onDone, onError) {
    this.onMessage = onMessage
    this.onDone = onDone
    this.onError = onError
    this.ws = null
  }

  async send({ slug, message, history }) {
    const wsUrl = `ws://localhost:3001`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({
          type: 'chat_message',
          agent: slug,
          content: message,
          history,
          timestamp: new Date().toISOString(),
        }))
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'token_stream' && data.agent === slug) {
            this.onMessage(data.token)
          } else if (data.type === 'chat_done' && data.agent === slug) {
            this.onDone()
          } else if (data.type === 'chat_error' && data.agent === slug) {
            this.onError(data.error)
          } else if (data.type === 'pong') {
            // heartbeat response, ignore
          }
        } catch {}
      }

      this.ws.onerror = () => {
        this.onError('WebSocket connection failed. Falling back to SSE.')
      }

      this.ws.onclose = () => {
        // Connection closed
      }
    } catch (err) {
      this.onError(err.message)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// Bridge Connection (direct to super agent tmux via local SSE bridge)
// send(): POSTs to chat-bridge, then opens EventSource for SSE streaming
// Falls back to Supabase if bridge is unreachable
export class BridgeConnection {
  constructor(onMessage, onDone, onError, onTyping) {
    this.onMessage = onMessage
    this.onDone = onDone
    this.onError = onError
    this.onTyping = onTyping || (() => {})
    this.eventSource = null
    this.abortController = null
  }

  async send({ slug, message, room, clientId, project, userId, userName }) {
    this.disconnect()

    const resolvedRoom = room || (project ? `project:${project}` : slug)

    try {
      // Bound the initial bridge call so a slow bridge doesn't leave the UI
      // spinning. If it times out, the catch below calls onDone() and the
      // response arrives via the Supabase Realtime subscription in ChatPanel.
      const res = await fetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: slug,
          message,
          room: resolvedRoom,
          project: project || '',
          client_id: clientId || 'aom',
          user_id: userId || '',
          user_name: userName || '',
        }),
        signal: AbortSignal.timeout(15000),
      })

      const data = await res.json()

      if (data.fallback) {
        // Bridge unreachable -- message already written to Supabase.
        // Response will arrive via Supabase Realtime (existing subscription in ChatPanel).
        // Signal done so the UI doesn't hang waiting for bridge stream.
        this.onDone()
        return
      }

      // Bridge is up -- open SSE stream for response
      const messageId = data.messageId
      if (!messageId) {
        this.onDone()
        return
      }

      this.abortController = new AbortController()

      const streamRes = await fetch(`/api/dashboard/chat-bridge?stream=${encodeURIComponent(messageId)}`, {
        signal: this.abortController.signal,
      })

      if (!streamRes.ok || !streamRes.body) {
        this.onDone()
        return
      }

      const reader = streamRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
              this.onMessage(event.text)
            } else if (event.type === 'typing') {
              this.onTyping()
            } else if (event.type === 'done') {
              this.onDone()
              return
            } else if (event.type === 'error') {
              this.onError(event.error || 'bridge stream error')
              return
            } else if (event.type === 'fallback') {
              // Bridge gave up, response will come via Supabase Realtime
              this.onDone()
              return
            }
          } catch {}
        }
      }

      // Stream ended without explicit done event
      this.onDone()
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Bridge failed -- message still persisted to Supabase, response arrives via Realtime
        this.onDone()
      }
    }
  }

  disconnect() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

// Supabase Direct Connection (V2 path -- 24/7, no tmux dependency)
// send(): inserts user message directly to Supabase messages table
// subscribe(): opens Realtime channel filtered by agent + client_id for assistant responses
// The Edge Function (chat-responder) picks up needs_response=true messages and writes replies.
export class SupabaseConnection {
  constructor(onMessage, onDone, onError, supabaseClient) {
    this.onMessage = onMessage
    this.onDone = onDone
    this.onError = onError
    this.sb = supabaseClient
    this.channel = null
  }

  async send({ slug, message, clientId }) {
    if (!this.sb) {
      this.onError('Supabase client not available')
      return
    }
    const { error } = await this.sb.from('messages').insert({
      agent: slug,
      role: 'user',
      text: message,
      source: 'corner-dashboard-v2',
      client_id: clientId || 'aom',
      needs_response: true,
    })
    if (error) {
      this.onError(`Insert failed: ${error.message}`)
    }
    // Response comes via subscribe() or BoardView background poll -- no inline wait
  }

  subscribe({ slug, clientId, afterTimestamp, onResponse }) {
    if (!this.sb) return
    this.channel = this.sb
      .channel(`chat-${slug}-${clientId || 'aom'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `agent=eq.${slug}`,
        },
        (payload) => {
          const row = payload.new
          if (row.role !== 'assistant') return
          if (row.source === 'terminal' || (row.source || '').startsWith('agent-')) return
          if (afterTimestamp && row.timestamp <= afterTimestamp) return
          onResponse(row)
        },
      )
      .subscribe()
  }

  disconnect() {
    if (this.channel && this.sb) {
      this.sb.removeChannel(this.channel)
      this.channel = null
    }
  }
}

// Bridge feature flag: enabled by default, disable with VITE_BRIDGE_ENABLED=false
const BRIDGE_ENABLED = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_BRIDGE_ENABLED !== 'false')
  : true

// Factory: returns the right connection based on config
// Priority: Bridge (direct to tmux) > V2 (Supabase) > WebSocket (local)
// Bridge always writes to Supabase too, so Realtime subscriptions still work as backup receiver
export function createChatConnection(onMessage, onDone, onError, supabaseClient, onTyping) {
  if (BRIDGE_ENABLED) {
    return new BridgeConnection(onMessage, onDone, onError, onTyping)
  }
  if (V2_CHAT_ENABLED && supabaseClient) {
    return new SupabaseConnection(onMessage, onDone, onError, supabaseClient)
  }
  if (WS_ENABLED && IS_LOCAL) {
    return new WebSocketConnection(onMessage, onDone, onError)
  }
  // Bridge is enabled by default; if all flags are off, fall through to Supabase direct
  return new SupabaseConnection(onMessage, onDone, onError, supabaseClient)
}

export const CONNECTION_TYPE = BRIDGE_ENABLED ? 'bridge' : V2_CHAT_ENABLED ? 'supabase-v2' : (WS_ENABLED && IS_LOCAL) ? 'websocket' : 'supabase-v2'
