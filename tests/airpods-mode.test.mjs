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
  assert.equal(authorityForAction('read_task_status'), 'auto');
  assert.equal(authorityForAction('close_room'), 'auto');
  assert.equal(authorityForAction('end_voice_session'), 'auto');
  assert.equal(authorityForAction('reassign_task'), 'internal-explicit');
  assert.equal(authorityForAction('retry_task'), 'internal-explicit');
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
  const airpods = [{ room_key: 'mission:corner:airpods-mode', room_name: 'AirPods Mode', room_type: 'mission', slug: 'corner:airpods-mode', aliases: ['airpods-mode'] }];
  assert.equal(resolveRoomCandidate(airpods, { query: 'the AirPods mission' }).resolved?.room_key, 'mission:corner:airpods-mode');
  const outreach = [{ room_key: 'mission:aom:outreach', room_name: 'Outreach', room_type: 'mission', slug: 'aom:outreach', aliases: ['outreach'] }];
  assert.equal(resolveRoomCandidate(outreach, { room_key: 'aom:outreach' }).resolved?.room_key, 'mission:aom:outreach');
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
  assert.match(action, /\['voice-handoff', 'airpods-mode', 'task-ack'\]\.includes/);
  assert.match(action, /\['room-bridge', 'share-file'\]\.includes/);
  assert.match(action, /recordedWaitingReview/);
  assert.match(action, /provenance_summary: provenanceSummary/);
  assert.match(session, /call read_recent_activity before answering/i);
  assert.match(session, /Never say you checked GitHub unless/i);
  assert.match(session, /if \(!airpodsMode && recentMessages\.length > 0\)/);
  assert.match(session, /if \(!airpodsMode && activeTasks\.length > 0\)/);
  assert.match(session, /\.\.\.\(!airpodsMode \? \[\{/);
  assert.match(session, /which live external status remains unverified/);
  assert.match(session, /prior tool's provenance_summary/);
});

test('real-call routes close rooms, reassign tasks, and audit natural session endings', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const action = read('../api/dashboard/airpods-action.js');
  const session = read('../api/dashboard/voice-session.js');
  const transport = read('../src/dashboard/components/VoiceChat.jsx');
  const shell = read('../src/dashboard/cv6next/CornerCV6.jsx');
  assert.match(action, /if \(action === 'close_room'\)/);
  assert.match(action, /if \(action === 'reassign_task'\)/);
  assert.match(action, /if \(action === 'retry_task'\)/);
  assert.match(action, /if \(action === 'read_task_status'\)/);
  assert.match(action, /recoverLatestPriorityTaskId/);
  assert.match(action, /latest_workspace_priority/);
  assert.match(action, /if \(action === 'end_voice_session'\)/);
  assert.match(action, /fresh:\$\{action\}:\$\{crypto\.randomUUID\(\)\}/);
  assert.match(action, /select=role,text,timestamp,user_name,project,metadata/);
  assert.doesNotMatch(action, /select=role,text,timestamp,user_name,project,mission/);
  assert.match(session, /use close_room for “close this\/that\/current room/);
  assert.match(session, /use reassign_task on the existing task id/);
  assert.match(session, /call read_task_status/);
  assert.match(session, /offer_next_action for retry_task/);
  assert.match(session, /HARD SPOKEN OUTPUT CONTRACT/);
  // ── 2026-08-10, corner:airpods-mode R18 ────────────────────────────────────
  // These four assertions were still pinned to the pre-R17 source: the 22-word
  // cap, the deterministic 0.0 decode, the say-only-this tool contract, and the
  // read-the-date instruction. R17 deleted all four ON PURPOSE — they were the
  // reason the assistant could not hold a conversation — so this test has been
  // failing ever since, and failing in the worst direction: demanding the bug
  // back. Same class of defect as the gauntlet's 24-word ceiling. Re-pointed at
  // the current contract, and inverted where the old rule must never return.
  assert.doesNotMatch(session, /at most 22 spoken words/);
  assert.match(session, /There is no upper word limit in this contract/);
  assert.match(session, /const temp = airpodsMode \? 0\.85 : requestedTemp/);
  assert.match(session, /generationConfig[\s\S]{0,200}temperature: temp/);
  assert.match(session, /say only “Talk soon\.”/);
  assert.match(session, /dated records, not necessarily live external-system state/);
  assert.match(session, /do not recap unless asked/);
  assert.match(session, /Never redirect a failed lookup to an unrelated blocker/);
  assert.match(action, /repo: projectRow\.slug/);
  assert.match(action, /project_path: projectRow\.repo_path/);
  assert.match(action, /recorded_error: reason \|\| null/);
  assert.match(action, /next_action: repairableScope/);
  assert.match(action, /seenPriorityTitles/);
  assert.match(action, /compactSpokenTitle/);
  assert.doesNotMatch(action, /response_contract: 'Say only spoken_summary/);
  assert.match(action, /primary_record: primary/);
  assert.match(action, /MUST say the explicit calendar_date/);
  assert.match(session, /endingInstruction = airpodsMode[\s\S]{0,40}\? `ENDING A CONVERSATION/);
  assert.match(session, /say exactly “Talk soon\.”/);
  assert.match(transport, /EXPLICIT_END_INTENT/);
  assert.match(transport, /ensureAirpodsEndReceipt/);
  assert.match(transport, /scheduleEndReceiptFallback/);
  assert.match(transport, /call\.name === 'end_voice_session'/);
  assert.match(transport, /result\.closing === true/);
  assert.match(shell, /effect\.type === 'close_room'/);
  assert.match(shell, /closeWorkspaceColumn\(columnId\)/);
});

test('native login is pinned to a dark glass surface', () => {
  const source = readFileSync(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8');
  assert.match(source, /const palette = nativeShell \? DARK/);
  assert.match(source, /backdropFilter: 'blur\(28px\)/);
  assert.match(source, /env\(safe-area-inset-top\)/);
});

test('native API bridge targets the final canonical host without an auth-stripping redirect', () => {
  const source = readFileSync(new URL('../src/dashboard/nativeBootstrap.js', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../capacitor.config.ts', import.meta.url), 'utf8');
  assert.match(source, /https:\/\/www\.aheadofmarket\.com/);
  assert.doesNotMatch(source, /\|\| 'https:\/\/aheadofmarket\.com'/);
  assert.match(source, /input\.startsWith\('\/api\/'\)/);
  assert.match(config, /CapacitorHttp:\s*\{\s*enabled:\s*true/);
  assert.match(config, /contentInset:\s*'never'/);
  assert.doesNotMatch(config, /contentInset:\s*'automatic'/);
});

test('AirPods control is mounted once in the desktop bar and active phone header', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../src/dashboard/cv6next/SharedNav.jsx'), /<AirPodsHeaderButton className="ib" \/>/);
  const phoneShell = read('../src/dashboard/cv6next/CornerCV6.jsx');
  assert.match(phoneShell, /<MobileAirPodsHeaderPortal canvasRef=\{workspaceCanvasRef\} activeColumnId=\{activeColumnId\} \/>/);
  assert.match(phoneShell, /headerActions\.prepend\(slot\)/);
  assert.match(phoneShell, /createPortal\(<AirPodsHeaderButton className="ib" \/>, host\)/);
  assert.doesNotMatch(phoneShell, /corner-airpods-phone-entry/);
  const provider = read('../src/dashboard/cv6next/airpods/AirPodsProvider.jsx');
  const styles = read('../src/dashboard/cv6next/airpods/airpods.css');
  assert.doesNotMatch(provider, /corner-airpods-float/);
  assert.doesNotMatch(provider, /corner-voice-dock/);
  assert.doesNotMatch(styles, /corner-voice-dock/);
});

// ── 2026-08-10, corner:airpods-mode R18 ──────────────────────────────────────
// The three reds carried out of R17, each pinned to the mechanism that fixes it
// rather than to a phrase in the prompt. Prompts lost every previous round; the
// ranking, the tool contract and the client are what actually decide behaviour.
test('evidence is ranked by relevance, and provenance names the record the answer used', () => {
  const action = readFileSync(new URL('../api/dashboard/airpods-action.js', import.meta.url), 'utf8');
  // Recency-only ranking is what made an App Store question resolve to an
  // unrelated commit while the spoken answer used a room record — the "named
  // the wrong source" defect. Relevance first, recency as tie-break.
  assert.match(action, /\(b\.match_score \|\| 0\) - \(a\.match_score \|\| 0\)/);
  assert.match(action, /match_score: score/);
  // Provenance describes what was USED, and demotes everything else.
  assert.match(action, /The answer above comes from one record/);
  assert.match(action, /Also searched:/);
  assert.match(action, /evidence_used: primary/);
  assert.match(action, /Cite ONLY the source named in evidence_used/);
});

test('an external-status question returns a well-formed proposal and demands the card', () => {
  const action = readFileSync(new URL('../api/dashboard/airpods-action.js', import.meta.url), 'utf8');
  const session = readFileSync(new URL('../api/dashboard/voice-session.js', import.meta.url), 'utf8');
  // create_task needs project + mission_slug, so the scope travels with the
  // record instead of being invented when the caller says yes.
  assert.match(action, /function roomTaskScope/);
  assert.match(action, /task_scope: roomTaskScope\(message\)/);
  assert.match(action, /next_action: externalVerification/);
  assert.match(action, /action: 'create_task'/);
  assert.match(action, /MUST call offer_next_action with the exact action and arguments from next_action IN THE SAME TURN/);
  assert.match(session, /THE CARD IS THE OFFER; THE SENTENCE IS NOT/);
  // No trailing invitation on an evidence read.
  assert.match(action, /End on a period/);
  assert.match(action, /anything specific/);
});

test('a dropped signal reconnects into the same conversation instead of ending the call', () => {
  const transport = readFileSync(new URL('../src/dashboard/components/VoiceChat.jsx', import.meta.url), 'utf8');
  const session = readFileSync(new URL('../api/dashboard/voice-session.js', import.meta.url), 'utf8');
  // Server half: handles are requested. Client half: they are stored and replayed.
  assert.match(session, /sessionResumption: \{\}/);
  assert.match(transport, /msg\.sessionResumptionUpdate/);
  assert.match(transport, /resumeHandleRef\.current = update\.newHandle/);
  assert.match(transport, /sessionResumption: \{ handle \}/);
  assert.match(transport, /if \(msg\.goAway\)/);
  // Reconnect must survive the error-then-close ordering, and must never fire
  // after a deliberate hang-up or on a connect that never worked.
  assert.match(transport, /ws\.onerror = async \(\) => \{\s*[\s\S]{0,400}scheduleReconnectRef\.current\?\.\('socket error'\)/);
  assert.match(transport, /if \(manualStopRef\.current\) return false/);
  assert.match(transport, /if \(!everReadyRef\.current\) return false/);
  assert.match(transport, /reconnectAttemptsRef\.current >= 3/);
  // The audio graph is not rebuilt, so no new microphone gesture is needed.
  assert.match(transport, /bindSocketRef\.current\?\.\(next\)/);
});

test('a spoken offer always reaches the screen as a card', () => {
  const transport = readFileSync(new URL('../src/dashboard/components/VoiceChat.jsx', import.meta.url), 'utf8');
  assert.match(transport, /if \(result\?\.next_action\?\.action\) lastNextActionRef\.current = result\.next_action/);
  assert.match(transport, /offeredThisTurnRef\.current = true/);
  assert.match(transport, /want me to\|shall i\|should i/);
  assert.match(transport, /raisedBy: 'client_backstop'/);
});
