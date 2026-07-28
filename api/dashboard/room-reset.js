// Archive the visible room session and clear only the agent's transient working context.
// Message rows are never deleted: the room_reset marker is the boundary used by CV6's
// History view, while clear_context is consumed by the room bridge/session reset worker.
//
// ── 2026-07-27 r7, corner:tenant-isolation ───────────────────────────────────
// verifyTenant proves WHICH WORLD the caller may act in and nothing about a
// PROJECT. `project` and `mission_slug` came off the body onto both rows:
//
//   KARENS_MEMBER POSTs {client_id:'karens-world', agent:'elon', project:'rex'}
//   -> two rows land client_id='karens-world', project='rex'  (replayed: 200)
//
// Those rows are the participation evidence arm (A) of the read-side floor reads
// as proof of belonging, so an endpoint whose whole job is bookkeeping quietly
// mints a claim on another world's project — the r4 exploit, through a writer
// that never goes near writeMessageRow. Closed with the same authorizer, and
// world_id is now stamped (it was omitted, so both rows took the DB default).
// A denied tag is DROPPED, not refused: the reset must still archive the room.

import { randomUUID } from 'crypto'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { makeProjectScopeAuthorizer, deriveRowWorld } from '../_lib/write-message.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
}

function cleanSlug(value) {
  const text = String(value || '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9:_-]{0,159}$/.test(text) ? text : ''
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const body = req.body || {}
  const requestedTenant = cleanSlug(body.client_id || body.tenant || 'aom')
  const agent = cleanSlug(body.agent)
  const project = cleanSlug(body.project)
  const missionSlug = cleanSlug(body.mission_slug)
  if (!requestedTenant || !agent) return res.status(400).json({ error: 'valid client_id and agent required' })

  let tenant
  try {
    ({ tenant } = await verifyTenant(requestedTenant, req))
  } catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message })
    throw error
  }

  // MAY THIS TENANT TAG THIS PROJECT? The r4 authorizer, reused. A mission hangs
  // off a project, so a refused project takes metadata.mission_slug with it —
  // that key is its own routing arm in the read queries and would otherwise still
  // file the rows into the mission's room. DROP, don't refuse: the archive marker
  // is the point of the request and must still land.
  let scopedProject = project
  let scopedMission = missionSlug
  let scopeDenied = null
  if (scopedProject) {
    let verdict
    try {
      verdict = await makeProjectScopeAuthorizer({ req, clientId: tenant })(scopedProject)
    } catch (e) {
      verdict = { ok: false, via: 'error', reason: String((e && e.message) || e) }
    }
    if (!verdict || !verdict.ok) {
      scopeDenied = {
        requested: scopedProject,
        via: (verdict && verdict.via) || 'denied',
        reason: (verdict && verdict.reason) || 'not reachable from this world',
      }
      console.warn(
        `[room-reset] project scope DENIED: tenant "${tenant}" may not tag project "${scopedProject}" — ${scopeDenied.reason}; archiving the room unscoped`,
      )
      scopedProject = ''
      scopedMission = ''
    }
  }

  // world_id derived from the verified tenant, never left to the DB default (r5).
  // A 'shared:<slug>' tenant is a room, so the AUTHOR's own world answers there.
  const identity = await callerIdentity(req).catch(() => null)
  const stampedWorld = deriveRowWorld({ clientId: tenant, worldId: identity?.world || null })

  const metadata = {
    room_reset: true,
    ...(scopedMission ? { mission_slug: scopedMission } : {}),
    ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
  }
  const base = {
    agent,
    client_id: tenant,
    world_id: stampedWorld.world,
    ...(scopedProject ? { project: scopedProject } : {}),
  }
  const now = Date.now()
  const rows = [
    {
      ...base, id: randomUUID(), role: 'system', source: 'room_reset',
      text: 'Previous session archived', metadata, timestamp: new Date(now).toISOString(),
    },
    {
      ...base, id: randomUUID(), role: 'system', source: 'clear_context',
      text: agent,
      metadata: {
        ...(scopedMission ? { mission_slug: scopedMission } : {}),
        ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
      },
      timestamp: new Date(now + 50).toISOString(),
    },
  ]

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST', headers: headers(), body: JSON.stringify(rows),
    })
    if (!response.ok) throw new Error(await response.text())
    return res.status(200).json({ ok: true, archived: true })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not reset room' })
  }
}
