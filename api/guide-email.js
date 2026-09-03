// AOM AI Guide — email capture + prompt delivery
// Part of corner:digital-products R3.
//
// Accepts POST { email, category, prompts: [{label, prompt}], turnstile_token }
//   1. Validates the email
//   2. Turnstile verification (Cloudflare) — stubbed for dev, enforced when TURNSTILE_SECRET_KEY set
//   3. Rate limit: 5/min per IP (in-memory stub; production uses Upstash/Redis)
//   4. Stores the lead on Convex (leads:capture). A store failure never blocks the send.
//   5. Emails the prompts to the user via Resend
//
// Required env:
//   RESEND_API_KEY            — Resend API key
//   TURNSTILE_SECRET_KEY      — Cloudflare Turnstile secret (optional in dev; required in prod)
//   REPORTS_CONVEX_URL        — optional; defaults to the canonical Convex deployment
//
// corner:retire-supabase (2026-09-03): the lead row used to go to the Supabase
// guide_leads table. It now goes to the Convex leads table through leads:capture.
//
// NOTE on FROM address (2026-06-04):
//   Resend plan only allows 1 verified domain. `sourcing.directory` is the active one.
//   `aheadofmarket.com` is NOT verified — sending from that address silently fails.
//   Emails are sent from hello@sourcing.directory with reply_to hello@aheadofmarket.com
//   until the Resend plan is upgraded to support multiple domains OR aheadofmarket.com
//   DNS records (SPF, DKIM, DMARC) are verified at https://resend.com/domains.
//   TO FIX PROPERLY: upgrade Resend plan and add aheadofmarket.com domain.

import { Resend } from 'resend';
import { convexMutation } from './_lib/reportsStore.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Turnstile check stub ───────────────────────────────────────────────────
// Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/get-started/
// Frontend must render the widget and POST turnstile_token. This stub verifies
// against siteverify when TURNSTILE_SECRET_KEY is set; in dev (no secret) it
// logs and allows through so local testing is not blocked.
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[guide-email] TURNSTILE_SECRET_KEY not set — Turnstile check stub bypassed (dev only)');
    return true;
  }
  if (!token || typeof token !== 'string') return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await r.json();
    return !!data.success;
  } catch (e) {
    console.warn('[guide-email] Turnstile verify failed:', e.message);
    return false;
  }
}

// ─── 5/min rate limit per IP ────────────────────────────────────────────────
// In-memory stub: 5 requests per 60s sliding window per IP.
// Production MUST replace with Upstash Redis / Vercel KV (this map resets per lambda).
// Comment documents the contract for the infra hardening ticket.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map(); // ip -> { count, resetAt }
function checkRateLimit(ip) {
  const now = Date.now();
  const key = String(ip || 'unknown');
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // ── 5/min rate limit per IP ───────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded: 5/min per IP' });
  }

  const { email, category, prompts, turnstile_token } = req.body || {};

  // ── Turnstile check stub ──────────────────────────────────────────────
  const turnstileOk = await verifyTurnstile(turnstile_token, ip);
  if (!turnstileOk) {
    return res.status(403).json({ error: 'Turnstile verification failed' });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const safeCategory = (category && typeof category === 'string') ? category : 'unknown';
  const promptList = Array.isArray(prompts) ? prompts : [];

  // Store the lead on Convex. Best effort: a store failure must not block the send.
  try {
    await convexMutation('leads:capture', {
      email: cleanEmail,
      category: safeCategory,
      prompts: promptList.slice(0, 50),
      source: 'ai-guide',
    });
  } catch (e) {
    console.warn('Lead store failed:', e.message);
  }

  const promptsHtml = promptList.map((p) => `
    <div style="margin-bottom:24px; padding:20px; background:#f9f9f9; border-radius:10px; border:1px solid #eee;">
      <div style="font-weight:700; font-size:15px; color:#0C0C0C; margin-bottom:8px;">${escapeHtml(p.label)}</div>
      <div style="font-size:14px; color:#444; line-height:1.6; white-space:pre-wrap;">${escapeHtml(p.prompt)}</div>
    </div>
  `).join('');

  const categoryLabel = safeCategory.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background:#fff; margin:0; padding:0;">
  <div style="max-width:600px; margin:0 auto; padding:40px 24px;">
    <div style="margin-bottom:32px;">
      <span style="display:inline-block; background:#E85D26; color:#fff; font-size:11px; font-weight:700; letter-spacing:0.1em; padding:4px 10px; border-radius:100px;">AHEAD OF MARKET</span>
    </div>
    <h1 style="font-size:26px; font-weight:700; color:#0C0C0C; margin:0 0 8px;">Your AI prompts for ${escapeHtml(categoryLabel)}</h1>
    <p style="font-size:15px; color:#666; margin:0 0 32px; line-height:1.6;">Here are the prompts you generated — ready to paste directly into ChatGPT or Claude.</p>
    ${promptsHtml}
    <div style="margin-top:40px; padding:24px; background:#fff7f4; border-radius:12px; border:1px solid #fde4d6; text-align:center;">
      <div style="font-size:15px; font-weight:600; color:#0C0C0C; margin-bottom:8px;">Want AI working across your whole business?</div>
      <div style="font-size:14px; color:#666; margin-bottom:16px;">The AI Flow is a full audit of your operation — we find every place AI can save you time or money.</div>
      <a href="https://aheadofmarket.com/book" style="display:inline-block; background:#E85D26; color:#fff; font-size:14px; font-weight:700; padding:12px 24px; border-radius:10px; text-decoration:none;">Book an AI Flow →</a>
    </div>
    <div style="margin-top:32px; font-size:12px; color:#999; text-align:center;">
      You're receiving this because you used the free AI Business Guide at <a href="https://aheadofmarket.com/ai-guide" style="color:#E85D26;">aheadofmarket.com</a>.
    </div>
  </div>
</body>
</html>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Resend SDK v6 returns { data, error } — does NOT throw on API errors.
    // Must check error explicitly or 403/4xx responses are silently swallowed.
    // FROM: sourcing.directory is the verified domain on the current Resend plan.
    // REPLY-TO: hello@aheadofmarket.com so replies reach the right inbox.
    const { data, error: resendError } = await resend.emails.send({
      from: 'AOM <hello@sourcing.directory>',
      reply_to: 'hello@aheadofmarket.com',
      to: cleanEmail,
      subject: `Your AI prompts for ${categoryLabel}`,
      html,
    });
    if (resendError) {
      console.error('Resend error:', resendError);
      return res.status(500).json({ error: 'Failed to send email', details: resendError.message });
    }
    console.log('Email sent successfully:', data?.id);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error (unexpected throw):', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
