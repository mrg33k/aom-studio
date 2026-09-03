// POST /api/dashboard/voice-create-entity
// Called by VoiceChat.jsx when Gemini fires a create_project or create_mission
// tool call. Creates the entity and posts a source='voice_creation' card
// message so the chat panel shows a real-time creation card.
//
// Request body:
//   {
//     entity_type: 'project' | 'mission',
//     name: string,            display name
//     description?: string,
//     // project only:
//     team?: string,           comma-separated agent slugs
//     // mission only:
//     project: string,         parent project slug
//     // always:
//     client_id: string,       world slug (e.g. "aom")
//     agent_slug?: string,     which agent is on the call (e.g. "project:corner", "rex")
//   }
//
// Returns { ok, entity_type, name, slug|mission_slug, parent_slug? }
//
// Backend: Convex (corner:retire-supabase R2, 2026-09-03).
//   projects:create      the project registry row
//   rooms:createRoom     the project or mission chat room
//   tasks:logEvent       the six scaffold_file stubs (mission)
//   messages:send        kickoff + creation card
//
// Auth: verifyTenant gates it and the verified tenant, never the body, is
// what the rows are written against. CORS is the dashboard origins.
// A project slug held by another world is refused (403 / 409): a grant lets
// you reach another world's project, not mint a second registry row for it.
// `name` lands in canon stubs every agent reads as truth, so it is checked
// by shape (no line breaks, control or hidden characters).

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

// Optional write key for the gated script-facing mutations (projects:create,
// tasks:logEvent). Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

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

// ---- Input validation ----
const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/
const MAX_SLUG = 64
const MAX_NAME = 120
const UNSAFE_TEXT = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2028\u2029\uFEFF]/

function cleanSlug(raw) {
  if (!raw || typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase()
  if (!v || v.length > MAX_SLUG) return null
  if (!SLUG_RE.test(v)) return null
  if (v.includes('..')) return null
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

// A parent may arrive as a colon-joined path for a nested mission. The
// project is the first segment.
function rootProjectOf(parentPath) {
  return String(parentPath || '').split(':')[0].trim().toLowerCase()
}

// The agent that speaks the cards. A room key ('project:corner') is not an
// agent, so the front desk speaks for it.
function speakerSlug(agentSlug) {
  const raw = String(agentSlug || '').trim().toLowerCase()
  if (!raw || raw.includes(':')) return 'ea'
  return raw
}

// May this tenant claim / scaffold under this project? Holder world or a
// grant passes, a world admin passes, and an unregistered slug is a first
// claim (there is nothing to inject into yet).
async function authorizeProjectScope({ tenant, isAdmin, slug }) {
  if (isAdmin) return { ok: true, via: 'world-admin' }
  const access = await convexQuery('projects:hasAccess', { slug, worldId: tenant }).catch(() => null)
  if (access?.ok) return { ok: true, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' }
  const registered = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null)
  if (!registered) return { ok: true, via: 'first-claim' }
  return { ok: false, via: 'denied', reason: `project "${slug}" belongs to world "${registered.ownerWorld}"` }
}

// ---- Convex helpers ----
async function postMessage({ roomId, tenant, agent, source, text, metadata }) {
  try {
    const id = await convexMutation('messages:send', {
      roomId, text, role: 'assistant', source, clientId: tenant, agentSlug: speakerSlug(agent), metadata,
    })
    // messages:send does not keep the metadata bag, and the creation card is
    // rendered from it (entity_type, entity_slug ...), so it is a second write.
    if (id && metadata) {
      await convexMutation('messages:patchMetadata', { messageId: String(id), patch: metadata })
        .catch((err) => console.warn(`voice-create-entity: patchMetadata failed (ignored): ${String(err?.message || err)}`))
    }
    return true
  } catch (err) {
    console.warn(`voice-create-entity: message post failed: ${String(err?.message || err)}`)
    return false
  }
}

async function worldDoc(tenant) {
  const world = await convexQuery('worlds:getBySlug', { slug: tenant })
  if (!world) throw new Error(`world "${tenant}" not found`)
  return world
}

// The project slug the calling agent is standing in ('project:<slug>'), used
// as the room for the voice_creation card. Scope-checked like every other
// slug here and dropped when refused: the card is cosmetic.
async function resolveCallerProject(agentSlug, authorize) {
  const raw = agentSlug?.startsWith('project:') ? agentSlug.slice(8) : null
  const slug = cleanSlug(raw)
  if (!slug) return null
  const verdict = await authorize(slug).catch(() => null)
  if (verdict?.ok) return slug
  console.warn(`[voice-create-entity] caller-room scope DENIED for project "${raw}"; posting the creation card unscoped`)
  return null
}

// A topic that already has a home in this world: a mission room or a project
// with this exact slug.
async function findTwin({ tenant, slug }) {
  const rooms = await convexQuery('rooms:listRooms', { worldId: tenant, filter: 'mission' }).catch(() => [])
  for (const r of Array.isArray(rooms) ? rooms : []) {
    const leaf = String(r.legacyRoomId || '').split(':').slice(3).join(':')
    if (leaf === slug || toSlug(r.title) === slug) {
      return { slug: r.legacyRoomId || slug, kind: 'mission', title: r.title, project: r.project || null }
    }
  }
  return null
}

// ---- Project creation ----
async function createProject(
  name, description, team, tenant, agentSlug, createdByName,
  { authorize },
) {
  const slug = cleanSlug(toSlug(name))
  if (!slug) return { ok: false, status: 400, reason: 'invalid-slug', error: 'name does not produce a usable project slug' }
  const displayName = name || titleFromSlug(slug)
  const agentSlugs = team ? team.split(',').map(s => s.trim()).filter(Boolean) : ['ea']

  // May this tenant claim this slug? Refuse rather than degrade: the slug is
  // the request.
  const scope = await authorize(slug)
  if (!scope || !scope.ok) {
    console.warn(`[voice-create-entity] DENIED: world "${tenant}" may not claim project "${slug}": ${scope?.reason || 'not reachable from this world'}`)
    return { ok: false, status: 403, reason: 'project-belongs-to-another-world', requested: slug, error: `project "${slug}" belongs to another world` }
  }

  // A grant lets you reach another world's project. It does not let you mint
  // a second registry row for its slug.
  const heldElsewhere = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null)
  if (heldElsewhere?.ownerWorld && heldElsewhere.ownerWorld !== tenant) {
    console.warn(`[voice-create-entity] DENIED: world "${tenant}" may not mint a second projects row for "${slug}" (held by "${heldElsewhere.ownerWorld}")`)
    return {
      ok: false, status: 409, reason: 'held-by-another-world', requested: slug, holder: heldElsewhere.ownerWorld,
      error: `project "${slug}" already exists in another world; open it there instead of creating a second one`,
    }
  }

  // A topic that already has a home (a mission with this slug) must not be
  // minted as a new project from a voice call.
  const existingProject = heldElsewhere?.ownerWorld === tenant ? heldElsewhere : null
  const twin = existingProject ? null : await findTwin({ tenant, slug })
  if (twin) {
    const callerProj = await resolveCallerProject(agentSlug, authorize)
    await postMessage({
      roomId: callerProj ? `${tenant}:project:${callerProj}` : `${tenant}:agent:${speakerSlug(agentSlug)}`,
      tenant, agent: agentSlug, source: 'project-dup-guard',
      text: `That topic already lives in **${twin.title || twin.slug}**. I didn't create a duplicate "${displayName}" project. Continue there.`,
      metadata: { dup_guard: true, existing: twin, requested: slug },
    })
    return { ok: false, status: 409, reason: 'duplicate', existing: twin, requested: slug, error: `that topic already lives in "${twin.title || twin.slug}"; continue there` }
  }

  // Registry row (idempotent on slug + world) and the project room.
  await convexMutation('projects:create', {
    key: CONVEX_KEY, slug, worldSlug: tenant, name: displayName, color: '#6B8AB0', isActive: true,
  })
  const room = await convexQuery('rooms:resolveCanonical', { worldSlug: tenant, kind: 'project', key: slug }).catch(() => null)
  if (!room) {
    const world = await worldDoc(tenant)
    await convexMutation('rooms:createRoom', { worldId: String(world._id), title: displayName, kind: 'project', project: slug })
  }

  // Kickoff message in the new project room.
  await postMessage({
    roomId: `${tenant}:project:${slug}`,
    tenant, agent: agentSlug, source: 'agent-kickoff',
    text: `This is **${displayName}**. Tell me about this project: what is it, and what do you want to get done here?${description ? ` (Created via voice: ${description})` : ''}`,
    metadata: { project_slug: slug, kickoff: true, team: agentSlugs },
  })

  // Creation card in the calling agent's room so the chat panel shows it.
  const callerProject = await resolveCallerProject(agentSlug, authorize)
  await postMessage({
    roomId: callerProject ? `${tenant}:project:${callerProject}` : `${tenant}:agent:${speakerSlug(agentSlug)}`,
    tenant, agent: agentSlug, source: 'voice_creation',
    text: `Created project **${displayName}**`,
    metadata: {
      entity_type: 'project',
      entity_name: displayName,
      entity_slug: slug,
      description: description || '',
      created_by_name: createdByName || null,
    },
  })

  return { ok: true, entity_type: 'project', name: displayName, slug }
}

// ---- Mission creation ----
async function createMission(
  name, projectSlug, description, tenant, agentSlug, createdByName,
  { authorize },
) {
  const missionSlug = cleanSlug(toSlug(name))
  if (!missionSlug) return { ok: false, status: 400, reason: 'invalid-slug', error: 'name does not produce a usable mission slug' }

  // May this tenant scaffold under this parent? Checked on the root project
  // of the parent path, never the colon-joined path.
  const rootProject = rootProjectOf(projectSlug)
  if (!rootProject || !cleanSlug(rootProject)) {
    return { ok: false, status: 400, reason: 'invalid-parent', error: 'project (parent slug) is not a usable project slug' }
  }
  const scope = await authorize(rootProject)
  if (!scope || !scope.ok) {
    console.warn(`[voice-create-entity] DENIED: world "${tenant}" may not scaffold under project "${rootProject}": ${scope?.reason || 'not reachable from this world'}`)
    return { ok: false, status: 403, reason: 'project-belongs-to-another-world', requested: rootProject, error: `project "${rootProject}" belongs to another world` }
  }

  const displayName = name || titleFromSlug(missionSlug)
  const d = today()
  // Name the actual caller when we know them; say we don't when we don't.
  const by = createdByName ? ` by ${createdByName}` : ' (caller not identified)'

  const stubs = {
    'VISION.md': `# ${displayName}: Mission Vision\n\n**Mission path:** \`${projectSlug}:${missionSlug}\`\n\n---\n\n## What this mission IS\n\n${description || '_TBD_'}\n\n## Change log\n\n- **${d}**: Created via voice call${by}.\n`,
    'RESEARCH.md': `# ${displayName}: Mission Research\n\n**Started:** ${d}\n\n## Index\n\n_No research yet._\n`,
    'BUILD.md': `# ${displayName}: Mission Build Plan\n\n**Started:** ${d}\n**Mission path:** \`${projectSlug}:${missionSlug}\`\n\n## Rounds\n\n### M1: Vision interview\n\n**Status:** queued.\n`,
    'CONTEXT.md': `# ${displayName}: Mission Context\n\n**Mission path:** \`${projectSlug}:${missionSlug}\`\n**Status:** NEW\n**Created:** ${d}\n\n## Current State\n\nMission created from voice call${by}. ${description ? 'Intent: ' + description : 'No description yet.'}\n`,
    'last-conversation.md': `# ${displayName}: Last Conversation\n\n**Empty tape.** Created ${d} via voice call${by}.\n\nMission path: \`${projectSlug}:${missionSlug}\`\n`,
    'research/README.md': `# ${displayName} Mission Research\n\nDrop research artifacts here as dated markdown files.\n\nCreated ${d}.\n`,
  }

  const agentKey = `${projectSlug}:${missionSlug}`

  // The mission room: the existing one for this project + slug, or a new one.
  let room = await convexQuery('rooms:resolveCanonical', { worldSlug: tenant, kind: 'mission', key: missionSlug, project: rootProject }).catch(() => null)
  if (!room) {
    const world = await worldDoc(tenant)
    const id = await convexMutation('rooms:createRoom', { worldId: String(world._id), title: displayName, kind: 'mission', project: rootProject })
    room = await convexQuery('rooms:getRoom', { roomId: String(id) }).catch(() => ({ _id: id }))
  }
  const missionRoomId = room?.legacyRoomId || String(room._id)

  // Scaffold the six mission stub files into the events ledger.
  for (const [filename, content] of Object.entries(stubs)) {
    await convexMutation('tasks:logEvent', {
      key: CONVEX_KEY,
      event: {
        event_type: 'scaffold_file',
        agent: agentKey,
        payload: { filename, content, updated_at: new Date().toISOString(), tenant_id: tenant },
      },
    })
  }

  // Kickoff message in the mission room.
  await postMessage({
    roomId: missionRoomId,
    tenant, agent: 'ea', source: 'agent-kickoff',
    text: `This is **${displayName}**. What are you working on here?${description ? ` (Created via voice: ${description})` : ''} Tell me and I'll set the mission up around your answer.`,
    metadata: { mission_slug: missionSlug, project_slug: rootProject, kickoff: true },
  })

  // Creation card in the calling agent's room.
  const callerProject = await resolveCallerProject(agentSlug, authorize)
  await postMessage({
    roomId: callerProject ? `${tenant}:project:${callerProject}` : `${tenant}:agent:${speakerSlug(agentSlug)}`,
    tenant, agent: agentSlug, source: 'voice_creation',
    text: `Created mission **${displayName}** under ${projectSlug}`,
    metadata: {
      entity_type: 'mission',
      entity_name: displayName,
      entity_slug: missionSlug,
      parent_slug: projectSlug,
      description: description || '',
      created_by_name: createdByName || null,
    },
  })

  return { ok: true, entity_type: 'mission', name: displayName, mission_slug: missionSlug, parent_slug: projectSlug, room: missionRoomId }
}

// ---- Handler ----
export default async function handler(req, res) {
  applyCors(req, res)
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

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
  const nameCheck = cleanDisplayName(name)
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error })

  // The world these rows land in is the verified tenant, not the body string.
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
  const createdByName = identity?.userName || verified.userName || null

  // One authorizer for the whole request, built from the verified tenant.
  const authorize = (slug) => authorizeProjectScope({ tenant, isAdmin: !!verified.isAdmin, slug })

  try {
    const result = entity_type === 'project'
      ? await createProject(nameCheck.value, description, team, tenant, agent_slug, createdByName, { authorize })
      : await createMission(nameCheck.value, project, description, tenant, agent_slug, createdByName, { authorize })
    // A refusal carries its own HTTP status (403 scope, 409 held/duplicate, 400 shape).
    return res.status(result?.ok === false ? (result.status || 409) : 200).json(result)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    console.error('voice-create-entity error:', err)
    return res.status(500).json({ error: err.message })
  }
}
