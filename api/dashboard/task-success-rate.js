// GET /api/dashboard/task-success-rate?world=<client_id>[&window=50]
//
// Returns a live success-rate readout for the dashboard chip (R18a). The
// rate is computed over the most recent N closed tasks (default 50) in a
// given tenant. A task is "closed" when status is in {done, failed}. The
// rate = done / (done + failed).
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
//   closed_count: 50,
//   done_count: 48,
//   failed_count: 2,
//   red_since: '2026-04-22T15:30:00Z' | null,
//   amber_since: '2026-04-22T15:30:00Z' | null,
// }
//
// red_since/amber_since are derived by scanning backwards through the
// closed window: for each task (newest -> oldest), recompute the rolling
// rate; the earliest timestamp where the state matches the current state
// is the "since" anchor. This is enough for the R18c foreman halt rule
// ("red for > 1h") without requiring a dedicated timeseries table.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_WINDOW = 50;
const MAX_WINDOW = 200;

function stateFor(pct) {
  if (pct >= 98) return 'green';
  if (pct >= 95) return 'amber';
  return 'red';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const world = String(req.query.world || 'aom').trim();
  if (!/^[a-z0-9][a-z0-9-_:]{0,64}$/i.test(world)) {
    return res.status(400).json({ error: 'invalid world' });
  }
  const requestedWindow = parseInt(req.query.window, 10);
  const windowN = Number.isFinite(requestedWindow)
    ? Math.max(5, Math.min(MAX_WINDOW, requestedWindow))
    : DEFAULT_WINDOW;

  try {
    const url = `${SUPABASE_URL}/rest/v1/tasks` +
      `?client_id=eq.${encodeURIComponent(world)}` +
      `&status=in.(done,failed)` +
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
