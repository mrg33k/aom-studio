// POST /api/internal/mail/modify
//
// Internal-auth endpoint for terminal agents. Modifies Gmail message labels:
// archive (remove INBOX), mark read/unread (remove/add UNREAD), star/unstar
// (add/remove STARRED), or add/remove custom labels.
//
// HARD CONSTRAINT (Patrik 2026-05-26): "archive only never delete for our
// safety we will not delete unless its me explicitely asking from terminal."
// This endpoint refuses any operation that would move messages to TRASH or
// permanently delete them.
//
// Auth: X-Internal-Key must equal CORNER_INTERNAL_KEY (corner:retire-supabase,
// 2026-09-03: was the Supabase service role key).
//
// Body: { connection_id?, account_email?, message_id, action, addLabels?, removeLabels? }
//   (connection_id or account_email required — account_email resolves the row at runtime)
// action: archive | mark-read | mark-unread | star | unstar
// Response: { ok, id, labelIds, applied }

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../../_lib/gmailClient.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

const ACTION_MAP = {
  'archive':     { add: [],          remove: ['INBOX'] },
  'mark-read':   { add: [],          remove: ['UNREAD'] },
  'mark-unread': { add: ['UNREAD'],  remove: [] },
  'star':        { add: ['STARRED'], remove: [] },
  'unstar':      { add: [],          remove: ['STARRED'] },
}

const REFUSED_LABELS = new Set(['TRASH', 'SPAM'])

function isRefused(label) {
  return REFUSED_LABELS.has(String(label || '').toUpperCase().trim())
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

  const { connection_id, account_email, message_id, action } = payload
  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })
  if (!message_id) return res.status(400).json({ error: 'message_id required' })

  const addLabels = Array.isArray(payload.addLabels) ? payload.addLabels : []
  const removeLabels = Array.isArray(payload.removeLabels) ? payload.removeLabels : []

  for (const lbl of [...addLabels, ...removeLabels]) {
    if (isRefused(lbl)) {
      return res.status(403).json({
        error: 'destructive-label-refused',
        detail: `Refusing to touch label "${lbl}". Trash/spam moves require a manual operator action, not an agent call.`,
      })
    }
  }

  let actionAdd = []
  let actionRemove = []
  if (action) {
    const a = String(action).toLowerCase().trim()
    if (!ACTION_MAP[a]) {
      return res.status(400).json({
        error: 'unknown-action',
        detail: `action="${a}" not supported. Allowed: ${Object.keys(ACTION_MAP).join(', ')}. To trash/delete, do it by hand — no agent path.`,
      })
    }
    actionAdd = ACTION_MAP[a].add
    actionRemove = ACTION_MAP[a].remove
  }

  const finalAdd = [...new Set([...actionAdd, ...addLabels])]
  const finalRemove = [...new Set([...actionRemove, ...removeLabels])]

  for (const lbl of [...finalAdd, ...finalRemove]) {
    if (isRefused(lbl)) {
      return res.status(403).json({
        error: 'destructive-label-refused',
        detail: `Refusing TRASH/SPAM label op for "${lbl}".`,
      })
    }
  }

  if (finalAdd.length === 0 && finalRemove.length === 0) {
    return res.status(400).json({ error: 'no-op', detail: 'no labels to add or remove' })
  }

  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const r = await gmailFetch(
    creds.accessToken,
    `/messages/${encodeURIComponent(message_id)}/modify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addLabelIds: finalAdd, removeLabelIds: finalRemove }),
    }
  )
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(424).json({ error: 'gmail-modify', status: r.status, detail: text.slice(0, 300) })
  }
  const data = await r.json()
  return res.status(200).json({
    ok: true,
    id: data.id,
    labelIds: data.labelIds || [],
    applied: { add: finalAdd, remove: finalRemove },
  })
}
