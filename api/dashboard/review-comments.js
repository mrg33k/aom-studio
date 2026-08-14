// GET  /api/dashboard/review-comments?world=<world>[&deliverable=<id>]
// POST /api/dashboard/review-comments  { action, world, deliverable, ... }
//
// Per-deliverable review COMMENTS pinned to a place in the file:
//   - type 'timeline' : pinned to a video frame at time t (seconds)        -> { id, type:'timeline', t, text }
//   - type 'point'    : pinned to a spot on a doc/image/frame at x,y (0..1) -> { id, type:'point', x, y, text }
// Drives Frame.io-style video timeline comments + click-to-pin point comments
// on documents and still frames (Patrik R-MATCH: "video commenting must work,
// comments on all files by point selection in the document or still frame").
//
// Persistence: cm_state row per world (kind='dash_review_comments', scope_id='all',
// client_id=<world>, payload={ items:{...}, updated }) — corner:state-to-supabase R1.
// The legacy review-comments.json (tunnel/disk) is read once per world to self-migrate.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGetWithLegacy, stateSet } from '../_lib/stateStore.js';

const KIND = 'dash_review_comments';
const LEGACY_REL = 'corner/users/aom/missions/master-loop/deliverables/review-comments.json';

async function loadComments(world) {
  const payload = await stateGetWithLegacy({
    kind: KIND,
    scopeId: 'all',
    clientId: world,
    legacyPath: LEGACY_REL,
    fromLegacy: (file) => (file && file.items && typeof file.items === 'object')
      ? { items: file.items, updated: file.updated }
      : null,
    empty: { items: {} },
  });
  return (payload.items && typeof payload.items === 'object') ? payload.items : {};
}

async function saveComments(world, items) {
  return stateSet(KIND, 'all', world, { items, updated: new Date().toISOString() });
}

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null; };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const world = clean(req.query.world || '', 60) || '';
    const items = await loadComments(world);
    const deliverable = req.query.deliverable;
    if (deliverable) return res.status(200).json({ deliverable, list: items[deliverable] || [] });
    return res.status(200).json({ items, updated: new Date().toISOString() });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { action, world, deliverable } = req.body || {};
  try {
    await verifyTenant((world || '').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const did = clean(deliverable, 400);
  if (!did) return res.status(400).json({ error: 'deliverable required' });

  let items = await loadComments(world);
  if (!Array.isArray(items[did])) items[did] = [];
  const list = items[did];

  if (action === 'add') {
    const text = clean(req.body.text, 600);
    if (!text) return res.status(400).json({ error: 'text required' });
    const type = req.body.type === 'point' ? 'point' : 'timeline';
    const id = 'cm-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const entry = { id, type, text, created: new Date().toISOString() };
    if (type === 'timeline') {
      const t = num(req.body.t, 0, 1e6);
      if (t == null) return res.status(400).json({ error: 't required for timeline comment' });
      entry.t = Math.round(t * 1000) / 1000;
    } else {
      const x = num(req.body.x, 0, 1), y = num(req.body.y, 0, 1);
      if (x == null || y == null) return res.status(400).json({ error: 'x,y required for point comment' });
      entry.x = Math.round(x * 1e4) / 1e4; entry.y = Math.round(y * 1e4) / 1e4;
      // A CIRCLED comment (Patrik 2026-08-07: "when I'm leaving comments I'd like
      // to be able to circle things in red") carries radii as fractions of the
      // artwork's width/height, so x,y stay the circle's CENTRE and the existing
      // point-pin behaviour is unchanged when they are absent. Old rows have no
      // rx/ry and keep rendering as plain pins — this is purely additive.
      const rx = num(req.body.rx, 0, 1), ry = num(req.body.ry, 0, 1);
      if (rx != null && ry != null && rx > 0 && ry > 0) {
        entry.rx = Math.round(rx * 1e4) / 1e4;
        entry.ry = Math.round(ry * 1e4) / 1e4;
      }
      const pt = num(req.body.t, 0, 1e6); // a point pinned on a still video frame carries its time too
      if (pt != null) entry.t = Math.round(pt * 1000) / 1000;
    }
    list.push(entry);
    const ok = await saveComments(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id, comment: entry });
  }

  if (action === 'delete') {
    const id = clean(req.body.id, 80);
    items[did] = list.filter((x) => x.id !== id);
    const ok = await saveComments(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
