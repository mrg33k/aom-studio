// GET /api/dashboard/project-summary?slug=corner
//
// Returns the current project summary for a given project slug.
// Written by scripts/project-summary-daemon.py as one keyed row with
// kind='project_summary', scopeId=<slug> (upsert-in-place, never append-only).
//
// corner:retire-supabase (2026-09-03): the row lives in the Convex state
// table and is read with state:get. It used to be the Supabase cm_state table.
//
// Response shape (preserved from the events-era for frontend compatibility):
// {
//   event: {
//     timestamp: "2026-05-11T20:57:00Z",  // mapped from the row's updatedAt
//     payload: {
//       summary_md, open_task_count, recent_completions,
//       last_human_intent, reasons, updated_at, revision,
//     },
//   } | null
// }

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

const STATE_KIND = 'project_summary';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const rawSlug = (req.query.slug || '').toString().trim().toLowerCase();
  if (!rawSlug) return res.status(400).json({ error: 'slug required' });
  if (!/^[a-z0-9][a-z0-9-_]{0,64}$/.test(rawSlug)) {
    return res.status(400).json({ error: 'invalid slug' });
  }

  // GET was unauthenticated and honored any ?slug=, returning that project's
  // summary narrative/event data. Require the caller prove access to the
  // project, same gate as missions.js / missions-created.js.
  let access;
  try {
    access = await verifyProjectAccess(rawSlug, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    // The daemon files the row under the project's holder world. Try that
    // first, then a world-less row (the daemon's pre-tenancy shape).
    const worldSlug = access?.tenant || null;
    let stateRow = null;
    if (worldSlug) {
      stateRow = await convexQuery('state:get', { kind: STATE_KIND, scopeId: rawSlug, worldId: worldSlug });
    }
    if (!stateRow) {
      stateRow = await convexQuery('state:get', { kind: STATE_KIND, scopeId: rawSlug });
    }

    // Map the state row to the events-era response shape so the frontend
    // (TasksPanel) doesn't need to change. timestamp = updatedAt.
    const event = stateRow
      ? { timestamp: new Date(stateRow.updatedAt || Date.now()).toISOString(), payload: stateRow.value ?? null }
      : null;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ event });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
