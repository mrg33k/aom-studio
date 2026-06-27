// GET  /api/dashboard/room-goal-steps?world=<world>[&room=<roomKey>]
// POST /api/dashboard/room-goal-steps  { action, world, room, ... }
//
// A per-room "mission goals" checklist — the ordered list of goal steps the agent
// is working for a room (shown in the Chat tool's right context panel). The user
// adds steps and marks them done; the FIRST not-done step renders as the active
// goal. Stored as a single JSON on the studio disk, read+written through the RAG
// tunnel (Vercel has no disk). Same proven pattern as review-checklist.js — real
// data only, no fabricated steps.
//
// File shape: { items: { "<roomKey>": [ { id, text, done } ] }, updated }
//
// GET  -> { items: {...} }  (or { room, list:[...] } when ?room given)
// POST add    { action:'add', world, room, text }    -> { ok, id }
// POST toggle { action:'toggle', world, room, id }    -> { ok, done }
// POST delete { action:'delete', world, room, id }    -> { ok }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const NAME = 'room-goal-steps.json';
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
    const room = req.query.room;
    if (room) return res.status(200).json({ room, list: data.items[room] || [] });
    return res.status(200).json({ items: data.items, updated: data.updated || null });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { action, world, room } = req.body || {};
  try {
    await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const rkey = clean(room, 400);
  if (!rkey) return res.status(400).json({ error: 'room required' });

  const raw = await readSource();
  let data;
  try { data = raw ? JSON.parse(raw) : { items: {} }; } catch (_) { return res.status(500).json({ error: 'goal steps unreadable' }); }
  if (!data.items || typeof data.items !== 'object') data.items = {};
  if (!Array.isArray(data.items[rkey])) data.items[rkey] = [];
  const list = data.items[rkey];

  if (action === 'add') {
    const text = clean(req.body.text, 280);
    if (!text) return res.status(400).json({ error: 'text required' });
    const id = 'g-' + Date.now().toString(36);
    list.push({ id, text, done: false });
    data.updated = new Date().toISOString();
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id });
  }

  if (action === 'toggle') {
    const id = clean(req.body.id, 64);
    const it = list.find((x) => x.id === id);
    if (!it) return res.status(404).json({ error: 'item not found' });
    it.done = !it.done;
    data.updated = new Date().toISOString();
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, done: it.done });
  }

  if (action === 'delete') {
    const id = clean(req.body.id, 64);
    data.items[rkey] = list.filter((x) => x.id !== id);
    data.updated = new Date().toISOString();
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
