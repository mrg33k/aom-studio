// POST /api/onboarding/create-agents
// Triggers the Agent Creation Pipeline with the Architect's approved plan.
// Writes agents to Supabase agent_status for immediate dashboard visibility.
// Also queues the workspace creation for Mac-side file system execution.

import { callerIdentity } from '../_lib/verifyTenant.js'
import { applyCors } from '../_lib/originAllowlist.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

async function supabaseFetch(url, method, body, headers = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { ok: false, error: 'Supabase not configured' }
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    return { ok: false, error: err }
  }
  return { ok: true }
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

  const { clientId, plan } = req.body

  if (!clientId || !plan) {
    return res.status(400).json({ error: 'clientId and plan are required' })
  }

  // ── AUTH (r7:open-agent-surface, 2026-07-27) ────────────────────────────
  // This was unauthenticated with `Access-Control-Allow-Origin: *`. It writes
  // `agent_status` rows into whatever world the body names AND queues an
  // `onboarding_queue` row whose `plan` is executed Mac-side, so an anonymous
  // POST could bolt agents onto an existing world's roster and hand a local
  // runner a plan it did not ask for.
  //
  // The gate is deliberately NOT verifyTenant. Onboarding runs BEFORE the user
  // has a world — user_metadata.world is set by the frontend a few lines after
  // this call returns — so verifyTenant would refuse every legitimate signup
  // and this endpoint would only ever work for people who no longer need it.
  // That is the over-correction shape this round exists to avoid.
  //
  // Instead: a verified session is required (no anonymous signups), and a
  // clientId that names an ALREADY-CLAIMED world is refused unless the caller
  // is in it. Creating your own new world stays open; joining yourself onto
  // somebody else's does not.
  const who = await callerIdentity(req)
  if (!who) return res.status(401).json({ error: 'sign in required' })

  const targetWorld = String(clientId).trim().toLowerCase()
  if (targetWorld !== String(who.userId).toLowerCase() && targetWorld !== (who.world || '')) {
    // Not the caller's own uid and not their own world — allowed only if the
    // world does not exist yet (a genuinely new workspace).
    let claimed = false
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/worlds?or=(slug.eq.${encodeURIComponent(targetWorld)},client_id.eq.${encodeURIComponent(targetWorld)})&select=slug&limit=1`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } },
      )
      if (r.ok) {
        const rows = await r.json()
        claimed = Array.isArray(rows) && rows.length > 0
      } else {
        claimed = true // cannot tell -> refuse rather than hand over a world
      }
    } catch {
      claimed = true
    }
    if (claimed) {
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

  // Without Supabase (local dev no-DB mode): return success immediately
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(200).json({
      success: true,
      clientId,
      agents: agentList,
      projects: plan.projects,
      queued: false,
      note: 'No Supabase — workspace creation skipped in this mode.',
    })
  }

  try {
    // 1. Queue workspace creation for Mac-side script execution
    const queueId = crypto.randomUUID()
    await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/onboarding_queue`,
      'POST',
      {
        id: queueId,
        client_id: clientId,
        plan,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    )
    // Don't fail on queue error -- agents get written to Supabase regardless

    // 2. Write agents to agent_status for immediate dashboard visibility
    const agentRows = plan.agents.map(agent => ({
      slug: agent.slug,
      name: agent.name,
      role: agent.role,
      status: 'idle',
      client_id: clientId,
      type: 'agent',
      color: pickAgentColor(agent.role),
    }))

    await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/agent_status`,
      'POST',
      agentRows,
      { Prefer: 'resolution=merge-duplicates,return=minimal' }
    )

    // 3. Update user metadata world to clientId
    // (The frontend also does this via supabase.auth.updateUser, but belt+suspenders)

    return res.status(200).json({
      success: true,
      clientId,
      agents: agentList,
      projects: plan.projects,
      queued: true,
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
