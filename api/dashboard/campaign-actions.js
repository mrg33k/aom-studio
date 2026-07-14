// /api/dashboard/campaign-actions — corner:campaign-tool R3.
// Every user-tappable fix/control, idempotent, DB-state-only (the engine
// script observes state and does the actual sending on its next tick):
//   POST {world, id, op, ...}
//     op=approve_batch  {batch_id?}   awaiting_approval -> approved (+run soon)
//     op=pause                        campaign active -> paused
//     op=resume                       paused -> active (+next_run recomputed)
//     op=autopilot      {enabled}     flip the autopilot flag
//     op=retry_batch    {batch_id?}   failed -> pending (+run soon)
//     op=run_now                      pull next_run_at to now
//     op=set_stage      {contact_id, stage, follow_up_due_at?, notes?}
//
// "run soon": the dispatcher routine ticks every few minutes; actions set
// next_run_at=now so the next tick picks the campaign up.

import { resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STAGES = new Set(['to_contact', 'contacted', 'replied', 'call_set', 'won', 'lost', 'bounced', 'noise']);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

function restIn(values) {
  return (values || []).map(value => encodeURIComponent(String(value))).join(',');
}

async function logEvent(campaignId, world, kind, summary, details = {}, contactId = null) {
  await sb('campaign_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      campaign_id: campaignId,
      contact_id: contactId,
      world,
      kind,
      summary,
      details,
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const b = req.body || {};
  let tenantContext;
  let world;
  let user = null;
  try {
    tenantContext = await resolveTenantContext(req, { body: b });
    world = tenantContext.tenantId;
    user = tenantContext.userId ? { id: tenantContext.userId } : null;
  } catch (err) {
    return sendTenantContextError(res, err);
  }
  const campaignWorlds = tenantContext.aliases?.length ? tenantContext.aliases : [world];
  const campaignWorldFilter = `world=in.(${restIn(campaignWorlds)})`;

  const id = String(b.id || '');
  const op = String(b.op || '');
  if (!id || !op) return res.status(400).json({ error: 'id and op required' });

  try {
    const cr = await sb(`campaigns?id=eq.${id}&${campaignWorldFilter}&select=id,status,autopilot,send_hour_local`);
    if (!cr.ok) return res.status(cr.status).json({ error: await cr.text() });
    const campaigns = await cr.json();
    if (!campaigns.length) return res.status(404).json({ error: 'campaign not found' });
    const campaign = campaigns[0];
    const nowIso = new Date().toISOString();
    const who = (user && (user.email || user.id)) || 'dashboard';

    if (op === 'approve_batch') {
      const filter = b.batch_id
        ? `id=eq.${b.batch_id}&campaign_id=eq.${id}`
        : `campaign_id=eq.${id}&status=eq.awaiting_approval`;
      const r = await sb(`campaign_batches?${filter}&status=eq.awaiting_approval`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', approved_by: who, approved_at: nowIso }),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      if (rows.length) {
        await sb(`campaigns?id=eq.${id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({ next_run_at: nowIso, health_status: 'running', health_problem_code: null, health_user_action: null, health_message: null, updated_at: nowIso }),
        });
        await logEvent(id, world, 'batch_approved', `Batch approved (${rows[0].contact_count} queued)`, { batch_id: rows[0].id, by: who });
      }
      return res.status(200).json({ ok: true, approved: rows.length, batch: rows[0] || null });
    }

    if (op === 'pause') {
      await sb(`campaigns?id=eq.${id}&status=eq.active`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ status: 'paused', updated_at: nowIso }),
      });
      await logEvent(id, world, 'health', 'Campaign paused', { by: who });
      return res.status(200).json({ ok: true });
    }

    if (op === 'resume') {
      const next = new Date();
      const hourUtc = ((campaign.send_hour_local ?? 7) + 7) % 24; // America/Phoenix
      if (next.getUTCHours() >= hourUtc) next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(hourUtc, 0, 0, 0);
      await sb(`campaigns?id=eq.${id}&status=eq.paused`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: 'active',
          next_run_at: next.toISOString(),
          health_status: 'running',
          health_problem_code: null,
          health_user_action: null,
          health_message: null,
          updated_at: nowIso,
        }),
      });
      await logEvent(id, world, 'health', 'Campaign resumed', { by: who, next_run_at: next.toISOString() });
      return res.status(200).json({ ok: true, next_run_at: next.toISOString() });
    }

    if (op === 'autopilot') {
      await sb(`campaigns?id=eq.${id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ autopilot: !!b.enabled, updated_at: nowIso }),
      });
      await logEvent(id, world, 'health', `Autopilot ${b.enabled ? 'on: batches send automatically' : 'off: batches wait for approval'}`, { by: who });
      return res.status(200).json({ ok: true, autopilot: !!b.enabled });
    }

    if (op === 'retry_batch') {
      const filter = b.batch_id
        ? `id=eq.${b.batch_id}&campaign_id=eq.${id}`
        : `campaign_id=eq.${id}&status=eq.failed`;
      const r = await sb(`campaign_batches?${filter}&status=eq.failed`, {
        method: 'PATCH',
        body: JSON.stringify({ status: campaign.autopilot ? 'approved' : 'awaiting_approval', error_message: null }),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      await sb(`campaigns?id=eq.${id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ next_run_at: nowIso, health_status: 'running', health_problem_code: null, health_user_action: null, health_message: null, updated_at: nowIso }),
      });
      await logEvent(id, world, 'health', 'Retry requested', { by: who, batches: rows.length });
      return res.status(200).json({ ok: true, retried: rows.length });
    }

    if (op === 'run_now') {
      await sb(`campaigns?id=eq.${id}&status=eq.active`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ next_run_at: nowIso, health_status: 'running', health_problem_code: null, health_user_action: null, health_message: null, updated_at: nowIso }),
      });
      await logEvent(id, world, 'health', 'Run now requested', { by: who });
      return res.status(200).json({ ok: true });
    }

    if (op === 'set_stage') {
      const stage = String(b.stage || '');
      if (!b.contact_id || !STAGES.has(stage)) {
        return res.status(400).json({ error: 'contact_id and valid stage required' });
      }
      const patch = { stage, updated_at: nowIso };
      if ('follow_up_due_at' in b) patch.follow_up_due_at = b.follow_up_due_at || null;
      if ('notes' in b) patch.notes = b.notes || null;
      const r = await sb(`campaign_contacts?id=eq.${b.contact_id}&campaign_id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const rows = await r.json();
      if (!rows.length) return res.status(404).json({ error: 'contact not found' });
      const c = rows[0];
      const label = c.name || (c.merge_fields && c.merge_fields.city) || c.email || 'contact';
      await logEvent(id, world, 'stage_changed', `${label} moved to ${stage.replace('_', ' ')}`, { by: who, stage }, c.id);
      return res.status(200).json({ ok: true, contact: c });
    }

    return res.status(400).json({ error: `unknown op ${op}` });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
