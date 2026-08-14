// GET  /api/dashboard/review-checklist?world=<world>[&deliverable=<id>]
// POST /api/dashboard/review-checklist  { action, world, deliverable, ... }
//
// A per-deliverable "what's next" checklist. The user opens a deliverable in the
// Review tool and builds a clean list of next steps the agent should do.
//
// Persistence: cm_state row per world (kind='dash_review_checklist', scope_id='all',
// client_id=<world>, payload={ items:{...}, updated }) — corner:state-to-supabase R1.
// The legacy review-checklist.json (tunnel/disk) is read once per world to self-migrate.
//
// GET  -> { items: {...} }  (or { deliverable, list:[...] } when ?deliverable given)
// POST add    { action:'add', world, deliverable, text }      -> { ok, id }
// POST toggle { action:'toggle', world, deliverable, id }     -> { ok, done }
// POST delete { action:'delete', world, deliverable, id }     -> { ok }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGetWithLegacy, stateSet } from '../_lib/stateStore.js';

const KIND = 'dash_review_checklist';
const LEGACY_REL = 'corner/users/aom/missions/master-loop/deliverables/review-checklist.json';

async function loadChecklist(world) {
  const payload = await stateGetWithLegacy({
    kind: KIND,
    scopeId: 'all',
    clientId: world,
    legacyPath: LEGACY_REL,
    fromLegacy: (file) => (file && file.items && typeof file.items === 'object')
      ? { items: file.items, updated: file.updated }
      : null,
    empty: { items: {} },
  });
  return (payload.items && typeof payload.items === 'object') ? payload.items : {};
}

async function saveChecklist(world, items) {
  return stateSet(KIND, 'all', world, { items, updated: new Date().toISOString() });
}

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const world = clean(req.query.world || '', 60) || '';
    const items = await loadChecklist(world);
    const deliverable = req.query.deliverable;
    if (deliverable) return res.status(200).json({ deliverable, list: items[deliverable] || [] });
    return res.status(200).json({ items, updated: new Date().toISOString() });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { action, world, deliverable } = req.body || {};
  try {
    await verifyTenant((world || '').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const did = clean(deliverable, 400);
  if (!did) return res.status(400).json({ error: 'deliverable required' });

  let items = await loadChecklist(world);
  if (!Array.isArray(items[did])) items[did] = [];
  const list = items[did];

  if (action === 'add') {
    const text = clean(req.body.text, 280);
    if (!text) return res.status(400).json({ error: 'text required' });
    const id = 'c-' + Date.now().toString(36);
    list.push({ id, text, done: false });
    const ok = await saveChecklist(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id });
  }

  if (action === 'toggle') {
    const id = clean(req.body.id, 64);
    const it = list.find((x) => x.id === id);
    if (!it) return res.status(404).json({ error: 'item not found' });
    it.done = !it.done;
    const ok = await saveChecklist(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, done: it.done });
  }

  if (action === 'delete') {
    const id = clean(req.body.id, 64);
    items[did] = list.filter((x) => x.id !== id);
    const ok = await saveChecklist(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
