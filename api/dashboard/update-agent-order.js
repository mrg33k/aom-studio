// GET  /api/dashboard/update-agent-order?client=aom
//   Returns agents sorted by display_order (lowest first).
//   Response: { agents: [{ slug, display_order }] }
//
// POST /api/dashboard/update-agent-order
//   Body: { agents: [{ slug, display_order }], client_id? }
//   Updates display_order on each matching row in the agents table.
//   Response: { ok: true, updated: N }
//
// Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by tenant.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseGet(params) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/agents?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase GET failed (${resp.status}): ${errText}`);
  }
  return resp.json();
}

async function supabasePatch(slug, clientId, body) {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/agents?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Supabase PATCH failed (${resp.status}): ${errText}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // ── GET: return current agent order ─────────────────────────────────────────
  if (req.method === 'GET') {
    let clientId;
    try {
      ({ tenant: clientId } = await verifyTenant(req.query.client || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const agents = await supabaseGet(
        `client_id=eq.${encodeURIComponent(clientId)}&order=display_order.asc,slug.asc&select=slug,display_order`
      );
      return res.status(200).json({ agents });
    } catch (err) {
      console.error('[update-agent-order] GET error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: update display_order for a reordered list ─────────────────────────
  if (req.method === 'POST') {
    const { agents, client_id } = req.body || {};

    if (!Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({ error: 'agents array required' });
    }

    let tenant;
    try {
      ({ tenant } = await verifyTenant(client_id || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }

    // Validate each entry has slug + display_order
    for (const a of agents) {
      if (!a.slug || typeof a.display_order !== 'number') {
        return res.status(400).json({ error: 'each agent needs slug and display_order (number)' });
      }
    }

    try {
      let updated = 0;
      // Update sequentially to avoid rate-limit issues on large rosters
      for (const a of agents) {
        await supabasePatch(a.slug, tenant, { display_order: a.display_order });
        updated++;
      }
      return res.status(200).json({ ok: true, updated });
    } catch (err) {
      console.error('[update-agent-order] POST error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or POST only' });
}
