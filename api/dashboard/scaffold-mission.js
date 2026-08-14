// POST /api/dashboard/scaffold-mission
//   { parent_slug, mission_slug, description, name? }
//
// R30b — missions primitive (Russian-doll nested scaffold).
//
// A mission is a sub-project that lives inside a parent project (or another
// mission). Same six-file scaffold as the parent. The events store keys
// mission scaffold rows by a colon-joined agent path:
//
//   parent project   →  agent='corner'
//   mission of it    →  agent='corner:music-pack'
//   nested mission   →  agent='corner:music-pack:drum-kit'
//
// The colon convention was picked because:
//   - PostgREST query-string safe (no encoding tax on filters)
//   - Visually obvious it's a path, not a normal slug
//   - Trivial to split/join in UI for breadcrumbs
//
// Idempotent same as scaffold-project: lookup → PATCH or INSERT per filename.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVENTS_TABLE = 'events'
const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const PARENT_PATH_RE = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/

function dbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

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
  const parentLabel = parentPath.split(':').map(titleFromSlug).join(' › ')
  return {
    'VISION.md': `# ${title} — Mission Vision

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

- **${d}** — Scaffolded via R30b (mission primitive). Inherits parent: ${parentLabel}.
`,

    'RESEARCH.md': `# ${title} — Mission Research

> Findings specific to this mission. Cross-cutting research stays in the parent's RESEARCH.md.

**Started:** ${d}

## Index

_No research yet. Add dated entries here as findings accumulate._
`,

    'BUILD.md': `# ${title} — Mission Build Plan

**Started:** ${d}
**Mission path:** \`${parentPath}:${missionSlug}\`

**Paired with this mission's \`VISION.md\`.** Round-by-round plan, scoped to this mission.

## Rounds

### M1 — Vision interview

Interview to fill in this mission's VISION.md (north star, pillars).

**Status:** queued.
`,

    'CONTEXT.md': `# ${title} — Mission Context

**Mission path:** \`${parentPath}:${missionSlug}\`
**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Mission scaffolded. No work started yet. First task: vision interview.
`,

    'last-conversation.md': `# ${title} — Last Conversation

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

async function upsertScaffoldStub({ agentKey, filename, content, tenantId }) {
  const q = `event_type=eq.${encodeURIComponent(SCAFFOLD_EVENT_TYPE)}&agent=eq.${encodeURIComponent(agentKey)}&payload->>filename=eq.${encodeURIComponent(filename)}&select=id&limit=1`
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?${q}`, {
    headers: dbHeaders(),
  })
  if (!existingRes.ok) {
    throw new Error(`scaffold-mission: lookup ${filename} failed ${existingRes.status}: ${await existingRes.text()}`)
  }
  const existing = await existingRes.json()
  // tenant_id stamped from verifyTenant — file-search.js filters on this.
  const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId }
  if (Array.isArray(existing) && existing[0]?.id) {
    const id = existing[0].id
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: dbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify({ payload, timestamp: new Date().toISOString() }),
    })
    if (!r.ok) throw new Error(`scaffold-mission: update ${filename} failed ${r.status}: ${await r.text()}`)
    const data = await r.json()
    return { filename, action: 'updated', row: Array.isArray(data) ? data[0] : data }
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
  if (!r.ok) throw new Error(`scaffold-mission: insert ${filename} failed ${r.status}: ${await r.text()}`)
  const data = await r.json()
  return { filename, action: 'inserted', row: Array.isArray(data) ? data[0] : data }
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

  // parent_slug accepts a single project slug OR a colon-joined mission path
  // for nested missions ('corner:music-pack' is a valid parent for a deeper mission).
  const { parent_slug, mission_slug, description, name, tenant: rawTenant } = req.body || {}
  if (!parent_slug || typeof parent_slug !== 'string' || !PARENT_PATH_RE.test(parent_slug) || parent_slug.length > 200) {
    return res.status(400).json({ error: 'parent_slug must match ^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$ and be ≤200 chars' })
  }
  if (!mission_slug || typeof mission_slug !== 'string' || !SLUG_RE.test(mission_slug) || mission_slug.length > 50) {
    return res.status(400).json({ error: 'mission_slug must match ^[a-z][a-z0-9-]*$ and be ≤50 chars' })
  }
  const agentKey = `${parent_slug}:${mission_slug}`

  // tenant body param (defaults to 'aom') gates who can scaffold + tags rows.
  const requestedTenant = (rawTenant || '').toString().trim().toLowerCase()
  let tenantId
  try {
    ({ tenant: tenantId } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  try {
    const stubs = missionStubs(mission_slug, parent_slug, name, description)
    const results = []
    for (const [filename, content] of Object.entries(stubs)) {
      results.push(await upsertScaffoldStub({ agentKey, filename, content, tenantId }))
    }
    return res.status(200).json({ ok: true, agent: agentKey, parent: parent_slug, mission: mission_slug, tenant: tenantId, files: results })
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) })
  }
}
