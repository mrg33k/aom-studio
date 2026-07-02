// GET  /api/dashboard/supabase-messages?agent={slug}&limit=100&client=aom
// POST /api/dashboard/supabase-messages  { agent, text, role, source, client_id }
//
// Server-side Supabase proxy. Uses service role key for writes.
// The ONLY production chat endpoint. No Supabase JS client in browser.
//
// Multi-tenant: all reads + writes are scoped by client_id.
// Default client_id = 'aom'. Pass ?client= on GET or client_id in POST body.

import { writeMessageRow } from '../_lib/write-message.js'
import { verifyTenant, TenantAuthError, extractJwt } from '../_lib/verifyTenant.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

// Shared project rooms (`shared:<slug>`) are cross-tenant by design — a thread
// any participating tenant can post to. Tenant equality doesn't apply, but we
// still require a valid JWT so anonymous callers can't read or write. Per-room
// membership is a follow-up; for Patrik-only today, JWT-required is the floor.
const SHARED_PREFIX = 'shared:'

async function requireJwtOnly(req, res) {
  const jwt = extractJwt(req)
  if (!jwt) { res.status(401).json({ error: 'jwt required' }); return false }
  return true
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const DEFAULT_CLIENT_ID = 'aom'

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // ---- GET: load chat history for an agent --------------------------------
  if (req.method === 'GET') {
    const { agent, limit = 100, all } = req.query
    // A thread is identified by an agent, a project, a mission, or the all-agents aggregate.
    // Project/mission rooms (see projectFilter/missionFilter below) are valid without an agent.
    if (!agent && !all && !req.query.project && !req.query.mission_slug) {
      return res.status(400).json({ error: 'agent, project, or mission_slug required' })
    }

    // client_id filter ready for multi-tenant (add column to Supabase first)
    const requestedClient = (req.query.client && req.query.client.trim())
      ? req.query.client.trim().toLowerCase()
      : DEFAULT_CLIENT_ID
    let clientId
    if (requestedClient.startsWith(SHARED_PREFIX)) {
      // Shared project room — JWT-required, no tenant equality.
      if (!(await requireJwtOnly(req, res))) return
      clientId = requestedClient
    } else {
      try {
        ({ tenant: clientId } = await verifyTenant(requestedClient, req))
      } catch (err) {
        if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
        throw err
      }
    }

    // Always filter by client_id for multi-tenant isolation.
    // Requires: ALTER TABLE messages ADD COLUMN client_id text DEFAULT 'aom';
    // Supabase silently ignores unknown column filters -- safe to include always.
    const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`

    // ?search=keyword: full-text search across ALL messages for this agent (no limit cap)
    const searchQuery = req.query.search ? req.query.search.trim() : ''

    // ?all=true: fetch ALL messages across all agents (for AOM Team Room aggregate view)
    // No agent on a project/mission query → don't emit "agent=eq.undefined" (which returns nothing).
    // Agent 1:1 threads are room_id-scoped (corner:one-write-path R5c, Patrik's
    // go 2026-07-01): the 1:1 room shows the 1:1 CONVERSATION, not every row
    // the agent touched across projects (legacy agent=eq returned 4.3x that
    // for elon). Legacy arm inside the or() covers identical ground post-
    // backfill. SEARCH keeps the broad agent=eq scope on purpose — its
    // contract is "all messages for this agent".
    const agentFilter = (all === 'true' || all === '1' || !agent)
      ? ''
      : (searchQuery || req.query.project || req.query.mission_slug)
        ? `&agent=eq.${encodeURIComponent(agent)}`
        : `&or=(room_id.eq.${encodeURIComponent(`${clientId}:agent:${agent}`)},and(agent.eq.${encodeURIComponent(agent)},project.is.null,metadata->>mission_slug.is.null))`
    const searchFilter = searchQuery ? `&text=ilike.*${encodeURIComponent(searchQuery)}*` : ''
    // corner:notifications-catchup R3 — room-scoped filters for the catch-up
    // context fetcher. Same shape any chat surface uses:
    //   ?project=<slug>               — project rooms
    //   ?project_only=1               — with ?project, exclude mission-tagged rows
    //                                   (the project CHAT is the project-level thread;
    //                                   mission-room messages also carry project=<slug>
    //                                   but belong to their mission room, not here)
    //   ?mission_slug=<slug>          — mission rooms (metadata->>mission_slug)
    //   ?before=<iso>                 — only messages strictly earlier than this timestamp
    // Optional + backward-compatible — existing callers pass none of these
    // and get the original behavior.
    // Room filters (corner:one-write-path R3/R5, 2026-07-01): every row carries
    // a canonical room_id (trigger + backfill), so each room mode matches
    // room_id FIRST with the legacy column arm kept inside an or() as
    // belt-and-suspenders — the match set only ever grows.
    const projectOnly = req.query.project_only === '1' || req.query.project_only === 'true'
    let projectFilter = ''
    let projectOnlyFilter = ''
    if (req.query.project && !req.query.mission_slug) {
      const p = req.query.project
      const rid = encodeURIComponent(`${clientId}:project:${p}`)
      if (projectOnly) {
        // Project CHAT: exactly the project-level thread (mission rows have
        // mission room_ids). Legacy arm: project + no mission metadata.
        projectFilter = `&or=(room_id.eq.${rid},and(project.eq.${encodeURIComponent(p)},metadata->>mission_slug.is.null))`
      } else {
        // Project + its missions: project room, any of its mission rooms
        // (canonical mission slugs are "<project>:<slug>"), or legacy
        // project-tagged rows.
        projectFilter = `&or=(room_id.eq.${rid},room_id.like.${encodeURIComponent(`${clientId}:mission:${p}:`)}*,project.eq.${encodeURIComponent(p)})`
      }
    }
    // Mission rooms: canonicalize the incoming slug server-side (the UI sends
    // the BARE form) so the room_id arm actually matches the canonical ids the
    // trigger writes; the raw-metadata arm keeps legacy stragglers visible.
    const missionFilter = (() => {
      if (!req.query.mission_slug) return ''
      const raw = req.query.mission_slug
      const canon = canonicalizeMissionSlug(raw, MISSION_SLUG_LOOKUP) || raw
      return `&or=(room_id.eq.${encodeURIComponent(`${clientId}:mission:${canon}`)},metadata->>mission_slug.eq.${encodeURIComponent(raw)},metadata->>mission_slug.eq.${encodeURIComponent(canon)})`
    })()
    const beforeFilter = req.query.before ? `&timestamp=lt.${encodeURIComponent(req.query.before)}` : ''
    const searchLimit = searchQuery ? 500 : limit  // search returns more results
    const url = `${SUPABASE_URL}/rest/v1/messages?select=*${agentFilter}${projectFilter}${projectOnlyFilter}${missionFilter}${beforeFilter}${clientFilter}${searchFilter}&order=timestamp.desc&limit=${searchLimit}`
    const sbRes = await fetch(url, { headers: supabaseHeaders() })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    const messages = await sbRes.json()
    // Reverse so oldest first (fetched desc to get the LATEST N, display asc)
    messages.reverse()
    return res.status(200).json({ messages })
  }

  // ---- PATCH: update status on an existing message (read receipt persistence) -
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {}
    if (!id || !status) return res.status(400).json({ error: 'id and status required' })
    const allowed = ['sent', 'delivered', 'read', 'composing']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' })
    // Read-receipt is low blast-radius (status enum only) but still needs a
    // valid JWT so anonymous tampering is denied. Per-message tenant binding
    // is a follow-up — would require a row lookup per PATCH.
    if (!(await requireJwtOnly(req, res))) return

    const url = `${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(id)}`
    const sbRes = await fetch(url, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: JSON.stringify({ status }),
    })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    return res.status(200).json({ ok: true })
  }

  // ---- POST: write a new message (user send from dashboard) ---------------
  if (req.method === 'POST') {
    const {
      agent, text, role = 'user', source = 'corner-dashboard', client_id, sender_role, world_id, project,
      // User identity (multi-user support)
      user_id, user_name,
      // Attachment fields (optional)
      attachment_url, file_mime_type, file_size,
      // Threading + context-menu metadata (right-click Follow-up / verify / research / crosspost)
      reply_to, metadata,
    } = req.body || {}
    if (!agent || !text) return res.status(400).json({ error: 'agent and text required' })

    // Resolve client_id: prefer body field, else default to 'aom'
    const requestedClientId = (client_id && client_id.trim())
      ? client_id.trim().toLowerCase()
      : DEFAULT_CLIENT_ID
    let resolvedClientId
    if (requestedClientId.startsWith(SHARED_PREFIX)) {
      if (!(await requireJwtOnly(req, res))) return
      resolvedClientId = requestedClientId
    } else {
      try {
        ({ tenant: resolvedClientId } = await verifyTenant(requestedClientId, req))
      } catch (err) {
        if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
        throw err
      }
    }

    // Single write path (corner:one-write-path R1): project resolution
    // (explicit field > [project:slug] tag, NEVER fuzzy — R-CROSSPOST-SCOPE),
    // mission_slug canonicalization, and the collaborator-gated crosspost all
    // live in api/_lib/write-message.js. This endpoint only owns auth above.
    const result = await writeMessageRow({
      supabaseUrl: SUPABASE_URL,
      headers: supabaseHeaders(),
      text,
      role,
      source,
      agent,
      clientId: resolvedClientId,  // verified above -- multi-tenant isolation
      project,
      metadata,
      userId: user_id,
      userName: user_name,
      senderRole: sender_role,
      worldId: world_id,
      attachmentUrl: attachment_url,
      fileMimeType: file_mime_type,
      fileSize: file_size,
      replyTo: reply_to,
    })
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.error || 'write failed' })
    }
    return res.status(200).json({ ok: true, message: result.row })
  }

  // ---- DELETE: clear all messages for a client_id (world switch fresh-start) ------
  if (req.method === 'DELETE') {
    const requestedClient = (req.query.client && req.query.client.trim())
      ? req.query.client.trim().toLowerCase()
      : null
    if (!requestedClient || requestedClient === 'aom') {
      // Safety guard: never allow bulk-delete for aom world
      return res.status(400).json({ error: 'client required and must not be aom' })
    }
    let clientId
    try {
      ({ tenant: clientId } = await verifyTenant(requestedClient, req))
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
      throw err
    }
    const url = `${SUPABASE_URL}/rest/v1/messages?client_id=eq.${encodeURIComponent(clientId)}`
    const sbRes = await fetch(url, {
      method: 'DELETE',
      headers: supabaseHeaders(),
    })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
