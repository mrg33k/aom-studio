// GET /api/dashboard/project-summary?slug=corner
//
// Returns the current project summary for a given project slug.
// Written by scripts/project-summary-daemon.py into the `cm_state` table
// with kind='project_summary', scope_id=<slug>. As of chat-perf-finishing
// R3 (2026-05-11), state-shape writes use cm_state (upsert-in-place)
// instead of events (append-only) to keep the events table bounded.
//
// Uses the service role key because cm_state has RLS on.
//
// Response shape (preserved from the events-era for frontend compatibility):
// {
//   event: {
//     timestamp: "2026-05-11T20:57:00Z",  // mapped from cm_state.updated_at
//     payload: {
//       summary_md, open_task_count, recent_completions,
//       last_human_intent, reasons, updated_at, revision,
//     },
//   } | null
// }

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const rawSlug = (req.query.slug || '').toString().trim().toLowerCase();
  if (!rawSlug) return res.status(400).json({ error: 'slug required' });
  if (!/^[a-z0-9][a-z0-9-_]{0,64}$/.test(rawSlug)) {
    return res.status(400).json({ error: 'invalid slug' });
  }

  // GET was unauthenticated and honored any ?slug=, returning that project's
  // summary narrative/event data. Require the caller prove access to the
  // project — same gate as missions.js / missions-created.js.
  try {
    await verifyProjectAccess(rawSlug, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/cm_state` +
      `?kind=eq.project_summary` +
      `&scope_id=eq.${encodeURIComponent(rawSlug)}` +
      `&client_id=eq.aom` +
      `&select=payload,updated_at` +
      `&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return res.status(502).json({
        error: 'Supabase read failed',
        status: resp.status,
        detail: errText.slice(0, 200),
      });
    }

    const rows = await resp.json();
    const stateRow = Array.isArray(rows) && rows.length ? rows[0] : null;

    // Map cm_state shape → events-era response shape so the frontend
    // (TasksPanel) doesn't need to change. timestamp = updated_at.
    const event = stateRow
      ? { timestamp: stateRow.updated_at, payload: stateRow.payload }
      : null;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ event });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
