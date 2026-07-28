// POST /api/dashboard/create-agents
// Takes the Architect's validated discovery JSON and:
//   1. Creates agent rows in Supabase agent_status table (world-scoped by clientId)
//   2. Creates the workspace file structure in GitHub (via GitHub API)
//
// Body: { clientId: 'uuid', plan: { user_profile, projects, agents } }
// Returns: { ok: true, agents: [...slugs created] }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'

// Agent colors -- cycle through these for new agents
const AGENT_COLORS = [
  '#60A5FA', // blue
  '#34D399', // green
  '#F472B6', // pink
  '#FBBF24', // yellow
  '#A78BFA', // purple
  '#F87171', // red
  '#38BDF8', // sky
  '#4ADE80', // lime
]

// ── GitHub File Write ─────────────────────────────────────────────────────────

async function writeGitHubFile(path, content, message) {
  if (!GITHUB_TOKEN) return false
  try {
    // Check if file already exists (need SHA for update)
    const checkRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    )
    let sha = undefined
    if (checkRes.ok) {
      const existing = await checkRes.json()
      sha = existing.sha
    }

    const body = {
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch: BRANCH,
    }
    if (sha) body.sha = sha

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    return res.ok
  } catch { return false }
}

// ── Supabase Agent Insert ─────────────────────────────────────────────────────

async function upsertAgentStatus(slug, name, role, clientId, color) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false
  try {
    // Check if agent already exists for this client
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )
    const existing = checkRes.ok ? await checkRes.json() : []

    const payload = {
      slug,
      name,
      role,
      status: 'idle',
      current_task: '',
      color,
      client_id: clientId,
      type: 'agent',
      updated_at: new Date().toISOString(),
    }

    if (existing.length > 0) {
      // Update existing row
      await fetch(
        `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ name, role, status: 'idle', color, type: 'agent' }),
        }
      )
    } else {
      // Insert new row
      await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      })
    }
    return true
  } catch { return false }
}

// ── Workspace File Generation ─────────────────────────────────────────────────
// Mirrors the logic in scripts/create-user-agents.py but as a serverless API call.

function generateMeMd(profile) {
  const tools = Array.isArray(profile.tools) ? profile.tools.join(', ') : 'None listed'
  const pains = (profile.pain_points || []).map(p => `- ${p}`).join('\n')
  return `# ${profile.name}\n\n**Role:** ${profile.role}\n**Business:** ${profile.business}\n**Tools:** ${tools}\n\n## Pain Points\n${pains}\n\n## 90-Day Goals\n${profile.goals_90_day || ''}\n`
}

function generateGoalsMd(profile, projects) {
  const sorted = [...projects].sort((a, b) => (a.priority || 99) - (b.priority || 99))
  const projLines = sorted.map(p => `${p.priority}. **${p.name}** -- ${p.description}`).join('\n')
  const pains = (profile.pain_points || []).map(p => `- Resolve: ${p}`).join('\n')
  return `# Goals -- ${profile.name}\n\n## 90-Day Target\n${profile.goals_90_day || ''}\n\n## Success Criteria\n${pains}\n\n## Projects (by priority)\n${projLines}\n`
}

function generateAgentMd(agent, project, profile) {
  const tools = Array.isArray(profile.tools) ? profile.tools.join(', ') : 'None listed'
  return `# ${agent.name} -- ${agent.role}\n\nYou are ${agent.name}, ${profile.name}'s ${agent.role.toLowerCase()} agent. You work within the ${project.name} project.\n\n## What You Own\n- ${agent.reasoning}\n\n## Context\n- User: ${profile.name}, ${profile.role} at ${profile.business}\n- Project: ${project.description}\n- Tools they use: ${tools}\n\n## Rules\n- Keep responses concise. Bullet points over paragraphs.\n- Never ask "want me to?" -- just do it.\n- Write discoveries to last-conversation.md as you work.\n`
}

function generateAgentsJson(agents, clientId) {
  return JSON.stringify(
    agents.map(a => ({
      slug: a.slug,
      name: a.name,
      role: a.role,
      project: a.project,
      path: `workspaces/${clientId}/projects/${a.project}/agents/${a.slug}`,
      skills: a.skills_matched || [],
      keywords: (a.role || '').toLowerCase().split(/\s+/).filter(w => w.length >= 4),
    })),
    null,
    2
  ) + '\n'
}

// ── Handler ───────────────────────────────────────────────────────────────────

// AUTH (r7:open-agent-surface, 2026-07-27). This endpoint was unauthenticated
// with `Access-Control-Allow-Origin: *`, and it does two things you do not want
// an anonymous caller doing: it COMMITS FILES to the agent repo through a
// GitHub token (workspaces/<clientId>/**, including each agent's own .md
// identity file, which agents read as canon), and it creates `agent_status`
// rows in whatever world the body names. Between them that is arbitrary content
// authored into an agent's instructions plus a roster the dashboard renders.
//
// Gated with verifyTenant on the body's clientId: you may build a team in a
// world you belong to, and nowhere else. Deliberately NOT admin-only — an
// ordinary member of a world setting up their own agents is the normal case.
export default async function handler(req, res) {
  applyCors(req, res, 'POST')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { clientId, plan } = req.body || {}

  if (!clientId) return res.status(400).json({ error: 'clientId required' })

  try {
    await verifyTenant(String(clientId).trim().toLowerCase(), req)
  } catch (err) {
    if (err instanceof TenantAuthError) return sendAuthError(res, err)
    return res.status(500).json({ error: err?.message || 'auth check failed' })
  }

  if (!plan || !plan.user_profile || !Array.isArray(plan.projects) || !Array.isArray(plan.agents)) {
    return res.status(400).json({ error: 'plan with user_profile, projects, and agents required' })
  }
  if (plan.agents.length === 0) return res.status(400).json({ error: 'plan must have at least 1 agent' })

  const { user_profile: profile, projects, agents } = plan
  const projectMap = Object.fromEntries(projects.map(p => [p.slug, p]))

  const createdAgents = []
  const errors = []

  // 1. Create workspace files in GitHub
  const workspacePath = `workspaces/${clientId}`

  // Write top-level workspace files
  await Promise.all([
    writeGitHubFile(
      `${workspacePath}/me.md`,
      generateMeMd(profile),
      `feat: create workspace for ${clientId} -- me.md`
    ),
    writeGitHubFile(
      `${workspacePath}/goals.md`,
      generateGoalsMd(profile, projects),
      `feat: create workspace for ${clientId} -- goals.md`
    ),
    writeGitHubFile(
      `${workspacePath}/agents.json`,
      generateAgentsJson(agents, clientId),
      `feat: create workspace for ${clientId} -- agents.json`
    ),
  ])

  // Write per-agent files
  for (const agent of agents) {
    const project = projectMap[agent.project]
    if (!project) {
      errors.push(`Agent ${agent.slug}: project '${agent.project}' not found in plan`)
      continue
    }

    const agentPath = `${workspacePath}/projects/${agent.project}/agents/${agent.slug}`

    await Promise.all([
      writeGitHubFile(
        `${agentPath}/AGENT.md`,
        generateAgentMd(agent, project, profile),
        `feat: create agent ${agent.slug} for ${clientId}`
      ),
      writeGitHubFile(
        `${agentPath}/incoming-tasks.md`,
        `# Incoming Tasks -- ${agent.name}\n\nNo tasks yet.\n`,
        `feat: create agent ${agent.slug} tasks file`
      ),
      writeGitHubFile(
        `${agentPath}/last-conversation.md`,
        `# ${agent.name} -- Tape\n\n## Current State\n- Just created by System Architect. No work done yet.\n- Assigned to project: ${project.name}\n- User: ${profile.name} (${profile.role})\n\n## What's Next\n- Waiting for first task from ${profile.name}\n- Primary focus: ${agent.reasoning}\n`,
        `feat: create agent ${agent.slug} tape`
      ),
    ])
  }

  // 2. Insert agents into Supabase agent_status
  let colorIdx = 0
  for (const agent of agents) {
    const color = AGENT_COLORS[colorIdx % AGENT_COLORS.length]
    colorIdx++

    const ok = await upsertAgentStatus(agent.slug, agent.name, agent.role, clientId, color)
    if (ok) {
      createdAgents.push({ slug: agent.slug, name: agent.name, role: agent.role, color })
    } else {
      errors.push(`Failed to create agent ${agent.slug} in Supabase`)
    }
  }

  return res.status(200).json({
    ok: createdAgents.length > 0,
    agents: createdAgents,
    errors: errors.length > 0 ? errors : undefined,
    clientId,
  })
}

export const config = { maxDuration: 60 }
