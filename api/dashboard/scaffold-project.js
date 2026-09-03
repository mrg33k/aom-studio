// POST /api/dashboard/scaffold-project  { slug, name, description, tenant }
//
// R30: writes the six canonical scaffold stubs so the dashboard Files section
// surfaces them automatically. The six canonical surfaces per VISION.md
// "Project self-maintenance":
//   VISION.md / RESEARCH.md / BUILD.md / CONTEXT.md / last-conversation.md
//   + research/README.md
// The project's tasks queue is a seventh live surface, queued separately by
// whichever flow calls this endpoint; not written here.
//
// Backend: Convex (corner:retire-supabase R2, 2026-09-03). The project gets a
// room (rooms:createRoom kind project, or the one that already exists) and
// each stub is appended to the events ledger with tasks:logEvent
// (event_type scaffold_file). The ledger is append-only, so a re-scaffold
// appends a newer row per file; readers take the newest by timestamp.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

// Optional write key for tasks:logEvent (gated by TASKS_KEY on the deployment).
// Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

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

function stubContent(slug, name, description) {
  const title = name || titleFromSlug(slug)
  const desc = description || `_TBD: one-line description of ${title}_`
  const d = today()
  return {
    'VISION.md': `# ${title}: Vision

**Source of truth.** If this file disagrees with any other doc in this project, this file wins.

**Paired with \`BUILD.md\`.** VISION says what/why. BUILD says how/when, round by round.

---

## What this project IS

${desc}

## North star

_TBD._ What "done" looks like in 30 days. The shortest sentence that captures the win.

## Pillars

_TBD._ The 2-4 things this project must deliver. Each one gets a section the build doc plans against.

---

## Change log

- **${d}**: Scaffolded via R30. Needs EA interview to fill in north star + pillars.
`,

    'RESEARCH.md': `# ${title}: Research

> Findings accumulate as the project progresses. Research happens **before** build.
> A little research goes a long way; agents should default to verifying current
> reality before producing code against it.

**Started:** ${d}

## Index

_No research yet. First research task will append here._

## How to add research

1. Drop research artifacts into \`projects/${slug}/research/\`.
2. Add a dated index entry here: heading, date, question answered, 2-3 sentence synthesis + source link.
3. Build tasks cite the relevant section in their brief body.
`,

    'BUILD.md': `# ${title}: Build Plan

**Started:** ${d}

**Paired with \`VISION.md\`.** BUILD says how/when, round by round, with task IDs and commit hashes. VISION says what the project is and why. Every round below should trace to a commitment in VISION.md.

## North Star

_Mirror from VISION.md once that's ratified._

## Rounds

### R1: Vision interview

EA interviews the user to fill in VISION.md (north star, pillars, what-it-is).

**Status:** queued (first task spawned on scaffold).

### R2: TBD

Defined after R1 ratifies the vision.

## Ground rules for every round

1. Read VISION.md before starting any task.
2. Verify before saying done: run the thing, look at the output.
3. Append commit hash + flip status here when each round ships.
`,

    'CONTEXT.md': `# ${title}: Project Context

**Source of truth pair:** \`VISION.md\` (what/why) + \`BUILD.md\` (how/when). This file is a living summary: backstory for workers, not product direction.

**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Project box created. No work started. First task: vision interview.

## Hard Rules

- All work scoped to this project stays in this box.
- Read VISION.md + BUILD.md before touching any code.
`,

    'last-conversation.md': `# ${title}: Last Conversation

**Empty tape.** The first interaction with this project's agent will populate this.

Tapes are "wait what?" files. Lead with:
- What's in flight right now
- Key decisions made and why
- What broke or almost broke
- What's next

Scaffolded ${d}.
`,

    'research/README.md': `# ${title} Research

Drop research artifacts here as dated markdown files. Each file answers one question.

\`RESEARCH.md\` (one level up) is the index. It summarizes what lives in this
folder with 2-3 sentence synthesis + links back. Build tasks cite the
\`RESEARCH.md\` section that covers the relevant finding.

Scaffolded ${today()}.
`,
  }
}

// Append one stub to the ledger. Reports whether an older row for the same
// file already existed so the response still says inserted vs updated.
async function upsertScaffoldStub({ slug, filename, content, tenantId }) {
  let existed = false
  try {
    const prior = await convexQuery('events:find', {
      event_type: SCAFFOLD_EVENT_TYPE, agent: slug, payload_eq: { key: 'filename', value: filename }, limit: 1,
    })
    existed = Array.isArray(prior) && prior.length > 0
  } catch { existed = false }
  const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId }
  const result = await convexMutation('tasks:logEvent', {
    key: CONVEX_KEY,
    event: { event_type: SCAFFOLD_EVENT_TYPE, agent: slug, payload },
  })
  return { filename, action: existed ? 'updated' : 'inserted', row: { id: result?.id || null, agent: slug, payload } }
}

// The project's chat room: the existing one for this slug, or a new one.
async function ensureProjectRoom({ tenantId, slug, title }) {
  const existing = await convexQuery('rooms:resolveCanonical', { worldSlug: tenantId, kind: 'project', key: slug }).catch(() => null)
  if (existing) return { roomId: String(existing._id), legacyRoomId: existing.legacyRoomId || null, created: false }
  const world = await convexQuery('worlds:getBySlug', { slug: tenantId })
  if (!world) throw new Error(`world "${tenantId}" not found`)
  const id = await convexMutation('rooms:createRoom', { worldId: String(world._id), title, kind: 'project', project: slug })
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

  const { slug, name, description, tenant: rawTenant } = req.body || {}
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug required' })
  }
  if (!/^[a-z][a-z0-9-]*$/.test(slug) || slug.length > 50) {
    return res.status(400).json({ error: 'slug must match ^[a-z][a-z0-9-]*$ and be <=50 chars' })
  }

  const requestedTenant = (rawTenant || '').toString().trim().toLowerCase()
  let tenantId
  try {
    ({ tenant: tenantId } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  try {
    const room = await ensureProjectRoom({ tenantId, slug, title: name || titleFromSlug(slug) })
    const stubs = stubContent(slug, name, description)
    const results = []
    for (const [filename, content] of Object.entries(stubs)) {
      results.push(await upsertScaffoldStub({ slug, filename, content, tenantId }))
    }
    return res.status(200).json({ ok: true, slug, tenant: tenantId, room, files: results })
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) })
  }
}
