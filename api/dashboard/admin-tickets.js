// GET /api/dashboard/admin-tickets
//
// Read-only bridge to the Space Rising live ticket tracker (admin_tickets in the
// sourcing-directory Supabase). The Tracker tool on the dashboard renders this
// data in OUR CV6 design — we only pull the data, not Space Rising's styling.
//
// admin_tickets is admin-only (RLS denies anon/authenticated); only the
// service-role key can read it, so this endpoint queries server-side with the
// service key and returns a clean, minimal shape. No writes here — read only.
//
// Env:
//   SOURCING_SUPABASE_URL          (default https://kzzvjtthknsozktmpvak.supabase.co)
//   SOURCING_SUPABASE_SERVICE_KEY  (service-role JWT — required, never in git)
//
// Query: ?status=needs_fix,working   (optional comma list filter)
//
// SECURITY (corner:tenant-isolation R1): this reads the Space Rising ticket
// tracker. Space Rising is the 'space-rising' project (arsenal-held, with
// project_access grants). Access is gated by verifyProjectAccess('space-rising')
// so only the super-admin, the holder world, and granted worlds may read it —
// it was previously unauthenticated and returned Space Rising tickets to anyone.

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';

const DEFAULT_URL = 'https://kzzvjtthknsozktmpvak.supabase.co';
const VALID_STATUS = new Set(['needs_fix', 'working', 'in_review', 'done']);
const TICKETS_PROJECT = 'space-rising';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Only callers entitled to the Space Rising project may read its tickets.
  try {
    await verifyProjectAccess(TICKETS_PROJECT, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message, tickets: [] });
    return res.status(500).json({ error: 'Auth verification failed', tickets: [] });
  }

  const SUPABASE_URL = process.env.SOURCING_SUPABASE_URL || DEFAULT_URL;
  const SERVICE_KEY = process.env.SOURCING_SUPABASE_SERVICE_KEY;
  if (!SERVICE_KEY) {
    return res.status(503).json({
      error: 'tracker bridge not configured',
      detail: 'SOURCING_SUPABASE_SERVICE_KEY is not set on this deployment.',
      tickets: [],
    });
  }

  // Optional status filter (comma-separated, validated against the known set).
  const statusParam = (req.query?.status || '').toString().trim();
  const statuses = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter((s) => VALID_STATUS.has(s))
    : [];

  // Build the PostgREST query. Newest-touched first.
  const cols = 'id,title,description,status,priority,assigned_to,area,link,updated_at,created_at';
  let url = `${SUPABASE_URL}/rest/v1/admin_tickets?select=${cols}&order=updated_at.desc`;
  if (statuses.length === 1) {
    url += `&status=eq.${encodeURIComponent(statuses[0])}`;
  } else if (statuses.length > 1) {
    url += `&status=in.(${statuses.map((s) => encodeURIComponent(s)).join(',')})`;
  }

  try {
    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'User-Agent': 'aom-dashboard-tracker',
      },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return res.status(502).json({ error: 'sourcing supabase error', status: r.status, detail: body.slice(0, 300), tickets: [] });
    }
    const rows = await r.json();
    const tickets = (Array.isArray(rows) ? rows : []).map((t) => ({
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'needs_fix',
      priority: t.priority || 'medium',
      owner: t.assigned_to || '',
      area: t.area || '',
      link: t.link || '',
      updatedAt: t.updated_at || t.created_at || null,
    }));
    return res.status(200).json({ tickets, count: tickets.length });
  } catch (err) {
    return res.status(500).json({ error: 'failed to reach sourcing supabase', detail: String(err).slice(0, 200), tickets: [] });
  }
}
