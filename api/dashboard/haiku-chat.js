// POST /api/dashboard/haiku-chat
//
// Front desk for Patrik's AOM studio. Claude Haiku 4.5 via direct Anthropic API.
// Streaming SSE. Narrow tool surface: write_task, query_tasks, query_results, append_tape.
//
// Does NOT plan, read code, or push back. Routes. Workers (fresh tmux Claude Code
// sessions spawned by scripts/task-runner.sh) do the actual work.
//
// Replaces api/dashboard/v2-gemini-chat.js (deleted in the Apr 14 rewire).

import crypto from 'crypto'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_LOOPS = 5
const MAX_TOKENS = 2048

const SYSTEM_PROMPT = `You are the front desk for Patrik's AOM studio. You do NOT plan, write code, read files, or make decisions. You route.

Your job:
1. Read Patrik's message.
2. Pick the correct repo (aom-studio, AMBITION, sourcing-directory, AOM-EA). If unsure, ask ONE clarifying question and stop.
3. Write a clean task description and call write_task.
4. If Patrik asks about tasks in flight, call query_tasks. If he asks about a specific result, call query_results.
5. If he asks to append a note to a tape, call append_tape.

RULES:
- You have no code tools. You cannot read, grep, or edit. If Patrik asks "how should we fix X", say "queued, the worker will decide" and call write_task.
- Never push back. Never ask "are you sure". Never suggest alternatives.
- Keep replies under 2 sentences. Bullets for lists. No em dashes. No emoji.
- When you queue a task, confirm in one line naming the repo. Example: "Queued for aom-studio: enrich arsenal contacts."
- If Patrik's message isn't a task (a thought, a check-in, a status question), don't force write_task. Just respond briefly or query.
- Default repo when unclear: aom-studio.
- Today is ${new Date().toISOString().slice(0, 10)}.`

const TOOLS = [
  {
    name: 'write_task',
    description: 'Queue a task for a fresh tmux worker. Pick the repo carefully. The task runner will spawn a Claude Code session in that repo and execute the description.',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Target repo name. Examples: aom-studio, AMBITION, sourcing-directory, AOM-EA. If unclear default to aom-studio.',
        },
        description: {
          type: 'string',
          description: "What the worker should do, word-for-word from Patrik's intent. Include specific paths, scripts, success criteria when he gave them.",
        },
        title: {
          type: 'string',
          description: 'Short (<60 char) label for the dashboard card.',
        },
        priority: {
          type: 'string',
          enum: ['normal', 'urgent'],
          description: "Optional. 'urgent' bumps it to the front of the queue.",
        },
      },
      required: ['repo', 'description', 'title'],
    },
  },
  {
    name: 'query_tasks',
    description: 'List tasks in the queue. Filter by status (queued, running, done, failed, needs_input) or repo.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        repo: { type: 'string' },
        limit: { type: 'integer', description: 'Default 10, max 50.' },
      },
    },
  },
  {
    name: 'query_results',
    description: 'Get the completion payload (link/image/video/text/check_external) and summary for a specific task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'append_tape',
    description: "Append a short note to Patrik's dashboard tape. For decisions, context, things to remember.",
    input_schema: {
      type: 'object',
      properties: {
        line: { type: 'string' },
      },
      required: ['line'],
    },
  },
]

// ─── SSE helpers ─────────────────────────────────────────────────────

function sse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

// ─── Supabase helpers ────────────────────────────────────────────────

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function sbRequest(path, init = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const resp = await fetch(url, { ...init, headers: sbHeaders(init.headers || {}) })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Supabase ${resp.status}: ${text}`)
  }
  if (resp.status === 204) return null
  return resp.json()
}

// ─── Tool executor ───────────────────────────────────────────────────

async function executeTool(name, args, ctx) {
  switch (name) {
    case 'write_task': {
      const repo = String(args.repo || 'aom-studio').trim()
      const description = String(args.description || '').trim()
      const title = String(args.title || description.slice(0, 60)).trim()
      if (!description) throw new Error('description required')

      const row = {
        id: crypto.randomUUID(),
        text: description,
        title,
        status: 'queued',
        client_id: ctx.clientId || 'aom',
        source: 'haiku-chat',
        created_by: 'haiku',
        priority: args.priority === 'urgent' ? 10 : 0,
        metadata: {
          repo,
          priority: args.priority || 'normal',
        },
      }
      const rows = await sbRequest('/tasks', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(row),
      })
      const task = Array.isArray(rows) ? rows[0] : rows
      return {
        success: true,
        task_id: task?.id,
        status: 'queued',
        repo,
        title,
      }
    }

    case 'query_tasks': {
      const limit = Math.min(Math.max(parseInt(args.limit) || 10, 1), 50)
      const clauses = [`client_id=eq.${encodeURIComponent(ctx.clientId || 'aom')}`]
      if (args.status) clauses.push(`status=eq.${encodeURIComponent(args.status)}`)
      // repo lives in metadata, filter client-side after fetch
      clauses.push(`select=id,title,text,status,created_at,completed_at,metadata,result,error`)
      clauses.push(`order=created_at.desc`)
      clauses.push(`limit=${limit * 2}`)
      const rows = await sbRequest(`/tasks?${clauses.join('&')}`)
      let filtered = rows || []
      if (args.repo) {
        filtered = filtered.filter(r => r.metadata?.repo === args.repo)
      }
      filtered = filtered.slice(0, limit)
      return {
        tasks: filtered.map(r => ({
          id: r.id,
          title: r.title || (r.text || '').slice(0, 60),
          status: r.status,
          repo: r.metadata?.repo || null,
          created_at: r.created_at,
          completed_at: r.completed_at,
          summary: r.metadata?.result_payload?.summary || null,
          error: r.error || null,
        })),
      }
    }

    case 'query_results': {
      const id = String(args.task_id || '').trim()
      if (!id) throw new Error('task_id required')
      const rows = await sbRequest(
        `/tasks?id=eq.${encodeURIComponent(id)}&select=id,title,status,metadata,result,error,completed_at`
      )
      const row = Array.isArray(rows) ? rows[0] : null
      if (!row) return { error: 'task not found' }
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        completed_at: row.completed_at,
        payload: row.metadata?.result_payload || null,
        error: row.error || null,
      }
    }

    case 'append_tape': {
      const line = String(args.line || '').trim()
      if (!line) throw new Error('line required')
      const row = {
        id: crypto.randomUUID(),
        agent: 'haiku-tape',
        role: 'system',
        text: line,
        source: 'haiku-chat-tape',
        client_id: ctx.clientId || 'aom',
      }
      await sbRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(row),
      }).catch(() => {})
      return { success: true }
    }
  }
  throw new Error(`Unknown tool: ${name}`)
}

// ─── Anthropic streaming parser ──────────────────────────────────────
//
// Reads the SSE stream from /v1/messages and accumulates content blocks.
// Text deltas are forwarded to the client as {type: 'text'} events.
// Tool_use blocks are collected and returned for executor dispatch.

async function runAnthropicStream({ messages, res }) {
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Prompt caching: system prompt + tools are static per call shape,
      // so cache them. The last message block is the cache breakpoint.
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      messages,
      stream: true,
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    throw new Error(`Anthropic ${anthropicRes.status}: ${errText}`)
  }

  const reader = anthropicRes.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const contentBlocks = []
  let stopReason = null
  const activeBlocks = new Map() // index -> { type, text, id, name, input_json }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Events are separated by blank lines
    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const lines = raw.split('\n')
      let dataLine = ''
      for (const l of lines) {
        if (l.startsWith('data: ')) dataLine += l.slice(6)
      }
      if (!dataLine) continue
      let evt
      try {
        evt = JSON.parse(dataLine)
      } catch {
        continue
      }

      if (evt.type === 'content_block_start') {
        const idx = evt.index
        const block = evt.content_block || {}
        if (block.type === 'text') {
          activeBlocks.set(idx, { type: 'text', text: '' })
        } else if (block.type === 'tool_use') {
          activeBlocks.set(idx, {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input_json: '',
          })
        }
      } else if (evt.type === 'content_block_delta') {
        const idx = evt.index
        const active = activeBlocks.get(idx)
        if (!active) continue
        const d = evt.delta || {}
        if (d.type === 'text_delta' && typeof d.text === 'string') {
          active.text = (active.text || '') + d.text
          sse(res, { type: 'text', text: d.text })
        } else if (d.type === 'input_json_delta' && typeof d.partial_json === 'string') {
          active.input_json = (active.input_json || '') + d.partial_json
        }
      } else if (evt.type === 'content_block_stop') {
        const idx = evt.index
        const active = activeBlocks.get(idx)
        if (!active) continue
        if (active.type === 'text') {
          contentBlocks.push({ type: 'text', text: active.text })
        } else if (active.type === 'tool_use') {
          let input = {}
          try {
            input = active.input_json ? JSON.parse(active.input_json) : {}
          } catch {
            input = {}
          }
          contentBlocks.push({
            type: 'tool_use',
            id: active.id,
            name: active.name,
            input,
          })
        }
        activeBlocks.delete(idx)
      } else if (evt.type === 'message_delta') {
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason
      } else if (evt.type === 'message_stop') {
        // terminal
      }
    }
  }

  return { contentBlocks, stopReason }
}

// ─── Handler ─────────────────────────────────────────────────────────

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const {
    message,
    history = [],
    client_id,
    slug, // legacy chatConnection passes slug; ignored here
  } = req.body || {}

  if (!message) return res.status(400).json({ error: 'message required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  if (!ANTHROPIC_API_KEY) {
    sse(res, { type: 'error', error: 'ANTHROPIC_API_KEY missing' })
    sse(res, { type: 'done' })
    return res.end()
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    sse(res, { type: 'error', error: 'Supabase not configured' })
    sse(res, { type: 'done' })
    return res.end()
  }

  // Normalize history into Anthropic messages shape.
  // Accept both {role, content} and {role, text}.
  const messages = []
  for (const h of Array.isArray(history) ? history : []) {
    const role = h.role === 'assistant' ? 'assistant' : 'user'
    const content = typeof h.content === 'string' ? h.content : (h.text || '')
    if (content) messages.push({ role, content })
  }
  messages.push({ role: 'user', content: String(message) })

  const ctx = { clientId: client_id || 'aom' }

  try {
    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const { contentBlocks, stopReason } = await runAnthropicStream({ messages, res })

      const toolUseBlocks = contentBlocks.filter(b => b.type === 'tool_use')
      if (toolUseBlocks.length === 0 || stopReason === 'end_turn') break

      messages.push({
        role: 'assistant',
        content: contentBlocks.map(b =>
          b.type === 'tool_use'
            ? { type: 'tool_use', id: b.id, name: b.name, input: b.input }
            : { type: 'text', text: b.text }
        ),
      })

      const toolResults = []
      for (const block of toolUseBlocks) {
        sse(res, { type: 'tool_call', name: block.name, args: block.input })
        try {
          const result = await executeTool(block.name, block.input, ctx)
          sse(res, { type: 'tool_result', name: block.name, result })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        } catch (err) {
          sse(res, { type: 'tool_result', name: block.name, result: { error: err.message } })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: err.message }),
            is_error: true,
          })
        }
      }
      messages.push({ role: 'user', content: toolResults })
    }

    sse(res, { type: 'done' })
    res.end()
  } catch (err) {
    console.error('haiku-chat error:', err)
    try {
      sse(res, { type: 'error', error: err.message })
      sse(res, { type: 'done' })
      res.end()
    } catch {
      // response already closed
    }
  }
}
