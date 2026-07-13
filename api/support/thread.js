// GET /api/support/thread?wish_id=... (or ?access_code=...) — the REAL conversation
// behind one support card (corner:support-desk M27 Stage 1).
//
// Returns the actual Gmail thread — every message sent AND received — so the board
// can render the whole chain, not just the latest inbound with quoted text stripped:
//
//   { ok, thread: [ { direction: 'in'|'out', from, fromEmail, date, body } ], cached }
//
// Gmail is the source of truth for what actually went out and came back; the wish
// message blob and the updates timeline are lossy views of it. Thread routing reuses
// the hidden thread_meta update the watcher wrote {thread_id, in_reply_to,
// connection_id} — exactly like reply.js.
//
// STRICTLY READ-ONLY on the mailbox: fetches the thread, never marks read, never
// modifies. The personal inbox stays untouched (hard rule).
//
// Cache: a kind='thread_cache' update row (visible_to_client=false) holds the last
// fetched thread as JSON {fetched_at, thread_id, messages}. Fresh (< TTL) hits skip
// Gmail entirely so the 30s board poll can't burn quota; ?fresh=1 forces a refetch
// (used right after a send so the new message shows).

import { verifyTenant } from '../_lib/verifyTenant.js'
import { getGmailTokenByConnection, gmailFetch } from '../_lib/gmailClient.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Canonical inboxes (pinned 2026-06-16, same as reply.js) — fallback when a wish
// predates thread_meta capture.
const HELLO_CONNECTION = '7e85b1d3-8b10-41a8-a064-5b0c6cac1983'
const PERSONAL_CONNECTION = 'f5f939e1-0fdf-4bac-8c88-6de76df751a5'

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_BODY_CHARS = 20000

// Addresses that are OURS — a message From one of these renders on our side of the
// chain. Mirrors the watcher's own-address set (patrik gmail/icloud + aom-inhouse.com).
const OWN_ADDRESS = /(^|<)(patrikmatheson@(gmail|icloud)\.com|[^<\s]+@aom-inhouse\.com)(>|$)/i

function supa(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.method === 'POST' || opts.method === 'PATCH' ? 'return=representation' : undefined,
      ...(opts.headers || {}),
    },
  })
}

// Pull plain text out of a Gmail payload (same walk as send-staged.js preview).
function extractText(payload) {
  const out = { text: '', html: '' }
  const b64 = (s) => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  const walk = (p) => {
    if (!p) return
    if (p.mimeType === 'text/plain' && p.body?.data && !out.text) out.text = b64(p.body.data)
    if (p.mimeType === 'text/html' && p.body?.data && !out.html) out.html = b64(p.body.data)
    for (const c of p.parts || []) walk(c)
  }
  walk(payload)
  return out.text || out.html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

// Each Gmail message body carries the whole quoted history below it; the chain
// renders every message individually, so cut the quoted tail off each one.
function stripQuotedTail(body) {
  const cut = String(body || '').search(/^\s*>|^-{2,}\s*Forwarded message|^Begin forwarded message:|^On .{5,80} wrote:/m)
  const head = cut >= 0 ? String(body).slice(0, cut).trim() : String(body || '').trim()
  return (head || String(body || '').trim()).slice(0, MAX_BODY_CHARS)
}

function parseFrom(raw) {
  const m = String(raw || '').match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim() }
  return { name: String(raw || '').trim(), email: String(raw || '').trim() }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' })

  try {
    await verifyTenant('aom', req)
  } catch {
    return res.status(401).json({ ok: false, error: 'Sign in to the dashboard.' })
  }

  const { wish_id, access_code, fresh } = req.query
  if (!wish_id && !access_code) return res.status(400).json({ ok: false, error: 'wish_id or access_code required' })
  const sel = wish_id ? `id=eq.${encodeURIComponent(wish_id)}` : `access_code=eq.${encodeURIComponent(String(access_code).toUpperCase())}`
  const wr = await supa(`support_wishes?select=id,email,source,message,first_response_at&${sel}&limit=1`)
  const rows = wr.ok ? await wr.json() : []
  const wish = Array.isArray(rows) && rows.length ? rows[0] : null
  if (!wish) return res.status(404).json({ ok: false, error: 'wish not found' })

  // Thread routing from the hidden thread_meta row (reply.js pattern).
  let meta = {}
  const tr = await supa(`support_wish_updates?select=body&wish_id=eq.${wish.id}&kind=eq.thread_meta&order=created_at.desc&limit=1`)
  if (tr.ok) {
    const trows = await tr.json()
    if (Array.isArray(trows) && trows.length) { try { meta = JSON.parse(trows[0].body || '{}') } catch { meta = {} } }
  }
  let threadId = meta.thread_id || ''

  // Fallback: press-send cards (triage lane) historically carried no thread_meta row,
  // but their staged Gmail draft IS threaded onto the client's conversation — resolve
  // the thread through the draft, then persist a thread_meta row so the next hit (and
  // reply.js) routes without the extra Gmail call.
  if (!threadId) {
    const tag = String(wish.message || '').match(/\[staged_draft:([^|\]]+)\|conn:([^\]]+)\]/)
    if (tag) {
      try {
        const creds = await getGmailTokenByConnection(tag[2])
        if (creds) {
          const dr = await gmailFetch(creds.accessToken, `/drafts/${encodeURIComponent(tag[1])}?format=minimal`)
          if (dr.ok) {
            const d = await dr.json()
            threadId = d?.message?.threadId || ''
            if (threadId) {
              meta = { thread_id: threadId, in_reply_to: '', connection_id: tag[2] }
              await supa('support_wish_updates', {
                method: 'POST',
                body: JSON.stringify({
                  wish_id: wish.id, kind: 'thread_meta', author: 'system', visible_to_client: false,
                  body: JSON.stringify(meta),
                }),
              }).catch(() => {})
            }
          }
        }
      } catch { /* fall through to no-thread */ }
    }
  }

  if (!threadId) {
    // Web-form wish / forwarded mail / pre-threading capture: no Gmail thread exists.
    return res.status(200).json({ ok: true, thread: [], cached: false, reason: 'no-thread' })
  }

  // Cache lane: last fetched thread lives in a thread_cache update row.
  const cr = await supa(`support_wish_updates?select=id,body&wish_id=eq.${wish.id}&kind=eq.thread_cache&order=created_at.desc&limit=1`)
  const crows = cr.ok ? await cr.json() : []
  const cacheRow = Array.isArray(crows) && crows.length ? crows[0] : null
  if (cacheRow && fresh !== '1') {
    try {
      const cached = JSON.parse(cacheRow.body || '{}')
      const age = Date.now() - new Date(cached.fetched_at || 0).getTime()
      if (cached.thread_id === threadId && age >= 0 && age < CACHE_TTL_MS && Array.isArray(cached.messages)) {
        return res.status(200).json({ ok: true, thread: cached.messages, cached: true })
      }
    } catch { /* stale/corrupt cache falls through to a live fetch */ }
  }

  // Live Gmail fetch — read-only.
  const connectionId = meta.connection_id || (wish.source === 'email-personal' ? PERSONAL_CONNECTION : HELLO_CONNECTION)
  let creds
  try {
    creds = await getGmailTokenByConnection(connectionId)
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'gmail-auth', detail: String(e).slice(0, 200) })
  }
  const gr = await gmailFetch(creds.accessToken, `/threads/${encodeURIComponent(threadId)}?format=full`)
  if (!gr.ok) {
    const t = await gr.text().catch(() => '')
    // A dead thread id must not brick the pane — return empty with the reason.
    return res.status(200).json({ ok: true, thread: [], cached: false, reason: `gmail-${gr.status}`, detail: t.slice(0, 200) })
  }
  const data = await gr.json()
  const ownEmail = (creds.row && creds.row.config && creds.row.config.account_email) || (creds.profile && creds.profile.email) || ''

  // Unsent drafts live on the thread too — they are NOT part of the conversation
  // (the staged draft has its own surface: the composer + Send). Rendering one as
  // a sent message would be fake state on the board.
  const realMessages = (data.messages || []).filter((m) => !(m.labelIds || []).includes('DRAFT'))
  const messages = realMessages.map((m) => {
    const headers = m.payload?.headers || []
    const header = (name) => {
      const h = headers.find((x) => String(x.name || '').toLowerCase() === name)
      return h ? h.value : ''
    }
    const from = parseFrom(header('from'))
    const ours = OWN_ADDRESS.test(header('from')) || (ownEmail && from.email.toLowerCase() === ownEmail.toLowerCase())
    return {
      direction: ours ? 'out' : 'in',
      from: from.name,
      fromEmail: from.email,
      date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : header('date'),
      body: stripQuotedTail(extractText(m.payload)) || (m.snippet || '').trim(),
    }
  }).sort((a, b) => new Date(a.date) - new Date(b.date))

  // Gmail is the latency truth: replies sent outside the wish system (hooks,
  // manual Gmail replies) never write a response row, so a wish can read
  // "never replied" while its thread plainly shows our answer. Stamp
  // first_response_at from the first outbound message that follows an inbound
  // one (is.null guard — a live stamp always wins).
  if (!wish.first_response_at) {
    const firstIn = messages.find((m) => m.direction === 'in')
    const firstOut = firstIn && messages.find((m) => m.direction === 'out' && new Date(m.date) >= new Date(firstIn.date))
    if (firstOut && firstOut.date) {
      await supa(`support_wishes?id=eq.${wish.id}&first_response_at=is.null`, {
        method: 'PATCH',
        body: JSON.stringify({ first_response_at: new Date(firstOut.date).toISOString() }),
      }).catch(() => {})
    }
  }

  // Refresh the cache row (PATCH the existing one so rows don't pile up).
  const cacheBody = JSON.stringify({ fetched_at: new Date().toISOString(), thread_id: threadId, messages })
  try {
    if (cacheRow) {
      await supa(`support_wish_updates?id=eq.${cacheRow.id}`, { method: 'PATCH', body: JSON.stringify({ body: cacheBody, created_at: new Date().toISOString() }) })
    } else {
      await supa('support_wish_updates', {
        method: 'POST',
        body: JSON.stringify({ wish_id: wish.id, kind: 'thread_cache', body: cacheBody, author: 'system', visible_to_client: false }),
      })
    }
  } catch { /* cache write is best-effort; the thread still returns */ }

  return res.status(200).json({ ok: true, thread: messages, cached: false })
}
