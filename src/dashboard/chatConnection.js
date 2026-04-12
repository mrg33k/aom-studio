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

// SSE Connection (fallback, current production path)
class SSEConnection {
  constructor(onMessage, onDone, onError) {
    this.onMessage = onMessage
    this.onDone = onDone
    this.onError = onError
    this.abortController = null
  }

  async send({ slug, message, history }) {
    this.abortController = new AbortController()

    // Detect Safari: fetch ReadableStream doesn't support incremental reads
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    try {
      const res = await fetch('/api/dashboard/v2-gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isSafari ? { 'X-No-Stream': '1' } : {}),
        },
        body: JSON.stringify({ slug, message, history }),
        signal: this.abortController.signal,
      })

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && !isSafari) {
        // Chrome/Firefox: stream chunks incrementally
        const reader = res.body.getReader()
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
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                this.onMessage(data.text)
              } else if (data.type === 'done') {
                this.onDone()
              } else if (data.type === 'error') {
                this.onError(data.error)
              }
            } catch {}
          }
        }
      } else if (contentType.includes('text/event-stream') && isSafari) {
        // Safari: read the full buffered response then parse all events at once
        const text = await res.text()
        const lines = text.split('\n')
        let fullText = ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'text') {
              fullText += data.text
            } else if (data.type === 'error') {
              this.onError(data.error)
              return
            }
          } catch {}
        }

        if (fullText) {
          this.onMessage(fullText)
          this.onDone()
        }
      } else {
        const data = await res.json()
        if (data.reply) {
          this.onMessage(data.reply)
          this.onDone()
        } else if (data.error) {
          this.onError(data.error)
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        this.onError(err.message)
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

// Factory: returns the right connection based on config
// Priority: V2 (Supabase) > WebSocket (local) > SSE (default)
export function createChatConnection(onMessage, onDone, onError, supabaseClient) {
  if (V2_CHAT_ENABLED && supabaseClient) {
    return new SupabaseConnection(onMessage, onDone, onError, supabaseClient)
  }
  if (WS_ENABLED && IS_LOCAL) {
    return new WebSocketConnection(onMessage, onDone, onError)
  }
  return new SSEConnection(onMessage, onDone, onError)
}

export const CONNECTION_TYPE = V2_CHAT_ENABLED ? 'supabase-v2' : (WS_ENABLED && IS_LOCAL) ? 'websocket' : 'sse'
