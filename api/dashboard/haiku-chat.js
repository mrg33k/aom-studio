// POST /api/dashboard/haiku-chat
// Haiku-powered fast task dispatcher — Bobby tier.
// Always dispatch-eligible. Tool surface: write_task, query_tasks, query_results,
// append_tape, relay_question, spawn_foreman.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

async function writeToSupabase(role, agent, text, source = 'haiku-chat', replyTo = '', clientId = 'aom') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
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
        id: crypto.randomUUID(),
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
}

function cleanTitle(raw) {
  const s = (raw || '').trim().replace(/\s+/g, ' ')
  if (!s) return 'Untitled task'
  return s.length > 140 ? s.slice(0, 137) + '…' : s
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'write_task',
    description: 'Queue a task for a tmux worker to execute. Use for code work, deploys, fixes, investigations. Pick the project slug carefully (corner/aom-studio/ambition). Do NOT call for questions, opinions, or chit-chat. Do NOT use for whole-mission requests — use spawn_foreman instead.',
    input_schema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: "Project slug matching Supabase projects table (e.g. 'corner', 'aom-studio', 'ambition').",
        },
        title: { type: 'string', description: 'Short task title (≤140 chars).' },
        description: {
          type: 'string',
          description: 'Full brief for the worker. Be specific: paths, scripts, success criteria.',
        },
        model: {
          type: 'string',
          enum: ['sonnet', 'opus', 'haiku'],
          description: "Worker model. Default 'sonnet'. Use 'opus' for complex reasoning.",
        },
        mission: {
          type: 'string',
          description: 'Optional mission slug this task belongs to (e.g. "corner:launch-readiness").',
        },
      },
      required: ['project', 'title', 'description'],
    },
  },
  {
    name: 'query_tasks',
    description: 'List tasks matching optional filters. Use when Patrik asks about task status, what is running, or what is queued for a mission/project.',
    input_schema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Filter by project slug.' },
        status: {
          type: 'string',
          enum: ['queued', 'building', 'done', 'failed', 'needs_input', 'waiting'],
          description: 'Filter by status.',
        },
        mission: { type: 'string', description: 'Filter by mission slug (matches metadata.mission).' },
        limit: { type: 'number', description: 'Max rows to return (default 10, max 25).' },
      },
      required: [],
    },
  },
  {
    name: 'query_results',
    description: 'Get the full result for a specific task by ID. Use when Patrik asks what a task produced.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to look up.' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'append_tape',
    description: 'Append a note to an agent tape (last-conversation.md equivalent stored in Supabase messages). Use when you want to leave context for another agent.',
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent slug (e.g. "bobby", "elon", "foreman").' },
        content: { type: 'string', description: 'Note to append to the tape.' },
      },
      required: ['agent', 'content'],
    },
  },
  {
    name: 'relay_question',
    description: 'Send a message or question to another agent via Supabase relay. The agent will pick it up on next wake. Use for inter-agent handoffs.',
    input_schema: {
      type: 'object',
      properties: {
        to_agent: { type: 'string', description: 'Recipient agent slug.' },
        message: { type: 'string', description: 'Message or question to relay.' },
      },
      required: ['to_agent', 'message'],
    },
  },
  {
    name: 'spawn_foreman',
    description: 'Spawn a foreman agent that drives an entire mission to completion round-by-round. The foreman queues sub-tasks, polls completion, runs acceptance gates, and advances until the mission hits 95% confidence. Use this when Patrik says "knock out X mission", "drive X", "solve the whole X", or "run foreman on X". Do NOT use write_task for whole-mission requests.',
    input_schema: {
      type: 'object',
      properties: {
        mission_slug: {
          type: 'string',
          description: 'Mission to drive, in namespace:slug format (e.g. "corner:launch-readiness", "corner:shared-rooms", "aom:aom-website"). Default namespace is "corner" if none provided.',
        },
        reason: {
          type: 'string',
          description: 'Optional: why Patrik wants this mission driven now.',
        },
      },
      required: ['mission_slug'],
    },
  },
]

// ─── Tool executor ───────────────────────────────────────────────────────────

async function executeTool(name, args, ctx) {
  switch (name) {

    case 'write_task': {
      const projectSlug = String(args.project || '').trim().toLowerCase() || null
      const title = cleanTitle(args.title || args.description || '')
      const description = String(args.description || args.title || '').trim()
      const model = ['sonnet', 'opus', 'haiku'].includes(args.model) ? args.model : 'sonnet'
      const missionSlug = args.mission ? String(args.mission).trim() : null

      if (!description) throw new Error('description is required')

      let repoPath = ''
      if (projectSlug) {
        try {
          const rows = await sbRest('GET', `projects?slug=eq.${encodeURIComponent(projectSlug)}&select=slug,repo_path&limit=1`)
          if (Array.isArray(rows) && rows[0]?.repo_path) repoPath = rows[0].repo_path
        } catch { /* non-fatal */ }
      }

      const row = {
        title,
        text: description,
        description,
        status: 'queued',
        source: `haiku-chat-${ctx.slug}`,
        client_id: ctx.clientId,
        project: projectSlug,
        project_path: repoPath,
        priority: 0,
        created_at: new Date().toISOString(),
        metadata: {
          repo: projectSlug,
          created_via: `haiku-chat-${ctx.slug}`,
          model,
          requested_by_agent: ctx.slug,
          ...(missionSlug ? { mission: missionSlug } : {}),
        },
      }

      const inserted = await sbRest('POST', 'tasks', row)
      const task = Array.isArray(inserted) ? inserted[0] : inserted
      if (!task?.id) throw new Error('Task insert returned no row')

      writeToSupabase('assistant', `task:${task.id}`, `queued by ${ctx.slug} from haiku-chat: ${title}`, 'haiku-chat-dispatch', '', ctx.clientId).catch(() => {})

      return { success: true, task_id: task.id, title: task.title, status: task.status, project: projectSlug }
    }

    case 'query_tasks': {
      const filters = []
      if (args.project) filters.push(`project=eq.${encodeURIComponent(args.project)}`)
      if (args.status) filters.push(`status=eq.${encodeURIComponent(args.status)}`)
      filters.push(`client_id=eq.${encodeURIComponent(ctx.clientId)}`)
      const limit = Math.min(Number(args.limit) || 10, 25)
      filters.push(`order=created_at.desc`, `limit=${limit}`, `select=id,title,status,project,created_at,metadata`)

      let qs = `tasks?${filters.join('&')}`
      if (args.mission) {
        // Filter by metadata.mission — use Supabase PostgREST JSON filter
        qs = `tasks?${filters.join('&')}&metadata->>mission=eq.${encodeURIComponent(args.mission)}`
      }

      const rows = await sbRest('GET', qs)
      return { tasks: Array.isArray(rows) ? rows : [], count: Array.isArray(rows) ? rows.length : 0 }
    }

    case 'query_results': {
      const id = String(args.task_id || '').trim()
      if (!id) throw new Error('task_id is required')
      const rows = await sbRest('GET', `tasks?id=eq.${encodeURIComponent(id)}&select=id,title,status,error,metadata,started_at,completed_at&limit=1`)
      const task = Array.isArray(rows) ? rows[0] : null
      if (!task) return { found: false, task_id: id }
      const meta = task.metadata || {}
      return {
        found: true,
        task_id: task.id,
        title: task.title,
        status: task.status,
        started_at: task.started_at,
        completed_at: task.completed_at,
        error: task.error || null,
        result: meta.result_payload || null,
        question: meta.question || null,
      }
    }

    case 'append_tape': {
      const agent = String(args.agent || '').trim()
      const content = String(args.content || '').trim()
      if (!agent) throw new Error('agent is required')
      if (!content) throw new Error('content is required')

      await writeToSupabase('assistant', agent, content, `tape-append-${ctx.slug}`, '', ctx.clientId)
      return { success: true, agent, appended: content.slice(0, 100) }
    }

    case 'relay_question': {
      const toAgent = String(args.to_agent || '').trim()
      const message = String(args.message || '').trim()
      if (!toAgent) throw new Error('to_agent is required')
      if (!message) throw new Error('message is required')

      await writeToSupabase('user', toAgent, message, `relay-from-${ctx.slug}`, '', ctx.clientId)
      return { success: true, relayed_to: toAgent, message: message.slice(0, 200) }
    }

    case 'spawn_foreman': {
      let missionSlug = String(args.mission_slug || '').trim()
      if (!missionSlug) throw new Error('mission_slug is required')

      // Normalize: if no namespace colon, prepend corner:
      if (!missionSlug.includes(':')) {
        missionSlug = `corner:${missionSlug}`
      }

      // Validate format: namespace:slug, both parts non-empty
      const [ns, ...rest] = missionSlug.split(':')
      const slug = rest.join(':')
      if (!ns || !slug) throw new Error(`Invalid mission_slug format: "${missionSlug}". Expected "namespace:slug" (e.g. "corner:launch-readiness").`)

      const title = cleanTitle(`Foreman: drive ${missionSlug}`)
      const body = `python3 scripts/foreman-orchestrate.py --mission ${missionSlug} --loop`

      let repoPath = ''
      try {
        const rows = await sbRest('GET', `projects?slug=eq.corner&select=slug,repo_path&limit=1`)
        if (Array.isArray(rows) && rows[0]?.repo_path) repoPath = rows[0].repo_path
      } catch { /* non-fatal */ }

      const row = {
        title,
        text: body,
        description: body,
        status: 'queued',
        source: `haiku-chat-${ctx.slug}`,
        client_id: ctx.clientId,
        project: 'corner',
        project_path: repoPath,
        priority: 0,
        created_at: new Date().toISOString(),
        metadata: {
          repo: 'corner',
          created_via: `haiku-chat-${ctx.slug}`,
          model: 'opus',
          requested_by_agent: ctx.slug,
          is_foreman: true,
          mission: missionSlug,
          reason: args.reason || null,
        },
      }

      const inserted = await sbRest('POST', 'tasks', row)
      const task = Array.isArray(inserted) ? inserted[0] : inserted
      if (!task?.id) throw new Error('Foreman task insert returned no row')

      writeToSupabase(
        'assistant',
        `task:${task.id}`,
        `foreman queued by ${ctx.slug}: driving mission ${missionSlug}`,
        'haiku-chat-foreman',
        '',
        ctx.clientId,
      ).catch(() => {})

      return {
        success: true,
        task_id: task.id,
        title: task.title,
        mission_slug: missionSlug,
        status: task.status,
        is_foreman: true,
      }
    }
  }

  throw new Error(`Unknown tool: ${name}`)
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(slug = 'bobby') {
  return `You are ${slug === 'bobby' ? 'Bobby' : slug}, AOM's fast task dispatcher running on Haiku. You are having a 1:1 with Patrik Matheson, AOM's co-owner. Be direct, specific, action-oriented. No em dashes. No emojis unless Patrik uses them first. Bullet points over paragraphs.

# TASK DISPATCH

You have six tools: write_task, query_tasks, query_results, append_tape, relay_question, spawn_foreman.

For discrete pieces of code work, deploys, fixes, or investigations → call write_task.
For whole-mission requests → call spawn_foreman (see below).

SPLITTING RULE: multiple distinct tasks = multiple write_task calls (one per piece). Workers for different repos run in parallel.

After calling write_task, tell Patrik in one line what you queued. For multiple tasks, use bullet points. Do not restate the description.

Never call write_task for questions, opinions, or discussion.

# MISSION DISPATCH — spawn_foreman

When Patrik uses language like:
- "knock out X" / "knock out the X mission"
- "drive X" / "drive the X mission"
- "solve the whole X" / "solve everything in X"
- "run foreman on X" / "kick off foreman for X"
- "have a foreman drive X" / "get the foreman to tackle X"

→ call spawn_foreman immediately with mission_slug. Do NOT use write_task for whole-mission requests.

Mission slug format: "namespace:mission-name". Default namespace for Corner platform missions is "corner".

Examples:
- "drive the launch-readiness mission" → spawn_foreman(mission_slug="corner:launch-readiness")
- "knock out shared-rooms" → spawn_foreman(mission_slug="corner:shared-rooms")
- "solve the whole aom-website mission" → spawn_foreman(mission_slug="aom:aom-website")
- "run foreman on tenant-isolation" → spawn_foreman(mission_slug="corner:tenant-isolation")
- "have a foreman drive the autonomy-loop" → spawn_foreman(mission_slug="corner:autonomy-loop")

After spawn_foreman succeeds, tell Patrik: "Foreman queued — driving [mission] round-by-round until done. Task [short-id]."
`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')

  const { slug = 'bobby', message, history, client_id } = req.body || {}
  const clientId = (client_id && client_id.trim()) ? client_id.trim().toLowerCase() : 'aom'

  if (!message) return res.status(400).json({ error: 'message required' })

  if (!ANTHROPIC_API_KEY) {
    return res.status(200).json({
      reply: '[Bobby] API key not configured. Set ANTHROPIC_API_KEY in env vars.',
      placeholder: true,
    })
  }

  try {
    writeToSupabase('user', slug, message, 'haiku-chat', '', clientId).catch(() => {})

    const systemPrompt = buildSystemPrompt(slug)

    const messages = []
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-20)) {
        const content = h.content || h.text || ''
        if (!content) continue
        messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content })
      }
    }
    messages.push({ role: 'user', content: message })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const MAX_LOOPS = 3
    let fullResponse = ''

    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      const requestBody = {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools: TOOLS,
        stream: true,
      }

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

      const reader = anthropicRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const blocks = []
      let stopReason = null

      const handleEvent = (parsed) => {
        if (!parsed?.type) return
        if (parsed.type === 'content_block_start') {
          const b = parsed.content_block || {}
          blocks[parsed.index] = {
            type: b.type,
            text: b.type === 'text' ? '' : undefined,
            id: b.id,
            name: b.name,
            _json: b.type === 'tool_use' ? '' : undefined,
          }
        } else if (parsed.type === 'content_block_delta') {
          const blk = blocks[parsed.index]
          if (!blk) return
          const d = parsed.delta || {}
          if (d.type === 'text_delta' && typeof d.text === 'string') {
            blk.text = (blk.text || '') + d.text
            fullResponse += d.text
            res.write(`data: ${JSON.stringify({ type: 'text', text: d.text })}\n\n`)
          } else if (d.type === 'input_json_delta' && typeof d.partial_json === 'string') {
            blk._json = (blk._json || '') + d.partial_json
          }
        } else if (parsed.type === 'content_block_stop') {
          const blk = blocks[parsed.index]
          if (blk?.type === 'tool_use') {
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
        try { handleEvent(JSON.parse(buffer.slice(6))) } catch {}
      }

      const toolUseBlocks = blocks.filter(b => b?.type === 'tool_use')
      if (toolUseBlocks.length === 0 || stopReason === 'end_turn') break

      const assistantContent = blocks
        .filter(Boolean)
        .map(b => b.type === 'tool_use'
          ? { type: 'tool_use', id: b.id, name: b.name, input: b.input || {} }
          : { type: 'text', text: b.text || '' })
        .filter(b => b.type !== 'text' || b.text)
      messages.push({ role: 'assistant', content: assistantContent })

      const toolResults = []
      for (const tb of toolUseBlocks) {
        res.write(`data: ${JSON.stringify({ type: 'tool_call', name: tb.name, args: tb.input || {} })}\n\n`)
        try {
          const result = await executeTool(tb.name, tb.input || {}, { slug, clientId })
          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) })
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
    }

    if (fullResponse) {
      writeToSupabase('assistant', slug, fullResponse, 'haiku-chat-api', '', clientId).catch(() => {})
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    console.error('haiku-chat error:', err)
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: 'Chat failed: ' + err.message })
    }
  }
}

export const config = { maxDuration: 60 }
