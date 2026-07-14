// GET /api/support/thread — the REAL conversation behind one support card
// (corner:support-desk M27, accuracy round M27b).
//
// Two lanes, same normalized output:
//   ?wish_id=... | ?access_code=...   — wish cards (thread via thread_meta / staged draft)
//   ?thread_id=...&account=...        — mailbox-scan rows (they carry a Gmail threadId
//                                       + the mailbox email; no wish exists)
//
//   { ok, thread: [ { direction: 'in'|'out', from, fromEmail, date, body,
//                     draft?: true, recorded?: true } ], cached }
//
// Truth rules (M27b — "my replies are not appearing"):
//   - Unsent drafts APPEAR in the chain, explicitly marked draft:true. Hiding them made
//     never-sent replies look like missing replies; faking them as SENT was worse.
//     Drafts never stamp first_response_at and never count as replies.
//   - Board-recorded replies (kind='response' updates) that match no Gmail message in
//     the fetched thread (old API-resolve sends, fresh-thread fallbacks) merge in as
//     recorded:true entries so a reply we logged is never invisible.
//
// STRICTLY READ-ONLY on the mailbox: fetches, never marks read, never modifies.
//
// Cache (wish lane only): a kind='thread_cache' update row holds the last fetched
// chain as JSON {fetched_at, thread_id, messages}. Fresh (< TTL) hits skip Gmail so
// the 30s board poll can't burn quota; ?fresh=1 forces a refetch (used after a send).

import { requiredTenantFromEnv, resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js'
import { getGmailTokenByConnection, resolveConnectionIdByEmail, gmailFetch } from '../_lib/gmailClient.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Canonical inboxes (pinned 2026-06-16, same as reply.js) — fallback when a wish
// predates thread_meta capture.
const HELLO_CONNECTION = '7e85b1d3-8b10-41a8-a064-5b0c6cac1983'
const PERSONAL_CONNECTION = 'f5f939e1-0fdf-4bac-8c88-6de76df751a5'

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_BODY_CHARS = 20000
const RECORDED_MATCH_MS = 3 * 60 * 1000

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

// Fetch a Gmail thread from one mailbox and normalize every message — including
// unsent drafts (marked draft:true, never hidden, never treated as replies).
async function fetchChain(connectionId, threadId) {
  let creds
  try {
    creds = await getGmailTokenByConnection(connectionId)
  } catch (e) {
    return { error: 'gmail-auth', detail: String(e).slice(0, 200) }
  }
  if (!creds) return { error: 'gmail-auth', detail: 'not connected' }
  const gr = await gmailFetch(creds.accessToken, `/threads/${encodeURIComponent(threadId)}?format=full`)
  if (!gr.ok) {
    const t = await gr.text().catch(() => '')
    return { soft: `gmail-${gr.status}`, detail: t.slice(0, 200) }
  }
  const data = await gr.json()
  const ownEmail = (creds.row && creds.row.config && creds.row.config.account_email) || (creds.profile && creds.profile.email) || ''
  const messages = (data.messages || []).map((m) => {
    const headers = m.payload?.headers || []
    const header = (name) => {
      const h = headers.find((x) => String(x.name || '').toLowerCase() === name)
      return h ? h.value : ''
    }
    const from = parseFrom(header('from'))
    const ours = OWN_ADDRESS.test(header('from')) || (ownEmail && from.email.toLowerCase() === ownEmail.toLowerCase())
    const isDraft = (m.labelIds || []).includes('DRAFT')
    return {
      direction: ours || isDraft ? 'out' : 'in',
      ...(isDraft ? { draft: true } : {}),
      from: from.name,
      fromEmail: from.email,
      date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : header('date'),
      body: stripQuotedTail(extractText(m.payload)) || (m.snippet || '').trim(),
    }
  }).sort((a, b) => new Date(a.date) - new Date(b.date))
  return { messages }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' })

  try {
    await resolveTenantContext(req, {
      fallback: requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']),
    })
  } catch (error) {
    return sendTenantContextError(res, error)
  }

  const { wish_id, access_code, thread_id, account, connection_id, fresh } = req.query

  // ── thread lane: mailbox-scan rows (no wish; threadId + mailbox known) ───────
  if (!wish_id && !access_code && thread_id) {
    let connId = connection_id || ''
    if (!connId && account) {
      try { connId = await resolveConnectionIdByEmail(String(account)) } catch { connId = '' }
    }
    if (!connId) return res.status(400).json({ ok: false, error: 'account or connection_id required with thread_id' })
    const chain = await fetchChain(connId, String(thread_id))
    if (chain.error) return res.status(502).json({ ok: false, error: chain.error, detail: chain.detail })
    if (chain.soft) return res.status(200).json({ ok: true, thread: [], cached: false, reason: chain.soft, detail: chain.detail })
    return res.status(200).json({ ok: true, thread: chain.messages, cached: false })
  }

  // ── wish lane ────────────────────────────────────────────────────────────────
  if (!wish_id && !access_code) return res.status(400).json({ ok: false, error: 'wish_id, access_code, or thread_id required' })
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

  // The wish's recorded replies — merged into the chain below, and still shown even
  // when no Gmail thread exists at all (a logged reply must never be invisible).
  let responseRows = []
  try {
    const rr = await supa(`support_wish_updates?select=body,created_at,author&wish_id=eq.${wish.id}&kind=eq.response&order=created_at.asc&limit=20`)
    if (rr.ok) responseRows = await rr.json()
  } catch { /* merge is best-effort */ }
  const recordedEntries = (gmailOut) => (Array.isArray(responseRows) ? responseRows : [])
    .filter((u) => u && u.created_at)
    .filter((u) => !gmailOut.some((m) => Math.abs(new Date(m.date) - new Date(u.created_at)) < RECORDED_MATCH_MS))
    .map((u) => ({
      direction: 'out', recorded: true, from: 'AOM', fromEmail: '',
      date: u.created_at, body: String(u.body || '').slice(0, MAX_BODY_CHARS),
    }))

  if (!threadId) {
    // Web-form wish / forwarded mail / pre-threading capture: no Gmail thread — the
    // chain is whatever replies the board recorded.
    const thread = recordedEntries([]).sort((a, b) => new Date(a.date) - new Date(b.date))
    return res.status(200).json({ ok: true, thread, cached: false, reason: 'no-thread' })
  }

  // Cache lane: last fetched chain lives in a thread_cache update row.
  const cr = await supa(`support_wish_updates?select=id,body&wish_id=eq.${wish.id}&kind=eq.thread_cache&order=created_at.desc&limit=1`)
  const crows = cr.ok ? await cr.json() : []
  const cacheRow = Array.isArray(crows) && crows.length ? crows[0] : null
  if (cacheRow && fresh !== '1') {
    try {
      const cached = JSON.parse(cacheRow.body || '{}')
      const age = Date.now() - new Date(cached.fetched_at || 0).getTime()
      // v2 marker: pre-M27b caches (no drafts, no recorded merge) are ignored.
      if (cached.v === 2 && cached.thread_id === threadId && age >= 0 && age < CACHE_TTL_MS && Array.isArray(cached.messages)) {
        return res.status(200).json({ ok: true, thread: cached.messages, cached: true })
      }
    } catch { /* stale/corrupt cache falls through to a live fetch */ }
  }

  // Live Gmail fetch — read-only.
  const connectionId = meta.connection_id || (wish.source === 'email-personal' ? PERSONAL_CONNECTION : HELLO_CONNECTION)
  const chain = await fetchChain(connectionId, threadId)
  if (chain.error) return res.status(502).json({ ok: false, error: chain.error, detail: chain.detail })
  if (chain.soft) {
    // Dead thread id must not brick the pane — recorded replies still show.
    const thread = recordedEntries([]).sort((a, b) => new Date(a.date) - new Date(b.date))
    return res.status(200).json({ ok: true, thread, cached: false, reason: chain.soft, detail: chain.detail })
  }

  // Merge board-recorded replies the Gmail thread doesn't contain (old API-resolve
  // sends and fresh-thread fallbacks live on other threads).
  const gmailOut = chain.messages.filter((m) => m.direction === 'out' && !m.draft)
  const messages = [...chain.messages, ...recordedEntries(gmailOut)]
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  // Gmail is the latency truth: replies sent outside the wish system (hooks,
  // manual Gmail replies) never write a response row, so a wish can read
  // "never replied" while its thread plainly shows our answer. Stamp
  // first_response_at from the first REAL outbound (never a draft) that follows
  // an inbound message (is.null guard — a live stamp always wins).
  if (!wish.first_response_at) {
    const firstIn = messages.find((m) => m.direction === 'in')
    const firstOut = firstIn && messages.find((m) => m.direction === 'out' && !m.draft && new Date(m.date) >= new Date(firstIn.date))
    if (firstOut && firstOut.date) {
      await supa(`support_wishes?id=eq.${wish.id}&first_response_at=is.null`, {
        method: 'PATCH',
        body: JSON.stringify({ first_response_at: new Date(firstOut.date).toISOString() }),
      }).catch(() => {})
    }
  }

  // Refresh the cache row (PATCH the existing one so rows don't pile up).
  const cacheBody = JSON.stringify({ v: 2, fetched_at: new Date().toISOString(), thread_id: threadId, messages })
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
