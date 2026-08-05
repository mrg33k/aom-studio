// /api/client-parts — the Client Engine board's read/write path.
//
//   GET  /api/client-parts?client=wolfpack   -> { parts[], evidence{part_key:[...]},
//                                               settings, next_meeting, counts }
//   GET  /api/client-parts?view=day          -> the cross-client three buckets
//   GET  /api/client-parts?view=chase        -> the never-checked parts, grouped by
//                                               client, with what to ask for
//   POST /api/client-parts                   -> move a part (claim / release /
//                                               mark_done / mark_waiting), update it,
//                                               append evidence, or set the meeting
//
// The service key stays server-side; the board is a static page and must never
// hold it. This is the only reason the endpoint exists rather than the page
// talking to PostgREST directly.
//
// THE RECEIPT RULE is enforced in the database by `verified_needs_a_receipt`
// (see supabase/migrations/20260803000001_client_engine_parts.sql). We check it
// here too, so callers get a readable error instead of a raw Postgres 400 —
// but the database is the authority. If this file and the constraint ever
// disagree, the constraint wins and that is deliberate.
//
// ── AUTH (2026-08-03) — WHY THIS ENDPOINT IS GATED ─────────────────────────
// This file shipped with no auth of any kind, and the board it serves
// (/client-engine/) is a static page that is NOT in middleware.js's matcher —
// so it is world-readable with no sign-in. It had never been deployed, which is
// the only reason nothing leaked. Deploying it ungated would have published:
//
//   READ   every gap, every "cannot see", every access state and status note for
//          every AOM client — the client book, to anyone who guesses the URL.
//   WRITE  POST is the same door. `set_autonomy {enabled:true}` followed by
//          `approve_orders` is two anonymous requests, and those two fields are
//          the ENTIRE consent gate Patrik asked for by name ("I don't want the
//          projects to start doing things on auto until I click a toggle").
//          An unauthenticated POST does not weaken that gate, it deletes it.
//
// So every path here runs verifyProjectAccess(client, req) — the same vetted
// decision function the rest of /api/dashboard/* uses, NOT a bespoke check.
// It reads the JWT from the Authorization header OR the `sb-*-auth-token`
// cookie, which is why the static board keeps working unchanged: same origin,
// so the browser sends the session cookie on fetch. Signed in, it just works;
// signed out, it says so instead of rendering a client's private state.
//
// ACTOR IS DERIVED, NEVER ACCEPTED. `actor` used to come from the request body
// defaulting to 'Patrik', so any caller could write a trail line signed by him —
// into the one field the next agent reads specifically to avoid contradicting
// something Patrik fixed. A forged attribution there is durable misinformation
// aimed at the source of truth, so the name now comes from the verified JWT and
// the body's `actor` is ignored.
//
// ── ACTING ON A PART (2026-08-04) ──────────────────────────────────────────
// Until now every card on the board dead-ended in a sentence — "Request the
// merge so calls and reviews land on one listing" — with no control under it.
// A morning tool you cannot close anything out of is a reading exercise, so
// four actions move a part:
//
//   claim         take it: owner := the verified caller
//   release       put it back: owner := null
//   mark_done     state := completed, WITH a receipt (see below)
//   mark_waiting  record the chase: WHO we are waiting on, and SINCE WHEN
//
// TWO LINES THESE ACTIONS DO NOT CROSS, because the board's credibility is the
// product and both are cheap to erode by accident:
//
//   1. A PERSON NEVER WRITES 'verified'. Every line these actions leave is
//      actor_kind 'person', confidence 'reported' — hardcoded in recordAction()
//      rather than passed in, so no future action can quietly write green with
//      a machine's authority. `verified` means a machine fetched something and
//      the artifact is what it fetched; a human saying "I did it" is a report,
//      however true. The database's verified_needs_a_receipt constraint is the
//      floor under that, not the whole of it.
//   2. mark_done NEVER STAMPS checked_at. checked_at answers "has a machine
//      ever looked at this", which is the number the board tells the truth with
//      on its own front page ("2 of 38 parts have ever been machine-checked").
//      If finishing work moved that counter, the honesty counter would measure
//      activity instead of verification and the whole line becomes a lie.
//
// mark_done still REQUIRES a receipt — an artifact_url or an exact quote —
// because green with nothing behind it is the precise shape of claim this
// board exists to make impossible.
//
// ── WHAT IT COSTS, WHAT TO ASK FOR, AND A MEETING THAT ENDS (2026-08-05) ───
// Three things the screens needed and the read path could not give them.
//
//   why_it_matters   Every card states a technical finding — "two listings
//                    exist under different names" — and stops. The product's
//                    own rule is that a card which only says "needs attention"
//                    is a failed card: it has to say what the finding COSTS, in
//                    the client's money terms. On every part, on every read
//                    path, seeded per part in migration 20260805000001.
//
//   ?view=chase      36 of 38 parts have never been machine-checked because no
//                    address was ever recorded. That number has been inert
//                    since the day the check first ran. This view turns it into
//                    a list: grouped by client, each row carrying the specific
//                    thing to ask for and, where the record names one, the
//                    person to ask. Split into ASK and NO-ASK, because only 12
//                    of the 36 have anything a client could hand over — the
//                    other 24 (photography, case studies, the capability
//                    folder) cannot be read from outside by anything, ever, and
//                    listing them as chases would send Patrik to Ross asking
//                    for the address of a photo shoot.
//
//   next_meeting     The client page reads a hardcoded "Thursday 7 Aug,
//                    10:00am · Ross, site walk" out of a literal in index.html.
//                    On 8 Aug that is a past meeting presented as upcoming, and
//                    it stays that way forever. Patrik's call: expire it. The
//                    API serves it WITH its date and serves null the moment the
//                    date has passed. It may go stale; it can no longer lie.
//                    Not a calendar integration — one hand-entered value per
//                    client, beside the autonomy toggle, with a writer.
//
// The chase view does NOT restate why a part cannot be checked. The nightly
// check already wrote that, per part, in its own words, with the date it
// looked; this reads it off the evidence trail. One implementation of "why can
// this not be checked", owned by the thing that actually tried — the same
// reason request_check dispatches the Python checker instead of re-implementing
// a check in JS.
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

const STATES = ['completed', 'needs', 'blocked', 'cannot']
const CONNECTIONS = [
  'connected', 'wrong_level', 'pending', 'expired', 'never_asked', 'not_applicable',
]
const CONFIDENCES = ['verified', 'inferred', 'reported']
const ARTIFACT_KINDS = ['capture', 'link', 'quote', 'number']
// A name typed into "who are we waiting on". Long enough for "Ross's office
// manager", short enough that the field cannot become a paragraph — the note
// belongs on the evidence trail, which is where the reason already lives.
const MAX_WAITING_ON = 120

// why_it_matters and chase_ask are SENTENCES, not notes. Capped so they stay
// one, because a paragraph in either does not just break the card — it gets
// truncated on screen, and a half-sentence about what something costs is worse
// than no sentence at all. chase_from is a name, so it takes the same ceiling
// as waiting_on. These mirror the CHECK constraints added in migration
// 20260805000001; the database is the authority and these exist so a caller
// gets a readable refusal instead of a raw Postgres 400.
const MAX_WHY_IT_MATTERS = 240
const MAX_CHASE_ASK = 240
const MAX_CHASE_FROM = MAX_WAITING_ON
// "Ross, site walk" — who and what, not an agenda.
const MAX_MEETING_LABEL = 120

// Every client is in Phoenix and so is the agency. Arizona does not observe
// daylight saving, so the offset is -07:00 every day of the year — which is the
// only reason a fixed offset is honest here rather than a latent one-hour bug
// twice a year. The moment a client sits outside Arizona this needs a real
// timezone, not a bigger constant.
const PHOENIX_TZ = 'America/Phoenix'
const PHOENIX_OFFSET = '-07:00'

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

function today() {
  return new Date().toISOString().slice(0, 10)
}

// TWO gates, both must be open before an agent may change anything.
//   1. autonomy_enabled — Patrik switched this client on, once.
//   2. orders_approved_for === today — he approved TODAY's list, after cuts.
// Consent is never open-ended: approving Monday's work does not authorise Tuesday's.
function mayActNow(settings) {
  if (!settings || !settings.autonomy_enabled) return false
  return settings.orders_approved_for === today()
}

// deep_link is the address the nightly check OPENS, unattended, on a machine
// holding the service key, and artifact_url is what the board renders as "see
// the receipt". Both must be somewhere on the public web. Stated once here
// because update_part and mark_done both write one, and a rule enforced in one
// of two writers is not enforced. Returns a readable problem, or null when the
// value is fine (including absent — absence is not a problem, it is a null).
function webAddressProblem(value, field) {
  if (value == null || value === '') return null
  let u
  try {
    u = new URL(String(value))
  } catch {
    return `${field} must be a full web address`
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return `${field} must be an http or https address, not ${u.protocol.replace(':', '')}`
  }
  return null
}

// Same shape as webAddressProblem: a readable problem, or null when the value
// is fine (absent included). Stated once because update_part and set_meeting
// both write length-capped text, and a rule enforced in one of two writers is
// not enforced.
function tooLongProblem(value, field, max, what) {
  if (value == null || value === '') return null
  if (String(value).length > max) {
    return `${field} must be ${max} characters or fewer — it is ${what}.`
  }
  return null
}

// ── THE MEETING ────────────────────────────────────────────────────────────
// A date the board may show only while it is still ahead of us.
//
// EXPIRY IS AT THE START TIME, not some grace window after it. A window would
// be an invented number, and "next meeting" stops being true the moment the
// meeting begins. 10:01 on the day is not a lie about a future meeting; it is
// a lie about which meeting is next.

// "Friday 7 Aug, 10:00am", rendered in Phoenix. Returns null rather than
// throwing if the runtime's Intl cannot do timezones — the caller still gets
// the ISO instant, which is the authoritative half, and the UI can format it.
function phoenixWhen(iso) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: PHOENIX_TZ, weekday: 'long', day: 'numeric', month: 'short',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }).formatToParts(d).map((x) => [x.type, x.value])
    )
    if (!p.weekday || !p.day || !p.month || !p.hour) return null
    // ICU emits AM/PM, am/pm, or a.m. depending on version, sometimes preceded
    // by a narrow no-break space. Normalise rather than trust one of them.
    const half = String(p.dayPeriod || '').toLowerCase().replace(/[\s.\u00a0\u202f]/g, '')
    return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute}${half}`
  } catch {
    return null
  }
}

// null when there is no meeting recorded AND null when the recorded one has
// passed. Deliberately the same answer: in both cases there is nothing true to
// put on screen, and the board has no state for "there used to be one".
function nextMeeting(settings) {
  const at = settings?.next_meeting_at
  if (!at) return null
  const t = new Date(at).getTime()
  if (Number.isNaN(t) || t <= Date.now()) return null
  return {
    at: new Date(t).toISOString(),
    when: phoenixWhen(at),
    label: settings.next_meeting_label || null,
    timezone: PHOENIX_TZ,
    set_at: settings.next_meeting_set_at || null,
    set_by: settings.next_meeting_set_by || null,
  }
}

// A date input that is unambiguous, without demanding the caller type an
// offset. Two accepted shapes, and the distinction matters because Node parses
// a bare "2026-08-14T10:00" as the SERVER's local time — which on Vercel is
// UTC, so a 10am site walk would silently be stored as 3am Phoenix.
//   with an offset or Z   taken as the instant it names
//   bare YYYY-MM-DDTHH:MM read as Phoenix local, which is what a person typing
//                         a meeting time into this tool means
function parseMeetingAt(raw) {
  const s = String(raw == null ? '' : raw).trim()
  if (!s) return { error: 'at is required: the date and time of the meeting.' }
  const bare = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(s)
  const d = new Date(bare ? `${s.replace(' ', 'T')}${PHOENIX_OFFSET}` : s)
  if (Number.isNaN(d.getTime())) {
    return { error: 'at must be a date and time, e.g. 2026-08-14T10:00 (read as Phoenix time).' }
  }
  return { at: d }
}

// HOW MANY OTHER PARTS THIS ONE HOLDS UP.
//
// The single most valuable fact in the product and, until now, the most buried:
// the part page writes "While this is open, 3 other parts cannot be fixed" from
// `blocks`, and no other screen can see it. The day view therefore shows 23
// identical amber rows in no order, and nothing on screen says which of the 23
// to do first. This is the field it sorts on.
//
// A key is counted ONLY when it resolves to a part that actually exists for the
// same client — the same resolution the part page does before it names them.
// A dangling key is a typo, not a dependency, and counting it would inflate the
// exact number the ranking is built on. Two counts because they answer two
// different questions and both are real:
//   blocks_count       what the part page's sentence says
//   blocks_open_count  how many of those are not already finished — the honest
//                      "what does doing this actually free up" for sorting
// Keyed by client too, so this is correct on the cross-client day view where
// two clients own a part_key of the same name. The separator is a space, and a
// space is safe because both halves are kebab-case identifiers that cannot
// contain one. It was a raw NUL byte until 2026-08-04 -- two unprintable 0x00s
// sitting in the source. It RAN, because both the set and the get used the same
// byte, and it survived review because git renders a file as text when the
// first 8000 bytes are clean and both NULs landed at 8773 and 8950. The failure
// mode it was waiting on is the bad one: any formatter, bundler or editor that
// normalises one of the two and not the other makes every lookup miss, every
// count silently fall to zero, and the ranking below sort on nothing at all --
// with no error anywhere. A wrong number that raises nothing is the one defect
// this board cannot carry.
//
// THREE ways a `blocks` array inflates that count if you just take its length,
// all the same mistake -- treating a typed string as a fact about the world:
//   a DANGLING key   names no part. A typo, not something being held up.
//   a DUPLICATE key  is one dependency written twice, not two dependencies.
//   a SELF reference is a part blocking itself. Counted, it lifts that part
//                    above its peers in the one ranking the day view sorts on.
// Exported for the unit tests, which build all three shapes in memory rather
// than writing a fake dependency onto a real client's row. Only the default
// export is routed, so this is invisible to the board.
export function withBlockCounts(parts) {
  const byKey = new Map()
  for (const p of parts) byKey.set(`${p.project_slug} ${p.part_key}`, p)
  return parts.map((p) => {
    const keys = Array.isArray(p.blocks) ? p.blocks : []
    const resolved = [...new Set(keys)]
      .filter((k) => k !== p.part_key)
      .map((k) => byKey.get(`${p.project_slug} ${k}`))
      .filter(Boolean)
    return {
      ...p,
      blocks_count: resolved.length,
      blocks_open_count: resolved.filter((d) => d.state !== 'completed').length,
    }
  })
}

// One part, scoped to the client the caller was already verified against.
async function findPart(client, partKey) {
  const rows = await sb(
    `/client_parts?select=*&project_slug=eq.${encodeURIComponent(client)}` +
    `&part_key=eq.${encodeURIComponent(partKey)}&limit=1`
  )
  return rows[0] || null
}

// By id, and only ever with a row already fetched through findPart() — so the
// client scope that authorised the write is the one that found the row.
async function patchPart(id, update) {
  return sb(`/client_parts?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(update),
  })
}

// The line a human action leaves behind.
//
// actor_kind and confidence are HARDCODED, not parameters, and that is the
// whole point of routing every action through one function. A person acting on
// the board is a person reporting — never a machine verifying — so no action
// added later can write a claim carrying a check's authority just by passing a
// different string. Receipts still ride along (mark_done requires one); what
// they cannot do is upgrade who is talking.
async function recordAction(partId, actor, claim, extra = {}) {
  const rows = await sb('/part_evidence', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{
      part_id: partId,
      actor,
      actor_kind: 'person',
      claim,
      method: extra.method || 'Entered directly on the board',
      artifact_url: extra.artifact_url || null,
      artifact_quote: extra.artifact_quote || null,
      confidence: 'reported',
    }]),
  })
  return rows[0] || null
}

function tally(parts) {
  const t = { total: parts.length, attention: 0, cannot: 0, completed: 0, unchecked: 0 }
  for (const p of parts) {
    if (p.state === 'needs' || p.state === 'blocked') t.attention++
    if (p.state === 'cannot') t.cannot++
    if (p.state === 'completed') t.completed++
    if (!p.checked_at) t.unchecked++
  }
  return t
}

// Every cross-client view answers the same question first: of the clients that
// have parts, which may THIS caller see. One client at a time through the same
// vetted decision function, never a bulk shortcut — a cross-client screen is
// exactly where a bespoke check would quietly show one operator another's book.
// Shared by the day and the chase so a third view cannot be added without it.
async function visibleClients(all, req) {
  const clients = [...new Set(all.map((p) => p.project_slug))]
  const allowed = []
  for (const c of clients) {
    try { await verifyProjectAccess(c, req); allowed.push(c) } catch { /* not yours */ }
  }
  if (!allowed.length) throw new TenantAuthError('jwt required', 401)
  return allowed
}

// WHY A PART HAS NEVER BEEN CHECKED, in the words of the thing that tried.
//
// scripts/client-engine-check.py writes exactly this line, per part, every time
// it goes looking and finds nowhere to look — "Could not check the Google
// listing: no listing address (a Maps link or CID) has ever been recorded, and
// a search link is not a listing." The chase view quotes that rather than
// restating it in JS, for the same reason request_check dispatches the Python
// checker instead of re-implementing a check here: two definitions of "why can
// this not be checked" would drift, and the one on screen would be the wrong one.
//
// Keyed on the METHOD string, not the actor, because the method IS the event —
// "we looked for somewhere to check and found none" — and a second checker
// (the midday pass Patrik asked for) writing the same method should count.
// If that string is ever renamed, this degrades to null: the chase row loses
// its reason line and keeps its ask. Wrong-and-silent is the failure this file
// refuses; absent-and-visible is acceptable.
const NOWHERE_TO_CHECK = 'Looked for somewhere to check, and found none'

async function whyNotChecked(partIds) {
  if (!partIds.length) return {}
  const rows = await sb(
    `/part_evidence?select=part_id,at,claim&part_id=in.(${partIds.join(',')})` +
    `&method=eq.${encodeURIComponent(NOWHERE_TO_CHECK)}&order=at.desc`
  )
  const newest = {}
  for (const r of rows) if (!newest[r.part_id]) newest[r.part_id] = r
  return newest
}

// The client this evidence row belongs to. `dispute` is the one action that
// names no client, so without this it would be the unguarded hole in an
// otherwise gated file: an evidence_id is enough to mark any claim, in any
// client, disputed. Resolve evidence -> part -> project_slug and gate on that.
async function clientForEvidence(evidenceId) {
  const ev = await sb(
    `/part_evidence?select=part_id&id=eq.${encodeURIComponent(evidenceId)}&limit=1`
  )
  if (!ev.length) return null
  const part = await sb(
    `/client_parts?select=project_slug&id=eq.${encodeURIComponent(ev[0].part_id)}&limit=1`
  )
  return part.length ? part[0].project_slug : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured on this deployment' })
  }

  try {
    if (req.method === 'GET') {
      // ── THE DAY (Phase 2) ────────────────────────────────────────────────
      // One screen across every client, because the question at 8am is not
      // "how is Wolfpack" — it is "what needs ME". Three buckets, and the
      // split that matters is between work that is ours and work that is
      // theirs: a part blocked on a client is not a task Patrik can do today,
      // and mixing the two is how a to-do list stops being believed.
      if (String(req.query.view || '') === 'day') {
        const all = await sb('/client_parts?select=*&order=project_slug.asc,sort_order.asc')
        // Scope to what this caller may actually see, one client at a time.
        const allowed = await visibleClients(all, req)
        const mine = withBlockCounts(all.filter((p) => allowed.includes(p.project_slug)))

        // "Waiting on them" is never decided by STATE: a part we cannot move
        // is not a task Patrik can do today, whatever shape the work is in.
        // TWO ways that happens, and the second one used to be invisible here:
        //   ACCESS  we were never given the keys, so no effort of ours moves it.
        //   A CHASE we asked a named human for a thing and are waiting on them.
        //           Photography is the live example — connection not_applicable,
        //           nobody withholding a login, and "waiting on a date from the
        //           owner" sat in the Needs-you column as if it were ours.
        const waiting = (p) =>
          !!p.waiting_on ||
          p.connection === 'never_asked' || p.connection === 'pending' ||
          p.connection === 'wrong_level' || p.connection === 'expired'

        const needsMe = mine.filter((p) => !waiting(p) &&
          (p.state === 'blocked' || p.state === 'needs'))
        const waitingOnClient = mine.filter(waiting)
        const running = mine.filter((p) => p.state === 'completed')

        const shape = (p) => ({
          client: p.project_slug, part_key: p.part_key, name: p.name,
          icon: p.icon, state: p.state, connection: p.connection,
          status_line: p.status_line, suggestion: p.suggestion,
          owner: p.owner, checked_at: p.checked_at, group_name: p.group_name,
          // WHAT IT COSTS. status_line is the finding, suggestion is the fix,
          // and neither says why a busy person should spend the morning on it.
          // This view picks its fields explicitly, so an addition to the read
          // path that is not named here simply never reaches the day — which is
          // how this field would have shipped invisible on the 8am screen.
          why_it_matters: p.why_it_matters || null,
          // what doing this frees up — the day view's ordering key
          blocks_count: p.blocks_count, blocks_open_count: p.blocks_open_count,
          // and, when we are waiting: who, and since when. A row that says
          // "waiting on a client" without naming them is a row nobody chases.
          waiting_on: p.waiting_on || null, waiting_since: p.waiting_since || null,
        })

        let sweep = null
        try {
          const rows = await sb('/routines?select=name,status,last_run_at,last_error' +
                                '&name=eq.com.aom-ea.client-engine-nightly&limit=1')
          sweep = rows[0] || null
        } catch { /* the board must render even if this lookup fails */ }

        return res.status(200).json({
          clients: allowed,
          needs_me: needsMe.map(shape),
          waiting_on_client: waitingOnClient.map(shape),
          running: running.map(shape),
          counts: {
            total: mine.length,
            needs_me: needsMe.length,
            waiting_on_client: waitingOnClient.length,
            running: running.length,
            unchecked: mine.filter((p) => !p.checked_at).length,
            checked: mine.filter((p) => p.checked_at).length,
          },
          sweep,
        })
      }

      // ── THE CHASE ────────────────────────────────────────────────────────
      // "36 of 38 parts have ever been machine-checked" is the most honest line
      // on the board and, until now, the most inert: it has not moved since the
      // first sweep and no screen offers a way to move it. The reason is the
      // same on every one of the 36 — nobody ever wrote down where the thing
      // lives — so the number becomes work the moment each row carries the
      // SPECIFIC thing to ask a named person for.
      //
      // MEMBERSHIP is the pair, not either half: never machine-checked AND no
      // recorded address. Both, because they answer different questions and a
      // future row can satisfy one without the other — an address recorded this
      // morning is not a chase even though tonight's sweep has not run yet, and
      // a part that was checked once has an address by definition. Counting on
      // checked_at alone would put the first back on the list every day.
      //
      // THE SPLIT IS THE PRODUCT. Only 12 of the 36 have anything a client
      // could hand over: a Maps link, a Yelp URL, a LinkedIn address, a Jobber
      // invite at reporting level, a sending mailbox. The other 24 — the photo
      // shoot, the case studies, the capability folder, the target account list
      // — cannot be read from outside by anything and no login changes that.
      // Listing all 36 as chases would be filler, and filler here means walking
      // into Ross's office to ask for the address of a photo shoot. So:
      //   ask     hand this over and a machine can look. Real work, finite.
      //   no_ask  a person judges this and a machine never will. Not a gap.
      // A null chase_ask is therefore a finding, not a field somebody forgot.
      if (String(req.query.view || '') === 'chase') {
        const all = await sb('/client_parts?select=*&order=project_slug.asc,sort_order.asc')
        const allowed = await visibleClients(all, req)
        const mine = withBlockCounts(all.filter((p) => allowed.includes(p.project_slug)))

        const neverChecked = mine.filter((p) => !p.checked_at && !p.deep_link)
        const reasons = await whyNotChecked(neverChecked.map((p) => p.id))

        const shape = (p) => ({
          client: p.project_slug, part_key: p.part_key, name: p.name,
          icon: p.icon, group_name: p.group_name,
          state: p.state, connection: p.connection, access_detail: p.access_detail,
          status_line: p.status_line,
          why_it_matters: p.why_it_matters || null,
          // the exact thing to request, and who to request it from. chase_from
          // is null wherever the record does not already name a person —
          // inventing one would be the same class of lie as inventing a number.
          chase_ask: p.chase_ask || null,
          chase_from: p.chase_from || null,
          // quoted off the trail, in the checker's own words, with the date it
          // last went looking. Not restated here.
          why_not_checked: reasons[p.id]?.claim || null,
          why_not_checked_at: reasons[p.id]?.at || null,
          waiting_on: p.waiting_on || null, waiting_since: p.waiting_since || null,
          blocks_count: p.blocks_count, blocks_open_count: p.blocks_open_count,
        })

        // Same ranking law as the day view: what unblocks the most goes first,
        // then the client's own order. A chase list ordered by nothing is the
        // wall of 23 identical amber rows again, one screen over.
        const rank = (a, b) =>
          (b.blocks_open_count - a.blocks_open_count) ||
          (a.sort_order - b.sort_order)

        const groups = allowed.map((c) => {
          const rows = neverChecked.filter((p) => p.project_slug === c).sort(rank)
          const ask = rows.filter((p) => p.chase_ask).map(shape)
          const noAsk = rows.filter((p) => !p.chase_ask).map(shape)
          return {
            client: c,
            ask,
            no_ask: noAsk,
            counts: { never_checked: rows.length, ask: ask.length, no_ask: noAsk.length },
          }
        // The client you can actually get somewhere with goes first; ties break
        // by name so the order is stable between reloads.
        }).sort((a, b) => (b.counts.ask - a.counts.ask) || a.client.localeCompare(b.client))

        return res.status(200).json({
          view: 'chase',
          clients: allowed,
          groups,
          counts: {
            total: mine.length,
            // Reported separately on purpose. They are the same number today
            // (36 and 36) and the day they diverge is a real event: a part
            // carrying an address that no sweep has ever opened. Collapsing
            // them into one figure would hide it.
            never_checked: mine.filter((p) => !p.checked_at).length,
            no_address: mine.filter((p) => !p.deep_link).length,
            in_chase: neverChecked.length,
            ask: groups.reduce((n, g) => n + g.counts.ask, 0),
            no_ask: groups.reduce((n, g) => n + g.counts.no_ask, 0),
          },
        })
      }

      const client = String(req.query.client || '').trim()
      if (!client) return res.status(400).json({ error: 'client is required' })
      await verifyProjectAccess(client, req)

      const parts = withBlockCounts(await sb(
        `/client_parts?select=*&project_slug=eq.${encodeURIComponent(client)}` +
        `&order=group_name.asc,sort_order.asc`
      ))

      const settingsRows = await sb(
        `/client_engine_settings?select=*&project_slug=eq.${encodeURIComponent(client)}`
      )
      const settings = settingsRows[0] || {
        project_slug: client, autonomy_enabled: false, nightly_check_enabled: true,
        orders_approved_for: null, orders_scope: [],
        next_meeting_at: null, next_meeting_label: null,
      }
      settings.may_act_now = mayActNow(settings)

      // one round trip for every part's evidence, newest first
      let evidence = {}
      if (parts.length) {
        const ids = parts.map((p) => p.id).join(',')
        const rows = await sb(
          `/part_evidence?select=*&part_id=in.(${ids})&order=at.desc`
        )
        const byId = Object.fromEntries(parts.map((p) => [p.id, p.part_key]))
        for (const r of rows) {
          const key = byId[r.part_id]
          if (!key) continue
          ;(evidence[key] ||= []).push(r)
        }
      }

      // THE MEETING, ONLY WHILE IT IS STILL TRUE.
      //
      // A top-level field rather than something the caller digs out of
      // settings, because the rule lives here and not on the screen: the board
      // showed a hardcoded "Thursday 7 Aug, 10:00am" that would have become a
      // past meeting presented as upcoming on 8 Aug and stayed that way
      // forever. If the expiry were the UI's job, the next surface to render a
      // meeting would have to remember it, and one of them would not.
      //
      // null means "nothing to put on screen" and covers both "no meeting has
      // ever been set" and "the last one has been and gone". The board has no
      // honest third thing to say, and inventing one — a stale badge, a
      // "rebook" prompt nobody asked for — is how a fact becomes a nag.
      return res.status(200).json({
        client, parts, evidence, settings,
        next_meeting: nextMeeting(settings),
        counts: tally(parts),
      })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { action } = body

      // ONE gate, before any action runs, so a new action cannot be added later
      // without one. `dispute` names no client, so it is resolved from the
      // evidence row first; everything else carries `client` directly.
      // Named scopeClient, not scope: `approve_orders` destructures its OWN
      // `scope` (the part_key list) out of the body and would shadow this one.
      const scopeClient =
        action === 'dispute'
          ? await clientForEvidence(String(body.evidence_id || '').trim())
          : String(body.client || '').trim()
      if (!scopeClient) {
        return res.status(400).json({
          error: action === 'dispute' ? 'evidence not found' : 'client is required',
        })
      }
      const who = await verifyProjectAccess(scopeClient, req)
      // The trail's signature. Derived from the verified session, never the body.
      const actor = who.userName || who.email || 'Unknown'

      // ---- update a part's state / access / owner -------------------------
      if (action === 'update_part') {
        const { part_key, patch = {} } = body
        if (!part_key) {
          return res.status(400).json({ error: 'part_key is required' })
        }
        if (patch.state && !STATES.includes(patch.state)) {
          return res.status(400).json({ error: `state must be one of ${STATES.join(', ')}` })
        }
        if (patch.connection && !CONNECTIONS.includes(patch.connection)) {
          return res.status(400).json({ error: `connection must be one of ${CONNECTIONS.join(', ')}` })
        }
        // deep_link is the address the nightly check OPENS, unattended, on a
        // machine holding the service key. An operator who could write
        // "file:///.../.env" here would be aiming that job at whatever they
        // liked and reading the result back off the evidence trail. The checker
        // refuses non-public targets too; this is the same rule stated at the
        // point of writing, so a bad address never gets stored in the first place.
        for (const f of ['deep_link', 'artifact_url']) {
          const problem = webAddressProblem(patch[f], f)
          if (problem) return res.status(400).json({ error: problem })
        }
        // Sentences stay sentences and names stay names. The migration puts the
        // same ceilings on the columns; this is the readable half of the pair.
        for (const [f, max, what] of [
          ['why_it_matters', MAX_WHY_IT_MATTERS, 'one sentence saying what this costs the client'],
          ['chase_ask', MAX_CHASE_ASK, 'one sentence naming the thing to ask for'],
          ['chase_from', MAX_CHASE_FROM, 'a name, not a note'],
        ]) {
          const problem = tooLongProblem(patch[f], f, max, what)
          if (problem) return res.status(400).json({ error: problem })
        }

        // waiting_on / waiting_since are deliberately NOT here. They are a pair
        // — a date with no name, or a name with no date, is half a record — and
        // a general patch endpoint cannot enforce a pair. mark_waiting writes
        // both together or neither, and is the only writer.
        //
        // why_it_matters / chase_ask / chase_from ARE here, and are patchable
        // one at a time, because they are independent sentences with no pair
        // invariant between them — and because the seeded ones are a first
        // draft. Patrik knowing something truer about what a gap costs his
        // client, with no way to type it, is how a field goes stale and then
        // gets ignored. Every correction leaves the same attributed trail line
        // as any other, so the next agent reads it before it re-checks.
        const allowed = [
          'state', 'connection', 'access_detail', 'access_verified_at',
          'status_line', 'suggestion', 'owner', 'deep_link',
          'artifact_url', 'artifact_kind', 'artifact_at', 'checked_at',
          'why_it_matters', 'chase_ask', 'chase_from',
        ]
        const update = {}
        for (const k of allowed) if (k in patch) update[k] = patch[k]
        if (!Object.keys(update).length) {
          return res.status(400).json({ error: 'nothing to update' })
        }
        // a human changing access is itself a verification of it
        if ('connection' in update && !('access_verified_at' in update)) {
          update.access_verified_at = new Date().toISOString()
        }

        const rows = await sb(
          `/client_parts?project_slug=eq.${encodeURIComponent(scopeClient)}` +
          `&part_key=eq.${encodeURIComponent(part_key)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(update),
          }
        )
        if (!rows.length) return res.status(404).json({ error: 'part not found' })

        // every human correction leaves a dated, attributed line in the trail,
        // so the next agent reads it before it re-checks and cannot contradict it
        const changed = Object.entries(update)
          .filter(([k]) => k !== 'access_verified_at')
          .map(([k, v]) => `${k} -> ${v}`)
          .join(', ')
        await sb('/part_evidence', {
          method: 'POST',
          body: JSON.stringify([{
            part_id: rows[0].id,
            actor,
            actor_kind: 'person',
            claim: `Corrected by ${actor}: ${changed}`,
            method: 'Entered directly on the board',
            artifact_url: null,
            artifact_quote: null,
            confidence: 'reported',
          }]),
        })

        return res.status(200).json({ ok: true, part: rows[0] })
      }

      // ---- take it ---------------------------------------------------------
      // Owner comes from the verified session, exactly like the trail's
      // signature does, so "claim" cannot be used to put someone else's name on
      // work they never agreed to do. A body-supplied `owner` is ignored here
      // the same way a body-supplied `actor` is.
      //
      // An owned part is not silently reassignable. Two people who both believe
      // they own the Google merge is the failure this field exists to prevent,
      // so taking work off someone is a deliberate act (takeover: true) and it
      // says whose it was, in the trail, in their name.
      if (action === 'claim') {
        const { part_key, takeover = false } = body
        if (!part_key) return res.status(400).json({ error: 'part_key is required' })
        const part = await findPart(scopeClient, part_key)
        if (!part) return res.status(404).json({ error: 'part not found' })

        // Already yours. Idempotent on purpose — a double click is not an
        // event, and it must not put a second identical line on the trail.
        if (part.owner && part.owner === actor) {
          return res.status(200).json({ ok: true, already: true, part })
        }
        if (part.owner && !takeover) {
          return res.status(409).json({
            error: `${part.owner} already has this. Pass takeover: true to take it from them.`,
            owner: part.owner,
          })
        }

        const rows = await patchPart(part.id, { owner: actor })
        await recordAction(part.id, actor,
          part.owner ? `Taken over by ${actor}, was ${part.owner}` : `Claimed by ${actor}`,
          { method: 'Claimed on the board' })
        return res.status(200).json({ ok: true, part: rows[0] })
      }

      // ---- put it back -----------------------------------------------------
      // Anyone who can reach the client can release, including work that is not
      // theirs — someone leaves, someone is on site, and an item frozen under a
      // name nobody can clear is worse than an unowned one. The accountability
      // is the trail line, which names both the releaser and who held it.
      if (action === 'release') {
        const { part_key } = body
        if (!part_key) return res.status(400).json({ error: 'part_key is required' })
        const part = await findPart(scopeClient, part_key)
        if (!part) return res.status(404).json({ error: 'part not found' })
        if (!part.owner) {
          return res.status(200).json({ ok: true, already: true, part })
        }

        const rows = await patchPart(part.id, { owner: null })
        await recordAction(part.id, actor,
          part.owner === actor
            ? `Released by ${actor}`
            : `Released by ${actor}, was ${part.owner}`,
          { method: 'Released on the board' })
        return res.status(200).json({ ok: true, part: rows[0], released_from: part.owner })
      }

      // ---- mark it done ----------------------------------------------------
      // The one action that writes green, so it is the one that has to be
      // hardest to abuse. Three rules, and each of them is a thing the board
      // would otherwise start lying about:
      //
      //   A RECEIPT IS REQUIRED. artifact_url or artifact_quote — something a
      //   person can open or read. "Nothing renders verified without a receipt"
      //   is the sentence the whole product rests on, and a green card with an
      //   empty trail behind it is exactly the claim it forbids. 422, the same
      //   readable refusal add_evidence gives, not a raw constraint error.
      //
      //   IT IS STILL A REPORT, NOT A VERIFICATION. recordAction writes person
      //   / reported. The receipt makes the claim checkable; it does not make a
      //   human into the nightly check.
      //
      //   checked_at IS NOT TOUCHED. "2 of 38 parts have ever been machine
      //   checked" is on the front page. If finishing work moved that number it
      //   would measure how busy we were instead of what has been looked at,
      //   and the most honest line on the board becomes its most misleading one.
      if (action === 'mark_done') {
        const { part_key, note, artifact_url = null, artifact_quote = null,
                artifact_kind } = body
        if (!part_key) return res.status(400).json({ error: 'part_key is required' })
        if (!artifact_url && !artifact_quote) {
          return res.status(422).json({
            error: 'Marking a part done needs a receipt: pass artifact_url (something ' +
                   'to open) or artifact_quote (the exact text you saw). Nothing on ' +
                   'this board goes green on somebody\'s word alone.',
          })
        }
        const problem = webAddressProblem(artifact_url, 'artifact_url')
        if (problem) return res.status(400).json({ error: problem })

        const part = await findPart(scopeClient, part_key)
        if (!part) return res.status(404).json({ error: 'part not found' })

        const update = { state: 'completed' }
        // The part carries ONE current artifact, replaced not appended; the
        // history is the trail. A quote-only receipt has nowhere to live on the
        // part row, so it stays on the trail line and the part keeps whatever
        // artifact it already had rather than being blanked.
        if (artifact_url) {
          update.artifact_url = artifact_url
          update.artifact_kind = ARTIFACT_KINDS.includes(artifact_kind) ? artifact_kind : 'link'
          update.artifact_at = new Date().toISOString()
        }
        // Done and still "waiting on Robert" is a contradiction on screen, and
        // the day view would keep it in their column forever.
        const wasWaitingOn = part.waiting_on || null
        if (wasWaitingOn) {
          update.waiting_on = null
          update.waiting_since = null
        }

        const rows = await patchPart(part.id, update)
        const evidence = await recordAction(part.id, actor,
          (note && String(note).trim()) || `Marked done by ${actor}`,
          {
            method: wasWaitingOn
              ? `Marked done on the board, no longer waiting on ${wasWaitingOn}`
              : 'Marked done on the board',
            artifact_url,
            artifact_quote,
          })
        return res.status(200).json({ ok: true, part: rows[0], evidence })
      }

      // ---- waiting on the client -------------------------------------------
      // A chase with no name and no date is not a record, it is a feeling: by
      // Thursday nobody remembers who was asked or when, so it gets asked again
      // or never. WHO is required. SINCE defaults to now and may be backdated to
      // when the ask actually went out — but never forward, because you cannot
      // have started waiting tomorrow.
      //
      // STATE IS NOT TOUCHED. Waiting is its own axis, like access: a part can
      // be blocked AND waiting on Robert. Folding it into state would need a
      // fifth state, and the nearest one would swallow "blocked" — which means
      // something precise here (another part must be fixed first) and carries
      // the dependency logic the whole board sorts on.
      //
      // { clear: true } ends the wait — the same action owning both ends of the
      // same axis, the way set_autonomy owns its toggle.
      if (action === 'mark_waiting') {
        const { part_key, waiting_on, since, note, clear = false } = body
        if (!part_key) return res.status(400).json({ error: 'part_key is required' })
        const part = await findPart(scopeClient, part_key)
        if (!part) return res.status(404).json({ error: 'part not found' })

        if (clear) {
          if (!part.waiting_on) {
            return res.status(200).json({ ok: true, already: true, part })
          }
          const cleared = await patchPart(part.id, { waiting_on: null, waiting_since: null })
          const evidence = await recordAction(part.id, actor,
            `No longer waiting on ${part.waiting_on}` +
            (note && String(note).trim() ? ` — ${String(note).trim()}` : ''),
            { method: 'Cleared on the board' })
          return res.status(200).json({ ok: true, part: cleared[0], evidence })
        }

        // NOT named `who`: the verified session object is `who` in the enclosing
        // scope, and this is the person on the OTHER end. Same reason `scopeClient`
        // is not named `scope`. Shadowing it here would also arm a TDZ trap for
        // whoever next reads the session at the top of this block.
        const person = String(waiting_on == null ? '' : waiting_on).trim()
        if (!person) {
          return res.status(400).json({
            error: 'waiting_on is required: name the person we are waiting on. ' +
                   'A row that says "waiting on a client" without naming them is a ' +
                   'row nobody ever chases.',
          })
        }
        if (person.length > MAX_WAITING_ON) {
          return res.status(400).json({
            error: `waiting_on must be ${MAX_WAITING_ON} characters or fewer — it is a ` +
                   'name, not a note. Put the detail in note.',
          })
        }

        let waitingSince = new Date()
        if (since != null && since !== '') {
          const parsed = new Date(since)
          if (Number.isNaN(parsed.getTime())) {
            return res.status(400).json({ error: 'since must be a date, e.g. 2026-08-01' })
          }
          // A minute of slack for clock skew between the browser and here.
          if (parsed.getTime() > Date.now() + 60000) {
            return res.status(400).json({
              error: 'since cannot be in the future — a wait starts when the ask went out.',
            })
          }
          waitingSince = parsed
        }

        const rows = await patchPart(part.id, {
          waiting_on: person,
          waiting_since: waitingSince.toISOString(),
        })
        const evidence = await recordAction(part.id, actor,
          `Waiting on ${person} since ${waitingSince.toISOString().slice(0, 10)}` +
          (note && String(note).trim() ? ` — ${String(note).trim()}` : ''),
          { method: 'Marked waiting on the board' })
        return res.status(200).json({ ok: true, part: rows[0], evidence })
      }

      // ---- append evidence ------------------------------------------------
      if (action === 'add_evidence') {
        // actor_kind still describes WHAT is claiming (a person typing on the
        // board vs an assistant reporting a check), but the NAME is the verified
        // session either way. Every caller today is an authenticated human;
        // when the real re-check lands it needs its own service credential
        // rather than the ability to sign a claim with an arbitrary name.
        const { part_key, claim, method, artifact_url, artifact_quote,
                confidence = 'reported', actor_kind = 'assistant' } = body
        if (!part_key || !claim) {
          return res.status(400).json({ error: 'part_key and claim are required' })
        }
        if (!CONFIDENCES.includes(confidence)) {
          return res.status(400).json({ error: `confidence must be one of ${CONFIDENCES.join(', ')}` })
        }
        // readable version of the database constraint
        if (confidence === 'verified' && !artifact_url && !artifact_quote) {
          return res.status(422).json({
            error: 'A verified claim needs a receipt: pass artifact_url or artifact_quote. ' +
                   'Use confidence "inferred" or "reported" if you have neither.',
          })
        }

        const found = await sb(
          `/client_parts?select=id&project_slug=eq.${encodeURIComponent(scopeClient)}` +
          `&part_key=eq.${encodeURIComponent(part_key)}`
        )
        if (!found.length) return res.status(404).json({ error: 'part not found' })

        const rows = await sb('/part_evidence', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([{
            part_id: found[0].id, actor, actor_kind, claim,
            method: method || null,
            artifact_url: artifact_url || null,
            artifact_quote: artifact_quote || null,
            confidence,
          }]),
        })
        return res.status(200).json({ ok: true, evidence: rows[0] })
      }

      // ---- dispute a claim -------------------------------------------------
      if (action === 'dispute') {
        const { evidence_id, note = null } = body
        if (!evidence_id) return res.status(400).json({ error: 'evidence_id is required' })
        const rows = await sb(`/part_evidence?id=eq.${encodeURIComponent(evidence_id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ disputed_at: new Date().toISOString(), disputed_note: note }),
        })
        if (!rows.length) return res.status(404).json({ error: 'evidence not found' })
        return res.status(200).json({ ok: true, evidence: rows[0] })
      }

      // ---- the autonomy toggle --------------------------------------------
      // Off by default and off for every client that has never been switched on.
      if (action === 'set_autonomy') {
        const { enabled } = body
        if (typeof enabled !== 'boolean') {
          return res.status(400).json({ error: 'enabled (boolean) is required' })
        }
        const patch = {
          project_slug: scopeClient,
          autonomy_enabled: enabled,
          autonomy_set_at: new Date().toISOString(),
          autonomy_set_by: actor,
        }
        // switching autonomy OFF also withdraws today's approval immediately
        if (!enabled) {
          patch.orders_approved_for = null
          patch.orders_approved_at = null
          patch.orders_scope = []
        }
        const rows = await sb('/client_engine_settings?on_conflict=project_slug', {
          method: 'POST',
          headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify([patch]),
        })
        const s = rows[0]
        s.may_act_now = mayActNow(s)
        return res.status(200).json({ ok: true, settings: s })
      }

      // ---- the next meeting -------------------------------------------------
      // The other half of expiring it. A field that can only run out is a
      // countdown: serve the seeded meeting, watch it disappear on 8 Aug, and
      // the bar is blank forever with no way to put anything back. That is not
      // shipping the decision, it is deleting the feature slowly.
      //
      // Deliberately NOT a calendar integration. One hand-entered value per
      // client, sitting beside the autonomy toggle, written the same way it is
      // — through the gate, stamped with who set it and when, so the board can
      // say where the line came from instead of asserting it.
      //
      // A meeting in the PAST IS REFUSED. It is the exact defect being fixed:
      // the board's whole problem was a past meeting presented as upcoming, and
      // an endpoint that accepts one lets the bug back in through the front
      // door. Backdating is meaningful for a wait (mark_waiting takes `since`,
      // because the ask really did go out last Tuesday) and meaningless for a
      // next meeting.
      if (action === 'set_meeting') {
        const { at, label = null, clear = false } = body

        if (clear) {
          const rows = await sb(
            `/client_engine_settings?project_slug=eq.${encodeURIComponent(scopeClient)}`,
            {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify({
                next_meeting_at: null, next_meeting_label: null,
                next_meeting_set_at: new Date().toISOString(),
                next_meeting_set_by: actor,
              }),
            }
          )
          if (!rows.length) return res.status(404).json({ error: 'client not found' })
          return res.status(200).json({ ok: true, next_meeting: null })
        }

        const parsed = parseMeetingAt(at)
        if (parsed.error) return res.status(400).json({ error: parsed.error })
        if (parsed.at.getTime() <= Date.now()) {
          return res.status(400).json({
            error: 'at must be in the future. A meeting that has already happened is ' +
                   'not the next one, and showing it as upcoming is the bug this ' +
                   'field exists to end.',
          })
        }
        const problem = tooLongProblem(label, 'label', MAX_MEETING_LABEL,
          'who and what, like "Ross, site walk"')
        if (problem) return res.status(400).json({ error: problem })

        const patch = {
          next_meeting_at: parsed.at.toISOString(),
          next_meeting_label: (label && String(label).trim()) || null,
          next_meeting_set_at: new Date().toISOString(),
          next_meeting_set_by: actor,
        }
        // Upsert, not PATCH: a client with parts but no settings row yet would
        // otherwise be the one client whose meeting silently cannot be set.
        // merge-duplicates touches only the columns named here, so the autonomy
        // gate beside it is not reset by writing a meeting.
        const rows = await sb('/client_engine_settings?on_conflict=project_slug', {
          method: 'POST',
          headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify([{ project_slug: scopeClient, ...patch }]),
        })
        return res.status(200).json({ ok: true, next_meeting: nextMeeting(rows[0]) })
      }

      // ---- the daily handshake --------------------------------------------
      // "cool, I have my marching orders for the day. am I good to get started?"
      // Scope is the list AFTER Patrik cut what does not matter.
      if (action === 'approve_orders') {
        const { scope = [] } = body
                if (!Array.isArray(scope) || !scope.length) {
          return res.status(400).json({ error: 'scope must be a non-empty list of part_keys' })
        }

        const cur = await sb(
          `/client_engine_settings?select=*&project_slug=eq.${encodeURIComponent(scopeClient)}`
        )
        if (!cur.length || !cur[0].autonomy_enabled) {
          return res.status(409).json({
            error: 'Autonomy is off for this client. Switch it on before approving a day of work.',
          })
        }

        const rows = await sb(
          `/client_engine_settings?project_slug=eq.${encodeURIComponent(scopeClient)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              orders_approved_for: today(),
              orders_approved_at: new Date().toISOString(),
              orders_scope: scope,
              autonomy_set_by: cur[0].autonomy_set_by || actor,
            }),
          }
        )
        const s = rows[0]
        s.may_act_now = mayActNow(s)
        return res.status(200).json({ ok: true, settings: s })
      }

      // ---- ask for a real check --------------------------------------------
      // The board's button used to re-read the database and call it a re-check.
      // This queues the thing that actually leaves the building:
      // scripts/client-engine-check.py opens what it has an address for,
      // appends evidence carrying the URL it fetched, and stamps checked_at
      // only on the parts it genuinely reached.
      //
      // It DISPATCHES rather than checking inline on purpose. One
      // implementation of "what does a check mean" — the Python script the
      // nightly sweep also runs — instead of a second one in JS that drifts
      // from it. A serverless function that fetched sites itself would be that
      // second implementation.
      //
      // Reading is never gated by autonomy: looking at a public website
      // changes nothing in the world. The two consent gates exist for ACTING.
      if (action === 'request_check') {
        // Match on the CLIENT this check is for, which lives in metadata.
        // `project` is the REPO (AOM-EA) because task-runner.sh takes the repo
        // lock from it — so querying project=<client> could never match, and
        // every click would queue another check behind the last one forever.
        const existing = await sb(
          `/tasks?select=id,status&status=in.(queued,running)` +
          `&metadata->>check_client=eq.${encodeURIComponent(scopeClient)}&limit=1`
        )
        if (existing.length) {
          return res.status(200).json({
            ok: true, already: true, task_id: existing[0].id,
            message: 'A check for this client is already running.',
          })
        }
        const rows = await sb('/tasks', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([{
            title: `Client Engine check — ${scopeClient}`,
            text: `Run: python3 scripts/client-engine-check.py --client ${scopeClient}\n\n` +
                  `It opens every part that has a recorded address, writes down what it ` +
                  `saw with the link it opened, and stamps the check time only on the ` +
                  `parts it actually reached. Parts with no recorded address must stay ` +
                  `unchecked and say why — do not invent an address to make one pass.`,
            description: `Client Engine check for ${scopeClient}, asked for by ${actor}.`,
            status: 'queued',
            source: 'client-engine-board',
            client_id: 'aom',
            project: 'AOM-EA',
            priority: 0,   // integer column; queue-task.py's default is 0
            metadata: {
              repo: 'AOM-EA',
              created_via: 'client-engine-board',
              mission_slug: 'aom:client-engine',
              check_client: scopeClient,
            },
          }]),
        })
        return res.status(200).json({ ok: true, task_id: rows[0]?.id || null })
      }

      // ---- may an agent act right now? -------------------------------------
      // The agent asks this BEFORE doing anything that changes the world.
      // Checking/reading never needs it; acting always does.
      if (action === 'may_act') {
        const { part_key } = body
                const rows = await sb(
          `/client_engine_settings?select=*&project_slug=eq.${encodeURIComponent(scopeClient)}`
        )
        const s = rows[0]
        const allowed = mayActNow(s)
        const inScope = !part_key || (s?.orders_scope || []).includes(part_key)
        let reason = null
        if (!s || !s.autonomy_enabled) reason = 'Autonomy is off for this client.'
        else if (s.orders_approved_for !== today()) reason = 'No approved orders for today.'
        else if (!inScope) reason = `${part_key} is not in today's approved scope.`
        return res.status(200).json({ may_act: allowed && inScope, reason, settings: s || null })
      }

      return res.status(400).json({ error: 'unknown action' })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    // Auth failures carry their own status and are flagged so the board can
    // render an honest "you are signed out" state instead of an empty client.
    if (e instanceof TenantAuthError) {
      return res.status(e.status || 403).json({ error: String(e.message), auth: false })
    }
    return res.status(e.status || 500).json({ error: String(e.message || e) })
  }
}
