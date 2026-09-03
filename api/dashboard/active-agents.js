// GET /api/dashboard/active-agents?client=aom
//
// Which agents are working right now, from the Convex agents roster
// (corner:retire-supabase, 2026-09-03; was the Supabase active_processes
// sync table that a Mac script wrote PIDs into).
//
// Each agent's own hooks stamp status (idle | working | blocked) and the task in
// hand through agents:setStatus. This endpoint reads agents:listStatus and
// reports every agent that is not idle and was stamped recently. There are no
// PIDs any more: a stamp is a fact the agent's own session wrote, not a
// process probe. `pid` stays in the shape as null so callers that read it keep
// working.
//
// Safety net: a stamp older than STATUS_TTL_SECONDS is treated as stale and
// excluded, in case a session died without stamping idle.
//
// World scoping: ?client=<world_slug> filters to that world's roster.
//
// Returns:
// {
//   active: [
//     { agent, pid, task_id, task_text, spawned_at, heartbeat, age_seconds }
//   ],
//   source: "agents:listStatus",
//   staleCutoff: "<iso timestamp>",
//   lastUpdated: "<iso timestamp>"
// }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

// Status stamps land on Stop and PostToolUse hooks, so a working agent can be
// quiet for a few minutes between stamps. 15 minutes keeps a live session on
// the board without letting a dead one linger all day.
const STATUS_TTL_SECONDS = 15 * 60;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Resolve + verify tenant. JWT must prove the caller can access this world.
  // Fail-closed: no default client.
  const requested = (req.query.client && req.query.client.trim())
    ? req.query.client.trim().toLowerCase()
    : '';
  if (!requested) return res.status(401).json({ error: 'Missing client' });
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const now = Date.now();
  const staleCutoffMs = now - STATUS_TTL_SECONDS * 1000;
  const staleCutoff = new Date(staleCutoffMs).toISOString();

  try {
    const rows = await convexQuery('agents:listStatus', { worldId: clientId });

    const active = (Array.isArray(rows) ? rows : [])
      .filter((row) => row.status && row.status !== 'idle' && row.status !== 'offline')
      .filter((row) => typeof row.updatedAt === 'number' && row.updatedAt >= staleCutoffMs)
      .sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
      .map((row) => ({
        agent: row.slug,
        pid: null,
        task_id: null,
        task_text: row.currentTask || row.lastRecord || '',
        spawned_at: null,
        heartbeat: new Date(row.updatedAt).toISOString(),
        age_seconds: Math.round((now - row.updatedAt) / 1000),
        status: row.status,
      }));

    return res.status(200).json({
      active,
      source: 'agents:listStatus',
      tableExists: true,
      staleCutoff,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
