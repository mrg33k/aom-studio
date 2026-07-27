// POST /api/relay-sms
// Twilio SMS/iMessage webhook. Receives inbound texts, routes to Gemini,
// sends the reply back via Twilio, and stores the full conversation in Supabase.
//
// Configure in Twilio Console:
//   Webhook URL: https://your-domain.vercel.app/api/relay-sms
//   HTTP Method: POST
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GEMINI_API_KEY
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//   TWILIO_WEBHOOK_URL (optional) — the exact URL configured in the Twilio
//     console, used for signature validation when the proxy headers don't
//     reconstruct it byte-for-byte.
//
// AUTH (corner:identity-attribution, 2026-07-27). This had NO X-Twilio-Signature
// check, so any anonymous POST was treated as an inbound text: it burned Gemini
// on Patrik's key, sent a real billable SMS to a caller-chosen number, and wrote
// role='user' rows into the aom world with no author at all. Two fixes here:
//   1. the Twilio HMAC is validated before anything else happens (toll fraud),
//   2. every stored row carries an explicit non-human author — the E.164 number
//      as user_name and sender_role='sms-visitor' — so an inbound text can never
//      be mistaken for Patrik by a display layer or an agent reading the record.

import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

const DEFAULT_AGENT = process.env.IMESSAGE_DEFAULT_AGENT || 'elon';
const CLIENT_ID = 'aom';

const IMESSAGE_SYSTEM_INSTRUCTION = `You are an AI agent on the AOM team, responding to a user via iMessage/SMS. AOM (Ahead of Market) is a creative studio that builds Corner, an AI-powered business operating system.

Keep responses concise and SMS-friendly (under 300 characters when possible). Be direct and human. If someone has a business inquiry, let them know the team will follow up. Never say you're an AI or that you can't help. Always have a path forward.`;

// ── Twilio request signature ──────────────────────────────────────────────────
//
// https://www.twilio.com/docs/usage/security#validating-signatures
// signature = base64(HMAC-SHA1(auth_token, url + concat(sorted(k + v))))
// where the params are the POST form fields.

// Twilio signs the EXACT url it was configured with. Behind a proxy we can only
// reconstruct it, so we try the handful of forms that reconstruction can produce
// and accept the request if any of them verifies. Set TWILIO_WEBHOOK_URL to the
// console value to skip the guessing entirely. Trying several candidate URLs
// does not weaken the check — the HMAC still has to match one of them.
function candidateWebhookUrls(req) {
  const configured = (process.env.TWILIO_WEBHOOK_URL || '').trim();
  if (configured) return [configured];
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  if (!host) return [];
  const path = req.url || '/api/relay-sms';
  const pathNoQuery = path.split('?')[0];
  const out = new Set();
  for (const proto of ['https', 'http']) {
    out.add(`${proto}://${host}${path}`);
    out.add(`${proto}://${host}${pathNoQuery}`);
  }
  return [...out];
}

function twilioSignatureFor(url, params, authToken) {
  let data = url;
  for (const key of Object.keys(params || {}).sort()) {
    const v = params[key];
    data += key + (v == null ? '' : String(v));
  }
  return crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf-8');
  const bb = Buffer.from(String(b || ''), 'utf-8');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Fail CLOSED. No auth token configured means we cannot tell Twilio from a
// stranger, and a stranger here costs real money and pollutes the record.
function isValidTwilioRequest(req) {
  if (!TWILIO_AUTH_TOKEN) return false;
  const provided = req.headers['x-twilio-signature'];
  if (!provided || typeof provided !== 'string') return false;
  const params = (req.body && typeof req.body === 'object') ? req.body : {};
  for (const url of candidateWebhookUrls(req)) {
    if (timingSafeEqual(provided, twilioSignatureFor(url, params, TWILIO_AUTH_TOKEN))) return true;
  }
  return false;
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function sbFetch(path, options = {}) {
  const resp = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function findOrCreateConversation(fromNumber) {
  const encoded = encodeURIComponent(fromNumber);
  const rows = await sbFetch(
    `/rest/v1/conversations?external_id=eq.${encoded}&channel=eq.imessage&client_id=eq.${CLIENT_ID}&limit=1`
  );
  if (Array.isArray(rows) && rows.length > 0) return rows[0];

  const { randomUUID } = await import('crypto');
  const newConv = {
    id: randomUUID(),
    channel: 'imessage',
    external_id: fromNumber,
    client_id: CLIENT_ID,
    agent: DEFAULT_AGENT,
  };
  const created = await sbFetch('/rest/v1/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(newConv),
  });
  return Array.isArray(created) ? created[0] : created;
}

async function storeMessage(fromNumber, text, role, agentSlug) {
  const { randomUUID } = await import('crypto');
  // Attribution (RULE 2). An inbound text is a real turn by a real, UNKNOWN
  // person. Leaving user_name null made it render as "You" and read as Patrik
  // anywhere a `|| 'Patrik'` default applied. The phone number IS the identity
  // we have, so it is the identity we record — and sender_role marks it as a
  // visitor over SMS, not a Corner member.
  const isInbound = role === 'user';
  await sbFetch('/rest/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: randomUUID(),
      agent: agentSlug,
      role,
      text,
      source: 'imessage',
      client_id: CLIENT_ID,
      // store phone in project_path so outbound routing can retrieve it
      project_path: fromNumber,
      ...(isInbound ? { user_name: fromNumber, sender_role: 'sms-visitor' } : {}),
    }),
  });
}

async function getRecentHistory(fromNumber) {
  const encoded = encodeURIComponent(fromNumber);
  const rows = await sbFetch(
    `/rest/v1/messages?source=eq.imessage&project_path=eq.${encoded}&order=timestamp.desc&limit=10&select=role,text`
  ).catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) return [];
  // reverse to chronological, skip the most recent (current inbound not yet stored)
  return rows.reverse().map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));
}

// ── Gemini ────────────────────────────────────────────────────────────────────

async function callGemini(userMessage, history = []) {
  const contents = [...history, { role: 'user', parts: [{ text: userMessage }] }];
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: IMESSAGE_SYSTEM_INSTRUCTION }] },
        contents,
      }),
    }
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${data?.error?.message}`);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => p.text).map(p => p.text).join('').trim();
}

// ── Twilio outbound ───────────────────────────────────────────────────────────

async function sendSMS(toNumber, messageBody) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const params = new URLSearchParams({
    From: TWILIO_FROM_NUMBER,
    To: toNumber,
    Body: messageBody,
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Twilio ${resp.status}: ${err}`);
  }
  return resp.json();
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(405).send('<?xml version="1.0"?><Response></Response>');
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    console.error('[relay-sms] Missing required env vars');
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0"?><Response></Response>');
  }

  // Prove this really came from Twilio BEFORE spending a Gemini call, a billable
  // outbound SMS, or a row in the permanent record. 403 (not empty TwiML) so a
  // forged request gets nothing back and Twilio's own retries are unaffected —
  // a genuine Twilio POST never lands here.
  if (!isValidTwilioRequest(req)) {
    console.warn('[relay-sms] rejected: bad or missing X-Twilio-Signature');
    return res.status(403).json({ error: 'invalid signature' });
  }

  try {
    // Twilio sends application/x-www-form-urlencoded (parsed by Vercel automatically)
    const body = req.body || {};
    const fromNumber = (body.From || '').trim();
    const messageText = (body.Body || '').trim();

    if (!fromNumber || !messageText) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send('<?xml version="1.0"?><Response></Response>');
    }

    // Find or create the conversation record for this phone number
    const conversation = await findOrCreateConversation(fromNumber);
    const agentSlug = conversation?.agent || DEFAULT_AGENT;

    // Load recent context (before storing the new inbound message)
    const history = await getRecentHistory(fromNumber);

    // Store inbound user message
    await storeMessage(fromNumber, messageText, 'user', agentSlug);

    // Generate response via Gemini
    const replyText = await callGemini(messageText, history);

    // Store agent response
    await storeMessage(fromNumber, replyText, 'assistant', agentSlug);

    // Send reply via Twilio
    await sendSMS(fromNumber, replyText);

    // Return empty TwiML (reply already sent programmatically above)
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0"?><Response></Response>');
  } catch (err) {
    console.error('[relay-sms] Error:', err.message);
    // Always return valid TwiML so Twilio doesn't retry
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0"?><Response></Response>');
  }
}
