// POST /api/dashboard/route-accept   { client_id, message_id[, room_id] }
//
// Record that the user accepted the room the front-door router chose for them.
//
// Why (corner:front-door R11): a misroute used to write itself into the wrong
// room's description. An auto-routed message shapes nothing until it has been
// accepted, and this endpoint is that durable accept. Two callers, both real
// user actions: "Got it" on the routed-here strip, and sending another message
// in the room while the strip is live.
//
// Backend: Convex messages:patchMetadata (corner:retire-supabase R2,
// 2026-09-03). The row is read first so the merge preserves everything else
// under metadata (mission_slug, interaction_mode).

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

// The world this request is scoped to. An explicit value wins; otherwise the
// world is resolved from the verified JWT, never a hardcoded default.
async function scopeWorld(explicit, req) {
  const given = explicit == null ? '' : String(explicit).trim();
  if (given) return given.toLowerCase();
  const who = await callerIdentity(req);
  if (!who) throw new TenantAuthError('jwt required', 401);
  if (!who.world) throw new TenantAuthError('this account is not in a world; send an explicit world', 400);
  return who.world;
}

// Find the message. With a room id it is one indexed read; without one the
// recent window of the world is scanned (routed messages are minutes old).
async function findMessage({ world, messageId, roomId }) {
  if (roomId) {
    const direct = await convexQuery('messages:getMessage', { roomId: String(roomId), messageId }).catch(() => null);
    if (direct) return direct;
  }
  for (const windowMs of [24 * 3600 * 1000, 7 * 24 * 3600 * 1000]) {
    const rows = await convexQuery('messages:listSince', { worldSlug: world, since: Date.now() - windowMs, role: 'user', limit: 2000 }).catch(() => []);
    const hit = (Array.isArray(rows) ? rows : []).find((r) => String(r._id) === messageId);
    if (hit) return hit;
  }
  return null;
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
  try {
    const requested = await scopeWorld(body.client_id, req);
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const messageId = String(body.message_id || '').trim();
  if (!messageId) return res.status(400).json({ error: 'message_id required' });

  const original = await findMessage({ world: clientId, messageId, roomId: body.room_id });
  if (!original) return res.status(404).json({ error: 'message not found' });
  const role = original.role || (original.agentSlug ? 'assistant' : 'user');
  if (role !== 'user') return res.status(400).json({ error: 'only a message you sent can be accepted' });

  const meta = (original.metadata && typeof original.metadata === 'object') ? original.metadata : {};
  const routed = (meta.routed && typeof meta.routed === 'object') ? meta.routed : null;
  // Nothing to accept unless the router chose this room.
  if (!routed || routed.auto !== true) {
    return res.status(400).json({ error: 'this message was not auto-routed' });
  }
  // Idempotent: both callers can fire for the same row.
  if (routed.accepted === true) return res.status(200).json({ ok: true, already: true });

  try {
    await convexMutation('messages:patchMetadata', {
      messageId,
      patch: { routed: { ...routed, accepted: true, accepted_at: new Date().toISOString() } },
    });
  } catch (err) {
    return res.status(502).json({ error: String(err?.message || 'could not record the acceptance').slice(0, 160) });
  }

  return res.status(200).json({ ok: true, message_id: messageId });
}
