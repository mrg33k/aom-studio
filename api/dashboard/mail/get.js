// GET /api/dashboard/mail/get?id=<gmail-message-id>
// Returns the full body of a single Gmail message so the EA can read + reply.
//
// Response: {
//   id, threadId, from, to, cc, subject, date, snippet,
//   bodyText, bodyHtml,
//   inReplyTo, references,   // headers needed to thread the reply
// }

import { getUserIdFromRequest, getGmailToken, getGmailTokenByConnection, gmailFetch, decodeBase64Url } from '../../_lib/gmailClient.js'
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

// Walks the MIME tree picking the first text/plain + first text/html part.
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

// R15 (2026-05-25) — walk the MIME tree collecting attachment parts. Gmail
// flags real attachments via filename + body.attachmentId. Parts with a
// Content-ID header AND a parent multipart/related are inline images that
// the HTML body references via cid:<id>; we expose them in `inline` so the
// frontend can swap cid: URLs for /api/dashboard/mail/attachment fetches.
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
      // Inline image without a filename — still useful for cid swap.
      inline.push({ attachmentId, filename: '', mimeType: mime, size, contentId })
    }
    if (Array.isArray(part.parts)) part.parts.forEach(walk)
  }
  walk(payload)
  return { attachments, inline }
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
  let creds
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
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

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
  })
}
