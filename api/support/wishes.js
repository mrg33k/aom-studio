// /api/support/wishes
// Service-role CRUD for support_wishes (+ updates timeline). No client Supabase auth.
//   GET    /api/support/wishes                  → admin list (newest first, optional ?status=)
//   GET    /api/support/wishes?access_code=XXX  → client status lookup (wish + visible updates)
//   PATCH  /api/support/wishes?id=...           → { status?, response?, author? }

import { requiredTenantFromEnv, resolveTenantContext, TenantContextError } from '../_lib/tenantContext.js';
import { TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INTERNAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.SUPPORT_SITE_BASE || 'https://www.aheadofmarket.com';
const MAIL_CONNECTION = process.env.SUPPORT_MAIL_CONNECTION || 'f5f939e1-0fdf-4bac-8c88-6de76df751a5';

function supa(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

const CLIENT_LABEL = { heard: 'Heard', working: 'Working', needs_team: 'With the AOM team', resolved: 'Resolved' };

const SIGN_OFF = `<br><br>&mdash; AOM Front Desk Team`;

async function sendClientEmail(to, name, subject, bodyHtml) {
  const r = await fetch(`${SITE}/api/internal/mail/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
    body: JSON.stringify({
      connection_id: MAIL_CONNECTION,
      to: [{ name: name || undefined, email: to }],
      subject,
      bodyHtml: `${bodyHtml}${SIGN_OFF}`, // Front Desk Team sign-off in the body; default Gmail sig also kept
    }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ ok: false, error: 'Service unavailable' });

  if (req.method === 'GET') {
    const { access_code, status } = req.query;
    if (access_code) {
      const code = encodeURIComponent(access_code.trim().toUpperCase());
      const wr = await supa(`support_wishes?select=*&access_code=eq.${code}`);
      const wishes = await wr.json();
      if (!wishes || wishes.length === 0) return res.status(404).json({ ok: false, error: 'Not found' });
      const wish = wishes[0];
      const ur = await supa(`support_wish_updates?select=*&wish_id=eq.${wish.id}&visible_to_client=eq.true&order=created_at.asc`);
      const updates = await ur.json();
      return res.status(200).json({ ok: true, wish, updates, status_label: CLIENT_LABEL[wish.status] || wish.status });
    }
    // Tenant scope (corner:support R3 + security-sweep 2026-08-10). Support
    // intake is single-tenant today: the watcher reads only the configured
    // support mailboxes, so every wish row is that tenant's and the table has no
    // world column yet. The admin list carries client PII (email, name, message)
    // plus the secret access_code, so EVERY caller of this path must now prove a
    // verified session entitled to the requested world — a JWT-less request used
    // to be pinned to the support tenant and handed the whole table (the leak
    // this closes; same class as the finance breach). A verified non-support
    // world gets an honestly empty list; it must never see the support desk. The
    // client status lookup (?access_code above) is unaffected — that path proves
    // possession of the row's own secret. When a second tenant gets a support
    // intake, add a world column and filter here.
    const supportTenant = requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']);
    const world = (typeof req.query.world === 'string' && req.query.world.trim().toLowerCase()) || supportTenant;
    let tctx;
    try {
      tctx = await resolveTenantContext(req, { fallback: world });
    } catch (err) {
      if (err instanceof TenantAuthError || err instanceof TenantContextError) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      throw err;
    }
    if (tctx.tenantId !== supportTenant) {
      return res.status(200).json({ ok: true, wishes: [] });
    }
    // Default admin list = real asks only. dismissed/spam stay out unless asked
    // for explicitly (?status=spam), and the noise gate below drops blasts that
    // predate the watcher's spam gate ("filter way better", Patrik 2026-07-01).
    const statusFilter = status
      ? `&status=eq.${encodeURIComponent(status)}`
      : '&status=in.(heard,working,needs_team,resolved)';
    const r = await supa(`support_wishes?select=*&order=created_at.desc${statusFilter}`);
    const data = await r.json();
    // Attach each wish's latest response inline so the board can show "what we
    // said back" without a per-row fetch. One batched query over the response
    // updates, newest-per-wish wins.
    const wishes = Array.isArray(data) ? data : [];
    if (wishes.length) {
      try {
        const ids = wishes.map((w) => w.id).filter(Boolean);
        if (ids.length) {
          const inList = `(${ids.map((x) => `"${x}"`).join(',')})`;
          const rr = await supa(`support_wish_updates?select=wish_id,body,created_at&kind=eq.response&wish_id=in.${encodeURIComponent(inList)}&order=created_at.desc`);
          const ups = await rr.json();
          const latest = {};
          const earliest = {};
          for (const u of Array.isArray(ups) ? ups : []) {
            if (u.wish_id && !latest[u.wish_id]) latest[u.wish_id] = { body: u.body || '', created_at: u.created_at };
            if (u.wish_id) earliest[u.wish_id] = u.created_at; // desc order → last seen = first response
          }
          for (const w of wishes) w.latest_response = latest[w.id] || null;
          // Reply-time truth (M27): first_response_at column wins (stamped by every
          // send path going forward); fall back to the earliest response update for
          // rows the backfill hasn't touched. latency_seconds = ask → first reply.
          for (const w of wishes) {
            w.first_response_at = w.first_response_at || earliest[w.id] || null;
            w.latency_seconds = (w.first_response_at && w.created_at)
              ? Math.max(0, Math.round((new Date(w.first_response_at) - new Date(w.created_at)) / 1000))
              : null;
          }
          // Also flag the 10-min holding note (soft_ack) so the board shows "we replied
          // automatically" at a glance. Newest soft_ack per wish wins.
          const sr = await supa(`support_wish_updates?select=wish_id,created_at&kind=eq.soft_ack&wish_id=in.${encodeURIComponent(inList)}&order=created_at.desc`);
          const sups = await sr.json();
          const softAck = {};
          for (const u of Array.isArray(sups) ? sups : []) {
            if (u.wish_id && !softAck[u.wish_id]) softAck[u.wish_id] = u.created_at;
          }
          for (const w of wishes) w.soft_ack_at = softAck[w.id] || null;
        }
      } catch { /* enrichment is best-effort; board still renders without it */ }
    }
    // Parse JSON fields (recommendation, reply_options, agent_read) so they're objects on the client
    for (const w of wishes) {
      if (w.recommendation && typeof w.recommendation === 'string') {
        try { w.recommendation = JSON.parse(w.recommendation); } catch { w.recommendation = null; }
      }
      if (w.reply_options && typeof w.reply_options === 'string') {
        try { w.reply_options = JSON.parse(w.reply_options); } catch { w.reply_options = null; }
      }
      if (w.agent_read && typeof w.agent_read === 'string') {
        try { w.agent_read = JSON.parse(w.agent_read); } catch { w.agent_read = null; }
      }
    }
    // Noise gate on DISPLAY only: blasts that became wishes before the watcher's
    // spam gate existed (or slipped it) don't render as asks. The rows are left
    // untouched — a false positive here costs one list slot, never the wish
    // (loosen mailNoise.js and it reappears). ?include_noise=1 shows everything.
    let filtered = wishes;
    if (req.query.include_noise !== '1' && status !== 'spam') {
      const { isNoiseMail, getKnownSenders, isKnownSender, isBlockedSender } = await import('../_lib/mailNoise.js');
      const lists = await getKnownSenders();
      filtered = wishes.filter((w) => !isNoiseMail(w.email, '', w.message || '', {
        knownSender: isKnownSender(w.email, lists),
        blockedSender: isBlockedSender(w.email, lists),
      }).noisy);
    }
    return res.status(200).json({ ok: true, wishes: filtered });
  }

  if (req.method === 'PATCH') {
    // Admin write (status change + client email send). Same gate as the admin
    // list: was fully open, so anyone could rewrite a wish's status and trigger
    // an outbound email carrying arbitrary text to the client's address. Require
    // a verified session entitled to the support tenant.
    const supportTenant = requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']);
    let patchCtx;
    try {
      patchCtx = await resolveTenantContext(req, { fallback: supportTenant });
    } catch (err) {
      if (err instanceof TenantAuthError || err instanceof TenantContextError) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      throw err;
    }
    if (patchCtx.tenantId !== supportTenant) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });
    const { status, response, author } = req.body || {};
    const wr = await supa(`support_wishes?select=*&id=eq.${id}`);
    const found = await wr.json();
    if (!found || found.length === 0) return res.status(404).json({ ok: false, error: 'Not found' });
    const wish = found[0];

    if (response) {
      await supa('support_wish_updates', { method: 'POST', body: JSON.stringify({
        wish_id: id, kind: 'response', body: response, author: author || 'dashboard', visible_to_client: true }) });
      // First reply stamps the latency clock (only fills once — is.null guard).
      await supa(`support_wishes?id=eq.${id}&first_response_at=is.null`, { method: 'PATCH',
        body: JSON.stringify({ first_response_at: new Date().toISOString() }) }).catch(() => {});
      const subject = `Re: your message to AOM`;
      const html = `<p>Hi${wish.name ? ' ' + wish.name : ''},</p><p>${response}</p>` +
        `<p>You can check the status anytime: <a href="${SITE}/support?code=${wish.access_code}">${SITE}/support?code=${wish.access_code}</a></p>`;
      await sendClientEmail(wish.email, wish.name, subject, html);
    }

    const newStatus = status || (response ? 'resolved' : wish.status);
    if (newStatus !== wish.status) {
      await supa('support_wish_updates', { method: 'POST', body: JSON.stringify({
        wish_id: id, kind: 'status_change', status: newStatus, author: author || 'dashboard',
        visible_to_client: true }) });
    }
    const upd = await supa(`support_wishes?id=eq.${id}`, { method: 'PATCH',
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }) });
    const row = (await upd.json())[0];
    return res.status(200).json({ ok: true, wish: row });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
