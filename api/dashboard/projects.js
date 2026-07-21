// GET /api/dashboard/projects
// Fetch the CALLER'S projects from Supabase, scoped to their own world.

import { callerWorld, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // TENANT SCOPE (corner:audit cross-tenant leak, 2026-07-21). This endpoint
    // queries with the service-role key (RLS-bypassing), so it MUST scope to the
    // caller's own world itself — it used to return EVERY tenant's projects to
    // anyone (no auth, no filter), leaking the whole project list into Settings
    // and the Organize/Review pickers. Derive the world from the caller's JWT.
    // A ?client= override is honored ONLY when verifyTenant proves the caller may
    // read it (super-admin / world-admin / shared) so Patrik's world-switcher
    // keeps working without reopening the hole.
    let world;
    const requested = (req.query.client || '').toString().trim().toLowerCase();
    if (requested) {
      await verifyTenant(requested, req); // throws TenantAuthError on denial
      world = requested;
    } else {
      world = await callerWorld(req);
      if (!world) return res.status(401).json({ error: 'auth required' });
    }

    // Fetch only THIS world's projects.
    // The projects table has no updated_at column, only created_at.
    // corner:corner-ui-cv6 wd40 DEF-4: archived projects (is_active=false) are
    // excluded — this endpoint feeds the Organize tree + pickers, and an
    // archived room must disappear there. `not.is.false` keeps legacy rows
    // with a null is_active visible (null = never archived).
    const url = `${SUPABASE_URL}/rest/v1/projects?select=id,name,slug,client_id,created_at,is_active&is_active=not.is.false&client_id=eq.${encodeURIComponent(world)}&order=created_at.desc`;
    const r = await fetch(url, { headers });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const projects = await r.json();
    return res.status(200).json({ ok: true, projects: Array.isArray(projects) ? projects : [] });
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
