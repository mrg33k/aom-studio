// api/_lib/write-message.js: THE single write path for chat message rows.
// corner:one-write-path R1 (2026-07-01), moved to Convex in
// corner:retire-supabase R2 (2026-09-03).
//
// Every endpoint that persists a message row calls writeMessageRow. Routing
// policy lives HERE and nowhere else:
//
//   1. Project resolution: explicit `project` field > project derived from
//      the room the sender is standing in (`roomProject`) > an explicit
//      [project:slug] tag in the text. NEVER fuzzy text matching.
//   2. Mission canonicalization: `mission` and `metadata.mission_slug` are
//      normalized to the canonical "<project>:<slug>" form on EVERY path.
//   3. Crosspost: attempted whenever a project resolved; the collaborator
//      gate inside crosspost.js decides.
//   4. Authorship: recorded exactly as given, NEVER defaulted. A human-role
//      row with no verified author is stamped metadata.unattributed = true.
//   5. Project SCOPE authorization: the resolved project must be one the
//      caller's world can already reach (makeProjectScopeAuthorizer).
//   6. World stamping: the world is ALWAYS derived from the verified tenant,
//      never from the body (deriveRowWorld).
//
// WHERE THE ROW GOES NOW. messages:send on the Convex deployment, addressed by
// the same legacy room key this file always derived (`<world>:project:<slug>`,
// `<world>:mission:<slug>`, `<world>:agent:<agent>`). Convex resolves or
// creates the room, de-duplicates on clientMessageId, stamps the author from
// userId/userEmail, and schedules the agent dispatch and the phone push
// itself. The free-form metadata bag (mission_slug, unattributed, handoff,
// steps ...) is written with messages:patchMetadata right after the send.
//
// The returned `row` keeps the shape the callers read (id, room_id,
// client_id, agent, role, text, project, world_id, user_id, user_name,
// metadata, timestamp) so none of the sixteen call sites changed.
//
// Tenant AUTH and IDENTITY stay in the endpoints. writeMessageRow itself never
// reads the request and never invents an author.

import crypto from 'crypto'
import { detectProjectTag, crossPostToProjectThread } from './crosspost.js'
import { notifyDevicesForMessageRow } from './apns.js'
import { lookupProjectBySlug, verifyProjectAccess, TenantAuthError, convexQuery, convexMutation } from './verifyTenant.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)
const SHARED_PREFIX = 'shared:'

// ---------------------------------------------------------------------------
// PROJECT SCOPE AUTHORIZATION (r4): a message may only carry a project slug
// that its author's world can already reach. The decision is
// verifyProjectAccess(); two arms sit around it and neither invents
// authorization:
//   shared-room-tenant  the row is being written INTO shared:<slug> and carries
//                       that same slug; verifyTenant already ran the full
//                       owner/grant/presence check on that tenant string.
//   first-claim         no projects row AND no spoken-in room under the slug in
//                       the caller's world. Nothing is there to inject into.
//                       Trust-on-first-use, stated plainly.
// A denied scope DROPS THE TAG and writes the message unscoped. It never
// rejects the write: a false negative must degrade to "landed in the wrong
// room", never "your message vanished". Every drop is logged AND stamped on
// the row (metadata.project_scope_denied).
// ---------------------------------------------------------------------------

const FIRST_CLAIM_SLUG = /^[a-z0-9][a-z0-9._-]*$/

// True only when NO room in the caller's world carries this project slug with
// human traffic. Fail-closed: any error reports "claimed", which denies.
async function projectIsUnclaimed(slug, tenant) {
  if (!FIRST_CLAIM_SLUG.test(slug) || !tenant || tenant.startsWith(SHARED_PREFIX)) return false
  try {
    const rooms = await convexQuery('rooms:listRooms', { worldId: tenant, filter: 'all' })
    for (const r of Array.isArray(rooms) ? rooms : []) {
      const project = String(r.project || '').toLowerCase()
      if (project === slug && Number(r.humanMessageCount || 0) > 0) return false
    }
    return true
  } catch {
    return false
  }
}

// Build the scope authorizer for ONE verified request. `clientId` must be the
// tenant verifyTenant already returned, never the raw body field.
export function makeProjectScopeAuthorizer({ req, clientId }) {
  const tenant = String(clientId || '').trim().toLowerCase()
  const sharedSlug = tenant.startsWith(SHARED_PREFIX)
    ? tenant.slice(SHARED_PREFIX.length)
    : null

  return async function authorizeProjectScope(projectSlug) {
    const raw = String(projectSlug || '').trim()
    if (!raw) return { ok: true, via: 'no-scope' }
    const slug = raw.toLowerCase()

    if (sharedSlug && sharedSlug === slug) return { ok: true, via: 'shared-room-tenant' }

    // Cheap holder short-circuit: the row is landing in the world that HOLDS
    // the project.
    const held = await lookupProjectBySlug(slug)
    if (!sharedSlug && held?.ownerWorld && held.ownerWorld === tenant) {
      return { ok: true, via: 'holder-world' }
    }

    try {
      const verdict = await verifyProjectAccess(slug, req)
      return { ok: true, via: verdict?.via || 'project-access' }
    } catch (err) {
      if (!(err instanceof TenantAuthError)) throw err
      if (!held && (await projectIsUnclaimed(slug, tenant))) return { ok: true, via: 'first-claim' }
      return { ok: false, via: 'denied', reason: err.message }
    }
  }
}

// ---------------------------------------------------------------------------
// WORLD STAMPING (r5): the row's world is derived from the VERIFIED tenant.
//   via 'tenant'     a plain world tenant IS the world; a conflicting claim loses
//   via 'author'     a shared room is in no world's namespace, so the author's
//                    own world (from callerIdentity) is the answer
//   via 'unresolved' shared room, no author world supplied
// ---------------------------------------------------------------------------
export function deriveRowWorld({ clientId, worldId }) {
  const tenant = String(clientId || '').trim().toLowerCase()
  const claimed = String(worldId || '').trim().toLowerCase()
  if (!tenant) return { world: null, via: 'unresolved' }

  if (!tenant.startsWith(SHARED_PREFIX)) {
    if (claimed && claimed !== tenant) return { world: tenant, via: 'tenant', overrode: claimed }
    return { world: tenant, via: 'tenant' }
  }

  if (claimed && !claimed.startsWith(SHARED_PREFIX)) return { world: claimed, via: 'author' }
  return { world: null, via: 'unresolved', ...(claimed ? { overrode: claimed } : {}) }
}

// Canonical room identity. ONE rule, mirrored by scripts/backfill-room-id.py
// in AOM-EA, and the same grammar Convex rooms.ts parses:
//   shared rooms:   client_id itself ('shared:<slug>')
//   mission rooms:  <client_id>:mission:<canonical mission_slug>
//   project rooms:  <client_id>:project:<project>
//   agent 1:1:      <client_id>:agent:<agent>
export function deriveRoomId({ clientId, agent, project, missionSlug }) {
  if (!clientId) return null
  if (String(clientId).startsWith('shared:')) return String(clientId)
  if (missionSlug) return `${clientId}:mission:${missionSlug}`
  if (project) return `${clientId}:project:${project}`
  return `${clientId}:agent:${agent || 'elon'}`
}

// A `shared:<slug>` tenant is not a Convex world. Its room is the project room
// of the world that HOLDS the project; the mirror lands there.
async function convexRoomIdFor({ roomId, clientId, project }) {
  if (!String(roomId || '').startsWith(SHARED_PREFIX)) return roomId
  const slug = String(clientId).slice(SHARED_PREFIX.length) || project
  const held = slug ? await lookupProjectBySlug(slug) : null
  if (held?.ownerWorld) return `${held.ownerWorld}:project:${slug}`
  return null
}

export async function writeMessageRow({
  // content
  text,
  role = 'user',
  source = 'corner-dashboard',
  agent = 'elon',
  clientId,          // VERIFIED tenant (or shared:<slug>); endpoints own auth
  id,                // optional stable id (bridge dispatch reuses it)
  // routing inputs, in priority order
  project,           // explicit project field
  roomProject,       // project implied by the room the sender is in
  mission,           // mission slug (canonicalized here)
  authorizeProjectScope,
  // passthrough row fields
  metadata,
  userId,
  userName,
  userEmail,
  senderRole,
  worldId,
  attachmentUrl,
  fileMimeType,
  fileSize,
  replyTo,
}) {
  const messageText = (text || '').trim()
  if (!messageText && !attachmentUrl) {
    return { ok: false, status: 400, error: 'text or attachment required', row: null }
  }
  if (!clientId) {
    return { ok: false, status: 400, error: 'clientId required', row: null }
  }

  // --- 1. Project resolution (explicit > room > tag; never fuzzy) ---
  let resolvedProject =
    (project && String(project).trim()) ||
    (roomProject && String(roomProject).trim()) ||
    detectProjectTag(messageText) ||
    null

  // --- 1a. Project SCOPE authorization ---
  let scopeDenied = null
  if (resolvedProject) {
    if (typeof authorizeProjectScope === 'function') {
      let verdict
      try {
        verdict = await authorizeProjectScope(resolvedProject)
      } catch (e) {
        verdict = { ok: false, via: 'error', reason: String((e && e.message) || e) }
      }
      if (!verdict || !verdict.ok) {
        scopeDenied = {
          requested: resolvedProject,
          via: (verdict && verdict.via) || 'denied',
          reason: (verdict && verdict.reason) || 'not reachable from this world',
        }
        console.warn(
          `[write-message] project scope DENIED: tenant "${clientId}" may not tag project "${resolvedProject}", ${scopeDenied.reason}; writing the message unscoped`,
        )
        resolvedProject = null
      }
    } else {
      console.warn(
        `[write-message] project scope UNGATED: no authorizeProjectScope for tenant "${clientId}" project "${resolvedProject}" (source=${source})`,
      )
    }
  }

  // --- 1b. Authorship (recorded as given; never defaulted, never invented) ---
  const _author = (v) => {
    const s = (v == null ? '' : String(v)).trim();
    return s || null;
  };
  const authorId = _author(userId);
  const authorName = _author(userName);
  const authorEmail = _author(userEmail);
  const unattributed = role === 'user' && !authorId && !authorName && !authorEmail;

  // --- 1c. World stamping ---
  const stampedWorld = deriveRowWorld({ clientId, worldId });
  if (stampedWorld.overrode && stampedWorld.world) {
    console.warn(
      `[write-message] world claim "${stampedWorld.overrode}" REFUSED: the verified tenant "${clientId}" is this row's world (source=${source})`,
    );
  }
  if (stampedWorld.via === 'unresolved') {
    console.warn(
      `[write-message] world UNRESOLVED for tenant "${clientId}" (source=${source}): a shared room is in no world's namespace; pass worldId (the author's own world) at this call site.`,
    );
  }

  // --- 2. Mission canonicalization (both `mission` and metadata.mission_slug) ---
  const _missGuard = (v) => (v && String(v).trim() !== 'undefined' && String(v).trim() !== 'null')
    ? String(v).trim() : null
  const incomingMeta = (metadata && typeof metadata === 'object') ? metadata : null
  const rawMission = scopeDenied
    ? null
    : (_missGuard(mission) ||
       (incomingMeta && _missGuard(incomingMeta.mission_slug)) ||
       null)
  const canonicalMission = rawMission
    ? canonicalizeMissionSlug(rawMission, MISSION_SLUG_LOOKUP, resolvedProject)
    : null
  const baseMeta = incomingMeta ? { ...incomingMeta } : null
  if (scopeDenied && baseMeta) delete baseMeta.mission_slug
  const worldUnresolved = stampedWorld.via === 'unresolved'
  const attachment = attachmentUrl
    ? { url: attachmentUrl, name: decodeURIComponent(String(attachmentUrl).split('?')[0].split('/').pop() || 'file'), mime: fileMimeType || undefined, size: fileSize != null ? Number(fileSize) : undefined }
    : null
  const mergedMeta = (canonicalMission || baseMeta || unattributed || scopeDenied || worldUnresolved || attachment)
    ? {
        ...(baseMeta || {}),
        ...(canonicalMission ? { mission_slug: canonicalMission } : {}),
        ...(unattributed ? { unattributed: true } : {}),
        ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
        ...(worldUnresolved ? { world_unresolved: { tenant: String(clientId), source } } : {}),
        ...(attachment && !(baseMeta && (baseMeta.attachment || baseMeta.attachments)) ? { attachment } : {}),
        ...(senderRole ? { sender_role: senderRole } : {}),
        ...(resolvedProject ? { project: resolvedProject } : {}),
      }
    : null

  // --- 2b. Client-send idempotency ---
  // The phone's outbox id (metadata.client_message_id) becomes the Convex
  // clientMessageId; a replay returns the row that already landed. The old
  // 5-second same-text window is gone: Convex owns the dedup key now.
  const clientMessageId = mergedMeta && String(mergedMeta.client_message_id || '').trim()
  const dedupKey = role === 'user' && /^[a-zA-Z0-9_-]{16,128}$/.test(clientMessageId)
    ? clientMessageId
    : (id ? `legacy-${String(id).slice(0, 120)}` : undefined)

  // --- 3. Send ---
  const missionSlug = canonicalMission || (mergedMeta && mergedMeta.mission_slug) || null
  const legacyRoomId = deriveRoomId({ clientId, agent, project: resolvedProject, missionSlug })
  const convexRoomId = await convexRoomIdFor({ roomId: legacyRoomId, clientId, project: resolvedProject })
  if (!convexRoomId) {
    return { ok: false, status: 404, error: `no room for tenant "${clientId}": the project has no holder world`, row: null }
  }
  const sendText = messageText || (attachment ? `Attached file: ${attachment.name}` : '')
  const worldForSend = stampedWorld.world && !String(stampedWorld.world).startsWith(SHARED_PREFIX)
    ? stampedWorld.world
    : undefined

  let messageId
  try {
    messageId = await convexMutation('messages:send', {
      roomId: convexRoomId,
      text: sendText,
      role,
      clientId: worldForSend,
      clientMessageId: dedupKey,
      source,
      userId: authorId || undefined,
      userName: authorName || undefined,
      userEmail: authorEmail || undefined,
      agentSlug: role === 'assistant' ? (agent || 'corner') : undefined,
      metadata: mergedMeta || undefined,
      replyTo: replyTo && /^[a-z0-9]{20,}$/i.test(String(replyTo)) ? String(replyTo) : undefined,
    })
  } catch (err) {
    return { ok: false, status: 502, error: String(err?.message || err), row: null }
  }
  if (!messageId) {
    return { ok: false, status: 502, error: 'messages:send returned no id', row: null }
  }

  // The free-form bag is stored separately; a failure here must not lose the
  // message that already landed.
  if (mergedMeta) {
    try {
      await convexMutation('messages:patchMetadata', { messageId: String(messageId), patch: mergedMeta })
    } catch (err) {
      console.warn('[write-message] patchMetadata failed (ignored):', err?.message || err)
    }
  }

  const insertedRow = {
    id: String(messageId),
    agent,
    role,
    text: sendText,
    source,
    client_id: clientId,
    room_id: legacyRoomId,
    convex_room_id: convexRoomId,
    ...(resolvedProject ? { project: resolvedProject } : {}),
    ...(senderRole ? { sender_role: senderRole } : {}),
    world_id: stampedWorld.world,
    ...(authorId ? { user_id: authorId } : {}),
    ...(authorName ? { user_name: authorName } : {}),
    ...(attachmentUrl ? { attachment_url: attachmentUrl } : {}),
    ...(fileMimeType ? { file_mime_type: fileMimeType } : {}),
    ...(fileSize != null ? { file_size: fileSize } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(mergedMeta ? { metadata: mergedMeta } : {}),
    timestamp: new Date().toISOString(),
  }

  // --- 4. Push ---
  // The real push is scheduled by Convex (messages:send schedules
  // notify:onMessage). notifyDevicesForMessageRow is kept in the write path
  // so the delivery contract stays in one place; it resolves without sending.
  try {
    await notifyDevicesForMessageRow({ row: insertedRow })
  } catch (err) {
    console.warn('[write-message] push hook failed (ignored):', err?.message || err)
  }

  // --- 5. Crosspost (collaborator-gated inside crosspost.js; idempotent) ---
  if (resolvedProject) {
    await crossPostToProjectThread({
      sourceMessage: insertedRow,
      project: resolvedProject,
    })
  }

  return { ok: true, status: 200, row: insertedRow, error: null, idempotent: false }
}
