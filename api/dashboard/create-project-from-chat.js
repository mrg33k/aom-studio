// POST /api/dashboard/create-project-from-chat
// Project creation endpoint for the novel-topic flow.
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
// On collision: idempotent, returns the existing project row.
//
// corner:retire-supabase (2026-09-03): everything lands on Convex.
//   project row    -> projects:create (upsert by slug within the world)
//   room + kickoff -> messages:send into <world>:project:<slug> (mints the room)
//                     then rooms:setTitle with the display name
//   forward link   -> messages:send into the EA's 1:1 room
//   scaffold stubs -> scaffold_stub events (tasks:logEvent)
//   dup guard      -> a mission room in this world already titled like this slug
//
// AUTH. The world these rows land in is verified.tenant, never req.body. A
// caller may claim a slug that its world holds, has a grant on, or that no
// world has registered. A slug held by ANOTHER world is refused with 409: a
// grant lets you reach a project, it does not let you mint a second one.
// slug/name/agent are validated by shape because they land in row keys, room
// text and canon stub headings.

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

// Deliberately permissive: it must accept every slug shape already live
// (aheadofmarket.com, a leading digit from the drawer's slugify).
const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/
const MAX_SLUG = 64
const MAX_NAME = 120
const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\ufeff]/
const TENANT_RE = /^[a-z0-9][a-z0-9:._-]*$/
const AGENT_RE = /^[a-z0-9][a-z0-9:._-]*$/

function cleanSlug(raw) {
  if (!raw || typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase()
  if (!v || v.length > MAX_SLUG) return null
  if (!SLUG_RE.test(v)) return null
  if (v.includes('..')) return null // this string is interpolated into a path
  return v
}

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

// A junk agent slug is a routing hint, not the payload. Fall back to the EA.
function cleanAgentSlug(raw) {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return v && v.length <= 100 && AGENT_RE.test(v) ? v : 'ea'
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Scaffold stubs as append-only events. `clientId` is the VERIFIED world and
// `slug` has passed cleanSlug(), so neither can walk out of the intended path.
async function scaffoldProject(projectId, slug, clientId, createdBy) {
  const by = createdBy ? ` by ${createdBy}` : ' (creator not identified)'
  const at = new Date().toISOString()
  const base = `corner/users/${clientId}/projects/${slug}`
  const stubs = [
    { path: `${base}/VISION.md`, content: `# ${slug}: Vision\n\n*Scaffolded at ${at}${by}*\n\nTBD\n` },
    { path: `${base}/CONTEXT.md`, content: `# ${slug}: Context\n\n*Scaffolded at ${at}${by}*\n\nTBD\n` },
    { path: `${base}/BUILD.md`, content: `# ${slug}: Build Plan\n\n*Scaffolded at ${at}${by}*\n\nTBD\n` },
    { path: `${base}/RESEARCH.md`, content: `# ${slug}: Research Index\n\n*Scaffolded at ${at}${by}*\n\nNo research yet.\n` },
    { path: `${base}/last-conversation.md`, content: `# ${slug}: Conversation Log\n\n*Scaffolded at ${at}${by}*\n\nProject created from novel topic in 1:1 chat.\n` },
    { path: `${base}/research/README.md`, content: `# ${slug}: Research Home\n\n*Scaffolded at ${at}${by}*\n\nResearch outputs go here.\n` },
  ]
  for (const stub of stubs) {
    try {
      await convexMutation('tasks:logEvent', {
        event: {
          event_type: 'scaffold_stub',
          agent: `${clientId}:${slug}`,
          payload: { source: 'create-project-from-chat', client_id: clientId, project_id: projectId, path: stub.path, content: stub.content, timestamp: at },
        },
      })
    } catch (err) {
      console.warn(`Failed to scaffold ${stub.path}: ${err.message}`)
    }
  }
}

// A topic that already has a home must not be minted as a new project. Looks
// for a mission room in this world whose title or key slug matches, and for
// an active project with the same display name. force:true skips this.
async function findTwin(world, slug, name) {
  const wanted = new Set([slug, slugify(name || '')].filter(Boolean))
  const rooms = await convexQuery('rooms:listRooms', { worldId: world, filter: 'mission' }).catch(() => [])
  for (const room of Array.isArray(rooms) ? rooms : []) {
    const parts = String(room.legacyRoomId || '').split(':')
    const leaf = parts.length >= 4 ? parts.slice(3).join(':') : (parts[2] || '')
    if (wanted.has(slugify(room.title)) || wanted.has(leaf)) {
      return { kind: 'mission', slug: room.project ? `${room.project}:${leaf || slugify(room.title)}` : (leaf || slugify(room.title)), title: room.title }
    }
  }
  if (name) {
    const projects = await convexQuery('projects:list', { worldSlug: world, activeOnly: true }).catch(() => [])
    const hit = (Array.isArray(projects) ? projects : []).find((p) => p.slug !== slug && slugify(p.name) === slugify(name))
    if (hit) return { kind: 'project', slug: hit.slug, title: hit.name }
  }
  return null
}

async function postAssistant(world, roomId, agentSlug, text, source, metadata) {
  try {
    await convexMutation('messages:send', { roomId, text, role: 'assistant', agentSlug, source, clientId: world, metadata })
    return true
  } catch (err) {
    console.warn(`Failed to post message (${source}): ${err.message}`)
    return false
  }
}

export default async function handler(req, res) {
  applyCors(req, res)
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // AUTH BEFORE PAYLOAD VALIDATION, on purpose.
  if (!extractJwt(req)) {
    return res.status(401).json({ error: 'sign in required' })
  }

  const { slug: rawSlug, name: rawName, client_id, agent_slug, force, dry_run } = req.body || {}

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

  const slug = cleanSlug(rawSlug)
  if (!slug) {
    return res.status(400).json({
      error: 'slug required: lowercase letters, numbers, dot, dash or underscore, max 64 chars',
    })
  }
  const nameCheck = cleanDisplayName(rawName)
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error })
  const name = nameCheck.value
  const agentSlug = cleanAgentSlug(agent_slug)

  const identity = await callerIdentity(req).catch(() => null)
  const creator = {
    name: identity?.userName || verified.userName || null,
    userId: identity?.userId || verified.userId || null,
    world: identity?.world || verified.world || null,
  }
  // A shared room is not a world on Convex; the project lands in the caller's own.
  const world = tenant.startsWith('shared:') ? (creator.world || tenant) : tenant

  // MAY THIS WORLD CLAIM THIS SLUG? Holder world, a grant, or a slug nobody
  // registered. A slug held elsewhere is refused with 409 rather than minting
  // a second row that could flip the holder the rest of the model resolves.
  let heldElsewhere = null
  try {
    const access = await convexQuery('projects:hasAccess', { slug, worldId: world })
    const held = await convexQuery('projects:lookupBySlug', { slug })
    if (held && held.ownerWorld !== world) {
      heldElsewhere = held
      if (!(access && access.ok)) {
        console.warn(`[create-project-from-chat] DENIED: world "${world}" may not claim project "${slug}" (held by "${held.ownerWorld}")`)
        return res.status(403).json({ error: `project "${slug}" belongs to another world`, reason: `held by world "${held.ownerWorld}"` })
      }
    }
  } catch (err) {
    return res.status(500).json({ error: `project check failed: ${err.message}` })
  }
  if (heldElsewhere) {
    console.warn(`[create-project-from-chat] DENIED: world "${world}" may not mint a second projects row for "${slug}" (held by "${heldElsewhere.ownerWorld}")`)
    return res.status(409).json({
      ok: false,
      reason: 'held-by-another-world',
      requested: slug,
      holder: heldElsewhere.ownerWorld,
      error: `project "${slug}" already exists in another world; open it there instead of creating a second one`,
    })
  }

  try {
    const eaRoom = `${world}:agent:${agentSlug}`
    if (!force) {
      const twin = await findTwin(world, slug, name)
      if (twin) {
        if (!dry_run) {
          await postAssistant(world, eaRoom, agentSlug,
            `That topic already lives in **${twin.slug}**. I didn't create a duplicate "${name || slug}" project. Continue there.`,
            'project-dup-guard',
            { dup_guard: true, existing: twin, requested: slug })
        }
        return res.status(409).json({ ok: false, reason: 'duplicate', existing: twin, requested: slug })
      }
      if (dry_run) {
        return res.status(200).json({ ok: true, dry_run: true, would_create: slug })
      }
    } else if (dry_run) {
      return res.status(200).json({ ok: true, dry_run: true, would_create: slug, forced: true })
    }

    // Create or fetch the project row. Upsert by slug within the world.
    const projectId = await convexMutation('projects:create', {
      slug,
      worldSlug: world,
      name: name || slug,
      color: '#6B8AB0',
      isActive: true,
    })
    const project = (await convexQuery('projects:lookupBySlug', { slug, worldId: world })) || { projectId, slug, name: name || slug }

    // Scaffold files (idempotent enough: events are append-only, a re-run adds
    // a second dated stub rather than overwriting canon).
    await scaffoldProject(project.projectId, slug, world, creator.name)

    // Greet INSIDE the new room first so it's alive the moment the user walks
    // in. This send also mints the project room on Convex.
    const projectRoom = `${world}:project:${slug}`
    const kickoffOk = await postAssistant(world, projectRoom, agentSlug,
      `This is **${name || slug}**. Tell me about this project: what is it, and what do you want to get done here? Once you do, I'll set the room up around your answer.`,
      'agent-kickoff',
      { project_slug: slug, kickoff: true, created_by_name: creator.name, created_by_user_id: creator.userId })
    if (name) {
      try { await convexMutation('rooms:setTitle', { roomId: projectRoom, title: name }) } catch { /* the slug title stays */ }
    }

    // Then drop the forward-link in the 1:1 so the user can navigate over.
    const forwardOk = await postAssistant(world, eaRoom, agentSlug,
      `Project created: **${name || slug}** (${slug}). Click here to continue in the project room.`,
      'project-forward-link',
      { project_slug: slug, project_name: name || slug, created_by_name: creator.name, created_by_user_id: creator.userId })

    return res.status(200).json({
      ok: true,
      project_id: project.projectId,
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
