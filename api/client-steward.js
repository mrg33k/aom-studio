// /api/client-steward — the queue of prepared items, and the two verbs on them.
//
//   GET  /api/client-steward?client=wolfpack   -> that client's queue
//   GET  /api/client-steward?view=queue        -> every client this caller may see
//   GET  /api/client-steward?id=<uuid>         -> one item, its receipts, its history
//   POST { action: 'send',     id, via, note? }
//   POST { action: 'feedback', id, feedback, apply? }
//
// ── WHAT THIS ENDPOINT IS AND, MORE IMPORTANTLY, IS NOT ────────────────────
//
// Patrik, asked directly, 2026-08-05: "Hand me stuff to click send on or give
// feedback on." An earlier attempt at the same idea was blocked for letting a
// standing agent chase and escalate to clients unattended. That block was
// correct, and this file is written so nobody rebuilds the blocked thing on top
// of it by accident.
//
// THERE IS NO TRANSPORT HERE. No mail client, no Resend call, no webhook, no
// queue that something else drains. `send` MARKS AN ITEM RELEASED AND RECORDS
// WHO RELEASED IT AND HOW IT WENT OUT. The message leaves the building from
// Patrik's own hands, exactly as it does today. Three separate things make that
// hard to undo by accident rather than merely conventional:
//
//   1. prepared_messages has NO ADDRESS COLUMN. Nothing in the store knows an
//      email address, a phone number or a thread id, so nothing downstream can
//      address a message from it without a migration a person writes and reads.
//   2. `via` is REQUIRED and is a fact only the sender has. The board cannot see
//      how a message left the building. Defaulting it to 'email' because that is
//      the usual channel would be this product's recurring failure in miniature:
//      a finite observation emitting a wider claim. So the person who sent it is
//      asked, and the record is true.
//   3. The database refuses an INSERT in any state but 'waiting', so the
//      preparer — which holds the service key and never calls this endpoint —
//      cannot mint a sent item even if it wanted to. The gate is not this file.
//
// ── AUTH ───────────────────────────────────────────────────────────────────
// Same shape as client-parts.js, deliberately: verifyProjectAccess(client, req)
// on EVERY path, the actor derived from the verified JWT and never from the
// body. `id`-addressed actions resolve the item's client FIRST and gate on
// that, the way client-parts.js's `dispute` resolves an evidence row — an item
// id must not be a way round the client gate.
//
// ── FEEDBACK IS AN INPUT, NOT A DISMISS BUTTON ─────────────────────────────
// The easy version of the second verb is a hide button, and it is worthless:
// the item goes away, the next run prepares the same draft, and Patrik learns
// the queue does not listen. So feedback here EDITS THE RECORD THE DRAFT WAS
// MADE FROM. Every draft is derived — from chase_ask, from chase_from or
// waiting_on, from an evidence line — so `apply` writes those corrections onto
// client_parts through the same rules the board's own update_part uses, leaving
// the same attributed trail line. The preparer then rebuilds the draft from the
// corrected record on its next pass, because its redraft gate is a fingerprint
// of the facts and the facts moved.
//
// Which is also why feedback with NO correction and NO hold produces silence
// rather than a new draft. The record still says what it said; a redraft would
// be the same words back; and a queue that re-serves a thing you just answered
// is the nag this design exists to avoid.
import { verifyProjectAccess, TenantAuthError } from './_lib/verifyTenant.js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const REST = () => `${SUPABASE_URL}/rest/v1`
const headers = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
})

// HOW IT WENT OUT. A closed list, because an open text field here would fill up
// with "yeah" and "done" and stop being a record of anything.
const CHANNELS = ['email', 'text', 'call', 'in_person', 'other']
const STATES = ['waiting', 'sent', 'feedback']

// The same ceilings client-parts.js states and the same ones the migration puts
// on the columns. The DATABASE IS THE AUTHORITY — these exist so a caller gets a
// readable refusal instead of a raw Postgres 400. Restated rather than imported
// because client-parts.js does not export them, and reaching into that file to
// add an export would put a shared mutable surface under the board's hot path
// for the sake of two integers.
const MAX_CHASE_ASK = 240
const MAX_WHY_IT_MATTERS = 240
const MAX_NAME = 120
const MAX_FEEDBACK = 2000
const MAX_SENT_NOTE = 500
// A hold is Patrik asking to be reminded later. Capped at a quarter because a
// hold longer than that is not a reminder, it is a decision, and a decision
// belongs on the part as a state rather than buried on a draft.
const MAX_HOLD_DAYS = 90

// What each kind is, in the words the queue should use. The steward writes the
// key; the sentence lives here so one screen cannot describe it differently
// from another.
const KIND_LABEL = {
  access_request: 'Asking for something we have never been given',
  chase_followup: 'Following up on something we already asked for',
  change_notice: 'Telling them a page we watch has changed',
}

async function sb(path, init = {}) {
  const res = await fetch(`${REST()}${path}`, { ...init, headers: headers(init.headers) })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(text.slice(0, 400))
    err.status = res.status
    throw err
  }
  return text ? JSON.parse(text) : []
}

function tooLongProblem(value, field, max, what) {
  if (value == null || value === '') return null
  if (String(value).length > max) {
    return `${field} must be ${max} characters or fewer — it is ${what}.`
  }
  return null
}

// Every cross-client view answers the same question first: of the clients that
// have prepared items, which may THIS caller see. One at a time through the same
// vetted decision function, never a bulk shortcut — the same rule and the same
// reason as client-parts.js's visibleClients.
async function visibleClients(slugs, req) {
  const allowed = []
  for (const c of [...new Set(slugs)]) {
    try { await verifyProjectAccess(c, req); allowed.push(c) } catch { /* not yours */ }
  }
  if (!allowed.length) throw new TenantAuthError('jwt required', 401)
  return allowed
}

// The part a draft was made from, for the context the QUEUE needs and the
// MESSAGE must not carry.
//
// why_it_matters is the sharpest example and the reason this join exists at all.
// It is a real, carefully written sentence — and it was written for the
// operator's card, so read into a message to the person it is about it turns
// third person ("so nobody can prove to Mo that the marketing paid for itself",
// sent to Mo). The steward therefore keeps it out of every body and it surfaces
// HERE instead, beside the draft, where its actual audience is reading.
async function partsFor(items) {
  if (!items.length) return {}
  const slugs = [...new Set(items.map((i) => i.project_slug))]
  const keys = [...new Set(items.map((i) => i.part_key))]
  const rows = await sb(
    `/client_parts?select=id,project_slug,part_key,name,icon,group_name,state,` +
    `connection,status_line,suggestion,why_it_matters,chase_ask,chase_from,` +
    `waiting_on,waiting_since,checked_at` +
    `&project_slug=in.(${slugs.map(encodeURIComponent).join(',')})` +
    `&part_key=in.(${keys.map(encodeURIComponent).join(',')})`
  )
  return Object.fromEntries(rows.map((p) => [`${p.project_slug} ${p.part_key}`, p]))
}

// The queue's own words for what is true of an item right now. Written once
// here rather than assembled on a screen, so two surfaces cannot disagree about
// what "feedback" means.
function stateLine(item) {
  if (item.state === 'waiting') return 'Waiting on you'
  if (item.state === 'sent') {
    const how = { email: 'by email', text: 'by text', call: 'on a call',
                  in_person: 'in person', other: 'another way' }[item.sent_via] || ''
    return `Sent ${how} by ${item.sent_by}`.replace(/\s+/g, ' ').trim()
  }
  if (item.hold_until && new Date(item.hold_until).getTime() > Date.now()) {
    return `You answered this. Held until ${String(item.hold_until).slice(0, 10)}`
  }
  return 'You answered this. The next draft waits on the record changing'
}

function shape(item, part) {
  return {
    id: item.id,
    client: item.project_slug,
    part_key: item.part_key,
    part_name: part?.name || item.part_key,
    part_icon: part?.icon || null,
    group_name: part?.group_name || null,
    kind: item.kind,
    kind_label: KIND_LABEL[item.kind] || item.kind,

    to_name: item.to_name,
    subject: item.subject,
    body: item.body,

    // Every fact in the body, with a pointer to the row it was read off and the
    // recorded text quoted verbatim. The queue should render these under the
    // draft: this product's whole claim is that nothing is asserted without a
    // receipt, and a message going out under the agency's name is an assertion.
    sources: Array.isArray(item.sources) ? item.sources : [],

    prepared_at: item.prepared_at,
    prepared_by: item.prepared_by,

    state: item.state,
    state_line: stateLine(item),
    sent_at: item.sent_at, sent_by: item.sent_by,
    sent_via: item.sent_via, sent_note: item.sent_note,
    feedback: item.feedback, feedback_at: item.feedback_at,
    feedback_by: item.feedback_by, hold_until: item.hold_until,
    supersedes: item.supersedes, carried_feedback: item.carried_feedback,

    // Context for the READER OF THE QUEUE. Explicitly not part of the message.
    context: {
      why_it_matters: part?.why_it_matters || null,
      status_line: part?.status_line || null,
      part_state: part?.state || null,
      waiting_on: part?.waiting_on || null,
      waiting_since: part?.waiting_since || null,
    },

    // Exactly two, and only while it is still his to act on. Named here rather
    // than assumed by the screen so a third one cannot appear on a surface
    // without appearing in the API that has to authorise it.
    verbs: item.state === 'waiting' ? ['send', 'feedback'] : [],
  }
}

// Grouped by the person it is addressed to, because that is how it gets done:
// nobody sends Ross four separate messages, they open the four things owed by
// Ross and deal with Ross. The items stay one-per-part — a part is the unit
// that gets marked done — and this is the reading order over them.
function byPerson(items) {
  const groups = new Map()
  for (const i of items) {
    const key = `${i.client} ${i.to_name}`
    if (!groups.has(key)) {
      groups.set(key, { client: i.client, to_name: i.to_name, items: [] })
    }
    groups.get(key).items.push(i)
  }
  return [...groups.values()].sort(
    (a, b) => (b.items.length - a.items.length) || a.to_name.localeCompare(b.to_name)
  )
}

function counts(rows) {
  const c = { total: rows.length, waiting: 0, sent: 0, feedback: 0 }
  for (const r of rows) c[r.state] = (c[r.state] || 0) + 1
  return c
}

// One item by id, with the client it belongs to — resolved BEFORE any gate runs,
// so the gate is applied to the row's real owner rather than to whatever the
// caller claimed.
async function findItem(id) {
  const rows = await sb(`/prepared_messages?select=*&id=eq.${encodeURIComponent(id)}&limit=1`)
  return rows[0] || null
}

// The line an operator's action leaves on the board's own trail.
//
// actor_kind and confidence are HARDCODED for the same reason client-parts.js
// hardcodes them: a person acting is a person reporting, never a machine
// verifying, and no action added later should be able to write a claim carrying
// a check's authority by passing a different string.
async function recordOnPart(part, actor, claim, method) {
  if (!part) return null
  const rows = await sb('/part_evidence', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{
      part_id: part.id,
      actor,
      actor_kind: 'person',
      claim,
      method,
      artifact_url: null,
      artifact_quote: null,
      confidence: 'reported',
    }]),
  })
  return rows[0] || null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured on this deployment' })
  }

  try {
    if (req.method === 'GET') {
      const id = String(req.query.id || '').trim()

      // ── ONE ITEM, ITS RECEIPTS, AND WHAT IT REPLACED ───────────────────
      if (id) {
        const item = await findItem(id)
        if (!item) return res.status(404).json({ error: 'prepared item not found' })
        await verifyProjectAccess(item.project_slug, req)
        const parts = await partsFor([item])
        const part = parts[`${item.project_slug} ${item.part_key}`]

        // The chain backwards: what this draft replaced, and what he said about
        // it. A redraft that cannot show the note it answers is just a new draft.
        const history = []
        let cursor = item.supersedes
        while (cursor && history.length < 10) {
          const prior = await findItem(cursor)
          if (!prior) break
          history.push(shape(prior, part))
          cursor = prior.supersedes
        }
        return res.status(200).json({ item: shape(item, part), history })
      }

      const state = String(req.query.state || 'waiting').trim()
      if (state !== 'all' && !STATES.includes(state)) {
        return res.status(400).json({ error: `state must be all or one of ${STATES.join(', ')}` })
      }

      // ── THE QUEUE, ACROSS EVERY CLIENT THIS CALLER MAY SEE ─────────────
      if (String(req.query.view || '') === 'queue') {
        const all = await sb('/prepared_messages?select=*&order=prepared_at.desc')
        const allowed = await visibleClients(all.map((r) => r.project_slug), req)
        const mine = all.filter((r) => allowed.includes(r.project_slug))
        const parts = await partsFor(mine)
        const rows = state === 'all' ? mine : mine.filter((r) => r.state === state)
        const items = rows.map((r) => shape(r, parts[`${r.project_slug} ${r.part_key}`]))
        return res.status(200).json({
          view: 'queue', clients: allowed, state,
          items, by_person: byPerson(items), counts: counts(mine),
        })
      }

      const client = String(req.query.client || '').trim()
      if (!client) {
        return res.status(400).json({ error: 'client is required, or view=queue, or id' })
      }
      await verifyProjectAccess(client, req)
      const mine = await sb(
        `/prepared_messages?select=*&project_slug=eq.${encodeURIComponent(client)}` +
        `&order=prepared_at.desc`
      )
      const parts = await partsFor(mine)
      const rows = state === 'all' ? mine : mine.filter((r) => r.state === state)
      const items = rows.map((r) => shape(r, parts[`${r.project_slug} ${r.part_key}`]))
      return res.status(200).json({
        client, state, items, by_person: byPerson(items), counts: counts(mine),
      })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { action } = body

      // ONE gate before any action, resolved from the ROW rather than the body,
      // so an item id can never be a way round the client gate.
      const itemId = String(body.id || '').trim()
      if (!itemId) return res.status(400).json({ error: 'id is required' })
      const item = await findItem(itemId)
      if (!item) return res.status(404).json({ error: 'prepared item not found' })
      const who = await verifyProjectAccess(item.project_slug, req)
      const actor = who.userName || who.email || 'Unknown'

      const parts = await partsFor([item])
      const part = parts[`${item.project_slug} ${item.part_key}`] || null

      // ---- send it ------------------------------------------------------
      //
      // READ THIS BEFORE ADDING ANYTHING TO IT. This action does not send. It
      // records that the operator did, and files the consequence on the board.
      // The moment something here starts speaking to a client — a mail call, a
      // webhook, an SMS — the safety property that got this feature approved is
      // gone, and it is gone silently, because every test in this file would
      // still pass.
      if (action === 'send') {
        if (item.state !== 'waiting') {
          return res.status(409).json({
            error: item.state === 'sent'
              ? `This was already released by ${item.sent_by} on ${String(item.sent_at).slice(0, 10)}.`
              : 'You have already answered this one. The next draft comes from the record.',
            state: item.state,
          })
        }
        const via = String(body.via || '').trim()
        if (!CHANNELS.includes(via)) {
          return res.status(400).json({
            error: `via is required and must be one of ${CHANNELS.join(', ')}. ` +
                   'The board cannot see how a message left the building, and ' +
                   'guessing would be a claim wider than anything it observed.',
          })
        }
        const noteProblem = tooLongProblem(body.note, 'note', MAX_SENT_NOTE,
          'a line about how it went, not a transcript')
        if (noteProblem) return res.status(400).json({ error: noteProblem })

        const now = new Date().toISOString()
        const rows = await sb(`/prepared_messages?id=eq.${encodeURIComponent(item.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            state: 'sent', sent_at: now, sent_by: actor, sent_via: via,
            sent_note: (body.note && String(body.note).trim()) || null,
          }),
        })

        // FILE THE CONSEQUENCE. An ask that has gone out is a chase we are now
        // waiting on, which is what puts it in the client's column on the day
        // view and what makes the follow-up possible five days later. Written
        // as the PAIR the board requires — a name with a date, never half of
        // one — and only when nothing is already recorded, because overwriting
        // an existing wait would move a date that means something.
        let waitingRecorded = null
        if (part && !part.waiting_on && item.kind !== 'change_notice') {
          await sb(`/client_parts?id=eq.${encodeURIComponent(part.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ waiting_on: item.to_name, waiting_since: now }),
          })
          waitingRecorded = { waiting_on: item.to_name, waiting_since: now }
        }

        const evidence = await recordOnPart(part, actor,
          `${actor} sent the prepared message to ${item.to_name}` +
          (waitingRecorded ? `, and we are now waiting on ${item.to_name}` : '') +
          ((body.note && String(body.note).trim()) ? ` — ${String(body.note).trim()}` : ''),
          `Released from the steward queue, ${via.replace('_', ' ')}`)

        return res.status(200).json({
          ok: true,
          item: shape(rows[0], part),
          waiting_recorded: waitingRecorded,
          evidence,
          // Said out loud in the response so no caller can quietly come to
          // believe otherwise. The board has no transport; the operator does.
          transport: 'none',
          note: 'Recorded. This board did not send anything — it has no way to. ' +
                'This is the record that you did.',
        })
      }

      // ---- give feedback on it -------------------------------------------
      // The real one. See the header: this writes corrections through onto the
      // part, which is what makes the NEXT draft different.
      if (action === 'feedback') {
        if (item.state === 'sent') {
          return res.status(409).json({
            error: `This was already released by ${item.sent_by} on ${String(item.sent_at).slice(0, 10)}. ` +
                   'Feedback shapes the next draft; it cannot recall a message.',
          })
        }
        const note = String(body.feedback == null ? '' : body.feedback).trim()
        if (!note) {
          return res.status(400).json({
            error: 'feedback is required: say what is wrong with it. This is the ' +
                   'input the next draft is built from, not a dismiss button.',
          })
        }
        const noteProblem = tooLongProblem(note, 'feedback', MAX_FEEDBACK,
          'a note, not a document')
        if (noteProblem) return res.status(400).json({ error: noteProblem })

        const apply = body.apply && typeof body.apply === 'object' ? body.apply : {}
        for (const [f, max, what] of [
          ['to_name', MAX_NAME, 'a name, not a note'],
          ['chase_ask', MAX_CHASE_ASK, 'one sentence naming the thing to ask for'],
          ['why_it_matters', MAX_WHY_IT_MATTERS,
            'one sentence saying what this costs the client'],
        ]) {
          const problem = tooLongProblem(apply[f], f, max, what)
          if (problem) return res.status(400).json({ error: problem })
        }

        let holdUntil = null
        if (apply.hold_days != null && apply.hold_days !== '') {
          const days = Number(apply.hold_days)
          if (!Number.isInteger(days) || days < 1 || days > MAX_HOLD_DAYS) {
            return res.status(400).json({
              error: `hold_days must be a whole number of days between 1 and ${MAX_HOLD_DAYS}. ` +
                     'Longer than that is not a reminder, it is a decision, and a ' +
                     'decision belongs on the part.',
            })
          }
          holdUntil = new Date(Date.now() + days * 86400000).toISOString()
        }

        // THE CORRECTIONS, onto the part the draft is derived from.
        //
        // to_name is the one with a fork in it, and it is worth stating. If the
        // board already records that we are WAITING on someone, the name to fix
        // is that one — the ask really did go out on that date, we simply had
        // the wrong person written down, so waiting_since is left exactly where
        // it is. Otherwise the name belongs on chase_from, which is where the
        // ask draft reads it from.
        const patch = {}
        const changes = []
        if (part && apply.to_name && String(apply.to_name).trim()) {
          const name = String(apply.to_name).trim()
          if (part.waiting_on) { patch.waiting_on = name; changes.push(`waiting_on -> ${name}`) }
          else { patch.chase_from = name; changes.push(`chase_from -> ${name}`) }
        }
        for (const f of ['chase_ask', 'why_it_matters']) {
          if (part && apply[f] != null && String(apply[f]).trim()) {
            patch[f] = String(apply[f]).trim()
            changes.push(`${f} -> ${patch[f]}`)
          }
        }
        if (Object.keys(patch).length) {
          await sb(`/client_parts?id=eq.${encodeURIComponent(part.id)}`, {
            method: 'PATCH', body: JSON.stringify(patch),
          })
        }

        const rows = await sb(`/prepared_messages?id=eq.${encodeURIComponent(item.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            state: 'feedback', feedback: note,
            feedback_at: new Date().toISOString(), feedback_by: actor,
            hold_until: holdUntil,
          }),
        })

        const evidence = await recordOnPart(part, actor,
          `${actor} gave feedback on the prepared message to ${item.to_name}: ${note}` +
          (changes.length ? ` (${changes.join(', ')})` : ''),
          'Feedback on the steward queue')

        // Told plainly, because the honest answer is sometimes "nothing will
        // happen next", and a queue that implies otherwise is the nag.
        const next = changes.length
          ? 'The record changed, so the next run will prepare a new draft from it.'
          : holdUntil
            ? `Held until ${holdUntil.slice(0, 10)}. Nothing new will be prepared before then.`
            : 'Nothing underneath this changed, so nothing new will be prepared. ' +
              'Correct the ask or set a hold if you want a different draft.'

        return res.status(200).json({
          ok: true, item: shape(rows[0], part), applied: changes, evidence, next,
        })
      }

      return res.status(400).json({ error: 'unknown action' })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    if (e instanceof TenantAuthError) {
      return res.status(e.status || 403).json({ error: String(e.message), auth: false })
    }
    return res.status(e.status || 500).json({ error: String(e.message || e) })
  }
}
