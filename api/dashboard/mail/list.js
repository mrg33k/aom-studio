// GET /api/dashboard/mail/list
//
// Returns the user's recent inbox, sorted newest first.
// Supports Gmail and Outlook connections — branches on integration_slug.
//
// Gmail filter:
//   - newer_than:10d, not from me, not promotions/social/updates/forums
//   - no List-Unsubscribe, Precedence:bulk, or Auto-Submitted header
//   - From doesn't match the noreply/notifications regex
//
// Outlook filter:
//   - Inbox folder only (GET /me/mailFolders/Inbox/messages)
//   - receivedDateTime > 10 days ago, isDraft eq false
//   - Up to 50 messages, ordered newest first
//
// Response shape (both providers):
// {
//   emails: [{
//     id, threadId, from: {name, email}, subject, snippet, date, unread,
//     historyId,  // Gmail only (null for Outlook)
//     provider    // 'gmail' | 'outlook'
//   }, ...],
//   historyId,   // Gmail: pass back as ?since= on next poll; Outlook: null
//   mode: 'live' | 'not-connected',
//   provider     // 'gmail' | 'outlook'
// }

import { getUserIdFromRequest, getGmailToken, getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'
import { getOutlookTokenByConnection, graphFetch } from '../../_lib/outlookClient.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'
import { buildBucketQuery } from '../../_lib/mailBuckets.js'

// buildBucketQuery may not exist on older builds — guard it
const _buildBucketQuery = typeof buildBucketQuery === 'function' ? buildBucketQuery : null

const AUTOMATED_FROM = /(noreply|no-reply|notifications?|mailer-daemon|automated|donotreply|do-not-reply|postmaster|bounces?@)/i
const SKIP_CATEGORIES = new Set(['CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'])

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

function detectAttachments(payload) {
  if (!payload) return false
  if (payload.filename && payload.body?.attachmentId) return true
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) {
      if (detectAttachments(p)) return true
    }
  }
  return false
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

// ────────────────────────────────────────────────────────────
// Outlook inbox lister via Microsoft Graph
// GET /me/mailFolders/Inbox/messages — OData query
// Returns normalized email shape matching Gmail branch.
// ────────────────────────────────────────────────────────────
async function listOutlookInbox(accessToken) {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  const filter = encodeURIComponent(`receivedDateTime gt ${tenDaysAgo} and isDraft eq false`)
  const select = encodeURIComponent('id,conversationId,subject,bodyPreview,from,receivedDateTime,isRead,hasAttachments')
  const url = `/mailFolders/Inbox/messages?$filter=${filter}&$select=${select}&$orderby=receivedDateTime%20desc&$top=50`
  const r = await graphFetch(accessToken, url)
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return { error: `graph-list ${r.status}: ${text.slice(0, 200)}`, status: r.status }
  }
  const data = await r.json()
  const messages = data.value || []
  const emails = messages.map(m => ({
    id: m.id,
    threadId: m.conversationId || m.id,
    historyId: null, // Graph has no direct historyId equivalent
    from: {
      name: m.from?.emailAddress?.name || '',
      email: (m.from?.emailAddress?.address || '').toLowerCase(),
    },
    subject: m.subject || '(no subject)',
    snippet: m.bodyPreview || '',
    date: m.receivedDateTime ? new Date(m.receivedDateTime).getTime() : 0,
    unread: !m.isRead,
    hasAttachments: m.hasAttachments || false,
    provider: 'outlook',
  }))
  return { emails }
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
  let providerSlug = 'gmail' // default

  try {
    if (connectionId) {
      let connectionRow
      try {
        connectionRow = await assertCanUseConnection(userId, connectionId)
      } catch (e) {
        return res.status(e.status || 403).json({ error: e.message })
      }
      providerSlug = connectionRow?.integration_slug || 'gmail'

      if (providerSlug === 'outlook') {
        // Outlook path — load Graph token and list inbox
        creds = await getOutlookTokenByConnection(connectionId)
        if (!creds) return res.status(200).json({ emails: [], historyId: null, mode: 'not-connected', provider: 'outlook' })
        const result = await listOutlookInbox(creds.accessToken)
        if (result.error) return res.status(502).json({ error: result.error })
        return res.status(200).json({
          emails: result.emails,
          historyId: null,
          mode: 'live',
          provider: 'outlook',
        })
      }

      // Gmail path
      creds = await getGmailTokenByConnection(connectionId)
    } else {
      creds = await getGmailToken(userId)
    }
  } catch (e) {
    return res.status(502).json({ error: 'mail-auth', detail: e.message })
  }
  if (!creds) return res.status(200).json({ emails: [], historyId: null, mode: 'not-connected', provider: 'gmail' })

  // ── Gmail path (original) ──────────────────────────────────
  const bucketSlug = (req.query?.bucket || '').toString() || null
  let q, postFilter = null
  if (bucketSlug && _buildBucketQuery) {
    const ctx = {
      account_email: creds.row?.config?.account_email,
      client_emails: creds.row?.config?.client_emails || [],
      prospect_emails: creds.row?.config?.prospect_emails || [],
    }
    try {
      const out = _buildBucketQuery(bucketSlug, ctx)
      q = out.q
      postFilter = out.postFilter || null
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  } else {
    q = [
      'newer_than:10d',
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
    return res.status(502).json({ error: 'gmail-list', status: listResp.status, detail: text.slice(0, 200) })
  }
  const list = await listResp.json()
  const ids = (list.messages || []).map(m => m.id)
  if (!ids.length) {
    return res.status(200).json({ emails: [], historyId: list.historyId || null, mode: 'live', provider: 'gmail' })
  }

  const fieldsFilter = encodeURIComponent(
    'id,threadId,historyId,internalDate,labelIds,snippet,'
    + 'payload(mimeType,filename,headers(name,value),'
    + 'parts(mimeType,filename,body(attachmentId,size),'
    + 'parts(mimeType,filename,body(attachmentId,size),'
    + 'parts(mimeType,filename,body(attachmentId,size)))))',
  )
  const fetchQS = `format=full&fields=${fieldsFilter}`
  const messages = await Promise.all(ids.map(async id => {
    const r = await gmailFetch(creds.accessToken, `/messages/${id}?${fetchQS}`)
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
      hasAttachments: detectAttachments(m.payload),
      provider: 'gmail',
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
    provider: 'gmail',
  })
}
