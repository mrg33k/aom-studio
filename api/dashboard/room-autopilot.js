// POST /api/dashboard/room-autopilot  { world, slug, on }  -> { ok, slug, autopilot }
// GET  /api/dashboard/room-autopilot?world=<world>          -> { autopilot: { "<bare-slug>": bool } }
//
// The Command Center "Master Loop" toggle: per room, whether the assistant keeps
// pushing that room forward on its own. The choice is stored as an `autopilot`
// boolean on the room's record in room-goals.json (the same goal ledger the loop
// reads). master-loop-tick.py honors it: autopilot === false means "leave this
// room alone"; absent/true keeps the default behavior. So the toggle is real, not
// decoration.
//
// room-goals.json lives in the master-loop deliverables dir and is on the RAG
// tunnel's writable whitelist. Reads come back through /project-file-raw; writes go
// through /command-deck-write. Local fs is the dev fallback. Same posture as
// cv6-bugs.js (tenant-gated writes, read-modify-write of the freshest file).

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const NAME = 'room-goals.json';
const REL = `corner/users/aom/missions/master-loop/deliverables/${NAME}`;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

// Match the loop's _bare(): a room key is compared on the segment after the last colon.
const bare = (s) => String(s || '').split(':').pop().trim() || String(s || '');

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const raw = await readSource();
    if (raw == null) return res.status(200).json({ autopilot: {} });
    try {
      const data = JSON.parse(raw);
      const rooms = (data && data.rooms) || {};
      const out = {};
      Object.entries(rooms).forEach(([slug, g]) => {
        // default ON: only an explicit false reads as off
        out[bare(slug)] = !(g && g.autopilot === false);
      });
      return res.status(200).json({ autopilot: out });
    } catch (_) {
      return res.status(200).json({ autopilot: {}, error: 'parse_failed' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { world, slug, on } = req.body || {};
  try {
    await verifyTenant((world || '').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const target = bare(slug);
  if (!target) return res.status(400).json({ error: 'slug required' });

  const raw = await readSource();
  let data;
  try { data = raw ? JSON.parse(raw) : { rooms: {} }; } catch (_) { return res.status(500).json({ error: 'room-goals unreadable' }); }
  if (!data.rooms || typeof data.rooms !== 'object') data.rooms = {};

  // Find the room record by bare-slug match (keys may be "project:mission" or bare).
  let key = Object.keys(data.rooms).find((k) => bare(k) === target);
  if (!key) { key = target; data.rooms[key] = data.rooms[key] || {}; }
  data.rooms[key].autopilot = !!on;

  const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
  if (!ok) return res.status(500).json({ error: 'write failed' });
  return res.status(200).json({ ok: true, slug: key, autopilot: !!on });
}
