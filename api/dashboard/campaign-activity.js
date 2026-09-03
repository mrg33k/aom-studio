// /api/dashboard/campaign-activity
// RECENT feed for a campaign's mission-control screen.
//   GET ?world=&id=&limit=20&offset=0
// Noise (run_started/run_finished heartbeats) is filtered out; the feed shows
// human-meaningful events only.
//
// corner:retire-supabase (2026-09-03): events come from campaigns:events on
// Convex. Each row's `payload` carries { summary, details } as written by
// campaign-actions.js and campaigns.js.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { requestedTenantFromCompat, sendTenantContextError } from '../_lib/tenantContext.js';
import { convexQuery } from '../_lib/reportsStore.js';

const FEED_KINDS = new Set(['sent', 'replied', 'bounced', 'flagged', 'stage_changed', 'batch_prepared', 'batch_approved', 'batch_sent', 'health', 'import', 'open', 'click', 'reply', 'bounce']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  let world;
  try {
    const requested = requestedTenantFromCompat({ query: req.query || {}, body: req.body || {} });
    ({ tenant: world } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ ok: false, error: err.message });
    return sendTenantContextError(res, err);
  }

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id required' });
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    const campaign = await convexQuery('campaigns:get', { id }).catch(() => null);
    const owner = campaign ? await convexQuery('worlds:getBySlug', { slug: world }).catch(() => null) : null;
    if (!campaign || !owner || String(owner._id) !== String(campaign.worldId)) return res.status(404).json({ error: 'campaign not found' });

    const rows = await convexQuery('campaigns:events', { id: campaign._id, limit: 1000 });
    const all = (Array.isArray(rows) ? rows : [])
      .filter((e) => FEED_KINDS.has(e.kind))
      .map((e) => ({
        id: e._id,
        kind: e.kind,
        summary: e.payload?.summary || e.kind,
        details: e.payload?.details || {},
        contact_id: e.contactId || null,
        created_at: new Date(e.createdAt).toISOString(),
      }));
    const feed = all.slice(offset, offset + limit);
    return res.status(200).json({
      ok: true,
      tenant_id: world,
      feed,
      hasMore: offset + feed.length < all.length,
    });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
