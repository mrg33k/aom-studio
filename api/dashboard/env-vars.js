// GET    /api/dashboard/env-vars?scope=project&scope_id=sourcing&client=aom
//        Returns key names + timestamps. NEVER returns values.
// POST   /api/dashboard/env-vars  { scope, scope_id, key, value, client_id }
//        Upserts a key. Creates or updates.
// DELETE /api/dashboard/env-vars  { scope, scope_id, key, client_id }
//        Removes a key.
//
// Service role only (RLS default-deny, service role bypasses).

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
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

  // GET: list key names for a scope (never returns values)
  if (req.method === 'GET') {
    const { scope, scope_id, client } = req.query;
    if (!scope || !scope_id) {
      return res.status(400).json({ error: 'scope and scope_id required' });
    }
    let tenant;
    try {
      ({ tenant } = await verifyTenant(client || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/env_vars?scope=eq.${encodeURIComponent(scope)}&scope_id=eq.${encodeURIComponent(scope_id)}&client_id=eq.${encodeURIComponent(tenant)}&select=key,created_at,updated_at&order=key.asc`;
      const r = await fetch(url, { headers });
      if (!r.ok) return res.status(500).json({ error: 'fetch failed' });
      const rows = await r.json();
      return res.status(200).json({ keys: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: upsert a key
  if (req.method === 'POST') {
    const { scope, scope_id, key, value, client_id } = req.body || {};
    if (!scope || !scope_id || !key || value === undefined) {
      return res.status(400).json({ error: 'scope, scope_id, key, and value required' });
    }
    if (!['world', 'user', 'project'].includes(scope)) {
      return res.status(400).json({ error: 'scope must be world, user, or project' });
    }
    let tenant;
    try {
      ({ tenant } = await verifyTenant(client_id || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/env_vars?on_conflict=scope,scope_id,key,client_id`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          scope,
          scope_id,
          key,
          value,
          client_id: tenant,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE: remove a key
  if (req.method === 'DELETE') {
    const { scope, scope_id, key, client_id } = req.body || {};
    if (!scope || !scope_id || !key) {
      return res.status(400).json({ error: 'scope, scope_id, and key required' });
    }
    let tenant;
    try {
      ({ tenant } = await verifyTenant(client_id || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const url = `${SUPABASE_URL}/rest/v1/env_vars?scope=eq.${encodeURIComponent(scope)}&scope_id=eq.${encodeURIComponent(scope_id)}&key=eq.${encodeURIComponent(key)}&client_id=eq.${encodeURIComponent(tenant)}`;
      const r = await fetch(url, {
        method: 'DELETE',
        headers: { ...headers, 'Prefer': 'return=minimal' },
      });
      return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET, POST, or DELETE only' });
}
