// GET /api/dashboard/preferences?key=hex_positions&client=aom
// POST /api/dashboard/preferences  { key, client_id, value }
//
// corner:retire-supabase (2026-09-03): reads and writes the Convex preferences
// table (preferences:get / preferences:set), keyed per person and per world.
// Was the Supabase user_preferences table, keyed per world only, so a
// preference is now the caller's own rather than shared by everyone in the
// world. Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by
// tenant and the verified identity is what the row is filed under.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';

// The identity handed to Convex. The email always resolves to the users row;
// the id only does once the session token is a Convex one (R3 clients).
function viewerRef(verified) {
  return verified.email || verified.userId || undefined;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { key, client } = req.query;
    if (!key) return res.status(400).json({ error: 'key required' });
    const _getClient = client && String(client).trim();
    if (!_getClient) return res.status(401).json({ error: 'Missing client' });
    let verified;
    try {
      verified = await verifyTenant(_getClient, req);
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const value = await convexQuery('preferences:get', {
        userId: viewerRef(verified),
        worldId: verified.tenant,
        key: String(key),
      });
      return res.status(200).json({ value: value === undefined ? null : value });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { key, client_id, value } = req.body || {};
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });
    const _postClient = client_id && String(client_id).trim();
    if (!_postClient) return res.status(401).json({ error: 'Missing client' });
    let verified;
    try {
      verified = await verifyTenant(_postClient, req);
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      await convexMutation('preferences:set', {
        userId: viewerRef(verified),
        worldId: verified.tenant,
        key: String(key),
        value,
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or POST only' });
}
