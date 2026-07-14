// POST /api/support/wish — client submit (web form OR email watcher).
// Body: { email, name?, message, source? }  → { ok, access_code }
// 1) insert wish (status=heard)  2) system "heard" update  3) drop message into agent pipeline.
//
// The agent does NOT run here (build-time guard forbids api.anthropic.com calls).
// Instead this drops a scoped row into the `messages` table; supabase-listener.py
// picks it up and dispatches the support worker, which triages and writes back.
import crypto from 'crypto';
import { requiredTenantFromEnv } from '../_lib/tenantContext.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPPORT_AGENT = process.env.SUPPORT_AGENT_SLUG || 'elon';

function supa(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) },
  });
}

function genCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = 'SUP-';
  for (let i = 0; i < 4; i++) s += chars[crypto.randomInt(0, chars.length)];
  return s;
}

async function uniqueCode() {
  for (let i = 0; i < 6; i++) {
    const code = genCode();
    const r = await supa(`support_wishes?select=id&access_code=eq.${code}`);
    const d = await r.json();
    if (!d || d.length === 0) return code;
  }
  return `SUP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Internal-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ ok: false, error: 'Service unavailable' });

  const { email, name, message, source, recommendation, reply_options } = req.body || {};
  if (!email || !message) return res.status(400).json({ ok: false, error: 'email and message required' });
  let tenantId
  try {
    tenantId = requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']);
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.message || 'tenant not configured' });
  }

  const access_code = await uniqueCode();
  const ins = await supa('support_wishes', { method: 'POST', body: JSON.stringify({
    access_code, email: email.trim(), name: name || null, message,
    status: 'heard', source: source || 'web',
    recommendation: recommendation ? JSON.stringify(recommendation) : null,
    reply_options: reply_options ? JSON.stringify(reply_options) : null,
    auto_send_at: null }) });
  if (!ins.ok) return res.status(500).json({ ok: false, error: await ins.text() });
  const wish = (await ins.json())[0];

  await supa('support_wish_updates', { method: 'POST', body: JSON.stringify({
    wish_id: wish.id, kind: 'status_change', status: 'heard', author: 'system',
    visible_to_client: true }) });

  // Drop a scoped message into the sanctioned agent pipeline (listener dispatches a worker).
  // The messages table has no default id — generate one (mirrors api/dashboard/supabase-messages.js).
  const drop = await supa('messages', { method: 'POST', body: JSON.stringify({
    id: crypto.randomUUID(),
    agent: SUPPORT_AGENT, role: 'user', source: 'support-desk', client_id: tenantId,
    text: `[SUPPORT WISH ${access_code}] from ${name || email} <${email}> (${source || 'web'}):\n\n${message}`,
    metadata: { mission_slug: 'corner:support-desk', support_wish_id: wish.id, support_access_code: access_code,
      support_email: email, support_source: source || 'web' } }) });
  const pipeline_ok = drop.ok;

  return res.status(200).json({ ok: true, access_code, pipeline_ok });
}
