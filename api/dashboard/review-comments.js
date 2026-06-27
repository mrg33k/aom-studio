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
// Same disk+tunnel persistence pattern as review-checklist.js (Vercel has no disk).
// File shape: { items: { "<deliverableId>": [ {id,type,t?,x?,y?,text,created} ] }, updated }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const NAME = 'review-comments.json';
const REL = `corner/users/aom/missions/master-loop/deliverables/${NAME}`;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

async function readSource() {
  try {
    const url = `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(REL)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (r.ok) return await r.text();
  } catch (_) { /* fall through */ }
  try {
    const p = path.join(AOM_EA_ROOT, REL);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  } catch (_) { /* ignore */ }
  return null;
}

async function writeSource(content) {
  try {
    const r = await fetch(`${RAG_TUNNEL_URL}/command-deck-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
      body: JSON.stringify({ name: NAME, content }),
    });
    if (r.ok) return true;
  } catch (_) { /* fall through */ }
  try {
    fs.writeFileSync(path.join(AOM_EA_ROOT, REL), content, 'utf8');
    return true;
  } catch (_) { return false; }
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
    const raw = await readSource();
    let data;
    try { data = raw ? JSON.parse(raw) : { items: {} }; } catch (_) { data = { items: {} }; }
    if (!data.items || typeof data.items !== 'object') data.items = {};
    const deliverable = req.query.deliverable;
    if (deliverable) return res.status(200).json({ deliverable, list: data.items[deliverable] || [] });
    return res.status(200).json({ items: data.items, updated: data.updated || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { action, world, deliverable } = req.body || {};
  try {
    await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const did = clean(deliverable, 400);
  if (!did) return res.status(400).json({ error: 'deliverable required' });

  const raw = await readSource();
  let data;
  try { data = raw ? JSON.parse(raw) : { items: {} }; } catch (_) { return res.status(500).json({ error: 'comments unreadable' }); }
  if (!data.items || typeof data.items !== 'object') data.items = {};
  if (!Array.isArray(data.items[did])) data.items[did] = [];
  const list = data.items[did];

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
      const pt = num(req.body.t, 0, 1e6); // a point pinned on a still video frame carries its time too
      if (pt != null) entry.t = Math.round(pt * 1000) / 1000;
    }
    list.push(entry);
    data.updated = new Date().toISOString();
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id, comment: entry });
  }

  if (action === 'delete') {
    const id = clean(req.body.id, 80);
    data.items[did] = list.filter((x) => x.id !== id);
    data.updated = new Date().toISOString();
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
