// GET /api/dashboard/mail/attachment?id=<gmail-message-id>&attachmentId=<x>&connection_id=<c>
// Fetches one attachment from Gmail (users.messages.attachments.get),
// base64url-decodes it, and streams the bytes back with the right
// Content-Type so the browser can render images inline or download files.
// Required query: id, attachmentId. Optional: connection_id, filename.
// R15 (2026-05-25) — corner:corner-ui-cv4.

import { getUserIdFromRequest, getGmailToken, getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'

function safeFilename(name) {
  if (!name) return 'attachment'
  // Strip any control / path / quote chars that would break Content-Disposition.
  return name.replace(/[\\/\r\n"]/g, '_').slice(0, 200)
}

// Gmail attachment bytes are RFC 4648 base64url-encoded. The shared
// decodeBase64Url helper returns a UTF-8 string; for binary bytes (images,
// PDFs, etc.) we need the raw Buffer.
function base64UrlToBuffer(b64url) {
  if (!b64url) return Buffer.alloc(0)
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const messageId = (req.query?.id || '').toString()
  const attachmentId = (req.query?.attachmentId || '').toString()
  if (!messageId || !attachmentId) return res.status(400).json({ error: 'id-and-attachmentId-required' })

  const userId = await getUserIdFromRequest(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const connectionId = (req.query?.connection_id || '').toString() || null
  let creds
  if (connectionId) {
    try { await assertCanUseConnection(userId, connectionId) }
    catch (e) { return res.status(e.status || 403).json({ error: e.message }) }
    creds = await getGmailTokenByConnection(connectionId)
  } else {
    creds = await getGmailToken(userId)
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const r = await gmailFetch(
    creds.accessToken,
    `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  )
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-attachment', status: r.status, detail: text.slice(0, 200) })
  }
  const body = await r.json()
  if (!body?.data) return res.status(502).json({ error: 'no-data' })

  const bytes = base64UrlToBuffer(body.data)
  const mimeType = (req.query?.mimeType || '').toString() || 'application/octet-stream'
  const filename = safeFilename((req.query?.filename || '').toString())
  const disposition = (req.query?.disposition || 'inline').toString() === 'attachment' ? 'attachment' : 'inline'

  res.setHeader('Content-Type', mimeType)
  res.setHeader('Content-Length', bytes.length.toString())
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  return res.status(200).send(bytes)
}
