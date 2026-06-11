// /api/dashboard/routines — corner:routines R1.
// One UI-shaped endpoint for the Routines left-menu panel:
//   GET    ?client_id=aom           — list routines for the world
//   POST   {name, room_type, ...}   — create (starts running immediately)
//   PATCH  {id, ...fields}          — edit / pause / resume / run-now
//   DELETE {id}                     — remove
// scripts/routine-daemon.py (AOM-EA repo) executes due rows.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MODELS = new Set(['haiku', 'sonnet', 'opus']);
const ROOM_TYPES = new Set(['project', 'mission', 'agent']);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const requested =
    (typeof req.query.client_id === 'string' && req.query.client_id.trim()) ||
    (req.body && typeof req.body.client_id === 'string' && req.body.client_id.trim()) ||
    'aom';
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    if (req.method === 'GET') {
      const r = await sb(
        `routines?client_id=eq.${encodeURIComponent(clientId)}&select=*&order=created_at.desc`
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ routines: await r.json() });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const name = (b.name || '').trim();
      const prompt = (b.prompt || '').trim();
      const roomType = b.room_type;
      const model = MODELS.has(b.model) ? b.model : 'sonnet';
      const interval = Number.isFinite(+b.interval_minutes) && +b.interval_minutes > 0
        ? Math.round(+b.interval_minutes)
        : null;
      if (!name || !prompt) return res.status(400).json({ error: 'name and prompt required' });
      if (!ROOM_TYPES.has(roomType)) return res.status(400).json({ error: 'invalid room_type' });
      if (roomType === 'agent' && !b.agent_slug) return res.status(400).json({ error: 'agent_slug required' });
      if (roomType !== 'agent' && !b.project_slug) return res.status(400).json({ error: 'project_slug required' });
      if (roomType === 'mission' && !b.mission_slug) return res.status(400).json({ error: 'mission_slug required' });

      const row = {
        client_id: clientId,
        name,
        prompt,
        room_type: roomType,
        project_slug: b.project_slug || null,
        mission_slug: b.mission_slug || null,
        agent_slug: b.agent_slug || null,
        model,
        interval_minutes: interval,
        status: 'running',
        // First tick fires on the next daemon poll for interval routines;
        // manual-only routines wait for an explicit "run now".
        next_run_at: interval ? new Date().toISOString() : null,
      };
      const r = await sb('routines', { method: 'POST', body: JSON.stringify(row) });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const [created] = await r.json();
      return res.status(200).json({ routine: created });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id required' });
      // System loops (launchd mirrors, kind='system') only support
      // pause/resume — the daemon reconciles those into launchctl.
      const cur = await sb(
        `routines?id=eq.${encodeURIComponent(b.id)}&client_id=eq.${encodeURIComponent(clientId)}&select=kind`
      );
      const [curRow] = cur.ok ? await cur.json() : [];
      if (curRow?.kind === 'system' && !['pause', 'resume'].includes(b.action)) {
        return res.status(400).json({ error: 'system loops only support pause/resume' });
      }
      const patch = { updated_at: new Date().toISOString() };
      if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
      if (typeof b.prompt === 'string' && b.prompt.trim()) patch.prompt = b.prompt.trim();
      if (MODELS.has(b.model)) patch.model = b.model;
      if ('interval_minutes' in b) {
        patch.interval_minutes = Number.isFinite(+b.interval_minutes) && +b.interval_minutes > 0
          ? Math.round(+b.interval_minutes)
          : null;
      }
      if (b.action === 'pause') patch.status = 'paused';
      if (b.action === 'resume') { patch.status = 'running'; patch.fail_count = 0; patch.last_error = null; }
      if (b.action === 'run_now') {
        // Make the row due on the daemon's next 30s poll (works for paused
        // error'd rows too — run-now implies resume).
        patch.status = 'running';
        patch.fail_count = 0;
        patch.next_run_at = new Date().toISOString();
      }
      const r = await sb(
        `routines?id=eq.${encodeURIComponent(b.id)}&client_id=eq.${encodeURIComponent(clientId)}`,
        { method: 'PATCH', body: JSON.stringify(patch) }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const [updated] = await r.json();
      return res.status(200).json({ routine: updated || null });
    }

    if (req.method === 'DELETE') {
      const id = (req.body && req.body.id) || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const r = await sb(
        `routines?id=eq.${encodeURIComponent(id)}&client_id=eq.${encodeURIComponent(clientId)}&kind=eq.user`,
        { method: 'DELETE', prefer: 'return=minimal' }
      );
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
