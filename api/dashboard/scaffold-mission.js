// POST /api/dashboard/scaffold-mission
//   { parent_slug, mission_slug, description, name?, tenant }
//
// R30b, missions primitive (nested scaffold).
//
// A mission is a sub-project that lives inside a parent project (or another
// mission). Same six-file scaffold as the parent. The events ledger keys
// mission scaffold rows by a colon-joined agent path:
//
//   parent project   ->  agent='corner'
//   mission of it    ->  agent='corner:music-pack'
//   nested mission   ->  agent='corner:music-pack:drum-kit'
//
// Backend: Convex (corner:retire-supabase R2, 2026-09-03). The mission gets a
// room (rooms:createRoom kind mission, or the one that already exists) and
// each stub is appended to the events ledger with tasks:logEvent
// (event_type scaffold_file). The ledger is append-only, so a re-scaffold
// appends a newer row per file; readers take the newest by timestamp.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

// Optional write key for tasks:logEvent (gated by TASKS_KEY on the deployment).
// Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const PARENT_PATH_RE = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function missionStubs(missionSlug, parentPath, name, description) {
  const title = name || titleFromSlug(missionSlug)
  const desc = description || `_TBD: one-line description of ${title}_`
  const d = today()
  const parentLabel = parentPath.split(':').map(titleFromSlug).join(' > ')
  return {
    'VISION.md': `# ${title}: Mission Vision

**Source of truth for this mission.** Inherits from \`${parentLabel}\` but scoped to the work this mission carries.

**Mission path:** \`${parentPath}:${missionSlug}\`
**Paired with this mission's \`BUILD.md\`.** VISION = what/why, BUILD = how/when.

---

## What this mission IS

${desc}

## North star

_TBD._ The shortest sentence that captures what done looks like for this mission.

## Pillars

_TBD._ The 2-4 things this mission must deliver.

---

## Change log

- **${d}**: Scaffolded via R30b (mission primitive). Inherits parent: ${parentLabel}.
`,

    'RESEARCH.md': `# ${title}: Mission Research

> Findings specific to this mission. Cross-cutting research stays in the parent's RESEARCH.md.

**Started:** ${d}

## Index

_No research yet. Add dated entries here as findings accumulate._
`,

    'BUILD.md': `# ${title}: Mission Build Plan

**Started:** ${d}
**Mission path:** \`${parentPath}:${missionSlug}\`

**Paired with this mission's \`VISION.md\`.** Round-by-round plan, scoped to this mission.

## Rounds

### M1: Vision interview

Interview to fill in this mission's VISION.md (north star, pillars).

**Status:** queued.
`,

    'CONTEXT.md': `# ${title}: Mission Context

**Mission path:** \`${parentPath}:${missionSlug}\`
**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Mission scaffolded. No work started yet. First task: vision interview.
`,

    'last-conversation.md': `# ${title}: Last Conversation

**Empty tape.** First interaction populates this.

Mission path: \`${parentPath}:${missionSlug}\`
Scaffolded ${d}.
`,

    'research/README.md': `# ${title} Mission Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` (one level up) is the index.

Scaffolded ${d}.
`,
  }
}

// Append one stub to the ledger. Reports whether an older row for the same
// file already existed so the response still says inserted vs updated.
async function upsertScaffoldStub({ agentKey, filename, content, tenantId }) {
  let existed = false
  try {
    const prior = await convexQuery('events:find', {
      event_type: SCAFFOLD_EVENT_TYPE, agent: agentKey, payload_eq: { key: 'filename', value: filename }, limit: 1,
    })
    existed = Array.isArray(prior) && prior.length > 0
  } catch { existed = false }
  const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId }
  const result = await convexMutation('tasks:logEvent', {
    key: CONVEX_KEY,
    event: { event_type: SCAFFOLD_EVENT_TYPE, agent: agentKey, payload },
  })
  return { filename, action: existed ? 'updated' : 'inserted', row: { id: result?.id || null, agent: agentKey, payload } }
}

// The mission's chat room: the existing one for this project + slug, or a new one.
async function ensureMissionRoom({ tenantId, rootProject, missionSlug, title }) {
  const existing = await convexQuery('rooms:resolveCanonical', {
    worldSlug: tenantId, kind: 'mission', key: missionSlug, project: rootProject,
  }).catch(() => null)
  if (existing) return { roomId: String(existing._id), legacyRoomId: existing.legacyRoomId || null, created: false }
  const world = await convexQuery('worlds:getBySlug', { slug: tenantId })
  if (!world) throw new Error(`world "${tenantId}" not found`)
  const id = await convexMutation('rooms:createRoom', { worldId: String(world._id), title, kind: 'mission', project: rootProject })
  const room = await convexQuery('rooms:getRoom', { roomId: String(id) }).catch(() => null)
  return { roomId: String(id), legacyRoomId: room?.legacyRoomId || null, created: true }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // parent_slug accepts a single project slug or a colon-joined mission path
  // for nested missions ('corner:music-pack' is a valid parent).
  const { parent_slug, mission_slug, description, name, tenant: rawTenant } = req.body || {}
  if (!parent_slug || typeof parent_slug !== 'string' || !PARENT_PATH_RE.test(parent_slug) || parent_slug.length > 200) {
    return res.status(400).json({ error: 'parent_slug must match ^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$ and be 200 chars or fewer' })
  }
  if (!mission_slug || typeof mission_slug !== 'string' || !SLUG_RE.test(mission_slug) || mission_slug.length > 50) {
    return res.status(400).json({ error: 'mission_slug must match ^[a-z][a-z0-9-]*$ and be 50 chars or fewer' })
  }
  const agentKey = `${parent_slug}:${mission_slug}`

  const requestedTenant = (rawTenant || '').toString().trim().toLowerCase()
  let tenantId
  try {
    ({ tenant: tenantId } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  try {
    const rootProject = parent_slug.split(':')[0]
    const room = await ensureMissionRoom({ tenantId, rootProject, missionSlug: mission_slug, title: name || titleFromSlug(mission_slug) })
    const stubs = missionStubs(mission_slug, parent_slug, name, description)
    const results = []
    for (const [filename, content] of Object.entries(stubs)) {
      results.push(await upsertScaffoldStub({ agentKey, filename, content, tenantId }))
    }
    return res.status(200).json({ ok: true, agent: agentKey, parent: parent_slug, mission: mission_slug, tenant: tenantId, room, files: results })
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) })
  }
}
