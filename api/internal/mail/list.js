// POST /api/internal/mail/list
//
// Internal-auth endpoint for terminal agents (Elon, Studio tmux sessions).
// No user JWT required. Authentication via X-Internal-Key header matched
// against CORNER_INTERNAL_KEY (corner:retire-supabase, 2026-09-03: was the
// Supabase service role key).
//
// Mirrors the read shape of /api/dashboard/mail/list but skips the user-JWT
// + workspace-access checks. The terminal EA is trusted (already authed via
// service-role key); no per-user filtering is layered on top of Gmail's q=.
//
// Body: {
//   connection_id?,  // account_integrations.id of the workspace Gmail
//   account_email?,  // alternative to connection_id — resolves the row by email
//                    // (at least one of connection_id / account_email required)
//   bucket?,         // one of: awaiting-reply, today, clients, threads,
//                    //         prospects, sent, all  (default: 'today')
//   days?,           // override day window when bucket isn't given (default: 7)
// }
//
// Response: same shape as the dashboard list — { emails, bucket, historyId, mode }.

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../../_lib/gmailClient.js'
import { buildBucketQuery } from '../../_lib/mailBuckets.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

const AUTOMATED_FROM = /(noreply|no-reply|notifications?|mailer-daemon|automated|donotreply|do-not-reply|postmaster|bounces?@)/i
const SKIP_CATEGORIES = new Set(['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'])

// ─── Shared helpers (mirrored from api/dashboard/mail/list.js) ──────────────

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

function isAutomated(msg) {
  const labels = msg.labelIds || []
  for (const l of labels) if (SKIP_CATEGORIES.has(l)) return true
  const headers = msg.payload?.headers || []
  if (headerVal(headers, 'List-Unsubscribe')) return true
  if ((headerVal(headers, 'Precedence') || '').toLowerCase() === 'bulk') return true
  const auto = (headerVal(headers, 'Auto-Submitted') || '').toLowerCase()
  if (auto && auto !== 'no') return true
  const from = headerVal(headers, 'From')
  if (AUTOMATED_FROM.test(from)) return true
  return false
}

async function applyAwaitingFilter(emails, creds) {
  const accountEmail = (creds?.row?.config?.account_email || '').toLowerCase()
  if (!accountEmail) return emails
  const threadIds = [...new Set(emails.map(e => e.threadId).filter(Boolean))]
  const tailByThread = {}
  await Promise.all(threadIds.map(async tid => {
    try {
      const r = await gmailFetch(creds.accessToken, `/threads/${tid}?format=metadata&metadataHeaders=From`)
      if (!r.ok) return
      const t = await r.json()
      const msgs = t.messages || []
      if (!msgs.length) return
      const tail = msgs[msgs.length - 1]
      const fromHeader = (tail.payload?.headers || []).find(h => (h.name || '').toLowerCase() === 'from')
      const fromVal = (fromHeader?.value || '').toLowerCase()
      tailByThread[tid] = fromVal
    } catch { /* ignore */ }
  }))
  return emails.filter(e => {
    const fromVal = tailByThread[e.threadId]
    if (!fromVal) return false
    return !fromVal.includes(accountEmail)
  })
}

// ─── Handler ────────────────────────────────────────────────────────────────

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

  const { connection_id, account_email, bucket, days } = payload
  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })

  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  // Build the search query. With a bucket slug, reuse the dashboard's mapper so
  // terminal output matches what Patrik sees in the UI. Without a bucket, fall
  // back to "last N days from real humans" (N defaults to 7).
  const bucketSlug = (bucket || '').toString() || null
  let q, postFilter = null
  if (bucketSlug) {
    const ctx = {
      account_email: creds.row?.config?.account_email,
      client_emails: creds.row?.config?.client_emails || [],
      prospect_emails: creds.row?.config?.prospect_emails || [],
    }
    try {
      const out = buildBucketQuery(bucketSlug, ctx)
      q = out.q
      postFilter = out.postFilter || null
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  } else {
    const dayWindow = Number(days) > 0 ? Math.min(Number(days), 90) : 7
    q = [
      `newer_than:${dayWindow}d`,
      '-from:me',
      '-category:promotions',
      '-category:social',
      '-category:updates',
      '-category:forums',
      '-label:list',
    ].join(' ')
  }

  const listResp = await gmailFetch(
    creds.accessToken,
    `/messages?q=${encodeURIComponent(q)}&maxResults=150`,
  )
  if (!listResp.ok) {
    const text = await listResp.text().catch(() => '')
    return res.status(424).json({ error: 'gmail-list', status: listResp.status, detail: text.slice(0, 200) })
  }
  const list = await listResp.json()
  const ids = (list.messages || []).map(m => m.id)
  if (!ids.length) {
    return res.status(200).json({ emails: [], bucket: bucketSlug, historyId: list.historyId || null, mode: 'live' })
  }

  const wanted = ['From', 'Subject', 'Date', 'List-Unsubscribe', 'Auto-Submitted', 'Precedence']
  const metaQS = `format=metadata&${wanted.map(h => `metadataHeaders=${encodeURIComponent(h)}`).join('&')}`
  const messages = await Promise.all(ids.map(async id => {
    const r = await gmailFetch(creds.accessToken, `/messages/${id}?${metaQS}`)
    if (!r.ok) return null
    return r.json()
  }))

  const emails = []
  let latestHistory = list.historyId ? BigInt(list.historyId) : 0n
  for (const m of messages) {
    if (!m) continue
    if (isAutomated(m)) continue
    const headers = m.payload?.headers || []
    const from = parseFrom(headerVal(headers, 'From'))
    if (!from.email) continue
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
    if (m.historyId) {
      try {
        const h = BigInt(m.historyId)
        if (h > latestHistory) latestHistory = h
      } catch { /* ignore */ }
    }
  }
  emails.sort((a, b) => (b.date || 0) - (a.date || 0))

  let filtered = emails
  if (postFilter === 'empty') {
    filtered = []
  } else if (postFilter === 'awaiting') {
    filtered = await applyAwaitingFilter(emails, creds)
  }

  return res.status(200).json({
    emails: filtered,
    bucket: bucketSlug,
    historyId: latestHistory ? latestHistory.toString() : null,
    mode: 'live',
  })
}
