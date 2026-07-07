// GET /api/dashboard/review-history?world=aom&project=space-rising[&limit=50]
//
// Returns the last N review decisions for the scoped project, newest first.
// Used by the Review tool's left-panel "Past decisions" history section (WD40-R4).
//
// Each item: { id, deliverable_id, title, action, notes, decided_at, project }
// action is one of: approve | request-changes | send-checklist
//
// Queries messages table (same table review-decision.js writes to):
//   source = 'review-decision', client_id = world, project = project (when given)
//
// Returns empty items [] when no decisions have been recorded yet — the UI section
// is hidden in that case (no-history = no section rendered).

import { createClient } from '@supabase/supabase-js';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { world, project } = req.query;
  if (!world || typeof world !== 'string') return res.status(400).json({ error: 'world required' });

  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  let q = supabase
    .from('messages')
    .select('id, text, metadata, project, timestamp')
    .eq('source', 'review-decision')
    .eq('client_id', world)
    .order('timestamp', { ascending: false })
    .limit(limit);

  // Scope to a specific project when given; omit to return all decisions across the world.
  if (project && typeof project === 'string') q = q.eq('project', project);

  const { data, error } = await q;
  if (error) {
    console.error('[review-history] Supabase error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }

  const items = (data || []).map((row) => {
    const meta = row.metadata || {};
    const did = String(meta.deliverable_id || '');
    const filename = did.split('/').filter(Boolean).pop() || did || 'Deliverable';
    return {
      id: row.id,
      deliverable_id: did,
      title: filename,
      action: meta.action || 'approve',
      notes: meta.notes || null,
      decided_at: meta.decided_at || row.timestamp,
      project: row.project || null,
    };
  });

  return res.status(200).json({ items });
}
