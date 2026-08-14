// GET /api/dashboard/text-files
// Fetch the CALLER'S text files, scoped to their own world.
// Fix 2026-08-14 (IDENTITY #3): was open to anyone — no JWT, no client_id
// filter, CORS *, service-role bypass → every tenant's pasted content
// leaked (same class as Karen 07-21 projects leak, now closed there).
// Now mirrors projects.js: derive world from JWT via callerWorld/verifyTenant.

import { callerWorld, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    // Scope to caller world — fail-closed (no || '' fallback).
    let world;
    const requested = (req.query.client || '').toString().trim().toLowerCase();
    if (requested) {
      await verifyTenant(requested, req);
      world = requested;
    } else {
      world = await callerWorld(req);
      if (!world) return res.status(401).json({ error: 'auth required' });
    }

    // Fetch only this world's text files; service key bypasses RLS so the filter is mandatory.
    const url = `${SUPABASE_URL}/rest/v1/text_files?select=id,name,project_id,content,created_at,updated_at&order=updated_at.desc&limit=500&client_id=eq.${encodeURIComponent(world)}`;
    const r = await fetch(url, { headers });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const files = await r.json();
    return res.status(200).json({ ok: true, files: Array.isArray(files) ? files : [] });
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
}
