// POST /api/internal/mail/draft
//
// Internal-auth endpoint for terminal agents (Elon, Studio, tenant EAs).
// Manages Gmail DRAFTS — list, get, delete, send. No user JWT required;
// auth via X-Internal-Key matched against CORNER_INTERNAL_KEY
// (corner:retire-supabase, 2026-09-03: was the Supabase service role key).
//
// Why a separate endpoint from /modify: drafts are UNSENT, agent/user-composed
// content, not received mail. The "archive only, never delete" hard rule
// (Patrik 2026-05-26) guards the INBOX — it was never meant to block deleting
// a draft you just wrote. Deleting/sending a draft is a normal, expected
// assistant operation, so it lives here, away from the inbox-safety gate.
//
// Creating a draft still happens via /api/internal/mail/send with draft:true.
// This endpoint covers the rest of a draft's lifecycle.
//
// Body: { connection_id?, account_email?, action, draft_id?, max? }
//   (connection_id or account_email required — account_email resolves the row at runtime)
//   action = list   -> { ok, drafts: [{id, messageId, threadId, subject, to, snippet}], count }
//   action = get    -> { ok, draft: {...full draft...} }      (requires draft_id)
//   action = delete -> { ok, deleted: true, draft_id }        (requires draft_id)
//   action = send   -> { ok, sent: true, id, threadId }       (requires draft_id)
//
// Scope: works under gmail.modify (the scope the connection already holds).

import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../../_lib/gmailClient.js'

const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY

const ALLOWED_ACTIONS = new Set(['list', 'get', 'delete', 'send'])

function headerValue(headers, name) {
  if (!Array.isArray(headers)) return ''
  const h = headers.find(x => String(x.name || '').toLowerCase() === name.toLowerCase())
  return h ? (h.value || '') : ''
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

  const { connection_id, account_email, draft_id } = payload
  const action = String(payload.action || '').toLowerCase().trim()

  let resolvedId = connection_id
  if (!resolvedId && account_email) {
    resolvedId = await resolveConnectionIdByEmail(account_email)
    if (!resolvedId) return res.status(400).json({ error: 'no gmail connection found for account_email' })
  }
  if (!resolvedId) return res.status(400).json({ error: 'connection_id or account_email required' })
  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({
      error: 'unknown-action',
      detail: `action="${action || '(none)'}" not supported. Allowed: ${[...ALLOWED_ACTIONS].join(', ')}.`,
    })
  }
  if ((action === 'get' || action === 'delete' || action === 'send') && !draft_id) {
    return res.status(400).json({ error: 'draft_id required', detail: `action="${action}" needs draft_id` })
  }

  let creds
  try {
    creds = await getGmailTokenByConnection(resolvedId)
  } catch (e) {
    return res.status(424).json({ error: 'gmail-auth', detail: e.message })
  }
  if (!creds) return res.status(401).json({ error: 'integration:not-connected' })

  // ── list ───────────────────────────────────────────────────────────────────
  if (action === 'list') {
    const max = Math.min(Math.max(parseInt(payload.max, 10) || 25, 1), 100)
    const listResp = await gmailFetch(creds.accessToken, `/drafts?maxResults=${max}`)
    if (!listResp.ok) {
      const text = await listResp.text().catch(() => '')
      return res.status(424).json({ error: 'gmail-drafts-list', status: listResp.status, detail: text.slice(0, 300) })
    }
    const body = await listResp.json()
    const rawDrafts = Array.isArray(body.drafts) ? body.drafts : []

    // Enrich each draft with subject / to / snippet so the agent (and user)
    // can tell drafts apart before deleting or sending one.
    const drafts = await Promise.all(rawDrafts.map(async d => {
      const base = {
        id: d.id,
        messageId: d.message?.id || null,
        threadId: d.message?.threadId || null,
        subject: '(no subject)',
        to: '',
        snippet: '',
      }
      try {
        const metaResp = await gmailFetch(
          creds.accessToken,
          `/drafts/${encodeURIComponent(d.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=To`
        )
        if (metaResp.ok) {
          const meta = await metaResp.json()
          const headers = meta.message?.payload?.headers || []
          base.subject = headerValue(headers, 'Subject') || '(no subject)'
          base.to = headerValue(headers, 'To')
          base.snippet = meta.message?.snippet || ''
        }
      } catch { /* leave defaults — listing is best-effort per draft */ }
      return base
    }))

    return res.status(200).json({ ok: true, drafts, count: drafts.length })
  }

  // ── get ──────────────────────────────────────────────────────────────────────
  if (action === 'get') {
    const getResp = await gmailFetch(
      creds.accessToken,
      `/drafts/${encodeURIComponent(draft_id)}?format=full`
    )
    if (!getResp.ok) {
      const text = await getResp.text().catch(() => '')
      return res.status(getResp.status === 404 ? 404 : 502).json({
        error: 'gmail-drafts-get', status: getResp.status, detail: text.slice(0, 300),
      })
    }
    const draft = await getResp.json()
    return res.status(200).json({ ok: true, draft })
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  // DELETE /drafts/{id} discards the unsent draft. Reversible only in the sense
  // that the user can recompose — Gmail does not keep deleted drafts. This is a
  // draft, never a received message, so the inbox-safety gate does not apply.
  if (action === 'delete') {
    const delResp = await gmailFetch(
      creds.accessToken,
      `/drafts/${encodeURIComponent(draft_id)}`,
      { method: 'DELETE' }
    )
    // Gmail returns 204 No Content on success.
    if (!delResp.ok) {
      const text = await delResp.text().catch(() => '')
      return res.status(delResp.status === 404 ? 404 : 502).json({
        error: 'gmail-drafts-delete', status: delResp.status, detail: text.slice(0, 300),
      })
    }
    return res.status(200).json({ ok: true, deleted: true, draft_id })
  }

  // ── send ───────────────────────────────────────────────────────────────────
  // POST /drafts/send sends an existing draft as-is. Use when the user reviewed
  // a parked draft and said "send it" without edits.
  if (action === 'send') {
    const sendResp = await gmailFetch(creds.accessToken, '/drafts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draft_id }),
    })
    if (!sendResp.ok) {
      const text = await sendResp.text().catch(() => '')
      return res.status(sendResp.status === 404 ? 404 : 502).json({
        error: 'gmail-drafts-send', status: sendResp.status, detail: text.slice(0, 300),
      })
    }
    const sent = await sendResp.json()
    return res.status(200).json({ ok: true, sent: true, id: sent.id, threadId: sent.threadId })
  }

  return res.status(400).json({ error: 'unreachable' })
}
