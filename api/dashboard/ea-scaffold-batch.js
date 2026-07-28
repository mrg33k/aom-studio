// POST /api/dashboard/ea-scaffold-batch
//   { tenant, workspace_name?, items: [{ name, description?, mission?: { name?, description? } }, ...] }
//
// LR-3 — multi-project + mission-per-project scaffold in a single call.
//
// One conversation can produce N projects. The EA shouldn't ask three separate
// confirmations for three asks; this endpoint is the primitive that lets the EA
// (or any caller) batch the scaffold and narrate it as one motion.
//
// Behaviour per item:
//   1. Slugify the name, validate against scaffold-project's slug regex.
//   2. Best-effort INSERT into the projects table (idempotent against duplicate slug).
//   3. Upsert the six canonical project stubs into events (same as scaffold-project).
//   4. ALWAYS scaffold at least one mission. Default: slug=first-brief, the "vision
//      interview" mission. The super-agent-mission-first doctrine says no work in a
//      project without a mission home — this endpoint enforces it at the new-project
//      surface so workers can never land in a hollow box.
//
// Partial failures are returned per-item; a successful row is never rolled back
// when a later row fails. Tenant gating runs once at the top.
//
// ── 2026-07-27 r7, corner:tenant-isolation — THE THIRD CREATION DOOR ─────────
// r5 hardened create-project-from-chat.js; r7 hardened voice-create-entity.js.
// This is the same job a third time and had neither guard: verifyTenant proved
// the WORLD, then ensureProjectRow() inserted projects{slug, client_id:<tenant>}
// with a caller-chosen slug.
//
//   ARSENAL_MEMBER POSTs {tenant:'arsenal', items:[{name:'Rex'}]}
//   -> projects{slug:'rex', client_id:'arsenal'} INSERTED   (replayed: HTTP 200)
//
// projects.client_id IS the holder world the whole authorization model reads,
// there is no unique index on projects.slug, and lookupProjectBySlug() takes
// limit=1 with no client filter — so that one row can flip the holder of AOM's
// rex (54 live rows) to another world, admitting the attacker via holder-world
// AND 403-ing the real members out. Both failure modes, one request, invisible
// to the super-admin who returns on the bypass before any of it runs.
//
// Closed with the same two guards the siblings carry, and nothing else:
// makeProjectScopeAuthorizer (may this tenant claim this slug) and the
// held-by-another-world 409. Refusal is PER ITEM — this endpoint's contract is
// partial success, so one denied item must not fail a legitimate batch.

import { verifyTenant, TenantAuthError, lookupProjectBySlug } from '../_lib/verifyTenant.js'
import { makeProjectScopeAuthorizer } from '../_lib/write-message.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVENTS_TABLE = 'events'
const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const MAX_SLUG_LEN = 50
const MAX_ITEMS_PER_BATCH = 10

const DEFAULT_MISSION_SLUG = 'first-brief'
const DEFAULT_MISSION_NAME = 'First brief'
const DEFAULT_MISSION_DESCRIPTION =
  'Vision interview — fill in the project north star, pillars, and what done looks like.'

function dbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Loose slugify so the EA can pass natural-language names. Validation against
// SLUG_RE happens after — names that collapse to empty / start with a digit
// fail the item with a clear error rather than silently mangling.
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN)
}

function projectStubs(slug, name, description) {
  const title = name || titleFromSlug(slug)
  const desc = description || `_TBD: one-line description of ${title}_`
  const d = today()
  return {
    'VISION.md': `# ${title} — Vision

**Source of truth.** If this file disagrees with any other doc in this project, this file wins.

**Paired with \`BUILD.md\`.** VISION says what/why. BUILD says how/when, round by round.

---

## What this project IS

${desc}

## North star

_TBD._ What "done" looks like in 30 days. The shortest sentence that captures the win.

## Pillars

_TBD._ The 2-4 things this project must deliver.

---

## Change log

- **${d}** — Scaffolded via ea-scaffold-batch (LR-3). Needs EA interview to fill in north star + pillars.
`,
    'RESEARCH.md': `# ${title} — Research

> Findings accumulate as the project progresses. Research happens **before** build.

**Started:** ${d}

## Index

_No research yet. First research task will append here._
`,
    'BUILD.md': `# ${title} — Build Plan

**Started:** ${d}

**Paired with \`VISION.md\`.** BUILD says how/when, round by round.

## Rounds

### R1 — Vision interview

EA interviews the user to fill in VISION.md (north star, pillars, what-it-is).

**Status:** queued (mission scaffold spawned alongside this project).
`,
    'CONTEXT.md': `# ${title} — Project Context

**Source of truth pair:** \`VISION.md\` (what/why) + \`BUILD.md\` (how/when). This file is a living summary.

**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Project box created via ea-scaffold-batch. First mission scaffolded automatically. No work started.
`,
    'last-conversation.md': `# ${title} — Last Conversation

**Empty tape.** First interaction populates this.

Scaffolded ${d}.
`,
    'research/README.md': `# ${title} Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` (one level up) is the index.

Scaffolded ${d}.
`,
  }
}

function missionStubs(missionSlug, parentSlug, missionName, missionDescription, parentName) {
  const title = missionName || titleFromSlug(missionSlug)
  const desc = missionDescription || `_TBD: one-line description of ${title}_`
  const d = today()
  const parentLabel = parentName || titleFromSlug(parentSlug)
  return {
    'VISION.md': `# ${title} — Mission Vision

**Source of truth for this mission.** Inherits from \`${parentLabel}\` but scoped to the work this mission carries.

**Mission path:** \`${parentSlug}:${missionSlug}\`
**Paired with this mission's \`BUILD.md\`.**

---

## What this mission IS

${desc}

## North star

_TBD._

## Pillars

_TBD._

---

## Change log

- **${d}** — Scaffolded via ea-scaffold-batch (LR-3). Inherits parent: ${parentLabel}.
`,
    'RESEARCH.md': `# ${title} — Mission Research

> Findings specific to this mission.

**Started:** ${d}

## Index

_No research yet._
`,
    'BUILD.md': `# ${title} — Mission Build Plan

**Started:** ${d}
**Mission path:** \`${parentSlug}:${missionSlug}\`

## Rounds

### M1 — Vision interview

Interview to fill in this mission's VISION.md.

**Status:** queued.
`,
    'CONTEXT.md': `# ${title} — Mission Context

**Mission path:** \`${parentSlug}:${missionSlug}\`
**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Mission scaffolded alongside parent project. First task: vision interview.
`,
    'last-conversation.md': `# ${title} — Last Conversation

**Empty tape.** Mission path: \`${parentSlug}:${missionSlug}\`. Scaffolded ${d}.
`,
    'research/README.md': `# ${title} Mission Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` (one level up) is the index.

Scaffolded ${d}.
`,
  }
}

async function upsertScaffoldStub({ agentKey, filename, content, tenantId }) {
  const q =
    `event_type=eq.${encodeURIComponent(SCAFFOLD_EVENT_TYPE)}` +
    `&agent=eq.${encodeURIComponent(agentKey)}` +
    `&payload->>filename=eq.${encodeURIComponent(filename)}` +
    `&select=id&limit=1`
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?${q}`, {
    headers: dbHeaders(),
  })
  if (!existingRes.ok) {
    throw new Error(
      `lookup ${agentKey}/${filename} failed ${existingRes.status}: ${(await existingRes.text()).slice(0, 200)}`,
    )
  }
  const existing = await existingRes.json()
  const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId }

  if (Array.isArray(existing) && existing[0]?.id) {
    const id = existing[0].id
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: dbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify({ payload, timestamp: new Date().toISOString() }),
    })
    if (!r.ok) throw new Error(`update ${agentKey}/${filename} failed ${r.status}: ${(await r.text()).slice(0, 200)}`)
    return { filename, action: 'updated' }
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}`, {
    method: 'POST',
    headers: dbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({
      event_type: SCAFFOLD_EVENT_TYPE,
      agent: agentKey,
      payload,
      timestamp: new Date().toISOString(),
    }),
  })
  if (!r.ok) throw new Error(`insert ${agentKey}/${filename} failed ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return { filename, action: 'inserted' }
}

async function ensureProjectRow({ slug, name, tenant }) {
  // Best-effort projects-table insert. Idempotent: if a row with this
  // (slug, client_id) already exists we treat the duplicate-key error as success.
  // The events-layer scaffold is the source of truth for "the box exists";
  // the projects row is a UI convenience consumed by the dashboard list.
  const row = {
    name,
    slug,
    color: '#E85D26',
    is_active: true,
    client_id: tenant,
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST',
      headers: dbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    })
    if (r.ok) return { ok: true, action: 'inserted' }
    const text = await r.text()
    if (/duplicate|already exists|unique/i.test(text)) {
      return { ok: true, action: 'exists' }
    }
    return { ok: false, error: text.slice(0, 200) }
  } catch (err) {
    return { ok: false, error: err?.message || String(err) }
  }
}

// Exported so api/dashboard/chat.js can wire `scaffold_projects_batch` as a
// tool for dispatcher agents without re-implementing the orchestration. The
// tenantId is taken on trust here — verifyTenant is the boundary gate at the
// HTTP endpoint; in-process callers pass the verified value through.
//
// `authorizeProjectScope` is NOT optional (r7). A projects row IS the holder
// world, so an unauthorized slug claim has no safe degraded form — omitting the
// authorizer therefore DENIES, loudly, instead of silently writing. There is no
// live in-process caller today, so this costs nothing and cannot be forgotten by
// the next one.
export async function scaffoldOneItem({ item, tenantId, authorizeProjectScope }) {
  const rawName = (item?.name || '').toString().trim()
  if (!rawName) return { ok: false, error: 'name required' }

  const slug = slugify(rawName)
  if (!SLUG_RE.test(slug) || slug.length > MAX_SLUG_LEN) {
    return {
      ok: false,
      name: rawName,
      error: `slug "${slug}" must match ^[a-z][a-z0-9-]*$ and be ≤${MAX_SLUG_LEN} chars`,
    }
  }

  const description = (item?.description || '').toString().trim() || null
  const projectName = rawName.slice(0, 80)

  // MAY THIS TENANT CLAIM THIS SLUG? Before ANY write for this item — the stub
  // scaffold is canon an agent reads as truth, so a denied item writes nothing
  // at all, not just no projects row.
  if (typeof authorizeProjectScope !== 'function') {
    console.warn(
      `[ea-scaffold-batch] DENIED: no authorizeProjectScope supplied for tenant "${tenantId}" slug "${slug}" — refusing rather than claiming the slug ungated`
    )
    return { ok: false, slug, name: projectName, error: 'project scope authorizer missing' }
  }
  let scope
  try {
    scope = await authorizeProjectScope(slug)
  } catch (err) {
    // Fail closed: an authorizer that threw decided nothing.
    scope = { ok: false, reason: String((err && err.message) || err) }
  }
  if (!scope || !scope.ok) {
    console.warn(
      `[ea-scaffold-batch] DENIED: world "${tenantId}" may not claim project "${slug}" — ${scope?.reason || 'not reachable from this world'}`
    )
    return {
      ok: false,
      slug,
      name: projectName,
      reason: 'project-belongs-to-another-world',
      error: `project "${slug}" belongs to another world`,
    }
  }

  // A GRANT LETS YOU REACH ANOTHER WORLD'S PROJECT. IT DOES NOT LET YOU MINT A
  // SECOND `projects` ROW FOR ITS SLUG — with no unique index on projects.slug
  // and lookupProjectBySlug() reading limit=1 unfiltered, a duplicate makes the
  // holder a coin flip. Zero cross-world duplicate slugs exist live (2026-07-27),
  // so this refuses nothing that works today.
  const heldElsewhere = await lookupProjectBySlug(slug)
  if (heldElsewhere?.ownerWorld && heldElsewhere.ownerWorld !== tenantId) {
    console.warn(
      `[ea-scaffold-batch] DENIED: world "${tenantId}" may not mint a second projects row for "${slug}" (held by "${heldElsewhere.ownerWorld}")`
    )
    return {
      ok: false,
      slug,
      name: projectName,
      reason: 'held-by-another-world',
      holder: heldElsewhere.ownerWorld,
      error: `project "${slug}" already exists in another world — open it there instead of creating a second one`,
    }
  }

  // Best-effort projects-table row (UI convenience; idempotent).
  const projectRow = await ensureProjectRow({ slug, name: projectName, tenant: tenantId })

  // Project stubs into events.
  let projectFiles = 0
  const projectErrors = []
  try {
    const stubs = projectStubs(slug, projectName, description)
    for (const [filename, content] of Object.entries(stubs)) {
      try {
        await upsertScaffoldStub({ agentKey: slug, filename, content, tenantId })
        projectFiles += 1
      } catch (err) {
        projectErrors.push(`${filename}: ${err.message}`)
      }
    }
  } catch (err) {
    return { ok: false, slug, name: projectName, error: `project stubs failed: ${err.message}` }
  }

  // Mission stubs — every project gets at least one mission. Caller can name it;
  // default to first-brief (the vision-interview mission). Mission-first doctrine
  // is enforced at the only conversational scaffold path.
  const missionInput = item?.mission || {}
  const rawMissionName = (missionInput.name || '').toString().trim()
  let missionSlug = slugify(rawMissionName) || DEFAULT_MISSION_SLUG
  if (!SLUG_RE.test(missionSlug) || missionSlug.length > MAX_SLUG_LEN) {
    missionSlug = DEFAULT_MISSION_SLUG
  }
  const missionName = rawMissionName || DEFAULT_MISSION_NAME
  const missionDescription =
    (missionInput.description || '').toString().trim() || DEFAULT_MISSION_DESCRIPTION

  const agentKey = `${slug}:${missionSlug}`
  let missionFiles = 0
  const missionErrors = []
  try {
    const stubs = missionStubs(missionSlug, slug, missionName, missionDescription, projectName)
    for (const [filename, content] of Object.entries(stubs)) {
      try {
        await upsertScaffoldStub({ agentKey, filename, content, tenantId })
        missionFiles += 1
      } catch (err) {
        missionErrors.push(`${filename}: ${err.message}`)
      }
    }
  } catch (err) {
    return {
      ok: false,
      slug,
      name: projectName,
      project_files: projectFiles,
      project_errors: projectErrors.length ? projectErrors : undefined,
      error: `mission stubs failed: ${err.message}`,
    }
  }

  return {
    ok: projectErrors.length === 0 && missionErrors.length === 0,
    slug,
    name: projectName,
    project_row: projectRow.action || (projectRow.ok ? 'ok' : 'failed'),
    project_files: projectFiles,
    project_errors: projectErrors.length ? projectErrors : undefined,
    mission_slug: missionSlug,
    mission_name: missionName,
    mission_files: missionFiles,
    mission_errors: missionErrors.length ? missionErrors : undefined,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { tenant: rawTenant, items } = req.body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' })
  }
  if (items.length > MAX_ITEMS_PER_BATCH) {
    return res
      .status(400)
      .json({ error: `items exceeds max ${MAX_ITEMS_PER_BATCH} per batch` })
  }

  const requestedTenant = (rawTenant || 'aom').toString().trim().toLowerCase()
  let tenantId
  try {
    ({ tenant: tenantId } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  // ONE authorizer for the whole batch, built from the VERIFIED tenant.
  const authorizeProjectScope = makeProjectScopeAuthorizer({ req, clientId: tenantId })

  const results = []
  for (const item of items) {
    try {
      results.push(await scaffoldOneItem({ item, tenantId, authorizeProjectScope }))
    } catch (err) {
      results.push({ ok: false, name: item?.name || null, error: err?.message || String(err) })
    }
  }

  const allOk = results.every(r => r.ok)
  return res.status(200).json({ ok: allOk, tenant: tenantId, count: results.length, results })
}
