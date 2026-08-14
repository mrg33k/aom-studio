// GET  /api/dashboard/room-goal-steps?world=<world>[&room=<roomKey>]
// POST /api/dashboard/room-goal-steps  { action, world, room, ... }
//
// A per-room "mission goals" checklist — the ordered list of goal steps the agent
// is working for a room (shown in the Chat tool's right context panel). The user
// adds steps and marks them done; the FIRST not-done step renders as the active
// goal.
//
// Persistence: cm_state row per world (kind='dash_room_goal_steps', scope_id='all',
// client_id=<world>, payload={ items:{...}, updated }) — corner:state-to-supabase R1.
// The legacy room-goal-steps.json (tunnel/disk) is read once per world to self-migrate.
// NOTE: plan-propose.py still writes the legacy file and gets re-pointed in the Command round.
//
// File shape: { items: { "<roomKey>": [ { id, text, done, source, proposed } ] }, updated }
//   source   : 'user' | 'agent'  — who put the step on the plan (default 'user')
//   proposed : bool              — an agent SUGGESTION not yet accepted (never committed fact)
// The goal-thread plan (corner:corner-ui-cv6:goal-thread-plan) renders the three item types apart:
//   DONE       = agent message blocks (history, elsewhere)
//   NEXT       = items here with source:'agent' (proposed:true until the user touches them)
//   YOURS      = items here with source:'user'
//
// GET  -> { items: {...} }  (or { room, list:[...] } when ?room given)
// POST add     { action:'add', world, room, text }            -> { ok, id }   (source:user)
// POST propose { action:'propose', world, room, text }        -> { ok, id }   (source:agent, proposed; idempotent net-new)
// POST edit    { action:'edit', world, room, id, text }       -> { ok }       (retext + claim to source:user)
// POST accept  { action:'accept', world, room, id }           -> { ok }       (clear proposed, claim to source:user)
// POST toggle  { action:'toggle', world, room, id }           -> { ok, done }
// POST delete  { action:'delete', world, room, id }           -> { ok }       (also = dismiss a proposal)

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGetWithLegacy, stateSet } from '../_lib/stateStore.js';

const KIND = 'dash_room_goal_steps';
const LEGACY_REL = 'corner/users/aom/missions/master-loop/deliverables/room-goal-steps.json';

async function loadSteps(world) {
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

async function saveSteps(world, items) {
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
    const items = await loadSteps(world);
    // Archived steps (stale never-accepted proposals the goal-notetaker aged
    // out) stay in the store but never render — filtered here once so every
    // surface (Command ledger, Chat plan, legacy) agrees.
    const hideArchived = (lst) => (Array.isArray(lst) ? lst.filter((x) => !(x && x.archived)) : []);
    const room = req.query.room;
    if (room) return res.status(200).json({ room, list: hideArchived(items[room]) });
    const visible = {};
    for (const [k, lst] of Object.entries(items)) visible[k] = hideArchived(lst);
    return res.status(200).json({ items: visible, updated: new Date().toISOString() });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const { action, world, room } = req.body || {};
  try {
    await verifyTenant((world || '').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const rkey = clean(room, 400);
  if (!rkey) return res.status(400).json({ error: 'room required' });

  let items = await loadSteps(world);
  if (!Array.isArray(items[rkey])) items[rkey] = [];
  const list = items[rkey];

  const norm = (s) => clean(s, 280).toLowerCase();

  if (action === 'add') {
    const text = clean(req.body.text, 280);
    if (!text) return res.status(400).json({ error: 'text required' });
    const id = 'g-' + Date.now().toString(36);
    list.push({ id, text, done: false, source: 'user', proposed: false });
    const ok = await saveSteps(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id });
  }

  // Agent-proposed next step. Idempotent + net-new only: if a step with the same text
  // already exists (in ANY source/state), do nothing — so re-emitting the plan each turn
  // never duplicates and never clobbers a user's edit of that same step (the trust rule).
  if (action === 'propose') {
    const text = clean(req.body.text, 280);
    if (!text) return res.status(400).json({ error: 'text required' });
    const existing = list.find((x) => norm(x.text) === norm(text));
    if (existing) return res.status(200).json({ ok: true, id: existing.id, existed: true });
    const id = 'g-' + Date.now().toString(36);
    list.push({ id, text, done: false, source: 'agent', proposed: true });
    const ok = await saveSteps(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, id });
  }

  // User edits a step's text -> it's now theirs (claim + clear the proposed flag).
  if (action === 'edit') {
    const id = clean(req.body.id, 64);
    const text = clean(req.body.text, 280);
    if (!text) return res.status(400).json({ error: 'text required' });
    const it = list.find((x) => x.id === id);
    if (!it) return res.status(404).json({ error: 'item not found' });
    it.text = text; it.source = 'user'; it.proposed = false;
    const ok = await saveSteps(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  // User accepts an agent proposal as-is -> claim it, clear proposed (no longer a suggestion).
  if (action === 'accept') {
    const id = clean(req.body.id, 64);
    const it = list.find((x) => x.id === id);
    if (!it) return res.status(404).json({ error: 'item not found' });
    it.source = 'user'; it.proposed = false;
    const ok = await saveSteps(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  if (action === 'toggle') {
    const id = clean(req.body.id, 64);
    const it = list.find((x) => x.id === id);
    if (!it) return res.status(404).json({ error: 'item not found' });
    it.done = !it.done;
    const ok = await saveSteps(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, done: it.done });
  }

  if (action === 'delete') {
    const id = clean(req.body.id, 64);
    items[rkey] = list.filter((x) => x.id !== id);
    const ok = await saveSteps(world, items);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
