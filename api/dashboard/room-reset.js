// POST /api/dashboard/room-reset { client_id, agent, project?, mission_slug? }
//
// Archive the visible room session and clear only the agent's transient
// working context. Message rows are never deleted: the room_reset marker is
// the boundary CV6's History view uses, and clear_context is consumed by the
// room bridge / session reset worker.
//
// Backend: Convex messages:send (corner:retire-supabase R2, 2026-09-03). Both
// markers are role=system rows in the room the caller names.
//
// verifyTenant proves which world the caller may act in and nothing about a
// project. A project tag the tenant cannot reach is dropped, not refused: the
// archive marker is the point of the request and must still land.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

function cleanSlug(value) {
  const text = String(value || '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9:_-]{0,159}$/.test(text) ? text : ''
}

// May this tenant tag this project? Holder world or a grant passes, a world
// admin passes, and an unregistered slug is a first claim.
async function authorizeProjectScope({ tenant, isAdmin, slug }) {
  if (isAdmin) return { ok: true, via: 'world-admin' }
  const access = await convexQuery('projects:hasAccess', { slug, worldId: tenant }).catch(() => null)
  if (access?.ok) return { ok: true, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' }
  const registered = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null)
  if (!registered) return { ok: true, via: 'first-claim' }
  return { ok: false, via: 'denied', reason: `project "${slug}" belongs to world "${registered.ownerWorld}"` }
}

function roomKey({ world, agent, project, mission }) {
  if (mission) return mission.includes(':') ? `${world}:mission:${mission}` : `${world}:mission:${project ? project + ':' : ''}${mission}`
  if (project) return `${world}:project:${project}`
  return `${world}:agent:${agent}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const body = req.body || {}
  const requestedTenant = cleanSlug(body.client_id || body.tenant || '')
  const agent = cleanSlug(body.agent)
  const project = cleanSlug(body.project)
  const missionSlug = cleanSlug(body.mission_slug)
  if (!requestedTenant || !agent) return res.status(400).json({ error: 'valid client_id and agent required' })

  let verified
  try {
    verified = await verifyTenant(requestedTenant, req)
  } catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message })
    throw error
  }
  const tenant = verified.tenant

  let scopedProject = project
  let scopedMission = missionSlug
  let scopeDenied = null
  if (scopedProject) {
    let verdict
    try {
      verdict = await authorizeProjectScope({ tenant, isAdmin: !!verified.isAdmin, slug: scopedProject })
    } catch (e) {
      verdict = { ok: false, via: 'error', reason: String((e && e.message) || e) }
    }
    if (!verdict || !verdict.ok) {
      scopeDenied = { requested: scopedProject, via: verdict?.via || 'denied', reason: verdict?.reason || 'not reachable from this world' }
      console.warn(`[room-reset] project scope DENIED: tenant "${tenant}" may not tag project "${scopedProject}"; ${scopeDenied.reason}; archiving the room unscoped`)
      scopedProject = ''
      scopedMission = ''
    }
  }

  const identity = await callerIdentity(req).catch(() => null)
  const roomId = roomKey({ world: tenant, agent, project: scopedProject, mission: scopedMission })
  const common = {
    roomId,
    role: 'system',
    clientId: tenant,
    userId: identity?.userId ? String(identity.userId) : undefined,
    userEmail: identity?.email || undefined,
    userName: identity?.userName || undefined,
  }
  const scopeMeta = {
    ...(scopedMission ? { mission_slug: scopedMission } : {}),
    ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
  }

  // messages:send does not keep the metadata bag, so the marker flags
  // (room_reset, clear_context) are a second write on the row that landed.
  const post = async (args) => {
    const id = await convexMutation('messages:send', args)
    if (id && args.metadata) {
      await convexMutation('messages:patchMetadata', { messageId: String(id), patch: args.metadata })
        .catch((err) => console.warn('[room-reset] patchMetadata failed (ignored):', err?.message || err))
    }
    return id
  }

  try {
    await post({
      ...common, source: 'room_reset', text: 'Previous session archived',
      metadata: { room_reset: true, agent, ...scopeMeta },
    })
    await post({
      ...common, source: 'clear_context', text: agent,
      metadata: { clear_context: true, agent, ...scopeMeta },
    })
    return res.status(200).json({ ok: true, archived: true })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not reset room' })
  }
}
