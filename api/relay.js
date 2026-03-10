// AOM Dashboard -> Claude Code relay API
// Reads/writes JSONL relay files in mrg33k/AOM-EA via GitHub API

const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const INBOX_PATH = 'context/relay-inbox.jsonl'
const OUTBOX_PATH = 'context/relay-outbox.jsonl'

async function fetchGitHubFile(path, bustCache = false) {
  // Use cache-busting timestamp to avoid GitHub API returning stale content
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}${bustCache ? `&_=${Date.now()}` : ''}`
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      ...(bustCache ? { 'If-None-Match': '' } : {}),
    },
  })
  if (!res.ok) {
    if (res.status === 404) return { content: '', sha: null }
    return null
  }
  const data = await res.json()
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha }
}

async function writeGitHubFile(path, content, sha, message) {
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  return res.ok
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' })
  }

  try {
    // POST: send a message (append to inbox)
    if (req.method === 'POST') {
      const { message } = req.body
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message required' })
      }

      const id = crypto.randomUUID()
      const entry = {
        id,
        timestamp: new Date().toISOString(),
        source: 'dashboard',
        message: message.trim(),
        status: 'pending',
      }

      const file = await fetchGitHubFile(INBOX_PATH)
      if (!file) return res.status(500).json({ error: 'Failed to read inbox' })

      const newContent = file.content
        ? file.content.trimEnd() + '\n' + JSON.stringify(entry) + '\n'
        : JSON.stringify(entry) + '\n'

      const ok = await writeGitHubFile(INBOX_PATH, newContent, file.sha, `relay: dashboard message ${id.slice(0, 8)}`)
      if (!ok) return res.status(500).json({ error: 'Failed to write inbox' })

      return res.status(200).json({ ok: true, id })
    }

    // GET: poll for all messages (inbox + outbox merged, sorted by time)
    if (req.method === 'GET') {
      const sinceTs = req.query.since || null

      // Prevent any caching on poll responses
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      res.setHeader('Pragma', 'no-cache')

      // Fetch both files in parallel with cache busting
      const [inbox, outbox] = await Promise.all([
        fetchGitHubFile(INBOX_PATH, true),
        fetchGitHubFile(OUTBOX_PATH, true),
      ])

      const parseLines = (content, type) => {
        if (!content || !content.trim()) return []
        return content.trim().split('\n').filter(Boolean).map(line => {
          try {
            const msg = JSON.parse(line)
            return { ...msg, type }
          } catch { return null }
        }).filter(Boolean)
      }

      const inboxMsgs = inbox ? parseLines(inbox.content, 'sent') : []
      const outboxMsgs = outbox ? parseLines(outbox.content, 'response') : []

      // Merge and sort by timestamp
      let all = [...inboxMsgs, ...outboxMsgs]
      all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // Filter by since timestamp if provided
      if (sinceTs) {
        const since = new Date(sinceTs)
        all = all.filter(m => new Date(m.timestamp) > since)
      }

      // Only return the last 50 messages to keep payloads small
      if (all.length > 50) {
        all = all.slice(-50)
      }

      return res.status(200).json({ messages: all })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Relay error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
