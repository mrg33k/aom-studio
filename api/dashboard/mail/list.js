// GET /api/dashboard/mail/list
//
// Returns the user's "last 10 days, from real humans" Gmail inbox, sorted newest
// first. Used by the CV4 Mail rail when activeTool === 'mail'.
//
// Filter — both upstream (the q= search) and downstream (per-message header
// pass):
//   - newer_than:10d
//   - not from the user themselves
//   - not in promotions / social / updates / forums categories
//   - no List-Unsubscribe, Precedence:bulk, or Auto-Submitted header
//   - From doesn't match the noreply/notifications/etc. regex
//
// Response shape:
// {
//   emails: [{
//     id, threadId, from: {name, email}, subject, snippet, date, unread,
//     historyId
//   }, ...],
//   historyId,   // pass back as ?since= on the next poll
//   mode: 'live' | 'not-connected'
// }

import { getUserIdFromRequest, getGmailToken, getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'

const AUTOMATED_FROM = /(noreply|no-reply|notifications?|mailer-daemon|automated|donotreply|do-not-reply|postmaster|bounces?@)/i
const SKIP_CATEGORIES = new Set(['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'])

function parseFrom(header) {
  if (!header) return { name: '', email: '' }
  // "Display Name <addr@host>" or just "addr@host"
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const userId = await getUserIdFromRequest(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const connectionId = (req.query?.connection_id || '').toString() || null
  let creds
  try {
    if (connectionId) {
      try {
        await assertCanUseConnection(userId, connectionId)
      } catch (e) {
        return res.status(e.status || 403).json({ error: e.message })
      }
      creds = await getGmailTokenByConnection(connectionId)
    } else {
      creds = await getGmailToken(userId)
    }
  } catch (e) {
    return res.status(502).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(200).json({ emails: [], historyId: null, mode: 'not-connected' })

  // Build the search query. Limit to ~150 candidates — the window is 10d so
  // we need more headroom past the filter, but per-message gets are still
  // cheap (metadata format) and Gmail caps single-page list at 500.
  const q = [
    'newer_than:10d',
    '-from:me',
    '-category:promotions',
    '-category:social',
    '-category:updates',
    '-category:forums',
    '-label:list',
  ].join(' ')
  const listResp = await gmailFetch(
    creds.accessToken,
    `/messages?q=${encodeURIComponent(q)}&maxResults=150`,
  )
  if (!listResp.ok) {
    const text = await listResp.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-list', status: listResp.status, detail: text.slice(0, 200) })
  }
  const list = await listResp.json()
  const ids = (list.messages || []).map(m => m.id)
  if (!ids.length) {
    return res.status(200).json({ emails: [], historyId: list.historyId || null, mode: 'live' })
  }

  // metadata format: skips the bodies. Cheap enough to fan out concurrently.
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

  return res.status(200).json({
    emails,
    historyId: latestHistory ? latestHistory.toString() : null,
    mode: 'live',
  })
}
