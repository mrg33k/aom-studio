// AOM Dashboard -- Conversation history API (production)
// Reads agent/project conversation JSONL files from GitHub

const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

async function fetchGitHubFile(path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}&_=${Date.now()}`
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'If-None-Match': '',
    },
  })
  if (!res.ok) {
    if (res.status === 404) return { content: '', sha: null }
    return null
  }
  const data = await res.json()
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const target = req.query.target
    const type = req.query.type || 'agent'
    const limit = parseInt(req.query.limit || '50', 10)
    const since = req.query.since || null

    if (!target) {
      return res.status(400).json({ error: 'Missing target parameter' })
    }

    // Build file path based on type
    const filePath = type === 'project'
      ? `conversations/projects/${target}.jsonl`
      : `conversations/agents/${target}.jsonl`

    const file = await fetchGitHubFile(filePath)
    if (!file || !file.content) {
      return res.status(200).json({ messages: [], target, type })
    }

    const lines = file.content.trim().split('\n').filter(l => l.trim())
    const recent = lines.slice(-limit)
    const messages = []
    const seenIds = new Set()
    const sinceDate = since ? new Date(since) : null

    for (const line of recent) {
      try {
        const msg = JSON.parse(line)
        // Dedup by message ID
        if (msg.id && seenIds.has(msg.id)) continue
        if (msg.id) seenIds.add(msg.id)
        // Filter by since (use Date comparison to handle Z vs +00:00)
        if (sinceDate && msg.timestamp && new Date(msg.timestamp) <= sinceDate) continue
        messages.push(msg)
      } catch {
        // Skip malformed lines
      }
    }

    return res.status(200).json({ messages, target, type })
  } catch (err) {
    console.error('Conversations API error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
