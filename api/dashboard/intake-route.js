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
const MAX_PROJECTS = 25
const MAX_MISSIONS_PER_PROJECT = 5

// The routing doctrine is M14's (ChatDesktop.jsx promoteToMission), lifted here:
// match an existing visible room FIRST; only propose a NEW project when nothing
// fits; short outcome-based mission names. The model returns the IDENTITY of a
// candidate (kind+slug), never free-form room fields — the server reconstructs
// the authoritative target from the candidate list so a hallucinated name/id
// can never reach the client.
const SYSTEM_PROMPT = `You are Corner's routing brain. A user typed a task or thought into the front-door composer. You are given the message plus the rooms they can see (projects, missions, agents) with recency. Decide where the message belongs.

DOCTRINE (do not violate):
- Match to an existing visible room FIRST. Prefer the room the user was just in ("last room") when the message plausibly continues it.
- Only propose creating a NEW project when nothing plausibly fits. Match the parent project from the candidate list; set is_new_project true ONLY when no existing project fits.
- Propose a short, OUTCOME-BASED mission name of 3-6 words. Never a vague or generic name.
- For route "continue" or "existing", the match MUST reference a slug that appears in the candidate list — never invent one.
- Be honest with confidence: lower it when the message is short/ambiguous or two candidates are close.

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
  "reasoning": "<one user-safe sentence>"
}`

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

// Compact + rank candidates so the prompt stays small even in an 84-project world.
export function rankCandidates(candidates) {
  const projects = Array.isArray(candidates?.projects) ? candidates.projects : []
  const missions = Array.isArray(candidates?.missions) ? candidates.missions : []
  const agents = Array.isArray(candidates?.agents) ? candidates.agents : []
  const rankedProjects = [...projects]
    .sort((a, b) => ageMs(b.last_message_at) - ageMs(a.last_message_at))
    .slice(0, MAX_PROJECTS)
  const missionsByProject = {}
  for (const m of missions) {
    const p = m.project_slug || m.project || ''
    if (!p) continue
    ;(missionsByProject[p] = missionsByProject[p] || []).push(m)
  }
  for (const p of Object.keys(missionsByProject)) {
    missionsByProject[p] = missionsByProject[p]
      .sort((a, b) => ageMs(b.last_message_at) - ageMs(a.last_message_at))
      .slice(0, MAX_MISSIONS_PER_PROJECT)
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
function normalizeProposal(proposal, index) {
  const p = proposal || {}
  const kind = p.kind === 'project' ? 'project' : 'mission'
  const projSlug = p.project_slug || ''
  const existing = projSlug ? index.projectBySlug.get(projSlug) : null
  return {
    kind,
    name: String(p.name || '').trim(),
    project_slug: existing ? existing.slug : projSlug,
    project_name: existing ? existing.name : '',
    is_new_project: kind === 'project' ? true : (!existing),
    task_breakdown: Array.isArray(p.task_breakdown) ? p.task_breakdown.slice(0, 8).map((s) => String(s)) : [],
  }
}

function candidateBlock(ranked, lastRoom, recentRooms) {
  const lines = []
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
    lines.push(`  [project] ${p.slug} — "${p.name || p.slug}"`)
    for (const m of (ranked.missionsByProject[p.slug] || [])) {
      lines.push(`    [mission] ${p.slug}:${bareSlug(m.slug)} — "${m.name || bareSlug(m.slug)}"`)
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
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
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
      const proposal = llm.proposal ? normalizeProposal(llm.proposal, index) : fallbackDecision('unmatched').proposal
      return res.status(200).json({ route: 'new', target: null, proposal, confidence, reasoning, source: 'llm', degraded: true })
    }
    return res.status(200).json({ route: llm.route, target, proposal: null, confidence, reasoning, source: 'llm', degraded: false })
  }

  // route === 'new' (or anything unexpected → treat as new)
  const proposal = normalizeProposal(llm.proposal, index)
  return res.status(200).json({ route: 'new', target: null, proposal, confidence, reasoning, source: 'llm', degraded: false })
}
