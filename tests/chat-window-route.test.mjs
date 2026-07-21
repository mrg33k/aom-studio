import test from 'node:test';
import assert from 'node:assert/strict';
import { chatWindowName, chatWindowRouteFromSearch, chatWindowUrl } from '../src/dashboard/cv6next/data/chatWindowRoute.js';

test('agent chat windows round-trip without tenant authority in the URL', () => {
  const url = chatWindowUrl({ id: 'web', name: 'Web', initials: 'WE', status: 'active' }, 'https://corner.test/dashboard?old=1');
  assert.equal(url.includes('world='), false);
  const parsed = chatWindowRouteFromSearch(new URL(url).search);
  assert.deepEqual(parsed.room, {
    id: 'web', name: 'Web', initials: 'WE', isProject: false, isMission: false,
    missionSlug: undefined, projectSlug: undefined, status: 'active', statusText: 'conversation',
  });
});

test('mission chat windows retain exact project and mission identity', () => {
  const room = { id: 'deal-bank', name: 'Deal Bank', initials: 'DB', isMission: true, missionSlug: 'space-rising:deal-bank', projectSlug: 'space-rising', statusText: 'Space Rising' };
  const url = chatWindowUrl(room, 'https://corner.test/dashboard');
  const parsed = chatWindowRouteFromSearch(new URL(url).search);
  assert.equal(parsed.room.missionSlug, 'space-rising:deal-bank');
  assert.equal(parsed.room.projectSlug, 'space-rising');
  assert.equal(parsed.room.statusText, 'Space Rising');
  assert.equal(chatWindowName(room, 'aom'), 'corner-chat-aom-mission-space-rising-deal-bank');
});

test('ordinary chat routes are not mistaken for dedicated windows', () => {
  assert.equal(chatWindowRouteFromSearch('?cv6=1&view=chat&room=web'), null);
  assert.equal(chatWindowRouteFromSearch('?cv6=1&view=home&popout=1&room=web'), null);
});
