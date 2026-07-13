// /api/dashboard/campaign-health — corner:campaign-tool R3.
// The 5-second poll behind the health strip. Light payload, structured so the
// UI can compose the plain-words line and render exactly ONE fix action.
//   GET ?world=ben&id=<uuid>
//
// Status resolution (first match wins):
//   paused         campaign.status = paused                     -> action resume
//   problem        stored problem (dispatcher/watchdog wrote it) -> stored action
//   problem        next_run_at overdue >30min (computed live,
//                  works even if the watchdog itself is dead)    -> action run_now
//   waiting        today's batch awaiting_approval               -> action approve_batch
//   running        otherwise
//
// The engine writes health_problem_code/user_action/message; this endpoint is
// read-only and additionally catches "engine went silent" on its own.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OVERDUE_MS = 30 * 60 * 1000;

const ACTION_LABELS = {
  approve_batch: 'Send',
  reconnect_email: 'Reconnect',
  retry_batch: 'Retry',
  resume: 'Resume',
  run_now: 'Run now',
  review_flagged: 'Review',
};

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const requested = (typeof req.query.world === 'string' && req.query.world.trim()) || 'aom';
  let world;
  try {
    ({ tenant: world } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const r = await sb(
      `campaigns?id=eq.${id}&world=eq.${encodeURIComponent(world)}` +
      `&select=id,status,autopilot,daily_cap,health_status,health_problem_code,health_user_action,health_message,health_checked_at,last_run_at,last_result,next_run_at`
    );
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const rows = await r.json();
    if (!rows.length) return res.status(404).json({ error: 'campaign not found' });
    const c = rows[0];

    const br = await sb(
      `campaign_batches?campaign_id=eq.${id}&select=id,status,batch_date,contact_count,sent_count,failed_count,held_count,created_at&order=created_at.desc&limit=1`
    );
    const batch = br.ok ? (await br.json())[0] || null : null;

    const now = Date.now();
    let status = 'running';
    let problem = null;
    let action = null;

    if (c.status === 'paused' || c.status === 'draft' || c.status === 'closed') {
      status = 'paused';
      action = c.status === 'paused' ? { type: 'resume', label: ACTION_LABELS.resume } : null;
      problem = c.status === 'paused'
        ? { code: 'paused', label: 'Paused. Nothing will send until you resume.' }
        : { code: c.status, label: c.status === 'draft' ? 'Draft. Not launched yet.' : 'Campaign closed.' };
    } else if (c.health_status === 'problem' && c.health_problem_code) {
      status = 'problem';
      problem = { code: c.health_problem_code, label: c.health_message || 'Something needs attention.' };
      const t = c.health_user_action;
      action = t ? { type: t, label: ACTION_LABELS[t] || 'Fix' } : null;
    } else if (c.next_run_at && now - new Date(c.next_run_at).getTime() > OVERDUE_MS &&
               !(batch && (batch.status === 'sending' || batch.status === 'awaiting_approval'))) {
      // engine silent past its slot and no batch in flight/waiting: surface it
      status = 'problem';
      problem = {
        code: 'missed_run',
        label: 'Nothing went out at the scheduled time.',
      };
      action = { type: 'run_now', label: ACTION_LABELS.run_now };
    } else if (batch && batch.status === 'awaiting_approval') {
      status = 'waiting';
      problem = {
        code: 'batch_waiting_approval',
        label: `Today's batch of ${batch.contact_count} is ready and waiting on you.`,
      };
      action = { type: 'approve_batch', label: ACTION_LABELS.approve_batch };
    }

    return res.status(200).json({
      ok: true,
      health: {
        status,
        autopilot: !!c.autopilot,
        lastRun: c.last_run_at
          ? { at: c.last_run_at, result: c.last_result, sent: batch && batch.status === 'completed' ? batch.sent_count : null }
          : null,
        nextRun: c.next_run_at ? { at: c.next_run_at } : null,
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
