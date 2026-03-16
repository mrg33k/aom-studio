// Chat Connection Layer
// Abstracted so swapping from SSE to WebSocket is a config change, not a rewrite.
// Currently uses SSE via /api/dashboard/chat. WebSocket target in v2.

const CONNECTION_TYPE = 'sse' // 'sse' | 'websocket'

// SSE Connection (current)
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

// WebSocket Connection (future target)
class WebSocketConnection {
  constructor(onMessage, onDone, onError) {
    this.onMessage = onMessage
    this.onDone = onDone
    this.onError = onError
    this.ws = null
  }

  async send({ slug, message, history }) {
    // Future: connect to local relay WebSocket
    // ws://localhost:PORT/chat?agent=slug
    const wsUrl = `ws://localhost:8765/chat?agent=${slug}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ message, history }))
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'text') this.onMessage(data.text)
          else if (data.type === 'done') this.onDone()
          else if (data.type === 'error') this.onError(data.error)
        } catch {}
      }

      this.ws.onerror = () => {
        this.onError('WebSocket connection failed')
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
export function createChatConnection(onMessage, onDone, onError) {
  if (CONNECTION_TYPE === 'websocket') {
    return new WebSocketConnection(onMessage, onDone, onError)
  }
  return new SSEConnection(onMessage, onDone, onError)
}

export { CONNECTION_TYPE }
