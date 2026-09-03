// /api/dashboard/routines
// One UI-shaped endpoint for the Routines left-menu panel:
//   GET    ?client_id=aom           list routines for the world
//   POST   {name, room_type, ...}   create (starts running immediately)
//   PATCH  {id, ...fields}          edit / pause / resume / run-now
//   DELETE {id}                     remove
// scripts/routine-daemon.py (AOM-EA repo) executes due rows.
//
// Backend: Convex routines:list / create / update / remove
// (corner:retire-supabase R2, 2026-09-03). The Convex row keeps name, prompt,
// roomType, agentSlug, enabled and lastRanAt as columns; the run
// configuration the daemon needs (interval, model, project and mission slug,
// next run, error state) travels as a JSON string in `schedule`, which the
// table defines as "cron text or a plain label the runner parses". The
// response keeps the flat row shape the panel reads.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const MODELS = new Set(['haiku', 'sonnet', 'opus']);
const ROOM_TYPES = new Set(['project', 'mission', 'agent']);

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);

function parseSchedule(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

// Coarse estimate: one agent turn is about 8k tokens, times runs per day.
const tokensPerDay = (interval) => (interval ? Math.round(8000 * (1440 / interval)) : null);

// Flat row for the panel, from a Convex routine.
function shapeRoutine(row, clientId) {
  const cfg = parseSchedule(row.schedule);
  return {
    id: String(row._id),
    client_id: clientId,
    kind: 'user',
    name: row.name,
    prompt: row.prompt || '',
    room_type: row.roomType || cfg.room_type || null,
    project_slug: cfg.project_slug || null,
    mission_slug: cfg.mission_slug || null,
    agent_slug: row.agentSlug || null,
    model: cfg.model || 'sonnet',
    interval_minutes: cfg.interval_minutes ?? null,
    status: row.enabled === false ? 'paused' : (cfg.status || 'running'),
    tokens_day_est: cfg.tokens_day_est ?? tokensPerDay(cfg.interval_minutes),
    next_run_at: cfg.next_run_at || null,
    last_run_at: iso(row.lastRanAt),
    last_error: cfg.last_error || null,
    fail_count: cfg.fail_count || 0,
    started_at: cfg.started_at || iso(row.createdAt),
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

async function loadRoutine(id, clientId) {
  const rows = await convexQuery('routines:list', { worldId: clientId });
  return (Array.isArray(rows) ? rows : []).find((r) => String(r._id) === String(id)) || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requested =
    (typeof req.query.client_id === 'string' && req.query.client_id.trim()) ||
    (req.body && typeof req.body.client_id === 'string' && req.body.client_id.trim()) ||
    '';
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    if (req.method === 'GET') {
      const rows = await convexQuery('routines:list', { worldId: clientId });
      const routines = (Array.isArray(rows) ? rows : [])
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .map((r) => shapeRoutine(r, clientId));
      return res.status(200).json({ routines });
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

      const now = new Date().toISOString();
      const cfg = {
        room_type: roomType,
        project_slug: b.project_slug || null,
        mission_slug: b.mission_slug || null,
        model,
        interval_minutes: interval,
        status: 'running',
        started_at: now,
        tokens_day_est: tokensPerDay(interval),
        // First tick fires on the next daemon poll for interval routines;
        // manual-only routines wait for an explicit "run now".
        next_run_at: interval ? now : null,
        fail_count: 0,
        last_error: null,
      };
      const id = await convexMutation('routines:create', {
        worldId: clientId,
        name,
        roomType,
        agentSlug: b.agent_slug || undefined,
        schedule: JSON.stringify(cfg),
        prompt,
        enabled: true,
      });
      const created = await loadRoutine(id, clientId);
      return res.status(200).json({ routine: created ? shapeRoutine(created, clientId) : { id: String(id), name, ...cfg } });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      if (!b.id) return res.status(400).json({ error: 'id required' });
      const cur = await loadRoutine(b.id, clientId);
      if (!cur) return res.status(404).json({ error: 'routine not found in this world' });
      const cfg = parseSchedule(cur.schedule);
      const patch = {};
      if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
      if (typeof b.prompt === 'string' && b.prompt.trim()) patch.prompt = b.prompt.trim();
      if (MODELS.has(b.model)) cfg.model = b.model;
      if ('interval_minutes' in b) {
        cfg.interval_minutes = Number.isFinite(+b.interval_minutes) && +b.interval_minutes > 0
          ? Math.round(+b.interval_minutes)
          : null;
        cfg.tokens_day_est = tokensPerDay(cfg.interval_minutes);
      }
      if (b.action === 'pause') { cfg.status = 'paused'; patch.enabled = false; }
      if (b.action === 'resume') { cfg.status = 'running'; cfg.fail_count = 0; cfg.last_error = null; patch.enabled = true; }
      if (b.action === 'run_now') {
        // Make the row due on the daemon's next poll. Run-now implies resume.
        cfg.status = 'running';
        cfg.fail_count = 0;
        cfg.next_run_at = new Date().toISOString();
        patch.enabled = true;
      }
      patch.schedule = JSON.stringify(cfg);
      await convexMutation('routines:update', { id: String(b.id), patch });
      const updated = await loadRoutine(b.id, clientId);
      return res.status(200).json({ routine: updated ? shapeRoutine(updated, clientId) : null });
    }

    if (req.method === 'DELETE') {
      const id = (req.body && req.body.id) || req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const cur = await loadRoutine(id, clientId);
      if (!cur) return res.status(404).json({ error: 'routine not found in this world' });
      await convexMutation('routines:remove', { id: String(id) });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
