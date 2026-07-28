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
import { callerIdentity } from '../_lib/verifyTenant.js';
import { applyCors } from '../_lib/originAllowlist.js';

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

// AUTH (r7:open-agent-surface, 2026-07-27). Unauthenticated with
// `Access-Control-Allow-Origin: *`. It reads a FIXED path — the master-loop
// room-goals deliverable off disk (or via the RAG tunnel) — so there is no
// traversal here, but the contents are AOM's live goals per room, which is not
// something to hand to anonymous callers. Both callers
// (cv6next/data/useCommandTracker.js, cv6next/data/useRoomThread.js) already
// use authFetch, so this costs no caller anything.
export default async function handler(req, res) {
  applyCors(req, res, 'GET');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const who = await callerIdentity(req);
  if (!who) return res.status(401).json({ error: 'sign in required' });

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
