// GET /api/dashboard/preferences?key=hex_positions&client=aom
// POST /api/dashboard/preferences  { key, client_id, value }
// Reads/writes user_preferences table via service role (bypasses RLS).
// Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by tenant.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  if (req.method === 'GET') {
    const { key, client } = req.query;
    if (!key) return res.status(400).json({ error: 'key required' });
    const _getClient = client && String(client).trim();
    if (!_getClient) return res.status(401).json({ error: 'Missing client' });
    let tenant;
    try {
      ({ tenant } = await verifyTenant(_getClient, req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_preferences?key=eq.${encodeURIComponent(key)}&client_id=eq.${encodeURIComponent(tenant)}&select=value&limit=1`,
        { headers }
      );
      if (!r.ok) return res.status(500).json({ error: 'fetch failed' });
      const rows = await r.json();
      return res.status(200).json({ value: rows[0]?.value || null });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { key, client_id, value } = req.body || {};
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });
    const _postClient = client_id && String(client_id).trim();
    if (!_postClient) return res.status(401).json({ error: 'Missing client' });
    let tenant;
    try {
      ({ tenant } = await verifyTenant(_postClient, req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_preferences?on_conflict=key,client_id`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ key, client_id: tenant, value, updated_at: new Date().toISOString() }),
        }
      );
      return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or POST only' });
}
