// GET  /api/dashboard/messages?agent={slug}&limit=100&client=aom
// POST /api/dashboard/messages  { agent, text, role, source, client_id, project, metadata }
//
// The dashboard chat proxy, on Convex (corner:retire-supabase R2, 2026-09-03).
// Was /api/dashboard/supabase-messages; that path now re-exports this handler
// until every caller is moved. Reads go through messages:getThread /
// messages:list / messages:listSince, writes through messages:send, and the
// room is resolved by the same legacy key grammar Convex mints
// (<world>:agent:<slug>, <world>:project:<slug>, <world>:mission:<project>:<slug>).
//
// The response keeps the row shape the dashboard already reads (id, agent,
// role, text, source, timestamp, project, metadata, user_name, attachments,
// blocks, reactions), so no caller has to change for the backend move.
//
// Multi-tenant: every read and write is scoped by the verified tenant.
// A `shared:<slug>` tenant is a project room held by another world; it is
// resolved to that world's project room through the projects registry.

import { verifyTenant, TenantAuthError, extractJwt, callerIdentity } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)
const SHARED_PREFIX = 'shared:'
const LOCAL_CODEX_MODEL = 'codex-local'
const RUNNER_ONLINE_MS = 75_000

async function requireJwtOnly(req, res) {
  const jwt = extractJwt(req)
  if (!jwt) { res.status(401).json({ error: 'jwt required' }); return false }
  return true
}

// Resolve the tenant for a request and 4xx on the response if it fails.
// Returns the verified result, or null when a response was already sent.
async function resolveTenant(requestedClient, req, res) {
  try {
    return await verifyTenant(requestedClient, req)
  } catch (err) {
    if (err instanceof TenantAuthError) {
      res.status(err.status).json({ error: err.message })
      return null
    }
    throw err
  }
}

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null)
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// The world whose rooms a tenant string names. A plain world is itself; a
// shared room belongs to the world that holds the project.
async function worldForTenant(tenant) {
  if (!tenant.startsWith(SHARED_PREFIX)) return { world: tenant, sharedProject: null }
  const slug = tenant.slice(SHARED_PREFIX.length)
  const project = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null)
  return { world: project?.ownerWorld || tenant, sharedProject: slug }
}

// Legacy room key for a write. mission > project > agent, same precedence the
// old writer used.
function roomKey({ world, agent, project, missionSlug }) {
  if (missionSlug) {
    const canon = String(missionSlug)
    return canon.includes(':') ? `${world}:mission:${canon}` : `${world}:mission:${project ? project + ':' : ''}${canon}`
  }
  if (project) return `${world}:project:${project}`
  return `${world}:agent:${agent || 'elon'}`
}

// One Convex message row in the shape the dashboard has always read.
export function toLegacyRow(m, { world, room } = {}) {
  const meta = (m.metadata && typeof m.metadata === 'object') ? { ...m.metadata } : {}
  if (Array.isArray(m.attachments) && m.attachments.length && !meta.attachments && !meta.attachment) {
    meta.attachments = m.attachments.map((a) => ({
      url: a.url || null, name: a.name || null, mime: a.mime || null, size: a.size ?? null,
      sha256: a.sha256 || null, source_path: a.sourcePath || null,
    }))
  }
  const legacyRoomId = room?.legacyRoomId || m.legacyRoomId || null
  const parts = legacyRoomId ? legacyRoomId.split(':') : []
  const roomAgent = room?.specialist || (parts[1] === 'agent' ? parts.slice(2).join(':') : null)
  if (room?.kind === 'mission' && !meta.mission_slug) {
    const missionLeaf = parts[1] === 'mission' ? parts.slice(2).join(':') : slugify(room.title)
    if (missionLeaf) meta.mission_slug = missionLeaf
  }
  const role = m.role || (m.agentSlug ? 'assistant' : 'user')
  return {
    id: String(m._id),
    legacy_id: m.legacyId || null,
    agent: m.agentSlug || roomAgent || null,
    role,
    text: m.text,
    source: m.source || null,
    timestamp: iso(m.createdAt),
    created_at: iso(m.createdAt),
    client_id: world || null,
    world_id: world || null,
    project: room?.project ?? m.project ?? meta.project_slug ?? null,
    room_id: legacyRoomId,
    user_id: m.userId ? String(m.userId) : null,
    user_name: m.userName || null,
    reply_to: m.replyTo ? String(m.replyTo) : null,
    status: m.status || 'sent',
    metadata: meta,
    attachments: m.attachments || [],
    blocks: m.blocks ?? null,
    reactions: m.reactions || [],
    mentions: m.mentions || [],
  }
}

// May this tenant tag a message with this project? Convex-native version of
// the old scope authorizer: the holder world or a project_access grant passes,
// a world admin passes, and a slug nobody has registered is a first claim
// (the message still lands; only the tag is at stake).
async function authorizeProjectScope({ tenant, isAdmin, projectSlug }) {
  const slug = String(projectSlug || '').trim().toLowerCase()
  if (!slug) return { ok: true, via: 'no-scope' }
  if (tenant.startsWith(SHARED_PREFIX) && tenant.slice(SHARED_PREFIX.length) === slug) return { ok: true, via: 'shared-room-tenant' }
  if (isAdmin) return { ok: true, via: 'world-admin' }
  const access = await convexQuery('projects:hasAccess', { slug, worldId: tenant }).catch(() => null)
  if (access?.ok) return { ok: true, via: access.role === 'owner' ? 'holder-world' : 'project-access-grant' }
  const registered = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null)
  if (!registered) return { ok: true, via: 'first-claim' }
  return { ok: false, via: 'denied', reason: `project "${slug}" belongs to world "${registered.ownerWorld}"` }
}

// Corner Runner routing (was api/_lib/runnerJobs.js on Supabase). The room's
// saved model preference decides whether a turn runs on the person's own Mac.
function runnerPreferenceKey({ agent, project }) {
  return project ? `project:${project}` : String(agent || '')
}
function resolveRunnerPreference(models, key) {
  const own = String(models?.[key] || '').trim().toLowerCase()
  const workspace = String(models?._all || '').trim().toLowerCase()
  if (own && own !== 'default') return own
  if (workspace && workspace !== 'default') return workspace
  return 'default'
}
async function resolveRunnerRoute({ world, userId, agent, project }) {
  if (!world || !userId) return { local: false, device: null }
  let models = {}
  try {
    const raw = await convexQuery('preferences:get', { userId, worldId: world, key: 'agent_models' })
    models = typeof raw === 'string' ? (JSON.parse(raw) || {}) : (raw || {})
  } catch {
    return { local: null, device: null, error: 'preference_unavailable' }
  }
  const preference = resolveRunnerPreference(models, runnerPreferenceKey({ agent, project }))
  if (![LOCAL_CODEX_MODEL, 'default'].includes(preference)) return { local: false, device: null }
  let devices = []
  try {
    devices = await convexQuery('runner:listDevices', { worldId: world })
  } catch {
    return preference === LOCAL_CODEX_MODEL
      ? { local: true, device: null, error: 'device_lookup_failed' }
      : { local: false, device: null, fallbackDevice: null }
  }
  const mine = (Array.isArray(devices) ? devices : [])
    .filter((d) => String(d.userId || '') === String(userId))
    .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
  const device = mine[0] ? { id: String(mine[0]._id), name: mine[0].name || 'Corner Runner', lastSeenAt: mine[0].lastSeenAt } : null
  if (preference === LOCAL_CODEX_MODEL) return { local: true, device }
  const online = device && Date.now() - (device.lastSeenAt || 0) < RUNNER_ONLINE_MS
  return { local: false, device: null, fallbackDevice: online ? device : null }
}

// Every room that answers to this thread request, plus the "family" fetch.
async function readThread({ world, query, limit }) {
  const { agent, project, mission_slug: missionSlug, all, search, before, since, attachments, project_only: projectOnly } = query
  const isAll = all === 'true' || all === '1'
  const searchQuery = search ? String(search).trim() : ''
  const beforeMs = before ? Date.parse(before) : NaN
  const sinceMs = since ? Date.parse(since) : NaN

  // Search or the all-rooms aggregate: one world-wide read, filtered here.
  if (searchQuery || isAll) {
    const rows = await convexQuery('messages:listSince', {
      worldSlug: world,
      since: Number.isFinite(sinceMs) ? sinceMs + 1 : 0,
      until: Number.isFinite(beforeMs) ? beforeMs - 1 : undefined,
      limit: searchQuery ? 2000 : limit,
    })
    let out = Array.isArray(rows) ? rows : []
    if (searchQuery) {
      const needle = searchQuery.toLowerCase()
      out = out.filter((r) => String(r.text || '').toLowerCase().includes(needle))
      if (agent) out = out.filter((r) => r.agentSlug === agent || r.legacyRoomId === `${world}:agent:${agent}`)
      out = out.slice(0, 500)
    }
    return out.map((r) => toLegacyRow(r, { world, room: { legacyRoomId: r.legacyRoomId, project: r.project, kind: r.roomKind, title: r.roomTitle } }))
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  }

  // Room mode: resolve the canonical room doc, then read its family thread.
  const rooms = []
  if (missionSlug) {
    const raw = String(missionSlug)
    const canon = canonicalizeMissionSlug(raw, MISSION_SLUG_LOOKUP, project) || raw
    const bare = (canon.includes(':') ? canon.split(':').pop() : canon)
    const parent = canon.includes(':') ? canon.split(':')[0] : (project || '')
    const room = await convexQuery('rooms:resolveCanonical', { worldSlug: world, kind: 'mission', key: bare, project: parent || undefined })
    if (room) rooms.push(room)
  } else if (project) {
    const room = await convexQuery('rooms:resolveCanonical', { worldSlug: world, kind: 'project', key: String(project) })
    if (room) rooms.push(room)
    const wantMissions = !(projectOnly === '1' || projectOnly === 'true')
    if (wantMissions) {
      const all = await convexQuery('rooms:listRooms', { worldId: world, filter: 'mission' })
      for (const r of Array.isArray(all) ? all : []) {
        if (String(r.project || '').toLowerCase() === String(project).toLowerCase()) rooms.push(r)
      }
    }
  } else if (agent) {
    const room = await convexQuery('rooms:resolveCanonical', { worldSlug: world, kind: 'agent', key: String(agent) })
    if (room) rooms.push(room)
  }
  if (!rooms.length) return []

  const attachmentsOnly = attachments === '1' || attachments === 'true'
  const perRoom = await Promise.all(rooms.map(async (room) => {
    const roomId = String(room._id)
    if (attachmentsOnly) {
      const r = await convexQuery('messages:listWithAttachments', { roomId, limit })
      return (r?.messages || []).map((m) => toLegacyRow(m, { world, room }))
    }
    // The thread read is bounded at 400 rows; `before` pages inside that window.
    const fetchLimit = Number.isFinite(beforeMs) ? 400 : limit
    const rows = await convexQuery('messages:getThread', { roomId, limit: fetchLimit })
    return (Array.isArray(rows) ? rows : []).map((m) => toLegacyRow(m, { world, room }))
  }))
  let merged = perRoom.flat()
  if (Number.isFinite(beforeMs)) merged = merged.filter((m) => Date.parse(m.timestamp) < beforeMs)
  if (Number.isFinite(sinceMs)) merged = merged.filter((m) => Date.parse(m.timestamp) > sinceMs)
  merged.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  return merged.slice(-limit)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // ---- GET: load chat history for a room ---------------------------------
  if (req.method === 'GET') {
    const { agent, all } = req.query
    if (!agent && !all && !req.query.project && !req.query.mission_slug) {
      return res.status(400).json({ error: 'agent, project, or mission_slug required' })
    }
    const requestedRaw = req.query.client && String(req.query.client).trim()
    if (!requestedRaw) return res.status(401).json({ error: 'Missing client' })
    const verified = await resolveTenant(requestedRaw.toLowerCase(), req, res)
    if (!verified) return
    const { world } = await worldForTenant(verified.tenant)
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 100, 400))
    try {
      const messages = await readThread({ world, query: req.query, limit })
      return res.status(200).json({ messages })
    } catch (err) {
      return res.status(502).json({ error: String(err?.message || err) })
    }
  }

  // ---- PATCH: read receipts ------------------------------------------------
  // Read state is authored on the server now (reads:markRead, called by the
  // client with its room). A per-message status patch has nothing left to
  // write, so this stays as a JWT-gated no-op for older clients.
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {}
    if (!id || !status) return res.status(400).json({ error: 'id and status required' })
    const allowed = ['sent', 'delivered', 'read', 'composing']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' })
    if (!(await requireJwtOnly(req, res))) return
    return res.status(200).json({ ok: true, note: 'read state lives in Convex reads:markRead' })
  }

  // ---- POST: write a new message (user send from dashboard) ---------------
  if (req.method === 'POST') {
    const {
      agent, text, role = 'user', source = 'corner-dashboard', client_id, project,
      attachment_url, file_mime_type, file_size,
      reply_to, metadata,
    } = req.body || {}
    // user_id, user_name and world are never read from the body. Identity
    // comes from the verified session below.
    if (!agent || !text) return res.status(400).json({ error: 'agent and text required' })

    const bodyClientRaw = client_id && String(client_id).trim()
    if (!bodyClientRaw) return res.status(401).json({ error: 'Missing client' })
    const verified = await resolveTenant(bodyClientRaw.toLowerCase(), req, res)
    if (!verified) return
    const tenant = verified.tenant
    const { world, sharedProject } = await worldForTenant(tenant)

    const identity = await callerIdentity(req).catch(() => null)
    const isHumanTurn = String(role || 'user') === 'user'
    const authorUserId = isHumanTurn ? (identity?.userId || verified.userId || null) : null
    const authorUserName = isHumanTurn ? (identity?.userName || verified.userName || null) : null
    const authorEmail = isHumanTurn ? (identity?.email || verified.email || null) : null

    // Project scope: the explicit field, else the room the sender stands in
    // for a shared tenant. Denied tags are dropped and stamped, never refused.
    let resolvedProject = (project && String(project).trim().toLowerCase()) || sharedProject || null
    let scopeDenied = null
    if (resolvedProject) {
      const verdict = await authorizeProjectScope({ tenant, isAdmin: !!verified.isAdmin, projectSlug: resolvedProject })
      if (!verdict.ok) {
        scopeDenied = { requested: resolvedProject, via: verdict.via, reason: verdict.reason }
        console.warn(`[messages] project scope DENIED: tenant "${tenant}" may not tag project "${resolvedProject}"; ${verdict.reason}`)
        resolvedProject = null
      }
    }

    // Corner Runner (local Codex) routing. A per-message model override still
    // outranks the room preference.
    const explicitModel = String(metadata?.model || '').trim().toLowerCase()
    let runnerRoute = { local: false, device: null }
    if (isHumanTurn && authorUserId && (!explicitModel || explicitModel === LOCAL_CODEX_MODEL)) {
      runnerRoute = await resolveRunnerRoute({ world, userId: authorUserId, agent, project: resolvedProject })
        .catch(() => ({ local: null, device: null, error: 'route_lookup_failed' }))
    }
    if (runnerRoute.local === null) {
      return res.status(503).json({ error: 'Could not verify this room\'s model safely. Nothing was sent; try again.', code: 'runner_route_unavailable' })
    }
    if (runnerRoute.local && !runnerRoute.device) {
      if (runnerRoute.error) {
        return res.status(503).json({ error: 'Could not verify your Corner Runner safely. Nothing was sent; try again.', code: 'runner_device_unavailable' })
      }
      return res.status(409).json({ error: 'Connect Corner Runner on your computer before using Codex on this computer.', code: 'runner_not_paired' })
    }

    // Only the server stamps runner routing onto a row.
    const sanitizedMetadata = metadata && typeof metadata === 'object' ? { ...metadata } : {}
    for (const k of ['runner_route', 'runner_device_id', 'runner_device_name', 'runner_fallback', 'runner_fallback_device_id', 'runner_fallback_device_name']) delete sanitizedMetadata[k]
    const trustedMetadata = runnerRoute.local
      ? { ...sanitizedMetadata, runner_route: 'local', runner_device_id: runnerRoute.device.id, runner_device_name: runnerRoute.device.name }
      : runnerRoute.fallbackDevice
        ? { ...sanitizedMetadata, runner_fallback: LOCAL_CODEX_MODEL, runner_fallback_device_id: runnerRoute.fallbackDevice.id, runner_fallback_device_name: runnerRoute.fallbackDevice.name }
        : sanitizedMetadata

    // Mission canonicalization, same rule the old writer applied on every path.
    const guard = (v) => (v && String(v).trim() !== 'undefined' && String(v).trim() !== 'null') ? String(v).trim() : null
    const rawMission = scopeDenied ? null : guard(trustedMetadata.mission_slug)
    const canonicalMission = rawMission ? (canonicalizeMissionSlug(rawMission, MISSION_SLUG_LOOKUP, resolvedProject) || rawMission) : null
    if (scopeDenied) delete trustedMetadata.mission_slug
    if (canonicalMission) trustedMetadata.mission_slug = canonicalMission
    if (scopeDenied) trustedMetadata.project_scope_denied = scopeDenied
    if (isHumanTurn && !authorUserId && !authorUserName) trustedMetadata.unattributed = true
    if (attachment_url && !trustedMetadata.attachment && !trustedMetadata.attachments) {
      trustedMetadata.attachment = { url: attachment_url, mime: file_mime_type || null, size: file_size ?? null }
    }

    const roomId = roomKey({ world, agent, project: resolvedProject, missionSlug: canonicalMission })
    const clientMessageId = String(trustedMetadata.client_message_id || '').trim()
    const messageText = String(text).trim()
    let messageId
    try {
      messageId = await convexMutation('messages:send', {
        roomId,
        text: messageText,
        role: String(role),
        source: String(source),
        clientId: world,
        clientMessageId: /^[a-zA-Z0-9_-]{16,128}$/.test(clientMessageId) ? clientMessageId : undefined,
        userId: authorUserId ? String(authorUserId) : undefined,
        userName: authorUserName || undefined,
        userEmail: authorEmail || undefined,
        agentSlug: isHumanTurn ? undefined : String(agent),
        metadata: trustedMetadata,
        // replyTo must be a Convex message id. A legacy uuid would fail
        // validation and lose the whole send, so it is dropped instead.
        replyTo: reply_to && /^[a-z0-9]{20,}$/i.test(String(reply_to)) ? String(reply_to) : undefined,
      })
    } catch (err) {
      return res.status(502).json({ error: `write failed: ${String(err?.message || err)}` })
    }

    // messages:send keeps only the attachments out of the metadata bag. The
    // rest (mission_slug, model, runner routing, client_message_id) is what
    // the dashboard and the dispatcher read back, so it is a second write.
    // A failure here must not lose the message that already landed.
    if (Object.keys(trustedMetadata).length) {
      await convexMutation('messages:patchMetadata', { messageId: String(messageId), patch: trustedMetadata })
        .catch((err) => console.warn('[messages] patchMetadata failed (ignored):', err?.message || err))
    }

    const row = {
      id: String(messageId),
      agent: String(agent),
      role: String(role),
      text: messageText,
      source: String(source),
      client_id: tenant,
      world_id: world,
      room_id: roomId,
      project: resolvedProject,
      user_id: authorUserId ? String(authorUserId) : null,
      user_name: authorUserName,
      reply_to: reply_to || null,
      timestamp: new Date().toISOString(),
      metadata: trustedMetadata,
    }

    if (runnerRoute.local) {
      try {
        const jobId = await convexMutation('runner:enqueueJob', { deviceId: runnerRoute.device.id, message: messageText })
        return res.status(200).json({ ok: true, message: row, runner: { queued: true, jobId: jobId ? String(jobId) : null }, turn_receipt: null })
      } catch {
        const failedMeta = { runner_failed: true, runner_device_id: runnerRoute.device.id }
        await convexMutation('messages:send', {
          roomId, role: 'assistant', source: 'corner-runner', agentSlug: String(agent), clientId: world,
          text: `Corner Runner could not queue that turn on ${runnerRoute.device.name}. Try reconnecting the runner, then send it again.`,
          metadata: failedMeta,
          replyTo: String(messageId),
        })
          .then((id) => (id ? convexMutation('messages:patchMetadata', { messageId: String(id), patch: failedMeta }) : null))
          .catch(() => null)
        return res.status(200).json({ ok: true, message: row, runner: { queued: false, error: 'queue_failed' }, turn_receipt: null })
      }
    }
    // Turn receipts (room_turn_receipts) were a Supabase table. Convex tracks
    // the turn itself in `turns`; nothing to mint here.
    return res.status(200).json({ ok: true, message: row, turn_receipt: null })
  }

  // ---- DELETE: fresh start for a non-aom world ---------------------------------
  if (req.method === 'DELETE') {
    const requestedClient = (req.query.client && req.query.client.trim()) ? req.query.client.trim().toLowerCase() : null
    if (!requestedClient || requestedClient === 'aom') {
      return res.status(400).json({ error: 'client required and must not be aom' })
    }
    const verified = await resolveTenant(requestedClient, req, res)
    if (!verified) return
    try {
      const rooms = await convexQuery('rooms:listRooms', { worldId: verified.tenant, filter: 'all' })
      let deleted = 0
      for (const room of Array.isArray(rooms) ? rooms : []) {
        await convexMutation('cleanup:deleteRoom', { roomId: String(room._id) })
        deleted += 1
      }
      return res.status(200).json({ ok: true, rooms_deleted: deleted })
    } catch (err) {
      return res.status(502).json({ error: String(err?.message || err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
