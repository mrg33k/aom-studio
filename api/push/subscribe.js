// POST /api/push/subscribe                store a browser push subscription
// POST /api/push/subscribe?unsubscribe=1  forget one (body: { endpoint })
// GET  /api/push/subscribe?key=1          the VAPID public key the client needs
//
// The subscription object comes from the browser (PushManager.subscribe) and is the
// only thing that lets our server address that specific device. It is a capability,
// not a secret of ours, but it IS device-identifying, so it is never exposed to the
// client after storage.
//
// corner:retire-supabase (2026-09-03): the row is a Convex devices row
// (devices:register with kind webpush; the endpoint is the token, so
// re-subscribing the same device refreshes the row instead of adding one).
// devices:unregister by endpoint forgets it. Web push sending from the
// deployment is not wired yet (subscriptions are stored, not sent).

import { verifyTenant, TenantAuthError, extractJwt, callerIdentity, convexMutationAs, convexMutation } from '../_lib/verifyTenant.js';

export default async function handler(req, res) {
  // The public key is not a secret; the client cannot subscribe without it.
  if (req.method === 'GET') {
    const key = process.env.VAPID_PUBLIC_KEY || '';
    if (!key) return res.status(503).json({ error: 'push not configured', key: '' });
    return res.status(200).json({ key });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  // POST requires auth: push subscriptions are per-world and per-person.
  let tenant;
  try {
    ({ tenant } = await verifyTenant(req.headers['x-client-id'] || req.query.client || 'aom', req));
  } catch (e) {
    if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const identity = await callerIdentity(req);
  if (!identity?.userId) return res.status(401).json({ error: 'Unauthorized' });
  const jwt = extractJwt(req);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  if (req.query?.unsubscribe) {
    if (!body.endpoint) return res.status(400).json({ error: 'endpoint required' });
    try {
      const out = await convexMutation('devices:unregister', { token: String(body.endpoint) });
      return res.status(200).json({ ok: true, removed: !!(out && out.removed) });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  }

  const sub = body.subscription || body;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'subscription must include endpoint and keys' });
  }

  try {
    await convexMutationAs(jwt, 'devices:register', {
      userId: identity.userId,
      worldId: String(body.worldId || tenant || '').trim().toLowerCase() || undefined,
      kind: 'webpush',
      token: String(endpoint),
      subscription: {
        endpoint,
        keys: { p256dh, auth },
        expirationTime: sub.expirationTime ?? null,
        label: body.label || null,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      },
      platform: 'web',
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
  return res.status(200).json({ ok: true });
}
