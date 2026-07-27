// GET  /api/dashboard/supabase-messages?agent={slug}&limit=100&client=aom
// POST /api/dashboard/supabase-messages  { agent, text, role, source, client_id }
//
// Server-side Supabase proxy. Uses service role key for writes.
// The ONLY production chat endpoint. No Supabase JS client in browser.
//
// Multi-tenant: all reads + writes are scoped by client_id.
// Default client_id = 'aom'. Pass ?client= on GET or client_id in POST body.

import { writeMessageRow } from '../_lib/write-message.js'
import { verifyTenant, TenantAuthError, extractJwt, callerIdentity } from '../_lib/verifyTenant.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

// Shared project rooms (`shared:<slug>`) used to take a JWT-presence check only
// ("per-room membership is a follow-up"). That follow-up shipped: for a
// `shared:` tenant verifyTenant() admits the HOLDER world of the project and any
// world holding a project_access row, and refuses everyone else. Shared rooms
// are precisely where two worlds' people sit in one thread, so any-JWT was the
// one place the cross-world boundary actually leaked.
// (corner:identity-attribution, 2026-07-27.)
//
// r2: 11 of the 35 live shared rooms have no projects row at all — they predate
// the projects table (aheadofmarket, ambition, aom-studio, chat-all-rooms,
// google-ads-launch, home-all-rooms, lab-bridge-r5, organize, pala, sys,
// trading-agent). The first pass 403'd every one of them, which meant Courtney
// opening the shared aheadofmarket thread got a wall while Patrik sailed through
// on the super-admin bypass. verifyTenant now falls back to the room's own
// traffic for those: a world that already has messages in the room is a
// participant, every other world is refused. Narrower than any-JWT, and it does
// not lock out the people who are actually in the room. Full reasoning lives on
// hasLegacySharedRoomPresence() in api/_lib/verifyTenant.js — do not re-tighten
// this without reading it.
//
// NOTE for anyone copying this gate: verifyTenant reads project_access ONLY for
// a tenant literally spelled `shared:<slug>`. If you are gating a PROJECT by its
// holder world, use verifyProjectAccess() instead — verifyTenant(holderWorld)
// refuses every granted collaborator world.
const SHARED_PREFIX = 'shared:'

async function requireJwtOnly(req, res) {
  const jwt = extractJwt(req)
  if (!jwt) { res.status(401).json({ error: 'jwt required' }); return false }
  return true
}

// Resolve the tenant for a request and 4xx on the response if it fails.
// Returns the verified tenant string, or null when a response was already sent.
async function resolveTenant(requestedClient, req, res) {
  try {
    const { tenant } = await verifyTenant(requestedClient, req)
    return tenant
  } catch (err) {
    if (err instanceof TenantAuthError) {
      res.status(err.status).json({ error: err.message })
      return null
    }
    throw err
  }
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
    // One gate for every tenant shape. For `shared:<slug>` verifyTenant runs the
    // owner-or-grant check (hasSharedProjectAccess, incl. the legacy-room
    // fallback); for a plain world it runs world equality / world-admin. Ash and
    // Courtney are world 'aom', so every aom room and every aom-granted shared
    // room passes on world equality / grant — no super-admin needed.
    const clientId = await resolveTenant(requestedClient, req, res)
    if (!clientId) return

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
        // Drift-rescue arms (qa-sweep 2026-07-17): some writer lanes stamp a
        // project room as if it were a mission named after the project
        // (mission_slug="corner" / room_id aom:mission:corner, even the
        // canonicalized aom:mission:corner:corner). Those rows are the
        // project conversation — without these arms they render NOWHERE and
        // the room shows a stale tail while Home previews the missing rows.
        const pEnc = encodeURIComponent(p)
        const bogusMissionRid = encodeURIComponent(`${clientId}:mission:${p}`)
        const bogusCanonRid = encodeURIComponent(`${clientId}:mission:${p}:${p}`)
        projectFilter = `&or=(room_id.eq.${rid},room_id.eq.${bogusMissionRid},room_id.eq.${bogusCanonRid},and(project.eq.${pEnc},metadata->>mission_slug.is.null),and(project.eq.${pEnc},metadata->>mission_slug.eq.${pEnc}))`
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
      // Project-aware canonicalization (corner:front-door Bug 1): when the caller
      // passes the mission's project, a BARE slug canonicalizes within THAT project
      // rather than under whichever project registered the bare slug first. The
      // raw (bare) metadata arm below still matches legacy bare rows, so this only
      // ADDS the correct-project match — no existing row stops rendering.
      const canon = canonicalizeMissionSlug(raw, MISSION_SLUG_LOOKUP, req.query.project) || raw
      // Drift-rescue arm (qa-sweep 2026-07-17): writer lanes also stamp the
      // BARE mission slug into room_id (aom:mission:backend-hardening next to
      // the canonical aom:mission:corner:backend-hardening) — match both so a
      // mission room shows its whole conversation regardless of which lane wrote it.
      const bare = raw.includes(':') ? raw.split(':').pop() : raw
      const arms = [
        `room_id.eq.${encodeURIComponent(`${clientId}:mission:${canon}`)}`,
        `room_id.eq.${encodeURIComponent(`${clientId}:mission:${bare}`)}`,
        `metadata->>mission_slug.eq.${encodeURIComponent(raw)}`,
        `metadata->>mission_slug.eq.${encodeURIComponent(canon)}`,
      ]
      return `&or=(${[...new Set(arms)].join(',')})`
    })()
    const beforeFilter = req.query.before ? `&timestamp=lt.${encodeURIComponent(req.query.before)}` : ''
    // ?attachments=1 — the room's file CROSSINGS (corner:one-corner drop 1): only
    // rows that carry a file, in any of the four shapes that exist in the wild
    // (structured metadata.attachments[], watcher metadata.attachment, the
    // attachment_url column, or the canonical "Attached file:" text announcement
    // bridge.py / supabase-listener.py write — the most common Corner-room shape).
    // Rides the SAME room filters as the thread, so a files panel reading this
    // mode cannot disagree with the chat: it IS the chat, narrowed to files.
    // Nested and(or(...)) so it composes with whichever or= arm the room mode set.
    // NOTE: there is no attachment_url COLUMN on messages (verified live 2026-07-20;
    // 42703 if referenced) — that shape only ever lives inside metadata.
    const attachmentsOnly = req.query.attachments === '1' || req.query.attachments === 'true'
    const attachmentsFilter = attachmentsOnly
      ? '&and=(or(metadata->attachment.not.is.null,metadata->attachments.not.is.null,metadata->>attachment_url.not.is.null,text.ilike.attached%20file:*,text.ilike.attached%20*%20files:*))'
      : ''
    const searchLimit = searchQuery ? 500 : limit  // search returns more results
    const url = `${SUPABASE_URL}/rest/v1/messages?select=*${agentFilter}${projectFilter}${projectOnlyFilter}${missionFilter}${beforeFilter}${attachmentsFilter}${clientFilter}${searchFilter}&order=timestamp.desc&limit=${searchLimit}`
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
    // Per-message tenant binding (the "follow-up" this comment used to promise):
    // read the row's client_id and run the same gate the room itself runs. A row
    // with no client_id predates multi-tenancy — those keep the JWT-only floor
    // rather than 400-ing on an empty tenant and breaking read receipts.
    if (!(await requireJwtOnly(req, res))) return
    {
      const rowRes = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(id)}&select=client_id&limit=1`,
        { headers: supabaseHeaders() },
      )
      const rowJson = rowRes.ok ? await rowRes.json().catch(() => null) : null
      const rowClient = Array.isArray(rowJson) ? rowJson[0]?.client_id : null
      if (rowClient) {
        const okTenant = await resolveTenant(String(rowClient), req, res)
        if (!okTenant) return
      }
    }

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
      agent, text, role = 'user', source = 'corner-dashboard', client_id, project,
      // Attachment fields (optional)
      attachment_url, file_mime_type, file_size,
      // Threading + context-menu metadata (right-click Follow-up / verify / research / crosspost)
      reply_to, metadata,
    } = req.body || {}
    // NOTE: user_id, user_name, world_id and sender_role are DELIBERATELY not
    // destructured from the body any more. They are the permanent author of the
    // row, "Patrik said X" is the de facto authorization token in this system,
    // and a client-supplied display name is privilege escalation wearing a
    // display-name costume. Identity is derived from the JWT below (RULE 1).
    if (!agent || !text) return res.status(400).json({ error: 'agent and text required' })

    // Resolve client_id: prefer body field, else default to 'aom'
    const requestedClientId = (client_id && client_id.trim())
      ? client_id.trim().toLowerCase()
      : DEFAULT_CLIENT_ID
    // Same single gate as GET — shared rooms included (owner-or-grant).
    const resolvedClientId = await resolveTenant(requestedClientId, req, res)
    if (!resolvedClientId) return

    // ---- Server-side identity (corner:identity-attribution, 2026-07-27) -----
    // verifyTenant already proved the JWT; callerIdentity turns it into a name.
    // If the name cannot be resolved we write NO user_name — an unattributed
    // message must read as unattributed, never as the founder (RULE 2).
    const identity = await callerIdentity(req).catch(() => null)
    const isHumanTurn = String(role || 'user') === 'user'
    const authorUserId = isHumanTurn ? (identity?.userId || null) : null
    const authorUserName = isHumanTurn ? (identity?.userName || null) : null
    // sender_role is a server-side classification, not a body field. Only
    // asserted when we actually verified a person — an unknown caller is left
    // unclassified rather than declared human.
    const authorSenderRole = (isHumanTurn && authorUserId) ? 'human' : null
    // world_id. In a NORMAL room the row belongs to the room's world. In a
    // SHARED room the message is in neither world's namespace, so it carries the
    // AUTHOR's own world instead of inheriting the holder world's identity —
    // otherwise a Ben message in an AOM-held shared project reads as AOM's.
    const rowWorldId = resolvedClientId.startsWith(SHARED_PREFIX)
      ? (identity?.world || null)
      : resolvedClientId

    // Single write path (corner:one-write-path R1): project resolution
    // (explicit field > [project:slug] tag, NEVER fuzzy — R-CROSSPOST-SCOPE),
    // mission_slug canonicalization, and the collaborator-gated crosspost all
    // live in api/_lib/write-message.js. This endpoint only owns auth above.
    const dbHeaders = supabaseHeaders()
    const result = await writeMessageRow({
      supabaseUrl: SUPABASE_URL,
      headers: dbHeaders,
      text,
      role,
      source,
      agent,
      clientId: resolvedClientId,  // verified above -- multi-tenant isolation
      project,
      metadata,
      userId: authorUserId,
      userName: authorUserName,
      senderRole: authorSenderRole,
      worldId: rowWorldId,
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
    const clientId = await resolveTenant(requestedClient, req, res)
    if (!clientId) return
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
