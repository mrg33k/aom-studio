// POST   /api/push/register-device                 — register/refresh this device's APNs token
// DELETE /api/push/register-device                 — forget it (body: { token })
// POST   /api/push/register-device?unregister=1     — same, for clients that can't send a DELETE body
//
// corner:native-ios Stage 0. The native counterpart of api/push/subscribe.js.
//
// AUTH IS REQUIRED, unlike the Web Push sibling. That is a deliberate difference,
// not an inconsistency: a browser push endpoint is a capability URL the browser
// itself minted and it is useless to anyone who does not already hold it, whereas an
// APNs token is addressable by ANY holder of our team key. Storing one unauthenticated
// would let a stranger point a device row at a world and receive that world's room
// names on their lock screen. So the session is verified, and BOTH the owner (user_id)
// and the routing tenant (world_id) come from the JWT — never from the request body.
// A body that claims a different user is not an error we report; it is simply never read.
//
// PLATFORM. 'ios' only, validated here and again by the CHECK constraint on the table.
// When Android arrives it gets its own transport (FCM) and its own sender lane, so
// widening this string without writing that lane would store tokens nothing can send to.

import { callerIdentity } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_PLATFORMS = new Set(['ios']);
// Apple device tokens are hex. Accepting anything else means storing junk we will
// hand to APNs 200 times before it tells us it is junk.
const TOKEN_RE = /^[0-9a-f]{32,200}$/i;

function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  return typeof raw === 'object' ? raw : {};
}

export default async function handler(req, res) {
  const method = String(req.method || '').toUpperCase();
  if (method !== 'POST' && method !== 'DELETE') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(503).json({ error: 'supabase not configured' });
  }

  // 401 BEFORE anything is parsed or written. No session, no row.
  const identity = await callerIdentity(req);
  if (!identity?.userId) {
    return res.status(401).json({ error: 'authentication required' });
  }

  const body = readBody(req);
  const token = String(body.token || body.deviceToken || '').trim();
  if (!token) return res.status(400).json({ error: 'token required' });
  if (!TOKEN_RE.test(token)) return res.status(400).json({ error: 'token must be a hex APNs device token' });

  const unregister = method === 'DELETE' || !!req.query?.unregister;

  if (unregister) {
    // Scoped to the caller's own rows: a valid session cannot be used to knock
    // somebody else's phone off push by guessing a token.
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/device_tokens?token=eq.${encodeURIComponent(token)}&user_id=eq.${encodeURIComponent(identity.userId)}`,
      { method: 'DELETE', headers: serviceHeaders() },
    );
    if (!r.ok) {
      const err = await r.text().catch(() => '');
      return res.status(500).json({ error: err || 'delete failed' });
    }
    return res.status(200).json({ ok: true, removed: true });
  }

  const platform = String(body.platform || 'ios').trim().toLowerCase();
  if (!ALLOWED_PLATFORMS.has(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${[...ALLOWED_PLATFORMS].join(', ')}` });
  }
  const environment = /^(sandbox|development|dev)$/i.test(String(body.environment || '').trim())
    ? 'sandbox'
    : 'production';

  const row = {
    user_id: identity.userId,
    token,
    platform,
    environment,
    // The tenant this device receives for. From the verified JWT — the fan-out in
    // api/_lib/apns.js selects on exactly this column, so a body-supplied world
    // would be a subscribe-to-any-world hole.
    world_id: identity.world || null,
    bundle_id: String(body.bundleId || body.bundle_id || '').trim() || null,
    device_name: String(body.deviceName || body.device_name || '').trim().slice(0, 120) || null,
    app_version: String(body.appVersion || body.app_version || '').trim().slice(0, 40) || null,
    last_seen_at: new Date().toISOString(),
  };

  // iOS re-issues the same token on every launch and the app re-registers each time,
  // so this MUST be an upsert on the unique token: a second row is a second banner on
  // the same phone. `merge-duplicates` also re-homes a token when a different account
  // signs in on that device — the last person to sign in is the one it should reach.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/device_tokens?on_conflict=token`, {
    method: 'POST',
    headers: serviceHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => '');
    console.warn('[register-device] upsert failed:', r.status, err.slice(0, 300));
    return res.status(500).json({ error: err || 'registration failed' });
  }

  return res.status(200).json({ ok: true, platform, environment, world: row.world_id });
}
