import test from 'node:test';
import assert from 'node:assert/strict';
import { applyChecklistAction } from '../api/dashboard/room-checklists.js';
import { buildChecklistRoomOptions, roomChecklistKey } from '../src/dashboard/cv6next/data/roomKeys.js';

test('checklist room keys keep agents, projects, and missions separate', () => {
  assert.equal(roomChecklistKey({ id: 'corner' }), 'agent:corner');
  assert.equal(roomChecklistKey({ id: 'corner', isProject: true }), 'project:corner');
  assert.equal(roomChecklistKey({ id: 'home', isMission: true, projectSlug: 'corner' }), 'mission:corner:home');
  assert.equal(roomChecklistKey({ missionSlug: 'corner:home', isMission: true }), 'mission:corner:home');
});

test('share directory includes nested missions even when no folder is open', () => {
  const options = buildChecklistRoomOptions(
    [{ id: 'ea', name: 'EA' }],
    [{ slug: 'corner', name: 'Corner' }],
    { corner: [{ slug: 'ops', name: 'Ops', children: [{ slug: 'daily', name: 'Daily' }] }] },
  );
  assert.deepEqual(options.map(roomChecklistKey), [
    'agent:ea',
    'project:corner',
    'mission:corner:ops',
    'mission:corner:daily',
  ]);
});

test('lists support create, edit, complete, copy, and move without sharing references', () => {
  let rooms = {};
  let result = applyChecklistAction(rooms, { action: 'create-list', room: 'agent:ea', title: 'Launch notes' });
  rooms = result.rooms;
  const listId = result.result.id;

  result = applyChecklistAction(rooms, { action: 'add-item', room: 'agent:ea', list_id: listId, text: 'Draft the intro' });
  rooms = result.rooms;
  const itemId = result.result.id;
  result = applyChecklistAction(rooms, { action: 'edit-item', room: 'agent:ea', list_id: listId, item_id: itemId, text: 'Draft the stronger intro' });
  rooms = result.rooms;
  result = applyChecklistAction(rooms, { action: 'toggle-item', room: 'agent:ea', list_id: listId, item_id: itemId });
  rooms = result.rooms;
  assert.equal(rooms['agent:ea'][0].items[0].text, 'Draft the stronger intro');
  assert.equal(rooms['agent:ea'][0].items[0].done, true);

  result = applyChecklistAction(rooms, { action: 'share-list', room: 'agent:ea', list_id: listId, target_room: 'project:corner', mode: 'copy' });
  rooms = result.rooms;
  assert.equal(rooms['agent:ea'].length, 1);
  assert.equal(rooms['project:corner'].length, 1);
  assert.notEqual(rooms['project:corner'][0].id, rooms['agent:ea'][0].id);
  assert.notEqual(rooms['project:corner'][0].items[0].id, rooms['agent:ea'][0].items[0].id);

  result = applyChecklistAction(rooms, { action: 'share-list', room: 'agent:ea', list_id: listId, target_room: 'mission:corner:home', mode: 'move' });
  rooms = result.rooms;
  assert.equal(rooms['agent:ea'].length, 0);
  assert.equal(rooms['mission:corner:home'][0].title, 'Launch notes');
  assert.equal(rooms['project:corner'][0].title, 'Launch notes');
});

test('sharing requires an explicit different destination and mode', () => {
  const created = applyChecklistAction({}, { action: 'create-list', room: 'agent:ea', title: 'Notes' });
  const listId = created.result.id;
  assert.throws(
    () => applyChecklistAction(created.rooms, { action: 'share-list', room: 'agent:ea', list_id: listId, target_room: 'agent:ea', mode: 'copy' }),
    /different destination/,
  );
  assert.throws(
    () => applyChecklistAction(created.rooms, { action: 'share-list', room: 'agent:ea', list_id: listId, target_room: 'project:corner' }),
    /copy or move required/,
  );
});
