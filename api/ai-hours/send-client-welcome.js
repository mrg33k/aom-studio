// POST /api/ai-hours/send-client-welcome
//
// Called from the browser after a new AI Hours client is added.
// Sends two emails:
//   1. Client welcome email with access code + login URL
//   2. Facilitator confirmation to courtney@aom-inhouse.com
//
// Auth: requires verifyTenant('aom', req) — caller must hold a valid JWT for the
// aom tenant. This prevents an unauthenticated attacker who brute-forces a
// low-entropy access_code from triggering arbitrary Gmail sends via AOM's
// OAuth connection (spam via trusted domain).
//
// Body: { client_name, client_email, access_code }
//
// Response: { ok: true } on success.

import { getGmailTokenByConnection, gmailFetch } from '../_lib/gmailClient.js'
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const AOM_CONNECTION_ID = '2883ada2-14bd-4792-9b39-eeb570bbd498'
const FACILITATOR_EMAIL = 'courtney@aom-inhouse.com'
const AI_HOURS_URL = 'https://www.aheadofmarket.com/ai-hours'

// ─── Helpers ────────────────────────────────────────────────────────────────

function encB64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function buildRfc822({ from, to, subject, bodyHtml }) {
  const boundary = `=_aom_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
  const bodyText = htmlToText(bodyHtml)
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyHtml,
    '',
    `--${boundary}--`,
  ]
  return lines.join('\r\n')
}

async function sendEmail({ accessToken, fromHeader, to, subject, bodyHtml }) {
  const raw = buildRfc822({ from: fromHeader, to, subject, bodyHtml })
  const r = await gmailFetch(accessToken, '/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encB64Url(raw) }),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`gmail-send ${r.status}: ${text.slice(0, 200)}`)
  }
  return r.json()
}

async function verifyClientExists(access_code) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_hours_clients?access_code=eq.${encodeURIComponent(access_code)}&select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  if (!r.ok) return false
  const rows = await r.json()
  return Array.isArray(rows) && rows.length > 0
}

// ─── Email bodies ────────────────────────────────────────────────────────────

function clientEmailHtml({ client_name, access_code }) {
  return `
<p>Hi ${client_name},</p>

<p>Welcome to AI Hours with AOM! We're excited to work with you.</p>

<p>Here's your access code to log in to your client portal:</p>

<p style="font-size:24px; font-weight:bold; letter-spacing:2px; font-family:monospace; background:#f4f4f4; padding:12px 20px; display:inline-block; border-radius:6px;">
  ${access_code}
</p>

<p>
  <a href="${AI_HOURS_URL}" style="color:#FF4F00; font-weight:bold;">Log in at aheadofmarket.com/ai-hours</a>
</p>

<p>Our team will reach out shortly to schedule your first session. In the meantime, if you have any questions, reply to this email.</p>

<p>Looking forward to it,<br>The AOM Team</p>
`.trim()
}

function facilitatorEmailHtml({ client_name, client_email, access_code }) {
  return `
<p>A new AI Hours client has been added:</p>

<table style="border-collapse:collapse; margin:8px 0;">
  <tr><td style="padding:4px 12px 4px 0; color:#666;">Name</td><td style="padding:4px 0; font-weight:bold;">${client_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0; color:#666;">Email</td><td style="padding:4px 0;">${client_email}</td></tr>
  <tr><td style="padding:4px 12px 4px 0; color:#666;">Access code</td><td style="padding:4px 0; font-family:monospace; font-weight:bold;">${access_code}</td></tr>
  <tr><td style="padding:4px 12px 4px 0; color:#666;">Starting session</td><td style="padding:4px 0;">1</td></tr>
</table>

<p>A welcome email has been sent to ${client_email}.</p>
`.trim()
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // ── Require verifyTenant — prevents Gmail spam via guessed access_code ──
  try {
    await verifyTenant('aom', req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status || 403).json({ error: err.message });
    }
    return res.status(403).json({ error: 'forbidden' });
  }

  let payload
  try {
    payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    return res.status(400).json({ error: 'invalid-json' })
  }

  const { client_name, client_email, access_code } = payload
  if (!client_name || !client_email || !access_code) {
    return res.status(400).json({ error: 'client_name, client_email, and access_code are required' })
  }

  // Verify the client actually exists in the DB before sending email
  const exists = await verifyClientExists(access_code)
  if (!exists) {
    return res.status(404).json({ error: 'client-not-found' })
  }

  // Load Gmail credentials
  const creds = await getGmailTokenByConnection(AOM_CONNECTION_ID)
  if (!creds) {
    return res.status(503).json({ error: 'gmail-not-connected' })
  }

  // Build From header
  const fromHeader = creds.profile?.email
    ? `AOM <${creds.profile.email}>`
    : 'AOM <hello@aom-inhouse.com>'

  const errors = []

  // EMAIL 1 — client welcome
  try {
    await sendEmail({
      accessToken: creds.accessToken,
      fromHeader,
      to: `${client_name} <${client_email}>`,
      subject: 'Your AI Hours access code',
      bodyHtml: clientEmailHtml({ client_name, access_code }),
    })
  } catch (err) {
    console.error('[send-client-welcome] client email error:', err.message)
    errors.push({ recipient: 'client', error: err.message })
  }

  // EMAIL 2 — facilitator confirmation
  try {
    await sendEmail({
      accessToken: creds.accessToken,
      fromHeader,
      to: FACILITATOR_EMAIL,
      subject: `New client added: ${client_name}`,
      bodyHtml: facilitatorEmailHtml({ client_name, client_email, access_code }),
    })
  } catch (err) {
    console.error('[send-client-welcome] facilitator email error:', err.message)
    errors.push({ recipient: 'facilitator', error: err.message })
  }

  if (errors.length === 2) {
    return res.status(502).json({ ok: false, errors })
  }

  return res.status(200).json({ ok: true, errors: errors.length ? errors : undefined })
}
