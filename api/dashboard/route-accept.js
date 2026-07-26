// POST /api/dashboard/route-accept   { client_id, message_id }
//
// Record that the user accepted the room the front-door router chose for them.
//
// WHY (corner:front-door R11, 2026-07-26). R10 left one defect named and open: a misroute
// writes itself into the wrong room's description. room-activity digests a room's recent
// messages into the "hint" the router is shown next time, so a message the router GUESSED
// into a room immediately becomes evidence that the room is about that topic. The R10 cap
// (undescribedNameMatch) only fires on a room with NO description, so one wrong route
// permanently disarms it there. "The rule protects a room exactly once."
//
// The fix is provenance, not another prompt: an auto-routed message shapes nothing until it
// has been accepted. That needs a durable accept, and there wasn't one — R10 assumed the
// signal already existed because the R8 strip has a "Got it" button, but that button was
// `localStorage.removeItem` and nothing more. The record it cleared was a single global slot
// with a 15-minute TTL, so it could not answer "was THIS row accepted" even in the same tab.
// This endpoint is that missing write.
//
// Two callers, both real user actions:
//   * "Got it" on the routed-here strip (RoutedHereBar).
//   * Sending another message in the room while the strip is live (Cv6FullComposer) —
//     carrying on working somewhere is a confirmation that it was the right somewhere.
//
// Rejection needs no counterpart here: move-message already DELETEs the row outright.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const DEFAULT_CLIENT_ID = 'aom';

async function sb(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const body = req.body || {};
  const requested = (body.client_id && String(body.client_id).trim())
    ? String(body.client_id).trim().toLowerCase()
    : DEFAULT_CLIENT_ID;
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const messageId = String(body.message_id || '').trim();
  if (!messageId) return res.status(400).json({ error: 'message_id required' });

  // Read first: it proves the row is this tenant's, and the existing metadata is what the
  // merge below has to preserve.
  const found = await sb('GET', `messages?id=eq.${encodeURIComponent(messageId)}&select=id,client_id,role,metadata&limit=1`);
  const original = Array.isArray(found.json) ? found.json[0] : null;
  if (!original) return res.status(404).json({ error: 'message not found' });
  if (original.client_id !== clientId) return res.status(403).json({ error: 'not your message' });
  if (original.role !== 'user') return res.status(400).json({ error: 'only a message you sent can be accepted' });

  const meta = (original.metadata && typeof original.metadata === 'object') ? original.metadata : {};
  const routed = (meta.routed && typeof meta.routed === 'object') ? meta.routed : null;
  // Nothing to accept unless the router chose this room. A message the user sent from inside
  // the room was never quarantined, so marking it accepted would be a lie about its history.
  if (!routed || routed.auto !== true) {
    return res.status(400).json({ error: 'this message was not auto-routed' });
  }
  // Idempotent: both callers can fire for the same row (tap "Got it", then keep typing).
  if (routed.accepted === true) return res.status(200).json({ ok: true, already: true });

  // Read-modify-write the WHOLE metadata object. PostgREST PATCH replaces a jsonb column
  // outright rather than deep-merging, so sending a bare { routed: ... } would silently drop
  // mission_slug and interaction_mode — and a row that loses mission_slug leaves its room.
  const next = { ...meta, routed: { ...routed, accepted: true, accepted_at: new Date().toISOString() } };
  const upd = await sb('PATCH', `messages?id=eq.${encodeURIComponent(messageId)}`, { metadata: next });
  if (!upd.ok) {
    return res.status(upd.status || 500).json({ error: String(upd.text || 'could not record the acceptance').slice(0, 160) });
  }

  return res.status(200).json({ ok: true, message_id: messageId });
}
