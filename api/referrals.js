// Referrals API -- capture referred emails from brand pages
// Stores to data/referrals.json in AOM-EA repo via GitHub API (same pattern as waitlist.js)
//
// To move this off the GitHub file, swap the handler body to the Convex
// leads:capture mutation on neat-pony-216 (see api/_lib/reportsStore.js for the call shape).

const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const REFERRALS_PATH = 'data/referrals.json'

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
  const body = { message, content: Buffer.from(content).toString('base64'), branch: BRANCH }
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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, source } = req.body || {}

  if (!email || !email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  try {
    const existing = await fetchGitHubFile(REFERRALS_PATH)
    let entries = []
    let sha = null

    if (existing) {
      sha = existing.sha
      try { entries = JSON.parse(existing.content) } catch { entries = [] }
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (entries.some(e => e.email === normalizedEmail)) {
      return res.status(200).json({ ok: true })
    }

    entries.push({
      email: normalizedEmail,
      source: source || 'unknown',
      timestamp: new Date().toISOString(),
    })

    const written = await writeGitHubFile(
      REFERRALS_PATH,
      JSON.stringify(entries, null, 2),
      sha,
      `Referral: ${normalizedEmail} (${source || 'unknown'})`
    )

    if (!written) {
      return res.status(500).json({ error: 'Failed to save' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Referral error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
