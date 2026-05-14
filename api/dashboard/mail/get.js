// GET /api/dashboard/mail/get?id=<gmail-message-id>
// Returns the full body of a single Gmail message so the EA can read + reply.
//
// Response: {
//   id, threadId, from, to, cc, subject, date, snippet,
//   bodyText, bodyHtml,
//   inReplyTo, references,   // headers needed to thread the reply
// }

import { getUserIdFromRequest, getGmailToken, gmailFetch, decodeBase64Url } from '../../_lib/gmailClient.js'

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

  const creds = await getGmailToken(userId)
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const r = await gmailFetch(creds.accessToken, `/messages/${encodeURIComponent(id)}?format=full`)
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-get', status: r.status, detail: text.slice(0, 200) })
  }
  const msg = await r.json()
  const headers = msg.payload?.headers || []
  const bodies = extractBodies(msg.payload)

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
  })
}
