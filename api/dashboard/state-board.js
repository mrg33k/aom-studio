// GET /api/dashboard/state-board?world=<world>
//
// Read-only view of the state board (Supabase `board_latest`) for the Command
// tool's goal ledger — corner:state-board (decision 2026-07-05): one row per
// entity (agent / room) holding the entity's GOAL plus its latest state line,
// auto-stamped by the Stop hook (scripts/state-board-stamp.py). This is the
// designated source of truth for "what is this room's goal right now"; the
// legacy room-goals.json (see room-goals.js) stays as the loop's goal memory
// and the ledger merges both (board wins when it has a goal).
//
// Returns: { rows: [ { entity, kind, goal, state_line, updated_by, updated_at } ],
//            source: 'live' | 'none' }
// Fails open to an empty list — the ledger renders honest fallbacks, never fakes.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { normalizeTenantSlug } from '../_lib/tenantContext.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(200).json({ rows: [], source: 'none' });

  let tenantId = requested;
  try {
    ({ tenant: tenantId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/board_latest` +
      `?select=entity,kind,goal,state_line,updated_by,updated_at` +
      `&order=updated_at.desc&limit=200`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) return res.status(200).json({ rows: [], source: 'none' });
    const rows = await r.json();
    return res.status(200).json({ rows: Array.isArray(rows) ? rows : [], source: 'live', tenant_id: tenantId });
  } catch (_) {
    return res.status(200).json({ rows: [], source: 'none' });
  }
}
