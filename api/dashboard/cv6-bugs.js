// GET /api/dashboard/cv6-bugs   — list the CV6 bug tracker
// POST /api/dashboard/cv6-bugs  — add a bug, or update one's status
//
// Serves + edits the CV6 / cvg bug tracker so it renders and is editable live
// inside the dashboard Tracker tool.
//
// Persistence: cm_state row per world (kind='dash_cv6_bugs', scope_id='all',
// client_id=<world>, payload={ bugs:[...], updated }) — corner:state-to-supabase R1.
// The legacy cv6-bug-tracker.json (tunnel/disk) is read once per world to self-migrate.
//
// GET response:  { bugs: [{ id, page, title, expected, severity, status, owner }], updated, count }
// POST add:      { action:'add', page, title, expected, severity, owner?, world? } -> { ok, id }
// POST update:   { action:'update', id, status?, ...fields, world? }              -> { ok }

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { stateGetWithLegacy, stateSet } from '../_lib/stateStore.js';

const KIND = 'dash_cv6_bugs';
const LEGACY_REL = 'corner/users/aom/missions/master-loop/deliverables/cv6-bug-tracker.json';

async function loadBugs(world) {
  const payload = await stateGetWithLegacy({
    kind: KIND,
    scopeId: 'all',
    clientId: world,
    legacyPath: LEGACY_REL,
    fromLegacy: (file) => (file && Array.isArray(file.bugs))
      ? { bugs: file.bugs, updated: file.updated }
      : null,
    empty: { bugs: [] },
  });
  return Array.isArray(payload.bugs) ? payload.bugs : [];
}

async function saveBugs(world, bugs) {
  return stateSet(KIND, 'all', world, { bugs, updated: new Date().toISOString() });
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
    const _worldRaw = req.query.world && String(req.query.world).trim();
    if (!_worldRaw) return res.status(401).json({ error: 'Missing client' });
    const world = clean(_worldRaw, 60).toLowerCase();
    try {
      await verifyTenant(world, req);
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      return res.status(500).json({ error: 'Auth verification failed' });
    }
    const bugs = await loadBugs(world);
    return res.status(200).json({ bugs, count: bugs.length, updated: new Date().toISOString() });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  // Writes are tenant-gated (same posture as command-deck-action).
  const { action, world } = req.body || {};
  const _worldPost = world && String(world).trim();
  if (!_worldPost) return res.status(401).json({ error: 'Missing client' });
  let verified = null;
  try {
    verified = await verifyTenant(_worldPost.toLowerCase(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // Who filed / edited this, from the JWT. Three people share the AOM world, so
  // "the reporter" is a variable — it used to be stamped 'patrik' regardless.
  // verifyTenant already resolved the user, so the common path costs no extra
  // auth round trip; callerIdentity is the fallback for a shape without identity.
  const reporter = (verified && 'userName' in verified)
    ? verified
    : await callerIdentity(req).catch(() => null);
  const reporterName = clean(reporter?.userName || reporter?.email || '', 40) || null;

  let bugs = await loadBugs(world);

  if (action === 'add') {
    const title = clean(req.body.title, 160);
    if (!title) return res.status(400).json({ error: 'title required' });
    const id = 'u-' + Date.now().toString(36);
    const pr = parseInt(req.body.priority, 10);
    bugs.push({
      id,
      page: clean(req.body.page, 40) || 'General',
      title,
      expected: clean(req.body.expected, 240),
      severity: ALLOWED_STATUS.includes(req.body.severity) ? req.body.severity : (clean(req.body.severity, 12) || 'Medium'),
      priority: (pr >= 1 && pr <= 5) ? pr : 3,
      status: ALLOWED_STATUS.includes(req.body.status) ? req.body.status : 'Open',
      // Unassigned beats mis-assigned: an un-owned bug reads as un-owned in the
      // Tracker (`b.owner || ''`) instead of silently landing on Patrik's plate.
      owner: clean(req.body.owner, 24) || '',
      attachments: Array.isArray(req.body.attachments)
        ? req.body.attachments.slice(0, 12).map((a) => ({ name: clean(a && a.name, 200), path: clean(a && a.path, 400) })).filter((a) => a.name)
        : [],
      // The verified filer, or nothing. Never a stand-in name.
      added_by: reporterName,
      added_by_user_id: reporter?.userId || null,
    });
    const ok = await saveBugs(world, bugs);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id });
  }

  if (action === 'update') {
    const id = clean(req.body.id, 64);
    const bug = bugs.find((b) => b.id === id);
    if (!bug) return res.status(404).json({ error: 'bug not found' });
    if (req.body.status != null) bug.status = ALLOWED_STATUS.includes(req.body.status) ? req.body.status : bug.status;
    if (req.body.title != null) bug.title = clean(req.body.title, 160);
    if (req.body.expected != null) bug.expected = clean(req.body.expected, 240);
    if (req.body.severity != null) bug.severity = clean(req.body.severity, 12);
    // Assign-to-agent stamps the bug's owner (R-ASSIGN 2026-07-06; add already took owner, update didn't).
    if (req.body.owner != null) bug.owner = clean(req.body.owner, 24);
    if (req.body.priority != null) { const pr = parseInt(req.body.priority, 10); if (pr >= 1 && pr <= 5) bug.priority = pr; }
    // Trail of who last touched it — verified, never body-supplied.
    bug.updated_by = reporterName;
    bug.updated_by_user_id = reporter?.userId || null;
    bug.updated_at = new Date().toISOString();
    const ok = await saveBugs(world, bugs);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
