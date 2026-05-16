// GET /api/dashboard/mail/signature
// Returns the user's primary Gmail send-as signature so the EA can append it
// when sending. Response: { signatureHtml, signatureText, sendAsEmail, displayName }

import { getUserIdFromRequest, getGmailToken, gmailFetch } from '../../_lib/gmailClient.js'

function htmlToText(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
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

  const r = await gmailFetch(creds.accessToken, '/settings/sendAs')
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-sendas', status: r.status, detail: text.slice(0, 200) })
  }
  const body = await r.json()
  const entries = body.sendAs || []
  // Prefer the explicit default; fall back to the primary address.
  const def = entries.find(e => e.isDefault) || entries.find(e => e.isPrimary) || entries[0]
  if (!def) {
    return res.status(200).json({ signatureHtml: '', signatureText: '', sendAsEmail: null, displayName: null })
  }
  const signatureHtml = def.signature || ''
  return res.status(200).json({
    signatureHtml,
    signatureText: htmlToText(signatureHtml),
    sendAsEmail: def.sendAsEmail || null,
    displayName: def.displayName || null,
  })
}
