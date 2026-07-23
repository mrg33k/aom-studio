// api/_lib/write-message.js — THE single write path for chat message rows.
// corner:one-write-path R1 (2026-07-01).
//
// Every endpoint that persists a message row calls writeMessageRow. Routing
// policy lives HERE and nowhere else:
//
//   1. Project resolution: explicit `project` field > project derived from
//      the room the sender is standing in (`roomProject`) > an explicit
//      [project:slug] tag in the text. NEVER fuzzy text matching — that
//      class filed messages/files into wrong rooms (R-CROSSPOST-SCOPE,
//      2026-07-01; Karen's invoice, shared:aom debris).
//   2. Mission canonicalization: `mission` and `metadata.mission_slug` are
//      normalized to the canonical "<project>:<slug>" form on EVERY path.
//      The bare-slug drift split mission rooms into two threads (the
//      split-session amnesia bug, bridge R16) — supabase-messages never
//      canonicalized before R1; now both doors do.
//   3. Crosspost: attempted whenever a project resolved; the collaborator
//      gate inside crosspost.js decides (only projects with a real
//      project_access collaborator have shared threads). Idempotent by
//      deterministic row id, so racing reconcile-shared-rooms is safe.
//
// Tenant AUTH stays in the endpoints — they verify the caller and pass a
// trusted clientId in. This module never reads the request.

import crypto from 'crypto'
import { detectProjectTag, crossPostToProjectThread } from './crosspost.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

// Canonical room identity (corner:one-write-path R2). ONE rule, mirrored by
// scripts/backfill-room-id.py in AOM-EA — change them together:
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

export async function writeMessageRow({
  supabaseUrl,
  headers,
  // content
  text,
  role = 'user',
  source = 'corner-dashboard',
  agent = 'elon',
  clientId,          // VERIFIED tenant (or shared:<slug>) — endpoints own auth
  id,                // optional stable id (bridge dispatch reuses it)
  // routing inputs, in priority order
  project,           // explicit project field
  roomProject,       // project implied by the room the sender is in
  mission,           // mission slug (canonicalized here)
  // passthrough row fields
  metadata,
  userId,
  userName,
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
  const resolvedProject =
    (project && String(project).trim()) ||
    (roomProject && String(roomProject).trim()) ||
    detectProjectTag(messageText) ||
    null

  // --- 2. Mission canonicalization (both `mission` and metadata.mission_slug) ---
  // Guard: the JS string "undefined" is a serialization of a missing value — treat it as null.
  // Without this guard a partial mission object (slug missing) serializes to mission="undefined",
  // which was the root cause of the folder/room slug collision (DEF-14, 2026-07-06).
  const _missGuard = (v) => (v && String(v).trim() !== 'undefined' && String(v).trim() !== 'null')
    ? String(v).trim() : null
  const incomingMeta = (metadata && typeof metadata === 'object') ? metadata : null
  const rawMission =
    _missGuard(mission) ||
    (incomingMeta && _missGuard(incomingMeta.mission_slug)) ||
    null
  // Project-aware canonicalization: this row's resolvedProject is the mission's
  // true parent, so a bare slug canonicalizes within it and never re-files under
  // a foreign project that registered the same bare slug first (Bug 1).
  const canonicalMission = rawMission
    ? canonicalizeMissionSlug(rawMission, MISSION_SLUG_LOOKUP, resolvedProject)
    : null
  const mergedMeta = (canonicalMission || incomingMeta)
    ? {
        ...(incomingMeta || {}),
        ...(canonicalMission ? { mission_slug: canonicalMission } : {}),
      }
    : null

  // --- 3. Build + insert the row ---
  const payload = {
    id: id || crypto.randomUUID(),
    agent,
    role,
    text: messageText,
    source,
    client_id: clientId,
    room_id: deriveRoomId({
      clientId,
      agent,
      project: resolvedProject,
      missionSlug: canonicalMission || (mergedMeta && mergedMeta.mission_slug) || null,
    }),
    ...(resolvedProject ? { project: resolvedProject } : {}),
    ...(senderRole ? { sender_role: senderRole } : {}),
    ...(worldId ? { world_id: worldId } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(userName ? { user_name: userName } : {}),
    ...(attachmentUrl ? { attachment_url: attachmentUrl } : {}),
    ...(fileMimeType ? { file_mime_type: fileMimeType } : {}),
    ...(fileSize != null ? { file_size: fileSize } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(mergedMeta ? { metadata: mergedMeta } : {}),
  }

  const sbRes = await fetch(`${supabaseUrl}/rest/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!sbRes.ok) {
    const err = await sbRes.text().catch(() => '')
    return { ok: false, status: sbRes.status, error: err, row: payload }
  }
  const inserted = await sbRes.json().catch(() => null)
  const insertedRow = (Array.isArray(inserted) ? inserted[0] : inserted) || payload

  // --- 4. Crosspost (collaborator-gated inside crosspost.js; idempotent) ---
  if (resolvedProject) {
    await crossPostToProjectThread({
      supabaseUrl,
      headers,
      sourceMessage: insertedRow,
      project: resolvedProject,
    })
  }

  return { ok: true, status: 200, row: insertedRow, error: null }
}
