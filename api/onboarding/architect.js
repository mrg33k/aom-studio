// POST /api/onboarding/architect
// System Architect discovery conversation
// Streams responses from Claude using the architect system prompt
// Reads prompt files from GitHub repo

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

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

function buildSystemPrompt(agentMd, discoveryPrompt) {
  const fallback = `You are Architect, Corner's System Architect. You meet new users, learn what they need, and build the right team for them. Be warm but efficient. Ask one question at a time. Every conversation ends with a concrete plan the user approves, followed by a JSON code block with the plan structure.`

  const parts = [agentMd || fallback]
  if (discoveryPrompt) parts.push('\n\n---\n\n' + discoveryPrompt)
  return parts.join('')
}

function getOpeningInstruction(stageContext) {
  if (!stageContext || !stageContext.whoType) {
    return 'Open the conversation with your natural greeting.'
  }
  const roleMap = {
    owner: 'business owner', employee: 'employee',
    freelancer: 'freelancer', student: 'student', other: 'individual',
  }
  const role = roleMap[stageContext.whoType] || stageContext.whoType
  const age = stageContext.ageRange ? `, age range ${stageContext.ageRange}` : ''
  return `Open the conversation naturally. Background context (do not mention directly): the user indicated they are a ${role}${age}. Use this to inform your questions but open fresh.`
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

  const { message, history = [], isOpening = false, stageContext = {} } = req.body

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Fallback if no API key
  if (!ANTHROPIC_API_KEY) {
    const placeholder = isOpening
      ? "Hey, welcome to Corner. I'm going to build your team -- but first, tell me about yourself. What do you do?"
      : "Got it. Tell me more -- what takes up most of your time in a typical week?"
    res.write(`data: ${JSON.stringify({ type: 'text', text: placeholder })}\n\n`)
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    return res.end()
  }

  try {
    // Load architect prompts from GitHub
    const [agentMd, discoveryPrompt] = await Promise.all([
      fetchFile('workspaces/_templates/architect/AGENT.md'),
      fetchFile('workspaces/_templates/architect/discovery-prompt.md'),
    ])

    const systemPrompt = buildSystemPrompt(agentMd, discoveryPrompt)

    // Build messages array
    const messages = []

    // Add conversation history
    for (const h of (history || []).slice(-20)) {
      if (h.content) {
        messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })
      }
    }

    // Current turn
    if (isOpening) {
      messages.push({ role: 'user', content: getOpeningInstruction(stageContext) })
    } else if (message) {
      messages.push({ role: 'user', content: message })
    }

    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Please open the conversation.' })
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      res.write(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`)
      return res.end()
    }

    const reader = anthropicRes.body.getReader()
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
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ type: 'text', text: parsed.delta.text })}\n\n`)
          } else if (parsed.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          } else if (parsed.type === 'error') {
            res.write(`data: ${JSON.stringify({ type: 'error', error: parsed.error?.message })}\n\n`)
          }
        } catch {}
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()

  } catch (err) {
    console.error('[architect] Error:', err)
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
    }
    res.end()
  }
}

export const config = { maxDuration: 60 }
