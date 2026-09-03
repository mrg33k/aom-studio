// /api/dashboard/campaign-actions
// Every user-tappable fix/control, idempotent, state-only (the engine script
// observes state and does the actual sending on its next tick):
//   POST {world, id, op, ...}
//     op=approve_batch  {batch_id?}   awaiting_approval -> approved (+run soon)
//     op=pause                        campaign active -> paused
//     op=resume                       paused -> active (+next_run recomputed)
//     op=autopilot      {enabled}     flip the autopilot flag
//     op=retry_batch    {batch_id?}   failed -> pending (+run soon)
//     op=run_now                      pull next_run_at to now
//     op=set_stage      {contact_id, stage, follow_up_due_at?, notes?}
//
// corner:retire-supabase (2026-09-03): campaigns live on Convex
// (campaigns:get / update / updateBatch / setContactStage / recordEvent).
// The scheduling and health fields the old columns held (next_run_at,
// autopilot, send_hour_local, health_*) live in the campaign's `settings`
// blob. Contact notes and follow-up dates live in keyed state per contact.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { requestedTenantFromCompat, sendTenantContextError } from '../_lib/tenantContext.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const STAGES = new Set(['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise']);

async function logEvent(campaignId, kind, summary, details = {}, contactId = null) {
  await convexMutation('campaigns:recordEvent', {
    campaignId,
    ...(contactId ? { contactId } : {}),
    kind,
    payload: { summary, details },
  });
}

async function patchSettings(campaign, patch, statusPatch) {
  const settings = { ...((campaign.settings && typeof campaign.settings === 'object') ? campaign.settings : {}), ...patch };
  await convexMutation('campaigns:update', { id: campaign._id, patch: { settings, ...(statusPatch ? { status: statusPatch } : {}) } });
  return settings;
}

const CLEAR_HEALTH = { health_status: 'running', health_problem_code: null, health_user_action: null, health_message: null };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const b = req.body || {};
  let world;
  let user = null;
  try {
    const requested = requestedTenantFromCompat({ query: req.query || {}, body: b });
    const auth = await verifyTenant(requested, req);
    world = auth.tenant;
    user = { id: auth.userId, email: auth.email || null };
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ ok: false, error: err.message });
    return sendTenantContextError(res, err);
  }

  const id = String(b.id || '');
  const op = String(b.op || '');
  if (!id || !op) return res.status(400).json({ error: 'id and op required' });

  try {
    const campaign = await convexQuery('campaigns:get', { id }).catch(() => null);
    if (!campaign) return res.status(404).json({ error: 'campaign not found' });
    // The campaign must belong to the verified world.
    const owner = await convexQuery('worlds:getBySlug', { slug: world }).catch(() => null);
    if (!owner || String(owner._id) !== String(campaign.worldId)) return res.status(404).json({ error: 'campaign not found' });

    const settings = (campaign.settings && typeof campaign.settings === 'object') ? campaign.settings : {};
    const batches = Array.isArray(campaign.batches) ? campaign.batches : [];
    const nowIso = new Date().toISOString();
    const who = (user && (user.email || user.id)) || 'dashboard';

    if (op === 'approve_batch') {
      const targets = batches.filter((batch) => batch.status === 'awaiting_approval' && (!b.batch_id || String(batch._id) === String(b.batch_id)));
      for (const batch of targets) await convexMutation('campaigns:updateBatch', { batchId: batch._id, status: 'approved' });
      if (targets.length) {
        await patchSettings(campaign, { next_run_at: nowIso, ...CLEAR_HEALTH, approved_by: who, approved_at: nowIso });
        await logEvent(campaign._id, 'batch_approved', `Batch approved (${targets[0].size} queued)`, { batch_id: targets[0]._id, by: who });
      }
      return res.status(200).json({ ok: true, approved: targets.length, batch: targets[0] || null });
    }

    if (op === 'pause') {
      if (campaign.status === 'running' || campaign.status === 'active') {
        await patchSettings(campaign, { paused_at: nowIso }, 'paused');
      }
      await logEvent(campaign._id, 'health', 'Campaign paused', { by: who });
      return res.status(200).json({ ok: true });
    }

    if (op === 'resume') {
      const next = new Date();
      const hourUtc = ((settings.send_hour_local ?? 7) + 7) % 24; // America/Phoenix, no DST
      if (next.getUTCHours() >= hourUtc) next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(hourUtc, 0, 0, 0);
      if (campaign.status === 'paused') {
        await patchSettings(campaign, { next_run_at: next.toISOString(), ...CLEAR_HEALTH }, 'running');
      }
      await logEvent(campaign._id, 'health', 'Campaign resumed', { by: who, next_run_at: next.toISOString() });
      return res.status(200).json({ ok: true, next_run_at: next.toISOString() });
    }

    if (op === 'autopilot') {
      await patchSettings(campaign, { autopilot: !!b.enabled });
      await logEvent(campaign._id, 'health', `Autopilot ${b.enabled ? 'on: batches send automatically' : 'off: batches wait for approval'}`, { by: who });
      return res.status(200).json({ ok: true, autopilot: !!b.enabled });
    }

    if (op === 'retry_batch') {
      const targets = batches.filter((batch) => batch.status === 'failed' && (!b.batch_id || String(batch._id) === String(b.batch_id)));
      const nextStatus = settings.autopilot ? 'approved' : 'awaiting_approval';
      for (const batch of targets) await convexMutation('campaigns:updateBatch', { batchId: batch._id, status: nextStatus });
      await patchSettings(campaign, { next_run_at: nowIso, ...CLEAR_HEALTH });
      await logEvent(campaign._id, 'health', 'Retry requested', { by: who, batches: targets.length });
      return res.status(200).json({ ok: true, retried: targets.length });
    }

    if (op === 'run_now') {
      if (campaign.status === 'running' || campaign.status === 'active') {
        await patchSettings(campaign, { next_run_at: nowIso, ...CLEAR_HEALTH });
      }
      await logEvent(campaign._id, 'health', 'Run now requested', { by: who });
      return res.status(200).json({ ok: true });
    }

    if (op === 'set_stage') {
      const stage = String(b.stage || '');
      if (!b.contact_id || !STAGES.has(stage)) {
        return res.status(400).json({ error: 'contact_id and valid stage required' });
      }
      const contacts = await convexQuery('campaigns:contacts', { id: campaign._id, limit: 100000 });
      const c = (contacts?.rows || []).find((row) => String(row._id) === String(b.contact_id));
      if (!c) return res.status(404).json({ error: 'contact not found' });
      await convexMutation('campaigns:setContactStage', { contactId: c._id, stage });
      // Notes and follow-up dates are not contact columns on Convex; keyed
      // state per contact carries them (campaign-contacts.js reads it back).
      if ('follow_up_due_at' in b || 'notes' in b) {
        const prior = await convexQuery('state:get', { kind: 'campaign_contact_notes', scopeId: String(c._id) }).catch(() => null);
        const value = { ...((prior && prior.value) || {}) };
        if ('follow_up_due_at' in b) value.follow_up_due_at = b.follow_up_due_at || null;
        if ('notes' in b) value.notes = b.notes || null;
        await convexMutation('state:put', { kind: 'campaign_contact_notes', scopeId: String(c._id), value, updatedBy: who });
      }
      const label = c.name || (c.fields && c.fields.city) || c.email || 'contact';
      await logEvent(campaign._id, 'stage_changed', `${label} moved to ${stage.replace('_', ' ')}`, { by: who, stage }, c._id);
      return res.status(200).json({ ok: true, contact: { ...c, id: c._id, stage } });
    }

    return res.status(400).json({ error: `unknown op ${op}` });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
