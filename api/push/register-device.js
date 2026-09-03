// POST   /api/push/register-device                 register/refresh this device's APNs token
// DELETE /api/push/register-device                 forget it (body: { token })
// POST   /api/push/register-device?unregister=1     same, for clients that can't send a DELETE body
//
// corner:native-ios Stage 0. The native counterpart of api/push/subscribe.js.
//
// AUTH IS REQUIRED, unlike the Web Push sibling. That is a deliberate difference,
// not an inconsistency: a browser push endpoint is a capability URL the browser
// itself minted and it is useless to anyone who does not already hold it, whereas an
// APNs token is addressable by ANY holder of our team key. Storing one unauthenticated
// would let a stranger point a device row at a world and receive that world's room
// names on their lock screen. So the session is verified, and BOTH the owner and the
// routing world come from the session, never from the request body.
//
// corner:retire-supabase (2026-09-03): the row is a Convex devices row
// (devices:register, kind apns; devices:unregister). The mutation runs AS the
// caller (Bearer token forwarded) so the deployment sees the same person.
//
// PLATFORM. 'ios' only. When Android arrives it gets its own transport (FCM) and
// its own sender lane, so widening this string without writing that lane would
// store tokens nothing can send to.

import { callerIdentity, extractJwt, convexMutationAs, convexMutation } from '../_lib/verifyTenant.js';

const ALLOWED_PLATFORMS = new Set(['ios']);
// Apple device tokens are hex. Accepting anything else means storing junk we will
// hand to APNs 200 times before it tells us it is junk.
const TOKEN_RE = /^[0-9a-f]{32,200}$/i;

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

  // 401 BEFORE anything is parsed or written. No session, no row.
  const identity = await callerIdentity(req);
  if (!identity?.userId) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const jwt = extractJwt(req);

  const body = readBody(req);
  const token = String(body.token || body.deviceToken || '').trim();
  if (!token) return res.status(400).json({ error: 'token required' });
  if (!TOKEN_RE.test(token)) return res.status(400).json({ error: 'token must be a hex APNs device token' });

  const unregister = method === 'DELETE' || !!req.query?.unregister;

  if (unregister) {
    // The token itself is the key. A caller can only forget a token it holds.
    try {
      const out = await convexMutation('devices:unregister', { token });
      return res.status(200).json({ ok: true, removed: !!(out && out.removed) });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e || 'delete failed') });
    }
  }

  const platform = String(body.platform || 'ios').trim().toLowerCase();
  if (!ALLOWED_PLATFORMS.has(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${[...ALLOWED_PLATFORMS].join(', ')}` });
  }
  const environment = /^(sandbox|development|dev)$/i.test(String(body.environment || '').trim())
    ? 'sandbox'
    : 'production';

  // iOS re-issues the same token on every launch and the app re-registers each time;
  // devices:register upserts on the token, so a second call is a refresh, and a
  // different account signing in on the same phone re-homes the token.
  try {
    await convexMutationAs(jwt, 'devices:register', {
      userId: identity.userId,
      worldId: identity.world || undefined,
      kind: 'apns',
      token,
      platform,
      apnsEnvironment: environment,
      appVersion: String(body.appVersion || body.app_version || '').trim().slice(0, 40) || undefined,
    });
  } catch (e) {
    console.warn('[register-device] devices:register failed:', String(e?.message || e).slice(0, 300));
    return res.status(500).json({ error: String(e?.message || e || 'registration failed') });
  }

  return res.status(200).json({ ok: true, platform, environment, world: identity.world || null });
}
