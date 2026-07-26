// Pending-route quarantine — corner:front-door R11
//
// Guards the rule that closes R10's named open defect: a message the front door routed on
// its own shapes NOTHING about a room until the user accepts it. Before this, one misroute
// wrote itself into the wrong room's description, which permanently disarmed the R10
// undescribed-name cap for that room and taught the router to repeat the same mistake.
//
// Run: node tests/room-activity-quarantine.test.mjs

import assert from 'node:assert/strict';
import { acceptedTexts, digestOf } from '../api/dashboard/room-activity.js';

let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log(`  ok  ${name}`); };

// Rows as room-activity buffers them: NEWEST FIRST, mirroring PostgREST's timestamp.desc.
const user = (text, routed) => ({ text, role: 'user', metadata: routed ? { routed } : {} });
const agent = (text) => ({ text, role: 'assistant', metadata: {} });

const PENDING = { auto: true, confidence: 0.93 };
const ACCEPTED = { auto: true, confidence: 0.93, accepted: true };

console.log('room-activity: pending-route quarantine');

test('a pending exchange is dropped — the message AND the reply it drew', () => {
  const rows = [
    agent('I tightened the cuts on the day 3 reel and re-rendered it.'),
    agent('Picking that up now.'),
    user('Can you tighten the timing on the day 3 reel, the cuts feel late.', PENDING),
    agent('Summit highlight selects are locked at 90 seconds.'),
    user('How long is the summit cut?'),
  ];
  const kept = acceptedTexts(rows);
  assert.deepEqual(kept, [
    'Summit highlight selects are locked at 90 seconds.',
    'How long is the summit cut?',
  ]);
  // The room must not describe itself in the misrouted topic's words.
  const hint = digestOf(kept);
  assert.ok(!/day 3|reel/i.test(hint), `hint still carries the misroute: ${hint}`);
  assert.ok(/summit/i.test(hint));
});

test('accepting the route restores the whole exchange', () => {
  const rows = [
    agent('I tightened the cuts and re-rendered it.'),
    user('Can you tighten the timing on the day 3 reel.', ACCEPTED),
    user('How long is the summit cut?'),
  ];
  assert.equal(acceptedTexts(rows).length, 3);
  assert.ok(/day 3/i.test(digestOf(acceptedTexts(rows))));
});

test('a message the user typed in the room is never quarantined', () => {
  const rows = [agent('On it.'), user('Swap the endcard on the summit reel.')];
  assert.equal(acceptedTexts(rows).length, 2);
});

test('the window closes at the next user turn, not at the next message', () => {
  const rows = [
    agent('Second reply, after the user came back.'),
    user('Actually, about the summit cut.'),
    agent('Reply to the pending one.'),
    agent('Second reply to the pending one.'),
    user('Misrouted question.', PENDING),
  ];
  assert.deepEqual(acceptedTexts(rows), [
    'Second reply, after the user came back.',
    'Actually, about the summit cut.',
  ]);
});

test('back-to-back pending routes both stay quarantined', () => {
  const rows = [
    agent('Reply two.'),
    user('Second misroute.', PENDING),
    agent('Reply one.'),
    user('First misroute.', PENDING),
  ];
  assert.deepEqual(acceptedTexts(rows), []);
});

test('an accepted route closes a window opened by a pending one', () => {
  const rows = [
    agent('Reply to the accepted one.'),
    user('Accepted follow-up.', ACCEPTED),
    agent('Reply to the pending one.'),
    user('Pending question.', PENDING),
  ];
  assert.deepEqual(acceptedTexts(rows), [
    'Reply to the accepted one.',
    'Accepted follow-up.',
  ]);
});

test('a room whose only recent traffic is pending ends up with NO hint', () => {
  const rows = [agent('Working on it.'), user('Misrouted.', PENDING)];
  assert.equal(digestOf(acceptedTexts(rows)), '');
  // An empty hint is what re-arms intake-route's undescribedNameMatch cap, so the next
  // name-only match gets asked about rather than auto-opened. That is the whole point.
});

test('agent rows before any user turn are kept (a room can open with a report)', () => {
  const rows = [agent('Day 3 reel v4 shipped.'), agent('reel.qa.json')];
  assert.equal(acceptedTexts(rows).length, 2);
});

test('order is preserved newest-first, so digestOf still reads the freshest lines first', () => {
  const rows = [agent('newest'), user('middle'), agent('oldest')];
  assert.deepEqual(acceptedTexts(rows), ['newest', 'middle', 'oldest']);
});

test('rows with no metadata at all survive (every row written before R11)', () => {
  const rows = [{ text: 'legacy row', role: 'user' }, { text: 'legacy reply', role: 'assistant' }];
  assert.equal(acceptedTexts(rows).length, 2);
});

console.log(`\n${passed} passed`);
