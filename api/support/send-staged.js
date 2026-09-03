// POST /api/support/send-staged - the M13 press-send button (corner:support-desk).
//
// The press-send model (Patrik 2026-06-09): the agent gets the job fully DONE and
// stages the reply as a Gmail draft; the support card on the dashboard carries the
// staged work and the human's ONLY step is pressing Send (or asking for a change).
// This endpoint is the Send button's wire: it fires an existing Gmail draft as-is
// and closes the wish out on the board.
//
// Body:
//   { action: 'send',   wish_id, draft_id, connection_id }   -> sends the staged draft,
//       logs a visible update on the wish, flips status -> resolved.
//   { action: 'change', wish_id, note }                      -> logs the requested change
//       on the wish (kind=change_request) and flips status -> working so the agent
//       picks it up, revises, and re-stages.
//
// Auth: verified support-tenant dashboard session ONLY. Sending client email is
// the irreversible step; it stays behind the human's own login. No password fallback.
//
// corner:retire-supabase (2026-09-03): wish status and timeline writes go through
// Convex (support:update / addUpdate via wishes.js); first_response_at and
// auto_send_at live in the wish meta store.

import { getGmailTokenByConnection, gmailFetch } from '../_lib/gmailClient.js'
import { requiredTenantFromEnv, resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js'
import { addWishUpdate, setWishStatus, stampFirstResponse, patchWishMeta } from './wishes.js'

async function logUpdate(wishId, kind, body, status) {
  await addWishUpdate(wishId, { kind, body, status: status || null, author: 'patrik', visible: false }).catch(() => {})
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' })

  try {
    await resolveTenantContext(req, {
      fallback: requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']),
    })
  } catch (error) {
    return sendTenantContextError(res, error, 401, 'Sign in to the dashboard to send.')
  }

  let body
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid JSON' })
  }
  const { action, wish_id, draft_id, connection_id, note, text } = body

  // preview: what EXACTLY goes out, full reply text + attachments. The card
  // renders this so the human reads the actual outgoing email, not a summary
  // of it, before pressing Send.
  if (action === 'preview') {
    if (!draft_id || !connection_id) {
      return res.status(400).json({ ok: false, error: 'draft_id and connection_id required' })
    }
    let creds
    try {
      creds = await getGmailTokenByConnection(connection_id)
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'gmail-auth', detail: String(e).slice(0, 200) })
    }
    if (!creds) return res.status(502).json({ ok: false, error: 'gmail-auth', detail: 'not connected' })
    const getResp = await gmailFetch(creds.accessToken, `/drafts/${encodeURIComponent(draft_id)}?format=full`)
    if (!getResp.ok) {
      const t = await getResp.text().catch(() => '')
      return res.status(getResp.status === 404 ? 404 : 502).json({
        ok: false, error: 'gmail-drafts-get', status: getResp.status, detail: t.slice(0, 300),
      })
    }
    const draft = await getResp.json()
    const payload = draft?.message?.payload || {}
    const header = (name) => {
      const h = (payload.headers || []).find((x) => String(x.name || '').toLowerCase() === name)
      return h ? h.value : ''
    }
    const out = { text: '', html: '', attachments: [] }
    const b64 = (s) => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const walk = (p) => {
      if (!p) return
      if (p.filename) out.attachments.push({ name: p.filename, size: p.body?.size || 0 })
      if (p.mimeType === 'text/plain' && p.body?.data && !out.text) out.text = b64(p.body.data)
      if (p.mimeType === 'text/html' && p.body?.data && !out.html) out.html = b64(p.body.data)
      for (const c of p.parts || []) walk(c)
    }
    walk(payload)
    const previewText = out.text || out.html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
    return res.status(200).json({
      ok: true, to: header('to'), subject: header('subject'), text: previewText, attachments: out.attachments,
    })
  }

  if (!wish_id) return res.status(400).json({ ok: false, error: 'wish_id required' })

  // resolve: the human finished this outside the system, close the card.
  if (action === 'resolve') {
    await logUpdate(wish_id, 'status_change', 'Marked resolved from the dashboard.', 'resolved')
    await setWishStatus(wish_id, 'resolved').catch(() => {})
    return res.status(200).json({ ok: true, resolved: true })
  }

  if (action === 'change') {
    if (!note || !note.trim()) return res.status(400).json({ ok: false, error: 'note required' })
    await logUpdate(wish_id, 'change_request', note.trim())
    await logUpdate(wish_id, 'status_change', 'Change requested. Agent revising and re-staging.', 'working')
    await setWishStatus(wish_id, 'working').catch(() => {})
    return res.status(200).json({ ok: true, changed: true })
  }

  if (action === 'send') {
    if (!draft_id || !connection_id) {
      return res.status(400).json({ ok: false, error: 'draft_id and connection_id required' })
    }
    let creds
    try {
      creds = await getGmailTokenByConnection(connection_id)
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'gmail-auth', detail: String(e).slice(0, 200) })
    }
    if (!creds) return res.status(502).json({ ok: false, error: 'gmail-auth', detail: 'not connected' })
    const sendResp = await gmailFetch(creds.accessToken, '/drafts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draft_id }),
    })
    if (!sendResp.ok) {
      const t = await sendResp.text().catch(() => '')
      return res.status(sendResp.status === 404 ? 404 : 502).json({
        ok: false, error: 'gmail-drafts-send', status: sendResp.status, detail: t.slice(0, 300),
      })
    }
    const sent = await sendResp.json()
    await logUpdate(wish_id, 'response', 'Staged reply sent (press-send from the support dashboard).', undefined)
    await logUpdate(wish_id, 'status_change', 'Sent. Resolved from the dashboard.', 'resolved')
    await stampFirstResponse(wish_id).catch(() => {})
    await setWishStatus(wish_id, 'resolved').catch(() => {})
    return res.status(200).json({ ok: true, sent: true, id: sent.id, threadId: sent.threadId })
  }

  // reply: send a custom reply text (from composer or suggested option).
  // A custom reply MUST thread onto the staged draft so the client gets a proper
  // threaded reply with the real subject + recipient. We reuse the draft's real
  // thread/subject/To/reply-headers and only swap in the custom body.
  if (action === 'reply') {
    if (!text || !text.trim()) {
      return res.status(400).json({ ok: false, error: 'text required for reply action' })
    }
    if (!draft_id || !connection_id) {
      return res.status(400).json({ ok: false, error: 'draft_id and connection_id required (reply reuses the staged draft thread)' })
    }
    let creds
    try {
      creds = await getGmailTokenByConnection(connection_id)
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'gmail-auth', detail: String(e).slice(0, 200) })
    }
    if (!creds) return res.status(502).json({ ok: false, error: 'gmail-auth', detail: 'not connected' })
    const getResp = await gmailFetch(creds.accessToken, `/drafts/${encodeURIComponent(draft_id)}?format=full`)
    if (!getResp.ok) {
      const t = await getResp.text().catch(() => '')
      return res.status(getResp.status === 404 ? 404 : 502).json({ ok: false, error: 'gmail-drafts-get', status: getResp.status, detail: t.slice(0, 300) })
    }
    const draft = await getResp.json()
    const dmsg = draft?.message || {}
    const dpayload = dmsg.payload || {}
    const dHeader = (name) => {
      const h = (dpayload.headers || []).find((x) => String(x.name || '').toLowerCase() === name)
      return h ? h.value : ''
    }
    const toAddr = dHeader('to')
    const subject = dHeader('subject') || 'Re:'
    const inReplyTo = dHeader('in-reply-to')
    const references = dHeader('references')
    const threadId = dmsg.threadId || undefined
    const fromEmail = (creds.row && creds.row.config && creds.row.config.account_email) || (creds.email) || (creds.profile && (creds.profile.email || creds.profile.emailAddress)) || dHeader('from')
    if (!toAddr || !fromEmail) {
      return res.status(502).json({ ok: false, error: 'reply-metadata', detail: 'staged draft missing to/from header' })
    }

    const encB64Url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const boundary = `=_corner_${String(wish_id).replace(/[^a-z0-9]/gi, '')}`
    const h = [`From: ${fromEmail}`, `To: ${toAddr}`, `Subject: ${subject}`, 'MIME-Version: 1.0']
    if (inReplyTo) h.push(`In-Reply-To: ${inReplyTo}`)
    if (references) h.push(`References: ${references}`)
    h.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    const raw = [
      h.join('\r\n'), '',
      `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', text.trim(), '',
      `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', '', `<p>${escHtml(text.trim()).replace(/\n/g, '</p><p>')}</p>`, '',
      `--${boundary}--`,
    ].join('\r\n')

    const sendResp = await gmailFetch(creds.accessToken, '/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encB64Url(raw), threadId }),
    })
    if (!sendResp.ok) {
      const sendText = await sendResp.text().catch(() => '')
      return res.status(sendResp.status === 404 ? 404 : 502).json({ ok: false, error: 'gmail-send', status: sendResp.status, detail: sendText.slice(0, 300) })
    }
    const sent = await sendResp.json()
    await logUpdate(wish_id, 'response', 'Custom reply sent from the dashboard.', undefined)
    await logUpdate(wish_id, 'status_change', 'Custom reply sent. Resolved from the dashboard.', 'resolved')
    await stampFirstResponse(wish_id).catch(() => {})
    await setWishStatus(wish_id, 'resolved').catch(() => {})
    return res.status(200).json({ ok: true, sent: true, id: sent.id, threadId: sent.threadId })
  }

  // clear_schedule: pause auto-send by clearing auto_send_at.
  if (action === 'clear_schedule') {
    await logUpdate(wish_id, 'status_change', 'Auto-send paused from the dashboard.', undefined)
    await patchWishMeta(wish_id, { auto_send_at: null }).catch(() => {})
    return res.status(200).json({ ok: true, cleared: true })
  }

  return res.status(400).json({ ok: false, error: `unknown action "${action}"` })
}
