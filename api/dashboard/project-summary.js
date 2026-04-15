// GET /api/dashboard/project-summary?slug=corner
//
// Returns the latest project-summary event row for a given project slug.
// Written by scripts/project-summary-daemon.py into the shared `events`
// table with event_type='project_summary', agent=<slug>. The dashboard's
// TasksPanel polls this every few seconds to render the live summary card
// above the task list.
//
// Uses the service role key because the `events` table has RLS on and the
// anon key can't SELECT it. R2 was directly fetching from the browser and
// silently returning empty results.
//
// Response shape:
// {
//   event: {
//     timestamp: "2026-04-15T20:57:00Z",
//     payload: {
//       summary_md, open_task_count, recent_completions,
//       last_human_intent, reasons, updated_at, revision,
//     },
//   } | null
// }

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

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/events` +
      `?event_type=eq.project_summary` +
      `&agent=eq.${encodeURIComponent(rawSlug)}` +
      `&order=timestamp.desc` +
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
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ event: row });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
