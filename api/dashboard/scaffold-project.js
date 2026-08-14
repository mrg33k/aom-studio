// POST /api/dashboard/scaffold-project  { slug, name, description }
//
// R30 — writes the six canonical scaffold stubs into the `events` table so the
// dashboard Files section surfaces them automatically. Idempotent: if a row
// (event_type='scaffold_file', agent=<slug>, payload->>filename=<name>) already
// exists it is PATCHed in place, otherwise inserted.
//
// We use `events` (not a dedicated `text_files` table) because the AOM rule is
// REST-only / no DDL: schema-free storage goes through `events`. The six
// canonical surfaces per VISION.md "Project self-maintenance":
//   VISION.md / RESEARCH.md / BUILD.md / CONTEXT.md / last-conversation.md
//   + research/README.md (the "+ research/ dir" the VISION promises).
// A sixth live surface is the project's tasks queue — queued separately by
// whichever flow calls this endpoint; not written here.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVENTS_TABLE = 'events'
const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

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

function stubContent(slug, name, description) {
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

_TBD._ The 2-4 things this project must deliver. Each one gets a section the build doc plans against.

---

## Change log

- **${d}** — Scaffolded via R30. Needs EA interview to fill in north star + pillars.
`,

    'RESEARCH.md': `# ${title} — Research

> Findings accumulate as the project progresses. Research happens **before** build.
> A little research goes a long way; agents should default to verifying current
> reality before producing code against it.

**Started:** ${d}

## Index

_No research yet. First research task will append here._

## How to add research

1. Drop research artifacts into \`projects/${slug}/research/\`.
2. Add a dated index entry here — heading, date, question answered, 2-3 sentence synthesis + source link.
3. Build tasks cite the relevant section in their brief body.
`,

    'BUILD.md': `# ${title} — Build Plan

**Started:** ${d}

**Paired with \`VISION.md\`.** BUILD says how/when, round by round, with task IDs and commit hashes. VISION says what the project is and why. Every round below should trace to a commitment in VISION.md.

## North Star

_Mirror from VISION.md once that's ratified._

## Rounds

### R1 — Vision interview

EA interviews the user to fill in VISION.md (north star, pillars, what-it-is).

**Status:** queued (first task spawned on scaffold).

### R2 — TBD

Defined after R1 ratifies the vision.

## Ground rules for every round

1. Read VISION.md before starting any task.
2. Verify before saying done — run the thing, look at the output.
3. Append commit hash + flip status here when each round ships.
`,

    'CONTEXT.md': `# ${title} — Project Context

**Source of truth pair:** \`VISION.md\` (what/why) + \`BUILD.md\` (how/when). This file is a living summary — backstory for workers, not product direction.

**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Project box created. No work started. First task: vision interview.

## Hard Rules

- All work scoped to this project stays in this box.
- Read VISION.md + BUILD.md before touching any code.
`,

    'last-conversation.md': `# ${title} — Last Conversation

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

\`RESEARCH.md\` (one level up) is the index — it summarizes what lives in this
folder with 2-3 sentence synthesis + links back. Build tasks cite the
\`RESEARCH.md\` section that covers the relevant finding.

Scaffolded ${today()}.
`,
  }
}

async function upsertScaffoldStub({ slug, filename, content, tenantId }) {
  // Idempotent: query on (event_type, agent, payload->>filename), then PATCH or INSERT.
  // PostgREST supports JSON path filters like `payload->>filename=eq.<v>`.
  const q = `event_type=eq.${encodeURIComponent(SCAFFOLD_EVENT_TYPE)}&agent=eq.${encodeURIComponent(slug)}&payload->>filename=eq.${encodeURIComponent(filename)}&select=id&limit=1`
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}?${q}`, {
    headers: dbHeaders(),
  })
  if (!existingRes.ok) {
    throw new Error(`scaffold-project: lookup ${filename} failed ${existingRes.status}: ${await existingRes.text()}`)
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
    if (!r.ok) throw new Error(`scaffold-project: update ${filename} failed ${r.status}: ${await r.text()}`)
    const data = await r.json()
    return { filename, action: 'updated', row: Array.isArray(data) ? data[0] : data }
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${EVENTS_TABLE}`, {
    method: 'POST',
    headers: dbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({
      event_type: SCAFFOLD_EVENT_TYPE,
      agent: slug,
      payload,
      timestamp: new Date().toISOString(),
    }),
  })
  if (!r.ok) throw new Error(`scaffold-project: insert ${filename} failed ${r.status}: ${await r.text()}`)
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

  const { slug, name, description, tenant: rawTenant } = req.body || {}
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug required' })
  }
  if (!/^[a-z][a-z0-9-]*$/.test(slug) || slug.length > 50) {
    return res.status(400).json({ error: 'slug must match ^[a-z][a-z0-9-]*$ and be <=50 chars' })
  }

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
    const stubs = stubContent(slug, name, description)
    const results = []
    for (const [filename, content] of Object.entries(stubs)) {
      results.push(await upsertScaffoldStub({ slug, filename, content, tenantId }))
    }
    return res.status(200).json({ ok: true, slug, tenant: tenantId, files: results })
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) })
  }
}
