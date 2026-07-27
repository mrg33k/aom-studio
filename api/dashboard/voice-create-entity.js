// POST /api/dashboard/voice-create-entity
// Called by VoiceChat.jsx when Gemini fires a create_project or create_mission tool call.
// Creates the entity in Supabase and posts a source='voice_creation' card message so the
// chat panel shows a real-time creation card.
//
// Request body:
//   {
//     entity_type: 'project' | 'mission',
//     name: string,            -- display name
//     description?: string,
//     // project only:
//     team?: string,           -- comma-separated agent slugs
//     // mission only:
//     project: string,         -- parent project slug
//     // always:
//     client_id: string,       -- world id (e.g. "aom")
//     agent_slug?: string,     -- which agent is on the call (e.g. "project:corner", "rex")
//   }
//
// Returns { ok, entity_type, name, slug|mission_slug, parent_slug? }

// AUTH (corner:identity-attribution, 2026-07-27). Unauthenticated this created
// projects and missions in any world named by the body, and the mission branch
// wrote six scaffold_file rows whose markdown is later served to agents as room
// CANON. verifyTenant now gates it and the verified tenant — never the body —
// is what the rows are written against. CORS is the dashboard origins.

import { randomUUID } from 'node:crypto'
import { findProjectSlugTwin } from '../_lib/projectDupGuard.js'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
]

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

function applyCors(req, res) {
  const origin = req.headers?.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// ---- Slug helpers ----
function toSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'untitled'
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ---- Supabase helpers ----
async function postMessage(row) {
  const body = { id: randomUUID(), ...row }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.warn(`voice-create-entity: message post failed: ${err}`)
    return false
  }
  return true
}

// ---- Project creation ----
async function createProject(name, description, team, clientId, agentSlug, createdByName) {
  const slug = toSlug(name)
  const displayName = name || titleFromSlug(slug)
  const agentSlugs = team ? team.split(',').map(s => s.trim()).filter(Boolean) : ['ea']

  // corner:one-write-path R11 — same guard as create-project-from-chat: a
  // topic that already has a home (mission or near-name active project) must
  // not be minted as a new project from a voice call.
  const twin = await findProjectSlugTwin({
    supabaseUrl: SUPABASE_URL,
    headers: dbHeaders,
    slug,
    clientId,
  })
  if (twin) {
    const callerProj = agentSlug?.startsWith('project:') ? agentSlug.slice(8) : null
    await postMessage({
      role: 'assistant',
      client_id: clientId,
      agent: agentSlug || 'ea',
      project: callerProj || null,
      source: 'project-dup-guard',
      text: `That topic already lives in **${twin.slug}** — I didn't create a duplicate "${displayName}" project. Continue there.`,
      metadata: { dup_guard: true, existing: twin, requested: slug },
      timestamp: new Date().toISOString(),
    })
    return { ok: false, reason: 'duplicate', existing: twin, requested: slug }
  }

  // Upsert project row (idempotent on slug+client_id)
  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}&select=id,slug,name`,
    { headers: dbHeaders }
  )
  let project = null
  if (existing.ok) {
    const rows = await existing.json()
    project = Array.isArray(rows) ? rows[0] : null
  }

  if (!project) {
    const insert = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST',
      headers: { ...dbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({
        slug,
        name: displayName,
        client_id: clientId,
        is_active: true,
        color: '#6B8AB0',
        team_members: agentSlugs,
        created_at: new Date().toISOString(),
      }),
    })
    if (!insert.ok) throw new Error(`Project insert failed: ${await insert.text()}`)
    const rows = await insert.json()
    project = Array.isArray(rows) ? rows[0] : rows
  }

  // Post kickoff message in the new project room
  await postMessage({
    role: 'assistant',
    client_id: clientId,
    agent: agentSlug || 'ea',
    project: slug,
    source: 'agent-kickoff',
    text: `This is **${displayName}**. Tell me about this project — what is it, and what do you want to get done here?${description ? ` (Created via voice: ${description})` : ''}`,
    metadata: { project_slug: slug, kickoff: true },
    timestamp: new Date().toISOString(),
  })

  // Post a voice_creation card in the calling agent's room (so the chat panel shows it)
  const callerProject = agentSlug?.startsWith('project:') ? agentSlug.slice(8) : null
  await postMessage({
    role: 'assistant',
    client_id: clientId,
    agent: agentSlug || 'ea',
    project: callerProject || null,
    source: 'voice_creation',
    text: `Created project **${displayName}**`,
    metadata: {
      entity_type: 'project',
      entity_name: displayName,
      entity_slug: slug,
      description: description || '',
      created_by_name: createdByName || null,
    },
    timestamp: new Date().toISOString(),
  })

  return { ok: true, entity_type: 'project', name: displayName, slug }
}

// ---- Mission creation ----
async function createMission(name, projectSlug, description, clientId, agentSlug, createdByName) {
  const missionSlug = toSlug(name)
  const displayName = name || titleFromSlug(missionSlug)
  const d = today()
  // "Created via voice call" used to be the whole provenance line. Name the
  // actual caller when we know them; say we don't when we don't (RULE 2).
  const by = createdByName ? ` by ${createdByName}` : ' (caller not identified)'

  const stubs = {
    'VISION.md': `# ${displayName} — Mission Vision\n\n**Mission path:** \`${projectSlug}:${missionSlug}\`\n\n---\n\n## What this mission IS\n\n${description || '_TBD_'}\n\n## Change log\n\n- **${d}** — Created via voice call${by}.\n`,
    'RESEARCH.md': `# ${displayName} — Mission Research\n\n**Started:** ${d}\n\n## Index\n\n_No research yet._\n`,
    'BUILD.md': `# ${displayName} — Mission Build Plan\n\n**Started:** ${d}\n**Mission path:** \`${projectSlug}:${missionSlug}\`\n\n## Rounds\n\n### M1 — Vision interview\n\n**Status:** queued.\n`,
    'CONTEXT.md': `# ${displayName} — Mission Context\n\n**Mission path:** \`${projectSlug}:${missionSlug}\`\n**Status:** NEW\n**Created:** ${d}\n\n## Current State\n\nMission created from voice call${by}. ${description ? 'Intent: ' + description : 'No description yet.'}\n`,
    'last-conversation.md': `# ${displayName} — Last Conversation\n\n**Empty tape.** Created ${d} via voice call${by}.\n\nMission path: \`${projectSlug}:${missionSlug}\`\n`,
    'research/README.md': `# ${displayName} Mission Research\n\nDrop research artifacts here as dated markdown files.\n\nCreated ${d}.\n`,
  }

  const agentKey = `${projectSlug}:${missionSlug}`
  const tenantId = clientId

  // Scaffold 6 mission stub files into events table
  for (const [filename, content] of Object.entries(stubs)) {
    const q = [
      'event_type=eq.scaffold_file',
      `agent=eq.${encodeURIComponent(agentKey)}`,
      `payload->>filename=eq.${encodeURIComponent(filename)}`,
      'select=id',
      'limit=1',
    ].join('&')
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/events?${q}`, { headers: dbHeaders })
    const existing = existingRes.ok ? await existingRes.json() : []
    const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId }

    if (Array.isArray(existing) && existing[0]?.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: 'PATCH',
        headers: { ...dbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ payload, timestamp: new Date().toISOString() }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          event_type: 'scaffold_file',
          agent: agentKey,
          payload,
          timestamp: new Date().toISOString(),
        }),
      })
    }
  }

  // Post kickoff message into the mission room
  await postMessage({
    role: 'assistant',
    client_id: clientId,
    agent: 'ea',
    project: projectSlug,
    source: 'agent-kickoff',
    text: `This is **${displayName}**. What are you working on here?${description ? ` (Created via voice: ${description})` : ''} Tell me and I'll set the mission up around your answer.`,
    metadata: { mission_slug: missionSlug, kickoff: true },
    timestamp: new Date().toISOString(),
  })

  // Post a voice_creation card in the calling agent's room
  const callerProject = agentSlug?.startsWith('project:') ? agentSlug.slice(8) : null
  await postMessage({
    role: 'assistant',
    client_id: clientId,
    agent: agentSlug || 'ea',
    project: callerProject || null,
    source: 'voice_creation',
    text: `Created mission **${displayName}** under ${projectSlug}`,
    metadata: {
      entity_type: 'mission',
      entity_name: displayName,
      entity_slug: missionSlug,
      parent_slug: projectSlug,
      description: description || '',
      created_by_name: createdByName || null,
    },
    timestamp: new Date().toISOString(),
  })

  return { ok: true, entity_type: 'mission', name: displayName, mission_slug: missionSlug, parent_slug: projectSlug }
}

// ---- Handler ----
export default async function handler(req, res) {
  applyCors(req, res)
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { entity_type, name, description, team, project, client_id, agent_slug } = req.body || {}

  if (!entity_type || !['project', 'mission'].includes(entity_type)) {
    return res.status(400).json({ error: 'entity_type must be "project" or "mission"' })
  }
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' })
  }
  if (!client_id || typeof client_id !== 'string') {
    return res.status(400).json({ error: 'client_id required' })
  }
  if (entity_type === 'mission' && (!project || typeof project !== 'string')) {
    return res.status(400).json({ error: 'project (slug) required for entity_type=mission' })
  }

  // The world these rows land in is the VERIFIED tenant, not the body string.
  let verified
  try {
    verified = await verifyTenant(client_id, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const tenant = verified.tenant
  // Recorded so the room can say who created it. Never defaulted to a person.
  const identity = await callerIdentity(req).catch(() => null)
  const createdByName = identity?.userName || null

  try {
    if (entity_type === 'project') {
      const result = await createProject(name, description, team, tenant, agent_slug, createdByName)
      return res.status(200).json(result)
    } else {
      const result = await createMission(name, project, description, tenant, agent_slug, createdByName)
      return res.status(200).json(result)
    }
  } catch (err) {
    console.error('voice-create-entity error:', err)
    return res.status(500).json({ error: err.message })
  }
}
