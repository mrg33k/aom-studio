// /api/support/wishes
// Service-role CRUD for support_wishes (+ updates timeline). No client Supabase auth.
//   GET    /api/support/wishes                  → admin list (newest first, optional ?status=)
//   GET    /api/support/wishes?access_code=XXX  → client status lookup (wish + visible updates)
//   PATCH  /api/support/wishes?id=...           → { status?, response?, author? }

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
      bodyHtml: `${bodyHtml}${SIGN_OFF}`,
      includeSignature: false, // sign explicitly as the Front Desk Team, no account-default sig
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
    const statusFilter = status ? `&status=eq.${encodeURIComponent(status)}` : '';
    const r = await supa(`support_wishes?select=*&order=created_at.desc${statusFilter}`);
    const data = await r.json();
    return res.status(200).json({ ok: true, wishes: data });
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });
    const { status, response, author } = req.body || {};
    const wr = await supa(`support_wishes?select=*&id=eq.${id}`);
    const found = await wr.json();
    if (!found || found.length === 0) return res.status(404).json({ ok: false, error: 'Not found' });
    const wish = found[0];

    if (response) {
      await supa('support_wish_updates', { method: 'POST', body: JSON.stringify({
        wish_id: id, kind: 'response', body: response, author: author || 'aom', visible_to_client: true }) });
      const subject = `Re: your message to AOM`;
      const html = `<p>Hi${wish.name ? ' ' + wish.name : ''},</p><p>${response}</p>` +
        `<p>You can check the status anytime: <a href="${SITE}/support?code=${wish.access_code}">${SITE}/support?code=${wish.access_code}</a></p>`;
      await sendClientEmail(wish.email, wish.name, subject, html);
    }

    const newStatus = status || (response ? 'resolved' : wish.status);
    if (newStatus !== wish.status) {
      await supa('support_wish_updates', { method: 'POST', body: JSON.stringify({
        wish_id: id, kind: 'status_change', status: newStatus, author: author || 'aom',
        visible_to_client: true }) });
    }
    const upd = await supa(`support_wishes?id=eq.${id}`, { method: 'PATCH',
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }) });
    const row = (await upd.json())[0];
    return res.status(200).json({ ok: true, wish: row });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
