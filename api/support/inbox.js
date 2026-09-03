// POST /api/support/inbox - cross-mailbox inbox tracking for the support board.
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
//   -> { ok, days, mailboxes: [ { email, error?, needs:[...], replied:[...] } ] }
// Each item: { from, email, subject, threadId, date,
//              lastInbound: { snippet, date },        // what they wrote
//              lastReply:   { snippet, date } | null, // what we wrote back
//              replied }
//
// corner:retire-supabase (2026-09-03): the connected-account list used to be a
// scan of account_integrations. Convex keeps OAuth rows per user with no
// cross-user listing, so the mailboxes are the pinned support inboxes below and
// each one is resolved to its connection through gmailClient
// (resolveConnectionIdByEmail). `all` scans the same set with inbox + sent.

import { getGmailTokenByConnection, gmailFetch, resolveConnectionIdByEmail } from '../_lib/gmailClient.js'
import { requiredTenantFromEnv, resolveTenantContext } from '../_lib/tenantContext.js'
import { isNoiseMail, getKnownSenders, isKnownSender, isBlockedSender } from '../_lib/mailNoise.js'

const ADMIN_PASSWORD = process.env.SUPPORT_ADMIN_PASSWORD || 'aom-support-admin'

const ADMIN_ALLOWLIST = ['patrikmatheson@gmail.com']
// Two different scopes, because "Needs reply" and "Responded" have different noise:
//  - NEEDS-REPLY (inbound) scans only the support workspace mailbox. Personal Gmail's
//    inbox is full of Nextdoor/Flipboard newsletters, noise on a support board.
//  - RESPONDED (sent) ALSO scans personal Gmail, because the agent's actual support
//    replies go out from patrikmatheson@gmail.com. Sent mail is noise-free (we never
//    reply to newsletters), so including it here is safe and is what finally makes
//    "the support emails we responded to" show up.
// Pass all:true to scan every mailbox's inbox + sent. Extra mailboxes can be
// added with SUPPORT_MAILBOXES (comma separated emails).
const INBOUND_MAILBOXES = ['hello@aom-inhouse.com']
const RESPONDED_MAILBOXES = ['hello@aom-inhouse.com', 'patrikmatheson@gmail.com']
const EXTRA_MAILBOXES = String(process.env.SUPPORT_MAILBOXES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

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

// The connected Gmail accounts we know about, each with its connection id.
// Mailboxes with no live connection are skipped.
async function connectedGmail(emails) {
  const out = []
  const seen = new Set()
  for (const em of emails) {
    const key = String(em || '').toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    let id = null
    try { id = await resolveConnectionIdByEmail(key) } catch { id = null }
    if (id) out.push({ id, email: key })
  }
  return out
}

async function gmailSearchIds(accessToken, q, max = 25) {
  const r = await gmailFetch(accessToken, `/messages?q=${encodeURIComponent(q)}&maxResults=${max}`)
  if (!r.ok) return null
  const list = await r.json()
  return (list.messages || []).map((m) => m.id)
}

// The "Responded" list IS our sent replies. Scan `in:sent` directly (one item per
// thread, newest reply kept) so the board shows every support email we actually
// answered, with our reply text. This is noise-free by nature: we don't reply to
// newsletters/sales, so scanning sent never surfaces junk. This is why personal
// Gmail's SENT is safe to include even though its inbox is noisy.
async function scanSentReplies(accessToken, days) {
  const ids = await gmailSearchIds(accessToken, `in:sent newer_than:${days}d`, 25)
  if (!Array.isArray(ids) || !ids.length) return []
  const wanted = ['To', 'Subject', 'Date']
  const metaQS = `format=metadata&${wanted.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&')}`
  const msgs = await Promise.all(
    ids.map(async (id) => {
      const r = await gmailFetch(accessToken, `/messages/${id}?${metaQS}`)
      if (!r.ok) return null
      return r.json()
    }),
  )
  // One per thread; ids come newest-first so the first seen per thread is the latest reply.
  const byThread = new Map()
  for (const m of msgs) {
    if (!m) continue
    const headers = m.payload?.headers || []
    const { name, email: te } = parseFrom(headerVal(headers, 'To'))
    if (!te || AUTOMATED.test(te)) continue
    if (byThread.has(m.threadId)) continue
    const date = m.internalDate ? Number(m.internalDate) : Date.parse(headerVal(headers, 'Date') || '')
    byThread.set(m.threadId, {
      from: name || te, // who we replied TO (the card shows this name)
      email: te,
      subject: (headerVal(headers, 'Subject') || '(no subject)').trim().slice(0, 80),
      threadId: m.threadId,
      date,
      lastInbound: { snippet: '', date: null },
      lastReply: { snippet: (m.snippet || '').trim().slice(0, 240), date },
      replied: true,
    })
  }
  return [...byThread.values()].sort((a, b) => (b.date || 0) - (a.date || 0))
}

// scanInbound=false -> only collect what we've Responded to (sent scan), skip the
// inbox entirely. Used for personal Gmail: its SENT carries real support replies,
// but its inbox is full of newsletters we don't want in "Needs reply".
async function trackAccount(connId, email, days, opts = {}) {
  const scanInbound = opts.scanInbound !== false
  let creds
  try {
    creds = await getGmailTokenByConnection(connId)
  } catch (e) {
    return { email, error: 'unhealthy: reconnect this account', needs: [], replied: [] }
  }
  if (!creds) return { email, error: 'not connected', needs: [], replied: [] }

  // Responded = the replies we actually sent (+2d grace window, same as before).
  const replied = await scanSentReplies(creds.accessToken, days + 2)
  const repliedThreads = new Set(replied.map((r) => r.threadId))
  const repliedEmails = new Set(replied.map((r) => r.email))

  let needs = []
  if (scanInbound) {
    const ids = await gmailSearchIds(creds.accessToken, `in:inbox newer_than:${days}d`, 25)
    if (ids === null) return { email, error: 'unhealthy: reconnect this account', needs: [], replied }
    if (ids.length) {
      const wanted = ['From', 'Subject', 'Date', 'List-Unsubscribe']
      const metaQS = `format=metadata&${wanted.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&')}`
      const messages = await Promise.all(
        ids.map(async (id) => {
          const r = await gmailFetch(creds.accessToken, `/messages/${id}?${metaQS}`)
          if (!r.ok) return null
          return r.json()
        }),
      )
      // Unique real senders we have NOT replied to yet, newest kept per sender.
      const lists = await getKnownSenders()
      const senders = new Map()
      for (const m of messages) {
        if (!m) continue
        const headers = m.payload?.headers || []
        const { name, email: fe } = parseFrom(headerVal(headers, 'From'))
        if (!fe || AUTOMATED.test(fe) || fe === email.toLowerCase()) continue
        // Drop bulk/marketing mail (RFC 2369 List-Unsubscribe = newsletters/sales).
        if (headerVal(headers, 'List-Unsubscribe')) continue
        // Content-level noise gate (shared with the wish board): sender lists never
        // keep up; the subject + snippet tell the truth about blasts and cold pitches.
        if (isNoiseMail(fe, headerVal(headers, 'Subject'), m.snippet || '', { knownSender: isKnownSender(fe, lists), blockedSender: isBlockedSender(fe, lists) }).noisy) continue
        // Already answered (this thread or this person is in our sent scan)? Not "needs".
        if (repliedThreads.has(m.threadId) || repliedEmails.has(fe)) continue
        if (!senders.has(fe)) {
          senders.set(fe, {
            from: name || fe,
            email: fe,
            subject: (headerVal(headers, 'Subject') || '(no subject)').trim().slice(0, 80),
            threadId: m.threadId,
            date: m.internalDate ? Number(m.internalDate) : Date.parse(headerVal(headers, 'Date') || ''),
            lastInbound: { snippet: (m.snippet || '').trim().slice(0, 240), date: m.internalDate ? Number(m.internalDate) : null },
            lastReply: null,
            replied: false,
          })
        }
      }
      needs = [...senders.values()].sort((a, b) => (b.date || 0) - (a.date || 0))
    }
  }

  return { email, needs, replied }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' })

  let body
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid-json' })
  }

  const { email, password, days, all } = body || {}

  // Auth path 1: a verified dashboard session in the configured support tenant.
  // This is STRONGER than the shared password: it requires a real token proving
  // who you are. The tenant resolver throws on any invalid session, so we fall
  // through to the password path for everyone else.
  let authed = false
  try {
    await resolveTenantContext(req, {
      fallback: requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']),
    })
    authed = true
  } catch {
    authed = false
  }

  // Auth path 2: AOM team email + the shared admin password (for callers
  // without a dashboard session: scripts, the standalone /support/admin door).
  if (!authed) {
    const n = (email || '').trim().toLowerCase()
    if (!isAOMTeamMember(n) || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password.' })
    }
  }

  const window = Math.max(1, Math.min(Number(days) > 0 ? Number(days) : 3, 14))

  const union = [...new Set([...INBOUND_MAILBOXES, ...RESPONDED_MAILBOXES, ...EXTRA_MAILBOXES].map((m) => m.toLowerCase()))]
  const conns = await connectedGmail(union)
  const byEmail = {}
  for (const c of conns) byEmail[c.email.toLowerCase()] = c

  let targets
  if (all) {
    // Every known mailbox, full inbox + sent.
    targets = conns.map((c) => ({ id: c.id, email: c.email, scanInbound: true }))
  } else {
    // Union of the inbound + responded scopes; inbound scan only where it's wanted.
    const inboundSet = new Set(INBOUND_MAILBOXES.map((m) => m.toLowerCase()))
    targets = []
    for (const mb of union) {
      if (EXTRA_MAILBOXES.includes(mb) && !inboundSet.has(mb) && !RESPONDED_MAILBOXES.includes(mb)) continue
      const c = byEmail[mb]
      if (!c) continue
      targets.push({ id: c.id, email: c.email, scanInbound: inboundSet.has(mb) })
    }
  }

  const mailboxes = await Promise.all(targets.map((t) => trackAccount(t.id, t.email, window, { scanInbound: t.scanInbound })))
  return res.status(200).json({ ok: true, days: window, mailboxes })
}
