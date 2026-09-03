// GET /api/dashboard/task-success-rate?world=<client_id>[&window=50][&days=7]
//
// Live success-rate readout for the dashboard chip (R18a). The rate is
// computed over the most recent N closed tasks (default 50) completed within
// the last M days (default 7) in a given tenant. A task is "closed" when its
// status is done or failed. rate = done / (done + failed).
//
// R52: the `days` window means old failures age out, so the chip reflects
// what is actively happening. Red means actively broken.
//
// Thresholds: >= 98% green, >= 95% amber, else red.
//
// Backend: Convex tasks:find (corner:retire-supabase R2, 2026-09-03).
//
// Response shape:
// { rate, rate_pct, state: 'green'|'amber'|'red'|'unknown', window, days,
//   closed_count, done_count, failed_count, red_since, amber_since }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

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
    let rows;
    try {
      rows = await convexQuery('tasks:find', {
        client_id: world,
        status_in: ['done', 'failed'],
        order: 'completed_at.desc.nullslast',
      });
    } catch (err) {
      return res.status(502).json({ error: 'task read failed', detail: String(err?.message || err).slice(0, 200) });
    }
    // Only tasks closed within the last `daysN` days.
    const tasks = (Array.isArray(rows) ? rows : [])
      .filter((t) => (t.completed_at ? t.completed_at >= sinceIso : (t.created_at || '') >= sinceIso))
      .slice(0, windowN);
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

    // tasks[] is newest-first. Recompute the rate at each prefix and find the
    // earliest prefix whose state is still the current state; the last task
    // in that prefix is the "since" anchor.
    let redSince = null;
    let amberSince = null;
    if (state === 'red' || state === 'amber') {
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
