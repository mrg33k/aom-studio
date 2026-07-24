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

import { randomUUID } from 'node:crypto'
import { findProjectSlugTwin } from '../_lib/projectDupGuard.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

// Scaffold mission files into events table
async function scaffoldProject(projectId, slug, clientId) {
  const stubs = [
    {
      path: `corner/users/${clientId}/projects/${slug}/VISION.md`,
      content: `# ${slug} — Vision\n\n*Scaffolded at ${new Date().toISOString()}*\n\nTBD\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/CONTEXT.md`,
      content: `# ${slug} — Context\n\n*Scaffolded at ${new Date().toISOString()}*\n\nTBD\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/BUILD.md`,
      content: `# ${slug} — Build Plan\n\n*Scaffolded at ${new Date().toISOString()}*\n\nTBD\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/RESEARCH.md`,
      content: `# ${slug} — Research Index\n\n*Scaffolded at ${new Date().toISOString()}*\n\nNo research yet.\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/last-conversation.md`,
      content: `# ${slug} — Conversation Log\n\n*Scaffolded at ${new Date().toISOString()}*\n\nProject created from novel topic in 1:1 chat.\n`,
    },
    {
      path: `corner/users/${clientId}/projects/${slug}/research/README.md`,
      content: `# ${slug} — Research Home\n\n*Scaffolded at ${new Date().toISOString()}*\n\nResearch outputs go here.\n`,
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
async function postForwardLinkMessage(clientId, agentSlug, projectSlug, projectName) {
  return postMessage({
    role: 'assistant',
    client_id: clientId,
    agent: agentSlug,
    project: null, // stays in the 1:1 with the EA
    source: 'project-forward-link',
    text: `Project created: **${projectName}** (${projectSlug}). Click here to continue in the project room.`,
    metadata: { project_slug: projectSlug, project_name: projectName },
    timestamp: new Date().toISOString(),
  })
}

// Opening greeting INSIDE the new project's room so it's alive on arrival.
// R78-p8 — a freshly-made room is never cold/silent; the EA greets and asks
// the user to describe the project so the room can self-build (R78-p10).
async function postRoomKickoffMessage(clientId, agentSlug, projectSlug, projectName) {
  return postMessage({
    role: 'assistant',
    client_id: clientId,
    agent: agentSlug,
    project: projectSlug, // lands in the new project's room
    source: 'agent-kickoff',
    text: `This is **${projectName}**. Tell me about this project — what is it, and what do you want to get done here? Once you do, I'll set the room up around your answer.`,
    metadata: { project_slug: projectSlug, kickoff: true },
    timestamp: new Date().toISOString(),
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { slug, name, client_id, agent_slug, force, dry_run } = req.body

  if (!slug || !client_id) {
    return res.status(400).json({ error: 'slug and client_id required' })
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
        clientId: client_id,
      })
      if (twin) {
        if (!dry_run) {
          await postMessage({
            role: 'assistant',
            client_id,
            agent: agent_slug || 'ea',
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

    // Create or fetch existing project row
    const project = await createProjectRow(slug, name, client_id)

    // R78-p9c: UPSERT into agent_status so the new project appears in the drawer
    // via the primary fromAgents path (same as all existing projects). Without this,
    // the project only has a `projects` table row and relies on the fragile fromDefs
    // secondary path which silently fails on any fetch error.
    await upsertAgentStatusProject(slug, name || slug, client_id, '#6B8AB0')

    // Scaffold mission files (idempotent — checks for existing stubs)
    await scaffoldProject(project.id, slug, client_id)

    // Greet INSIDE the new room first so it's alive the moment the user walks in.
    const kickoffOk = await postRoomKickoffMessage(
      client_id,
      agent_slug || 'ea',
      slug,
      name || slug
    )

    // Then drop the forward-link in the 1:1 so the user can navigate over.
    const forwardOk = await postForwardLinkMessage(
      client_id,
      agent_slug || 'ea',
      slug,
      name || slug
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
