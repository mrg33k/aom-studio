// POST /api/dashboard/create-project-from-chat
// R78-p3 — Project creation endpoint for novel-topic flow
//
// Request body:
//   {
//     slug: "phoenix-bakery",
//     name: "Phoenix Bakery",
//     client_id: "aom",
//     agent_slug: "ea"
//   }
//
// Returns {ok: true, project_id, slug, name} on success.
// On collision: idempotent — returns existing project row.
//
// ── 2026-07-27 r5, corner:tenant-isolation — THIS ENDPOINT WAS FULLY OPEN ────
// No verifyTenant, no extractJwt, no internal key, and Access-Control-Allow-
// Origin: *. It wrote a `projects` row with a CALLER-CHOSEN slug AND a
// CALLER-CHOSEN client_id, and that pair is the holder world the whole
// authorization model reads (verifyProjectAccess resolves ownership from
// projects.client_id). So ONE anonymous POST installed the holder world for any
// slug — including the four unregistered projects the participation floor
// protects (blacknight, bridge-smoke, pala, rex, all AOM-trafficked).
//
//   POST {slug:'rex', name:'Rex', client_id:'arsenal'} -> 200
//
// Replayed against live data that single row ADMITS Ben to rex via holder-world
// — he can then write AOM's rex/CONTEXT.md, which rule 5 makes every AOM agent
// read fresh as canon — and simultaneously 403s Ash and Courtney out of their
// own room, because the floor arm they were passing on only fires when there is
// no holder world. One request, both directions, and Patrik cannot see either:
// he returns on the super-admin bypass before any of these checks.
//
// The dup guard was never the boundary — it is client-scoped, matches only
// mission names, and `force:true` skips it entirely.
//
// Four things close it, none of them invented here:
//   1. verifyTenant() — a verified session that may act in the target world.
//      The world these rows land in is verified.tenant, NEVER req.body.
//   2. makeProjectScopeAuthorizer() — the r4 decision function, reused verbatim.
//      Requiring a session alone does NOT close the exploit: an authenticated
//      caller in world A could still mint projects{slug:'arsenal', client_id:'a'}
//      and shadow another world's project, because lookupProjectBySlug() takes
//      `limit=1` with NO client filter and there is no unique index on slug. The
//      authorizer answers "may this tenant claim this slug" with the same arms
//      the message write path uses: holder-world, project_access grant,
//      world-admin, participation evidence, and first-claim for a slug nobody
//      has ever spoken in. Live check: zero duplicate slugs exist today, so this
//      costs nothing and shuts the shadowing door.
//   3. Origin allowlist instead of '*' — same block as voice-create-entity.js
//      and voice-handoff.js.
//   4. slug/name/agent validation. `slug` was interpolated straight into the
//      scaffold PATHS and `name` into room message text with no length cap and
//      no character check.
// Creation is attributed to the verified caller (metadata.created_by_* and a
// named provenance line in the stubs) instead of landing anonymous.

import { randomUUID } from 'node:crypto'
import { findProjectSlugTwin } from '../_lib/projectDupGuard.js'
import {
  verifyTenant, TenantAuthError, callerIdentity, extractJwt, lookupProjectBySlug,
} from '../_lib/verifyTenant.js'
import { makeProjectScopeAuthorizer, deriveRowWorld } from '../_lib/write-message.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Same allowlist the sibling endpoints adopted (voice-create-entity.js,
// voice-handoff.js). Copied rather than abstracted because there is no shared
// CORS lib yet and inventing one here would touch files this round does not own.
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

// ---------------------------------------------------------------------------
// INPUT VALIDATION. `slug` lands in the scaffold PATH and in the project row
// the whole authorization model keys off; `name` lands in room message text and
// in canon stub headings. Both are injection surfaces even from an authorized
// caller, so they are checked by shape, not escaped.
// ---------------------------------------------------------------------------

// Deliberately permissive: it must accept every slug shape already live.
// Verified against all 74 live projects rows (2026-07-27) — the only one that
// fails a stricter ^[a-z][a-z0-9-]*$ is 'aheadofmarket.com', and the drawer's
// slugify() happily emits a leading digit ("2026-plan"). Tightening past this
// would 400 legitimate creates, which is the over-correction this round is
// explicitly told to avoid. Same shape as write-message.js's FIRST_CLAIM_SLUG.
const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/
const MAX_SLUG = 64
const MAX_NAME = 120
// Control characters, DEL + C1, zero-width and bidi-override marks. A canon file
// or a message body carrying these can hide text from a human reviewer while an
// agent still reads it.
const UNSAFE_TEXT = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2028\u2029\uFEFF]/
// Worlds and agent slugs are interpolated into paths / row keys too.
const TENANT_RE = /^[a-z0-9][a-z0-9:._-]*$/
const AGENT_RE = /^[a-z0-9][a-z0-9:._-]*$/

function cleanSlug(raw) {
  if (!raw || typeof raw !== 'string') return null
  // Lowercased on purpose: PostgREST `eq` is case sensitive, so without this
  // 'REX' looks unclaimed to every check in the model while colliding with the
  // live 'rex' on disk.
  const v = raw.trim().toLowerCase()
  if (!v || v.length > MAX_SLUG) return null
  if (!SLUG_RE.test(v)) return null
  if (v.includes('..')) return null // this string is interpolated into a path
  return v
}

// Returns { ok, value } — value is null when the field was absent (callers fall
// back to the slug), so "not given" and "given but unsafe" stay distinguishable.
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

// A junk agent slug is not worth a 400 — it is a routing hint, not the payload
// — but it must never reach a row key unchecked. Fall back to the EA.
function cleanAgentSlug(raw) {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return v && v.length <= 100 && AGENT_RE.test(v) ? v : 'ea'
}

// Spread into a messages payload to stamp world_id. Delegates to the writer's
// deriveRowWorld so this endpoint and writeMessageRow cannot disagree about what
// world a row was written from. Returns {} — leaving the column NULL — when the
// world is genuinely unknowable, and logs it: honest absence beats a guess, and
// a silent guess is how a column default became the participation floor's
// evidence in the first place.
function stampWorld(clientId, creator) {
  const { world, via } = deriveRowWorld({ clientId, worldId: creator?.world || null })
  if (!world) {
    console.warn(
      `[create-project-from-chat] world unresolved for tenant "${clientId}" (via ${via}) — writing the row unstamped rather than guessing`
    )
    return {}
  }
  return { world_id: world }
}

const dbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// Get or null
async function getProjectBySlug(slug, clientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}&select=id,slug,name`,
    { headers: dbHeaders }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return rows.length > 0 ? rows[0] : null
}

// Insert projects row (or return existing)
async function createProjectRow(slug, name, clientId) {
  const existing = await getProjectBySlug(slug, clientId)
  if (existing) return existing

  const payload = {
    slug,
    name: name || slug,
    client_id: clientId,
    is_active: true,
    color: '#6B8AB0',
    created_at: new Date().toISOString(),
    archived_at: null,
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create project: ${err}`)
  }

  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] : rows
}

// Scaffold mission files into events table.
// `clientId` is the VERIFIED tenant and `slug` has passed cleanSlug(), so
// neither can walk out of the intended path — both used to be raw body strings.
// `createdBy` is the verified caller's display name, or null: the provenance
// line says so out loud rather than implying a person nobody verified.
async function scaffoldProject(projectId, slug, clientId, createdBy) {
  const by = createdBy ? ` by ${createdBy}` : ' (creator not identified)'
  const stubs = [
    {
      path: `corner/users/${clientId}/projects/${slug}/VISION.md`,
      content: `# ${slug} — Vision\n\n*Scaffolded at ${new Date().toISOString()}${by}*\n\nTBD\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/CONTEXT.md`,
      content: `# ${slug} — Context\n\n*Scaffolded at ${new Date().toISOString()}${by}*\n\nTBD\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/BUILD.md`,
      content: `# ${slug} — Build Plan\n\n*Scaffolded at ${new Date().toISOString()}${by}*\n\nTBD\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/RESEARCH.md`,
      content: `# ${slug} — Research Index\n\n*Scaffolded at ${new Date().toISOString()}${by}*\n\nNo research yet.\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/last-conversation.md`,
      content: `# ${slug} — Conversation Log\n\n*Scaffolded at ${new Date().toISOString()}${by}*\n\nProject created from novel topic in 1:1 chat.\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/research/README.md`,
      content: `# ${slug} — Research Home\n\n*Scaffolded at ${new Date().toISOString()}${by}*\n\nResearch outputs go here.\n`,
    },
  ]

  for (const stub of stubs) {
    const eventPayload = {
      type: 'scaffold_stub',
      event_type: 'scaffold_stub',
      source: 'create-project-from-chat',
      client_id: clientId,
      project_id: projectId,
      data: {
        path: stub.path,
        content: stub.content,
        timestamp: new Date().toISOString(),
      },
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: dbHeaders,
      body: JSON.stringify(eventPayload),
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn(`Failed to scaffold ${stub.path}: ${err}`)
    }
  }
}

// R78-p9c fix: UPSERT an agent_status row so the new project appears via the
// primary fromAgents display path in useDataPipe. Without this, new projects
// only exist in the `projects` table and rely on the fragile `fromDefs` secondary
// path — which silently returns [] on any fetch error and has recency_weight NULL
// ordering ambiguity. Existing projects have BOTH a `projects` row AND an
// `agent_status` row; this brings user-created projects to parity.
async function upsertAgentStatusProject(slug, name, clientId, color) {
  // NOTE: agent_status does NOT have is_active — columns are:
  // slug, name, role, status, type, color, hidden, client_id, updated_at, ...
  const payload = {
    slug,
    name: name || slug,
    type: 'project',
    client_id: clientId,
    color: color || '#6B8AB0',
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    console.warn(`Failed to upsert agent_status for ${slug}: ${err}`)
    return false
  }
  return true
}

// Post a row to the canonical `messages` table.
// NOTE (2026-05-22, R78-p8): the prior version wrote to `supabase_messages`,
// which does NOT exist (404) — so the forward-link silently never landed.
// The room + 1:1 surfaces both read from `messages`, filtered by
// client_id + (project = slug for a room | project null for the 1:1).
async function postMessage(row) {
  // `messages.id` has no DB default — every insert must supply its own UUID.
  const body = { id: randomUUID(), ...row }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.warn(`Failed to post message (${row.source}): ${err}`)
    return false
  }
  return true
}

// Forward-link in the 1:1 chat (project: null = stays in the EA 1:1).
//
// world_id is STAMPED, never left to the column default. verifyTenant.js's
// participation floor reads messages.world_id as PROOF OF BELONGING, so a row
// it will later be asked to trust must carry a value this endpoint verified.
// The derivation is BORROWED from write-message.js (deriveRowWorld) rather than
// repeated here: this endpoint posts to /rest/v1/messages directly, and a rule
// copied by hand is a rule that drifts. It also handles the case a local copy
// would get wrong — a 'shared:<slug>' tenant is a ROOM, not a world, so
// stamping it raw would put a room name in the world column (three live rows
// already carry exactly that defect). There the author's own world answers, and
// when even that is unknown the column is left NULL: honest absence, never a
// guess, and never a fallback to somebody else's world.
async function postForwardLinkMessage(clientId, agentSlug, projectSlug, projectName, creator) {
  return postMessage({
    role: 'assistant',
    client_id: clientId,
    ...stampWorld(clientId, creator),
    agent: agentSlug,
    project: null, // stays in the 1:1 with the EA
    source: 'project-forward-link',
    text: `Project created: **${projectName}** (${projectSlug}). Click here to continue in the project room.`,
    metadata: {
      project_slug: projectSlug,
      project_name: projectName,
      // Attribution lives in metadata, NOT in user_id/user_name: these are
      // role='assistant' rows and stamping a human author on them is how
      // "Patrik said X" gets forged (write-message.js, authorship rule).
      created_by_name: creator.name,
      created_by_user_id: creator.userId,
    },
    timestamp: new Date().toISOString(),
  })
}

// Opening greeting INSIDE the new project's room so it's alive on arrival.
// R78-p8 — a freshly-made room is never cold/silent; the EA greets and asks
// the user to describe the project so the room can self-build (R78-p10).
async function postRoomKickoffMessage(clientId, agentSlug, projectSlug, projectName, creator) {
  return postMessage({
    role: 'assistant',
    client_id: clientId,
    ...stampWorld(clientId, creator),
    agent: agentSlug,
    project: projectSlug, // lands in the new project's room
    source: 'agent-kickoff',
    text: `This is **${projectName}**. Tell me about this project — what is it, and what do you want to get done here? Once you do, I'll set the room up around your answer.`,
    metadata: {
      project_slug: projectSlug,
      kickoff: true,
      created_by_name: creator.name,
      created_by_user_id: creator.userId,
    },
    timestamp: new Date().toISOString(),
  })
}

export default async function handler(req, res) {
  applyCors(req, res)
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // AUTH BEFORE PAYLOAD VALIDATION, on purpose: an anonymous caller gets 401
  // and learns nothing about which body field to fix next.
  if (!extractJwt(req)) {
    return res.status(401).json({ error: 'sign in required' })
  }

  const { slug: rawSlug, name: rawName, client_id, agent_slug, force, dry_run } = req.body || {}

  // The world these rows land in is the VERIFIED tenant, never the body string.
  // This is the whole exploit: client_id chose the holder world.
  let verified
  try {
    verified = await verifyTenant(client_id, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const tenant = verified.tenant
  if (!TENANT_RE.test(tenant)) {
    // Cannot happen for any live world; the guard exists because `tenant` is
    // interpolated into the scaffold path below and a super-admin may pass an
    // arbitrary string through verifyTenant's bypass.
    return res.status(400).json({ error: 'unsupported world id' })
  }

  const slug = cleanSlug(rawSlug)
  if (!slug) {
    return res.status(400).json({
      error: 'slug required — lowercase letters, numbers, dot, dash or underscore, max 64 chars',
    })
  }
  const nameCheck = cleanDisplayName(rawName)
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error })
  const name = nameCheck.value
  const agentSlug = cleanAgentSlug(agent_slug)

  // MAY THIS TENANT CLAIM THIS SLUG? The r4 authorizer, reused verbatim — the
  // same decision the message write path makes about a project tag. It admits
  // the holder world, a project_access grant, the holder's world admins, a world
  // with participation evidence, and first-claim on a slug nobody has ever
  // spoken in; everything else is refused.
  //
  // Without this, a *signed-in* caller still reopens the exploit: there is no
  // unique index on projects.slug and lookupProjectBySlug() reads `limit=1` with
  // no client filter, so minting a second row for an existing slug in your own
  // world can flip the holder the rest of the model resolves.
  //
  // We REFUSE rather than degrade. write-message.js drops a denied project tag
  // and still lands the message because losing a chat message is unacceptable;
  // here the project slug IS the request, so there is nothing to degrade to.
  //
  // RESIDUAL, stated plainly (inherited from r4, not added here): first-claim is
  // trust-on-first-use. A foreign world can still claim a slug that has a folder
  // on disk but has never been spoken in. Closing it needs the registration path
  // to always write the projects row, not a tighter guess at this call site.
  const authorizeProjectScope = makeProjectScopeAuthorizer({ req, clientId: tenant })
  let scope
  try {
    scope = await authorizeProjectScope(slug)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  if (!scope || !scope.ok) {
    console.warn(
      `[create-project-from-chat] DENIED: world "${tenant}" may not claim project "${slug}" — ${scope?.reason || 'not reachable from this world'}`
    )
    return res.status(403).json({
      error: `project "${slug}" belongs to another world`,
      reason: scope?.reason || 'not reachable from this world',
    })
  }

  // A GRANT LETS YOU REACH ANOTHER WORLD'S PROJECT. IT DOES NOT LET YOU MINT A
  // SECOND `projects` ROW FOR ITS SLUG.
  //
  // Found by replaying this endpoint against live data, not by reading it: the
  // scope authorizer correctly admits Ash on 'space-rising' (arsenal-held, AOM
  // holds a project_access grant) — and the create then ran, capturing
  // projects{slug:'space-rising', client_id:'aom'}. getProjectBySlug() scopes its
  // idempotency check to the caller's own world, so the existing arsenal row is
  // invisible to it and a SECOND row is inserted. From that moment
  // lookupProjectBySlug() — `limit=1`, no client filter, no ordering, and there
  // is no unique index on projects.slug — may resolve the holder world of Space
  // Rising to either world, which is the same holder-world flip the anonymous
  // exploit performed, just with a session attached.
  //
  // Reaching a project needs no row of your own: the grant already admits you.
  // So refusing costs a collaborator nothing and shuts the door. Live check
  // (2026-07-27): zero cross-world duplicate slugs exist today, so no live
  // project is affected by this becoming a 409.
  const heldElsewhere = await lookupProjectBySlug(slug)
  if (heldElsewhere?.ownerWorld && heldElsewhere.ownerWorld !== tenant) {
    console.warn(
      `[create-project-from-chat] DENIED: world "${tenant}" may not mint a second projects row for "${slug}" (held by "${heldElsewhere.ownerWorld}")`
    )
    return res.status(409).json({
      ok: false,
      reason: 'held-by-another-world',
      requested: slug,
      holder: heldElsewhere.ownerWorld,
      error: `project "${slug}" already exists in another world — open it there instead of creating a second one`,
    })
  }

  // The verified human behind the request. null userName is rendered as
  // "creator not identified" — never backfilled with somebody else's name.
  const identity = await callerIdentity(req).catch(() => null)
  const creator = {
    name: identity?.userName || verified.userName || null,
    userId: identity?.userId || verified.userId || null,
    // The caller's OWN world — only consulted when the tenant is a shared room
    // and therefore cannot answer "which world was this written from".
    world: identity?.world || verified.world || null,
  }

  try {
    // corner:one-write-path R11 — a topic that already has a home (mission or
    // near-name active project) must NOT be minted as a new project. This is
    // how missions were "randomly turning themselves into projects": this
    // endpoint only ever checked the projects table. force:true overrides
    // (deliberate same-name project); dry_run:true probes without writing.
    if (!force) {
      const twin = await findProjectSlugTwin({
        supabaseUrl: SUPABASE_URL,
        headers: dbHeaders,
        slug,
        clientId: tenant,
      })
      if (twin) {
        if (!dry_run) {
          await postMessage({
            role: 'assistant',
            client_id: tenant,
            ...stampWorld(tenant, creator),
            agent: agentSlug,
            project: null, // pointer lands in the 1:1
            source: 'project-dup-guard',
            text: `That topic already lives in **${twin.slug}** — I didn't create a duplicate "${name || slug}" project. Continue there.`,
            metadata: { dup_guard: true, existing: twin, requested: slug },
            timestamp: new Date().toISOString(),
          })
        }
        return res.status(409).json({ ok: false, reason: 'duplicate', existing: twin, requested: slug })
      }
      if (dry_run) {
        return res.status(200).json({ ok: true, dry_run: true, would_create: slug })
      }
    } else if (dry_run) {
      return res.status(200).json({ ok: true, dry_run: true, would_create: slug, forced: true })
    }

    // Create or fetch existing project row. Every write below takes `tenant`
    // (verified) — the body's client_id is not read again past this point.
    const project = await createProjectRow(slug, name, tenant)

    // R78-p9c: UPSERT into agent_status so the new project appears in the drawer
    // via the primary fromAgents path (same as all existing projects). Without this,
    // the project only has a `projects` table row and relies on the fragile fromDefs
    // secondary path which silently fails on any fetch error.
    await upsertAgentStatusProject(slug, name || slug, tenant, '#6B8AB0')

    // Scaffold mission files (idempotent — checks for existing stubs)
    await scaffoldProject(project.id, slug, tenant, creator.name)

    // Greet INSIDE the new room first so it's alive the moment the user walks in.
    const kickoffOk = await postRoomKickoffMessage(
      tenant,
      agentSlug,
      slug,
      name || slug,
      creator
    )

    // Then drop the forward-link in the 1:1 so the user can navigate over.
    const forwardOk = await postForwardLinkMessage(
      tenant,
      agentSlug,
      slug,
      name || slug,
      creator
    )

    return res.status(200).json({
      ok: true,
      project_id: project.id,
      slug: project.slug,
      name: project.name,
      kickoff_posted: kickoffOk,
      forward_link_posted: forwardOk,
    })
  } catch (err) {
    console.error('create-project-from-chat error:', err)
    return res.status(500).json({ error: err.message })
  }
}
