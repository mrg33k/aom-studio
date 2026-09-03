// POST /api/internal/mail/get
//
// Internal-auth endpoint for terminal agents. Returns full body + headers for
// a single Gmail message. Mirrors /api/dashboard/mail/get without user-JWT.
// Auth: X-Internal-Key must equal CORNER_INTERNAL_KEY (corner:retire-supabase,
// 2026-09-03: was the Supabase service role key).
//
// Body: {
//   connection_id?,  // account_integrations.id (or account_email as alternative)
//   account_email?,  // alternative to connection_id — resolves the row by email
//   message_id,      // required — Gmail message id
// }
//
// Response: same shape as the dashboard get — id, threadId, from, to, cc,
// subject, date, snippet, bodyText, bodyHtml, inReplyTo, references, messageId.

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch, decodeBase64Url } from '../../_lib/gmailClient.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

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

// Walk the MIME tree collecting attachment parts. Gmail flags real
// attachments via filename + body.attachmentId. Inline images carry a
// Content-ID header and live under a multipart/related parent; we expose
// them separately so the agent can distinguish a real PDF/PO attachment
// from an embedded signature image. Ported from /api/dashboard/mail/get.js
// (2026-05-26) so terminal agents see the same shape the UI does.
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

  const { connection_id, account_email, message_id } = payload
  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })
  if (!message_id) return res.status(400).json({ error: 'message_id required' })

  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const r = await gmailFetch(creds.accessToken, `/messages/${encodeURIComponent(message_id)}?format=full`)
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(424).json({ error: 'gmail-get', status: r.status, detail: text.slice(0, 200) })
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
    messageId: headerVal(headers, 'Message-Id') || headerVal(headers, 'Message-ID'),
    inReplyTo: headerVal(headers, 'In-Reply-To'),
    references: headerVal(headers, 'References'),
    attachments,
    inline,
  })
}
