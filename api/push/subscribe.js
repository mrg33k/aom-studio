// POST /api/push/subscribe   — store a browser push subscription
// POST /api/push/subscribe?unsubscribe=1  — forget one (body: { endpoint })
// GET  /api/push/subscribe?key=1          — the VAPID public key the client needs
//
// The subscription object comes from the browser (PushManager.subscribe) and is the
// only thing that lets our server address that specific device. It is a capability,
// not a secret of ours — but it IS device-identifying, so it lives behind the service
// role key and is never exposed to the client after storage.
//
// The table is push_subscriptions (created 2026-08-06):
//   endpoint (unique) · p256dh · auth · world_id · user_agent · label
//   created_at · last_sent_at · failure_count

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  // The public key is not a secret — the client cannot subscribe without it.
  if (req.method === 'GET') {
    const key = process.env.VAPID_PUBLIC_KEY || '';
    if (!key) return res.status(503).json({ error: 'push not configured', key: '' });
    return res.status(200).json({ key });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const db = admin();
  if (!db) return res.status(503).json({ error: 'supabase not configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  if (req.query?.unsubscribe) {
    if (!body.endpoint) return res.status(400).json({ error: 'endpoint required' });
    const { error } = await db.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, removed: true });
  }

  const sub = body.subscription || body;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'subscription must include endpoint and keys' });
  }

  // Re-subscribing the same device must not create a second row, or every message
  // arrives twice. endpoint is UNIQUE and is the natural key.
  const { error } = await db.from('push_subscriptions').upsert({
    endpoint,
    p256dh,
    auth,
    world_id: body.worldId || null,
    user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    label: body.label || null,
    failure_count: 0,
  }, { onConflict: 'endpoint' });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
