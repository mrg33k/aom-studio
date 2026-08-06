// POST /api/dashboard/mail/send
//
// Body: {
//   connection_id?,   // if present, use this specific connection
//   threadId?,        // Gmail: ties to thread; Outlook: conversationId (not used for send)
//   to,               // [{name?, email}, ...]
//   cc?, bcc?,
//   subject,
//   bodyHtml,
//   bodyText?,
//   inReplyTo?,       // Message-Id header to reply to (Gmail + Outlook)
//   references?,      // References header (Gmail)
//   includeSignature? // default true (Gmail only; Outlook has no signature API)
// }
//
// Response: { ok: true, id, threadId, provider } on success.
//
// Supports Gmail (via Gmail API) and Outlook (via Graph sendMail).

import { getUserIdFromRequest, getGmailToken, getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'
import { getOutlookTokenByConnection, graphFetch } from '../../_lib/outlookClient.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'

// ── Shared helpers ────────────────────────────────────────

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

function toGraphRecipient(a) {
  if (typeof a === 'string') return { emailAddress: { address: a, name: '' } }
  return { emailAddress: { address: a.email || '', name: a.name || '' } }
}

// ── Gmail send (original) ─────────────────────────────────

function encB64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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

function buildRfc822({ from, to, cc, bcc, subject, bodyHtml, bodyText, inReplyTo, references }) {
  const boundary = `=_corner_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
  const headers = []
  headers.push(`From: ${from}`)
  if (to) headers.push(`To: ${to}`)
  if (cc) headers.push(`Cc: ${cc}`)
  if (bcc) headers.push(`Bcc: ${bcc}`)
  headers.push(`Subject: ${subject}`)
  headers.push('MIME-Version: 1.0')
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
  if (references) headers.push(`References: ${references}`)
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
  const lines = [headers.join('\r\n'), '']
  lines.push(`--${boundary}`)
  lines.push('Content-Type: text/plain; charset="UTF-8"')
  lines.push('Content-Transfer-Encoding: 7bit')
  lines.push('')
  lines.push(bodyText)
  lines.push('')
  lines.push(`--${boundary}`)
  lines.push('Content-Type: text/html; charset="UTF-8"')
  lines.push('Content-Transfer-Encoding: 7bit')
  lines.push('')
  lines.push(bodyHtml)
  lines.push('')
  lines.push(`--${boundary}--`)
  return lines.join('\r\n')
}

// ── Outlook send via Graph ────────────────────────────────
// POST /me/sendMail — the message body is sent in one API call.
// Outlook doesn't expose a sendAs signature API via Graph, so the
// caller's HTML body is sent as-is (no signature appended).
async function sendOutlookMail(accessToken, payload, senderEmail) {
  const bodyHtml = String(payload.bodyHtml)
  const message = {
    subject: payload.subject,
    body: { contentType: 'HTML', content: bodyHtml },
    toRecipients: Array.isArray(payload.to) ? payload.to.map(toGraphRecipient) : [],
    ccRecipients: Array.isArray(payload.cc) ? payload.cc.map(toGraphRecipient) : [],
    bccRecipients: Array.isArray(payload.bcc) ? payload.bcc.map(toGraphRecipient) : [],
  }

  // Reply-to threading: if inReplyTo is set, set replyTo header so Graph
  // surfaces the conversation link. Graph doesn't expose In-Reply-To natively
  // but uses conversationId for threading (derived automatically when we reply
  // via /me/messages/{replyToId}/reply). For a raw sendMail, we just set the
  // header and let Graph create a new thread or link via conversationId.
  if (senderEmail) {
    message.from = { emailAddress: { address: senderEmail } }
  }

  const r = await graphFetch(accessToken, '/sendMail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return { error: `graph-send ${r.status}: ${text.slice(0, 300)}`, status: r.status }
  }
  // Graph sendMail returns 202 Accepted with no body on success.
  return { ok: true, provider: 'outlook' }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let payload
  try {
    payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ error: 'invalid-json' })
  }
  if (!payload.to || !payload.subject || !payload.bodyHtml) {
    return res.status(400).json({ error: 'to, subject, bodyHtml required' })
  }

  const userId = await getUserIdFromRequest(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const connectionId = (payload?.connection_id || '').toString() || null
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
      // Use account_email from the connection row as the sender identity
      const senderEmail = creds.row?.config?.account_email
        || creds.profile?.emailAddress
        || null
      const result = await sendOutlookMail(creds.accessToken, payload, senderEmail)
      if (result.error) return res.status(502).json({ error: result.error })
      return res.status(200).json(result)
    }

    // Gmail path
    creds = await getGmailTokenByConnection(connectionId)
  } else {
    creds = await getGmailToken(userId)
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  // ── Gmail path (original) ─────────────────────────────────
  const sig = await fetchSignature(creds.accessToken)
  const fromHeader = sig.sendAsEmail
    ? fmtAddress({ name: sig.displayName || '', email: sig.sendAsEmail })
    : (creds.profile?.email ? fmtAddress({ email: creds.profile.email }) : '')
  if (!fromHeader) return res.status(502).json({ error: 'no-send-as-address' })

  let bodyHtml = String(payload.bodyHtml)
  if (payload.includeSignature !== false && sig.signatureHtml) {
    bodyHtml = `${bodyHtml}<br><br>${sig.signatureHtml}`
  }
  const bodyText = (payload.bodyText && String(payload.bodyText))
    || htmlToText(bodyHtml)

  const raw = buildRfc822({
    from: fromHeader,
    to: fmtAddressList(payload.to),
    cc: payload.cc ? fmtAddressList(payload.cc) : '',
    bcc: payload.bcc ? fmtAddressList(payload.bcc) : '',
    subject: payload.subject,
    bodyHtml,
    bodyText,
    inReplyTo: payload.inReplyTo || '',
    references: payload.references || '',
  })

  const sendResp = await gmailFetch(creds.accessToken, '/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      raw: encB64Url(raw),
      threadId: payload.threadId || undefined,
    }),
  })
  if (!sendResp.ok) {
    const text = await sendResp.text().catch(() => '')
    return res.status(502).json({ error: 'gmail-send', status: sendResp.status, detail: text.slice(0, 300) })
  }
  const sent = await sendResp.json()
  return res.status(200).json({ ok: true, id: sent.id, threadId: sent.threadId, provider: 'gmail' })
}
