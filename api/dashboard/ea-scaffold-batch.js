// POST /api/dashboard/ea-scaffold-batch
//   { tenant, workspace_name?, items: [{ name, description?, mission?: { name?, description? } }, ...] }
//
// LR-3: multi-project + mission-per-project scaffold in a single call.
//
// One conversation can produce N projects. The EA shouldn't ask three separate
// confirmations for three asks; this endpoint is the primitive that lets the EA
// (or any caller) batch the scaffold and narrate it as one motion.
//
// Behaviour per item:
//   1. Slugify the name, validate against scaffold-project's slug regex.
//   2. projects:upsert for the registry row (idempotent) and a project room
//      (rooms:createRoom) when the world has none for the slug yet.
//   3. Write the six canonical project stubs as scaffold_file events
//      (tasks:logEvent; the ledger is append-only, readers take the newest).
//   4. ALWAYS scaffold at least one mission. Default: slug=first-brief, the
//      "vision interview" mission, with its own mission room.
//
// Partial failures are returned per-item; a successful row is never rolled back
// when a later row fails. Tenant gating runs once at the top.
//
// corner:tenant-isolation r7 kept: an item is refused when the tenant may not
// claim the slug (another world holds the project) and a second registry row
// for a slug held elsewhere is never minted.
//
// corner:retire-supabase (2026-09-03): Convex only. No Supabase in this file.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`)
  const data = await r.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token)
const convexMutation = (path, args, token) => convexCall('mutation', path, args, token)

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null
  return null
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req)
  if (!token) throw new AuthError('sign-in required', 401)
  let who = null
  try { who = await convexQuery('users:verifyToken', {}, token) } catch { who = null }
  if (!who || !who.userId) throw new AuthError('invalid session', 401)
  const world = who.world ? String(who.world).toLowerCase() : null
  let superAdmin = false
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)) } catch { superAdmin = false }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token }
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase()
  if (!t) throw new AuthError('tenant required', 400)
  const who = await requireCaller(req)
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true }
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length)
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false }
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null)
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' }
    if (who.world === t) return { ok: true, tenant: t, ...who }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403)
}

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

const SLUG_RE = /^[a-z][a-z0-9-]*$/
const MAX_SLUG_LEN = 50
const MAX_ITEMS_PER_BATCH = 10

const DEFAULT_MISSION_SLUG = 'first-brief'
const DEFAULT_MISSION_NAME = 'First brief'
const DEFAULT_MISSION_DESCRIPTION =
  'Vision interview. Fill in the project north star, pillars, and what done looks like.'

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
// SLUG_RE happens after; names that collapse to empty / start with a digit
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
    'VISION.md': `# ${title}: Vision

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

- **${d}**: Scaffolded via ea-scaffold-batch (LR-3). Needs EA interview to fill in north star + pillars.
`,
    'RESEARCH.md': `# ${title}: Research

> Findings accumulate as the project progresses. Research happens **before** build.

**Started:** ${d}

## Index

_No research yet. First research task will append here._
`,
    'BUILD.md': `# ${title}: Build Plan

**Started:** ${d}

**Paired with \`VISION.md\`.** BUILD says how/when, round by round.

## Rounds

### R1: Vision interview

EA interviews the user to fill in VISION.md (north star, pillars, what-it-is).

**Status:** queued (mission scaffold spawned alongside this project).
`,
    'CONTEXT.md': `# ${title}: Project Context

**Source of truth pair:** \`VISION.md\` (what/why) + \`BUILD.md\` (how/when). This file is a living summary.

**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Project box created via ea-scaffold-batch. First mission scaffolded automatically. No work started.
`,
    'last-conversation.md': `# ${title}: Last Conversation

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
    'VISION.md': `# ${title}: Mission Vision

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

- **${d}**: Scaffolded via ea-scaffold-batch (LR-3). Inherits parent: ${parentLabel}.
`,
    'RESEARCH.md': `# ${title}: Mission Research

> Findings specific to this mission.

**Started:** ${d}

## Index

_No research yet._
`,
    'BUILD.md': `# ${title}: Mission Build Plan

**Started:** ${d}
**Mission path:** \`${parentSlug}:${missionSlug}\`

## Rounds

### M1: Vision interview

Interview to fill in this mission's VISION.md.

**Status:** queued.
`,
    'CONTEXT.md': `# ${title}: Mission Context

**Mission path:** \`${parentSlug}:${missionSlug}\`
**What it is:** ${desc}
**Status:** NEW
**Scaffolded:** ${d}

## Current State (${d})

Mission scaffolded alongside parent project. First task: vision interview.
`,
    'last-conversation.md': `# ${title}: Last Conversation

**Empty tape.** Mission path: \`${parentSlug}:${missionSlug}\`. Scaffolded ${d}.
`,
    'research/README.md': `# ${title} Mission Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` (one level up) is the index.

Scaffolded ${d}.
`,
  }
}

// The events ledger is append-only. "Upsert" means: append the newest version
// and report whether an older copy existed. Readers (file-content, files,
// file-search) take the newest row per agent + filename.
async function upsertScaffoldStub({ agentKey, filename, content, tenantId, token }) {
  let existing = []
  try {
    existing = await convexQuery('events:find', {
      event_type: SCAFFOLD_EVENT_TYPE,
      agent: agentKey,
      payload_eq: { key: 'filename', value: filename },
      limit: 1,
    }, token)
  } catch (err) {
    throw new Error(`lookup ${agentKey}/${filename} failed: ${String(err?.message || err).slice(0, 200)}`)
  }
  const now = new Date().toISOString()
  const payload = { filename, content, updated_at: now, tenant_id: tenantId }
  try {
    await convexMutation('tasks:logEvent', {
      key: CONVEX_KEY,
      event: { timestamp: now, agent: agentKey, event_type: SCAFFOLD_EVENT_TYPE, payload },
    }, token)
  } catch (err) {
    throw new Error(`write ${agentKey}/${filename} failed: ${String(err?.message || err).slice(0, 200)}`)
  }
  return { filename, action: Array.isArray(existing) && existing.length ? 'updated' : 'inserted' }
}

async function ensureProjectRow({ slug, name, tenant, token }) {
  // Idempotent registry row. projects:upsert patches an existing row for the
  // same world and slug, so calling it twice is safe.
  try {
    const before = await convexQuery('projects:lookupBySlug', { slug, worldId: tenant }, token).catch(() => null)
    await convexMutation('projects:upsert', {
      key: CONVEX_KEY,
      slug,
      worldSlug: tenant,
      name,
      color: '#E85D26',
      isActive: true,
    }, token)
    return { ok: true, action: before ? 'exists' : 'inserted' }
  } catch (err) {
    return { ok: false, error: String(err?.message || err).slice(0, 200) }
  }
}

// A room in the tree for the project and for its first mission, unless the
// world already has one. Best effort: the stubs are the canon, the room is
// where people talk about it.
async function ensureRoom({ tenant, kind, key, project, title, token }) {
  try {
    const existing = await convexQuery('rooms:resolveCanonical', { worldSlug: tenant, kind, key, project }, token)
    if (existing) return { ok: true, action: 'exists', roomId: existing._id }
    const world = await convexQuery('worlds:getBySlug', { slug: tenant }, token)
    if (!world) return { ok: false, error: 'world not found' }
    const roomId = await convexMutation('rooms:createRoom', {
      worldId: world._id,
      title,
      kind,
      project: kind === 'project' ? key : project,
    }, token)
    return { ok: true, action: 'created', roomId }
  } catch (err) {
    return { ok: false, error: String(err?.message || err).slice(0, 200) }
  }
}

// Exported so api/dashboard/chat.js can wire `scaffold_projects_batch` as a
// tool for dispatcher agents without re-implementing the orchestration. The
// tenantId is taken on trust here; verifyTenant is the boundary gate at the
// HTTP endpoint; in-process callers pass the verified value through.
//
// `authorizeProjectScope` is NOT optional. A projects row IS the holder world,
// so an unauthorized slug claim has no safe degraded form; omitting the
// authorizer DENIES, loudly, instead of silently writing.
export async function scaffoldOneItem({ item, tenantId, authorizeProjectScope, token }) {
  const rawName = (item?.name || '').toString().trim()
  if (!rawName) return { ok: false, error: 'name required' }

  const slug = slugify(rawName)
  if (!SLUG_RE.test(slug) || slug.length > MAX_SLUG_LEN) {
    return {
      ok: false,
      name: rawName,
      error: `slug "${slug}" must match ^[a-z][a-z0-9-]*$ and be at most ${MAX_SLUG_LEN} chars`,
    }
  }

  const description = (item?.description || '').toString().trim() || null
  const projectName = rawName.slice(0, 80)

  // MAY THIS TENANT CLAIM THIS SLUG? Before ANY write for this item.
  if (typeof authorizeProjectScope !== 'function') {
    console.warn(
      `[ea-scaffold-batch] DENIED: no authorizeProjectScope supplied for tenant "${tenantId}" slug "${slug}"; refusing rather than claiming the slug ungated`
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
      `[ea-scaffold-batch] DENIED: world "${tenantId}" may not claim project "${slug}": ${scope?.reason || 'not reachable from this world'}`
    )
    return {
      ok: false,
      slug,
      name: projectName,
      reason: 'project-belongs-to-another-world',
      error: `project "${slug}" belongs to another world`,
    }
  }

  // A grant lets you reach another world's project. It does not let you mint
  // a second registry row for its slug.
  const heldElsewhere = await convexQuery('projects:lookupBySlug', { slug }, token).catch(() => null)
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
      error: `project "${slug}" already exists in another world; open it there instead of creating a second one`,
    }
  }

  // Registry row and project room (both idempotent).
  const projectRow = await ensureProjectRow({ slug, name: projectName, tenant: tenantId, token })
  const projectRoom = await ensureRoom({ tenant: tenantId, kind: 'project', key: slug, title: projectName, token })

  // Project stubs into the events ledger.
  let projectFiles = 0
  const projectErrors = []
  try {
    const stubs = projectStubs(slug, projectName, description)
    for (const [filename, content] of Object.entries(stubs)) {
      try {
        await upsertScaffoldStub({ agentKey: slug, filename, content, tenantId, token })
        projectFiles += 1
      } catch (err) {
        projectErrors.push(`${filename}: ${err.message}`)
      }
    }
  } catch (err) {
    return { ok: false, slug, name: projectName, error: `project stubs failed: ${err.message}` }
  }

  // Mission stubs. Every project gets at least one mission. Caller can name it;
  // default to first-brief (the vision-interview mission).
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
        await upsertScaffoldStub({ agentKey, filename, content, tenantId, token })
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
  const missionRoom = await ensureRoom({ tenant: tenantId, kind: 'mission', key: missionSlug, project: slug, title: missionName, token })

  return {
    ok: projectErrors.length === 0 && missionErrors.length === 0,
    slug,
    name: projectName,
    project_row: projectRow.action || (projectRow.ok ? 'ok' : 'failed'),
    project_room: projectRoom.action || (projectRoom.ok ? 'ok' : 'failed'),
    project_files: projectFiles,
    project_errors: projectErrors.length ? projectErrors : undefined,
    mission_slug: missionSlug,
    mission_name: missionName,
    mission_room: missionRoom.action || (missionRoom.ok ? 'ok' : 'failed'),
    mission_files: missionFiles,
    mission_errors: missionErrors.length ? missionErrors : undefined,
  }
}

// May this world claim `slug`? Free when nobody holds it; otherwise only the
// holder world or a world with a grant.
function makeProjectScopeAuthorizer({ tenantId, superAdmin, token }) {
  return async (slug) => {
    if (superAdmin) return { ok: true, reason: 'super-admin' }
    const project = await convexQuery('projects:lookupBySlug', { slug }, token).catch(() => null)
    if (!project) return { ok: true, reason: 'unclaimed' }
    const access = await convexQuery('projects:hasAccess', { slug, worldId: tenantId }, token).catch(() => null)
    if (access && access.ok) return { ok: true, reason: access.role }
    return { ok: false, reason: `held by "${project.ownerWorld}"` }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenant: rawTenant, items } = req.body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' })
  }
  if (items.length > MAX_ITEMS_PER_BATCH) {
    return res
      .status(400)
      .json({ error: `items exceeds max ${MAX_ITEMS_PER_BATCH} per batch` })
  }

  const requestedTenant = (rawTenant || '').toString().trim().toLowerCase()
  let verified
  try {
    verified = await verifyTenant(requestedTenant, req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const tenantId = verified.tenant

  // ONE authorizer for the whole batch, built from the VERIFIED tenant.
  const authorizeProjectScope = makeProjectScopeAuthorizer({ tenantId, superAdmin: verified.superAdmin, token: verified.token })

  const results = []
  for (const item of items) {
    try {
      results.push(await scaffoldOneItem({ item, tenantId, authorizeProjectScope, token: verified.token }))
    } catch (err) {
      results.push({ ok: false, name: item?.name || null, error: err?.message || String(err) })
    }
  }

  const allOk = results.every(r => r.ok)
  return res.status(200).json({ ok: allOk, tenant: tenantId, count: results.length, results })
}
