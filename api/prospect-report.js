// /api/prospect-report: the half of the scanner a stranger is allowed to touch.
//
//   POST /api/prospect-report              { scan }      gated   -> { token, url }
//   GET  /api/prospect-report?r=<token>                  public  -> the saved scan
//   POST /api/prospect-report?r=<token>    { started }   public  -> records Get Started
//   GET  /api/prospect-report?started=1                  gated   -> the leads
//   POST /api/prospect-report?r=<token>    { picked_up } gated   -> a person took it
//
// WHY THIS FILE EXISTS AT ALL
// /api/prospect-scan is gated on purpose (see its header): it is an outbound
// HTTP client that takes its target from the caller, and there is no version of
// the funnel where a stranger needs to aim it. But the funnel DOES need the
// stranger to read the result. Patrik's use is "run it cold right before a
// phone call and send the page ahead of dialling", and a page behind a login is
// a page nobody reads before a cold call.
//
// So the expensive abusable half stays operator-only and this file is the cheap
// static half: a scan that already ran, saved once by an authenticated
// operator, readable by anyone holding an unguessable link. Reading it costs
// one indexed row read and reaches nothing outbound.
//
// THE TOKEN IS THE WHOLE ACCESS CONTROL, SO IT IS A REAL ONE
// 160 bits from crypto.randomUUID() x2, base36. Not a slug of the company name:
// "icon-mechanical" is guessable by anyone who can guess a competitor's name,
// and this document quotes a stranger's own website back at them. It is not
// secret in the sense that the recipient will forward it (we want that); it is
// unguessable in the sense that you cannot enumerate other people's.
//
// STORAGE
// corner:retire-supabase (2026-09-03): the report used to be a cm_state row.
// It is now a Convex state row (state:put / state:get) with kind
// "prospect_scan", scopeId = the token, world "aom". The leads list is one
// state:get over the kind. (The plan named kb:put/get; kb:get returns only
// metadata and caps content at 32KB, so the state table is the right home.)
//
// THE ONE UNAUTHENTICATED WRITE, AND ITS LEASH
// Get Started has to work for somebody who has never logged into anything, so
// the capture POST is public. What it can do is bounded to the point of being
// dull: it must present a token that already exists, it may only add a
// `started` block of four short strings, and it cannot create a row, change a
// finding, or read anything back. Worst case is a junk lead on one report,
// which is the same worst case as any contact form on any website.
//
// PICKING ONE UP IS A SECOND, GATED WRITE (2026-08-05)
// A lead that can only be READ is a list that grows forever and stops being
// looked at, so the board needs a way to close one out, and the moment there
// is a way to close one out, the record has to say WHO closed it and WHAT they
// did, or the board is back to a green tick with nothing behind it.
//
//   THE NAME IS DERIVED, NEVER ACCEPTED. `by` comes from the verified session.
//   IT IS A REPORT, NOT A VERIFICATION. Nothing here fetched anything; a person
//   said they called. The note is required.
//
// It is also write-once. The second write would erase the first person's line,
// and a trail that can be quietly overwritten is not a trail.

import { randomUUID } from 'crypto'
import { TenantAuthError, verifyTenant, convexQuery, convexMutation } from './_lib/verifyTenant.js'

const TENANT = process.env.CLIENT_ENGINE_TENANT || 'aom'
const KIND = 'prospect_scan'
const WORLD = 'aom'

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

// One report by token: the stored payload or null.
async function reportGet(token) {
  try {
    const row = await convexQuery('state:get', { kind: KIND, scopeId: token, worldSlug: WORLD })
    return row && row.value && typeof row.value === 'object' ? row.value : null
  } catch {
    return null
  }
}

// Write the whole payload for a token. Returns true on success.
async function reportSet(token, payload, by) {
  try {
    await convexMutation('state:put', { kind: KIND, scopeId: token, worldSlug: WORLD, value: payload, updatedBy: by || 'api/prospect-report' })
    return true
  } catch (e) {
    console.warn('[prospect-report] state:put failed:', e?.message || e)
    return false
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const token = typeof req.query?.r === 'string' ? req.query.r : null

  // gated: who has pressed Get Started
  // The report tells a stranger their answers land in front of Patrik. This is
  // the list they land on, read by the scanner console AND the client board's
  // day view. Without a screen reading it, the sentence on the report is a
  // promise with no mechanism behind it.
  if (req.method === 'GET' && req.query?.started) {
    try {
      await verifyTenant(TENANT, req)
    } catch (e) {
      const status = e instanceof TenantAuthError ? (e.status || 403) : 500
      return res.status(status).json({ error: String(e.message || e), auth: false })
    }
    let rows = []
    try {
      rows = await convexQuery('state:get', { kind: KIND, worldSlug: WORLD })
    } catch {
      rows = []
    }
    const leads = (Array.isArray(rows) ? rows : [])
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 40)
      .map((row) => ({ row, payload: row.value && typeof row.value === 'object' ? row.value : {} }))
      .filter(({ payload }) => payload.started && payload.started.name)
      .map(({ row, payload }) => ({
        token: row.scopeId,
        company: (payload.scan && payload.scan.company) || null,
        name: payload.started.name,
        email: payload.started.email || null,
        phone: payload.started.phone || null,
        note: payload.started.note || null,
        at: payload.started.at || (row.updatedAt ? new Date(row.updatedAt).toISOString() : null),
        // Present = somebody has already called them. The board shows those
        // rows differently rather than hiding the fact that they existed.
        picked_up: payload.picked_up || null,
      }))
    return res.status(200).json({ leads })
  }

  // public read
  if (req.method === 'GET') {
    if (!tokenOk(token)) {
      return res.status(400).json({ error: 'This link is missing its report id.' })
    }
    const row = await reportGet(token)
    if (!row || !row.scan) {
      return res.status(404).json({ error: 'No report at this link. It may have been replaced.' })
    }
    // The lead capture never travels back out. Whoever forwards this link is
    // not entitled to whoever else already filled the form in on it, and the
    // pickup line is an internal note about a stranger, which travels out even
    // less. The ONE thing that does come back is the timestamp, so a claim
    // this page makes about itself can be checked on this page.
    const { started, picked_up, picked_up_log, ...rest } = row
    const handled = started && picked_up &&
      !(String(started.at || '') > String(picked_up.at || ''))
    return res.status(200).json({
      ...rest,
      started: started ? { at: started.at } : null,
      picked_up: handled ? { at: picked_up.at } : null,
    })
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

  // on an existing report: Get Started (public), or picked up (gated)
  if (token) {
    if (!tokenOk(token)) return res.status(400).json({ error: 'This link is missing its report id.' })
    const row = await reportGet(token)
    if (!row || !row.scan) return res.status(404).json({ error: 'No report at this link.' })

    // gated: an operator taking the lead off the board. Checked BEFORE the
    // public branch, so the anonymous door can never reach it.
    if (body.picked_up) {
      let byWho
      try {
        byWho = await verifyTenant(TENANT, req)
      } catch (e) {
        const status = e instanceof TenantAuthError ? (e.status || 403) : 500
        return res.status(status).json({ error: String(e.message || e), auth: false })
      }
      if (!row.started || !row.started.name) {
        return res.status(400).json({ error: 'Nobody has pressed Get Started on this report.' })
      }
      // Write-once, with ONE door back: pressing Get Started again after we
      // already called is a new ask, not a duplicate of the handled one. The
      // board decides "new" by the same comparison, so the two agree.
      const pressedSince = row.picked_up && row.started.at &&
        String(row.started.at) > String(row.picked_up.at || '')
      if (row.picked_up && !pressedSince) {
        return res.status(409).json({
          // Phoenix, explicitly. This runs on a machine set to UTC.
          error: `Already picked up by ${row.picked_up.by || 'someone'}` +
            (row.picked_up.at
              ? ` on ${new Date(row.picked_up.at).toLocaleString('en-US', { timeZone: 'America/Phoenix' })}`
              : '') + '.',
        })
      }
      const note = clean(body.picked_up.note, MAX_NOTE)
      if (!note) {
        return res.status(400).json({
          error: 'One line about what happened is required. Nothing on this board closes on memory alone.',
        })
      }
      const at = new Date().toISOString()
      // The one overwrite this file allows still keeps what it replaced.
      const prior = Array.isArray(row.picked_up_log) ? row.picked_up_log : []
      const by = byWho.userName || byWho.email || 'Unknown'
      const okUp = await reportSet(token, {
        ...row,
        picked_up: { by, at, note },
        picked_up_log: row.picked_up ? prior.concat([row.picked_up]) : prior,
      }, by)
      if (!okUp) return res.status(500).json({ error: 'That did not save. Try once more.' })
      return res.status(200).json({
        ok: true,
        picked_up: { by, at, note },
      })
    }

    const started = body.started || {}
    const name = clean(started.name, MAX_FIELD)
    const email = clean(started.email, MAX_FIELD)
    const phone = clean(started.phone, MAX_FIELD)
    if (!name || !(email || phone)) {
      return res.status(400).json({
        error: 'A name and one way to reach you, email or phone, are needed.',
      })
    }
    // ONE timestamp, stored and returned.
    const at = new Date().toISOString()
    const ok = await reportSet(token, {
      ...row,
      started: { name, email, phone, note: clean(started.note, MAX_NOTE), at },
    }, 'public:get-started')
    if (!ok) return res.status(500).json({ error: 'That did not save. Try once more.' })
    return res.status(200).json({ ok: true, at })
  }

  // gated: save a scan an operator just ran
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
  const ok = await reportSet(t, {
    scan,
    saved_at: new Date().toISOString(),
    saved_by: who.userName || null,
  }, who.userName || who.email || null)
  if (!ok) return res.status(500).json({ error: 'The report did not save.' })

  return res.status(200).json({ ok: true, token: t, path: `/scan/?r=${t}` })
}
