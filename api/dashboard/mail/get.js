// GET /api/dashboard/mail/get?id=<message-id>&connection_id=<id>
// Returns the full body of a single message for Gmail or Outlook.
// Branches on integration_slug from the connection row.
//
// Response: {
//   id, threadId, from, to, cc, subject, date, snippet,
//   bodyText, bodyHtml,
//   inReplyTo, references,   // headers for threading replies
//   attachments, inline,     // Gmail only (populated); Outlook: [] for now
//   provider                 // 'gmail' | 'outlook'
// }

import { getUserIdFromRequest, getGmailToken, getGmailTokenByConnection, gmailFetch, decodeBase64Url } from '../../_lib/gmailClient.js'
import { getOutlookTokenByConnection, graphFetch, buildMailboxPath, sharedMailboxAccessError } from '../../_lib/outlookClient.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'

function parseFrom(header) {
  if (!header) return { name: '', email: '' }
  const m = header.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
  return { name: '', email: header.trim().toLowerCase() }
}

function parseAddressList(header) {
  if (!header) return []
  return header.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => parseFrom(s)).filter(p => p.email)
}

function headerVal(headers, name) {
  if (!headers) return ''
  const h = headers.find(x => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function extractBodies(payload) {
  let text = ''
  let html = ''
  function walk(part) {
    if (!part) return
    const mime = (part.mimeType || '').toLowerCase()
    if (mime === 'text/plain' && !text && part.body?.data) {
      text = decodeBase64Url(part.body.data)
    } else if (mime === 'text/html' && !html && part.body?.data) {
      html = decodeBase64Url(part.body.data)
    }
    if (Array.isArray(part.parts)) part.parts.forEach(walk)
  }
  walk(payload)
  return { text, html }
}

function extractAttachments(payload) {
  const attachments = []
  const inline = []
  function walk(part) {
    if (!part) return
    const filename = part.filename || ''
    const attachmentId = part.body?.attachmentId || ''
    const size = part.body?.size || 0
    const mime = (part.mimeType || '').toLowerCase()
    const headers = part.headers || []
    const contentId = (headers.find(h => (h.name || '').toLowerCase() === 'content-id')?.value || '')
      .replace(/^<|>$/g, '')
    const dispoHeader = (headers.find(h => (h.name || '').toLowerCase() === 'content-disposition')?.value || '').toLowerCase()
    const isInline = dispoHeader.startsWith('inline') || (!!contentId && mime.startsWith('image/'))
    if (attachmentId && filename) {
      const item = { attachmentId, filename, mimeType: mime, size, contentId: contentId || null }
      if (isInline && contentId) inline.push(item)
      else attachments.push(item)
    } else if (attachmentId && isInline && contentId && mime.startsWith('image/')) {
      inline.push({ attachmentId, filename: '', mimeType: mime, size, contentId })
    }
    if (Array.isArray(part.parts)) part.parts.forEach(walk)
  }
  walk(payload)
  return { attachments, inline }
}

// ─────────────────────────────────────────────────────────
// Outlook message fetcher via Microsoft Graph
// Own mailbox:    GET /me/messages/{id}?$select=…
// Shared mailbox: GET /users/{address}/messages/{id}?$select=…
// Normalises the Graph response to the same shape as Gmail.
// ─────────────────────────────────────────────────────────
async function getOutlookMessage(accessToken, id, mailboxAddress, ownEmail) {
  // internetMessageHeaders contains RFC-2822 headers (In-Reply-To, References, Message-Id, etc.)
  const select = [
    'id', 'conversationId', 'subject', 'bodyPreview',
    'body', 'from', 'toRecipients', 'ccRecipients',
    'receivedDateTime', 'isRead', 'hasAttachments',
    'internetMessageId', 'internetMessageHeaders',
  ].join(',')
  const relPath = `/messages/${encodeURIComponent(id)}?$select=${encodeURIComponent(select)}`
  const url = buildMailboxPath(relPath, mailboxAddress, ownEmail)
  const r = await graphFetch(accessToken, url)
  if (!r.ok) {
    const human = sharedMailboxAccessError(r.status, mailboxAddress)
    const text = await r.text().catch(() => '')
    return { error: `graph-get ${r.status}: ${text.slice(0, 200)}`, human, status: r.status }
  }
  const m = await r.json()

  const inetHeaders = Array.isArray(m.internetMessageHeaders) ? m.internetMessageHeaders : []
  function inetHeader(name) {
    const h = inetHeaders.find(x => (x.name || '').toLowerCase() === name.toLowerCase())
    return h?.value || ''
  }

  function graphAddr(addr) {
    if (!addr?.emailAddress) return { name: '', email: '' }
    return { name: addr.emailAddress.name || '', email: (addr.emailAddress.address || '').toLowerCase() }
  }

  const bodyContent = m.body?.content || ''
  const bodyType = (m.body?.contentType || 'html').toLowerCase()

  return {
    id: m.id,
    threadId: m.conversationId || m.id,
    historyId: null,
    from: graphAddr(m.from),
    to: (m.toRecipients || []).map(graphAddr),
    cc: (m.ccRecipients || []).map(graphAddr),
    subject: m.subject || '(no subject)',
    date: m.receivedDateTime ? new Date(m.receivedDateTime).getTime() : 0,
    snippet: m.bodyPreview || '',
    bodyText: bodyType === 'text' ? bodyContent : '',
    bodyHtml: bodyType === 'html' ? bodyContent : '',
    attachments: [], // full attachment list requires /me/messages/{id}/attachments call
    inline: [],
    messageId: m.internetMessageId || inetHeader('Message-Id'),
    inReplyTo: inetHeader('In-Reply-To'),
    references: inetHeader('References'),
    provider: 'outlook',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = (req.query?.id || '').toString()
  if (!id) return res.status(400).json({ error: 'id-required' })

  const userId = await getUserIdFromRequest(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const connectionId = (req.query?.connection_id || '').toString() || null
  // mailbox_address: optional — shared mailbox address for the message source.
  // Absent or matching own account_email → reads from /me/messages/{id}.
  // Set to a different address → reads from /users/{address}/messages/{id}.
  const mailboxAddress = (req.query?.mailbox_address || '').toString().trim() || null
  let creds
  let providerSlug = 'gmail'

  if (connectionId) {
    let connectionRow
    try {
      connectionRow = await assertCanUseConnection(userId, connectionId)
    } catch (e) {
      return res.status(e.status || 403).json({ error: e.message })
    }
    providerSlug = connectionRow?.integration_slug || 'gmail'

    if (providerSlug === 'outlook') {
      creds = await getOutlookTokenByConnection(connectionId)
      if (!creds) return res.status(401).json({ error: 'integration:not-connected' })
      const ownEmail = creds.row?.config?.account_email || null
      const result = await getOutlookMessage(creds.accessToken, id, mailboxAddress, ownEmail)
      if (result.error) {
        if (result.human) {
          return res.status(result.status || 403).json({ error: result.human, code: 'shared-mailbox-access-denied' })
        }
        return res.status(502).json({ error: result.error })
      }
      return res.status(200).json(result)
    }

    // Gmail path
    creds = await getGmailTokenByConnection(connectionId)
  } else {
    creds = await getGmailToken(userId)
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  // ── Gmail path (original) ────────────────────────────────
  const r = await gmailFetch(creds.accessToken, `/messages/${encodeURIComponent(id)}?format=full`)
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-get', status: r.status, detail: text.slice(0, 200) })
  }
  const msg = await r.json()
  const headers = msg.payload?.headers || []
  const bodies = extractBodies(msg.payload)
  const { attachments, inline } = extractAttachments(msg.payload)

  return res.status(200).json({
    id: msg.id,
    threadId: msg.threadId,
    historyId: msg.historyId,
    from: parseFrom(headerVal(headers, 'From')),
    to: parseAddressList(headerVal(headers, 'To')),
    cc: parseAddressList(headerVal(headers, 'Cc')),
    subject: headerVal(headers, 'Subject') || '(no subject)',
    date: msg.internalDate ? Number(msg.internalDate) : Date.parse(headerVal(headers, 'Date') || ''),
    snippet: msg.snippet || '',
    bodyText: bodies.text,
    bodyHtml: bodies.html,
    attachments,
    inline,
    messageId: headerVal(headers, 'Message-Id') || headerVal(headers, 'Message-ID'),
    inReplyTo: headerVal(headers, 'In-Reply-To'),
    references: headerVal(headers, 'References'),
    provider: 'gmail',
  })
}
