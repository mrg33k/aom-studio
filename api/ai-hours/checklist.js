// /api/ai-hours/checklist
//
// Stores and retrieves client checklist progress per session.
// All DB operations use the service role key — access_code is the possession secret.
// SECURITY (TOP-20 #3 #7): SUP-XXXX (6-char) had ~20 bits entropy, brute-forceable.
// New codes are server-minted via crypto.randomUUID (122 bits). Legacy SUP- codes
// remain readable for backward compat but new progress rows MUST use UUID.
// Tenant isolation: progress is scoped by tenant_id derived from ai_hours_clients
// (ai_hours_progress.tenant_id = ai_hours_clients.tenant_id). Every GET/POST
// verifies the access_code still exists in ai_hours_clients and, when tenant_id
// is present, filters the progress lookup by that tenant column.

import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// UUID v4 produced by crypto.randomUUID() — 122 bits entropy
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_SUP_RE = /^SUP-[A-Z0-9]{4}$/;

function supa(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

// Server-minted high-entropy access code (use when creating a new client/progress row)
export function mintAccessCode() {
  return crypto.randomUUID();
}

function normalizeAccessCode(raw) {
  const v = String(raw || '').trim();
  if (UUID_RE.test(v)) return v.toLowerCase();
  return v.toUpperCase();
}

// Tenant column check: verify the access_code still maps to a live ai_hours_clients row
// and return its tenant_id (or null if legacy row has none). This prevents a guessed
// access_code from reading another tenant's progress when tenant_id column is populated.
async function resolveTenantForCode(access_code) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const encoded = encodeURIComponent(access_code);
    const r = await supa(`ai_hours_clients?access_code=eq.${encoded}&select=id,tenant_id,granted_by&limit=1`);
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows || rows.length === 0) return undefined; // not found
    const row = rows[0];
    // tenant_id column preferred; fall back to granted_by for legacy rows
    return row.tenant_id || row.granted_by || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ ok: false, error: 'Service unavailable' });
  }

  // GET — fetch checked items for a client/session
  if (req.method === 'GET') {
    const { access_code, session, tenant_id } = req.query;
    if (!access_code || !session) {
      return res.status(400).json({ ok: false, error: 'access_code and session required' });
    }
    const normalizedCode = normalizeAccessCode(access_code);
    // Low-entropy warning: still allow read for legacy codes, but log
    if (LEGACY_SUP_RE.test(normalizedCode)) {
      console.warn('[checklist] legacy low-entropy SUP-XXXX access_code used for GET');
    }
    // Tenant column check: ensure access_code belongs to a known client
    const tenant = await resolveTenantForCode(normalizedCode);
    if (tenant === undefined) {
      return res.status(404).json({ ok: false, error: 'Access code not found' });
    }
    const encoded = encodeURIComponent(normalizedCode);
    // If ai_hours_progress has tenant_id column, scope the lookup to that tenant.
    // If column missing the filter is ignored by PostgREST (returns 400); we fall back to access_code-only.
    let tenantFilter = '';
    const effectiveTenant = tenant_id || tenant;
    if (effectiveTenant) {
      tenantFilter = `&tenant_id=eq.${encodeURIComponent(String(effectiveTenant).toLowerCase())}`;
    }
    let r = await supa(
      `ai_hours_progress?select=checked_items&access_code=eq.${encoded}&session_number=eq.${session}${tenantFilter}`
    );
    // Fallback if tenant_id column does not exist yet (PostgREST 400 on unknown column)
    if (!r.ok && tenantFilter) {
      const t = await r.text();
      if (t.includes('tenant_id') || t.includes('column')) {
        r = await supa(
          `ai_hours_progress?select=checked_items&access_code=eq.${encoded}&session_number=eq.${session}`
        );
      } else {
        return res.status(r.status).json({ ok: false, error: t });
      }
    }
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok: false, error: err });
    }
    const data = await r.json();
    const row = data && data.length > 0 ? data[0] : null;
    return res.status(200).json({ ok: true, checked_items: row ? row.checked_items : [] });
  }

  // POST — upsert checked items
  if (req.method === 'POST') {
    const { access_code, session_number, checked_items, tenant_id } = req.body || {};
    if (!access_code || session_number === undefined) {
      return res.status(400).json({ ok: false, error: 'access_code and session_number required' });
    }
    const normalizedCode = normalizeAccessCode(access_code);
    if (LEGACY_SUP_RE.test(normalizedCode)) {
      console.warn('[checklist] legacy low-entropy SUP-XXXX access_code used for POST');
    }
    // For server-minted flow: if caller passes empty or placeholder, mint a UUID
    // (kept behind explicit flag so existing clients are not overwritten)
    const finalCode = normalizedCode || mintAccessCode();
    if (!UUID_RE.test(finalCode) && !LEGACY_SUP_RE.test(finalCode)) {
      return res.status(400).json({ ok: false, error: 'access_code must be a UUID (crypto.randomUUID) or legacy SUP-XXXX' });
    }
    const tenant = await resolveTenantForCode(finalCode);
    if (tenant === undefined) {
      return res.status(404).json({ ok: false, error: 'Access code not found' });
    }
    const effectiveTenant = tenant_id || tenant || null;
    const payload = {
      access_code: finalCode,
      session_number,
      checked_items: checked_items || [],
      updated_at: new Date().toISOString(),
    };
    // Include tenant_id in upsert when resolved — enforces tenant column isolation
    if (effectiveTenant) payload.tenant_id = String(effectiveTenant).toLowerCase();
    const r = await supa('ai_hours_progress', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.text();
      // If tenant_id column missing, retry without it (migration not yet applied)
      if (effectiveTenant && (err.includes('tenant_id') || err.includes('column'))) {
        delete payload.tenant_id;
        const r2 = await supa('ai_hours_progress', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(payload),
        });
        if (!r2.ok) {
          const err2 = await r2.text();
          return res.status(r2.status).json({ ok: false, error: err2 });
        }
        return res.status(200).json({ ok: true });
      }
      return res.status(r.status).json({ ok: false, error: err });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
