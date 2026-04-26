// POST /api/dashboard/chat
// Agent-specific chat with streaming (SSE) for the chat-first dashboard
// Each agent gets their AGENT.md + last-conversation.md as system prompt context

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

// Write a message to Supabase so the Mac listener can wake up and stay in sync
async function writeToSupabase(role, agent, text, source = 'dashboard', replyTo = '', clientId = 'aom') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  const id = crypto.randomUUID()
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id,
        timestamp: new Date().toISOString(),
        role,
        agent,
        source,
        text,
        project: '',
        reply_to: replyTo,
        client_id: clientId,
      }),
    })
  } catch {}
  return id
}

// ─── Agent registry (K6: was AGENT_META hardcoded dict) ──────────────────────
// Fetched from agent_status at request time; TTL-cached at module level.
let _agentMetaCache = null
let _agentMetaCacheAt = 0

// ─── Dispatch eligibility (K7: was DISPATCH_AGENTS hardcoded set) ─────────────
// Derived from agent_status.dispatch_eligible column (migration 030).
// Falls back to the previous hardcoded list until the column migration runs.
let _dispatchCache = null
let _dispatchCacheAt = 0

const REGISTRY_TTL_MS = 60_000

async function fetchAgentRegistry() {
  const now = Date.now()
  if (_agentMetaCache && (now - _agentMetaCacheAt) < REGISTRY_TTL_MS) return _agentMetaCache
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return _agentMetaCache || {}
  try {
    const url = `${SUPABASE_URL}/rest/v1/agent_status?select=slug,name,role,project_folder&client_id=eq.aom&hidden=eq.false`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })
    if (!res.ok) return _agentMetaCache || {}
    const rows = await res.json()
    const cache = {}
    for (const row of rows) {
      cache[row.slug] = { name: row.name || row.slug, role: row.role || '', folder: row.project_folder || null }
    }
    _agentMetaCache = cache
    _agentMetaCacheAt = now
    return cache
  } catch {
    return _agentMetaCache || {}
  }
}

async function fetchDispatchAgents() {
  const now = Date.now()
  if (_dispatchCache && (now - _dispatchCacheAt) < REGISTRY_TTL_MS) return _dispatchCache
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return _dispatchCache || new Set(['elon', 'gary', 'mom'])
  try {
    const url = `${SUPABASE_URL}/rest/v1/agent_status?select=slug&client_id=eq.aom&dispatch_eligible=eq.true&hidden=eq.false`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })
    // Pre-migration: column doesn't exist yet → Supabase returns 4xx; fall back to hardcoded list
    if (!res.ok) return _dispatchCache || new Set(['elon', 'gary', 'mom'])
    const rows = await res.json()
    const set = new Set(rows.map(r => r.slug))
    _dispatchCache = set
    _dispatchCacheAt = now
    return set
  } catch {
    return _dispatchCache || new Set(['elon', 'gary', 'mom'])
  }
}

// ─── Tools for dispatcher agents ─────────────────────────────────────
const TOOLS = [
  {
    name: 'write_task',
    description: 'Queue a task for a fresh tmux worker to execute. Use this when Patrik asks for code work, a page change, a deploy, a fix, an investigation that requires running commands or editing files. Pick the project slug carefully (corner/aom-studio/ambition/sourcing) — the worker cds into that repo and runs with full bash + edit tools. Do NOT call this for questions, opinions, or chit-chat.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: "Project slug. Must match the Supabase projects table (e.g. 'corner', 'aom-studio', 'ambition', 'sourcing', 'aom-website'). If unsure, ask Patrik with ONE clarifying question instead of guessing.",
        },
        title: {
          type: 'string',
          description: 'Short task title (≤140 chars). This is what shows up on the task card.',
        },
        description: {
          type: 'string',
          description: 'Full task brief for the worker. Include page paths, scripts to run, success criteria, anything the worker needs. Be specific. The worker will read this and execute.',
        },
        model: {
          type: 'string',
          enum: ['sonnet', 'opus', 'haiku'],
          description: "Worker model. Default 'sonnet'. Use 'opus' only for complex reasoning tasks.",
        },
      },
      required: ['project', 'title', 'description'],
    },
  },
  {
    name: 'check_task',
    description: "Get the current status of a task you queued. Returns status (queued/building/done/failed/waiting/needs_input), the result payload if done, or the blocking question if needs_input. Use this when Patrik asks 'is it done?' or 'what's the status of X?' or when you need to confirm a task you dispatched earlier in this conversation.",
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'The UUID of the task to look up.' },
      },
      required: ['task_id'],
    },
  },
]

// ─── Supabase REST helper ─────────────────────────────────────────────
async function sbRest(method, path, body) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)')
  }
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const opts = {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  }
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body)
  const res = await fetch(url, opts)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`)
  }
  try { return JSON.parse(text) } catch { return null }
}

function cleanTaskTitle(raw) {
  const s = (raw || '').trim().replace(/\s+/g, ' ')
  if (!s) return 'Untitled task'
  return s.length > 140 ? s.slice(0, 137) + '…' : s
}

// ─── Tool executor ────────────────────────────────────────────────────
async function executeTool(name, args, ctx) {
  switch (name) {
    case 'write_task': {
      const projectSlug = String(args.project || '').trim().toLowerCase() || null
      const title = cleanTaskTitle(args.title || args.description || '')
      const description = String(args.description || args.title || '').trim()
      const model = ['sonnet', 'opus', 'haiku'].includes(args.model) ? args.model : 'sonnet'

      if (!description) {
        throw new Error('description is required')
      }

      // Resolve project -> repo_path from projects table. Missing project is
      // allowed; task-runner will mark failed if metadata.repo can't resolve.
      let repoPath = ''
      if (projectSlug) {
        try {
          const rows = await sbRest('GET', `projects?slug=eq.${encodeURIComponent(projectSlug)}&select=slug,repo_path&limit=1`)
          if (Array.isArray(rows) && rows[0]?.repo_path) repoPath = rows[0].repo_path
        } catch { /* non-fatal */ }
      }

      const nowIso = new Date().toISOString()
      const row = {
        title,
        text: description,
        description,
        status: 'queued',
        source: `dashboard-chat-${ctx.slug}`,
        client_id: ctx.clientId,
        project: projectSlug,
        project_path: repoPath,
        priority: 0,
        created_at: nowIso,
        metadata: {
          repo: projectSlug,
          created_via: `dashboard-chat-${ctx.slug}`,
          model,
          requested_by_agent: ctx.slug,
        },
      }

      const inserted = await sbRest('POST', 'tasks', row)
      const task = Array.isArray(inserted) ? inserted[0] : inserted
      if (!task?.id) throw new Error('Task insert returned no row')

      // Seed the task thread with a "queued" event so it shows up when the
      // user expands the task card in TasksPanel. Fire-and-forget.
      writeToSupabase('assistant', `task:${task.id}`, `queued by ${ctx.slug} from dashboard chat: ${title}`, 'chat-dispatch', '', ctx.clientId).catch(() => {})

      return {
        success: true,
        task_id: task.id,
        title: task.title,
        status: task.status,
        project: projectSlug,
        repo_path: repoPath || null,
      }
    }
    case 'check_task': {
      const id = String(args.task_id || '').trim()
      if (!id) throw new Error('task_id is required')
      const rows = await sbRest('GET', `tasks?id=eq.${encodeURIComponent(id)}&select=id,title,status,error,metadata,started_at,completed_at,result&limit=1`)
      const task = Array.isArray(rows) ? rows[0] : null
      if (!task) return { found: false, task_id: id }

      const meta = task.metadata || {}
      const payload = meta.result_payload || null
      const question = meta.question || null
      return {
        found: true,
        task_id: task.id,
        title: task.title,
        status: task.status,
        started_at: task.started_at,
        completed_at: task.completed_at,
        error: task.error || null,
        result: payload,
        question,
      }
    }
  }
  throw new Error(`Unknown tool: ${name}`)
}

// Look up tasks this dispatcher queued that are in a terminal or blocked state
// so the agent can proactively mention them to Patrik. Scoped by source +
// client_id so we don't surface unrelated activity. Ordered by created_at so
// the most recently dispatched rows surface first — these are the ones from
// this chat session Patrik is most likely to care about.
async function fetchRecentTaskUpdates(slug, clientId) {
  try {
    const source = `dashboard-chat-${slug}`
    const qs = [
      `source=eq.${encodeURIComponent(source)}`,
      `client_id=eq.${encodeURIComponent(clientId)}`,
      `status=in.(done,failed,needs_input)`,
      `select=id,title,status,metadata,error,completed_at,created_at`,
      `order=created_at.desc`,
      `limit=6`,
    ].join('&')
    const rows = await sbRest('GET', `tasks?${qs}`)
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function formatTaskUpdatesForPrompt(rows) {
  if (!rows || rows.length === 0) return ''
  const lines = ['# RECENT TASK STATUS UPDATES', "Tasks you dispatched that changed state recently. Mention these to Patrik proactively if relevant — he can't see what happened while he was away from the chat.", '']
  for (const r of rows) {
    const meta = r.metadata || {}
    const short = (r.id || '').slice(0, 8)
    if (r.status === 'done') {
      const summary = (meta.result_payload?.summary || '').toString().slice(0, 200)
      lines.push(`- DONE ${short} "${r.title}"${summary ? ' — ' + summary : ''}`)
    } else if (r.status === 'failed') {
      lines.push(`- FAILED ${short} "${r.title}" — ${(r.error || 'no reason').toString().slice(0, 200)}`)
    } else if (r.status === 'needs_input') {
      const q = (meta.question || '').toString().slice(0, 300)
      lines.push(`- NEEDS INPUT ${short} "${r.title}" — worker asks: ${q}`)
    }
  }
  return lines.join('\n')
}

async function fetchFile(path) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch { return null }
}

async function loadAgentContext(slug, meta) {
  if (!meta || !meta.folder) return { meta, agentMd: null, lastConvo: null, priorities: null }

  const [agentMd, lastConvo, priorities] = await Promise.all([
    fetchFile(`projects/${meta.folder}/AGENT.md`),
    fetchFile(`projects/${meta.folder}/last-conversation.md`),
    fetchFile('context/current-priorities.md'),
  ])

  return { meta, agentMd, lastConvo, priorities }
}

function buildSystemPrompt(meta, agentMd, lastConvo, priorities, { hasTools = false, taskUpdatesBlock = '' } = {}) {
  const parts = [
    `You are ${meta.name}, an AI agent at AOM (Ahead of Market), a creative production and AI systems company in Phoenix, AZ.`,
    `Your role: ${meta.role}.`,
    `You are having a 1:1 conversation with Patrik Matheson, AOM's co-owner. Be direct, specific, and action-oriented.`,
    `Match his energy. No em dashes. No emojis unless he uses them first. Bullet points over paragraphs when listing things.`,
    `Keep responses focused and useful. When you can take action or give a specific recommendation, do it.`,
    '',
  ]

  if (hasTools) {
    parts.push(
      '# TASK DISPATCH',
      'You have two tools: `write_task` and `check_task`. When Patrik asks for code work, a deploy, a fix, an investigation, or anything requiring shell/edit execution, call `write_task` with the right project slug and a specific description. The worker runs in a fresh tmux session with full permissions. Do NOT write code yourself; you do not have edit tools.',
      '',
      'SPLITTING RULE: if Patrik asks for multiple distinct pieces of work in one message, call `write_task` ONCE PER PIECE. Never bundle unrelated work into a single task. Each call can target a different project. Workers for different repos run in parallel; workers for the same repo serialize automatically.',
      '',
      'After calling `write_task`, tell Patrik in one line what you queued and the short task id. If you queued multiple tasks, list them as bullet points. Do not restate descriptions back to him.',
      'If Patrik asks about a task you queued, call `check_task` and report status plainly. If the task needs input, surface the question verbatim.',
      'Never call `write_task` for questions, opinions, or discussion. Only dispatch when there is actual work to execute.',
      '',
    )
  }

  if (taskUpdatesBlock) {
    parts.push(taskUpdatesBlock, '')
  }

  if (agentMd) {
    // Truncate to avoid token explosion but keep the useful parts
    const truncated = agentMd.length > 6000 ? agentMd.slice(0, 6000) + '\n\n... [agent context truncated]' : agentMd
    parts.push(`# YOUR AGENT FILE\n${truncated}`)
  }

  if (lastConvo) {
    const truncated = lastConvo.length > 3000 ? lastConvo.slice(0, 3000) + '\n\n... [truncated]' : lastConvo
    parts.push(`# LAST CONVERSATION / RECENT CONTEXT\n${truncated}`)
  }

  if (priorities) {
    const truncated = priorities.length > 2000 ? priorities.slice(0, 2000) + '\n\n... [truncated]' : priorities
    parts.push(`# CURRENT PRIORITIES\n${truncated}`)
  }

  return parts.join('\n\n')
}

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')

  const { slug, message, history, client_id } = req.body
  const resolvedClientId = (client_id && client_id.trim()) ? client_id.trim().toLowerCase() : 'aom'

  if (!slug || !message) {
    return res.status(400).json({ error: 'slug and message required' })
  }

  // Fetch agent registry + dispatch-eligibility list in parallel (TTL-cached)
  const [agentRegistry, dispatchAgents] = await Promise.all([
    fetchAgentRegistry(),
    fetchDispatchAgents(),
  ])

  const meta = agentRegistry[slug]
  if (!meta) {
    return res.status(404).json({ error: `Unknown agent: ${slug}` })
  }

  // If no API key, return a placeholder response
  if (!ANTHROPIC_API_KEY) {
    return res.status(200).json({
      reply: `[${meta.name}] API key not configured yet. This is a placeholder response. Once ANTHROPIC_API_KEY is set in Vercel env vars, I'll be fully functional. For now, the chat UI is ready to go.`,
      agent: meta.name,
      placeholder: true,
    })
  }

  try {
    // Write user message to Supabase (wakes Mac listener + syncs conversation)
    // Fire-and-forget: don't block the chat response
    const userMsgId = crypto.randomUUID()
    writeToSupabase('user', slug, message, 'dashboard', '', resolvedClientId).catch(() => {})

    const hasTools = dispatchAgents.has(slug)

    // Load agent context from GitHub + recent task status updates (dispatchers only)
    const [{ agentMd, lastConvo, priorities }, taskUpdateRows] = await Promise.all([
      loadAgentContext(slug, meta),
      hasTools ? fetchRecentTaskUpdates(slug, resolvedClientId) : Promise.resolve([]),
    ])
    const taskUpdatesBlock = formatTaskUpdatesForPrompt(taskUpdateRows)
    const systemPrompt = buildSystemPrompt(meta, agentMd, lastConvo, priorities, { hasTools, taskUpdatesBlock })

    // Build messages array from history (text-only history; tool results from
    // prior turns are not replayed — tasks outlive the chat and are re-surfaced
    // via the RECENT TASK STATUS UPDATES block on the next call).
    const messages = []
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-20)) {
        const content = h.content || h.text || ''
        if (!content) continue
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content,
        })
      }
    }
    messages.push({ role: 'user', content: message })

    // Stream response via SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Multi-round tool-use loop. For plain agents (no tools), this runs exactly
    // one round and returns streamed text. For dispatcher agents, it can loop
    // up to MAX_LOOPS times to call tools and continue.
    const MAX_LOOPS = hasTools ? 3 : 1
    let fullResponse = ''

    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const requestBody = {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }
      if (hasTools) requestBody.tools = TOOLS

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text()
        res.write(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`)
        break
      }

      // Parse Anthropic's streaming SSE. We need to track content blocks by
      // index because tool_use inputs arrive as partial JSON deltas that must
      // be concatenated before JSON.parse.
      const reader = anthropicRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const blocks = []          // [{type, text?, id?, name?, input?, _json?}]
      let stopReason = null

      const handleEvent = (parsed) => {
        if (!parsed || !parsed.type) return
        if (parsed.type === 'content_block_start') {
          const idx = parsed.index
          const b = parsed.content_block || {}
          blocks[idx] = {
            type: b.type,
            text: b.type === 'text' ? '' : undefined,
            id: b.id,
            name: b.name,
            _json: b.type === 'tool_use' ? '' : undefined,
          }
        } else if (parsed.type === 'content_block_delta') {
          const idx = parsed.index
          const d = parsed.delta || {}
          const blk = blocks[idx]
          if (!blk) return
          if (d.type === 'text_delta' && typeof d.text === 'string') {
            blk.text = (blk.text || '') + d.text
            fullResponse += d.text
            res.write(`data: ${JSON.stringify({ type: 'text', text: d.text })}\n\n`)
          } else if (d.type === 'input_json_delta' && typeof d.partial_json === 'string') {
            blk._json = (blk._json || '') + d.partial_json
          }
        } else if (parsed.type === 'content_block_stop') {
          const idx = parsed.index
          const blk = blocks[idx]
          if (blk && blk.type === 'tool_use') {
            try { blk.input = blk._json ? JSON.parse(blk._json) : {} }
            catch { blk.input = {} }
          }
        } else if (parsed.type === 'message_delta') {
          if (parsed.delta?.stop_reason) stopReason = parsed.delta.stop_reason
        } else if (parsed.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', error: parsed.error?.message || 'Unknown error' })}\n\n`)
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try { handleEvent(JSON.parse(data)) } catch { /* skip malformed */ }
        }
      }
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6)
        try { handleEvent(JSON.parse(data)) } catch {}
      }

      // Tool_use loop: if model requested tools, append assistant turn,
      // execute tools, append tool_result turn, and continue the loop.
      const toolUseBlocks = blocks.filter(b => b && b.type === 'tool_use')
      if (!hasTools || toolUseBlocks.length === 0 || stopReason === 'end_turn') break

      // Append the assistant's content (text + tool_use blocks) exactly as the
      // API needs it for the next round.
      const assistantContent = blocks
        .filter(Boolean)
        .map(b => b.type === 'tool_use'
          ? { type: 'tool_use', id: b.id, name: b.name, input: b.input || {} }
          : { type: 'text', text: b.text || '' })
        .filter(b => b.type !== 'text' || b.text)
      messages.push({ role: 'assistant', content: assistantContent })

      // Execute each tool and collect results.
      const toolResults = []
      for (const tb of toolUseBlocks) {
        res.write(`data: ${JSON.stringify({ type: 'tool_call', name: tb.name, args: tb.input || {} })}\n\n`)
        try {
          const result = await executeTool(tb.name, tb.input || {}, { slug, clientId: resolvedClientId })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tb.id,
            content: JSON.stringify(result),
          })
          res.write(`data: ${JSON.stringify({ type: 'tool_result', name: tb.name, result })}\n\n`)
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tb.id,
            content: JSON.stringify({ error: err.message || String(err) }),
            is_error: true,
          })
          res.write(`data: ${JSON.stringify({ type: 'tool_result', name: tb.name, result: { error: err.message || String(err) } })}\n\n`)
        }
      }
      messages.push({ role: 'user', content: toolResults })
      // Continue the outer loop for another Anthropic call with tool results.
    }

    // Write assistant response to Supabase (syncs conversation to Mac)
    // Fire-and-forget
    if (fullResponse) {
      writeToSupabase('assistant', slug, fullResponse, 'dashboard-api', userMsgId, resolvedClientId).catch(() => {})
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Agent chat error:', err)
    // If headers already sent (streaming), try to send error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: 'Chat failed: ' + err.message })
    }
  }
}

export const config = { maxDuration: 60 }
