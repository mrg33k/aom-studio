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
async function writeToSupabase(role, agent, text, source = 'dashboard', replyTo = '') {
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
      }),
    })
  } catch {}
  return id
}

const AGENT_META = {
  bobby:   { name: 'Bobby',   role: 'Web Dev',           folder: 'bobby' },
  colton:  { name: 'Colton',  role: 'Backup Builder',    folder: 'colton' },
  elmo:    { name: 'Elmo',    role: 'QA Gate',           folder: null },
  steffen: { name: 'Steffen', role: 'Creative Director', folder: 'steffen' },
  jacob:   { name: 'Jacob',   role: 'Outreach',          folder: 'jacob' },
  elon:    { name: 'Elon',    role: 'Systems',           folder: 'sys' },
  alex:    { name: 'Alex',    role: 'Strategy',          folder: 'aom-strategy' },
  steve:   { name: 'Steve',   role: 'AI Advisory',       folder: 'steve' },
  cleo:    { name: 'Cleo',    role: 'Content',           folder: 'content-agent' },
  tony:    { name: 'Tony',    role: 'Social Media',      folder: 'tony' },
  paige:   { name: 'Paige',   role: 'Client Success',    folder: 'paige' },
  pixel:   { name: 'Pixel',   role: 'Extension',         folder: 'pixel' },
  mom:     { name: 'Mom',     role: 'Orchestrator',      folder: 'mom' },
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

async function loadAgentContext(slug) {
  const meta = AGENT_META[slug]
  if (!meta || !meta.folder) return { meta, agentMd: null, lastConvo: null, priorities: null }

  const [agentMd, lastConvo, priorities] = await Promise.all([
    fetchFile(`projects/${meta.folder}/AGENT.md`),
    fetchFile(`projects/${meta.folder}/last-conversation.md`),
    fetchFile('context/current-priorities.md'),
  ])

  return { meta, agentMd, lastConvo, priorities }
}

function buildSystemPrompt(meta, agentMd, lastConvo, priorities) {
  const parts = [
    `You are ${meta.name}, an AI agent at AOM (Ahead of Market), a creative production and AI systems company in Phoenix, AZ.`,
    `Your role: ${meta.role}.`,
    `You are having a 1:1 conversation with Patrik Matheson, AOM's co-owner. Be direct, specific, and action-oriented.`,
    `Match his energy. No em dashes. No emojis unless he uses them first. Bullet points over paragraphs when listing things.`,
    `Keep responses focused and useful. When you can take action or give a specific recommendation, do it.`,
    '',
  ]

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

  const { slug, message, history } = req.body

  if (!slug || !message) {
    return res.status(400).json({ error: 'slug and message required' })
  }

  const meta = AGENT_META[slug]
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
    writeToSupabase('user', slug, message, 'dashboard').catch(() => {})

    // Load agent context from GitHub
    const { agentMd, lastConvo, priorities } = await loadAgentContext(slug)
    const systemPrompt = buildSystemPrompt(meta, agentMd, lastConvo, priorities)

    // Build messages array from history
    const messages = []
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-20)) { // Keep last 20 messages for context
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content || h.text || '',
        })
      }
    }
    messages.push({ role: 'user', content: message })

    // Stream response via SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      res.write(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`)
      res.end()
      return
    }

    // Pipe the Anthropic SSE stream to the client, collect full response
    const reader = anthropicRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullResponse = ''

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

        try {
          const parsed = JSON.parse(data)

          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            fullResponse += parsed.delta.text
            res.write(`data: ${JSON.stringify({ type: 'text', text: parsed.delta.text })}\n\n`)
          } else if (parsed.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          } else if (parsed.type === 'error') {
            res.write(`data: ${JSON.stringify({ type: 'error', error: parsed.error?.message || 'Unknown error' })}\n\n`)
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6)
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          fullResponse += parsed.delta.text
          res.write(`data: ${JSON.stringify({ type: 'text', text: parsed.delta.text })}\n\n`)
        }
      } catch {}
    }

    // Write assistant response to Supabase (syncs conversation to Mac)
    // Fire-and-forget
    if (fullResponse) {
      writeToSupabase('assistant', slug, fullResponse, 'dashboard-api', userMsgId).catch(() => {})
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
