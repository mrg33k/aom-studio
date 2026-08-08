import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  actionAuthority,
  attentionPrompt,
  inQuietHours,
  normalizeAirPodsPreferences,
  rankAttentionItems,
} from '../src/dashboard/cv6next/airpods/airpodsTypes.js';
import {
  authorityForAction,
  idempotencyKey,
  signConfirmation,
  structuredHandoff,
  verifyConfirmation,
} from '../api/_lib/airpods.js';

test('authority policy defaults unknown and consequential actions to confirmation', () => {
  assert.equal(actionAuthority('open_room'), 'auto');
  assert.equal(authorityForAction('create_task'), 'internal-explicit');
  assert.equal(authorityForAction('send_email'), 'confirm');
  assert.equal(authorityForAction('invented_action'), 'confirm');
});

test('idempotency keys are deterministic and respect valid caller keys', () => {
  const input = { sessionId: 'session-1', action: 'open_room', args: { room_key: 'alpha' } };
  assert.equal(idempotencyKey(input), idempotencyKey(input));
  assert.equal(idempotencyKey({ ...input, supplied: 'caller:key-123' }), 'caller:key-123');
  assert.notEqual(idempotencyKey(input), idempotencyKey({ ...input, args: { room_key: 'beta' } }));
});

test('confirmation tokens verify, reject tampering, and reject expiry', () => {
  const secret = 'test-only-secret';
  const valid = signConfirmation({ action: 'publish', exp: Date.now() + 10_000 }, secret);
  assert.equal(verifyConfirmation(valid, secret)?.action, 'publish');
  assert.equal(verifyConfirmation(`${valid}x`, secret), null);
  const expired = signConfirmation({ action: 'publish', exp: Date.now() - 1 }, secret);
  assert.equal(verifyConfirmation(expired, secret), null);
});

test('attention batching deduplicates, respects snooze, and orders by urgency', () => {
  const now = new Date('2026-08-08T12:00:00Z');
  const preferences = normalizeAirPodsPreferences({ priorities: ['approval', 'blocker', 'completion'] });
  const ranked = rankAttentionItems([
    { id: 'done', source_type: 'task', source_id: '1', priority: 'completion', created_at: '2026-08-08T10:00:00Z' },
    { id: 'duplicate', source_type: 'task', source_id: '1', priority: 'completion', created_at: '2026-08-08T10:01:00Z' },
    { id: 'blocked', source_type: 'task', source_id: '2', priority: 'blocker', created_at: '2026-08-08T11:00:00Z' },
    { id: 'approval', source_type: 'task', source_id: '3', priority: 'approval', created_at: '2026-08-08T11:30:00Z' },
    { id: 'snoozed', source_type: 'task', source_id: '4', priority: 'approval', snoozed_until: '2026-08-08T13:00:00Z' },
  ], preferences, now);
  assert.deepEqual(ranked.map((item) => item.id), ['approval', 'blocked', 'done']);
  assert.match(attentionPrompt(ranked.length, 0), /3/);
});

test('quiet hours work across midnight', () => {
  const preferences = { quietHoursStart: '21:00', quietHoursEnd: '08:00' };
  const at = (hour) => ({ getHours: () => hour, getMinutes: () => 0 });
  assert.equal(inQuietHours(at(22), preferences), true);
  assert.equal(inQuietHours(at(7), preferences), true);
  assert.equal(inQuietHours(at(12), preferences), false);
});

test('structured handoff retains decisions, constraints, actions, and questions', () => {
  const handoff = structuredHandoff([
    { role: 'user', text: 'Let\'s build the walkaround mode. Never save raw audio.' },
    { role: 'model', text: 'Understood.' },
    { role: 'user', text: 'Can you create the task?' },
  ]);
  assert.match(handoff.summary, /walkaround mode/);
  assert.equal(handoff.decisions.length, 1);
  assert.equal(handoff.constraints.length, 1);
  assert.equal(handoff.requested_actions.length, 2);
  assert.deepEqual(handoff.unresolved_questions, ['Can you create the task?']);
});

test('voice transport waits for setup before streaming and starts with a greeting turn', () => {
  const source = readFileSync(new URL('../src/dashboard/components/VoiceChat.jsx', import.meta.url), 'utf8');
  assert.match(source, /sessionReadyRef\.current && wsRef\.current\?\.readyState/);
  assert.match(source, /if \(!sessionReadyRef\.current \|\| wsRef\.current\?\.readyState/);
  assert.match(source, /audio\/pcm;rate=\$\{TARGET_SAMPLE_RATE\}/);
  assert.match(source, /turns: \[\{ role: 'user', parts: \[\{ text: initialPrompt \}\] \}\]/);
});

test('AirPods control is persistent in desktop and the phone-wide CV6 shell', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../src/dashboard/cv6next/SharedNav.jsx'), /<AirPodsHeaderButton className="ib" \/>/);
  assert.match(read('../src/dashboard/cv6next/CornerCV6.jsx'), /!isDesktop && <AirPodsHeaderButton className="corner-airpods-phone-entry" \/>/);
  assert.match(read('../src/dashboard/cv6next/airpods/airpods.css'), /@media \(max-width:899px\)[\s\S]*\.corner-airpods-phone-entry/);
  assert.doesNotMatch(read('../src/dashboard/cv6next/ChatLifecycle.jsx'), /AirPodsHeaderButton/);
  assert.doesNotMatch(read('../src/dashboard/cv6next/airpods/AirPodsProvider.jsx'), /corner-airpods-float/);
});

test('ephemeral Gemini credentials use the constrained Live method', () => {
  const source = readFileSync(new URL('../api/dashboard/voice-session.js', import.meta.url), 'utf8');
  assert.match(source, /GenerativeService\.BidiGenerateContentConstrained/);
  assert.match(source, /\?access_token=\$\{encodeURIComponent\(ephemeralToken\)\}/);
  assert.doesNotMatch(source, /BidiGenerateContent\?key=\$\{GEMINI_API_KEY\}/);
});

test('voice cockpit visualizes speaking and records real tool outcomes', () => {
  const provider = readFileSync(new URL('../src/dashboard/cv6next/airpods/AirPodsProvider.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/dashboard/cv6next/airpods/airpods.css', import.meta.url), 'utf8');
  assert.match(provider, /function VoiceSignal/);
  assert.match(provider, /onToolActivity=\{recordToolActivity\}/);
  assert.match(provider, /Shared screen/);
  assert.match(css, /corner-voice-signal\.is-speaking/);
  assert.match(css, /corner-airpods-activity/);
});

test('voice receives visible room context and can end naturally', () => {
  const transport = readFileSync(new URL('../src/dashboard/components/VoiceChat.jsx', import.meta.url), 'utf8');
  const session = readFileSync(new URL('../api/dashboard/voice-session.js', import.meta.url), 'utf8');
  assert.match(transport, /ui_context: sessionContext/);
  assert.match(transport, /call\.name === 'end_voice_session'/);
  assert.match(session, /name: 'list_rooms'/);
  assert.match(session, /name: 'read_room_status'/);
  assert.match(session, /name: 'end_voice_session'/);
  assert.match(session, /Never claim the screen changed until a tool result says ok/);
});

test('room reads and navigation resolve against the authenticated workspace catalog', () => {
  const action = readFileSync(new URL('../api/dashboard/airpods-action.js', import.meta.url), 'utf8');
  assert.equal(authorityForAction('list_rooms'), 'auto');
  assert.equal(authorityForAction('read_room_status'), 'auto');
  assert.match(action, /async function workspaceRooms/);
  assert.match(action, /async function resolveRoom/);
  assert.match(action, /async function readRoomStatus/);
  assert.match(action, /No trackable mission task was created/);
});
