// useCampaign: data hooks for the Email > Campaign tool (corner:campaign-tool R6).
// Follows the useCommandTracker pattern: authFetch + world param + polling.
// Health polls FAST (5s, light payload) because the health strip is the
// product; detail polls at 20s. Nothing here touches the chat bridge.
//
// The endpoints read the campaignTruth lib on the server, not a database. The
// only gate here is "is someone signed in": a signed-out render-only page shows
// the honest not-configured state instead of firing tenant-gated reads.
import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';
import { hasSession } from '../../lib/convex.js';

async function getJson(url) {
  const r = await authFetch(url, { credentials: 'include' });
  if (!r || !r.ok) throw new Error(`fetch failed ${r && r.status}`);
  return r.json();
}

export function useCampaignList(worldId) {
  const [campaigns, setCampaigns] = useState(null); // null=loading, []=none
  const [campaignSetup, setCampaignSetup] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    if (!worldId) return;
    if (!hasSession()) {
      setCampaigns([]);
      setCampaignSetup({
        contract: 'corner.campaign_setup_truth.v1',
        status: 'not_configured',
        configured: false,
        campaign_count: 0,
        misfiled_count: 0,
        reason: 'local_render_signed_out',
      });
      setError(null);
      return;
    }
    getJson(`/api/dashboard/campaigns?world=${encodeURIComponent(worldId)}`)
      .then((d) => {
        setCampaigns(d.campaigns || []);
        setCampaignSetup(d.campaign_setup || null);
        setError(null);
      })
      .catch((e) => setError(String(e.message || e)));
  }, [worldId]);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  return { campaigns, campaignSetup, error, reload: load, localMode: !hasSession() };
}

export function useCampaignDetail(campaignId, worldId) {
  const [detail, setDetail] = useState(null); // {campaign, pipeline, stats, today}
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    if (!campaignId || !worldId) return;
    getJson(`/api/dashboard/campaigns?world=${encodeURIComponent(worldId)}&id=${campaignId}`)
      .then((d) => { setDetail(d); setError(null); })
      .catch((e) => setError(String(e.message || e)));
  }, [campaignId, worldId]);
  useEffect(() => {
    setDetail(null);
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  return { detail, error, reload: load };
}

export function useCampaignHealth(campaignId, worldId) {
  const [health, setHealth] = useState(null);
  const last = useRef('');
  const load = useCallback(() => {
    if (!campaignId || !worldId) return;
    getJson(`/api/dashboard/campaign-health?world=${encodeURIComponent(worldId)}&id=${campaignId}`)
      .then((d) => {
        const s = JSON.stringify(d.health);
        if (s !== last.current) { last.current = s; setHealth(d.health); }
      })
      .catch(() => {});
  }, [campaignId, worldId]);
  useEffect(() => {
    setHealth(null);
    last.current = '';
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  return { health, reload: load };
}

export function useCampaignContacts(campaignId, worldId, { stage, q, flagged, limit = 50 } = {}) {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const load = useCallback((off = 0, append = false) => {
    if (!campaignId || !worldId) return;
    const params = new URLSearchParams({ world: worldId, id: campaignId, limit: String(limit), offset: String(off) });
    if (stage) params.set('stage', stage);
    if (q) params.set('q', q);
    if (flagged) params.set('flagged', '1');
    getJson(`/api/dashboard/campaign-contacts?${params}`)
      .then((d) => {
        setRows((prev) => (append && prev ? [...prev, ...d.contacts] : d.contacts));
        setTotal(d.total || 0);
        setOffset(off + (d.contacts || []).length);
      })
      .catch(() => {});
  }, [campaignId, worldId, stage, q, flagged, limit]);
  useEffect(() => { setRows(null); setOffset(0); load(0, false); }, [load]);
  const more = useCallback(() => load(offset, true), [load, offset]);
  return { rows, total, hasMore: rows ? rows.length < total : false, more, reload: () => load(0, false) };
}

export function useCityDetail(campaignId, worldId, contactId) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    if (!campaignId || !worldId || !contactId) return;
    let dead = false;
    getJson(`/api/dashboard/campaign-contacts?world=${encodeURIComponent(worldId)}&id=${campaignId}&contact=${contactId}`)
      .then((d) => { if (!dead) setData(d); })
      .catch(() => {});
    return () => { dead = true; };
  }, [campaignId, worldId, contactId]);
  return data; // {contact, events, sends}
}

export function useCampaignActivity(campaignId, worldId, limit = 25) {
  const [feed, setFeed] = useState(null);
  const load = useCallback(() => {
    if (!campaignId || !worldId) return;
    getJson(`/api/dashboard/campaign-activity?world=${encodeURIComponent(worldId)}&id=${campaignId}&limit=${limit}`)
      .then((d) => setFeed(d.feed || []))
      .catch(() => {});
  }, [campaignId, worldId, limit]);
  useEffect(() => {
    setFeed(null);
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  return { feed, reload: load };
}

// One-tap actions. Returns a runner: act('approve_batch', {batch_id}) -> Promise.
export function useCampaignActions(campaignId, worldId, onDone) {
  const [busy, setBusy] = useState(null); // op string while in flight
  const act = useCallback(async (op, extra = {}) => {
    if (!campaignId || !worldId) return null;
    setBusy(op);
    try {
      const r = await authFetch('/api/dashboard/campaign-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ world: worldId, id: campaignId, op, ...extra }),
      });
      const d = await r.json();
      if (onDone) onDone(op, d);
      return d;
    } finally {
      setBusy(null);
    }
  }, [campaignId, worldId, onDone]);
  return { act, busy };
}
