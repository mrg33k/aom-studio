// GET  /api/dashboard/support-autoreply?world=aom                      (user JWT)
// POST /api/dashboard/support-autoreply { action: 'off'|'restore'|'clear'|'save' }  (user JWT)
// GET  /api/dashboard/support-autoreply?sync=1                         (internal key)
// POST /api/dashboard/support-autoreply?sync=1 { file_state, consumed_token? } (internal key)
//
// The Email screen's honest auto-reply switch (Patrik 2026-07-20: "if email
// has an auto reply on, we need to be able to know that / control it"). The
// support pipeline's auto-send lanes are gated by
// corner/state/support-soft-ack.json on disk, which this serverless function
// cannot touch, so the control plane is a pair of keyed state rows, one per
// writer, so the two lanes can never clobber each other:
//   CONTROL row (user lane only):   { control: {mode?, answer_mode?, requested_at},
//                                     last_on: {mode, answer_mode} | null }
//   FILESTATE row (watcher only):   { file_state: {mode, answer_mode, threshold_min, synced_at} }
// The watcher (support-email-watch.py, fresh process every 60s) pulls
// `control`, rewrites the JSON gate, and pushes disk truth back with a
// consumed_token so the control clears only when it was actually applied.
//
// Escalation safety: the user lane never invents a configuration. 'off'
// remembers what was on (last_on) and requests mode:'off' only; 'restore'
// re-requests exactly what was on before, and is refused when nothing was
// remembered. Staleness safety: the watcher refuses controls older than 15
// minutes, and the user lane can 'clear' a pending control at any time.
//
// Backend: Convex state:get / state:put (corner:retire-supabase R2,
// 2026-09-03). The watcher lane authenticates with CORNER_INTERNAL_KEY, sent
// as `X-Internal-Key: <key>` or `Authorization: Bearer <key>`.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const CONTROL_KIND = 'support_autoreply_control';
const STATE_KIND = 'support_autoreply_filestate';
const SCOPE_ID = 'all';
const WORLD = 'aom'; // the support desk is AOM's; the UI gates the strip to this world

const ON_MODES = new Set(['test', 'live']);

function serviceAuthorized(req) {
  const key = process.env.CORNER_INTERNAL_KEY || '';
  if (!key) return false;
  const header = String(req.headers['x-internal-key'] || '');
  const auth = String(req.headers.authorization || '');
  return header === key || auth === `Bearer ${key}`;
}

const loadRow = async (kind) => {
  try {
    const row = await convexQuery('state:get', { kind, scopeId: SCOPE_ID, worldSlug: WORLD });
    const payload = row && typeof row === 'object' ? row.value : null;
    return (payload && typeof payload === 'object') ? payload : {};
  } catch {
    return {};
  }
};

const saveRow = async (kind, value, updatedBy) => {
  try {
    const r = await convexMutation('state:put', { kind, scopeId: SCOPE_ID, worldSlug: WORLD, value, updatedBy });
    return !!(r && r.ok);
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const syncLane = req.query.sync === '1' || req.query.sync === 'true';
  if (syncLane) {
    if (!serviceAuthorized(req)) return res.status(401).json({ error: 'internal key required' });
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
    const canRestore = !!(ctl.last_on && ON_MODES.has(ctl.last_on.mode));
    return res.status(200).json({ control: ctl.control || null, file_state: st.file_state || null, can_restore: canRestore });
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (syncLane) {
      // Watcher lane: write disk truth to its own row, and compare-and-clear
      // the control only when the watcher proves it consumed this request.
      const fs = body.file_state || {};
      const ok = await saveRow(STATE_KIND, {
        file_state: {
          mode: String(fs.mode || ''),
          answer_mode: String(fs.answer_mode || ''),
          threshold_min: Number.isFinite(Number(fs.threshold_min)) ? Number(fs.threshold_min) : null,
          tone: String(fs.tone || ''),
          instructions: String(fs.instructions || ''),
          sign_off: String(fs.sign_off || ''),
          synced_at: new Date().toISOString(),
        },
      }, 'support-email-watch');
      if (!ok) return res.status(502).json({ error: 'state store write failed' });
      if (body.consumed_token) {
        const ctl = await loadRow(CONTROL_KIND);
        if (ctl.control && ctl.control.requested_at === body.consumed_token) {
          await saveRow(CONTROL_KIND, { ...ctl, control: null }, 'support-email-watch');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // User lane.
    const action = String(body.action || '');
    if (!['off', 'restore', 'clear', 'save'].includes(action)) {
      return res.status(400).json({ error: "action required: 'off' | 'restore' | 'clear' | 'save'" });
    }
    const ctl = await loadRow(CONTROL_KIND);
    if (action === 'clear') {
      ctl.control = null;
    } else if (action === 'save') {
      const mode = String(body.mode || 'off');
      const answerMode = String(body.answer_mode || 'off');
      const threshold = Number(body.threshold_min);
      const tone = String(body.tone || 'warm').trim().slice(0, 40);
      const instructions = String(body.instructions || '').trim().slice(0, 2000);
      const signOff = String(body.sign_off || '').trim().slice(0, 300);
      if (!['off', 'test', 'live'].includes(mode) || !['off', 'draft', 'send'].includes(answerMode)) return res.status(400).json({ error: 'Invalid auto-reply mode.' });
      if (!Number.isFinite(threshold) || threshold < 2 || threshold > 240) return res.status(400).json({ error: 'Holding-note delay must be 2 to 240 minutes.' });
      ctl.control = { mode, answer_mode: answerMode, threshold_min: threshold, tone, instructions, sign_off: signOff, requested_at: new Date().toISOString() };
      if (ON_MODES.has(mode)) ctl.last_on = { mode, answer_mode: answerMode };
    } else if (action === 'off') {
      const st = await loadRow(STATE_KIND);
      const fs = st.file_state || {};
      if (ON_MODES.has(fs.mode)) ctl.last_on = { mode: fs.mode, answer_mode: fs.answer_mode || '' };
      ctl.control = { mode: 'off', requested_at: new Date().toISOString() };
    } else { // restore
      const prev = ctl.last_on && ON_MODES.has(ctl.last_on.mode) ? ctl.last_on : null;
      if (!prev) {
        return res.status(409).json({
          error: 'No previous auto-reply mode is available to restore.',
          control: ctl.control || null,
          file_state: (await loadRow(STATE_KIND)).file_state || null,
          can_restore: false,
        });
      }
      ctl.control = {
        mode: prev.mode,
        ...(prev.answer_mode ? { answer_mode: prev.answer_mode } : {}),
        requested_at: new Date().toISOString(),
      };
    }
    const ok = await saveRow(CONTROL_KIND, ctl, 'dashboard');
    if (!ok) return res.status(502).json({ error: 'state store write failed' });
    const st = await loadRow(STATE_KIND);
    const canRestore = !!(ctl.last_on && ON_MODES.has(ctl.last_on.mode));
    return res.status(200).json({ ok: true, control: ctl.control || null, file_state: st.file_state || null, can_restore: canRestore });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
