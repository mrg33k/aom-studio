// POST /api/internal/mail/search
//
// Internal-auth endpoint for terminal agents. Runs an arbitrary Gmail search
// query (Gmail's q= syntax: from:, subject:, is:unread, after:YYYY/MM/DD, etc.)
// and returns matching message metadata. No noise filtering — the caller's
// query is the only filter.
// Auth: X-Internal-Key must equal CORNER_INTERNAL_KEY (corner:retire-supabase,
// 2026-09-03: was the Supabase service role key).
//
// Body: {
//   connection_id?,  // account_integrations.id (or account_email as alternative)
//   account_email?,  // alternative to connection_id — resolves the row by email
//   q,               // required — Gmail query string
//   max?,            // default 25, capped at 100
// }
//
// Response: { emails: [...], q, total, mode } — same per-email shape as
// /api/internal/mail/list (id, threadId, from, subject, snippet, date, unread).

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../../_lib/gmailClient.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

function parseFrom(header) {
  if (!header) return { name: '', email: '' }
  const m = header.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
  return { name: '', email: header.trim().toLowerCase() }
}

function headerVal(headers, name) {
  if (!headers) return ''
  const h = headers.find(x => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Internal-Key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const internalKey = (req.headers['x-internal-key'] || '').trim()
  if (!INTERNAL_KEY || !internalKey || internalKey !== INTERNAL_KEY) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  let payload
  try {
    payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ error: 'invalid-json' })
  }

  const { connection_id, account_email, q, max } = payload
  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'q (query string) required' })

  const maxResults = Math.max(1, Math.min(Number(max) > 0 ? Number(max) : 25, 100))

  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const listResp = await gmailFetch(
    creds.accessToken,
    `/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
  )
  if (!listResp.ok) {
    const text = await listResp.text().catch(() => '')
    return res.status(424).json({ error: 'gmail-search', status: listResp.status, detail: text.slice(0, 200) })
  }
  const list = await listResp.json()
  const ids = (list.messages || []).map(m => m.id)
  if (!ids.length) {
    return res.status(200).json({ emails: [], q, total: 0, mode: 'live' })
  }

  const wanted = ['From', 'Subject', 'Date']
  const metaQS = `format=metadata&${wanted.map(h => `metadataHeaders=${encodeURIComponent(h)}`).join('&')}`
  const messages = await Promise.all(ids.map(async id => {
    const r = await gmailFetch(creds.accessToken, `/messages/${id}?${metaQS}`)
    if (!r.ok) return null
    return r.json()
  }))

  const emails = []
  for (const m of messages) {
    if (!m) continue
    const headers = m.payload?.headers || []
    const from = parseFrom(headerVal(headers, 'From'))
    emails.push({
      id: m.id,
      threadId: m.threadId,
      historyId: m.historyId,
      from,
      subject: headerVal(headers, 'Subject') || '(no subject)',
      snippet: m.snippet || '',
      date: m.internalDate ? Number(m.internalDate) : Date.parse(headerVal(headers, 'Date') || ''),
      unread: (m.labelIds || []).includes('UNREAD'),
    })
  }
  emails.sort((a, b) => (b.date || 0) - (a.date || 0))

  return res.status(200).json({
    emails,
    q,
    total: emails.length,
    mode: 'live',
  })
}
