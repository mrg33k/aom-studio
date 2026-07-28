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
//
// ── 2026-07-27 r7, corner:tenant-isolation — THE SECOND CREATION DOOR ────────
// r5 hardened create-project-from-chat.js and create-mission-from-drawer.js. It
// never touched this file, which does BOTH of those jobs and had NEITHER guard.
//
//   ARSENAL_MEMBER POSTs {entity_type:'project', name:'Rex', client_id:'arsenal'}
//   -> projects{slug:'rex', client_id:'arsenal'} INSERTED   (replayed: HTTP 200)
//
// There is no unique index on projects.slug, and lookupProjectBySlug() reads
// limit=1 with no client filter and no ordering — so from that moment
// verifyProjectAccess('rex') MAY resolve ownerWorld='arsenal', admitting the
// attacker via holder-world AND 403-ing the real AOM members out of a room with
// 54 live AOM rows. One request, BOTH failure modes. The kickoff message posted
// in the same request mints the participation evidence to go with it.
//
//   KARENS_MEMBER POSTs {entity_type:'mission', name:'Probe', project:'corner',
//                        client_id:'karens-world'}
//   -> six scaffold_file CANON rows under 'corner:probe' + a kickoff row tagged
//      project='corner'                                     (replayed: HTTP 200)
//
// That is create-mission-from-drawer's r5 exploit, verbatim, one endpoint over.
//
// Closed with the existing model, nothing invented — the same four things r5
// used on the siblings:
//   1. makeProjectScopeAuthorizer() — may this tenant CLAIM this slug (project
//      branch) / SCAFFOLD under this parent (mission branch). REFUSE, don't
//      degrade: unlike a chat row the project slug IS the request.
//   2. The held-by-another-world 409. A grant lets you REACH another world's
//      project; it does not let you mint a second projects row for its slug.
//   3. Slug + display-name validation. `name` lands in six canon stubs every
//      agent reads as truth and in room message text, with no cap and no
//      character check — an injection surface even from an authorized caller.
//   4. world_id stamped on every row this file writes (r5's contract). Every
//      postMessage() here omitted it, so all of them took the DB default.

import { randomUUID } from 'node:crypto'
import { findProjectSlugTwin } from '../_lib/projectDupGuard.js'
import {
  verifyTenant, TenantAuthError, callerIdentity, lookupProjectBySlug,
} from '../_lib/verifyTenant.js'
import { makeProjectScopeAuthorizer, deriveRowWorld } from '../_lib/write-message.js'

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

// ---- Input validation (r7) ----
// Same shapes as create-project-from-chat.js / create-mission-from-drawer.js —
// deliberately permissive so no live slug shape starts 400ing, but a `name` that
// lands in canon stubs may not carry line breaks, control characters or the
// zero-width / bidi marks that hide text from a human reviewer while an agent
// still reads it.
const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/
const MAX_SLUG = 64
const MAX_NAME = 120
const UNSAFE_TEXT = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2028\u2029\uFEFF]/

function cleanSlug(raw) {
  if (!raw || typeof raw !== 'string') return null
  // Lowercased: PostgREST `eq` is case sensitive, so 'REX' looks unclaimed to
  // every check in the model while colliding with the live 'rex' on disk.
  const v = raw.trim().toLowerCase()
  if (!v || v.length > MAX_SLUG) return null
  if (!SLUG_RE.test(v)) return null
  if (v.includes('..')) return null // interpolated into an agent key / path
  return v
}

function cleanDisplayName(raw) {
  if (raw == null || raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'name must be a string' }
  if (UNSAFE_TEXT.test(raw)) {
    return { ok: false, error: 'name may not contain line breaks or control characters' }
  }
  const value = raw.trim()
  if (value.length > MAX_NAME) return { ok: false, error: `name must be ${MAX_NAME} characters or fewer` }
  return { ok: true, value: value || null }
}

// A parent may arrive as a colon-joined path for a nested mission. The PROJECT
// is the first segment — gating the whole path would 403 every nested create,
// which is the lockout create-mission-from-drawer.js documents.
function rootProjectOf(parentPath) {
  return String(parentPath || '').split(':')[0].trim().toLowerCase()
}

// Spread into a messages payload to stamp world_id. Delegates to the writer's
// deriveRowWorld so this endpoint and writeMessageRow cannot disagree about what
// world a row was written from — including the case a local copy would get
// wrong: a 'shared:<slug>' tenant is a ROOM, not a world, so stamping it raw
// would put a room name in the world column. Returns {} (column left NULL) only
// when the world is genuinely unknowable, and says so.
function stampWorld(clientId, creatorWorld) {
  const { world, via } = deriveRowWorld({ clientId, worldId: creatorWorld || null })
  if (!world) {
    console.warn(
      `[voice-create-entity] world unresolved for tenant "${clientId}" (via ${via}) — writing the row unstamped rather than guessing`
    )
    return {}
  }
  return { world_id: world }
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

// The project slug the CALLING agent is standing in ('project:<slug>'), used as
// the `project` column on the voice_creation card. It is caller-supplied like
// every other slug here, so it is scope-checked too and dropped when refused —
// the card is cosmetic, so losing its room beats minting presence evidence.
async function resolveCallerProject(agentSlug, authorizeProjectScope) {
  const raw = agentSlug?.startsWith('project:') ? agentSlug.slice(8) : null
  const slug = cleanSlug(raw)
  if (!slug) return null
  const verdict = await authorizeProjectScope(slug).catch(() => null)
  if (verdict?.ok) return slug
  console.warn(
    `[voice-create-entity] caller-room scope DENIED for project "${raw}" — posting the creation card unscoped`
  )
  return null
}

// ---- Project creation ----
async function createProject(
  name, description, team, clientId, agentSlug, createdByName, creatorWorld,
  { authorizeProjectScope },
) {
  const slug = cleanSlug(toSlug(name))
  if (!slug) return { ok: false, status: 400, reason: 'invalid-slug', error: 'name does not produce a usable project slug' }
  const displayName = name || titleFromSlug(slug)
  const agentSlugs = team ? team.split(',').map(s => s.trim()).filter(Boolean) : ['ea']

  // MAY THIS TENANT CLAIM THIS SLUG? The r4 authorizer, reused verbatim — the
  // same decision create-project-from-chat.js makes. A verified session is NOT
  // enough on its own: there is no unique index on projects.slug and
  // lookupProjectBySlug() reads limit=1 with no client filter, so minting a row
  // for an existing slug in your own world can flip the holder the rest of the
  // model resolves. REFUSE rather than degrade — the slug IS the request.
  const scope = await authorizeProjectScope(slug)
  if (!scope || !scope.ok) {
    console.warn(
      `[voice-create-entity] DENIED: world "${clientId}" may not claim project "${slug}" — ${scope?.reason || 'not reachable from this world'}`
    )
    return {
      ok: false,
      status: 403,
      reason: 'project-belongs-to-another-world',
      requested: slug,
      error: `project "${slug}" belongs to another world`,
    }
  }

  // A GRANT LETS YOU REACH ANOTHER WORLD'S PROJECT. IT DOES NOT LET YOU MINT A
  // SECOND `projects` ROW FOR ITS SLUG. The existing-row check below is scoped
  // to the caller's own world, so without this a granted world (AOM into
  // arsenal-held space-rising) inserts a duplicate and the holder becomes a
  // coin flip. Live check 2026-07-27: zero cross-world duplicate slugs exist,
  // so this 409 affects no live project.
  const heldElsewhere = await lookupProjectBySlug(slug)
  if (heldElsewhere?.ownerWorld && heldElsewhere.ownerWorld !== clientId) {
    console.warn(
      `[voice-create-entity] DENIED: world "${clientId}" may not mint a second projects row for "${slug}" (held by "${heldElsewhere.ownerWorld}")`
    )
    return {
      ok: false,
      status: 409,
      reason: 'held-by-another-world',
      requested: slug,
      holder: heldElsewhere.ownerWorld,
      error: `project "${slug}" already exists in another world — open it there instead of creating a second one`,
    }
  }

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
    const callerProj = await resolveCallerProject(agentSlug, authorizeProjectScope)
    await postMessage({
      role: 'assistant',
      client_id: clientId,
      ...stampWorld(clientId, creatorWorld),
      agent: agentSlug || 'ea',
      project: callerProj || null,
      source: 'project-dup-guard',
      text: `That topic already lives in **${twin.slug}** — I didn't create a duplicate "${displayName}" project. Continue there.`,
      metadata: { dup_guard: true, existing: twin, requested: slug },
      timestamp: new Date().toISOString(),
    })
    return {
      ok: false,
      status: 409,
      reason: 'duplicate',
      existing: twin,
      requested: slug,
      error: `that topic already lives in "${twin.slug}" — continue there`,
    }
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
    ...stampWorld(clientId, creatorWorld),
    agent: agentSlug || 'ea',
    project: slug,
    source: 'agent-kickoff',
    text: `This is **${displayName}**. Tell me about this project — what is it, and what do you want to get done here?${description ? ` (Created via voice: ${description})` : ''}`,
    metadata: { project_slug: slug, kickoff: true },
    timestamp: new Date().toISOString(),
  })

  // Post a voice_creation card in the calling agent's room (so the chat panel shows it)
  const callerProject = await resolveCallerProject(agentSlug, authorizeProjectScope)
  await postMessage({
    role: 'assistant',
    client_id: clientId,
    ...stampWorld(clientId, creatorWorld),
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
async function createMission(
  name, projectSlug, description, clientId, agentSlug, createdByName, creatorWorld,
  { authorizeProjectScope },
) {
  const missionSlug = cleanSlug(toSlug(name))
  if (!missionSlug) return { ok: false, status: 400, reason: 'invalid-slug', error: 'name does not produce a usable mission slug' }

  // MAY THIS TENANT SCAFFOLD UNDER THIS PARENT? Same authorizer, run on the ROOT
  // project of the parent path — never the colon-joined path, which would 403
  // every nested mission create (the lockout create-mission-from-drawer.js
  // documents). Without this, a mission create is a second door onto the r5
  // exploit: six scaffold_file CANON rows plus a kickoff row tagged with another
  // world's project slug. REFUSE: the parent IS the request.
  const rootProject = rootProjectOf(projectSlug)
  if (!rootProject || !cleanSlug(rootProject)) {
    return { ok: false, status: 400, reason: 'invalid-parent', error: 'project (parent slug) is not a usable project slug' }
  }
  const scope = await authorizeProjectScope(rootProject)
  if (!scope || !scope.ok) {
    console.warn(
      `[voice-create-entity] DENIED: world "${clientId}" may not scaffold under project "${rootProject}" — ${scope?.reason || 'not reachable from this world'}`
    )
    return {
      ok: false,
      status: 403,
      reason: 'project-belongs-to-another-world',
      requested: rootProject,
      error: `project "${rootProject}" belongs to another world`,
    }
  }

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
    ...stampWorld(clientId, creatorWorld),
    agent: 'ea',
    project: projectSlug,
    source: 'agent-kickoff',
    text: `This is **${displayName}**. What are you working on here?${description ? ` (Created via voice: ${description})` : ''} Tell me and I'll set the mission up around your answer.`,
    metadata: { mission_slug: missionSlug, kickoff: true },
    timestamp: new Date().toISOString(),
  })

  // Post a voice_creation card in the calling agent's room
  const callerProject = await resolveCallerProject(agentSlug, authorizeProjectScope)
  await postMessage({
    role: 'assistant',
    client_id: clientId,
    ...stampWorld(clientId, creatorWorld),
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
  // `name` reaches six canon stubs an agent reads as truth and a room message
  // body. Checked by SHAPE, not escaped — an authorized caller is still a
  // caller. Runs before the tenant gate only in the sense that it is cheap; the
  // auth answer below is what decides whether anything is written.
  const nameCheck = cleanDisplayName(name)
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error })

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
  // The caller's OWN world — only consulted when the tenant is a shared room and
  // therefore cannot answer "which world was this row written from".
  const creatorWorld = identity?.world || verified.world || null

  // ONE authorizer for the whole request, built from the VERIFIED tenant (never
  // the body). Both branches and the caller-room card share it, so they cannot
  // drift apart into three different answers about the same slug.
  const authorizeProjectScope = makeProjectScopeAuthorizer({ req, clientId: tenant })

  try {
    const result = entity_type === 'project'
      ? await createProject(
          nameCheck.value, description, team, tenant, agent_slug, createdByName, creatorWorld,
          { authorizeProjectScope },
        )
      : await createMission(
          nameCheck.value, project, description, tenant, agent_slug, createdByName, creatorWorld,
          { authorizeProjectScope },
        )
    // A refusal carries its own HTTP status (403 scope, 409 held/duplicate, 400
    // shape). Returning 200 on a refusal is how a caller learns to ignore it.
    return res.status(result?.ok === false ? (result.status || 409) : 200).json(result)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    console.error('voice-create-entity error:', err)
    return res.status(500).json({ error: err.message })
  }
}
