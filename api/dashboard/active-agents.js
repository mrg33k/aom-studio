// GET /api/dashboard/active-agents?client=aom
//
// cage-match contender A: PID-based active agents via Supabase sync table.
//
// The Mac's queue-runner writes real process liveness into the `active_processes`
// table every 60s. This endpoint reads that table -- no inference from task status,
// no guessing. If the PID is alive, the row is there. If the PID is dead, the row
// is gone (deleted by sync-active-processes.py).
//
// Safety net: any row with heartbeat older than 90s is treated as stale and
// excluded, in case queue-runner stops running.
//
// World scoping: ?client=<world_slug> filters to that world's processes.
// Defaults to 'aom'. Non-AOM worlds only see their own active agents.
//
// Returns:
// {
//   active: [
//     { agent, pid, task_id, task_text, spawned_at, heartbeat, age_seconds }
//   ],
//   source: "active_processes",
//   staleCutoff: "<iso timestamp>",
//   lastUpdated: "<iso timestamp>"
// }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rows with heartbeat older than this are excluded (queue-runner must have died)
const HEARTBEAT_TTL_SECONDS = 90;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // Resolve + verify tenant. JWT must prove the caller can access this world.
  // Fail-closed: no default client — caller must present JWT or explicit ?client that verifyTenant can authorize.
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

  // Compute stale cutoff -- any row with heartbeat older than TTL is excluded
  const staleCutoff = new Date(Date.now() - HEARTBEAT_TTL_SECONDS * 1000).toISOString();

  // World-scope the query: only return active processes for the requested world.
  const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`;

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/active_processes` +
      `?heartbeat=gt.${encodeURIComponent(staleCutoff)}` +
      clientFilter +
      `&order=agent.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      // If the table doesn't exist yet, return empty rather than crashing
      if (resp.status === 404 || errText.includes('does not exist')) {
        return res.status(200).json({
          active: [],
          source: 'active_processes',
          tableExists: false,
          staleCutoff,
          lastUpdated: new Date().toISOString(),
        });
      }
      return res.status(resp.status).json({ error: errText });
    }

    const rows = await resp.json();
    const now = Date.now();

    const active = rows.map(row => ({
      agent:      row.agent,
      pid:        row.pid,
      task_id:    row.task_id || null,
      task_text:  row.task_text || '',
      spawned_at: row.spawned_at || null,
      heartbeat:  row.heartbeat,
      // How many seconds ago was the last heartbeat?
      age_seconds: row.heartbeat
        ? Math.round((now - new Date(row.heartbeat).getTime()) / 1000)
        : null,
    }));

    return res.status(200).json({
      active,
      source: 'active_processes',
      tableExists: true,
      staleCutoff,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
