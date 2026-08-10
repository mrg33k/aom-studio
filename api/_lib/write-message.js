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
//   4. Authorship: recorded exactly as given, NEVER defaulted. A human-role
//      row with no verified author is stamped metadata.unattributed = true
//      so the gap is visible in the data instead of silently blank
//      (identity-attribution audit, 2026-07-27).
//   5. Project SCOPE authorization: the resolved project must be one the
//      caller's world can already reach. See the block comment on
//      makeProjectScopeAuthorizer below — this is the r4 root fix.
//   6. World stamping: world_id is ALWAYS written, derived from the verified
//      tenant, never left to the DB default. See the block comment on
//      deriveRowWorld below — this is the r5 root fix.
//
// Tenant AUTH and IDENTITY stay in the endpoints — they verify the caller
// server-side (verifyTenant / callerIdentity) and pass a trusted clientId +
// userId/userName in. writeMessageRow itself never reads the request, and it
// never invents an author: no `|| 'Patrik'`, no fallback name, ever. "Patrik
// said X" is an authorization signal in this system; only a verified JWT may
// produce it. (makeProjectScopeAuthorizer DOES take a req — it is a factory the
// endpoint calls, not part of the writer; the writer only ever sees the closure.)

import crypto from 'crypto'
import { detectProjectTag, crossPostToProjectThread } from './crosspost.js'
import { notifyDevicesForMessageRow } from './apns.js'
import { lookupProjectBySlug, verifyProjectAccess, TenantAuthError } from './verifyTenant.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SHARED_PREFIX = 'shared:'

function serviceHeaders() {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
}

// ---------------------------------------------------------------------------
// PROJECT SCOPE AUTHORIZATION (r4, 2026-07-27) — THE WRITE-SIDE ROOT FIX.
//
// THE RULE: a message may only carry a project slug that its author's world can
// already reach.
//
// Why this is the root and the read-side gates were not. `messages.project` has
// no foreign key and, before this, nothing on the write path checked it — so
// `messages.project` and `messages.world_id` were attacker-CONTROLLED columns.
// Those are precisely the two columns the participation floor in
// verifyTenant.js reads as PROOF OF BELONGING. The gate was self-service: mint
// the evidence in your own room, then walk through the gate with it.
//
//   - Ben POSTs a chat row into his own world tagged with an AOM-only project
//     slug. His own-world write is legitimate; the TAG is not. The row then
//     answers hasProjectPresence() for his world, and voice-context-update lets
//     him write that project's CONTEXT.md — which rule 5 makes every AOM agent
//     read fresh as canon. Durable prompt injection.
//   - Karen tags a message in her own world with an arsenal-held shared
//     project. crossPostToProjectThread mirrors it into shared:<slug> COPYING
//     her world_id, and on the next request hasSharedRoomPresence() admits her
//     to a room she was never invited to.
//
// Gate the write and both die at the source, because the evidence never exists.
// verifyTenant.js's own r3 note already ASSUMED this ("a disk-scaffolded slug
// with no row and no traffic self-heals the moment its first message lands,
// which goes through the world gate above") — the world gate checks the ROOM,
// never the project tag. This makes that assumption true.
//
// ONE model, not a second one. The decision is verifyProjectAccess() — the
// existing, exported function that already encodes holder-world, project_access
// grant, world-admin, super-admin and the participation floor. Two arms sit
// around it and neither invents authorization:
//
//   shared-room-tenant  the row is being written INTO shared:<slug> and carries
//                       that same slug. verifyTenant already ran the full
//                       owner/grant/presence check on that exact tenant string
//                       to let the caller in. Re-gating it would 403 the live
//                       arsenal-held, AOM-trafficked, ungranted shared rooms
//                       (shared:sourcing, 387 rows; shared:s3c) — the exact
//                       regression r3 was written to undo.
//   first-claim         no projects row AND not one message under the slug from
//                       any world. Nothing is there to inject into and nobody's
//                       claim is being crossed. This arm is load-bearing, not
//                       theoretical: 12 of the 86 unregistered slugs in live
//                       traffic were opened by a `user`/`corner-dashboard` send,
//                       most recently 2026-07-17. Without it, the first message
//                       in every new room silently loses its room.
//                       RESIDUAL, stated plainly: this is trust-on-first-use. A
//                       foreign world can still claim a slug that has a folder on
//                       disk but has never been spoken in. Closing it needs the
//                       registration path to always write the projects row (then
//                       this arm can be deleted), not a tighter guess here.
//
// FAILURE MODE, chosen deliberately: a denied scope DROPS THE TAG and writes the
// message unscoped. It does not reject the write. This is the most-used surface
// in the product; a false negative here must degrade to "landed in the wrong
// room", never to "your message vanished". Dropping is also fully sufficient for
// security — with no `project` column there is no presence evidence and
// crossPostToProjectThread is never called. Every drop is logged AND stamped on
// the row (metadata.project_scope_denied), so it is visible in the data, not
// just in a log nobody tails.
// ---------------------------------------------------------------------------

// Slug shapes eligible for the first-claim arm: already lowercase and slug-ish.
// PostgREST `eq` is case sensitive, so without this a foreign world could
// first-claim 'REX' — which looks unclaimed — against the live 'rex'.
const FIRST_CLAIM_SLUG = /^[a-z0-9][a-z0-9._-]*$/

// True only when NOT ONE message anywhere carries this project slug. Fail-closed:
// any error reports "claimed", which denies rather than admits.
async function projectIsUnclaimed(slug) {
  if (!FIRST_CLAIM_SLUG.test(slug) || !SUPABASE_URL || !SUPABASE_KEY) return false
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?project=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
      { headers: serviceHeaders() },
    )
    if (!r.ok) return false
    const rows = await r.json()
    return Array.isArray(rows) && rows.length === 0
  } catch {
    return false
  }
}

// Build the scope authorizer for ONE verified request. `clientId` must be the
// tenant verifyTenant already returned — never the raw body field.
// Returns an async (projectSlug) => { ok, via, reason } to hand to
// writeMessageRow as `authorizeProjectScope`. One import + one param is the
// whole integration, on purpose: chat-bridge.js and move-message.js need the
// same line (see escalations) and must not grow their own copy of this.
export function makeProjectScopeAuthorizer({ req, clientId }) {
  const tenant = String(clientId || '').trim().toLowerCase()
  const sharedSlug = tenant.startsWith(SHARED_PREFIX)
    ? tenant.slice(SHARED_PREFIX.length)
    : null

  return async function authorizeProjectScope(projectSlug) {
    const raw = String(projectSlug || '').trim()
    if (!raw) return { ok: true, via: 'no-scope' }
    const slug = raw.toLowerCase()

    // The room IS this project's shared thread — verifyTenant already ran the
    // full owner/grant/presence check on this exact tenant string.
    if (sharedSlug && sharedSlug === slug) return { ok: true, via: 'shared-room-tenant' }

    // Cheap holder short-circuit: the row is landing in the world that HOLDS
    // the project. One tiny read, and it keeps the busiest path off the extra
    // /auth/v1/user round trip verifyProjectAccess pays (the documented hot
    // spot in verifyTenant.js).
    const held = await lookupProjectBySlug(slug)
    if (!sharedSlug && held?.ownerWorld && held.ownerWorld === tenant) {
      return { ok: true, via: 'holder-world' }
    }

    // The canonical model. Everything it admits, we admit.
    try {
      const verdict = await verifyProjectAccess(slug, req)
      return { ok: true, via: verdict?.via || 'project-access' }
    } catch (err) {
      if (!(err instanceof TenantAuthError)) throw err
      if (!held && (await projectIsUnclaimed(raw))) return { ok: true, via: 'first-claim' }
      return { ok: false, via: 'denied', reason: err.message }
    }
  }
}

// ---------------------------------------------------------------------------
// WORLD STAMPING (r5, 2026-07-27) — messages.world_id must RECORD something.
//
// MEASURED over all 45,219 live message rows, which is what makes this a data
// repair and not a style preference:
//     world_id = 'aom' ................................. 45,202  (99.96%)
//     world_id = anything else .............................. 17
//     ...and all 17 are byte-identical to that row's OWN client_id.
//     world_id differing from BOTH 'aom' and client_id ........ 0
// The column has DB DEFAULT 'aom', and in 45,219 rows it has never once carried
// a value that client_id did not already carry. 6,472 rows sit in a NON-aom
// tenant while claiming world 'aom'. That is the default, printed as a fact.
//
// This column is what the r3/r4 participation floor in verifyTenant.js reads as
// PROOF OF BELONGING, so the defect is not cosmetic — it is simultaneously:
//   UNDER-ADMITTING every non-aom world about its OWN rooms (Karen's
//     karens-world rows carry 'aom', so a floor asking "has karens-world been
//     here" answers no about Karen's own conversation), and
//   OVER-ADMITTING 'aom' into every room in the system on a column default.
//
// THE WRITER'S CONTRACT:
//   1. world_id is ALWAYS on the payload. Never `...(worldId ? {…} : {})` — an
//      omitting caller silently inherits the default, and that is the whole
//      defect. chat-bridge.js (3 call sites) and move-message.js omit it today;
//      this derivation fixes every one of their non-shared rooms at the writer,
//      without waiting on their call sites.
//   2. A PLAIN world tenant IS the world, derived here from the VERIFIED tenant.
//      An explicit `worldId` that DISAGREES with it is refused and logged, not
//      honoured: the tenant survived verifyTenant, a body-supplied world did
//      not. This is what makes world_id non-forgeable on a normal room, and it
//      is a precondition for the gate ever trusting the column again.
//   3. A `shared:<slug>` tenant is in NO world's namespace, so the author's own
//      world is the only answer and the endpoint must pass it (derived from the
//      JWT via callerIdentity). When it is missing we write NULL — honest
//      absence — and NEVER 'aom'. Verified safe: the live PostgREST schema lists
//      messages.required as id/role/text/room_id only (world_id is nullable),
//      RLS on messages keys on client_id not world_id (migrations 035/029), and
//      the only reader of the column in the app (CV4 CommandTracker) already ORs
//      it with client_id arms for exactly these legacy rows.
//   4. A world string that is itself a ROOM ('shared:*') is refused. Not
//      hypothetical: 3 live rows carry world_id='shared:space-rising', so a
//      writer has already put a room name in the world column once.
//   5. Anything unresolved is stamped metadata.world_unresolved AND logged, so
//      the gap is visible in the DATA. Silence is how this survived four rounds.
// ---------------------------------------------------------------------------

// NO NAMED DEFAULT WORLD LIVES HERE, deliberately (r6, 2026-07-27). r5 briefly
// exported `DEFAULT_WORLD_STAMP = 'aom'` to label the DB default in one log
// line. Nothing read it to decide anything — but an EXPORTED constant meaning
// "the world to use when you don't have one" is a `worldId || DEFAULT_...` that
// hasn't been written yet, which is precisely the defaulting r4 and r5 exist to
// delete. The value is also about to stop being true: migrations/
// 039_messages_world_id_truth.sql §1 drops that column default. So the slug is
// not named in code at all; the measured history lives in that migration and in
// the block comment above. Every world in this file comes from deriveRowWorld —
// the verified tenant, the author, or null. There is no fourth answer.

// Resolve the world a row is actually being written from.
// Returns { world, via, overrode? } — `world` is null ONLY when it is genuinely
// unknowable, which is a shared room whose caller passed no author world.
//   via 'tenant'     derived from the verified tenant (a plain world)
//   via 'author'     the author's own world, for a shared room
//   via 'unresolved' shared room, no author world supplied — writes NULL
export function deriveRowWorld({ clientId, worldId }) {
  const tenant = String(clientId || '').trim().toLowerCase()
  const claimed = String(worldId || '').trim().toLowerCase()
  if (!tenant) return { world: null, via: 'unresolved' }

  if (!tenant.startsWith(SHARED_PREFIX)) {
    // The verified tenant IS the world. A conflicting claim loses — see 2 above.
    if (claimed && claimed !== tenant) return { world: tenant, via: 'tenant', overrode: claimed }
    return { world: tenant, via: 'tenant' }
  }

  // shared:<slug> — a room, not a world. Only the author answers this, and the
  // answer must be a world, never another room name.
  if (claimed && !claimed.startsWith(SHARED_PREFIX)) return { world: claimed, via: 'author' }
  return { world: null, via: 'unresolved', ...(claimed ? { overrode: claimed } : {}) }
}

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
  // Scope gate: async (slug) => { ok, via, reason }. Build it with
  // makeProjectScopeAuthorizer({ req, clientId }) in the endpoint, AFTER the
  // tenant gate has run. Omitting it leaves the project column caller-controlled.
  authorizeProjectScope,
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
  let resolvedProject =
    (project && String(project).trim()) ||
    (roomProject && String(roomProject).trim()) ||
    detectProjectTag(messageText) ||
    null

  // --- 1a. Project SCOPE authorization (r4 root fix) ---
  // Runs on the RESOLVED slug, so it closes both doors with one check: the
  // explicit `project` field AND an inline [project:slug] tag in the text.
  // Denied => the tag is dropped and the message still lands (see the block
  // comment on makeProjectScopeAuthorizer for why dropping, not rejecting).
  let scopeDenied = null
  if (resolvedProject) {
    if (typeof authorizeProjectScope === 'function') {
      let verdict
      try {
        verdict = await authorizeProjectScope(resolvedProject)
      } catch (e) {
        // Fail closed. An authorizer that threw decided nothing, and an
        // unchecked project tag is the whole vulnerability.
        verdict = { ok: false, via: 'error', reason: String((e && e.message) || e) }
      }
      if (!verdict || !verdict.ok) {
        scopeDenied = {
          requested: resolvedProject,
          via: (verdict && verdict.via) || 'denied',
          reason: (verdict && verdict.reason) || 'not reachable from this world',
        }
        console.warn(
          `[write-message] project scope DENIED: tenant "${clientId}" may not tag project "${resolvedProject}" — ${scopeDenied.reason}; writing the message unscoped`,
        )
        resolvedProject = null
      }
    } else {
      // No authorizer wired = the project column is whatever the caller sent.
      // Loud on purpose: this is the defect, and a silent default is how it
      // stayed invisible for three rounds.
      console.warn(
        `[write-message] project scope UNGATED: no authorizeProjectScope for tenant "${clientId}" project "${resolvedProject}" (source=${source})`,
      )
    }
  }

  // --- 1b. Authorship (recorded as given; never defaulted, never invented) ---
  // Whitespace-only is the same as absent — it used to slip through the `?:`
  // guards below and land as a blank author that read like a real one.
  const _author = (v) => {
    const s = (v == null ? '' : String(v)).trim();
    return s || null;
  };
  const authorId = _author(userId);
  const authorName = _author(userName);
  // A human-role row that arrives with no verified author is marked EXPLICITLY
  // unattributed. Half the historical record (5,006 of 10,307 `role='user'`
  // rows) has no author, and downstream code filled that hole with "Patrik" —
  // a forged authorization signal. Leaving the columns null AND stamping the
  // gap means an agent (or a query) can see "we do not know who said this"
  // instead of inferring the founder. Assistant/system rows have no human
  // author by definition, so they are not marked.
  const unattributed = role === 'user' && !authorId && !authorName;

  // --- 1c. World stamping (r5 root fix) — always derived, never defaulted ----
  // See the deriveRowWorld block comment. Both branches below are LOUD on
  // purpose: a silent default is exactly what made this invisible for four
  // rounds, and neither of these can be seen in the row alone.
  const stampedWorld = deriveRowWorld({ clientId, worldId });
  if (stampedWorld.overrode && stampedWorld.world) {
    console.warn(
      `[write-message] world_id claim "${stampedWorld.overrode}" REFUSED: the verified tenant "${clientId}" is this row's world (source=${source})`,
    );
  }
  if (stampedWorld.via === 'unresolved') {
    console.warn(
      `[write-message] world UNRESOLVED for tenant "${clientId}" (source=${source}): writing world_id NULL explicitly rather than omitting the column and letting the database fill it in. ` +
      `A shared room is in no world's namespace — pass worldId (the AUTHOR's own world, from callerIdentity) at this call site.`,
    );
  }

  // --- 2. Mission canonicalization (both `mission` and metadata.mission_slug) ---
  // Guard: the JS string "undefined" is a serialization of a missing value — treat it as null.
  // Without this guard a partial mission object (slug missing) serializes to mission="undefined",
  // which was the root cause of the folder/room slug collision (DEF-14, 2026-07-06).
  const _missGuard = (v) => (v && String(v).trim() !== 'undefined' && String(v).trim() !== 'null')
    ? String(v).trim() : null
  const incomingMeta = (metadata && typeof metadata === 'object') ? metadata : null
  // A mission always hangs off a project. If the project scope was refused we
  // cannot authorize the mission ROOM either, so the mission scope goes with it
  // — including metadata.mission_slug, which is its own routing arm in the read
  // queries and would otherwise still file the row into that mission's room.
  const rawMission = scopeDenied
    ? null
    : (_missGuard(mission) ||
       (incomingMeta && _missGuard(incomingMeta.mission_slug)) ||
       null)
  // Project-aware canonicalization: this row's resolvedProject is the mission's
  // true parent, so a bare slug canonicalizes within it and never re-files under
  // a foreign project that registered the same bare slug first (Bug 1).
  const canonicalMission = rawMission
    ? canonicalizeMissionSlug(rawMission, MISSION_SLUG_LOOKUP, resolvedProject)
    : null
  // The caller's own metadata is spread first, so a denied scope has to REMOVE
  // mission_slug from it explicitly — leaving it in place would re-file the row
  // into the mission room through the metadata arm of the read queries and undo
  // the drop above.
  const baseMeta = incomingMeta ? { ...incomingMeta } : null
  if (scopeDenied && baseMeta) delete baseMeta.mission_slug
  const worldUnresolved = stampedWorld.via === 'unresolved'
  const mergedMeta = (canonicalMission || baseMeta || unattributed || scopeDenied || worldUnresolved)
    ? {
        ...(baseMeta || {}),
        ...(canonicalMission ? { mission_slug: canonicalMission } : {}),
        ...(unattributed ? { unattributed: true } : {}),
        // Observable in the DATA, not only in a log line: a row that asked for a
        // scope it could not reach says so, which is also the detection signal
        // for someone probing this boundary.
        ...(scopeDenied ? { project_scope_denied: scopeDenied } : {}),
        // Same reasoning for the world: a NULL world_id is honest but silent, and
        // "which call site failed to pass one" is the thing you actually need.
        ...(worldUnresolved ? { world_unresolved: { tenant: String(clientId), source } } : {}),
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
    // UNCONDITIONAL (r5). Never `...(worldId ? {…} : {})`: an omitted key takes
    // the DB DEFAULT 'aom', which is a false claim of AOM participation on every
    // other world's row. An explicit null is honest absence and is accepted —
    // the column is nullable.
    world_id: stampedWorld.world,
    ...(authorId ? { user_id: authorId } : {}),
    ...(authorName ? { user_name: authorName } : {}),
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

  // --- 4. APNs fan-out (corner:native-ios Stage 0) — FIRE AND FORGET ---------
  //
  // THE ONE RULE HERE: this must never be able to fail, slow, or reject the
  // message write. A phone that is unreachable, a device_tokens lookup that
  // 500s, an APNs key that was never created — every one of those has to end as
  // a log line and nothing else. So: no await, and notifyDevicesForMessageRow
  // resolves (never rejects) on all of its own error paths, with a .catch here
  // as the second belt in case a future edit breaks that promise.
  //
  // Assistant rows only. A user's own message must not buzz their own phone, and
  // the exclusion set inside (embeds, ops-alerts, THOUGHT logs) is the same one
  // the green dot and Web Push already use.
  //
  // WHY IT IS STARTED HERE rather than after the crosspost await: a serverless
  // function can be frozen once its response is sent, so an unawaited promise is
  // racing the freeze. Kicking it off BEFORE the crosspost round trip hands it
  // that round trip as free wall-clock — in practice the push has landed before
  // the handler returns, without a single millisecond of the chat write being
  // spent waiting on Apple. If APNs delivery ever needs a hard guarantee, the
  // answer is the Supabase database webhook (the lane api/push/notify.js already
  // rides), not an await on this line.
  if (role === 'assistant') {
    try {
      notifyDevicesForMessageRow({ supabaseUrl, headers, row: insertedRow })
        .catch((e) => console.warn('[write-message] apns fan-out failed (ignored):', e?.message || e))
    } catch (e) {
      console.warn('[write-message] apns fan-out could not start (ignored):', e?.message || e)
    }
  }

  // --- 5. Crosspost (collaborator-gated inside crosspost.js; idempotent) ---
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
