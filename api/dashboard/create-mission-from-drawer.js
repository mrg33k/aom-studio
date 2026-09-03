// POST /api/dashboard/create-mission-from-drawer
// Mission creation for the self-serve drawer "New mission" button.
//
// Request body:
//   { parent_slug, mission_slug, name, client_id }
//
//   parent_slug  - project slug (or colon-joined path for nested missions)
//   mission_slug - bare slug, e.g. "hero-section"
//   name         - display name typed by the user
//   client_id    - world slug (e.g. "aom")
//
// Does three things, all on Convex (corner:retire-supabase, 2026-09-03):
//   1. Scaffolds 6 mission stub files as scaffold_file events (tasks:logEvent),
//      skipping any file already scaffolded for this mission.
//   2. Creates the mission room by posting a kickoff greeting into it
//      (messages:send mints the room from its key), then names the room
//      (rooms:setTitle) so the rail shows the display name.
//   3. Returns { ok, parent_slug, mission_slug, name, kickoff_posted }
//
// AUTH. verifyTenant on the body's client_id: rows land in the VERIFIED tenant,
// never the body string. The parent project must be one this world can reach
// (projects:hasAccess: holder world or a grant) or one nobody has registered.
// `name` is capped and refused outright if it carries line breaks or control
// characters, because it lands in canon files every agent reads as truth.
//
// NESTED PARENTS: parent_slug may be a colon-joined path ('corner:front-door').
// The gate runs on the ROOT project (first segment), which is the actual project.

import { verifyTenant, TenantAuthError, callerIdentity, extractJwt } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

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

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const PARENT_PATH_RE = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)*$/
// Worlds are interpolated into row keys and the scaffold tenant stamp.
const TENANT_RE = /^[a-z0-9][a-z0-9:._-]*$/

// Max display-name length, and the characters a canon file must never carry:
// control chars, DEL + C1, zero-width and bidi-override marks. Those let text
// hide from a human reviewer while an agent still reads it.
const MAX_NAME = 120
const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\ufeff]/

function cleanDisplayName(raw) {
  if (raw == null || raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'name must be a string' }
  if (UNSAFE_TEXT.test(raw)) {
    return { ok: false, error: 'name may not contain line breaks or control characters' }
  }
  const value = raw.trim()
  if (value.length > MAX_NAME) {
    return { ok: false, error: `name must be ${MAX_NAME} characters or fewer` }
  }
  return { ok: true, value: value || null }
}

function rootProjectOf(parentPath) {
  return String(parentPath || '').split(':')[0]
}

function titleFromSlug(slug) {
  return String(slug || '').split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// `displayName` has passed cleanDisplayName(). These six files are read fresh as
// canon by every agent that enters the mission, so an unchecked string would
// land as instructions, not as data. `createdBy` is the verified caller or
// null; the change log says which, and never guesses a name.
function missionStubs(missionSlug, parentPath, displayName, createdBy) {
  const d = today()
  const by = createdBy ? ` by ${createdBy}` : ' (creator not identified)'
  const parentLabel = parentPath.split(':').map(titleFromSlug).join(' > ')
  return {
    'VISION.md':
`# ${displayName}: Mission Vision

**Mission path:** \`${parentPath}:${missionSlug}\`

---

## What this mission IS

_TBD: one-line description of ${displayName}_

## North star

_TBD._

## Change log

- **${d}**: Scaffolded via drawer${by}. Parent: ${parentLabel}.
`,
    'RESEARCH.md':
`# ${displayName}: Mission Research

**Started:** ${d}

## Index

_No research yet. Add dated entries here as findings accumulate._
`,
    'BUILD.md':
`# ${displayName}: Mission Build Plan

**Started:** ${d}
**Mission path:** \`${parentPath}:${missionSlug}\`

## Rounds

### M1: Vision interview

Interview to fill in this mission's VISION.md (north star, pillars).

**Status:** queued.
`,
    'CONTEXT.md':
`# ${displayName}: Mission Context

**Mission path:** \`${parentPath}:${missionSlug}\`
**Status:** NEW
**Scaffolded:** ${d}${by}

## Current State (${d})

Mission scaffolded${by}. No work started yet. First task: vision interview.
`,
    'last-conversation.md':
`# ${displayName}: Last Conversation

**Empty tape.** First interaction populates this.

Mission path: \`${parentPath}:${missionSlug}\`
Scaffolded ${d}${by}.
`,
    'research/README.md':
`# ${displayName} Mission Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` (one level up) is the index.

Scaffolded ${d}.
`,
  }
}

// Events are append-only on Convex, so "upsert" means: skip a file this
// mission already has a scaffold event for.
async function scaffoldStub(agentKey, filename, content, tenantId) {
  const existing = await convexQuery('events:find', {
    event_type: 'scaffold_file',
    agent: agentKey,
    payload_eq: { key: 'filename', value: filename },
    limit: 1,
  })
  if (Array.isArray(existing) && existing.length) return false
  await convexMutation('tasks:logEvent', {
    event: {
      event_type: 'scaffold_file',
      agent: agentKey,
      payload: { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId },
    },
  })
  return true
}

// The mission room key on Convex: <world>:mission:<parent path>:<mission>.
function missionRoomKey(world, parentSlug, missionSlug) {
  return `${world}:mission:${parentSlug}:${missionSlug}`
}

async function postKickoffMessage(world, parentSlug, missionSlug, displayName, creator) {
  const canonicalSlug = `${parentSlug}:${missionSlug}`
  const messageId = await convexMutation('messages:send', {
    roomId: missionRoomKey(world, parentSlug, missionSlug),
    text: `This is **${displayName}**. What are you working on here? Tell me and I'll set the mission up around your answer.`,
    role: 'assistant',
    agentSlug: 'ea',
    source: 'agent-kickoff',
    clientId: world,
    metadata: {
      mission_slug: canonicalSlug,
      kickoff: true,
      // Attribution goes in metadata, not as the author: this is an assistant
      // row, and stamping a human author on one is how "Patrik said X" gets forged.
      created_by_name: creator?.name || null,
      created_by_user_id: creator?.userId || null,
    },
  })
  return messageId
}

export default async function handler(req, res) {
  applyCors(req, res)
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // AUTH BEFORE PAYLOAD VALIDATION, on purpose: an anonymous caller gets 401
  // and learns nothing about which body field to fix next.
  if (!extractJwt(req)) {
    return res.status(401).json({ error: 'sign in required' })
  }

  const { parent_slug, mission_slug, name, client_id } = req.body || {}

  // The world these rows land in is the VERIFIED tenant, never the body string.
  let verified
  try {
    verified = await verifyTenant(client_id, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const tenant = verified.tenant
  if (!TENANT_RE.test(tenant)) {
    return res.status(400).json({ error: 'unsupported world id' })
  }

  if (!parent_slug || typeof parent_slug !== 'string' || !PARENT_PATH_RE.test(parent_slug) || parent_slug.length > 200) {
    return res.status(400).json({ error: 'parent_slug required: project slug or colon-joined path, lowercase' })
  }
  if (!mission_slug || typeof mission_slug !== 'string' || !SLUG_RE.test(mission_slug) || mission_slug.length > 50) {
    return res.status(400).json({ error: 'mission_slug required: lowercase letters, numbers, hyphens, max 50 chars' })
  }
  const nameCheck = cleanDisplayName(name)
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error })

  // The verified human behind the request. A null name renders as "creator not
  // identified" and is never backfilled with somebody else's name.
  const identity = await callerIdentity(req).catch(() => null)
  const creator = {
    name: identity?.userName || verified.userName || null,
    userId: identity?.userId || verified.userId || null,
    world: identity?.world || verified.world || null,
  }
  // A shared room is not a world on Convex; the rows land in the caller's own.
  const world = tenant.startsWith('shared:') ? (creator.world || tenant) : tenant

  // MAY THIS WORLD SCAFFOLD UNDER THIS PROJECT? Holder world or a grant, or a
  // project nobody has registered yet. Refuse rather than degrade: the parent
  // project IS the request, so there is nothing to fall back to.
  const rootProject = rootProjectOf(parent_slug)
  try {
    const access = await convexQuery('projects:hasAccess', { slug: rootProject, worldId: world })
    if (!access || !access.ok) {
      const held = await convexQuery('projects:lookupBySlug', { slug: rootProject })
      if (held) {
        console.warn(`[create-mission-from-drawer] DENIED: world "${world}" may not scaffold under project "${rootProject}" (held by "${held.ownerWorld}")`)
        return res.status(403).json({
          error: `project "${rootProject}" belongs to another world`,
          reason: `held by world "${held.ownerWorld}"`,
        })
      }
    }
  } catch (err) {
    return res.status(500).json({ error: `project check failed: ${err.message}` })
  }

  const displayName = nameCheck.value || titleFromSlug(mission_slug)
  const agentKey = `${parent_slug}:${mission_slug}`

  try {
    // 1. Scaffold the 6 mission stub files. Every write takes the verified
    //    world; the body's client_id is not read again past this point.
    const stubs = missionStubs(mission_slug, parent_slug, displayName, creator.name)
    let scaffolded = 0
    for (const [filename, content] of Object.entries(stubs)) {
      if (await scaffoldStub(agentKey, filename, content, world)) scaffolded++
    }

    // 2. Kickoff greeting: this mints the mission room on Convex.
    let kickoffOk = false
    try {
      await postKickoffMessage(world, parent_slug, mission_slug, displayName, creator)
      kickoffOk = true
    } catch (err) {
      console.warn(`create-mission-from-drawer: kickoff message failed: ${err.message}`)
    }

    // 3. Name the room so the rail shows what the person typed.
    try {
      await convexMutation('rooms:setTitle', { roomId: missionRoomKey(world, parent_slug, mission_slug), title: displayName })
    } catch (err) {
      console.warn(`create-mission-from-drawer: room title failed: ${err.message}`)
    }

    return res.status(200).json({
      ok: true,
      parent_slug,
      mission_slug,
      name: displayName,
      agent: agentKey,
      scaffolded,
      kickoff_posted: kickoffOk,
    })
  } catch (err) {
    console.error('create-mission-from-drawer error:', err)
    return res.status(500).json({ error: err.message })
  }
}
