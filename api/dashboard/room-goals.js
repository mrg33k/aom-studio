// GET /api/dashboard/room-goals?world=<world>
//
// Read-only view of the loop's per-room goal memory (room-goals.json) for the
// Command room goal-ledger. Source of truth is room-goals.json on the studio disk
// — maintained by the master loop's goal-sweep and by command-deck-action.js
// (answer_question). This endpoint only READS it through the RAG tunnel (Vercel has
// no disk). Same proven read pattern as room-goal-steps.js. Real data only.
//
// Returns: { rooms: { "<key>": { goal, source, status, confidence, open_question,
//   options?, last_reviewed, autopilot } }, generated }

import fs from 'fs';
import path from 'path';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const REL = 'corner/users/aom/missions/master-loop/deliverables/room-goals.json';
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const raw = await readSource();
  let data;
  try { data = raw ? JSON.parse(raw) : { rooms: {} }; } catch (_) { data = { rooms: {} }; }
  const rooms = (data && data.rooms && typeof data.rooms === 'object') ? data.rooms : {};
  return res.status(200).json({ rooms, generated: data.generated_at || null });
}
