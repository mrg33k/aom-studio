// POST /api/internal/mail/attachment
//
// Internal-auth endpoint for terminal agents. Downloads a single Gmail
// attachment by attachmentId and returns its bytes as base64. Mirrors the
// shape of /api/dashboard/mail/attachment but accepts SUPABASE_SERVICE_ROLE_KEY
// auth instead of a user JWT.
//
// Body: {
//   connection_id, // required -- account_integrations.id
//   message_id,    // required -- Gmail message id (parent of the attachment)
//   attachment_id, // required -- Gmail attachmentId from message.payload tree
// }
//
// Response: { ok, size, data_base64, mime_type? }
//   mime_type is best-effort: Gmail's attachments.get doesn't return MIME so
//   the caller already knows it (it came from get.js's attachments[]).

import { getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Internal-Key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const internalKey = (req.headers['x-internal-key'] || '').trim()
  if (!SUPABASE_SERVICE_ROLE_KEY || !internalKey || internalKey !== SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  let payload
  try {
    payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ error: 'invalid-json' })
  }

  const { connection_id, message_id, attachment_id } = payload
  if (!connection_id) return res.status(400).json({ error: 'connection_id required' })
  if (!message_id) return res.status(400).json({ error: 'message_id required' })
  if (!attachment_id) return res.status(400).json({ error: 'attachment_id required' })

  let creds
  try {
    creds = await getGmailTokenByConnection(connection_id)
  } catch (e) {
    return res.status(502).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const r = await gmailFetch(
    creds.accessToken,
    `/messages/${encodeURIComponent(message_id)}/attachments/${encodeURIComponent(attachment_id)}`
  )
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-attachment', status: r.status, detail: text.slice(0, 200) })
  }
  const data = await r.json()
  // Gmail returns urlsafe base64 (-_). Pass it through; the client can convert
  // or decode it. size comes from the attachment metadata in get.js, not here.
  return res.status(200).json({
    ok: true,
    size: Number(data.size || 0),
    // Convert urlsafe base64 to standard base64 so the Python client doesn't
    // have to special-case it. + and / are safe to write to disk after decode.
    data_base64: String(data.data || '').replace(/-/g, '+').replace(/_/g, '/'),
  })
}
