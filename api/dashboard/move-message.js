// POST /api/dashboard/move-message
//
// Move a just-sent front-door message out of the room the router picked and into the room
// the user actually meant, leaving no trace in the wrong one.
//
// WHY (corner:front-door R8, 2026-07-25). The router auto-opens a room when it claims
// confidence >= 0.85. Measured against 74 of Patrik's real messages it reports ~0.9 almost
// regardless of how thin its reasoning is, so that bar gates very little and roughly one in
// five sends still opens the wrong room. Calibrating the number further was tried and barely
// moved. The structural answer is not a better guess: it is showing the user where the
// message went and letting them correct it in one tap.
//
// corner:retire-supabase (2026-09-03). The message row lives on Convex, so a move IS a
// move now: messages:move re-files the row into the destination room (same id, same
// author, same time) instead of the old copy-then-delete against Supabase. The reply the
// wrong room's agent drew is re-filed with it, because Convex has no row delete for a
// client and a reply is honest under the question it answered. Provenance of the move is
// stamped on the row with messages:patchMetadata.
//
// Body:
//   { client_id, message_id, text, to: { project?, mission_slug?, agent? }, interaction_mode? }
//
// Moves message_id, plus any ASSISTANT rows in that same room that landed after it (the
// agent's reply to a message that is being retracted, which would otherwise be orphaned).
// That sweep is bounded: only rows between the moved message and now, only when the move
// happens within MOVE_WINDOW_MS, and only in that one room, so a slow reply to some
// earlier message in a busy room is never collected.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' };
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js';

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry);
const SHARED_PREFIX = 'shared:';

// A move is a correction of something the user JUST sent. Past this, the reply sweep is
// unsafe (the conversation has moved on) so the original is left where it is.
const MOVE_WINDOW_MS = 15 * 60 * 1000;
// How far back the original is looked for. A move outside the correction window still
// happens (without the reply sweep); older than this it is not a correction at all.
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

// The world this request is scoped to. An explicit value wins; otherwise the world is
// resolved from the VERIFIED JWT, never a hardcoded default.
//
// No session -> 401. A verified session whose account carries no world -> an explicit 400
// naming the fix, never a silent fallback into another world.
async function scopeWorld(explicit, req) {
  const given = explicit == null ? '' : String(explicit).trim();
  if (given) return given.toLowerCase();
  const who = await callerIdentity(req);
  if (!who) throw new TenantAuthError('jwt required', 401);
  if (!who.world) throw new TenantAuthError('this account is not in a world; send an explicit world', 400);
  return who.world;
}

// Room key grammar, the same one every Convex writer uses:
//   <world>:mission:<project>:<leaf> | <world>:project:<slug> | <world>:agent:<slug>
function destinationFor(world, to) {
  if (to.mission_slug) {
    const raw = String(to.mission_slug);
    const project = String(to.project || raw.split(':')[0]).trim();
    const canonical = canonicalizeMissionSlug(raw, MISSION_SLUG_LOOKUP, project);
    const leaf = canonical.includes(':') ? canonical.slice(canonical.indexOf(':') + 1) : canonical;
    return { roomId: `${world}:mission:${project}:${leaf}`, project, mission_slug: canonical, agent: null };
  }
  if (to.project) {
    const project = String(to.project).trim();
    return { roomId: `${world}:project:${project}`, project, mission_slug: null, agent: null };
  }
  const agent = String(to.agent || 'corner').trim();
  return { roomId: `${world}:agent:${agent}`, project: null, mission_slug: null, agent };
}

// May this world file a message under this project? The holder world and any world with
// a sharing grant may; an unregistered slug (no registry row) crosses nobody's claim.
async function projectReachable(slug, world) {
  const held = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null);
  if (!held) return { ok: true, via: 'unregistered' };
  if (held.ownerWorld && String(held.ownerWorld).toLowerCase() === world) return { ok: true, via: 'holder-world' };
  const access = await convexQuery('projects:hasAccess', { slug, worldId: world }).catch(() => null);
  if (access && access.ok) return { ok: true, via: 'grant' };
  return { ok: false, reason: `world "${world}" cannot reach project "${slug}"` };
}

// The rows in `roomId` written after `afterMs` by something other than a person: the
// replies the moved question drew. A row that names its question (replyTo) must name
// this one; an unlinked assistant row counts only inside the correction window.
async function repliesAfter(roomId, afterMs, messageId, withinWindow) {
  const rows = await convexQuery('messages:list', { roomId, limit: 100 }).catch(() => []);
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => Number(r.createdAt) > afterMs && r.role !== 'user')
    .filter((r) => (r.replyTo ? String(r.replyTo) === String(messageId) : withinWindow))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 20);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body || {};
  let clientId;
  let verified;
  try {
    const requested = await scopeWorld(body.client_id, req);
    verified = await verifyTenant(requested, req);
    clientId = verified.tenant;
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  // A shared room is not a world; rooms are keyed by the author's own world.
  const world = clientId.startsWith(SHARED_PREFIX) ? (verified.world || null) : clientId;
  if (!world) return res.status(400).json({ error: 'this account is not in a world' });

  // Sweep-only pass. The reply sweep below can only collect what EXISTS when the move runs,
  // and the agent in the wrong room is typically mid-reply at that moment, so its answer
  // lands a second later and survives, leaving an orphan reply under no question. (Found by
  // the Front Door room auditing its own transcript after a live test, 2026-07-25.) The
  // client fires this second pass a little later to collect exactly that straggler.
  if (body.sweep_for) {
    const s = body.sweep_for;
    const after = String(s.after || '').trim();
    if (!after) return res.status(400).json({ error: 'sweep_for.after required' });
    const afterMs = new Date(after).getTime();
    if (!Number.isFinite(afterMs) || Date.now() - afterMs > MOVE_WINDOW_MS) {
      return res.status(200).json({ ok: true, removed_count: 0, reason: 'outside the correction window' });
    }
    const fromRoom = s.from_room || destinationFor(world, { project: s.project, mission_slug: s.mission_slug, agent: s.agent }).roomId;
    const toRoom = s.to_room;
    if (!toRoom) return res.status(200).json({ ok: true, removed_count: 0, reason: 'no destination room to sweep into' });
    if (!String(fromRoom).startsWith(`${world}:`) || !String(toRoom).startsWith(`${world}:`)) {
      return res.status(403).json({ error: 'rooms outside your world' });
    }
    const stragglers = await repliesAfter(fromRoom, afterMs, s.message_id || '', true);
    let n = 0;
    for (const r of stragglers) {
      // eslint-disable-next-line no-await-in-loop -- a handful of rows at most.
      try { await convexMutation('messages:move', { messageId: r._id, roomId: toRoom }); n += 1; } catch { /* leave it */ }
    }
    return res.status(200).json({ ok: true, removed_count: n, sweep_only: true });
  }

  const messageId = String(body.message_id || '').trim();
  const to = body.to || {};
  const text = String(body.text || '').trim();
  if (!messageId) return res.status(400).json({ error: 'message_id required' });
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!to.project && !to.mission_slug && !to.agent) {
    return res.status(400).json({ error: 'to.project, to.mission_slug or to.agent required' });
  }

  // Read the original first: it proves the row belongs to this world, and its room +
  // time are what bound the reply sweep. Recent world rows are scanned because a message
  // is addressed by id alone here and the room it landed in is exactly what is unknown.
  const recent = await convexQuery('messages:listSince', {
    worldSlug: world,
    since: Date.now() - LOOKBACK_MS,
    limit: 2000,
  }).catch(() => []);
  const original = (Array.isArray(recent) ? recent : []).find((r) => String(r._id) === messageId) || null;
  if (!original) return res.status(404).json({ error: 'message not found' });
  if ((original.role || 'user') !== 'user') return res.status(400).json({ error: 'only a message you sent can be moved' });
  if (original.userId && verified.userId && String(original.userId) !== String(verified.userId) && !verified.isAdmin) {
    return res.status(403).json({ error: 'not your message' });
  }

  const sentAt = Number(original.createdAt) || 0;
  const withinWindow = sentAt > 0 && (Date.now() - sentAt) < MOVE_WINDOW_MS;
  const fromRoom = original.legacyRoomId || String(original.roomId);

  // `to.project` / `to.mission_slug` are DESTINATION slugs typed by the caller. Nothing
  // above validates them, and the tenant gate only proved which world the caller may act
  // in. A refused destination drops the scope and the message lands in the agent room. It
  // is never rejected, so a mis-typed slug can't strand the text this endpoint is moving.
  let dest = destinationFor(world, to);
  if (dest.project) {
    const verdict = await projectReachable(dest.project, world);
    if (!verdict.ok) {
      console.warn(`[move-message] project scope DENIED: world "${world}" project "${dest.project}": ${verdict.reason}; landing in the agent room`);
      dest = destinationFor(world, { agent: to.agent || 'corner' });
    }
  }

  // 1. Re-file the message. Same row, new room: if this fails the user still has their
  //    message where it was, which is recoverable.
  try {
    await convexMutation('messages:move', { messageId, roomId: dest.roomId });
  } catch (err) {
    return res.status(500).json({ error: `could not move to the new room: ${String(err.message || err).slice(0, 160)}` });
  }
  const mode = body.interaction_mode === 'plan' ? 'plan' : 'work';
  try {
    await convexMutation('messages:patchMetadata', {
      messageId,
      patch: {
        interaction_mode: mode,
        ...(dest.mission_slug ? { mission_slug: dest.mission_slug } : {}),
        // Provenance: this message was re-homed by the user after the router guessed wrong.
        // Keeps the routing miss auditable instead of silently disappearing.
        moved_from: { room: fromRoom, project: original.project || null, mission_slug: original?.metadata?.mission_slug || null },
        moved_at: new Date().toISOString(),
      },
    });
  } catch { /* the move landed; provenance is best effort */ }

  // 2. Bring the reply it drew along, out of the room it should never have been in.
  //    Scoped to that exact room and that exact time slice.
  const moved = [messageId];
  if (withinWindow) {
    const replies = await repliesAfter(fromRoom, sentAt, messageId, true);
    for (const r of replies) {
      // eslint-disable-next-line no-await-in-loop -- a handful of rows at most.
      try { await convexMutation('messages:move', { messageId: r._id, roomId: dest.roomId }); moved.push(String(r._id)); } catch { /* leave it */ }
    }
  }

  return res.status(200).json({
    ok: true,
    message: { _id: messageId, id: messageId, roomId: dest.roomId, room_id: dest.roomId, project: dest.project, mission_slug: dest.mission_slug, text },
    removed_count: moved.length,
    swept_replies: withinWindow,
    // Everything the client needs to run the follow-up sweep for a reply that was still
    // being written when this pass ran.
    sweep_for: {
      from_room: fromRoom,
      to_room: dest.roomId,
      message_id: messageId,
      project: original.project || null,
      mission_slug: original?.metadata?.mission_slug || null,
      agent: null,
      after: new Date(sentAt || Date.now()).toISOString(),
    },
  });
}
