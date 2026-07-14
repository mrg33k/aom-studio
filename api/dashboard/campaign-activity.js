// /api/dashboard/campaign-activity — corner:campaign-tool R3.
// RECENT feed for a campaign's mission-control screen.
//   GET ?world=&id=&limit=20&offset=0
// Noise (run_started/run_finished heartbeats) is filtered out; the feed shows
// human-meaningful events only.

import { resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FEED_KINDS = 'in.(sent,replied,bounced,flagged,stage_changed,batch_prepared,batch_approved,batch_sent,health,import)';

function restIn(values) {
  return (values || []).map(value => encodeURIComponent(String(value))).join(',');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  let tenantContext;
  let world;
  try {
    tenantContext = await resolveTenantContext(req);
    world = tenantContext.tenantId;
  } catch (err) {
    return sendTenantContextError(res, err);
  }
  const campaignWorlds = tenantContext.aliases?.length ? tenantContext.aliases : [world];

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id required' });
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/campaign_events?campaign_id=eq.${id}&world=in.(${restIn(campaignWorlds)})` +
        `&kind=${FEED_KINDS}&select=id,kind,summary,details,contact_id,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'count=exact',
        },
      }
    );
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const feed = await r.json();
    const range = r.headers.get('content-range') || '';
    const total = parseInt(range.split('/')[1], 10);
    return res.status(200).json({
      ok: true,
      tenant_id: world,
      feed,
      hasMore: Number.isFinite(total) ? offset + feed.length < total : false,
    });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
