// GET  /api/dashboard/support-autoreply?world=aom          (user JWT)
// POST /api/dashboard/support-autoreply { world, mode, answer_mode }  (user JWT)
// GET  /api/dashboard/support-autoreply?sync=1              (service key)
// POST /api/dashboard/support-autoreply?sync=1 { file_state }         (service key)
//
// The Email screen's honest auto-reply switch (corner:one-corner drop 3, Patrik
// 2026-07-20: "if email has an auto reply on, we need to be able to know that /
// control it from the email screen"). The support pipeline's auto-send lanes
// (soft-ack holding note, auto-answer, worker dispatch) are all gated by
// corner/state/support-soft-ack.json ON DISK — which this serverless function
// cannot touch. So the control plane is a cm_state row:
//   payload = {
//     control:    { mode, answer_mode, requested_at }   // what the user asked for
//     file_state: { mode, answer_mode, threshold_min, synced_at }  // what is actually live on disk
//   }
// The watcher (support-email-watch.py, fresh process every 60s) pulls `control`
// and rewrites the JSON file, then pushes the file's truth back as `file_state`.
// The UI shows file_state as the truth and control as the pending request, so
// the switch is honest about the up-to-a-minute lag. No auto-reply script is
// patched beyond the watcher's sync — the file stays the single on-disk gate.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGet, stateSet } from '../_lib/stateStore.js';

const KIND = 'support_autoreply';
const WORLD = 'aom'; // the support desk is AOM's; scope fixed until multi-tenant mail lands

const MODES = new Set(['off', 'test', 'live']);
const ANSWER_MODES = new Set(['off', 'draft', 'send']);

function serviceAuthorized(req) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const auth = String(req.headers.authorization || '');
  return key && auth === `Bearer ${key}`;
}

async function loadPayload() {
  const payload = await stateGet(KIND, 'all', WORLD);
  return (payload && typeof payload === 'object') ? payload : {};
}

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
    const payload = await loadPayload();
    return res.status(200).json({ control: payload.control || null, file_state: payload.file_state || null });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const payload = await loadPayload();
    if (syncLane) {
      // Watcher pushing disk truth up.
      const fs = body.file_state || {};
      payload.file_state = {
        mode: MODES.has(fs.mode) ? fs.mode : String(fs.mode || ''),
        answer_mode: ANSWER_MODES.has(fs.answer_mode) ? fs.answer_mode : String(fs.answer_mode || ''),
        threshold_min: Number.isFinite(Number(fs.threshold_min)) ? Number(fs.threshold_min) : null,
        synced_at: new Date().toISOString(),
      };
      // A control the file now matches is consumed — clear it so the UI stops
      // showing "applying" forever.
      if (payload.control
        && (!payload.control.mode || payload.control.mode === payload.file_state.mode)
        && (!payload.control.answer_mode || payload.control.answer_mode === payload.file_state.answer_mode)) {
        payload.control = null;
      }
    } else {
      // Dashboard user flipping the switch.
      const mode = MODES.has(body.mode) ? body.mode : null;
      const answerMode = ANSWER_MODES.has(body.answer_mode) ? body.answer_mode : null;
      if (!mode && !answerMode) return res.status(400).json({ error: 'mode or answer_mode required (off|test|live / off|draft|send)' });
      payload.control = {
        ...(mode ? { mode } : {}),
        ...(answerMode ? { answer_mode: answerMode } : {}),
        requested_at: new Date().toISOString(),
      };
    }
    const ok = await stateSet(KIND, 'all', WORLD, payload);
    if (!ok) return res.status(502).json({ error: 'state store write failed' });
    return res.status(200).json({ ok: true, control: payload.control || null, file_state: payload.file_state || null });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
