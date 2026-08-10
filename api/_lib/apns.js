// api/_lib/apns.js — the APNs lane. corner:native-ios Stage 0.
//
// WHAT THIS IS. A dependency-free sender for Apple Push Notification service,
// sitting beside the Web Push lane in api/push/notify.js. Web Push reaches
// browsers and home-screen PWAs; APNs reaches the native iOS app. Same job,
// incompatible transports — VAPID/AES-GCM over plain HTTPS vs. a team-signed
// ES256 JWT over HTTP/2 — so they are two senders, not one with a branch.
//
// ZERO NEW DEPENDENCIES, on purpose. `node-apn` and friends are unmaintained or
// heavy, and every one of them exists to do exactly two things Node already does:
//   - sign an ES256 JWT              -> node:crypto (`dsaEncoding: 'ieee-p1363'`
//                                       emits the raw r||s JOSE signature directly,
//                                       so no DER unpacking by hand)
//   - speak HTTP/2 to Apple          -> node:http2 (undici's fetch is HTTP/1.1 only
//                                       and CANNOT talk to api.push.apple.com — this
//                                       is the reason this file is not 20 lines of
//                                       fetch())
// Both are core modules on Vercel's Node runtime. Nothing to install, nothing to
// audit, nothing that can break on a lockfile bump.
//
// UNSET = CLEAN NO-OP. The APNs auth key (.p8) does not exist in the Apple portal
// yet (2026-08-10). Every entry point checks apnsConfigured() first and returns
// `{ skipped: 'not configured' }` with ONE log line. It never throws, never retries,
// and never lets a missing key turn into a failed chat message. When the key lands,
// setting four env vars turns this on with no code change.
//
// ENV:
//   APNS_KEY_ID       the .p8 key id (10 chars, from the Apple developer portal)
//   APNS_TEAM_ID      Apple team id (PDYFTMXNJ2 for AOM)
//   APNS_PRIVATE_KEY  the .p8 contents (PEM). Literal "\n" escapes are accepted, and
//                     a bare base64 body with no PEM armor is wrapped automatically —
//                     both are how this value survives a paste into a Vercel env box.
//   APNS_BUNDLE_ID    apns-topic; defaults to com.aheadofmarket.corner
//   APNS_ENV          'production' | 'sandbox' — the DEFAULT host for a token row
//                     that does not name its own environment. A token minted by a
//                     debug build is rejected by the production gateway and vice
//                     versa, so device_tokens.environment wins when it is set.
//
// 4.5.4 NOTE (App Store guideline): push must never be REQUIRED for the app to work
// and must not carry sensitive content. The body here is a truncated preview and the
// payload carries ids, not data — the app fetches the real thread on tap. Delivery
// is best-effort by design; the durable path is still the message row.

import crypto from 'node:crypto';
import http2 from 'node:http2';

const DEFAULT_BUNDLE_ID = 'com.aheadofmarket.corner';
const PROD_HOST = 'https://api.push.apple.com';
const SANDBOX_HOST = 'https://api.sandbox.push.apple.com';

// Apple rejects a provider token older than 1 hour and throttles (TooManyProviderTokenUpdates)
// anyone who mints a new one more than once every 20 minutes. 50 minutes sits safely
// inside both walls. Module scope, so a warm Vercel function reuses it.
const TOKEN_TTL_MS = 50 * 60 * 1000;
let _cachedJwt = null;
let _cachedJwtAt = 0;
let _cachedJwtKid = null;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Accept the .p8 in any of the three shapes it actually arrives in: real PEM, PEM
// with escaped newlines (Vercel env box), or the naked base64 body.
export function normalizePrivateKey(raw) {
  let key = String(raw || '').trim();
  if (!key) return '';
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  if (!key.includes('-----BEGIN')) {
    const body = key.replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g) || [];
    key = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }
  return key;
}

export function apnsConfig() {
  return {
    keyId: (process.env.APNS_KEY_ID || '').trim(),
    teamId: (process.env.APNS_TEAM_ID || '').trim(),
    privateKey: normalizePrivateKey(process.env.APNS_PRIVATE_KEY),
    bundleId: (process.env.APNS_BUNDLE_ID || DEFAULT_BUNDLE_ID).trim(),
    // Anything that is not literally a sandbox word means production. A typo must
    // not silently point production traffic at the sandbox gateway.
    defaultEnv: /^(sandbox|development|dev)$/i.test((process.env.APNS_ENV || '').trim())
      ? 'sandbox'
      : 'production',
  };
}

export function apnsConfigured() {
  const c = apnsConfig();
  return !!(c.keyId && c.teamId && c.privateKey);
}

// ES256 provider token. Header carries the key id, payload carries the team id and
// an issued-at; that is the entire APNs auth contract.
export function apnsProviderToken() {
  const { keyId, teamId, privateKey } = apnsConfig();
  if (!keyId || !teamId || !privateKey) return null;
  const now = Date.now();
  if (_cachedJwt && _cachedJwtKid === keyId && now - _cachedJwtAt < TOKEN_TTL_MS) return _cachedJwt;

  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign(
    'sha256',
    Buffer.from(signingInput),
    { key: crypto.createPrivateKey({ key: privateKey, format: 'pem' }), dsaEncoding: 'ieee-p1363' },
  );
  _cachedJwt = `${signingInput}.${b64url(signature)}`;
  _cachedJwtAt = now;
  _cachedJwtKid = keyId;
  return _cachedJwt;
}

// A token Apple has told us is dead must be dropped, or every future fan-out pays
// for it forever. 410 Unregistered is the canonical signal; 400 BadDeviceToken and
// DeviceTokenNotForTopic are the same fact reported earlier.
function isDeadToken(status, reason) {
  if (status === 410) return true;
  return status === 400 && (reason === 'BadDeviceToken' || reason === 'DeviceTokenNotForTopic');
}

function hostFor(environment, defaultEnv) {
  const env = environment || defaultEnv;
  return env === 'sandbox' ? SANDBOX_HOST : PROD_HOST;
}

/**
 * Send one payload to a set of device tokens.
 *
 * @param {Array<{token:string, environment?:string}|string>} devices
 * @param {{title?:string, body?:string, data?:object, collapseId?:string, badge?:number,
 *          sound?:string, threadId?:string, contentAvailable?:boolean,
 *          category?:string}} notification
 * @returns {Promise<{ok:boolean, skipped?:string, sent:number, dead:string[], errors:Array}>}
 */
export async function sendApnsBatch(devices, notification = {}) {
  const list = (Array.isArray(devices) ? devices : [])
    .map((d) => (typeof d === 'string' ? { token: d } : d))
    .filter((d) => d && typeof d.token === 'string' && d.token.trim());
  if (!list.length) return { ok: true, sent: 0, dead: [], errors: [] };

  if (!apnsConfigured()) {
    console.log('[apns] not configured (APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY unset) — skipping push for %d device(s)', list.length);
    return { ok: true, skipped: 'not configured', sent: 0, dead: [], errors: [] };
  }

  const cfg = apnsConfig();
  let jwt;
  try {
    jwt = apnsProviderToken();
  } catch (err) {
    console.warn('[apns] provider token could not be signed — check APNS_PRIVATE_KEY:', err?.message || err);
    return { ok: false, skipped: 'bad key', sent: 0, dead: [], errors: [{ error: String(err?.message || err) }] };
  }
  if (!jwt) return { ok: false, skipped: 'not configured', sent: 0, dead: [], errors: [] };

  const alert = {};
  if (notification.title) alert.title = String(notification.title);
  if (notification.body) alert.body = String(notification.body);
  const aps = {
    ...(Object.keys(alert).length ? { alert } : {}),
    sound: notification.sound || 'default',
    ...(notification.badge != null ? { badge: Number(notification.badge) } : {}),
    ...(notification.threadId ? { 'thread-id': String(notification.threadId) } : {}),
    // Actionable notifications. The category is a NAME the client registered its
    // buttons under (PushService.deliveryCategory); an unrecognised name degrades to a
    // plain banner, which is why an older build receiving this payload loses the
    // buttons and nothing else.
    ...(notification.category ? { category: String(notification.category) } : {}),
    // content-available wakes the app so it can delta-fetch the thread it just got
    // told about — the notification is the *signal*, the row is the truth.
    ...(notification.contentAvailable ? { 'content-available': 1 } : {}),
  };
  const bodyJson = JSON.stringify({ aps, ...(notification.data && typeof notification.data === 'object' ? notification.data : {}) });

  // Group by gateway so each host opens exactly one HTTP/2 session for the batch.
  const byHost = new Map();
  for (const d of list) {
    const host = hostFor(d.environment, cfg.defaultEnv);
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(d.token.trim());
  }

  let sent = 0;
  const dead = [];
  const errors = [];

  for (const [host, tokens] of byHost.entries()) {
    let client;
    try {
      client = http2.connect(host);
    } catch (err) {
      errors.push({ host, error: String(err?.message || err) });
      continue;
    }
    // An unreachable gateway must not hold the function open.
    const sessionErr = (err) => errors.push({ host, error: String(err?.message || err) });
    client.on('error', sessionErr);
    client.setTimeout(8000, () => { try { client.destroy(); } catch { /* already gone */ } });

    try {
      const results = await Promise.all(tokens.map((token) => new Promise((resolve) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; resolve(v); } };
        let req;
        try {
          req = client.request({
            ':method': 'POST',
            ':path': `/3/device/${token}`,
            authorization: `bearer ${jwt}`,
            'apns-topic': cfg.bundleId,
            'apns-push-type': notification.contentAvailable && !notification.title && !notification.body ? 'background' : 'alert',
            'apns-priority': '10',
            // Stop trying after 15 minutes — a chat reply nobody saw for a quarter
            // hour is stale, and a stored notification storm on reconnect is worse
            // than a miss.
            'apns-expiration': String(Math.floor(Date.now() / 1000) + 900),
            ...(notification.collapseId ? { 'apns-collapse-id': String(notification.collapseId).slice(0, 64) } : {}),
            'content-type': 'application/json',
          });
        } catch (err) {
          return done({ token, ok: false, error: String(err?.message || err) });
        }
        let status = 0;
        let chunks = '';
        req.setTimeout(8000, () => { try { req.close(); } catch { /* noop */ } done({ token, ok: false, error: 'timeout' }); });
        req.on('response', (headers) => { status = Number(headers[':status']) || 0; });
        req.on('data', (c) => { chunks += c; });
        req.on('error', (err) => done({ token, ok: false, error: String(err?.message || err) }));
        req.on('end', () => {
          let reason = null;
          if (chunks) { try { reason = JSON.parse(chunks).reason || null; } catch { reason = chunks.slice(0, 120); } }
          done({ token, ok: status === 200, status, reason });
        });
        req.end(bodyJson);
      })));

      for (const r of results) {
        if (r.ok) { sent += 1; continue; }
        if (isDeadToken(r.status, r.reason)) { dead.push(r.token); continue; }
        errors.push({ token: r.token.slice(0, 8), status: r.status, reason: r.reason || r.error });
      }
    } finally {
      try { client.close(); } catch { /* already closed */ }
    }
  }

  if (errors.length) console.warn('[apns] %d push error(s):', errors.length, errors.slice(0, 5));
  return { ok: true, sent, dead, errors };
}

// ---------------------------------------------------------------------------
// FAN-OUT FROM A MESSAGE ROW
//
// The same exclusion set as api/push/notify.js::isRealAgentMessage, deliberately
// duplicated rather than shared: the two lanes must be allowed to diverge (a
// native app may one day want a silent content-available for rows the web dot
// ignores), and a shared helper would make that a breaking change to both. If you
// change what counts as "someone messaged you", change it in BOTH places or write
// down why they now differ.
// ---------------------------------------------------------------------------

const BODY_PREVIEW_CHARS = 120;

export function isPushableAssistantRow(record) {
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

// "Corner" is never the answer here — a lock screen that says Corner for every
// room tells you nothing. Mission > project > agent, prettified, is the room name
// the user recognizes (same rule as notify.js::titleFor).
export function titleForRow(record) {
  const md = record.metadata || {};
  const room = md.mission_slug || record.project || record.agent || 'Corner';
  return String(room)
    .split(':').pop()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function previewForRow(record) {
  const text = String(record.text || '').replace(/\s+/g, ' ').trim();
  // A delivery row's text is usually the bridge's own announcement ("Attached file:
  // Q3-deck.pdf"). "Attached file:" is our plumbing, not a sentence anyone says, so a
  // lock screen gets the fact instead: someone sent you a thing, and its name.
  const delivery = deliveryForRow(record);
  if (delivery && isBareAnnouncement(text)) return `Sent you ${delivery.name}`;
  return text.length > BODY_PREVIEW_CHARS ? `${text.slice(0, BODY_PREVIEW_CHARS - 1)}…` : text;
}

function isBareAnnouncement(text) {
  return /^attached (file|\d+\s+files?):/i.test(String(text || '').trim());
}

/**
 * The ONE file this row delivered, when it delivered exactly one as a deliberate
 * hand-off. Null otherwise — and "otherwise" deliberately includes the multi-file case.
 *
 * WHY SINGLE-FILE ONLY. The approve action decides ONE deliverable id. A push about a
 * four-file drop carrying one file's id would approve the first and silently leave three
 * waiting, while telling the user "Approved". There is no honest one-button verdict on a
 * set, so a multi-file delivery gets a plain banner and the user opens the app — where
 * four files are visibly four files.
 *
 * The eligibility rule matches review-queue.js's waiting set (deliberate agent hand-offs:
 * metadata.handoff, source 'share-file', or a watcher auto-share) so the button can only
 * appear on something the queue actually considers reviewable. An approve on anything
 * else would record a verdict against a file that was never waiting for one.
 */
export function deliveryForRow(record) {
  if (!record || record.role !== 'assistant') return null;
  const md = record.metadata || {};
  const source = String(record.source || '');
  const eligible = md.handoff === true || source === 'share-file' || source === 'auto-share';
  if (!eligible) return null;

  // Exactly one attachment, in either metadata shape.
  let att = null;
  if (Array.isArray(md.attachments)) {
    if (md.attachments.length !== 1) return null;
    att = md.attachments[0];
  } else if (md.attachment && typeof md.attachment === 'object') {
    att = md.attachment;
  }
  if (!att) return null;

  const url = String(att.url || '').trim();
  if (!url) return null;
  const name = String(att.name || '').trim() || decodeURIComponent(url.split('?')[0].split('/').pop() || 'the file');
  return {
    // The deliverable id the review endpoints key on is the attachment URL
    // (api/_lib/fileRef.js: review.id = url). Anything else here approves nothing.
    url,
    name,
    // Content identity, so a verdict taken from the lock screen suppresses a re-share of
    // the same bytes exactly like one taken in the app.
    sourcePath: String(md.source_path || att.source_path || '') || null,
    sha256: /^[a-f0-9]{64}$/i.test(String(att.sha256 || '')) ? String(att.sha256).toLowerCase() : null,
  };
}

/**
 * Look up the devices signed into this row's world and push the reply to them.
 * Resolves rather than rejects on every failure path — the caller is the chat
 * write path and MUST NOT be able to fail because a phone was unreachable.
 */
export async function notifyDevicesForMessageRow({ supabaseUrl, headers, row }) {
  try {
    if (!supabaseUrl || !headers || !row) return { ok: true, skipped: 'no context' };
    if (!isPushableAssistantRow(row)) return { ok: true, skipped: 'not a user-facing agent message' };

    // client_id is the tenant column every dashboard query filters on and the one
    // notify.js already trusts; messages.world_id is under-written and defaulted.
    // No world resolved => notify NOBODY. Under-notifying is always safer than
    // putting one world's room name on another world's lock screen.
    const world = row.client_id || row.world_id || null;
    if (!world) return { ok: true, skipped: 'no world resolved' };

    if (!apnsConfigured()) {
      console.log('[apns] fan-out skipped for room %s — APNs not configured', row.room_id || world);
      return { ok: true, skipped: 'not configured' };
    }

    const url = `${supabaseUrl}/rest/v1/device_tokens?select=token,environment&world_id=eq.${encodeURIComponent(world)}&limit=200`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn('[apns] device_tokens lookup failed (%s) for world %s', res.status, world);
      return { ok: false, skipped: 'lookup failed' };
    }
    const devices = await res.json().catch(() => []);
    if (!Array.isArray(devices) || !devices.length) return { ok: true, sent: 0, skipped: 'no devices' };

    const delivery = deliveryForRow(row);

    const result = await sendApnsBatch(devices, {
      title: titleForRow(row),
      body: previewForRow(row),
      // One banner per room, replaced in place — a room that produced six replies
      // while you were away is one notification, not six.
      collapseId: row.room_id || undefined,
      threadId: row.room_id || undefined,
      // Actionable ONLY for a single-file hand-off (see deliveryForRow). Every other
      // reply keeps the plain banner it has always had.
      category: delivery ? 'CORNER_DELIVERY' : undefined,
      data: {
        room_id: row.room_id || null,
        message_id: row.id || null,
        agent: row.agent || null,
        project: row.project || null,
        mission_slug: (row.metadata && row.metadata.mission_slug) || null,
        world_id: world,
        // Deep link the native app routes on; `url` is the web equivalent so the
        // same payload works if a browser client ever consumes it.
        deep_link: row.room_id ? `corner://room/${encodeURIComponent(row.room_id)}` : 'corner://rooms',
        url: '/dashboard',
        // The file the actions act on. Ids only — 4.5.4 says a push must not carry the
        // content itself, and the app fetches the real bytes on tap anyway.
        ...(delivery ? {
          file_url: delivery.url,
          file_name: delivery.name,
          file_source_path: delivery.sourcePath,
          file_sha256: delivery.sha256,
        } : {}),
      },
    });

    // Apple said these installs are gone. Keeping them means retrying forever.
    if (result.dead?.length) {
      const list = result.dead.map((t) => `"${t}"`).join(',');
      await fetch(`${supabaseUrl}/rest/v1/device_tokens?token=in.(${encodeURIComponent(list)})`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});
      console.log('[apns] pruned %d dead device token(s)', result.dead.length);
    }
    return result;
  } catch (err) {
    console.warn('[apns] fan-out error (swallowed — chat write is unaffected):', err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
