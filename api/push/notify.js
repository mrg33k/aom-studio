// POST /api/push/notify — fan a new agent message out to Patrik's subscribed devices.
//
// Called by a Supabase Database Webhook on INSERT into `messages`, so it fires whether
// or not a dashboard tab is open — which is the entire point of phone notifications.
// A webhook payload looks like { type:'INSERT', table:'messages', record:{...} }.
// It also accepts a plain { title, body, url } for testing.
//
// Guarded by PUSH_WEBHOOK_SECRET (header x-push-secret). Without it, anyone who found
// this URL could push arbitrary notifications to Patrik's phone.
//
// What it deliberately does NOT send:
//   - anything that is not an assistant message (his own messages, system rows)
//   - embedded site-chat conversations, ops-alerts, THOUGHT reasoning logs
// These are the same exclusions the green dot uses (useDataPipe.unreadIsRealMessage),
// kept in step on purpose: the dot and the phone should never disagree about what
// counts as "someone messaged you".

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function isRealAgentMessage(record) {
  if (!record) return false;
  if (record.role !== 'assistant' || !record.agent) return false;
  const md = record.metadata || {};
  if (md.embed_source || md.embed_id || md.embed_room || md.embed_visitor_id) return false;
  if (md.kind === 'ops-alert' || md.supervisor_alert === true) return false;
  const text = String(record.text || '').trim();
  if (!text) return false;
  if (/^\s*THOUGHT\b/i.test(text)) return false;
  return true;
}

function titleFor(record) {
  const md = record.metadata || {};
  const room = md.mission_slug || record.project || record.agent || 'Corner';
  return String(room).split(':').pop().replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (secret && req.headers['x-push-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!configured()) return res.status(503).json({ error: 'VAPID keys not configured' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(503).json({ error: 'supabase not configured' });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:patrikmatheson@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const record = body.record || null;

  let payload;
  if (record) {
    if (!isRealAgentMessage(record)) return res.status(200).json({ ok: true, skipped: 'not a user-facing agent message' });
    const text = String(record.text || '').replace(/\s+/g, ' ').trim();
    payload = {
      title: titleFor(record),
      body: text.length > 140 ? `${text.slice(0, 139)}…` : text,
      tag: `room-${(record.metadata && record.metadata.mission_slug) || record.project || record.agent}`,
      url: '/dashboard',
    };
  } else {
    if (!body.title && !body.body) return res.status(400).json({ error: 'nothing to send' });
    payload = { title: body.title || 'Corner', body: body.body || '', tag: body.tag || 'corner-test', url: body.url || '/dashboard' };
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: subs, error } = await db.from('push_subscriptions').select('*');
  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.status(200).json({ ok: true, sent: 0, note: 'no subscribed devices' });

  const json = JSON.stringify(payload);
  let sent = 0;
  const dead = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
      );
      sent += 1;
    } catch (err) {
      // 404/410 means the browser threw the subscription away (app deleted, permission
      // revoked). Keeping it would retry forever, so drop it.
      if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
    }
  }));

  if (dead.length) await db.from('push_subscriptions').delete().in('endpoint', dead);
  return res.status(200).json({ ok: true, sent, pruned: dead.length });
}
