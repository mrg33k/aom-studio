// AOM Dashboard -- Conversation history API (production)
// Reads agent/project conversation JSONL files from GitHub
// Uses ETag + in-memory caching to avoid hammering GitHub API

const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

// In-memory cache: { [path]: { content, sha, etag, timestamp } }
const cache = {}
const CACHE_TTL_MS = 15000 // 15 seconds

async function fetchGitHubFile(path) {
  const now = Date.now()
  const cached = cache[path]

  // If cached and still fresh, return cached data immediately (no GitHub call)
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return { content: cached.content, sha: cached.sha }
  }

  // Build request headers with ETag for conditional fetch
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  }
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag
  }

  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`
  const res = await fetch(url, { headers })

  // 304 Not Modified: content unchanged, refresh cache timestamp
  if (res.status === 304 && cached) {
    cached.timestamp = now
    return { content: cached.content, sha: cached.sha }
  }

  if (!res.ok) {
    if (res.status === 404) return { content: '', sha: null }
    return null
  }

  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  const etag = res.headers.get('etag') || null

  // Update cache
  cache[path] = {
    content,
    sha: data.sha,
    etag,
    timestamp: now,
  }

  return { content, sha: data.sha }
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
