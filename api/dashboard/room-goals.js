// GET /api/dashboard/room-goals?world=<world>
//
// Read-only view of the loop's per-room goal memory (room-goals.json) for the
// Command room goal-ledger. Source of truth is room-goals.json on the studio disk
// — maintained by the master loop's goal-sweep and by command-deck-action.js
// (answer_question). This endpoint READS it through the RAG tunnel and mirrors
// every successful read into cm_state (kind='dash_room_goals'), so when the
// tunnel/laptop is down Command serves the last-known-good feed instead of an
// empty ledger (corner:state-to-supabase R1). The daemon stays the only writer.
//
// Returns: { rooms: { "<key>": { goal, source, status, confidence, open_question,
//   options?, last_reviewed, autopilot } }, generated, source: 'live'|'cache' }

import fs from 'fs';
import path from 'path';
import { stateGet, stateSet } from '../_lib/stateStore.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const REL = 'corner/users/aom/missions/master-loop/deliverables/room-goals.json';
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';
const KIND = 'dash_room_goals';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const world = String(req.query.world || 'aom').slice(0, 60) || 'aom';

  const raw = await readSource();
  if (raw) {
    let data;
    try { data = JSON.parse(raw); } catch (_) { data = null; }
    if (data && data.rooms && typeof data.rooms === 'object') {
      const payload = { rooms: data.rooms, generated: data.generated_at || null };
      stateSet(KIND, 'all', world, payload).catch(() => {}); // mirror, best effort
      return res.status(200).json({ ...payload, source: 'live' });
    }
  }

  // Tunnel down / file unreadable → last-known-good mirror, never an empty ledger.
  const cached = await stateGet(KIND, 'all', world);
  if (cached && cached.rooms) {
    return res.status(200).json({ rooms: cached.rooms, generated: cached.generated || null, source: 'cache' });
  }
  return res.status(200).json({ rooms: {}, generated: null, source: 'none' });
}
