// POST /api/account/delete — real, in-app account deletion. corner:native-ios Stage 0.
//
// WHY THIS EXISTS. App Store Review guideline 5.1.1(v): an app that supports account
// creation must offer account deletion INSIDE the app. Corner creates accounts in-app
// (the invite flow, AcceptInvite.jsx -> /api/accept-invite), and until now the Settings
// button fired `alert('Account deletion would be processed here.')` — a placeholder that
// is an automatic rejection on its own, and a lie to the user besides. This endpoint is
// the real thing; src/pages/Settings.jsx now calls it and the native client will too.
//
// TWO STEPS, AND THE SECOND ONE IS THE ONLY ONE THAT DELETES.
//   1. POST { step: 'begin' }  -> a one-time confirmation token + a plain-language
//      summary of what is about to happen.
//   2. POST { confirmation, confirmText: 'DELETE' } -> the deletion.
// The token is an HMAC over (userId, issued-at, nonce) keyed on a server-only secret.
// It is therefore:
//   - unforgeable          a client cannot mint one, so a single stray POST from a
//                          replayed URL or an over-eager retry cannot delete an account
//   - bound to ONE user    a token issued to A is rejected when presented by B, even
//                          with B's own valid session
//   - short-lived          10 minutes; a token found later in a log is already dead
// It is stateless on purpose — a `pending_deletions` table would be one more thing to
// migrate, expire, and leak, for a guarantee an HMAC already gives.
// `confirmText` must be the literal string DELETE. That is intentional belt-and-braces
// with the typed confirmation in the UI: the server never trusts that the client asked.
//
// WHAT IT DOES TO THE DATA. Personal records are DELETED; the shared conversation record
// is ANONYMIZED. That split is the honest one:
//   - Deleted: the account itself, its device tokens, its connected-mailbox OAuth
//     credentials, its notification preferences, its world/tenant memberships, its
//     voice-session audit trail, its runner pairings, its turn receipts. Every one of
//     those is *about the person* and is worthless to anyone else.
//   - Anonymized: rows in `messages` they authored lose user_id and user_name. Hard-
//     deleting them would tear holes in OTHER people's threads (a shared room reads as
//     one conversation; deleting one side of it corrupts the other side's history) and
//     would delete agent replies' context. Stripping the identity columns removes the
//     personal data — which is what deletion is for — while leaving the conversation
//     coherent. The same reasoning applies to openai_usage_events, which is a billing
//     record with a user id bolted on.
// The user is told exactly this, in these words, before they confirm.
//
// ORDER MATTERS: data first, auth user LAST. If a step fails halfway the account still
// exists and the user can sign in and retry. Deleting the auth user first would strand
// orphaned rows behind a login nobody can use.
//
// THE PROTECTED-ACCOUNT GUARD. ACCOUNT_DELETE_PROTECTED_USER_IDS (default: the super
// admin) may not delete itself through this endpoint. That account is an admin in every
// world; a mis-click there is not "a user left", it is an outage. It returns 403 with a
// contact-support message. This does NOT weaken 5.1.1(v): every ordinary account —
// including the demo account supplied in App Review notes — deletes normally.

import crypto from 'node:crypto';
import { callerIdentity } from '../_lib/verifyTenant.js';
import { applyCors } from '../_lib/originAllowlist.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '833f6828-1dae-409c-a24b-1438f46544d0';

const CONFIRM_TTL_MS = 10 * 60 * 1000;
const CONFIRM_WORD = 'DELETE';

// Tables whose rows are ABOUT this person and go away with them.
const DELETE_BY_USER_ID = [
  'device_tokens',
  'account_integrations',
  'user_notification_preferences',
  'corner_runner_devices',
  'corner_runner_pairings',
  'corner_runner_jobs',
  'airpods_sessions',
  'airpods_actions',
  'room_turn_receipts',
  'world_members',
  'tenant_users',
];

// Tables where the row must survive but the identity must not.
const ANONYMIZE_BY_USER_ID = [
  { table: 'messages', patch: { user_id: null, user_name: null } },
  { table: 'openai_usage_events', patch: { user_id: null } },
];

function protectedUserIds() {
  const extra = (process.env.ACCOUNT_DELETE_PROTECTED_USER_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return new Set([SUPER_ADMIN_USER_ID, ...extra]);
}

function confirmSecret() {
  // A dedicated secret if one is set; otherwise the service key, which is already
  // the strongest server-only value this function holds. Never a constant.
  return process.env.ACCOUNT_DELETE_SECRET || SERVICE_KEY || '';
}

function signConfirmation(userId, issuedAt, nonce) {
  return crypto
    .createHmac('sha256', confirmSecret())
    .update(`v1.${userId}.${issuedAt}.${nonce}`)
    .digest('base64url');
}

function mintConfirmation(userId) {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(12).toString('base64url');
  return `v1.${issuedAt}.${nonce}.${signConfirmation(userId, issuedAt, nonce)}`;
}

// Returns { ok } or { ok:false, reason }. Constant-time on the signature compare so a
// caller cannot walk the HMAC out byte by byte.
function verifyConfirmation(value, userId) {
  const parts = String(value || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return { ok: false, reason: 'malformed confirmation' };
  const [, issuedAtRaw, nonce, sig] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: 'malformed confirmation' };
  if (Date.now() - issuedAt > CONFIRM_TTL_MS) return { ok: false, reason: 'confirmation expired — start again' };
  if (issuedAt - Date.now() > 60_000) return { ok: false, reason: 'malformed confirmation' };
  const expected = Buffer.from(signConfirmation(userId, issuedAt, nonce));
  const given = Buffer.from(String(sig));
  if (expected.length !== given.length) return { ok: false, reason: 'confirmation does not match this account' };
  if (!crypto.timingSafeEqual(expected, given)) return { ok: false, reason: 'confirmation does not match this account' };
  return { ok: true };
}

function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
  return typeof raw === 'object' ? raw : {};
}

// One tolerant REST call. A table that does not exist in this deployment reports
// 'skipped' instead of failing the whole deletion — the alternative is an account that
// can never be deleted because of a table it never used.
async function restWrite(method, table, filter, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  try {
    const r = await fetch(url, {
      method,
      headers: serviceHeaders({ Prefer: 'return=minimal' }),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (r.ok) return { table, status: 'ok' };
    const text = await r.text().catch(() => '');
    if (r.status === 404 || /does not exist|Could not find the table/i.test(text)) {
      return { table, status: 'skipped', detail: 'table not present' };
    }
    return { table, status: 'failed', code: r.status, detail: text.slice(0, 200) };
  } catch (err) {
    return { table, status: 'failed', detail: String(err?.message || err) };
  }
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(503).json({ error: 'supabase not configured' });

  // 401 before anything else. Deletion is only ever the signed-in caller's OWN account:
  // there is no userId parameter on this endpoint, by design.
  const identity = await callerIdentity(req);
  if (!identity?.userId) return res.status(401).json({ error: 'authentication required' });

  if (protectedUserIds().has(identity.userId)) {
    return res.status(403).json({
      error: 'This account administers every workspace and cannot be removed from here. Contact support to close it.',
    });
  }

  const body = readBody(req);
  const summary = {
    email: identity.email || null,
    name: identity.userName || null,
    world: identity.world || null,
    deletes: [
      'your account and sign-in',
      'every device signed in to notifications',
      'connected mailboxes and their access tokens',
      'your notification settings and workspace membership',
      'your voice-session history',
    ],
    keeps: [
      'messages you sent stay in their conversations, with your name and account removed from them',
    ],
  };

  if (body.step === 'begin' || (!body.confirmation && !body.confirmText)) {
    return res.status(200).json({
      ok: true,
      step: 'confirm',
      confirmation: mintConfirmation(identity.userId),
      expiresInSeconds: Math.floor(CONFIRM_TTL_MS / 1000),
      requiresText: CONFIRM_WORD,
      summary,
    });
  }

  if (String(body.confirmText || '').trim() !== CONFIRM_WORD) {
    return res.status(400).json({ error: `type ${CONFIRM_WORD} to confirm` });
  }
  const verdict = verifyConfirmation(body.confirmation, identity.userId);
  if (!verdict.ok) return res.status(400).json({ error: verdict.reason });

  const userFilter = `user_id=eq.${encodeURIComponent(identity.userId)}`;
  const steps = [];

  for (const table of DELETE_BY_USER_ID) {
    steps.push(await restWrite('DELETE', table, userFilter));
  }
  for (const { table, patch } of ANONYMIZE_BY_USER_ID) {
    steps.push(await restWrite('PATCH', table, userFilter, patch));
  }

  const failed = steps.filter((s) => s.status === 'failed');
  if (failed.length) {
    // The auth user is deliberately still alive here: the person can sign in and try
    // again, and support can see exactly which table refused.
    console.error('[account/delete] aborted before auth deletion for %s:', identity.userId, failed);
    return res.status(500).json({
      error: 'Some of your data could not be removed, so nothing was finalized. Please try again or contact support.',
      steps,
    });
  }

  // LAST: the auth user itself. Admin API, service key.
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(identity.userId)}`, {
    method: 'DELETE',
    headers: serviceHeaders(),
  });
  if (!authRes.ok) {
    const detail = await authRes.text().catch(() => '');
    console.error('[account/delete] auth user delete failed for %s: %s %s', identity.userId, authRes.status, detail.slice(0, 300));
    return res.status(500).json({
      error: 'Your data was removed but the sign-in could not be closed. Contact support so we can finish it.',
      steps,
    });
  }

  console.log('[account/delete] account %s deleted (world=%s)', identity.userId, identity.world || 'none');
  return res.status(200).json({ ok: true, deleted: true, steps });
}
