// POST /api/dashboard/create-mission-from-drawer
// R78-p9b corner:new-projects — Mission creation for the self-serve drawer "New mission" button.
//
// Request body:
//   { parent_slug, mission_slug, name, client_id }
//
//   parent_slug  — project slug (or colon-joined path for nested missions)
//   mission_slug — bare slug, e.g. "hero-section"
//   name         — display name typed by the user
//   client_id    — world id (e.g. "aom")
//
// Does two things:
//   1. Scaffolds 6 mission stub files into the events table (same as scaffold-mission.js)
//   2. Posts a kickoff greeting into the new mission room so it's alive on arrival
//
// Returns { ok, parent_slug, mission_slug, name, kickoff_posted }

import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const PARENT_PATH_RE = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function missionStubs(missionSlug, parentPath, displayName) {
  const d = today()
  const parentLabel = parentPath.split(':').map(titleFromSlug).join(' › ')
  return {
    'VISION.md':
`# ${displayName} — Mission Vision

**Mission path:** \`${parentPath}:${missionSlug}\`

---

## What this mission IS

_TBD: one-line description of ${displayName}_

## North star

_TBD._

## Change log

- **${d}** — Scaffolded via drawer. Parent: ${parentLabel}.
`,
    'RESEARCH.md':
`# ${displayName} — Mission Research

**Started:** ${d}

## Index

_No research yet. Add dated entries here as findings accumulate._
`,
    'BUILD.md':
`# ${displayName} — Mission Build Plan

**Started:** ${d}
**Mission path:** \`${parentPath}:${missionSlug}\`

## Rounds

### M1 — Vision interview

Interview to fill in this mission's VISION.md (north star, pillars).

**Status:** queued.
`,
    'CONTEXT.md':
`# ${displayName} — Mission Context

**Mission path:** \`${parentPath}:${missionSlug}\`
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Mission scaffolded. No work started yet. First task: vision interview.
`,
    'last-conversation.md':
`# ${displayName} — Last Conversation

**Empty tape.** First interaction populates this.

Mission path: \`${parentPath}:${missionSlug}\`
Scaffolded ${d}.
`,
    'research/README.md':
`# ${displayName} Mission Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` (one level up) is the index.

Scaffolded ${d}.
`,
  }
}

async function upsertScaffoldStub(agentKey, filename, content, tenantId) {
  const q = [
    'event_type=eq.scaffold_file',
    `agent=eq.${encodeURIComponent(agentKey)}`,
    `payload->>filename=eq.${encodeURIComponent(filename)}`,
    'select=id',
    'limit=1',
  ].join('&')
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/events?${q}`, { headers: dbHeaders })
  if (!existingRes.ok) {
    throw new Error(`scaffold lookup for ${filename} failed: ${existingRes.status} ${await existingRes.text()}`)
  }
  const existing = await existingRes.json()
  const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId }
  if (Array.isArray(existing) && existing[0]?.id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: 'PATCH',
      headers: { ...dbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({ payload, timestamp: new Date().toISOString() }),
    })
    if (!r.ok) throw new Error(`scaffold update ${filename} failed: ${r.status} ${await r.text()}`)
  } else {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { ...dbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({
        event_type: 'scaffold_file',
        agent: agentKey,
        payload,
        timestamp: new Date().toISOString(),
      }),
    })
    if (!r.ok) throw new Error(`scaffold insert ${filename} failed: ${r.status} ${await r.text()}`)
  }
}

async function postKickoffMessage(clientId, parentSlug, missionSlug, displayName) {
  // The greeting lands with metadata.mission_slug = bare slug so the
  // ChatPanel's missionSlugsMatch filter picks it up when the user enters
  // the mission room (conversationTarget.missionSlug = bare slug).
  const body = {
    id: randomUUID(),
    role: 'assistant',
    client_id: clientId,
    agent: 'ea',
    project: parentSlug,
    source: 'agent-kickoff',
    text: `This is **${displayName}**. What are you working on here? Tell me and I'll set the mission up around your answer.`,
    metadata: { mission_slug: missionSlug, kickoff: true },
    timestamp: new Date().toISOString(),
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.warn(`create-mission-from-drawer: kickoff message failed: ${err}`)
    return false
  }
  return true
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { parent_slug, mission_slug, name, client_id } = req.body || {}

  if (!parent_slug || typeof parent_slug !== 'string' || !PARENT_PATH_RE.test(parent_slug) || parent_slug.length > 200) {
    return res.status(400).json({ error: 'parent_slug required — project slug or colon-joined path, lowercase' })
  }
  if (!mission_slug || typeof mission_slug !== 'string' || !SLUG_RE.test(mission_slug) || mission_slug.length > 50) {
    return res.status(400).json({ error: 'mission_slug required — lowercase letters, numbers, hyphens, max 50 chars' })
  }
  if (!client_id || typeof client_id !== 'string') {
    return res.status(400).json({ error: 'client_id required' })
  }

  const displayName = (name || '').trim() || titleFromSlug(mission_slug)
  const agentKey = `${parent_slug}:${mission_slug}`

  try {
    // 1. Scaffold the 6 mission stub files
    const stubs = missionStubs(mission_slug, parent_slug, displayName)
    for (const [filename, content] of Object.entries(stubs)) {
      await upsertScaffoldStub(agentKey, filename, content, client_id)
    }

    // 2. Post kickoff greeting into the mission room
    const kickoffOk = await postKickoffMessage(client_id, parent_slug, mission_slug, displayName)

    return res.status(200).json({
      ok: true,
      parent_slug,
      mission_slug,
      name: displayName,
      agent: agentKey,
      kickoff_posted: kickoffOk,
    })
  } catch (err) {
    console.error('create-mission-from-drawer error:', err)
    return res.status(500).json({ error: err.message })
  }
}
