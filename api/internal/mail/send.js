// POST /api/internal/mail/send
//
// Internal-auth endpoint for terminal agents (Elon, Studio tmux sessions).
// No user JWT required. Authentication via X-Internal-Key header matched
// against CORNER_INTERNAL_KEY. corner:retire-supabase (2026-09-03): the shared
// secret used to be the Supabase service role key; it is now its own value,
// set in the Vercel project env and in the AOM-EA local .env.
//
// This endpoint exists because the terminal EA has no user JWT — it runs in
// a tmux Claude Code session without access to Patrik's browser session.
// The dashboard /api/dashboard/mail/send requires a user JWT, which the
// terminal can't provide. This internal path skips user auth and goes
// straight to the connection-scoped token via getGmailTokenByConnection.
//
// Auth: X-Internal-Key header must equal CORNER_INTERNAL_KEY.
//
// Body: {
//   connection_id?,     // account_integrations.id (or account_email as alternative)
//   account_email?,     // alternative to connection_id — resolves the row by email
//   to,                 // [{name?, email}, ...] or "Name <email@example.com>" strings
//   cc?, bcc?,
//   subject,
//   bodyHtml,           // HTML body (server appends signature)
//   bodyText?,          // optional plaintext (auto-derived from HTML if omitted)
//   threadId?,          // Gmail thread-id for replies
//   inReplyTo?,         // In-Reply-To header value
//   references?,        // References header value
//   includeSignature?   // default true
// }
//
// Response: { ok: true, id, threadId } on success.

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../../_lib/gmailClient.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

// ─── RFC 822 helpers (mirrored from api/dashboard/mail/send.js) ─────────────

function encB64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fmtAddress(a) {
  if (typeof a === 'string') return a
  if (!a || !a.email) return ''
  if (a.name) {
    const escaped = a.name.replace(/"/g, '\\"')
    return `"${escaped}" <${a.email}>`
  }
  return a.email
}

function fmtAddressList(list) {
  if (typeof list === 'string') return list
  if (!Array.isArray(list)) return ''
  return list.map(fmtAddress).filter(Boolean).join(', ')
}

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

async function fetchSignature(accessToken) {
  const r = await gmailFetch(accessToken, '/settings/sendAs')
  if (!r.ok) return { signatureHtml: '', sendAsEmail: null, displayName: null }
  const body = await r.json()
  const entries = body.sendAs || []
  const def = entries.find(e => e.isDefault) || entries.find(e => e.isPrimary) || entries[0]
  if (!def) return { signatureHtml: '', sendAsEmail: null, displayName: null }
  return {
    signatureHtml: def.signature || '',
    sendAsEmail: def.sendAsEmail || null,
    displayName: def.displayName || null,
  }
}

// Attachment input: { filename, mime_type, data_base64 } (base64 already encoded).
// When attachments[] present, wraps the multipart/alternative body inside a
// multipart/mixed envelope so Gmail treats each attachment as a real file.
function buildRfc822({ from, to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, references, attachments }) {
  const altBoundary = `=_corner_alt_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
  const mixedBoundary = `=_corner_mix_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0

  const headers = []
  headers.push(`From: ${from}`)
  if (to) headers.push(`To: ${to}`)
  if (cc) headers.push(`Cc: ${cc}`)
  if (bcc) headers.push(`Bcc: ${bcc}`)
  // RFC 2047: non-ASCII subjects (em-dashes, ×, accents) must be encoded-word wrapped,
  // or clients render mojibake ("â€”" for "—"). ASCII subjects pass through untouched.
  const subjectHeader = /^[\x20-\x7E]*$/.test(subject)
    ? subject
    : `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`
  headers.push(`Subject: ${subjectHeader}`)
  headers.push('MIME-Version: 1.0')
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
  if (references) headers.push(`References: ${references}`)
  headers.push(
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
      : `Content-Type: multipart/alternative; boundary="${altBoundary}"`
  )
  const lines = [headers.join('\r\n'), '']

  if (hasAttachments) {
    lines.push(`--${mixedBoundary}`)
    lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`)
    lines.push('')
  }
  lines.push(`--${altBoundary}`)
  lines.push('Content-Type: text/plain; charset="UTF-8"')
  lines.push('Content-Transfer-Encoding: 7bit')
  lines.push('')
  lines.push(bodyText)
  lines.push('')
  lines.push(`--${altBoundary}`)
  lines.push('Content-Type: text/html; charset="UTF-8"')
  lines.push('Content-Transfer-Encoding: 7bit')
  lines.push('')
  lines.push(bodyHtml)
  lines.push('')
  lines.push(`--${altBoundary}--`)

  if (hasAttachments) {
    for (const att of attachments) {
      const name = String(att.filename || 'attachment.bin').replace(/"/g, '')
      const mime = String(att.mime_type || 'application/octet-stream')
      const b64 = String(att.data_base64 || '')
      const wrapped = b64.replace(/\s+/g, '').match(/.{1,76}/g)?.join('\r\n') || ''
      lines.push('')
      lines.push(`--${mixedBoundary}`)
      lines.push(`Content-Type: ${mime}; name="${name}"`)
      lines.push('Content-Transfer-Encoding: base64')
      lines.push(`Content-Disposition: attachment; filename="${name}"`)
      lines.push('')
      lines.push(wrapped)
    }
    lines.push('')
    lines.push(`--${mixedBoundary}--`)
  }
  return lines.join('\r\n')
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Internal-Key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // Internal auth: X-Internal-Key must match CORNER_INTERNAL_KEY.
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

  const {
    connection_id,
    account_email,
    to,
    cc,
    bcc,
    subject,
    bodyHtml,
    bodyText,
    threadId,
    inReplyTo,
    references,
    includeSignature,
    attachments,      // optional: [{filename, mime_type, data_base64}, ...]
    draft,            // optional: true -> save to Gmail Drafts instead of sending
  } = payload

  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })
  if (!to || !subject || !bodyHtml) return res.status(400).json({ error: 'to, subject, bodyHtml required' })

  // Load Gmail tokens directly via connection id (no user JWT needed).
  // Wrap in try/catch so a token failure (e.g. invalid_grant — reconnect needed)
  // returns a clean 424 with the real reason instead of crashing the function
  // (FUNCTION_INVOCATION_FAILED). Mirrors list.js / draft.js.
  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  const sig = await fetchSignature(creds.accessToken)
  const fromHeader = sig.sendAsEmail
    ? fmtAddress({ name: sig.displayName || '', email: sig.sendAsEmail })
    : (creds.profile?.email ? fmtAddress({ email: creds.profile.email }) : '')
  if (!fromHeader) return res.status(424).json({ error: 'no-send-as-address' })

  let finalBodyHtml = String(bodyHtml)
  if (includeSignature !== false && sig.signatureHtml) {
    finalBodyHtml = `${finalBodyHtml}<br><br>${sig.signatureHtml}`
  }
  const finalBodyText = (bodyText && String(bodyText)) || htmlToText(finalBodyHtml)

  const raw = buildRfc822({
    from: fromHeader,
    to: fmtAddressList(to),
    cc: cc ? fmtAddressList(cc) : '',
    bcc: bcc ? fmtAddressList(bcc) : '',
    subject: String(subject),
    bodyHtml: finalBodyHtml,
    bodyText: finalBodyText,
    inReplyTo: inReplyTo || '',
    references: references || '',
    attachments: Array.isArray(attachments) ? attachments : [],
  })

  // Draft mode: save to Gmail Drafts instead of sending. Same RFC 822 body
  // shape; Gmail's drafts.create wraps it in { message: { raw, threadId } }.
  // Lets the EA park a draft for the user to review before they hit send.
  if (draft) {
    const draftResp = await gmailFetch(creds.accessToken, '/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          raw: encB64Url(raw),
          threadId: threadId || undefined,
        },
      }),
    })
    if (!draftResp.ok) {
      const text = await draftResp.text().catch(() => '')
      return res.status(424).json({ error: 'gmail-draft', status: draftResp.status, detail: text.slice(0, 300) })
    }
    const draftRow = await draftResp.json()
    return res.status(200).json({
      ok: true,
      draft: true,
      id: draftRow.id,
      messageId: draftRow.message?.id,
      threadId: draftRow.message?.threadId,
    })
  }

  const sendResp = await gmailFetch(creds.accessToken, '/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw: encB64Url(raw),
      threadId: threadId || undefined,
    }),
  })

  if (!sendResp.ok) {
    const text = await sendResp.text().catch(() => '')
    return res.status(424).json({ error: 'gmail-send', status: sendResp.status, detail: text.slice(0, 300) })
  }

  const sent = await sendResp.json()
  return res.status(200).json({ ok: true, id: sent.id, threadId: sent.threadId })
}
