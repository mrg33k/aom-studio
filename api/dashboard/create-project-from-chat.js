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

// Post forward-link message to 1:1 chat
async function postForwardLinkMessage(clientId, agentSlug, projectSlug, projectName) {
  const msg = {
    role: 'assistant',
    client_id: clientId,
    agent_slug: agentSlug,
    project_id: null, // stays in 1:1 chat
    source: 'project-forward-link',
    text: `Project created: **${projectName}** (${projectSlug}). Click here to continue in the project room.`,
    metadata: {
      project_slug: projectSlug,
      project_name: projectName,
    },
    timestamp: new Date().toISOString(),
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/supabase_messages`, {
    method: 'POST',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(msg),
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn(`Failed to post forward-link message: ${err}`)
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { slug, name, client_id, agent_slug } = req.body

  if (!slug || !client_id) {
    return res.status(400).json({ error: 'slug and client_id required' })
  }

  try {
    // Create or fetch existing project row
    const project = await createProjectRow(slug, name, client_id)

    // Scaffold mission files (idempotent — checks for existing stubs)
    await scaffoldProject(project.id, slug, client_id)

    // Post forward-link message to 1:1 chat
    await postForwardLinkMessage(
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
    })
  } catch (err) {
    console.error('create-project-from-chat error:', err)
    return res.status(500).json({ error: err.message })
  }
}
