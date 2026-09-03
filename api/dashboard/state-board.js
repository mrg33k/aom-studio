// GET /api/dashboard/state-board?world=<world>
//
// Read-only view of the state board for the Command tool's goal ledger
// (corner:state-board, decision 2026-07-05): one row per entity (agent / room)
// holding the entity's latest state line, stamped by the Stop hook. The
// legacy room-goals.json (see room-goals.js) stays as the loop's goal memory
// and the ledger merges both.
//
// Backend: Convex records:recent (corner:retire-supabase R2, 2026-09-03).
// The Convex record carries entity, kind, line, updatedAt and updatedBy; it
// has no goal column, so `goal` is null here and the ledger falls back to
// room-goals for it.
//
// Returns: { rows: [ { entity, kind, goal, state_line, updated_by, updated_at } ],
//            source: 'live' | 'none' }
// Fails open to an empty list.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { normalizeTenantSlug } from '../_lib/tenantContext.js';
import { convexQuery } from '../_lib/reportsStore.js';

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const envTenant = normalizeTenantSlug(process.env.CORNER_HOME_TENANT || process.env.SUPPORT_TENANT_ID);
  const requested = normalizeTenantSlug(req.query.world || req.query.client || req.query.client_id || envTenant);
  if (!requested) return res.status(400).json({ error: 'world required' });

  let tenantId = requested;
  try {
    ({ tenant: tenantId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const records = await convexQuery('records:recent', { limit: 60 });
    const rows = (Array.isArray(records) ? records : []).map((r) => ({
      entity: r.entity,
      kind: r.kind,
      goal: null,
      state_line: r.line,
      updated_by: r.updatedBy || null,
      updated_at: iso(r.updatedAt),
    }));
    return res.status(200).json({ rows, source: 'live', tenant_id: tenantId });
  } catch (_) {
    return res.status(200).json({ rows: [], source: 'none' });
  }
}
