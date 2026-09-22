// Ahead of Market homepage lead (home-v4 hero + "Ready when you are" forms).
// Same shape as wolfpack-lead.js: honeypot + min fill time + per-IP rate limit, then Resend to the studio inbox.

const MIN_FILL_MS = 1500;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RESEND_URL = 'https://api.resend.com/emails';
const RECIPIENTS = ['hello@aheadofmarket.com', 'hello@aom-inhouse.com'];
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const ALLOWED_ORIGINS = new Set([
  'https://aheadofmarket.com',
  'https://www.aheadofmarket.com',
]);

const FIELD_LIMITS = {
  email: 160,
  notes: 2000,
  answers: 300,
  intent: 40,
  sourcePage: 240,
};

const acceptedByIp = new Map();

function cleanField(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export function validateLead(input) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const invalid = { ok: false, errors: ['invalid'] };

  const honeypot = typeof src.website === 'string' ? src.website.trim() : src.website;
  if (honeypot) return invalid;
  const startedAt = Number(src.startedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return invalid;
  if (Date.now() - startedAt < MIN_FILL_MS) return invalid;

  const lead = {};
  for (const [field, maxLen] of Object.entries(FIELD_LIMITS)) {
    lead[field] = cleanField(src[field], maxLen);
  }
  if (!EMAIL_RE.test(lead.email)) return invalid;

  lead.submittedAt = new Date().toISOString();
  return { ok: true, lead };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_ROWS = [
  ['Email', 'email'],
  ['Notes', 'notes'],
  ['Quiz answers', 'answers'],
  ['Intent', 'intent'],
];

export function buildLeadEmail(lead) {
  const timestamp = lead.submittedAt || new Date().toISOString();
  const subject = `New lead from aheadofmarket.com: ${lead.email}`;
  const rows = EMAIL_ROWS.filter(([, key]) => lead[key]);
  const textLines = rows.map(([label, key]) => `${label}: ${lead[key]}`);
  textLines.push(`Page: ${lead.sourcePage || '(unknown)'}`);
  textLines.push(`Received: ${timestamp}`);
  const text = `New lead from aheadofmarket.com\n\n${textLines.join('\n')}\n`;
  const htmlRows = rows
    .map(
      ([label, key]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top;white-space:nowrap;">${label}</td>` +
        `<td style="padding:6px 0;color:#111;white-space:pre-wrap;">${escapeHtml(lead[key])}</td></tr>`
    )
    .join('\n      ');
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#ffffff;color:#111;padding:24px;max-width:560px;">
  <h2 style="margin:0 0 4px;font-size:18px;color:#111;">New lead from aheadofmarket.com</h2>
  <p style="margin:0 0 16px;font-size:13px;color:#666;">${escapeHtml(lead.sourcePage || '(unknown page)')} · ${escapeHtml(timestamp)}</p>
  <table style="border-collapse:collapse;font-size:15px;">
    <tbody>
      ${htmlRows}
    </tbody>
  </table>
</div>`;
  return { subject, html, text };
}

function clientIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isRateLimited(ip, now) {
  const hits = acceptedByIp.get(ip);
  if (!hits) return false;
  const fresh = hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (fresh.length !== hits.length) acceptedByIp.set(ip, fresh);
  return fresh.length >= RATE_LIMIT_MAX;
}

function recordAccepted(ip, now) {
  const hits = acceptedByIp.get(ip) || [];
  hits.push(now);
  acceptedByIp.set(ip, hits);
}

async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

function applyCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method-not-allowed' });
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid-json' });
  }
  const now = Date.now();
  const ip = clientIp(req);
  if (isRateLimited(ip, now)) return res.status(429).json({ ok: false, error: 'rate-limited' });
  const result = validateLead(body);
  if (!result.ok) return res.status(422).json({ ok: false, error: 'invalid' });
  recordAccepted(ip, now);
  const { lead } = result;
  const { subject, html, text } = buildLeadEmail(lead);
  const payload = {
    from: process.env.AOM_LEAD_FROM || process.env.WOLFPACK_LEAD_FROM || 'Ahead of Market <website@sourcing.directory>',
    to: RECIPIENTS,
    subject,
    html,
    text,
    reply_to: lead.email,
  };
  let sent = false;
  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    sent = response.ok;
    if (!sent) console.error('aom-lead: resend failed', response.status, await response.text().catch(() => ''));
  } catch (err) {
    console.error('aom-lead: resend error', err);
  }
  return res.status(sent ? 200 : 502).json({ ok: sent, error: sent ? undefined : 'send-failed' });
}
