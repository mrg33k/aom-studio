// GET  /api/dashboard/room-checklists?world=<world>&room=<roomKey>
// POST /api/dashboard/room-checklists { action, world, room, ... }
//
// Private, user-owned room notebooks. This store is intentionally separate from
// room-goal-steps: that checklist describes agent execution; these lists remain
// quiet notes until the user explicitly presses Play in the composer.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateGet, stateSet } from '../_lib/stateStore.js';

const KIND = 'dash_room_checklists';
const clean = (value, limit) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function loadRooms(world) {
  const payload = await stateGet(KIND, 'all', world);
  return payload?.rooms && typeof payload.rooms === 'object' ? payload.rooms : {};
}

async function saveRooms(world, rooms) {
  return stateSet(KIND, 'all', world, { rooms, updated: new Date().toISOString() });
}

class ChecklistMutationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function fail(message, status) { throw new ChecklistMutationError(message, status); }
function listFor(rooms, room) {
  if (!Array.isArray(rooms[room])) rooms[room] = [];
  return rooms[room];
}

// Exported as a pure mutation seam for the API contract tests.
export function applyChecklistAction(inputRooms, body = {}) {
  const rooms = structuredClone(inputRooms && typeof inputRooms === 'object' ? inputRooms : {});
  const action = clean(body.action, 40);
  const room = clean(body.room, 400);
  if (!room) fail('room required');
  const lists = listFor(rooms, room);
  const listId = clean(body.list_id, 80);
  const itemId = clean(body.item_id, 80);
  const list = () => {
    const found = lists.find((entry) => entry?.id === listId);
    if (!found) fail('list not found', 404);
    if (!Array.isArray(found.items)) found.items = [];
    return found;
  };

  if (action === 'create-list') {
    if (lists.length >= 30) fail('room list limit reached');
    const title = clean(body.title, 80) || 'New list';
    const created = { id: makeId('list'), title, collapsed: false, items: [], created_at: new Date().toISOString() };
    lists.push(created);
    return { rooms, result: { id: created.id, lists } };
  }
  if (action === 'rename-list') {
    const title = clean(body.title, 80);
    if (!title) fail('title required');
    list().title = title;
    return { rooms, result: { lists } };
  }
  if (action === 'toggle-list') {
    const target = list();
    target.collapsed = !target.collapsed;
    return { rooms, result: { collapsed: target.collapsed, lists } };
  }
  if (action === 'delete-list') {
    if (!lists.some((entry) => entry?.id === listId)) fail('list not found', 404);
    rooms[room] = lists.filter((entry) => entry?.id !== listId);
    return { rooms, result: { lists: rooms[room] } };
  }
  if (action === 'add-item') {
    const target = list();
    if (target.items.length >= 200) fail('list item limit reached');
    const text = clean(body.text, 500);
    if (!text) fail('text required');
    const item = { id: makeId('item'), text, done: false, created_at: new Date().toISOString() };
    target.items.push(item);
    return { rooms, result: { id: item.id, lists } };
  }
  if (action === 'edit-item') {
    const text = clean(body.text, 500);
    if (!text) fail('text required');
    const item = list().items.find((entry) => entry?.id === itemId);
    if (!item) fail('item not found', 404);
    item.text = text;
    return { rooms, result: { lists } };
  }
  if (action === 'toggle-item') {
    const item = list().items.find((entry) => entry?.id === itemId);
    if (!item) fail('item not found', 404);
    item.done = !item.done;
    return { rooms, result: { done: item.done, lists } };
  }
  if (action === 'delete-item') {
    const target = list();
    if (!target.items.some((entry) => entry?.id === itemId)) fail('item not found', 404);
    target.items = target.items.filter((entry) => entry?.id !== itemId);
    return { rooms, result: { lists } };
  }
  if (action === 'share-list') {
    const targetRoom = clean(body.target_room, 400);
    const mode = body.mode === 'move' ? 'move' : body.mode === 'copy' ? 'copy' : '';
    if (!targetRoom || targetRoom === room) fail('choose a different destination room');
    if (!mode) fail('copy or move required');
    const source = list();
    const targetLists = listFor(rooms, targetRoom);
    if (targetLists.length >= 30) fail('destination list limit reached');
    const transferred = {
      ...source,
      id: makeId('list'),
      collapsed: false,
      items: source.items.map((item) => ({ ...item, id: makeId('item') })),
      created_at: new Date().toISOString(),
    };
    targetLists.push(transferred);
    if (mode === 'move') rooms[room] = lists.filter((entry) => entry?.id !== listId);
    return { rooms, result: { lists: rooms[room], target_lists: targetLists, mode, target_room: targetRoom } };
  }

  fail('unknown action');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'GET or POST only' });

  const world = clean(req.method === 'GET' ? req.query.world : req.body?.world, 60);
  try {
    await verifyTenant(world, req);
  } catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const room = clean(req.method === 'GET' ? req.query.room : req.body?.room, 400);
  if (!room) return res.status(400).json({ error: 'room required' });
  const rooms = await loadRooms(world);
  if (req.method === 'GET') return res.status(200).json({ room, lists: Array.isArray(rooms[room]) ? rooms[room] : [] });

  try {
    const { rooms: next, result } = applyChecklistAction(rooms, req.body);
    const ok = await saveRooms(world, next);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ChecklistMutationError) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: 'checklist update failed' });
  }
}
