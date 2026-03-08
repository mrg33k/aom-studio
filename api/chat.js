// AOM Mission Control -- Chat + Task API
// Vercel serverless function

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

async function fetchGitHubFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha }
}

async function writeGitHubFile(path, content, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: BRANCH,
      }),
    }
  )
  return res.ok
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { action, message, agent, task, mode, topic, responses } = req.body

  // ── ADD TASK ──────────────────────────────────────────────────────────────
  if (action === 'add_task') {
    if (!task) return res.status(400).json({ error: 'task required' })

    const file = await fetchGitHubFile('punch-list.md')
    if (!file) return res.status(500).json({ error: 'Could not fetch punch list' })

    const today = new Date().toISOString().split('T')[0]
    const newItem = `- [ ] ${task.trim()} -- added from dashboard ${today}`

    // Find or create "## Dashboard Tasks" section
    let updated
    if (file.content.includes('## Dashboard Tasks')) {
      updated = file.content.replace(
        '## Dashboard Tasks\n',
        `## Dashboard Tasks\n${newItem}\n`
      )
    } else {
      updated = file.content + `\n\n## Dashboard Tasks\n${newItem}\n`
    }

    const ok = await writeGitHubFile(
      'punch-list.md',
      updated,
      file.sha,
      `Add task from dashboard: ${task.slice(0, 60)}`
    )

    if (!ok) return res.status(500).json({ error: 'GitHub write failed -- token may need write access' })
    return res.status(200).json({ ok: true, message: 'Task added to punch list.' })
  }

  // ── CHAT ──────────────────────────────────────────────────────────────────
  if (action === 'chat') {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars' })
    }
    if (!message) return res.status(400).json({ error: 'message required' })

    // Load context files
    const [handoff, priorities, punch, agentMd] = await Promise.all([
      fetchGitHubFile('HANDOFF.md'),
      fetchGitHubFile('context/current-priorities.md'),
      fetchGitHubFile('punch-list.md'),
      agent && agent !== 'All'
        ? fetchGitHubFile(getAgentFile(agent))
        : Promise.resolve(null),
    ])

    const contextBlock = [
      handoff ? `# HANDOFF\n${handoff.content}` : '',
      priorities ? `# PRIORITIES\n${priorities.content}` : '',
      punch ? `# PUNCH LIST\n${punch.content.slice(0, 3000)}` : '',
      agentMd ? `# ${agent.toUpperCase()} AGENT CONTEXT\n${agentMd.content.slice(0, 4000)}` : '',
    ].filter(Boolean).join('\n\n---\n\n')

    const isCouncil = mode === 'council'
    const systemPrompt = isCouncil
      ? `You are ${agent}, an AI agent at AOM (Ahead of Market). You are in a council meeting called by Patrik. Respond ONLY from your specific domain. Be blunt and direct. Max 4 sentences. No corporate speak, no filler, no hedging. Here is your context:\n\n${contextBlock}`
      : agent && agent !== 'All'
        ? `You are ${agent}, an AI agent at AOM (Ahead of Market), a creative production and AI systems company in Phoenix, AZ. You are responding to Patrik, AOM's co-owner. Be direct, specific, and action-oriented. No filler. Here is your current context:\n\n${contextBlock}`
        : `You are the AOM team -- Bobby (web dev), Jacob (outreach), Alex (deal architect), Cleo (content), and Steffen (brand). You are responding to Patrik, AOM's co-owner. Be direct, specific, action-oriented. Respond from whichever agent's perspective is most relevant to the question, or synthesize across agents. Here is the current company context:\n\n${contextBlock}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: isCouncil ? 400 : 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      return res.status(500).json({ error: 'Anthropic API error: ' + err })
    }

    const data = await anthropicRes.json()
    const reply = data.content?.[0]?.text || 'No response.'
    return res.status(200).json({ reply, agent: agent || 'All' })
  }

  // ── COUNCIL SYNTHESIS ─────────────────────────────────────────────────────
  if (action === 'council_synthesis') {
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })
    if (!topic || !responses?.length) return res.status(400).json({ error: 'topic and responses required' })

    const responsesBlock = responses.map(r => `## ${r.agent}\n${r.text}`).join('\n\n')
    const userMessage = `COUNCIL TOPIC: ${topic}\n\nAGENT RESPONSES:\n\n${responsesBlock}\n\nWrite a tight synthesis. Format:\n\nWhere we agree: [1-2 sentences]\nOpen questions: [bullet points if any, else "None"]\nRecommended next action: [one clear action Patrik should take]`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: 'You are synthesizing an AOM agent council meeting for Patrik, AOM\'s co-owner. Be direct and specific. Extract real signal. The synthesis is what the team will actually act on.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!anthropicRes.ok) return res.status(500).json({ error: 'Anthropic API error during synthesis' })
    const data = await anthropicRes.json()
    return res.status(200).json({ synthesis: data.content?.[0]?.text || 'No synthesis.' })
  }

  return res.status(400).json({ error: 'Unknown action' })
}

function getAgentFile(agent) {
  const map = {
    Bobby: 'projects/ambition-mechanical/AGENT.md',
    Jacob: 'outreach/AGENT.md',
    Alex: 'projects/aom-strategy/AGENT.md',
    Cleo: 'projects/content-agent/AGENT.md',
    Rex: 'projects/rex/AGENT.md',
    Steffen: null,
    Paige: 'projects/paige/AGENT.md',
    Tony: 'projects/tony/AGENT.md',
  }
  return map[agent] || null
}
