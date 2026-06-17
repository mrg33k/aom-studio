// GET /api/dashboard/cv6-bugs   — list the CV6 bug tracker
// POST /api/dashboard/cv6-bugs  — add a bug, or update one's status
//
// Serves + edits the CV6 / cvg bug tracker so it renders and is editable live
// inside the dashboard Tracker tool. Source of truth is a JSON file on the
// studio disk:
//   AOM-EA/corner/users/aom/missions/master-loop/deliverables/cv6-bug-tracker.json
// (in the master-loop deliverables dir because that is the path the RAG tunnel
// serves AND the only dir it lets us write). Reads come back through
// /project-file-raw; writes go through /command-deck-write (the file is on that
// tunnel's writable whitelist). Local fs is the dev fallback.
//
// GET response:  { bugs: [{ id, page, title, expected, severity, status, owner }], updated, count }
// POST add:      { action:'add', page, title, expected, severity, owner?, world? } -> { ok, id }
// POST update:   { action:'update', id, status?, ...fields, world? }              -> { ok }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const NAME = 'cv6-bug-tracker.json';
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
const ALLOWED_STATUS = ['Open', 'In progress', 'Done'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
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

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  // Writes are tenant-gated (same posture as command-deck-action).
  const { action, world } = req.body || {};
  try {
    await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const raw = await readSource();
  let data;
  try { data = raw ? JSON.parse(raw) : { bugs: [] }; } catch (_) { return res.status(500).json({ error: 'tracker file unreadable' }); }
  if (!Array.isArray(data.bugs)) data.bugs = [];

  if (action === 'add') {
    const title = clean(req.body.title, 160);
    if (!title) return res.status(400).json({ error: 'title required' });
    const id = 'u-' + Date.now().toString(36);
    const pr = parseInt(req.body.priority, 10);
    data.bugs.push({
      id,
      page: clean(req.body.page, 40) || 'General',
      title,
      expected: clean(req.body.expected, 240),
      severity: ALLOWED_STATUS.includes(req.body.severity) ? req.body.severity : (clean(req.body.severity, 12) || 'Medium'),
      priority: (pr >= 1 && pr <= 5) ? pr : 3,
      status: 'Open',
      owner: clean(req.body.owner, 24) || 'Patrik',
      added_by: 'patrik',
    });
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id });
  }

  if (action === 'update') {
    const id = clean(req.body.id, 64);
    const bug = data.bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'bug not found' });
    if (req.body.status != null) bug.status = ALLOWED_STATUS.includes(req.body.status) ? req.body.status : bug.status;
    if (req.body.title != null) bug.title = clean(req.body.title, 160);
    if (req.body.expected != null) bug.expected = clean(req.body.expected, 240);
    if (req.body.severity != null) bug.severity = clean(req.body.severity, 12);
    if (req.body.priority != null) { const pr = parseInt(req.body.priority, 10); if (pr >= 1 && pr <= 5) bug.priority = pr; }
    const ok = await writeSource(JSON.stringify(data, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
