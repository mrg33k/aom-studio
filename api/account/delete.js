// POST /api/account/delete: real, in-app account deletion. corner:native-ios Stage 0.
//
// WHY THIS EXISTS. App Store Review guideline 5.1.1(v): an app that supports
// account creation must offer account deletion INSIDE the app. This endpoint
// is the real thing; src/pages/Settings.jsx and the native client call it.
//
// TWO STEPS, AND THE SECOND ONE IS THE ONLY ONE THAT DELETES.
//   1. POST { step: 'begin' }  -> a one-time confirmation token + a plain-language
//      summary of what is about to happen.
//   2. POST { confirmation, confirmText: 'DELETE' } -> the deletion.
// The token is an HMAC over (userId, issued-at, nonce) keyed on a server-only
// secret: unforgeable, bound to ONE user, short-lived (10 minutes), stateless.
// `confirmText` must be the literal string DELETE; the server never trusts
// that the client asked.
//
// WHAT IT DOES TO THE DATA (corner:retire-supabase R3, 2026-09-03). One
// Convex mutation, users:deleteAccount, called AS the signed-in person:
//   - Deleted: the sign-in (sessions, refresh tokens, password account), device
//     tokens, connected-mailbox OAuth credentials, preferences, notifications,
//     read markers, world memberships, and any personal `user-*` world.
//   - Kept: messages they wrote stay in their rooms (a shared room reads as one
//     conversation; deleting one side corrupts the other side's history). The
//     author id on those rows dangles and the renderers already handle that.
// The user is told exactly this before they confirm.
//
// THE PROTECTED-ACCOUNT GUARD. The super-admin emails (and any in
// ACCOUNT_DELETE_PROTECTED_EMAILS / _USER_IDS) may not delete themselves
// through this endpoint. That account administers every world; a mis-click
// there is an outage, not "a user left". Every ordinary account, including the
// demo account in App Review notes, deletes normally.

import crypto from 'node:crypto';
import { callerIdentity, sessionTokenFromRequest, convexMutationAs } from '../_lib/verifyTenant.js';
import { applyCors } from '../_lib/originAllowlist.js';

const CONFIRM_TTL_MS = 10 * 60 * 1000;
const CONFIRM_WORD = 'DELETE';

function protectedEmails() {
  const base = (process.env.SUPER_ADMIN_EMAILS || 'patrikmatheson@gmail.com,hello@aom-inhouse.com')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const extra = (process.env.ACCOUNT_DELETE_PROTECTED_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return new Set([...base, ...extra]);
}

function protectedUserIds() {
  return new Set(
    [process.env.SUPER_ADMIN_USER_ID || '', ...(process.env.ACCOUNT_DELETE_PROTECTED_USER_IDS || '').split(',')]
      .map((s) => s.trim()).filter(Boolean),
  );
}

function confirmSecret() {
  // A dedicated secret if one is set; otherwise the strongest server-only
  // value this deployment holds. Never a constant, never empty.
  return process.env.ACCOUNT_DELETE_SECRET || process.env.TOKEN_ENC_KEY || process.env.CORNER_INGEST_SECRET || '';
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

// Returns { ok } or { ok:false, reason }. Constant-time on the signature compare.
function verifyConfirmation(value, userId) {
  const parts = String(value || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return { ok: false, reason: 'malformed confirmation' };
  const [, issuedAtRaw, nonce, sig] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: 'malformed confirmation' };
  if (Date.now() - issuedAt > CONFIRM_TTL_MS) return { ok: false, reason: 'confirmation expired, start again' };
  if (issuedAt - Date.now() > 60_000) return { ok: false, reason: 'malformed confirmation' };
  const expected = Buffer.from(signConfirmation(userId, issuedAt, nonce));
  const given = Buffer.from(String(sig));
  if (expected.length !== given.length) return { ok: false, reason: 'confirmation does not match this account' };
  if (!crypto.timingSafeEqual(expected, given)) return { ok: false, reason: 'confirmation does not match this account' };
  return { ok: true };
}

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
  return typeof raw === 'object' ? raw : {};
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!confirmSecret()) return res.status(503).json({ error: 'account deletion is not configured (ACCOUNT_DELETE_SECRET)' });

  // 401 before anything else. Deletion is only ever the signed-in caller's OWN
  // account: there is no userId parameter on this endpoint, by design.
  const identity = await callerIdentity(req);
  if (!identity?.userId) return res.status(401).json({ error: 'authentication required' });

  const email = String(identity.email || '').toLowerCase();
  if (protectedUserIds().has(identity.userId) || (email && protectedEmails().has(email))) {
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
      'your read markers and preferences',
    ],
    keeps: [
      'messages you sent stay in their conversations, with your account removed from them',
      'any shared workspace stays for the people still in it',
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

  const token = sessionTokenFromRequest(req);
  let result;
  try {
    result = await convexMutationAs(token, 'users:deleteAccount', { typedConfirmation: 'delete' });
  } catch (err) {
    console.error('[account/delete] users:deleteAccount failed for %s: %s', identity.userId, err?.message || err);
    return res.status(500).json({
      error: 'Your account could not be removed, so nothing was finalized. Please try again or contact support.',
      detail: String(err?.message || err),
    });
  }

  const removed = result?.removed || {};
  const steps = Object.keys(removed).map((table) => ({ table, status: 'ok', count: removed[table] }));
  console.log('[account/delete] account %s deleted (world=%s)', identity.userId, identity.world || 'none');
  return res.status(200).json({ ok: true, deleted: true, steps });
}
