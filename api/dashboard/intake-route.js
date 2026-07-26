// POST /api/dashboard/intake-route
// Corner's routing brain — the first instance of "Corner deciding where a task
// goes." Given a freeform message the user typed at the front door plus the
// rooms they can see, it decides one of:
//   continue : the text extends the room they were just in (or a strongly
//              matched existing room) → open that room.
//   existing : it belongs to a DIFFERENT existing project/mission/agent room.
//   new      : nothing fits → propose an EDITABLE new room (short outcome-based
//              mission name, matched parent project). The frontend confirms
//              before anything is created — creation is never automatic (M14).
//
// PURE classification. Creates nothing, writes nothing. Always returns 200 with
// a valid contract object so the composer never throws on the send path; on any
// failure it returns a safe `new` fallback the composer opens as an editable
// new-mission draft.
//
// Stays on Gemini by design — NO Anthropic API from any endpoint (hard rule,
// scripts/check-no-anthropic-api.cjs). Same model + JSON pattern as call-scribe.js.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { deriveRoomId } from '../_lib/write-message.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'
const DEFAULT_CLIENT_ID = 'aom'
const GEMINI_TIMEOUT_MS = 7000
const MAX_PROJECTS = 18
const MAX_MISSIONS_PER_PROJECT = 4

// The routing doctrine is M14's (ChatDesktop.jsx promoteToMission), lifted here:
// match an existing visible room FIRST; only propose a NEW project when nothing
// fits; short outcome-based mission names. The model returns the IDENTITY of a
// candidate (kind+slug), never free-form room fields — the server reconstructs
// the authoritative target from the candidate list so a hallucinated name/id
// can never reach the client.
export const SYSTEM_PROMPT = `You are Corner's routing brain. A user typed a task or thought into the front-door composer. You are given the message plus the rooms they can see (projects, missions, agents) with recency. Decide where the message belongs.

DOCTRINE (do not violate):
- Match to an existing visible room FIRST. Prefer the room the user was just in ("last room") when the message plausibly continues it.
- A room's \`recent:\` hint is what that room is actually ABOUT and is far stronger evidence than its name. Match on subject matter, not on vocabulary.
- A word shared between the message and a room's NAME is NOT a match. If the only thing connecting them is a common word (reel, deck, site, logo, game, print), that is a coincidence — keep looking, and if nothing else supports it, do not match.
- If the message clearly belongs to a project but no specific mission fits, route to that PROJECT room. Proposing a new mission is the LAST resort, not the fallback for "no mission matched".
- Only propose creating a NEW project when nothing plausibly fits. Match the parent project from the candidate list; set is_new_project true ONLY when no existing project fits.
- proposal.name is a short OUTCOME-BASED mission name of 3-6 words: a clean noun phrase naming the deliverable or goal (e.g. "Homepage hero redesign", "Q3 outreach push", "Pricing page rewrite"). NEVER copy a clause or fragment verbatim from the user's message, never echo their exact words, and never a full sentence or a first-person phrase. If you cannot think of a good outcome name, return an empty string — the server will synthesize one.
- For route "continue" or "existing", the match MUST reference a slug that appears in the candidate list — never invent one.
- Confidence decides whether the room opens automatically, so calibrate it honestly. Use 0.9+ only when the room's hint or subject matter makes it unambiguous. Use 0.6-0.8 when it is the best fit but a reasonable person could pick another room. Use 0.5 or less when your reason is mostly a shared keyword, when the message is a short continuation ("keep the map anyway", "that feels small") that could belong to several rooms, or when two candidates are close. A wrong room opened silently is worse than asking.
- Route to the Corner platform project ONLY when Corner itself is the thing being changed or reported on: the dashboard, the front-door composer, rooms, the routing brain, chat UI, intake flow, recents, mission trees. Corner is the workspace the user is standing in, so it gets MENTIONED constantly — "did you put it in the room files", "that room disappeared", "I have the project open" are asides, not Corner work. Above all, the work done INSIDE a room (design, copy, video, decks, outreach, a client's site) belongs to that work's own project, never to Corner, even when the user describes it in interface words like screen, page, header, layout or button.

ROUTES:
- "continue": the message extends the last room, or a candidate that matches very strongly. Return "match".
- "existing": it belongs to a DIFFERENT existing candidate room. Return "match".
- "new": nothing fits. Return "proposal" (no match). Always fill task_breakdown.

The interaction_mode tells you the user's intent, not the destination: it does NOT change which room the task goes to. In "plan" mode give a richer task_breakdown (they are decomposing before executing); in "work" mode task_breakdown can be terse.

Return ONLY a JSON object, no markdown:
{
  "route": "continue" | "existing" | "new",
  "match": { "kind": "agent"|"project"|"mission", "slug": "<candidate slug>", "project_slug": "<parent project slug, for missions>" } | null,
  "proposal": { "kind": "mission"|"project", "name": "<3-6 word outcome-based name>", "project_slug": "<matched existing parent, or a new slug>", "is_new_project": true|false, "task_breakdown": ["step", ...] } | null,
  "confidence": 0.0,
  "reasoning": "<see REASONING below>"
}

Example — message: "we need to redo the pricing section on the site and make it clearer". Good: proposal.name "Pricing section rewrite", matched to the best existing web/site project (or a new one only if none fits). Bad: proposal.name "redo the pricing section" (a verbatim fragment) — never do that.

REASONING - this is shown to the user, in the room, under the words "Corner sent this to <room>". It is the only thing explaining why they landed where they did, so write it for them, not for a log.

- Finish the sentence "Sent here because ___". Write only that ending, as a short sentence starting with a capital and ending with a period.
- TWELVE WORDS MAXIMUM. Shorter is better. It is a caption, not an explanation.
- Say what the WORK is, or what they were doing. Never describe how you matched it.
- Never write "the message", "the user", "the request", "this task". Say "you", or start with the subject itself.
- Never name the machinery. These words are banned outright: mission, project, room, match, candidate, confidence, activity, routed, existing. Never quote a slug. Naming a real piece of work is fine ("the Day 3 reel", "the pricing page"); naming the filing system is not.
- Contractions, always: "You\'re", "It\'s", "That\'s". "You are" reads like a form letter.
- Do not repeat the room\'s name - it is already on screen directly above this line.
- If you genuinely have no better reason than a keyword, say so plainly: "Only a loose match on wording." Never dress a weak reason up.

Good: "You\'ve been cutting this reel here all week."
Good: "This is where the pricing page work lives."
Good: "It picks up the deck you sent yesterday."
Good: "Only a loose match on wording."
Good: "You\'ve been grading the summit footage here."
Bad:  "The message explicitly mentions \'reel\', which directly aligns with the Summit Highlight Reel mission under the AZ Tech Council project." (log entry, names the machinery, quotes a slug)
Bad:  "The user is asking about files, which relates to content delivery." (talks about "the user", describes the matching)
Bad:  "You are giving feedback on a review process within Corner." (stiff, and names the machinery)
Bad:  "This describes a concept that doesn\'t fit existing projects." (names the machinery)`

function extractJson(text) {
  if (!text) return null
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try { return JSON.parse(t.slice(start, end + 1)) } catch { return null }
}

function ageMs(ts) {
  if (typeof ts === 'number') return Number.isNaN(ts) ? 0 : ts
  const t = ts ? new Date(ts).getTime() : 0
  return Number.isNaN(t) ? 0 : t
}

// The safe fallback the composer knows how to handle: an editable new-mission
// draft pre-filled with the raw text (frontend synthesizes the name).
function fallbackDecision(reason) {
  return {
    route: 'new',
    target: null,
    proposal: { kind: 'mission', name: '', project_slug: '', project_name: '', is_new_project: false, task_breakdown: [] },
    confidence: 0,
    reasoning: reason || 'router unavailable',
    source: 'fallback',
    degraded: true,
  }
}

const bareSlug = (s) => (s && String(s).includes(':') ? String(s).split(':').pop() : String(s || ''))

// Ceiling applied when a room won on its NAME and has never described itself. Must stay below
// the composer's AUTO_ROUTE_CONFIDENCE (0.85) — that is the whole mechanism: the room still
// opens, the user is just asked first.
const UNVERIFIED_NAME_CONFIDENCE = 0.6
const NAME_STOP = new Set('the a an and or but for with from this that these those you your our their have has can could will would should about into out over under more most just now also some any all very too then them they there here get got make made need want use using new please thanks okay lets let does did done what when how why who which its his her been being were was are is'.split(' '))
const contentWords = (s) => new Set(
  String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length >= 4 && !NAME_STOP.has(w))
)

// Find the candidate row the target came from, so we can read the hint the model was shown.
function candidateFor(target, candidates) {
  if (!target) return null
  if (target.isMission) {
    const bare = bareSlug(target.missionSlug || target.id)
    return (candidates?.missions || []).find((m) => m.project_slug === target.projectSlug && bareSlug(m.slug) === bare) || null
  }
  if (target.isProject) return (candidates?.projects || []).find((p) => p.slug === target.id) || null
  return null   // agents carry no hint by design; they are picked by name on purpose
}

// True when the chosen room has NO description at all and the only link to the message is a
// word in its name. That is a match nothing can corroborate.
export function undescribedNameMatch(message, target, candidates) {
  const cand = candidateFor(target, candidates)
  if (!cand) return false
  if (String(cand.hint || '').trim()) return false     // it described itself — judge on that
  const msg = contentWords(message)
  for (const w of contentWords(cand.name)) if (msg.has(w)) return true
  return false
}

// Strip stop words and take the first 5 content-bearing words as a clean outcome name.
// Only runs when the LLM returned an empty proposal.name.
const STOP_WORDS = new Set(['i','we','the','a','an','to','for','on','in','at','of','and','or','but','it','is','are','was','were','be','been','being','have','has','had','do','does','did','that','this','these','those','with','from','by','as','not','no','my','your','our','their','its','can','could','will','would','should','about','into','up','out','if','so','what','when','how','why','who','which','just','now','also','some','any','all','very','too','more','most','than','then','them','they','there','here','get','got','make','need','want','use','dont','doesnt','cant','wont','isnt'])
function synthesizeName(message) {
  const words = String(message || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const content = words.filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  const chosen = content.slice(0, 5)
  if (!chosen.length) return ''
  return chosen.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Compact + rank candidates so the prompt stays small even in an 84-project world.
export function rankCandidates(candidates, maxProjects = MAX_PROJECTS, maxMissions = MAX_MISSIONS_PER_PROJECT) {
  const projects = Array.isArray(candidates?.projects) ? candidates.projects : []
  const missions = Array.isArray(candidates?.missions) ? candidates.missions : []
  const agents = Array.isArray(candidates?.agents) ? candidates.agents : []
  const rankedProjects = [...projects]
    .sort((a, b) => ageMs(b.last_message_at) - ageMs(a.last_message_at))
    .slice(0, maxProjects)
  const missionsByProject = {}
  for (const m of missions) {
    const p = m.project_slug || m.project || ''
    if (!p) continue
    ;(missionsByProject[p] = missionsByProject[p] || []).push(m)
  }
  for (const p of Object.keys(missionsByProject)) {
    missionsByProject[p] = missionsByProject[p]
      .sort((a, b) => ageMs(b.last_message_at) - ageMs(a.last_message_at))
      .slice(0, maxMissions)
  }
  return { rankedProjects, missionsByProject, agents }
}

// Index for validation + authoritative target reconstruction.
export function buildIndex(candidates) {
  const projectBySlug = new Map()
  const agentBySlug = new Map()
  const missionByKey = new Map() // key: `${projectSlug}:${bareSlug}`
  for (const p of (candidates?.projects || [])) if (p?.slug) projectBySlug.set(p.slug, { slug: p.slug, name: p.name || p.slug })
  for (const a of (candidates?.agents || [])) if (a?.slug) agentBySlug.set(a.slug, { slug: a.slug, name: a.name || a.title || a.slug })
  for (const m of (candidates?.missions || [])) {
    const proj = m.project_slug || m.project || ''
    const bare = bareSlug(m.slug)
    if (proj && bare) missionByKey.set(`${proj}:${bare}`, { projectSlug: proj, slug: bare, name: m.name || bare })
  }
  return { projectBySlug, agentBySlug, missionByKey }
}

// Reconstruct the authoritative target room object from a validated candidate.
// Returns null if the LLM's match doesn't resolve to a real candidate (so the
// caller downgrades to `new` rather than opening a hallucinated room).
export function buildTarget(clientId, match, index) {
  if (!match || !match.kind) return null
  if (match.kind === 'agent') {
    const a = index.agentBySlug.get(match.slug)
    if (!a) return null
    return { kind: 'agent', id: a.slug, name: a.name, isProject: false, isMission: false, projectSlug: '', missionSlug: '', room_id: deriveRoomId({ clientId, agent: a.slug }) }
  }
  if (match.kind === 'project') {
    const p = index.projectBySlug.get(match.slug)
    if (!p) return null
    return { kind: 'project', id: p.slug, name: p.name, isProject: true, isMission: false, projectSlug: '', missionSlug: '', room_id: deriveRoomId({ clientId, agent: 'corner', project: p.slug }) }
  }
  if (match.kind === 'mission') {
    const proj = match.project_slug || (String(match.slug || '').includes(':') ? String(match.slug).split(':')[0] : '')
    const bare = bareSlug(match.slug)
    const m = index.missionByKey.get(`${proj}:${bare}`)
    if (!m) return null
    const canonical = `${m.projectSlug}:${m.slug}`
    return { kind: 'mission', id: m.slug, name: m.name, isProject: false, isMission: true, projectSlug: m.projectSlug, missionSlug: canonical, room_id: deriveRoomId({ clientId, agent: 'corner', project: m.projectSlug, missionSlug: canonical }) }
  }
  return null
}

// Normalize the LLM's `new` proposal against the real project list: attach the
// display name, and force is_new_project true when the named parent doesn't
// exist (so the confirm UI never claims a project that isn't there).
// If the model returned an empty name, synthesize a clean outcome name from
// the original message so the client never needs the verbatim firstWords fallback.
function normalizeProposal(proposal, index, message) {
  const p = proposal || {}
  const kind = p.kind === 'project' ? 'project' : 'mission'
  const projSlug = p.project_slug || ''
  const existing = projSlug ? index.projectBySlug.get(projSlug) : null
  const rawName = String(p.name || '').trim()
  return {
    kind,
    name: rawName || synthesizeName(message || ''),
    project_slug: existing ? existing.slug : projSlug,
    project_name: existing ? existing.name : '',
    is_new_project: kind === 'project' ? true : (!existing),
    task_breakdown: Array.isArray(p.task_breakdown) ? p.task_breakdown.slice(0, 8).map((s) => String(s)) : [],
  }
}

export function candidateBlock(ranked, lastRoom, recentRooms) {
  const lines = []
  const hint = (h) => (h && String(h).trim() ? ` — recent: "${String(h).trim().slice(0, 100)}"` : '')
  const roomLine = (r) => {
    if (!r) return ''
    if (r.isMission) return `[mission] ${r.projectSlug || ''}:${bareSlug(r.missionSlug || r.id)} — "${r.name || ''}"`
    if (r.isProject) return `[project] ${r.id} — "${r.name || ''}"`
    return `[agent] ${r.id} — "${r.name || ''}"`
  }
  if (lastRoom) lines.push(`LAST ROOM (primary continue candidate): ${roomLine(lastRoom)}`)
  if (Array.isArray(recentRooms) && recentRooms.length) {
    lines.push('RECENT ROOMS:')
    for (const r of recentRooms.slice(0, 6)) lines.push(`  ${roomLine(r)}`)
  }
  lines.push('AGENTS:')
  for (const a of ranked.agents) lines.push(`  [agent] ${a.slug} — "${a.name || a.title || a.slug}"`)
  lines.push('PROJECTS (and their recent missions):')
  for (const p of ranked.rankedProjects) {
    lines.push(`  [project] ${p.slug} — "${p.name || p.slug}"${hint(p.hint)}`)
    for (const m of (ranked.missionsByProject[p.slug] || [])) {
      lines.push(`    [mission] ${p.slug}:${bareSlug(m.slug)} — "${m.name || bareSlug(m.slug)}"${hint(m.hint)}`)
    }
  }
  return lines.join('\n')
}

async function callGemini(message, interactionMode, ranked, lastRoom, recentRooms) {
  const userText = [
    `interaction_mode: ${interactionMode}`,
    '',
    'The user typed:',
    '"""',
    String(message).slice(0, 2000),
    '"""',
    '',
    'Rooms they can see:',
    candidateBlock(ranked, lastRoom, recentRooms),
    '',
    'Return the routing decision as JSON.',
  ].join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          // gemini-2.5-flash thinks by default, and on this prompt it burned ~1,500 thinking
          // tokens per call for a pure classification — measured median 5.8s, worst 15.6s,
          // against a 7s budget. 38% of real sends therefore timed out and fell through to
          // fallbackDecision, which is the "it just takes a sentence from my prompt and
          // attaches it randomly" the user reported: a degraded `new` draft named off their
          // own words. Thinking off: median 0.92s, worst 1.31s, zero timeouts, and accuracy
          // went UP (it was losing to the clock, not reasoning its way to better answers).
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    }
  )
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Gemini ${response.status}: ${body.slice(0, 200)}`)
  }
  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  return extractJson(text)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const body = req.body || {}
  const requested = (body.client_id && String(body.client_id).trim())
    ? String(body.client_id).trim().toLowerCase()
    : DEFAULT_CLIENT_ID
  let clientId
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const message = String(body.message || '').trim()
  if (!message) return res.status(400).json({ error: 'message required' })
  const interactionMode = body.interaction_mode === 'plan' ? 'plan' : 'work'
  const candidates = body.candidates || {}
  const lastRoom = body.last_room || null
  const recentRooms = Array.isArray(body.recent_rooms) ? body.recent_rooms : []

  // No candidates + no key → we can't route; degrade to the editable new draft.
  if (!GEMINI_API_KEY) return res.status(200).json(fallbackDecision('router not configured'))
  const hasCandidates = (candidates.projects?.length || candidates.missions?.length || candidates.agents?.length)
  if (!hasCandidates && !lastRoom) return res.status(200).json(fallbackDecision('no candidates'))

  const ranked = rankCandidates(candidates)
  const index = buildIndex(candidates)

  let llm
  try {
    llm = await callGemini(message, interactionMode, ranked, lastRoom, recentRooms)
  } catch (err) {
    return res.status(200).json(fallbackDecision(`router error: ${String(err.message || err).slice(0, 120)}`))
  }
  if (!llm || !llm.route) return res.status(200).json(fallbackDecision('no_parse'))

  const confidence = Math.max(0, Math.min(1, Number(llm.confidence) || 0))
  const reasoning = String(llm.reasoning || '').slice(0, 240)

  if (llm.route === 'continue' || llm.route === 'existing') {
    const target = buildTarget(clientId, llm.match, index)
    if (!target) {
      // Hallucinated / stale slug — never open a room that isn't real. Downgrade
      // to an editable new draft, preserving any proposal the model offered.
      const proposal = llm.proposal ? normalizeProposal(llm.proposal, index, message) : fallbackDecision('unmatched').proposal
      return res.status(200).json({ route: 'new', target: null, proposal, confidence, reasoning, source: 'llm', degraded: true })
    }
    // The keyword magnet, caught deterministically instead of asked about.
    //
    // "Can you tighten the timing on the day 3 reel" kept auto-opening AZ Tech Council's
    // "Summit Highlight Reel" — a room with no traffic and therefore no hint, whose NAME was
    // the only occurrence of the word "reel" anywhere in the candidate block. Even once
    // aom:socials advertised "Day 3 profile-audit reel v4 is mid-build", the bare name still
    // won, and the model reported 0.9 either way.
    //
    // A room that has never said anything about itself cannot corroborate a name match, so it
    // does not get to open silently on one. Confidence is capped below the client's auto bar
    // and the user is asked. Rooms that DO describe themselves are untouched — they are judged
    // on the description, which is the whole point of the hint.
    //
    // Measured on 74 real messages: costs one right auto-open and removes one wrong one
    // (30/15 -> 29/14). Near-neutral on aggregate, but it removes the case we cannot verify
    // and the one that compounds — a misroute becomes part of the wrong room's hint and makes
    // the same misroute likelier next time.
    const capped = undescribedNameMatch(message, target, candidates)
    if (capped) {
      return res.status(200).json({
        route: llm.route, target, proposal: null,
        confidence: Math.min(confidence, UNVERIFIED_NAME_CONFIDENCE),
        // ALWAYS overrides the model's sentence here, never falls back to it. When the
        // match is a bare name with nothing corroborating it, the model still writes a
        // confident caption — live it produced "You've been cutting this reel here all
        // week." for a room that had never held a single message. A capped route must not
        // be narrated as a certainty, and the honest line is the one the prompt already
        // specifies for exactly this case and never volunteers on its own.
        reasoning: 'Only a loose match on wording.',
        source: 'llm', degraded: false, name_match_only: true,
      })
    }
    return res.status(200).json({ route: llm.route, target, proposal: null, confidence, reasoning, source: 'llm', degraded: false })
  }

  // route === 'new' (or anything unexpected → treat as new)
  const proposal = normalizeProposal(llm.proposal, index, message)
  return res.status(200).json({ route: 'new', target: null, proposal, confidence, reasoning, source: 'llm', degraded: false })
}
