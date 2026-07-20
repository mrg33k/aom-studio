// GET  /api/dashboard/support-autoreply?world=aom                      (user JWT)
// POST /api/dashboard/support-autoreply { action: 'off'|'restore'|'clear' }  (user JWT)
// GET  /api/dashboard/support-autoreply?sync=1                         (service key)
// POST /api/dashboard/support-autoreply?sync=1 { file_state, consumed_token? } (service key)
//
// The Email screen's honest auto-reply switch (corner:one-corner drop 3, Patrik
// 2026-07-20: "if email has an auto reply on, we need to be able to know that /
// control it"). The support pipeline's auto-send lanes are gated by
// corner/state/support-soft-ack.json ON DISK, which this serverless function
// cannot touch — so the control plane is a pair of cm_state rows, one per writer,
// so the two lanes can never clobber each other (xhigh review finding 13):
//   CONTROL row (user lane only):   { control: {mode?, answer_mode?, requested_at},
//                                     last_on: {mode, answer_mode} | null }
//   FILESTATE row (watcher only):   { file_state: {mode, answer_mode, threshold_min, synced_at} }
// The watcher (support-email-watch.py, fresh process every 60s) pulls `control`,
// rewrites the JSON gate, and pushes disk truth back with a consumed_token so the
// control clears only when it was actually applied (compare-and-clear).
//
// Escalation safety (finding 1): the user lane never invents a configuration.
// 'off' remembers what was on (last_on) and requests mode:'off' ONLY; 'restore'
// re-requests exactly what was on before, or bare mode:'live' with answer_mode
// untouched when nothing was remembered. answer_mode can therefore never be
// escalated from this screen — only restored.
// Staleness safety (finding 2): the watcher refuses controls older than 15
// minutes (it consumes them unapplied), and the user lane can 'clear' a pending
// control at any time.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGet, stateSet } from '../_lib/stateStore.js';

const CONTROL_KIND = 'support_autoreply_control';
const STATE_KIND = 'support_autoreply_filestate';
const WORLD = 'aom'; // the support desk is AOM's; the UI gates the strip to this world

const ON_MODES = new Set(['test', 'live']);

function serviceAuthorized(req) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const auth = String(req.headers.authorization || '');
  return key && auth === `Bearer ${key}`;
}

const loadRow = async (kind) => {
  const payload = await stateGet(kind, 'all', WORLD);
  return (payload && typeof payload === 'object') ? payload : {};
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const syncLane = req.query.sync === '1' || req.query.sync === 'true';
  if (syncLane) {
    if (!serviceAuthorized(req)) return res.status(401).json({ error: 'service key required' });
  } else {
    try {
      await verifyTenant(WORLD, req);
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
  }

  if (req.method === 'GET') {
    if (syncLane) {
      const ctl = await loadRow(CONTROL_KIND);
      return res.status(200).json({ control: ctl.control || null });
    }
    const [ctl, st] = await Promise.all([loadRow(CONTROL_KIND), loadRow(STATE_KIND)]);
    return res.status(200).json({ control: ctl.control || null, file_state: st.file_state || null });
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (syncLane) {
      // Watcher lane: write disk truth to ITS OWN row, and compare-and-clear the
      // control only when the watcher proves it consumed this exact request.
      const fs = body.file_state || {};
      const ok = await stateSet(STATE_KIND, 'all', WORLD, {
        file_state: {
          mode: String(fs.mode || ''),
          answer_mode: String(fs.answer_mode || ''),
          threshold_min: Number.isFinite(Number(fs.threshold_min)) ? Number(fs.threshold_min) : null,
          synced_at: new Date().toISOString(),
        },
      });
      if (!ok) return res.status(502).json({ error: 'state store write failed' });
      if (body.consumed_token) {
        const ctl = await loadRow(CONTROL_KIND);
        if (ctl.control && ctl.control.requested_at === body.consumed_token) {
          await stateSet(CONTROL_KIND, 'all', WORLD, { ...ctl, control: null });
        }
      }
      return res.status(200).json({ ok: true });
    }

    // User lane.
    const action = String(body.action || '');
    if (!['off', 'restore', 'clear'].includes(action)) {
      return res.status(400).json({ error: "action required: 'off' | 'restore' | 'clear'" });
    }
    const ctl = await loadRow(CONTROL_KIND);
    if (action === 'clear') {
      ctl.control = null;
    } else if (action === 'off') {
      const st = await loadRow(STATE_KIND);
      const fs = st.file_state || {};
      if (ON_MODES.has(fs.mode)) ctl.last_on = { mode: fs.mode, answer_mode: fs.answer_mode || '' };
      ctl.control = { mode: 'off', requested_at: new Date().toISOString() };
    } else { // restore
      const prev = ctl.last_on && ON_MODES.has(ctl.last_on.mode) ? ctl.last_on : null;
      ctl.control = {
        mode: prev ? prev.mode : 'live',
        ...(prev && prev.answer_mode ? { answer_mode: prev.answer_mode } : {}),
        requested_at: new Date().toISOString(),
      };
    }
    const ok = await stateSet(CONTROL_KIND, 'all', WORLD, ctl);
    if (!ok) return res.status(502).json({ error: 'state store write failed' });
    const st = await loadRow(STATE_KIND);
    return res.status(200).json({ ok: true, control: ctl.control || null, file_state: st.file_state || null });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
