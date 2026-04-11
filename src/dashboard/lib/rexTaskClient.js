// rexTaskClient.js -- Client-side utility for creating tasks via the Rex AI agent.
//
// Sends a natural language message to the v2-gemini-chat endpoint so Rex can
// interpret the request, invoke the create_task function call, and queue work
// for the build pipeline.
//
// Usage:
//   import { createTaskWithRex } from './rexTaskClient.js'
//   const result = await createTaskWithRex('Build a dark mode toggle', userId, userName)

const GEMINI_CHAT_ENDPOINT = '/api/dashboard/v2-gemini-chat'

/**
 * Send a natural language task request to Rex.
 *
 * @param {string} text     - Natural language description of the task to create.
 * @param {string} userId   - Authenticated user's UUID (passed to API for identity).
 * @param {string} userName - Authenticated user's display name.
 * @returns {Promise<{ reply: string, task: object|null, functionCalls: Array }>}
 *   reply        -- Rex's text response
 *   task         -- the created task object if Rex called create_task, else null
 *   functionCalls -- raw function call array from the API response
 * @throws {Error} if the network request fails or the API returns an error.
 */
export async function createTaskWithRex(text, userId, userName) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('text is required')
  }

  const res = await fetch(GEMINI_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      agent: 'rex',
      client_id: 'aom',
      user_id: userId || null,
      user_name: userName || null,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with status ${res.status}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(data.error)
  }

  // Extract the task object from the create_task function call result if present.
  // The API returns functionCalls as an array of { name, args } objects.
  const functionCalls = Array.isArray(data.functionCalls) ? data.functionCalls : []
  const createTaskCall = functionCalls.find(fc => fc.name === 'create_task')
  const task = createTaskCall ? (createTaskCall.result || createTaskCall.args || null) : null

  return {
    reply: data.reply || '',
    task,
    functionCalls,
  }
}
