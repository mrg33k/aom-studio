// POST /api/internal/mail/attachment
//
// Internal-auth endpoint for terminal agents. Downloads a single Gmail
// attachment by attachmentId and returns its bytes as base64. Mirrors the
// shape of /api/dashboard/mail/attachment but accepts the CORNER_INTERNAL_KEY
// shared secret instead of a user JWT (corner:retire-supabase, 2026-09-03:
// the secret used to be the Supabase service role key).
//
// Body: {
//   connection_id?,  // account_integrations.id (or account_email as alternative)
//   account_email?,  // alternative to connection_id — resolves the row by email
//   message_id,      // required -- Gmail message id (parent of the attachment)
//   attachment_id,   // required -- Gmail attachmentId from message.payload tree
// }
//
// Response: { ok, size, data_base64, mime_type? }
//   mime_type is best-effort: Gmail's attachments.get doesn't return MIME so
//   the caller already knows it (it came from get.js's attachments[]).

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../../_lib/gmailClient.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

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

  const { connection_id, account_email, message_id, attachment_id } = payload
  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })
  if (!message_id) return res.status(400).json({ error: 'message_id required' })
  if (!attachment_id) return res.status(400).json({ error: 'attachment_id required' })

  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const r = await gmailFetch(
    creds.accessToken,
    `/messages/${encodeURIComponent(message_id)}/attachments/${encodeURIComponent(attachment_id)}`
  )
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(424).json({ error: 'gmail-attachment', status: r.status, detail: text.slice(0, 200) })
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
