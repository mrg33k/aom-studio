// GET /api/dashboard/task-success-rate?world=<client_id>[&window=50][&days=7]
//
// Returns a live success-rate readout for the dashboard chip (R18a). The
// rate is computed over the most recent N closed tasks (default 50)
// completed within the last M days (default 7) in a given tenant. A task
// is "closed" when status is in {done, failed}. The rate = done / (done + failed).
//
// R52 (session 18): the `days` window is new. Color is picked by CURRENT
// state, not historical — old failures age out of the window so the chip
// reflects what's actively happening. Red now means actively broken.
//
// Thresholds from the R18 spec:
//   >= 98%  => green
//   >= 95%  => amber
//   <  95%  => red
//
// Response shape:
// {
//   rate: 0.96,
//   rate_pct: 96,
//   state: 'green' | 'amber' | 'red' | 'unknown',
//   window: 50,
//   days: 7,
//   closed_count: 50,
//   done_count: 48,
//   failed_count: 2,
//   red_since: '2026-04-22T15:30:00Z' | null,
//   amber_since: '2026-04-22T15:30:00Z' | null,
// }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_WINDOW = 50;
const MAX_WINDOW = 200;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;

function stateFor(pct) {
  if (pct >= 98) return 'green';
  if (pct >= 95) return 'amber';
  return 'red';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const requestedWorld = String(req.query.world || '').trim();
  if (!/^[a-z0-9][a-z0-9-_:]{0,64}$/i.test(requestedWorld)) {
    return res.status(400).json({ error: 'invalid world' });
  }
  let world;
  try {
    ({ tenant: world } = await verifyTenant(requestedWorld, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  const requestedWindow = parseInt(req.query.window, 10);
  const windowN = Number.isFinite(requestedWindow)
    ? Math.max(5, Math.min(MAX_WINDOW, requestedWindow))
    : DEFAULT_WINDOW;
  const requestedDays = parseInt(req.query.days, 10);
  const daysN = Number.isFinite(requestedDays)
    ? Math.max(1, Math.min(MAX_DAYS, requestedDays))
    : DEFAULT_DAYS;
  const sinceIso = new Date(Date.now() - daysN * 24 * 60 * 60 * 1000).toISOString();

  try {
    // R52: only consider tasks closed within the last `daysN` days. Old failures
    // age out of the window, so the chip reflects current state, not historical tail.
    const url = `${SUPABASE_URL}/rest/v1/tasks` +
      `?client_id=eq.${encodeURIComponent(world)}` +
      `&status=in.(done,failed)` +
      `&or=(completed_at.gte.${sinceIso},and(completed_at.is.null,created_at.gte.${sinceIso}))` +
      `&select=id,status,completed_at,created_at` +
      `&order=completed_at.desc.nullslast` +
      `&limit=${windowN}`;
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'supabase read failed', status: resp.status, detail: errText.slice(0, 200) });
    }
    const rows = await resp.json();
    const tasks = Array.isArray(rows) ? rows : [];
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const failedCount = tasks.filter(t => t.status === 'failed').length;
    const closed = doneCount + failedCount;

    if (closed === 0) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        rate: null,
        rate_pct: null,
        state: 'unknown',
        window: windowN,
        days: daysN,
        closed_count: 0,
        done_count: 0,
        failed_count: 0,
        red_since: null,
        amber_since: null,
      });
    }

    const rate = doneCount / closed;
    const ratePct = Math.round(rate * 1000) / 10;
    const state = stateFor(ratePct);

    // Walk oldest -> newest through the reverse-sorted list, recomputing the
    // rolling rate as we unwind. The earliest anchor where the state matches
    // the current state is the "since" timestamp.
    let redSince = null;
    let amberSince = null;
    if (state === 'red' || state === 'amber') {
      // tasks[] is newest-first (order=completed_at.desc). We recompute the
      // rate at each prefix (most-recent k tasks) and find the earliest
      // prefix where the rate's state is still the current state. The
      // completed_at of the last task in that prefix = since anchor.
      let matchedPrefixEnd = -1;
      for (let k = 1; k <= tasks.length; k++) {
        const slice = tasks.slice(0, k);
        const done = slice.filter(t => t.status === 'done').length;
        const fail = slice.filter(t => t.status === 'failed').length;
        const c = done + fail;
        if (c === 0) continue;
        const p = Math.round((done / c) * 1000) / 10;
        if (stateFor(p) === state) {
          matchedPrefixEnd = k - 1;
        }
      }
      if (matchedPrefixEnd >= 0) {
        const anchorTask = tasks[matchedPrefixEnd];
        const anchorTs = anchorTask?.completed_at || anchorTask?.created_at || null;
        if (state === 'red') redSince = anchorTs;
        if (state === 'amber') amberSince = anchorTs;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      rate,
      rate_pct: ratePct,
      state,
      window: windowN,
      days: daysN,
      closed_count: closed,
      done_count: doneCount,
      failed_count: failedCount,
      red_since: redSince,
      amber_since: amberSince,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
