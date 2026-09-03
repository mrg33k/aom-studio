// /api/support/wishes
//   GET    /api/support/wishes                  -> admin list (newest first, optional ?status=)
//   GET    /api/support/wishes?access_code=XXX  -> client status lookup (wish + visible updates)
//   PATCH  /api/support/wishes?id=...           -> { status?, response?, author? }
//
// corner:retire-supabase (2026-09-03): support_wishes and support_wish_updates
// are gone. The wish rows live in the Convex supportWishes table and the
// timeline in supportUpdates (support:create / get / list / update / addUpdate).
//
// The Convex tables are thinner than the old ones on purpose, so two shapes are
// kept here and shared by every api/support/* route (they import from this file):
//
//   WISH EXTRAS. recommendation, reply_options, agent_read, first_response_at
//   and auto_send_at have no column on supportWishes. They live in the Convex
//   state table under kind "support_wish_meta", scopeId = wish id, world =
//   the support tenant. Read with getWishMeta, written with patchWishMeta.
//
//   UPDATE FIELDS. supportUpdates has kind, text, visible. The old rows also
//   carried status and author, which the board reads. Those ride inside the
//   text as a small JSON envelope {"body","status","author"}; updateShape
//   unwraps it and a plain text row still reads as a body.
//
// Callers keep getting the old wire shape (id, access_code, created_at,
// latest_response, soft_ack_at, latency_seconds ...) so nothing in
// src/ or the Mac support scripts had to change.

import { requiredTenantFromEnv, resolveTenantContext, TenantContextError } from '../_lib/tenantContext.js';
import { TenantAuthError, convexQuery, convexMutation } from '../_lib/verifyTenant.js';

const SITE = process.env.SUPPORT_SITE_BASE || 'https://www.aheadofmarket.com';
const MAIL_CONNECTION = process.env.SUPPORT_MAIL_CONNECTION || 'f5f939e1-0fdf-4bac-8c88-6de76df751a5';
// The internal mail sender checks X-Internal-Key against CORNER_INTERNAL_KEY.
// This used to be the Supabase service role key.
const INTERNAL_KEY = process.env.CORNER_INTERNAL_KEY || '';

const META_KIND = 'support_wish_meta';
const THREAD_CACHE_KIND = 'support_thread_cache';

// ---------------------------------------------------------------------------
// Shared support store helpers (used by every api/support/* route)
// ---------------------------------------------------------------------------

export function supportTenant() {
  return String(process.env.SUPPORT_TENANT_ID || process.env.CORNER_HOME_TENANT || 'aom').trim().toLowerCase();
}

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null);

export function parseJsonish(s) {
  if (!s) return null;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch { return null; }
}

// One update row -> the old wire shape.
export function updateShape(u) {
  if (!u) return null;
  let body = typeof u.text === 'string' ? u.text : '';
  let status = null;
  let author = null;
  if (body.startsWith('{"body"')) {
    try {
      const p = JSON.parse(body);
      body = typeof p.body === 'string' ? p.body : '';
      status = p.status ?? null;
      author = p.author ?? null;
    } catch { /* plain text that happens to start like JSON */ }
  }
  return {
    id: String(u._id),
    wish_id: String(u.wishId),
    kind: u.kind || '',
    body,
    status,
    author,
    visible_to_client: !!u.visible,
    created_at: iso(u.createdAt),
  };
}

function encodeUpdate({ body, status, author }) {
  return JSON.stringify({ body: body == null ? '' : String(body), status: status ?? null, author: author ?? null });
}

// One wish row (+ its meta) -> the old wire shape.
export function wishShape(wish, meta = {}) {
  if (!wish) return null;
  const m = meta || {};
  return {
    id: String(wish._id),
    access_code: wish.accessCode,
    email: wish.email,
    name: wish.name || null,
    message: wish.message,
    status: wish.status,
    source: wish.source || 'web',
    created_at: iso(wish.createdAt),
    updated_at: iso(wish.updatedAt),
    recommendation: m.recommendation ?? null,
    reply_options: m.reply_options ?? null,
    agent_read: m.agent_read ?? null,
    first_response_at: m.first_response_at ?? null,
    auto_send_at: m.auto_send_at ?? null,
  };
}

// Load one wish by id or access code. Returns { wish, meta, updates } in the
// old shapes, or null. includeHidden pulls the internal rows (thread_meta,
// change_request, worker_note ...) the board needs.
export async function loadWish({ id, accessCode, includeHidden = true } = {}) {
  const args = { includeHidden: !!includeHidden };
  if (id) args.id = String(id);
  if (accessCode) args.accessCode = String(accessCode).trim().toUpperCase();
  if (!args.id && !args.accessCode) return null;
  let found = null;
  try {
    found = await convexQuery('support:get', args);
  } catch {
    found = null;
  }
  if (!found || !found.wish) return null;
  const meta = await getWishMeta(found.wish._id);
  return {
    wish: wishShape(found.wish, meta),
    meta,
    updates: (Array.isArray(found.updates) ? found.updates : []).map(updateShape),
  };
}

export async function getWishMeta(wishId) {
  try {
    const row = await convexQuery('state:get', { kind: META_KIND, scopeId: String(wishId), worldSlug: supportTenant() });
    return row && row.value && typeof row.value === 'object' ? row.value : {};
  } catch {
    return {};
  }
}

// Every wish's meta in one read: { [wishId]: meta }.
export async function allWishMeta() {
  try {
    const rows = await convexQuery('state:get', { kind: META_KIND, worldSlug: supportTenant() });
    const out = {};
    for (const r of Array.isArray(rows) ? rows : []) {
      if (r && r.scopeId) out[r.scopeId] = r.value && typeof r.value === 'object' ? r.value : {};
    }
    return out;
  } catch {
    return {};
  }
}

export async function patchWishMeta(wishId, patch) {
  const current = await getWishMeta(wishId);
  const next = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) };
  await convexMutation('state:put', {
    kind: META_KIND,
    scopeId: String(wishId),
    worldSlug: supportTenant(),
    value: next,
    updatedBy: 'api/support',
  });
  return next;
}

// First reply stamps the latency clock, and only once (the old is.null guard).
export async function stampFirstResponse(wishId, at) {
  const meta = await getWishMeta(wishId);
  if (meta.first_response_at) return meta.first_response_at;
  const when = at || new Date().toISOString();
  await patchWishMeta(wishId, { first_response_at: when });
  return when;
}

// The thread cache used to be a thread_cache update row that got PATCHed in
// place. supportUpdates rows cannot be edited, so it lives in the state table.
export async function getThreadCache(wishId) {
  try {
    const row = await convexQuery('state:get', { kind: THREAD_CACHE_KIND, scopeId: String(wishId), worldSlug: supportTenant() });
    return row && row.value && typeof row.value === 'object' ? row.value : null;
  } catch {
    return null;
  }
}

export async function setThreadCache(wishId, value) {
  await convexMutation('state:put', {
    kind: THREAD_CACHE_KIND,
    scopeId: String(wishId),
    worldSlug: supportTenant(),
    value,
    updatedBy: 'api/support/thread',
  });
}

export async function addWishUpdate(wishId, { kind, body, status, author, visible = false }) {
  const text = (status != null || author != null) ? encodeUpdate({ body, status, author }) : String(body == null ? '' : body);
  return await convexMutation('support:addUpdate', {
    wishId: String(wishId),
    kind: kind || 'note',
    text: text || ' ',
    visible: !!visible,
  });
}

export async function setWishStatus(wishId, status) {
  return await convexMutation('support:update', { id: String(wishId), status: String(status) });
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

const CLIENT_LABEL = { heard: 'Heard', working: 'Working', needs_team: 'With the AOM team', resolved: 'Resolved' };
const DEFAULT_STATUSES = new Set(['heard', 'working', 'needs_team', 'resolved']);
const ENRICH_LIMIT = 80;

const SIGN_OFF = `<br><br>&mdash; AOM Front Desk Team`;

async function sendClientEmail(to, name, subject, bodyHtml) {
  if (!INTERNAL_KEY) return false;
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

  if (req.method === 'GET') {
    const { access_code, status } = req.query;
    if (access_code) {
      // The client status lookup proves possession of the row's own secret.
      const found = await loadWish({ accessCode: access_code, includeHidden: false });
      if (!found) return res.status(404).json({ ok: false, error: 'Not found' });
      const { wish, updates } = found;
      return res.status(200).json({ ok: true, wish, updates, status_label: CLIENT_LABEL[wish.status] || wish.status });
    }
    // Tenant scope: the admin list carries client PII plus the secret access
    // code, so every caller must prove a verified session entitled to the
    // support tenant. A verified non-support world gets an honestly empty list.
    const supportTenantId = requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']);
    const world = (typeof req.query.world === 'string' && req.query.world.trim().toLowerCase()) || supportTenantId;
    let tctx;
    try {
      tctx = await resolveTenantContext(req, { fallback: world });
    } catch (err) {
      if (err instanceof TenantAuthError || err instanceof TenantContextError) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      throw err;
    }
    if (tctx.tenantId !== supportTenantId) {
      return res.status(200).json({ ok: true, wishes: [] });
    }

    let rows = [];
    try {
      rows = await convexQuery('support:list', { limit: 1000 });
    } catch (e) {
      return res.status(502).json({ ok: false, error: `support list failed: ${e.message || e}` });
    }
    rows = (Array.isArray(rows) ? rows : [])
      .filter((w) => (status ? w.status === status : DEFAULT_STATUSES.has(w.status)))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const metaById = await allWishMeta();
    const wishes = rows.map((w) => wishShape(w, metaById[String(w._id)]));

    // Attach each wish's latest response, first-response time and soft-ack
    // flag so the board can show "what we said back" without a per-row
    // fetch from the client. Best-effort, newest rows only.
    try {
      const head = wishes.slice(0, ENRICH_LIMIT);
      const timelines = await Promise.all(head.map((w) => convexQuery('support:get', { id: w.id, includeHidden: true }).catch(() => null)));
      head.forEach((w, i) => {
        const ups = (timelines[i] && Array.isArray(timelines[i].updates) ? timelines[i].updates : []).map(updateShape);
        const responses = ups.filter((u) => u.kind === 'response');
        const latest = responses.length ? responses[responses.length - 1] : null;
        w.latest_response = latest ? { body: latest.body || '', created_at: latest.created_at } : null;
        // Reply-time truth: the stamped first_response_at wins; fall back to the
        // earliest response update. latency_seconds = ask -> first reply.
        w.first_response_at = w.first_response_at || (responses.length ? responses[0].created_at : null);
        const softAcks = ups.filter((u) => u.kind === 'soft_ack');
        w.soft_ack_at = softAcks.length ? softAcks[softAcks.length - 1].created_at : null;
      });
    } catch { /* enrichment is best-effort; board still renders without it */ }
    for (const w of wishes) {
      if (!('latest_response' in w)) w.latest_response = null;
      if (!('soft_ack_at' in w)) w.soft_ack_at = null;
      w.latency_seconds = (w.first_response_at && w.created_at)
        ? Math.max(0, Math.round((new Date(w.first_response_at) - new Date(w.created_at)) / 1000))
        : null;
      // JSON fields arrive as objects already; a string means an old writer.
      for (const k of ['recommendation', 'reply_options', 'agent_read']) {
        if (w[k] && typeof w[k] === 'string') w[k] = parseJsonish(w[k]);
      }
    }
    // Noise gate on DISPLAY only: blasts that became wishes before the watcher's
    // spam gate existed do not render as asks. ?include_noise=1 shows everything.
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
    // Admin write (status change + client email send). Requires a verified
    // session entitled to the support tenant.
    const supportTenantId = requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']);
    let patchCtx;
    try {
      patchCtx = await resolveTenantContext(req, { fallback: supportTenantId });
    } catch (err) {
      if (err instanceof TenantAuthError || err instanceof TenantContextError) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      throw err;
    }
    if (patchCtx.tenantId !== supportTenantId) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });
    const { status, response, author } = req.body || {};
    const found = await loadWish({ id, includeHidden: true });
    if (!found) return res.status(404).json({ ok: false, error: 'Not found' });
    const wish = found.wish;

    if (response) {
      await addWishUpdate(id, { kind: 'response', body: response, author: author || 'dashboard', visible: true });
      await stampFirstResponse(id).catch(() => {});
      const subject = `Re: your message to AOM`;
      const html = `<p>Hi${wish.name ? ' ' + wish.name : ''},</p><p>${response}</p>` +
        `<p>You can check the status anytime: <a href="${SITE}/support?code=${wish.access_code}">${SITE}/support?code=${wish.access_code}</a></p>`;
      await sendClientEmail(wish.email, wish.name, subject, html);
    }

    const newStatus = status || (response ? 'resolved' : wish.status);
    if (newStatus !== wish.status) {
      await addWishUpdate(id, { kind: 'status_change', body: '', status: newStatus, author: author || 'dashboard', visible: true });
    }
    await setWishStatus(id, newStatus);
    const after = await loadWish({ id, includeHidden: false });
    return res.status(200).json({ ok: true, wish: after ? after.wish : { ...wish, status: newStatus } });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
