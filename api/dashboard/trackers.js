// GET  /api/dashboard/trackers?world=<world>
// POST /api/dashboard/trackers  { action, world, ... }
//
// Persistent store for USER-CREATED custom trackers (the per-room spreadsheets in
// the Tracker tool). The real, already-wired trackers (cv6-bugs via cv6-bugs.js,
// Space Rising tickets via admin-tickets.js) keep their own endpoints and are NOT
// stored here — this only saves the custom trackers the user builds so they stop
// vanishing on reload (Patrik 2026-06-19: "wire so trackers actually save +
// attachments + assign/invite people").
//
// A tracker: { id, name, scope, template, columns:[...], rows:[ {<col>:val, __id,
//   __assignee?, __attachments?:[{name,path}] } ], on, created, updated }
//
// Persistence: cm_state row per world (kind='dash_trackers', scope_id='all',
// client_id=<world>, payload={ trackers:[...] }) — corner:state-to-supabase R1.
// The legacy trackers.json (tunnel/disk) is read once per world to self-migrate.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGetWithLegacy, stateSet } from '../_lib/stateStore.js';

const KIND = 'dash_trackers';
const LEGACY_REL = 'corner/users/aom/missions/master-loop/deliverables/trackers.json';

async function loadTrackers(world) {
  const payload = await stateGetWithLegacy({
    kind: KIND,
    scopeId: 'all',
    clientId: world,
    legacyPath: LEGACY_REL,
    fromLegacy: (file) => (file && file.byWorld && Array.isArray(file.byWorld[world]))
      ? { trackers: file.byWorld[world] }
      : null,
    empty: { trackers: [] },
  });
  return Array.isArray(payload.trackers) ? payload.trackers : [];
}

async function saveTrackers(world, trackers) {
  return stateSet(KIND, 'all', world, { trackers, updated: new Date().toISOString() });
}

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const cleanMultiline = (s, n) => String(s == null ? '' : s).slice(0, n);
const newId = (pfx) => pfx + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

// sanitize a column list to <=12 short strings
function cleanColumns(cols) {
  if (!Array.isArray(cols)) return ['Item', 'Status'];
  const out = cols.map((c) => clean(c, 40)).filter(Boolean).slice(0, 12);
  return out.length ? out : ['Item', 'Status'];
}
// sanitize a single row object to the tracker's columns (+ meta fields)
function cleanRow(row, columns) {
  const r = {};
  for (const c of columns) r[c] = cleanMultiline((row && row[c]) || '', 2000);
  if (row && row.__id) r.__id = clean(row.__id, 60);
  if (row && row.__assignee) r.__assignee = clean(row.__assignee, 80);
  if (row && Array.isArray(row.__attachments)) {
    r.__attachments = row.__attachments.slice(0, 12).map((a) => ({ name: clean(a && a.name, 200), path: clean(a && a.path, 400) })).filter((a) => a.name);
  }
  return r;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    // corner:tenant-isolation R1: GET was unauthenticated and honored any
    // ?world=, leaking every world's custom trackers. Require the world and
    // verify the caller's JWT may access it — mirror the POST gate.
    const world = clean(req.query.world, 60);
    if (!world) return res.status(400).json({ error: 'world required' });
    try {
      await verifyTenant(world, req);
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      return res.status(500).json({ error: 'Auth verification failed' });
    }
    return res.status(200).json({ world, trackers: await loadTrackers(world) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const body = req.body || {};
  const world = clean(body.world || 'aom', 60) || 'aom';
  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  let list = await loadTrackers(world);
  const action = body.action;
  const find = (id) => list.find((t) => t.id === id);

  const save = async () => {
    const ok = await saveTrackers(world, list);
    if (!ok) { res.status(500).json({ error: 'write failed' }); return false; }
    return true;
  };

  if (action === 'create') {
    const columns = cleanColumns(body.columns);
    const t = {
      id: newId('trk'),
      name: clean(body.name, 120) || 'Untitled tracker',
      scope: clean(body.scope, 120) || 'Unassigned',
      template: clean(body.template, 40) || 'blank',
      columns,
      rows: Array.isArray(body.rows) ? body.rows.slice(0, 500).map((r) => { const cr = cleanRow(r, columns); if (!cr.__id) cr.__id = newId('row'); return cr; }) : [],
      on: !!body.on,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    list.push(t);
    if (!(await save())) return;
    return res.status(200).json({ ok: true, tracker: t });
  }

  // all remaining actions target an existing tracker by id
  const id = clean(body.id, 60);
  const t = find(id);
  if (action && action !== 'create' && !t) return res.status(404).json({ error: 'tracker not found' });

  if (action === 'set-cell') {
    const col = clean(body.col, 40);
    const i = Number(body.rowIdx);
    if (!t.columns.includes(col)) return res.status(400).json({ error: 'unknown column' });
    if (!Number.isInteger(i) || i < 0 || i >= t.rows.length) return res.status(400).json({ error: 'bad rowIdx' });
    t.rows[i][col] = cleanMultiline(body.val, 2000);
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true });
  }

  if (action === 'add-row') {
    const row = cleanRow(body.row || {}, t.columns);
    if (!row.__id) row.__id = newId('row');
    t.rows.push(row);
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true, row });
  }

  if (action === 'delete-row') {
    const i = Number(body.rowIdx);
    if (Number.isInteger(i) && i >= 0 && i < t.rows.length) t.rows.splice(i, 1);
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true });
  }

  if (action === 'set-assignee') {
    const i = Number(body.rowIdx);
    if (!Number.isInteger(i) || i < 0 || i >= t.rows.length) return res.status(400).json({ error: 'bad rowIdx' });
    t.rows[i].__assignee = clean(body.assignee, 80);
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true });
  }

  if (action === 'add-attachment') {
    const i = Number(body.rowIdx);
    if (!Number.isInteger(i) || i < 0 || i >= t.rows.length) return res.status(400).json({ error: 'bad rowIdx' });
    const att = { name: clean(body.name, 200), path: clean(body.path, 400) };
    if (!att.name) return res.status(400).json({ error: 'attachment name required' });
    if (!Array.isArray(t.rows[i].__attachments)) t.rows[i].__attachments = [];
    t.rows[i].__attachments.push(att);
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true, attachment: att });
  }

  if (action === 'toggle') {
    t.on = !t.on;
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true, on: t.on });
  }

  if (action === 'rename') {
    t.name = clean(body.name, 120) || t.name;
    t.updated = new Date().toISOString();
    if (!(await save())) return;
    return res.status(200).json({ ok: true });
  }

  if (action === 'delete') {
    list = list.filter((x) => x.id !== id);
    if (!(await save())) return;
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
