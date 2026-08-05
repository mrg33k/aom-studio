// /api/prospect-report — the half of the scanner a stranger is allowed to touch.
//
//   POST /api/prospect-report            { scan }    gated   -> { token, url }
//   GET  /api/prospect-report?r=<token>              public  -> the saved scan
//   POST /api/prospect-report?r=<token>  { started } public  -> records Get Started
//
// ── WHY THIS FILE EXISTS AT ALL ────────────────────────────────────────────
// /api/prospect-scan is gated on purpose (see its header): it is an outbound
// HTTP client that takes its target from the caller, and there is no version of
// the funnel where a stranger needs to aim it. But the funnel DOES need the
// stranger to read the result — Patrik's use is "run it cold right before a
// phone call and send the page ahead of dialling", and a page behind a login is
// a page nobody reads before a cold call.
//
// So the expensive abusable half stays operator-only and this file is the cheap
// static half: a scan that already ran, saved once by an authenticated
// operator, readable by anyone holding an unguessable link. Reading it costs
// one indexed row read and reaches nothing outbound.
//
// ── THE TOKEN IS THE WHOLE ACCESS CONTROL, SO IT IS A REAL ONE ─────────────
// 160 bits from crypto.randomUUID() x2, base36. Not a slug of the company name
// — "icon-mechanical" is guessable by anyone who can guess a competitor's name,
// and this document quotes a stranger's own website back at them. It is not
// secret in the sense that the recipient will forward it (we want that); it is
// unguessable in the sense that you cannot enumerate other people's.
//
// ── STORAGE ────────────────────────────────────────────────────────────────
// The existing `cm_state` table (kind, scope_id, client_id, payload) — the same
// generic JSON store the trackers and review checklists already use. No
// migration, because a scan report is a JSON document keyed by one id and that
// is exactly what cm_state is for. kind='prospect_scan', scope_id=<token>.
//
// ── THE ONE UNAUTHENTICATED WRITE, AND ITS LEASH ───────────────────────────
// Get Started has to work for somebody who has never logged into anything, so
// the capture POST is public. What it can do is bounded to the point of being
// dull: it must present a token that already exists, it may only add a
// `started` block of four short strings, and it cannot create a row, change a
// finding, or read anything back. Worst case is a junk lead on one report,
// which is the same worst case as any contact form on any website.

import { randomUUID } from 'crypto'
import { TenantAuthError, verifyTenant } from './_lib/verifyTenant.js'
import { stateGet, stateSet, stateConfigured } from './_lib/stateStore.js'

const TENANT = process.env.CLIENT_ENGINE_TENANT || 'aom'
const KIND = 'prospect_scan'
const CLIENT_ID = 'aom'

const MAX_FIELD = 200
const MAX_NOTE = 600

function newToken() {
  const raw = (randomUUID() + randomUUID()).replace(/-/g, '')
  // hex -> base36 in two halves, so the id is short enough to sit in a text
  // message without wrapping and still carries the full 128 bits of the pair.
  const half = raw.length / 2
  return (
    BigInt('0x' + raw.slice(0, half)).toString(36) +
    BigInt('0x' + raw.slice(half)).toString(36)
  ).slice(0, 40)
}

const clean = (v, max) => {
  const s = String(v == null ? '' : v).trim().replace(/\s+/g, ' ')
  return s ? s.slice(0, max) : null
}

// A token out of a query string reaches a database key. Anything that is not
// the shape we mint is refused before it gets there.
const tokenOk = (t) => typeof t === 'string' && /^[a-z0-9]{16,48}$/.test(t)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!stateConfigured()) {
    return res.status(500).json({ error: 'Report storage is not configured on this deployment.' })
  }

  const token = typeof req.query?.r === 'string' ? req.query.r : null

  // ── gated: who has pressed Get Started ──────────────────────────────────
  // The report tells a stranger "it is on the board Patrik opens every
  // morning". This is that board. Without it the sentence is a promise with no
  // mechanism behind it, which is the one thing a first impression cannot
  // afford to be.
  if (req.method === 'GET' && req.query?.started) {
    try {
      await verifyTenant(TENANT, req)
    } catch (e) {
      const status = e instanceof TenantAuthError ? (e.status || 403) : 500
      return res.status(status).json({ error: String(e.message || e), auth: false })
    }
    const url = `${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cm_state` +
      `?kind=eq.${KIND}&client_id=eq.${CLIENT_ID}` +
      '&select=scope_id,updated_at,started:payload->started,company:payload->scan->>company' +
      '&order=updated_at.desc&limit=40'
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!r.ok) return res.status(200).json({ leads: [] })
    const rows = await r.json()
    const leads = (Array.isArray(rows) ? rows : [])
      .filter((row) => row.started && row.started.name)
      .map((row) => ({
        token: row.scope_id,
        company: row.company || null,
        name: row.started.name,
        email: row.started.email || null,
        phone: row.started.phone || null,
        note: row.started.note || null,
        at: row.started.at || row.updated_at,
      }))
    return res.status(200).json({ leads })
  }

  // ── public read ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!tokenOk(token)) {
      return res.status(400).json({ error: 'This link is missing its report id.' })
    }
    const row = await stateGet(KIND, token, CLIENT_ID)
    if (!row || !row.scan) {
      return res.status(404).json({ error: 'No report at this link. It may have been replaced.' })
    }
    // The lead capture never travels back out. Whoever forwards this link is
    // not entitled to whoever else already filled the form in on it.
    const { started, ...rest } = row
    return res.status(200).json({ ...rest, started: started ? { at: started.at } : null })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'This endpoint takes GET (read) or POST (save, start).' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}') } catch { body = {} }
  }
  body = body || {}

  // ── public: Get Started on an existing report ───────────────────────────
  if (token) {
    if (!tokenOk(token)) return res.status(400).json({ error: 'This link is missing its report id.' })
    const row = await stateGet(KIND, token, CLIENT_ID)
    if (!row || !row.scan) return res.status(404).json({ error: 'No report at this link.' })

    const started = body.started || {}
    const name = clean(started.name, MAX_FIELD)
    const email = clean(started.email, MAX_FIELD)
    const phone = clean(started.phone, MAX_FIELD)
    if (!name || !(email || phone)) {
      return res.status(400).json({
        error: 'A name and one way to reach you — email or phone — are needed.',
      })
    }
    const ok = await stateSet(KIND, token, CLIENT_ID, {
      ...row,
      started: {
        name, email, phone,
        note: clean(started.note, MAX_NOTE),
        at: new Date().toISOString(),
      },
    })
    if (!ok) return res.status(500).json({ error: 'That did not save. Try once more.' })
    return res.status(200).json({ ok: true, at: new Date().toISOString() })
  }

  // ── gated: save a scan an operator just ran ─────────────────────────────
  let who
  try {
    who = await verifyTenant(TENANT, req)
  } catch (e) {
    if (e instanceof TenantAuthError) {
      return res.status(e.status || 403).json({ error: String(e.message), auth: false })
    }
    return res.status(500).json({ error: String(e.message || e) })
  }

  const scan = body.scan
  if (!scan || typeof scan !== 'object' || !Array.isArray(scan.findings) || !Array.isArray(scan.surfaces)) {
    return res.status(400).json({ error: 'scan is required: the object /api/prospect-scan returned.' })
  }

  const t = newToken()
  const ok = await stateSet(KIND, t, CLIENT_ID, {
    scan,
    saved_at: new Date().toISOString(),
    saved_by: who.userName || null,
  })
  if (!ok) return res.status(500).json({ error: 'The report did not save.' })

  return res.status(200).json({ ok: true, token: t, path: `/scan/?r=${t}` })
}
