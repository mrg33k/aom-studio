// GET /api/dashboard/cv6-bugs
//
// Serves the CV6 / cvg bug tracker so it renders live inside the dashboard
// Tracker tool. The source of truth is a JSON file on the studio disk:
//   AOM-EA/corner/missions/corner-ui-cv6/deliverables/cv6-bug-tracker.json
// It is edited live on disk (by an agent or by hand); this endpoint reads the
// current bytes through the same RAG tunnel the Command Center uses, so updates
// appear in the Tracker tool with no redeploy. Local fs is the dev fallback.
//
// Response: { bugs: [{ id, page, title, expected, severity, status, owner }], updated, count }

import fs from 'fs';
import path from 'path';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const REL = 'corner/missions/corner-ui-cv6/deliverables/cv6-bug-tracker.json';
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

async function readSource() {
  // Tunnel first (Vercel prod has no AOM-EA disk). Reads are not whitelisted.
  try {
    const url = `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(REL)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (r.ok) return await r.text();
  } catch (_) { /* fall through to local */ }
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
  if (raw == null) return res.status(200).json({ bugs: [], count: 0, updated: null });
  try {
    const data = JSON.parse(raw);
    const bugs = Array.isArray(data.bugs) ? data.bugs : [];
    return res.status(200).json({ bugs, count: bugs.length, updated: data.updated || null });
  } catch (_) {
    return res.status(200).json({ bugs: [], count: 0, updated: null, error: 'parse_failed' });
  }
}
