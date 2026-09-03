// /api/dashboard/campaign-health
// The 5-second poll behind the health strip. Light payload, structured so the
// UI can compose the plain-words line and render exactly ONE fix action.
//   GET ?world=ben&id=<id>
//
// Status resolution (first match wins):
//   paused         campaign.status = paused                     -> action resume
//   problem        stored problem (dispatcher/watchdog wrote it) -> stored action
//   problem        next_run_at overdue >30min (computed live,
//                  works even if the watchdog itself is dead)    -> action run_now
//   waiting        today's batch awaiting_approval               -> action approve_batch
//   running        otherwise
//
// corner:retire-supabase (2026-09-03): the campaign and its batches come from
// campaigns:get on Convex. The engine writes health_* and run fields into the
// campaign's `settings` blob; this endpoint is read-only.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { requestedTenantFromCompat, sendTenantContextError } from '../_lib/tenantContext.js';
import { convexQuery } from '../_lib/reportsStore.js';

const OVERDUE_MS = 30 * 60 * 1000;

const ACTION_LABELS = {
  approve_batch: 'Send',
  reconnect_email: 'Reconnect',
  retry_batch: 'Retry',
  resume: 'Resume',
  run_now: 'Run now',
  review_flagged: 'Review',
};

function shapeBatch(batch) {
  if (!batch) return null;
  return {
    id: batch._id,
    status: batch.status,
    batch_date: batch.scheduledFor ? new Date(batch.scheduledFor).toISOString().slice(0, 10) : null,
    contact_count: batch.size,
    sent_count: batch.sent_count ?? null,
    failed_count: batch.failed_count ?? null,
    held_count: batch.held_count ?? null,
    created_at: new Date(batch.createdAt).toISOString(),
  };
}

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

  try {
    const c = await convexQuery('campaigns:get', { id }).catch(() => null);
    const owner = c ? await convexQuery('worlds:getBySlug', { slug: world }).catch(() => null) : null;
    if (!c || !owner || String(owner._id) !== String(c.worldId)) return res.status(404).json({ error: 'campaign not found' });

    const s = (c.settings && typeof c.settings === 'object') ? c.settings : {};
    const batch = shapeBatch((Array.isArray(c.batches) ? c.batches : [])[0] || null);

    const now = Date.now();
    let status = 'running';
    let problem = null;
    let action = null;

    if (c.status === 'paused' || c.status === 'draft' || c.status === 'closed' || c.status === 'done') {
      status = 'paused';
      action = c.status === 'paused' ? { type: 'resume', label: ACTION_LABELS.resume } : null;
      problem = c.status === 'paused'
        ? { code: 'paused', label: 'Paused. Nothing will send until you resume.' }
        : { code: c.status, label: c.status === 'draft' ? 'Draft. Not launched yet.' : 'Campaign closed.' };
    } else if (s.health_status === 'problem' && s.health_problem_code) {
      status = 'problem';
      problem = { code: s.health_problem_code, label: s.health_message || 'Something needs attention.' };
      const t = s.health_user_action;
      action = t ? { type: t, label: ACTION_LABELS[t] || 'Fix' } : null;
    } else if (s.next_run_at && now - new Date(s.next_run_at).getTime() > OVERDUE_MS &&
               !(batch && (batch.status === 'sending' || batch.status === 'awaiting_approval'))) {
      // engine silent past its slot and no batch in flight/waiting: surface it
      status = 'problem';
      problem = { code: 'missed_run', label: 'Nothing went out at the scheduled time.' };
      action = { type: 'run_now', label: ACTION_LABELS.run_now };
    } else if (batch && batch.status === 'awaiting_approval') {
      status = 'waiting';
      problem = { code: 'batch_waiting_approval', label: `Today's batch of ${batch.contact_count} is ready and waiting on you.` };
      action = { type: 'approve_batch', label: ACTION_LABELS.approve_batch };
    }

    return res.status(200).json({
      ok: true,
      tenant_id: world,
      health: {
        status,
        autopilot: !!s.autopilot,
        lastRun: s.last_run_at
          ? { at: s.last_run_at, result: s.last_result || null, sent: batch && batch.status === 'completed' ? batch.sent_count : null }
          : null,
        nextRun: s.next_run_at ? { at: s.next_run_at } : null,
        batch,
        problem,
        action,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
}
