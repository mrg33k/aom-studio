// POST /api/dashboard/base-chat
// Base tier single-thread chat. Routes message to the right agent in a workspace.
// Ported from scripts/route-message.py (routing logic) + api/dashboard/chat.js (dispatch pattern).
//
// Body: { workspace: 'workspaces/test-sarah', message: '...', history: [...], clientId: 'test-sarah' }
// Returns:
//   single/direct: { response, via, routing }
//   multi:         { responses: [{agent, response}], routing }
//   ambiguous:     { clarification, routing }
//   architect:     { response, via: 'Architect', mode: 'architect', planReady, planJson }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

// ── Routing Logic (ported from scripts/route-message.py) ─────────────────────

function scoreAgent(msgLower, agent, history = []) {
  let score = 0.0
  const msgWords = new Set((msgLower.match(/\b\w+\b/g) || []))

  const agentName = (agent.name || '').toLowerCase()
  if (agentName && msgWords.has(agentName)) score += 0.6

  const slug = (agent.slug || '').toLowerCase()
  if (slug && msgWords.has(slug)) score += 0.5

  const roleWords = new Set(((agent.role || '').toLowerCase().match(/\b\w{4,}\b/g) || []))
  const roleHits = [...roleWords].filter(w => msgWords.has(w)).length
  score += 0.2 * roleHits

  const keywords = Array.isArray(agent.keywords) ? agent.keywords : []
  const kwHits = keywords.filter(kw => msgWords.has(kw) || msgLower.includes(kw)).length
  score += 0.12 * kwHits

  const skills = Array.isArray(agent.skills) ? agent.skills : []
  for (const skill of skills) {
    for (const sw of skill.replace(/-/g, ' ').split(' ')) {
      if (sw.length > 5 && msgWords.has(sw)) score += 0.15
    }
  }

  const projectStr = (agent.project || '').toLowerCase().replace(/-/g, ' ')
  for (const pw of (projectStr.match(/\b\w{4,}\b/g) || [])) {
    if (msgWords.has(pw)) score += 0.2
  }

  if (history.length > 0) {
    const last = [...history].reverse().find(m => m.routed_to)
    if (last?.routed_to === agent.slug) score += 0.2
  }

  return Math.min(score, 1.0)
}

function isMetaQuestion(msgLower) {
  return ['what can', 'how do i', 'how does', 'what agents', 'who is',
    'what is my', 'help me understand', "what's set up", 'show me', 'list my',
    'who handles', 'what do you do', 'how does this work'].some(p => msgLower.includes(p))
}

function routeMessage(message, agents, history = []) {
  if (!agents?.length) return { type: 'direct', agents: [], clarification: null }

  const msgLower = message.toLowerCase()
  const scored = agents.map(a => ({ agent: a, score: scoreAgent(msgLower, a, history) }))
  scored.sort((a, b) => b.score - a.score)

  const { agent: top, score: topScore } = scored[0]

  // Multi-agent detection
  const splitWords = [' and ', ' also ', '. also', ', and also ', ' plus ']
  if (splitWords.some(p => msgLower.includes(p))) {
    const qualifying = scored.filter(s => s.score >= 0.1)
    if (qualifying.length >= 2) {
      return {
        type: 'multi',
        agents: qualifying.slice(0, 2).map(s => ({ slug: s.agent.slug, name: s.agent.name, confidence: s.score })),
        clarification: null,
      }
    }
  }

  if (topScore < 0.1) {
    return { type: 'direct', agents: [], clarification: null, reasoning: isMetaQuestion(msgLower) ? 'meta' : 'no-match' }
  }

  if (scored.length >= 2 && scored[1].score > 0.1 && (topScore - scored[1].score) < 0.15) {
    const second = scored[1].agent
    return {
      type: 'ambiguous',
      agents: [
        { slug: top.slug, name: top.name, confidence: topScore },
        { slug: second.slug, name: second.name, confidence: scored[1].score },
      ],
      clarification: `That could be a ${(top.role || '').toLowerCase()} task or a ${(second.role || '').toLowerCase()} question -- which are you thinking?`,
    }
  }

  return {
    type: 'single',
    agents: [{ slug: top.slug, name: top.name, confidence: topScore }],
    clarification: null,
  }
}

// ── GitHub File Fetching ──────────────────────────────────────────────────────

async function fetchGitHubFile(path) {
  if (!GITHUB_TOKEN) return null
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

async function loadWorkspace(workspacePath) {
  const [agentsJson, meMd, goalsMd] = await Promise.all([
    fetchGitHubFile(`${workspacePath}/agents.json`),
    fetchGitHubFile(`${workspacePath}/me.md`),
    fetchGitHubFile(`${workspacePath}/goals.md`),
  ])

  let agents = []
  if (agentsJson) {
    try { agents = JSON.parse(agentsJson) } catch {}
  }

  return { agents, me: meMd || '', goals: goalsMd || '' }
}

// ── Anthropic Dispatch ────────────────────────────────────────────────────────

async function dispatchToAgent(agent, message, workspace, history = []) {
  if (!ANTHROPIC_API_KEY) {
    return `[Mock] ${agent.name} received: "${message.slice(0, 100)}". (Set ANTHROPIC_API_KEY to get real responses.)`
  }

  // Try to load agent's AGENT.md
  const agentMd = await fetchGitHubFile(`${agent.path || ''}/AGENT.md`).catch(() => null)

  const historyContext = history.slice(-8).map(m => {
    const role = m.role === 'user' ? 'User' : (m.via || 'Agent')
    return `${role}: ${(m.content || m.text || '').slice(0, 200)}`
  }).join('\n')

  const systemPrompt = [
    `You are ${agent.name}, ${agent.role}.`,
    agentMd ? `\n## Your Identity\n${agentMd.slice(0, 2000)}` : '',
    `\n## User Context\n${workspace.me.slice(0, 500)}`,
    workspace.goals ? `\n## Goals\n${workspace.goals.slice(0, 300)}` : '',
    historyContext ? `\n## Recent Conversation\n${historyContext}` : '',
    '\n## Instructions\nRespond directly to the user. Be concise and helpful. Do not reference routing or other agents.',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })
    if (!res.ok) return `[${agent.name} error: ${res.status}]`
    const data = await res.json()
    return data.content?.[0]?.text || '[No response]'
  } catch (err) {
    return `[${agent.name} error: ${err.message}]`
  }
}

async function handleDirect(message, workspace) {
  if (!ANTHROPIC_API_KEY) {
    const agentNames = workspace.agents.map(a => a.name).join(', ')
    return `Your team includes: ${agentNames || 'no agents yet'}. Ask me anything or tell me what to work on.`
  }

  const agentList = workspace.agents.map(a => `- ${a.name}: ${a.role}`).join('\n')
  const systemPrompt = [
    `You are a helpful assistant managing a user's team.`,
    `The user has these agents:\n${agentList}`,
    workspace.goals ? `Goals: ${workspace.goals.slice(0, 300)}` : '',
    `Answer helpfully. If they're asking about what agents can do, explain. If it's small talk, be friendly and brief.`,
  ].filter(Boolean).join('\n\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })
    if (!res.ok) return "I'm here to help. What do you need?"
    const data = await res.json()
    return data.content?.[0]?.text || "I'm here to help. What do you need?"
  } catch {
    return `You have ${workspace.agents.length} agents ready. Tell me what to work on.`
  }
}

// ── Supabase Write ────────────────────────────────────────────────────────────

async function saveToSupabase(role, agentName, text, clientId, source = 'base-chat') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        role,
        agent: agentName,
        text,
        source,
        client_id: clientId || 'default',
        status: 'read',
      }),
    })
  } catch {}
}

// ── Supabase History Fetch ────────────────────────────────────────────────────

async function fetchConversationHistory(clientId, limit = 30) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?client_id=eq.${encodeURIComponent(clientId)}&source=eq.base-chat&order=timestamp.asc&limit=${limit}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )
    if (!res.ok) return []
    const rows = await res.json()
    return rows.map(r => ({
      role: r.role === 'user' ? 'user' : 'assistant',
      content: r.text || '',
    }))
  } catch { return [] }
}

// ── Architect Mode ────────────────────────────────────────────────────────────
// Fired when the workspace has no agents yet. The Architect runs the discovery
// conversation, then produces a JSON plan the frontend can use to create agents.

async function loadArchitectPrompt() {
  const prompt = await fetchGitHubFile('workspaces/_templates/architect/discovery-prompt.md')
  return prompt || ''
}

async function dispatchToArchitect(message, history = []) {
  if (!ANTHROPIC_API_KEY) {
    return {
      text: '[Mock] Architect received your message. Set ANTHROPIC_API_KEY for real responses.',
      planReady: false,
      planJson: null,
    }
  }

  const discoveryPrompt = await loadArchitectPrompt()

  // Build conversation messages: history + current user message
  const messages = []
  for (const h of history) {
    if (h.role === 'user' || h.role === 'assistant') {
      messages.push({ role: h.role, content: h.content })
    }
  }
  messages.push({ role: 'user', content: message })

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 1024,
        system: discoveryPrompt,
        messages,
      }),
    })
    if (!res.ok) return { text: `[Architect error: ${res.status}]`, planReady: false, planJson: null }
    const data = await res.json()
    const text = data.content?.[0]?.text || '[No response]'

    // Detect if the Architect produced the final JSON plan
    // The plan is wrapped in ```json ... ``` per the discovery-prompt spec
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    let planReady = false
    let planJson = null
    if (jsonMatch) {
      try {
        planJson = JSON.parse(jsonMatch[1].trim())
        // Must have user_profile, projects, agents to be a valid plan
        if (planJson.user_profile && Array.isArray(planJson.projects) && Array.isArray(planJson.agents)) {
          planReady = true
        }
      } catch { /* malformed JSON -- keep planReady false */ }
    }

    return { text, planReady, planJson }
  } catch (err) {
    return { text: `[Architect error: ${err.message}]`, planReady: false, planJson: null }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { workspace, message, history = [], clientId } = req.body || {}

  if (!workspace || !message) {
    return res.status(400).json({ error: 'workspace and message required' })
  }

  const effectiveClientId = clientId || workspace.split('/').pop()

  try {
    // Load workspace
    const ws = await loadWorkspace(workspace)

    // ── ARCHITECT MODE ────────────────────────────────────────────────────────
    // If the workspace has no agents yet, this is a new user. Hand off to the
    // Architect for discovery. Pull full conversation history from Supabase so
    // the Architect remembers everything across sessions.
    if (!ws.agents || ws.agents.length === 0) {
      // Fetch persisted history from Supabase (falls back to client-provided history)
      const persistedHistory = await fetchConversationHistory(effectiveClientId, 40)
      const fullHistory = persistedHistory.length > 0 ? persistedHistory : history

      // Save user message to Supabase
      saveToSupabase('user', 'user', message, effectiveClientId).catch(() => {})

      const { text, planReady, planJson } = await dispatchToArchitect(message, fullHistory)

      // Save Architect response to Supabase
      saveToSupabase('assistant', 'architect', text, effectiveClientId).catch(() => {})

      return res.status(200).json({
        response: text,
        via: 'Architect',
        mode: 'architect',
        planReady,
        planJson: planReady ? planJson : null,
      })
    }

    // Route
    const routing = routeMessage(message, ws.agents, history)

    // Save user message
    saveToSupabase('user', 'user', message, effectiveClientId).catch(() => {})

    if (routing.type === 'ambiguous') {
      saveToSupabase('assistant', 'router', routing.clarification, effectiveClientId).catch(() => {})
      return res.status(200).json({ clarification: routing.clarification, routing })
    }

    if (routing.type === 'multi') {
      const responses = await Promise.all(
        routing.agents.map(async (agentInfo) => {
          const agent = ws.agents.find(a => a.slug === agentInfo.slug)
          if (!agent) return { agent: agentInfo.name, response: '[Agent not found]' }
          const response = await dispatchToAgent(agent, message, ws, history)
          saveToSupabase('assistant', agentInfo.name.toLowerCase(), response, effectiveClientId).catch(() => {})
          return { agent: agentInfo.name, response }
        })
      )
      return res.status(200).json({ responses, routing })
    }

    if (routing.type === 'single') {
      const agentInfo = routing.agents[0]
      const agent = ws.agents.find(a => a.slug === agentInfo.slug)
      if (!agent) return res.status(200).json({ response: '[Agent not found]', via: agentInfo.name, routing })
      const response = await dispatchToAgent(agent, message, ws, history)
      saveToSupabase('assistant', agentInfo.name.toLowerCase(), response, effectiveClientId).catch(() => {})
      return res.status(200).json({ response, via: agentInfo.name, routing })
    }

    // Direct (no agent match / meta question)
    const response = await handleDirect(message, ws)
    saveToSupabase('assistant', 'router', response, effectiveClientId).catch(() => {})
    return res.status(200).json({ response, via: 'Router', routing })

  } catch (err) {
    console.error('[base-chat] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export const config = { maxDuration: 60 }
