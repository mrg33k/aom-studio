// GET /api/dashboard/template-registry
// GET /api/dashboard/template-registry?slug=<slug>
//
// Returns the latest template-registry snapshot produced by the local
// template-registry.py daemon (when run with --push-supabase). The daemon
// scans corner/**/manifest.yaml on the dev machine and POSTs the registry
// JSON to the events table on each rescan. This endpoint reads the most
// recent row and returns the registry, so the production dashboard can show
// project structural state (current_goal, last_meaningful_update, status,
// scaffold SHAs) without needing filesystem access.
//
// Shape mirrors the local daemon's /api/templates and /api/templates/:slug
// so the useTemplate hook can use either source interchangeably.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVENT_TYPE = 'template_registry_snapshot';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/events` +
      `?event_type=eq.${encodeURIComponent(EVENT_TYPE)}` +
      `&select=payload,timestamp` +
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
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const rows = await resp.json();
    if (!rows.length) {
      return res.status(404).json({
        error: 'no-snapshot',
        hint: 'run scripts/template-registry.py serve --push-supabase on the dev machine',
      });
    }

    const registry = rows[0].payload || {};
    const slug = req.query?.slug;

    if (slug) {
      const entry = (registry.templates || []).find(t => t.slug === slug);
      if (!entry) return res.status(404).json({ error: 'not-found', slug });
      return res.status(200).json(entry);
    }

    return res.status(200).json(registry);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
