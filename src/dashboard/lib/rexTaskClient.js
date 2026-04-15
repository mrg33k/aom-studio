// rexTaskClient.js -- Client-side utility for creating tasks via the Haiku front desk.
//
// Sends a natural language message to /api/dashboard/haiku-chat. Haiku decides
// whether to call write_task and what repo to target. We parse the SSE stream
// for the first write_task tool_result and return its task id.
//
// Usage:
//   import { createTaskWithRex } from './rexTaskClient.js'
//   const result = await createTaskWithRex('Build a dark mode toggle', userId, userName)

const HAIKU_CHAT_ENDPOINT = '/api/dashboard/haiku-chat'

/**
 * Send a natural language task request to the Haiku front desk.
 *
 * @param {string} text     - Natural language description of the task to create.
 * @param {string} userId   - Authenticated user's UUID (forwarded as user_id).
 * @param {string} userName - Authenticated user's display name (forwarded as user_name).
 * @returns {Promise<{ reply: string, task: object|null, toolCalls: Array }>}
 *   reply      -- Haiku's text response (concatenated deltas)
 *   task       -- the created task summary if write_task ran, else null
 *   toolCalls  -- all tool_call events observed on the stream
 * @throws {Error} if the network request fails or the stream reports an error.
 */
export async function createTaskWithRex(text, userId, userName) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('text is required')
  }

  const res = await fetch(HAIKU_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      client_id: 'aom',
      user_id: userId || null,
      user_name: userName || null,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `Request failed with status ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reply = ''
  let task = null
  const toolCalls = []
  let streamError = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      let evt
      try {
        evt = JSON.parse(line.slice(6))
      } catch {
        continue
      }
      if (evt.type === 'text' && typeof evt.text === 'string') {
        reply += evt.text
      } else if (evt.type === 'tool_call') {
        toolCalls.push({ name: evt.name, args: evt.args })
      } else if (evt.type === 'tool_result' && evt.name === 'write_task' && evt.result?.success && !task) {
        task = {
          id: evt.result.task_id,
          status: evt.result.status,
          repo: evt.result.repo,
          title: evt.result.title,
        }
      } else if (evt.type === 'error') {
        streamError = evt.error || 'stream error'
      }
    }
  }

  if (streamError) throw new Error(streamError)

  return { reply, task, toolCalls }
}
