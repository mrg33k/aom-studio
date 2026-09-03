// POST /api/onboarding/create-agents
// Triggers the Agent Creation Pipeline with the Architect's approved plan.
// Writes the agents to Convex for immediate dashboard visibility and queues
// the workspace creation for Mac-side file system execution.
//
// corner:retire-supabase (2026-09-03). What each Supabase write became:
//   worlds (claimed check)   -> worlds:getBySlug
//   world creation           -> users:ensureWorld + worlds:addMember (owner)
//   agent_status rows        -> agents:upsert (world-scoped rows)
//   onboarding_queue row     -> onboarding:enqueue
//   auth user_metadata.world -> the membership row IS the world now; the
//                               onboarded flag goes to users:setPrefs

import { callerIdentity, extractJwt } from '../_lib/verifyTenant.js'
import { applyCors } from '../_lib/originAllowlist.js'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || ''

async function convex(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}

const withKey = (args) => (CONVEX_KEY ? { key: CONVEX_KEY, ...args } : args)

// Color by role category
function pickAgentColor(role) {
  const r = (role || '').toLowerCase()
  if (/recruit|talent|sourcing|hiring/.test(r))         return '#FB923C'
  if (/sales|outreach|growth|business dev/.test(r))     return '#F97316'
  if (/content|social|marketing|media/.test(r))         return '#A78BFA'
  if (/design|brand|creative|visual/.test(r))           return '#F472B6'
  if (/finance|book|account|invoice|budget/.test(r))    return '#34D399'
  if (/research|analys|strategy|market intel/.test(r))  return '#FBBF24'
  if (/tech|dev|engineer|code|build/.test(r))           return '#60A5FA'
  if (/compliance|legal|hr|policy/.test(r))             return '#38BDF8'
  if (/admin|ops|operation|coordinator/.test(r))        return '#4ADE80'
  if (/trade|invest|portfolio|stock/.test(r))           return '#A3E635'
  return '#94A3B8'
}

function slugifyWorld(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default async function handler(req, res) {
  // CORS
  applyCors(req, res, 'POST')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { clientId, plan } = req.body || {}

  if (!clientId || !plan) {
    return res.status(400).json({ error: 'clientId and plan are required' })
  }

  // ── AUTH (r7:open-agent-surface, 2026-07-27) ────────────────────────────
  // This was unauthenticated with `Access-Control-Allow-Origin: *`. It writes
  // agent rows into whatever world the body names AND queues a workspace plan
  // that is executed Mac-side, so an anonymous POST could bolt agents onto an
  // existing world's roster and hand a local runner a plan it did not ask for.
  //
  // The gate is deliberately NOT verifyTenant. Onboarding runs BEFORE the user
  // has a world, so verifyTenant would refuse every legitimate signup and this
  // endpoint would only ever work for people who no longer need it.
  //
  // Instead: a verified session is required (no anonymous signups), and a
  // clientId that names an ALREADY-CLAIMED world is refused unless the caller
  // is in it. Creating your own new world stays open; joining yourself onto
  // somebody else's does not.
  const who = await callerIdentity(req)
  if (!who) return res.status(401).json({ error: 'sign in required' })
  const token = extractJwt(req)

  const targetWorld = String(clientId).trim().toLowerCase()
  const ownWorld = (who.world || '').toLowerCase()
  let existingWorld = null
  let lookupFailed = false
  try {
    existingWorld = await convex('query', 'worlds:getBySlug', { slug: targetWorld })
  } catch {
    lookupFailed = true
  }
  if (targetWorld !== String(who.userId).toLowerCase() && targetWorld !== ownWorld) {
    // Not the caller's own uid and not their own world — allowed only if the
    // world does not exist yet (a genuinely new workspace). A lookup failure
    // reads as claimed: refuse rather than hand over a world.
    if (lookupFailed || existingWorld) {
      return res.status(403).json({ error: 'that workspace already exists' })
    }
  }

  if (!plan.user_profile || !Array.isArray(plan.projects) || !Array.isArray(plan.agents)) {
    return res.status(400).json({ error: 'Invalid plan structure: missing user_profile, projects, or agents' })
  }

  if (plan.agents.length === 0) {
    return res.status(400).json({ error: 'Plan must include at least one agent' })
  }

  // Build agent list for response
  const agentList = plan.agents.map(a => ({
    name: a.name,
    role: a.role,
    project: a.project,
    slug: a.slug,
    color: pickAgentColor(a.role),
  }))

  try {
    // 1. The world. Make sure it exists and the caller is its owner. The
    //    membership row is what used to be user_metadata.world.
    const worldSlug = slugifyWorld(targetWorld) || targetWorld
    const workspaceName = String(plan.user_profile?.workspace_name || plan.user_profile?.company || plan.user_profile?.name || worldSlug).trim() || worldSlug
    let worldId = existingWorld?._id || null
    if (!worldId) {
      worldId = await convex('mutation', 'users:ensureWorld', { ownerId: who.userId, name: workspaceName, slug: worldSlug })
    }
    try {
      await convex('mutation', 'worlds:addMember', withKey({ worldId: String(worldId), userId: who.userId, role: 'owner' }), token)
    } catch (err) {
      // An existing world the caller is already in refuses nothing; any other
      // refusal is reported and the rest of onboarding still runs.
      console.warn('[create-agents] addMember:', err.message)
    }

    // 2. Queue workspace creation for Mac-side script execution
    let queued = false
    try {
      await convex('mutation', 'onboarding:enqueue', { worldId: String(worldId), plan })
      queued = true
    } catch (err) {
      // Don't fail on queue error -- agents get written regardless
      console.warn('[create-agents] enqueue:', err.message)
    }

    // 3. Write the agents for immediate dashboard visibility (world-scoped rows)
    for (const agent of plan.agents) {
      await convex('mutation', 'agents:upsert', withKey({
        slug: String(agent.slug || agent.name).trim().toLowerCase(),
        title: agent.name,
        subtitle: agent.role,
        color: pickAgentColor(agent.role),
        instructions: `You are ${agent.name}, ${agent.role || 'a teammate'} in the ${workspaceName} workspace.${agent.project ? ` You work on ${agent.project}.` : ''}`,
        active: true,
        worldId: String(worldId),
      }))
    }

    // 4. Mark the person onboarded (was the frontend's auth.updateUser call).
    //    Best effort, and only when the caller sent a token to act as.
    if (token) {
      try {
        await convex('mutation', 'users:setPrefs', { patch: { onboarded: true, workspaceName, world: worldSlug } }, token)
      } catch (err) {
        console.warn('[create-agents] setPrefs:', err.message)
      }
    }

    return res.status(200).json({
      success: true,
      clientId,
      world: worldSlug,
      worldId: String(worldId),
      agents: agentList,
      projects: plan.projects,
      queued,
    })

  } catch (err) {
    console.error('[create-agents] Error:', err)
    // Return partial success -- the frontend already has the plan data
    return res.status(200).json({
      success: true,
      clientId,
      agents: agentList,
      projects: plan.projects,
      queued: false,
      warning: 'Workspace queued with errors: ' + err.message,
    })
  }
}

export const config = { maxDuration: 30 }
