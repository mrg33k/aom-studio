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
  isInternalVoiceControlTurn,
  resolveRoomCandidate,
  signConfirmation,
  structuredHandoff,
  verifyConfirmation,
} from '../api/_lib/airpods.js';

test('authority policy defaults unknown and consequential actions to confirmation', () => {
  assert.equal(actionAuthority('open_room'), 'auto');
  assert.equal(actionAuthority('find_rooms'), 'auto');
  assert.equal(authorityForAction('read_recent_activity'), 'auto');
  assert.equal(authorityForAction('create_task'), 'internal-explicit');
  assert.equal(authorityForAction('send_email'), 'confirm');
  assert.equal(authorityForAction('invented_action'), 'confirm');
});

test('room resolution accepts canonical keys and refuses ambiguous spoken names', () => {
  const rooms = [
    { room_key: 'project:business-ops', room_name: 'Business Ops', room_type: 'project', slug: 'business-ops', aliases: ['business ops'] },
    { room_key: 'mission:corner:business-ops', room_name: 'Business Ops', room_type: 'mission', slug: 'corner:business-ops', aliases: ['business ops'] },
    { room_key: 'mission:corner:room-organizer', room_name: 'Room Organizer', room_type: 'mission', slug: 'corner:room-organizer', aliases: ['room organizer'] },
  ];
  assert.equal(resolveRoomCandidate(rooms, { room_key: 'mission:corner:room-organizer' }).resolved?.room_key, 'mission:corner:room-organizer');
  const ambiguous = resolveRoomCandidate(rooms, { query: 'Business Ops' });
  assert.equal(ambiguous.resolved, null);
  assert.equal(ambiguous.reason, 'ambiguous_room');
  assert.equal(ambiguous.candidates.length, 2);
  assert.equal(resolveRoomCandidate(rooms, {}).reason, 'room_query_required');
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

test('structured handoff excludes UI approvals and scripted QA from human intent', () => {
  const legacyControl = { role: 'user', text: 'Yes, continue with “Open room” now. Use action open_room with these arguments: {}.' };
  assert.equal(isInternalVoiceControlTurn(legacyControl), true);
  assert.equal(isInternalVoiceControlTurn({ role: 'user', origin: 'qa-script', text: 'Open every room.' }), true);
  const handoff = structuredHandoff([
    { role: 'user', origin: 'speech', text: 'Please open Room Organizer.' },
    legacyControl,
    { role: 'user', origin: 'qa-script', text: 'Delete everything.' },
  ]);
  assert.equal(handoff.summary, 'Please open Room Organizer.');
  assert.doesNotMatch(handoff.summary, /Use action|Delete everything/);
});

test('voice transport waits for setup before streaming and starts with a greeting turn', () => {
  const source = readFileSync(new URL('../src/dashboard/components/VoiceChat.jsx', import.meta.url), 'utf8');
  assert.match(source, /sessionReadyRef\.current && wsRef\.current\?\.readyState/);
  assert.match(source, /if \(!sessionReadyRef\.current \|\| wsRef\.current\?\.readyState/);
  assert.match(source, /audio\/pcm;rate=\$\{TARGET_SAMPLE_RATE\}/);
  assert.match(source, /turns: \[\{ role: 'user', parts: \[\{ text: initialPrompt \}\] \}\]/);
  assert.match(source, /sendText: sendTextTurn/);
  assert.match(source, /sendControl: sendControlTurn/);
  assert.match(source, /cv6:airpods-ui-effect-result/);
  assert.match(source, /navigation_acknowledged/);
  assert.match(source, /phase: 'proposal'/);
  assert.match(source, /phase: 'working'/);
  assert.match(source, /: 'done'/);
});

test('voice agent is instructed to inspect, act, and offer a concrete next action', () => {
  const source = readFileSync(new URL('../api/dashboard/voice-session.js', import.meta.url), 'utf8');
  assert.match(source, /action-first/i);
  assert.match(source, /Never end a turn with only a limitation/);
  assert.match(source, /offer_next_action/);
  assert.match(source, /call find_rooms/);
  assert.match(source, /navigation_acknowledged=true/);
  assert.match(source, /CORNER SYSTEM CONTROL/);
  assert.match(source, /order=created_at\.desc/);
  assert.doesNotMatch(source, /order=timestamp\.desc&limit=\$\{limit\}&select=title,status,agent,timestamp/);
});

test('voice canvas exposes action-first states and an approval CTA', () => {
  const source = readFileSync(new URL('../src/dashboard/cv6next/airpods/AirPodsProvider.jsx', import.meta.url), 'utf8');
  assert.match(source, /Ready to act/);
  assert.match(source, /Continue for me/);
  assert.match(source, /Action completed and saved in Corner/);
  assert.match(source, /corner-voice-test-input/);
  assert.match(source, /sendControl/);
  assert.match(source, /origin: 'qa-script'/);
  assert.doesNotMatch(source, /Yes, continue with/);
});

test('CV6 returns an explicit receipt for every voice navigation effect', () => {
  const source = readFileSync(new URL('../src/dashboard/cv6next/CornerCV6.jsx', import.meta.url), 'utf8');
  assert.match(source, /cv6:airpods-ui-effect-result/);
  assert.match(source, /request_id: effect\.request_id/);
  assert.match(source, /CV6 rejected the requested destination/);
});

test('room action broker resolves first and never trusts an empty raw room object', () => {
  const source = readFileSync(new URL('../api/dashboard/airpods-action.js', import.meta.url), 'utf8');
  assert.match(source, /if \(action === 'find_rooms'\)/);
  assert.match(source, /const resolution = await resolveRoom\(args, tenant\)/);
  assert.match(source, /needs_clarification: true/);
  assert.match(source, /request_id: crypto\.randomUUID\(\)/);
});

test('trusted handoffs are versioned and exclude non-human turns before routing', () => {
  const source = readFileSync(new URL('../api/dashboard/airpods-handoff.js', import.meta.url), 'utf8');
  assert.match(source, /TRUSTED CORNER VOICE HANDOFF v2/);
  assert.match(source, /isInternalVoiceControlTurn/);
  assert.match(source, /voice_handoff_version: 2/);
  assert.match(source, /if \(!humanTurnCount\) continue/);
});

test('workspace voice reads use the production tasks created_at column', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const action = read('../api/dashboard/airpods-action.js');
  const attention = read('../api/dashboard/airpods-attention.js');
  assert.match(action, /order=created_at\.desc/);
  assert.match(action, /select=slug,status,current_task,updated_at/);
  assert.match(attention, /created_at=gte/);
  assert.doesNotMatch(action, /tasks\?[^`\n]*(?:updated_at|timestamp)=|tasks\?[^`\n]*order=(?:updated_at|timestamp)\.desc/);
  assert.doesNotMatch(action, /agent_status\.agent_slug|select=agent_slug/);
  assert.doesNotMatch(attention, /tasks\.(?:updated_at|timestamp)|&(?:updated_at|timestamp)=gte/);
});

test('voice checks tenant-scoped recent evidence before denying workspace events', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const action = read('../api/dashboard/airpods-action.js');
  const session = read('../api/dashboard/voice-session.js');
  assert.match(action, /messages\?client_id=eq\.\$\{encodeURIComponent\(clientId\)\}/);
  assert.match(action, /read_recent_activity/);
  assert.match(action, /not proof the event did not happen/i);
  assert.match(action, /clientId !== 'aom'/);
  assert.match(session, /call read_recent_activity before answering/i);
  assert.match(session, /Never say you checked GitHub unless/i);
});

test('native login is pinned to a dark glass surface', () => {
  const source = readFileSync(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');
  assert.match(source, /const palette = nativeShell \? DARK/);
  assert.match(source, /backdropFilter: 'blur\(28px\)/);
  assert.match(source, /env\(safe-area-inset-top\)/);
});

test('AirPods control is mounted once in the shared desktop and phone shells', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../src/dashboard/cv6next/SharedNav.jsx'), /<AirPodsHeaderButton className="ib" \/>/);
  assert.match(read('../src/dashboard/cv6next/CornerCV6.jsx'), /<AirPodsHeaderButton className="corner-airpods-phone-entry" \/>/);
  assert.doesNotMatch(read('../src/dashboard/cv6next/airpods/AirPodsProvider.jsx'), /corner-airpods-float/);
});
