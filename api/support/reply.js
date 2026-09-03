// POST /api/support/reply - a human replies to a support thread, IN-THREAD, from the inbox the
// mail arrived in (corner:support-desk, 2026-06-16).
//
// Why this exists: the board could not let Patrik reply to a chain, and the old resolve path
// (PATCH /api/support/wishes with `response`) sends server-side from hello@ UN-threaded. This sends
// the reply on the SAME Gmail thread, from the SAME mailbox the email arrived in, so the client sees a
// normal reply in their own conversation. It mirrors the agent-side in-thread send.
//
// Body: { wish_id? , access_code?, text }   (one of wish_id/access_code required)
// Auth: verified support-tenant dashboard session. Sending client email is irreversible, so it
// stays behind the human's own login, exactly like send-staged.js.
//
// Thread routing: reads the hidden `thread_meta` update the watcher wrote {thread_id, in_reply_to,
// connection_id}. Falls back to the canonical mailbox for the wish's source if no meta exists.
// Response: { ok: true, threadId }.
//
// corner:retire-supabase (2026-09-03): the wish and its timeline come from Convex
// (support:get / addUpdate / update via wishes.js); the internal mail sender is
// unlocked with CORNER_INTERNAL_KEY instead of the Supabase service key.

import { requiredTenantFromEnv, resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js'
import { loadWish, addWishUpdate, setWishStatus, stampFirstResponse } from './wishes.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY || ''

// Canonical inboxes (pinned 2026-06-16). Fallback when a wish predates thread_meta capture.
const HELLO_CONNECTION = '7e85b1d3-8b10-41a8-a064-5b0c6cac1983'      // hello@aom-inhouse.com (support)
const PERSONAL_CONNECTION = 'f5f939e1-0fdf-4bac-8c88-6de76df751a5'   // patrikmatheson@gmail.com (personal)

// Hard rule: never an em dash in client-facing text.
function stripDashes(s) {
  return (s || '').replace(/ — /g, ' - ').replace(/—/g, '-').replace(/–/g, '-')
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function replySubject(message) {
  const line1 = (message || '').split('\n')[0].trim()
  let core = line1
  for (const pre of ['fwd:', 'fw:', 're:']) {
    while (core.toLowerCase().startsWith(pre)) core = core.slice(pre.length).trim()
  }
  return core ? `Re: ${core}` : 'Re: your message'
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
    return sendTenantContextError(res, error, 401, 'Sign in to the dashboard to reply.')
  }

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}) }
  catch { return res.status(400).json({ ok: false, error: 'invalid JSON' }) }

  const { wish_id, access_code } = body
  const text = (body.text || '').trim()
  if (!text) return res.status(400).json({ ok: false, error: 'text required' })
  if (!wish_id && !access_code) return res.status(400).json({ ok: false, error: 'wish_id or access_code required' })

  // Load the wish.
  const found = await loadWish(wish_id ? { id: wish_id, includeHidden: true } : { accessCode: access_code, includeHidden: true })
  if (!found) return res.status(404).json({ ok: false, error: 'wish not found' })
  const { wish, updates } = found
  if (!wish.email) return res.status(400).json({ ok: false, error: 'wish has no client email' })

  // Thread routing: the hidden thread_meta row the watcher wrote (newest wins).
  let meta = {}
  const metaRows = updates.filter((u) => u.kind === 'thread_meta')
  if (metaRows.length) { try { meta = JSON.parse(metaRows[metaRows.length - 1].body || '{}') } catch { meta = {} } }
  const connectionId = meta.connection_id || (wish.source === 'email-personal' ? PERSONAL_CONNECTION : HELLO_CONNECTION)
  const threadId = meta.thread_id || ''
  const inReplyTo = meta.in_reply_to || ''

  const reply = stripDashes(text)
  const subject = replySubject(wish.message)
  const bodyHtml = `<p>${escapeHtml(reply).replace(/\n/g, '<br>')}</p>`

  if (!INTERNAL_KEY) return res.status(500).json({ ok: false, error: 'CORNER_INTERNAL_KEY is not set on this deployment' })

  // Send via the internal mail sender (handles tokens, signature, threading) on the SAME deployment.
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  let sendData
  try {
    const sendResp = await fetch(`${proto}://${host}/api/internal/mail/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
      body: JSON.stringify({
        connection_id: connectionId,
        to: [{ name: wish.name || undefined, email: wish.email }],
        subject,
        bodyHtml,
        threadId: threadId || undefined,
        inReplyTo: inReplyTo || undefined,
        references: inReplyTo || undefined,
      }),
    })
    sendData = await sendResp.json().catch(() => ({}))
    if (!sendResp.ok || !sendData.ok) {
      return res.status(502).json({ ok: false, error: 'send-failed', detail: JSON.stringify(sendData).slice(0, 300) })
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'send-error', detail: String(e).slice(0, 200) })
  }

  // Record the reply on the card (visible), stamp the latency clock once, move the wish to working.
  await addWishUpdate(wish.id, { kind: 'response', body: reply, author: 'patrik', visible: true }).catch(() => {})
  await stampFirstResponse(wish.id).catch(() => {})
  await setWishStatus(wish.id, 'working').catch(() => {})

  return res.status(200).json({ ok: true, threadId: sendData.threadId || threadId })
}
