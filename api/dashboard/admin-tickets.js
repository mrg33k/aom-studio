// GET /api/dashboard/admin-tickets
//
// Read-only feed for the Space Rising ticket tracker, rendered in OUR CV6
// design by the Tracker tool (HomeView, useCommandTracker).
//
// corner:retire-supabase (2026-09-03): this used to read the admin_tickets
// table in a SECOND Supabase project (the sourcing directory). Supabase is
// retired, and Space Rising is a separate product, so the dashboard no longer
// reaches into its database. The tickets shown here come from the keyed state
// row `admin-tickets` on Convex (state:get), which a sync script or a person
// can fill. Nothing stored yet reads as an empty tracker, not an error.
//
// Stored shape (state kind "admin-tickets", value):
//   { tickets: [ { id, title, description, status, priority, owner, area, link, updatedAt } ] }
//   or a bare array of the same rows.
//
// Query: ?status=needs_fix,working   (optional comma list filter)
//
// SECURITY: Space Rising is the 'space-rising' project (arsenal-held, with
// project access grants). Access is gated by verifyProjectAccess('space-rising')
// so only the super-admin, the holder world, and granted worlds may read it.

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

const VALID_STATUS = new Set(['needs_fix', 'working', 'in_review', 'done']);
const TICKETS_PROJECT = 'space-rising';
const STATE_KEY = 'admin-tickets';

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

  // Optional status filter (comma-separated, validated against the known set).
  const statusParam = (req.query?.status || '').toString().trim();
  const statuses = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter((s) => VALID_STATUS.has(s))
    : [];

  try {
    const stored = await convexQuery('state:get', { key: STATE_KEY });
    const raw = Array.isArray(stored) ? stored : (Array.isArray(stored?.tickets) ? stored.tickets : []);
    let tickets = raw.map((t) => ({
      id: t.id,
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'needs_fix',
      priority: t.priority || 'medium',
      owner: t.owner || t.assigned_to || '',
      area: t.area || '',
      link: t.link || '',
      updatedAt: t.updatedAt || t.updated_at || t.created_at || null,
    }));
    if (statuses.length) {
      const allow = new Set(statuses);
      tickets = tickets.filter((t) => allow.has(t.status));
    }
    // Newest-touched first.
    tickets.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return res.status(200).json({ tickets, count: tickets.length, source: 'convex:state/admin-tickets' });
  } catch (err) {
    return res.status(500).json({ error: 'failed to read tickets', detail: String(err?.message || err).slice(0, 200), tickets: [] });
  }
}
