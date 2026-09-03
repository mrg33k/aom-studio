// GET /api/dashboard/review-history?world=aom&project=space-rising[&limit=50]
//
// Returns the last N review decisions for the scoped project, newest first.
// Used by the Review tool's left-panel "Past decisions" history section (WD40-R4).
//
// Each item: { id, deliverable_id, title, action, notes, decided_at, project }
// action is one of: approve | request-changes | send-checklist | dismiss
//
// corner:retire-supabase (2026-09-03): reads the Convex messages table through
// messages:findBySource (source 'review-decision', the rows review-decision.js
// writes), scoped to the world and optionally the project room. Was the
// Supabase messages table. A dismiss that was undone is marked
// metadata.undone (there is no row delete on Convex) and is skipped here.
//
// Returns empty items [] when no decisions have been recorded yet. The UI
// section is hidden in that case (no-history = no section rendered).

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { world, project } = req.query;
  if (!world || typeof world !== 'string') return res.status(400).json({ error: 'world required' });

  let verified;
  try {
    verified = await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  let rows;
  try {
    rows = await convexQuery('messages:findBySource', {
      worldId: verified.tenant,
      source: 'review-decision',
      // Scope to a specific project when given; omit to return all decisions across the world.
      ...(project && typeof project === 'string' ? { project } : {}),
      limit,
    });
  } catch (err) {
    console.error('[review-history] Convex error:', err);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }

  const items = (Array.isArray(rows) ? rows : [])
    .filter((row) => !(row.metadata && row.metadata.undone))
    .map((row) => {
      const meta = row.metadata || {};
      const did = String(meta.deliverable_id || '');
      const filename = did.split('/').filter(Boolean).pop() || did || 'Deliverable';
      return {
        id: row._id,
        deliverable_id: did,
        title: filename,
        action: meta.action || 'approve',
        notes: meta.notes || null,
        decided_at: meta.decided_at || new Date(row.createdAt || Date.now()).toISOString(),
        project: meta.project || (project && typeof project === 'string' ? project : null),
      };
    });

  return res.status(200).json({ items });
}
