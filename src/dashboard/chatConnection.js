// Chat Connection Layer (C3)
// Abstracted so swapping from SSE to WebSocket is a config change, not a rewrite.
// C3: WebSocket is primary. SSE is fallback.
// Feature flag: VITE_WS_ENABLED=true enables WebSocket path.

const WS_ENABLED = typeof import.meta !== 'undefined'
  ? (import.meta.env?.VITE_WS_ENABLED === 'true')
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

    try {
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, message, history }),
        signal: this.abortController.signal,
      })

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
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

// Factory: returns the right connection based on config
// C3: WebSocket when enabled + local, SSE otherwise
export function createChatConnection(onMessage, onDone, onError) {
  if (WS_ENABLED && IS_LOCAL) {
    return new WebSocketConnection(onMessage, onDone, onError)
  }
  return new SSEConnection(onMessage, onDone, onError)
}

export const CONNECTION_TYPE = (WS_ENABLED && IS_LOCAL) ? 'websocket' : 'sse'
