// POST /api/support/inbox — cross-mailbox inbox tracking for the support board.
//
// Server-side port of scripts/inbox-tracker.py. For each connected Gmail account
// it scans the last N days of inbox mail, drops automated/self senders, and tells
// you which real correspondents you've replied to and which still need you. This
// is the "what we're responding to" half of the unified support command center.
//
// Gated by the same door as the board: an AOM team email + SUPPORT_ADMIN_PASSWORD.
// (Real inbox data is more sensitive than wishes, so unlike the open wishes list
// this endpoint requires the team password the board already collected at login.)
//
// Body: { email, password, days?=3, all?=false }
//   → { ok, days, mailboxes: [ { email, error?, needs:[...], replied:[...] } ] }
// Each item: { from, email, subject, threadId, date,
//              lastInbound: { snippet, date },        // what they wrote
//              lastReply:   { snippet, date } | null, // what we wrote back
//              replied }
// The snippets are what make "the support emails we responded to" actually
// visible — the board now shows their message AND our reply, not just a flag.

import { getGmailTokenByConnection, gmailFetch } from '../_lib/gmailClient.js'
import { verifyTenant } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PASSWORD = process.env.SUPPORT_ADMIN_PASSWORD || 'aom-support-admin'

const ADMIN_ALLOWLIST = ['patrikmatheson@gmail.com']
const DEFAULT_MAILBOXES = ['patrikmatheson@gmail.com', 'hello@aom-inhouse.com']

// Mirrors inbox-tracker's AUTOMATED regex: senders Gmail still files in the inbox
// that aren't real people (receipts, notifications, calendar, docusign, etc.).
const AUTOMATED = /(no[-_.]?reply|do[-_.]?not[-_.]?reply|notifications?@|mailer|postmaster|bounce|@docusign|calendar-notification|automated|@.*\.calendar)/i

function isAOMTeamMember(email) {
  if (!email) return false
  const n = email.trim().toLowerCase()
  return n.endsWith('@aom-inhouse.com') || ADMIN_ALLOWLIST.includes(n)
}

function parseFrom(header) {
  if (!header) return { name: '', email: '' }
  const m = header.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
  return { name: '', email: header.trim().toLowerCase() }
}

function headerVal(headers, name) {
  if (!headers) return ''
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function supa(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
}

// Distinct connected Gmail accounts (dedupe by account_email), mirroring
// inbox-tracker.connected_gmail().
async function connectedGmail() {
  const r = await supa(
    'account_integrations?integration_slug=eq.gmail&status=eq.connected&select=id,config',
  )
  const rows = await r.json()
  const out = []
  const seen = new Set()
  for (const row of rows || []) {
    const em = (row.config || {}).account_email
    if (em && !seen.has(em.toLowerCase())) {
      seen.add(em.toLowerCase())
      out.push({ id: row.id, email: em })
    }
  }
  return out
}

async function gmailSearchIds(accessToken, q, max = 25) {
  const r = await gmailFetch(accessToken, `/messages?q=${encodeURIComponent(q)}&maxResults=${max}`)
  if (!r.ok) return null
  const list = await r.json()
  return (list.messages || []).map((m) => m.id)
}

// Our latest sent reply to `to` in the window — { snippet, date } — or null if
// we never wrote them back. This is the "what we said back" the board was missing.
async function latestSentTo(accessToken, to, days) {
  const ids = await gmailSearchIds(accessToken, `in:sent to:${to} newer_than:${days}d`, 1)
  if (!Array.isArray(ids) || !ids.length) return null
  const r = await gmailFetch(accessToken, `/messages/${ids[0]}?format=metadata&metadataHeaders=Date`)
  if (!r.ok) return null
  const m = await r.json()
  return {
    snippet: (m.snippet || '').trim().slice(0, 240),
    date: m.internalDate ? Number(m.internalDate) : null,
  }
}

async function trackAccount(connId, email, days) {
  let creds
  try {
    creds = await getGmailTokenByConnection(connId)
  } catch (e) {
    return { email, error: 'unhealthy — reconnect this account', needs: [], replied: [] }
  }
  if (!creds) return { email, error: 'not connected', needs: [], replied: [] }

  const ids = await gmailSearchIds(creds.accessToken, `in:inbox newer_than:${days}d`, 25)
  if (ids === null) return { email, error: 'unhealthy — reconnect this account', needs: [], replied: [] }
  if (!ids.length) return { email, needs: [], replied: [] }

  const wanted = ['From', 'Subject', 'Date']
  const metaQS = `format=metadata&${wanted.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&')}`
  const messages = await Promise.all(
    ids.map(async (id) => {
      const r = await gmailFetch(creds.accessToken, `/messages/${id}?${metaQS}`)
      if (!r.ok) return null
      return r.json()
    }),
  )

  // Unique real senders, newest message kept per sender.
  const senders = new Map()
  for (const m of messages) {
    if (!m) continue
    const headers = m.payload?.headers || []
    const { name, email: fe } = parseFrom(headerVal(headers, 'From'))
    if (!fe || AUTOMATED.test(fe) || fe === email.toLowerCase()) continue
    if (!senders.has(fe)) {
      senders.set(fe, {
        from: name || fe,
        email: fe,
        subject: (headerVal(headers, 'Subject') || '(no subject)').trim().slice(0, 80),
        threadId: m.threadId,
        date: m.internalDate ? Number(m.internalDate) : Date.parse(headerVal(headers, 'Date') || ''),
        inboundSnippet: (m.snippet || '').trim().slice(0, 240),
      })
    }
  }

  // For each correspondent: their inbound snippet + our latest reply snippet.
  // "replied" = we wrote them inside the window (+2d grace, same as inbox-tracker).
  const items = await Promise.all(
    [...senders.values()].map(async (info) => {
      const reply = await latestSentTo(creds.accessToken, info.email, days + 2)
      return {
        from: info.from,
        email: info.email,
        subject: info.subject,
        threadId: info.threadId,
        date: info.date,
        lastInbound: { snippet: info.inboundSnippet || '', date: info.date || null },
        lastReply: reply, // { snippet, date } | null
        replied: !!reply,
      }
    }),
  )

  const needs = items.filter((i) => !i.replied).sort((a, b) => (b.date || 0) - (a.date || 0))
  const replied = items.filter((i) => i.replied).sort((a, b) => (b.date || 0) - (a.date || 0))
  return { email, needs, replied }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ ok: false, error: 'Service unavailable' })

  let body
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid-json' })
  }

  const { email, password, days, all } = body || {}

  // Auth path 1 — a verified Supabase session in the aom world (or super-admin
  // Patrik). This is STRONGER than the shared password: it requires a real JWT
  // proving who you are. When the dashboard opens the Inbox tab in Patrik's own
  // logged-in session, the token rides via Authorization and we skip the
  // password entirely (no friction). verifyTenant throws on any non-aom/invalid
  // session, so we fall through to the password path for everyone else.
  let authed = false
  try {
    await verifyTenant('aom', req)
    authed = true
  } catch {
    authed = false
  }

  // Auth path 2 — AOM team email + the shared admin password (for callers
  // without a dashboard session: scripts, the standalone /support/admin door).
  if (!authed) {
    const n = (email || '').trim().toLowerCase()
    if (!isAOMTeamMember(n) || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' })
    }
  }

  const window = Math.max(1, Math.min(Number(days) > 0 ? Number(days) : 3, 14))

  let conns = await connectedGmail()
  if (!all) {
    const defaults = DEFAULT_MAILBOXES.map((m) => m.toLowerCase())
    conns = conns.filter((c) => defaults.includes(c.email.toLowerCase()))
  }

  const mailboxes = await Promise.all(conns.map((c) => trackAccount(c.id, c.email, window)))
  return res.status(200).json({ ok: true, days: window, mailboxes })
}
