// POST /api/push/notify: a push that is not tied to a chat message.
//
// corner:retire-supabase (2026-09-03). What changed:
//
//   BEFORE. A Supabase Database Webhook fired this on every messages INSERT,
//   and this file read push_subscriptions + device_tokens and sent web push
//   and APNs itself.
//
//   NOW. The message path lives on Convex: messages:send schedules
//   notify:onMessage, which reads the devices table (devices:targetsForMessage)
//   and sends APNs from the deployment. The webhook is gone, and a webhook
//   shaped body ({ record }) is answered with "handled by convex" so any
//   straggler call is harmless.
//
//   The manual shape { worldId, title, body, tag, url, roomId? } is still used
//   by api/_lib/roomSteward.js (needs-you) and AOM-EA scripts/task-complete.sh
//   (needs_input). Device tokens are no longer readable from here (devices:list
//   returns only a token tail on purpose), so this route delivers by writing a
//   short system note into a room; Convex pushes it to every member's phone
//   through the same notify:onMessage lane. roomId is the legacy room id
//   (world:agent:slug) or a Convex room id; without one the note lands in
//   <world>:agent:corner.
//
// Guarded by PUSH_WEBHOOK_SECRET (header x-push-secret). Without it, anyone who
// found this URL could ping Patrik's phone.

import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';

const DEFAULT_AGENT = process.env.PUSH_NOTE_AGENT || 'corner';

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch { return {}; }
  }
  return typeof req.body === 'object' ? req.body : {};
}

// A recognisable room key in the tag ("room-<slug>", "needs-you-<id>",
// "task-<id>") does not name a room; only an explicit roomId does.
function roomFor(body, world) {
  const explicit = String(body.roomId || body.room_id || '').trim();
  if (explicit) return explicit;
  return `${world}:agent:${DEFAULT_AGENT}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (secret && req.headers['x-push-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = readBody(req);

  // Old webhook shape: the deployment already pushed this message.
  if (body.record || body.type === 'INSERT') {
    return res.status(200).json({ ok: true, sent: 0, skipped: 'handled by convex notify:onMessage' });
  }

  if (!body.title && !body.body) return res.status(400).json({ error: 'nothing to send' });
  // The caller must say which world to notify. Broadcasting to every device is
  // the exact bug the world scoping fixed.
  const world = String(body.worldId || body.world_id || '').trim().toLowerCase();
  if (!world) return res.status(400).json({ error: 'worldId required: specify which world to notify' });

  // How many devices are on the other end, for the caller's log line.
  let devices = 0;
  try {
    const members = await convexQuery('worlds:membersOf', { worldId: world });
    const lists = await Promise.all((Array.isArray(members) ? members : []).map((m) => convexQuery('devices:list', { userId: String(m.userId) }).catch(() => [])));
    devices = lists.reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);
  } catch {
    devices = 0;
  }

  const title = String(body.title || 'Corner').trim();
  const text = [title, String(body.body || '').trim()].filter(Boolean).join('\n');
  const tag = String(body.tag || 'corner-test').trim();
  const url = String(body.url || '/dashboard').trim();

  let messageId = null;
  try {
    messageId = await convexMutation('messages:send', {
      roomId: roomFor(body, world),
      clientId: world,
      role: 'system',
      source: 'push-notify',
      text,
      // The tag doubles as the dedup key: the same needs-you transition posted
      // twice returns the same row instead of buzzing twice.
      clientMessageId: `push-${tag}`.slice(0, 160),
      metadata: { kind: 'push', tag, url, title },
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `could not post the note: ${err?.message || err}` });
  }

  return res.status(200).json({ ok: true, sent: devices, devices, messageId: messageId ? String(messageId) : null, via: 'convex notify:onMessage' });
}
