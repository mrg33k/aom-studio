// POST /api/support/wish - client submit (web form OR email watcher).
// Body: { email, name?, message, source?, recommendation?, reply_options? }  -> { ok, access_code, id, pipeline_ok }
// 1) create the wish (status=heard)  2) system "heard" update  3) drop the ask into the agent room.
//
// corner:retire-supabase (2026-09-03): the row goes to Convex support:create,
// the triage extras (recommendation, reply_options) to the wish meta store
// (see wishes.js), and the agent handoff is a messages:send into the support
// agent's room. Convex schedules the agent dispatch itself, so the old
// supabase-listener hop is gone.
import { requiredTenantFromEnv } from '../_lib/tenantContext.js';
import { convexMutation } from '../_lib/verifyTenant.js';
import { addWishUpdate, patchWishMeta, setWishStatus } from './wishes.js';

const SUPPORT_AGENT = process.env.SUPPORT_AGENT_SLUG || 'elon';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Internal-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const { email, name, message, source, recommendation, reply_options } = body;
  if (!email || !message) return res.status(400).json({ ok: false, error: 'email and message required' });
  let tenantId;
  try {
    tenantId = requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']);
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message || 'tenant not configured' });
  }

  let created;
  try {
    created = await convexMutation('support:create', {
      email: String(email).trim(),
      name: name ? String(name) : undefined,
      message: String(message),
      source: source || 'web',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
  const wishId = String(created.id);
  const access_code = created.accessCode;

  // support:create starts a wish at "new"; the board vocabulary is "heard".
  await setWishStatus(wishId, 'heard').catch(() => {});
  await addWishUpdate(wishId, { kind: 'status_change', body: '', status: 'heard', author: 'system', visible: true }).catch(() => {});
  if (recommendation || reply_options) {
    await patchWishMeta(wishId, {
      ...(recommendation ? { recommendation } : {}),
      ...(reply_options ? { reply_options } : {}),
    }).catch(() => {});
  }

  // Drop the ask into the support agent's room. Convex dispatches the agent
  // from there (messages:send schedules ai.dispatchMessage).
  let pipeline_ok = false;
  try {
    await convexMutation('messages:send', {
      roomId: `${tenantId}:agent:${SUPPORT_AGENT}`,
      clientId: tenantId,
      role: 'user',
      source: 'support-desk',
      userName: name || String(email),
      text: `[SUPPORT WISH ${access_code}] from ${name || email} <${email}> (${source || 'web'}):\n\n${message}`,
      metadata: {
        mission_slug: 'corner:support-desk',
        support_wish_id: wishId,
        support_access_code: access_code,
        support_email: email,
        support_source: source || 'web',
      },
    });
    pipeline_ok = true;
  } catch (e) {
    console.warn('[support/wish] agent drop failed:', e?.message || e);
  }

  return res.status(200).json({ ok: true, access_code, id: wishId, pipeline_ok });
}
