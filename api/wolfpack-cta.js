// Wolfpack website CTA-click notifications, hosted on aom-studio (holds RESEND_API_KEY).
// POST /api/wolfpack-cta  { cta, page }
// cta is one of CTA_LABELS; CORS-scoped to wolfpackcompanies.com. Emails a short
// heads-up to the AOM inbox only (internal signal, not client-facing).
// One email per IP per CTA type per hour — a visitor tapping call twice is one event.

const RESEND_URL = 'https://api.resend.com/emails';
const RECIPIENT = 'hello@aom-inhouse.com';
const COOLDOWN_MS = 60 * 60 * 1000;
const DAILY_CAP = 40;
const ALLOWED_ORIGINS = new Set([
  'https://wolfpackcompanies.com',
  'https://www.wolfpackcompanies.com',
]);

const CTA_LABELS = {
  call: 'Call phone number',
  review: 'Google review button',
};

// `${ip}|${cta}` -> epoch-ms of last accepted notification
const lastSentByKey = new Map();
let sentToday = { day: '', count: 0 };

function clientIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function underDailyCap(now) {
  const day = new Date(now).toISOString().slice(0, 10);
  if (sentToday.day !== day) sentToday = { day, count: 0 };
  return sentToday.count < DAILY_CAP;
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

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false });
  }

  const cta = typeof body.cta === 'string' ? body.cta : '';
  if (!CTA_LABELS[cta]) return res.status(400).json({ ok: false });
  const page = (typeof body.page === 'string' ? body.page : '').slice(0, 240) || '(unknown)';

  const now = Date.now();
  const key = `${clientIp(req)}|${cta}`;
  const last = lastSentByKey.get(key) || 0;
  // Always 200 so the client never retries; dedupe and cap decide silently.
  if (now - last < COOLDOWN_MS || !underDailyCap(now)) {
    return res.status(200).json({ ok: true });
  }
  lastSentByKey.set(key, now);
  sentToday.count += 1;

  const when = new Date(now).toLocaleString('en-US', {
    timeZone: 'America/Phoenix', dateStyle: 'medium', timeStyle: 'short',
  });
  const label = CTA_LABELS[cta];
  const subject = `Wolfpack CTA: ${label} — ${page}`;
  const text = `${label} clicked on the Wolfpack website\n\nPage: ${page}\nTime: ${when} (Phoenix)\n`;

  try {
    const resp = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.WOLFPACK_LEAD_FROM || 'Wolfpack Website <website@sourcing.directory>',
        to: [RECIPIENT],
        subject,
        text,
      }),
    });
    if (!resp.ok) return res.status(200).json({ ok: true, sent: false });
  } catch {
    return res.status(200).json({ ok: true, sent: false });
  }
  return res.status(200).json({ ok: true, sent: true });
}
