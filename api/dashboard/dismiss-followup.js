// POST /api/dashboard/dismiss-followup  { id, client }
//
// The user releasing a promise. The followup lifecycle deliberately keeps a
// promise `pending` until delivery is PROVEN (bridge-daemon's sweep sets `done`
// on structural evidence only) — which is right for live promises and hopeless
// for orphaned ones: a promise minted by a mechanism that no longer exists (the
// independent-critic rows, 2026-07-27) can never produce delivery evidence, so
// it sat on screen forever with no control anywhere to clear it. That gap is
// this endpoint (corner:one-corner M19, Patrik: "I don't know how to make these
// go away").
//
// `dismissed` is a USER decision, a third terminal state beside `done` (proven
// delivered) and the sweep's re-arms. Nothing anywhere reads `dismissed`; every
// consumer (running-tasks endpoint, bridge-daemon sweeps, promise-reconcile)
// filters status=eq.pending, so a dismissed row simply exits every surface.
// Never write `done` here — that would forge delivery evidence into the ledger.
//
// The PATCH is scoped id + client_id + status=eq.pending so one tenant can never
// clear another tenant's promise, and an already-closed row isn't rewritten.
// Same verifyTenant + service-key idiom as running-tasks.js (this table has no
// user-facing RLS path; the tenant gate is this endpoint).

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

async function scopeWorld(explicit, req) {
  const given = explicit == null ? '' : String(explicit).trim();
  if (given) return given.toLowerCase();
  const who = await callerIdentity(req);
  if (!who) throw new TenantAuthError('jwt required', 401);
  if (!who.world) throw new TenantAuthError('this account is not in a world; send an explicit world', 400);
  return who.world;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const id = String(body.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id required' });

  let clientId;
  try {
    const requested = await scopeWorld(body.client, req);
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const url = `${SUPABASE_URL}/rest/v1/followups`
    + `?id=eq.${encodeURIComponent(id)}`
    + `&client_id=eq.${encodeURIComponent(clientId)}`
    + '&status=eq.pending';
  const patch = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      // Representation back so "nothing matched" is distinguishable from success —
      // the UI must not report a dismissal that never landed (no fake UI).
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ status: 'dismissed' }),
  });
  if (!patch.ok) return res.status(502).json({ error: 'dismiss did not apply' });
  const rows = await patch.json().catch(() => []);
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(404).json({ error: 'no pending promise with that id in this world' });
  }
  return res.status(200).json({ ok: true, id: rows[0].id });
}
