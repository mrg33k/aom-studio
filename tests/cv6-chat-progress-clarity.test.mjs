import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lifecycle = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('../src/dashboard/cv6next/ChatDesktop.jsx', import.meta.url), 'utf8');
const thread = readFileSync(new URL('../src/dashboard/cv6next/MessageThread.jsx', import.meta.url), 'utf8');
const workList = readFileSync(new URL('../src/dashboard/cv6next/RoomWorkList.jsx', import.meta.url), 'utf8');

test('individual chat surfaces use one fixed-height progress card at the conversation tail', () => {
  assert.match(lifecycle, /renderLiveWork="none"/);
  assert.match(lifecycle, /One live surface at the conversation tail[\s\S]+<RoomWorkList[^>]+liveSteps=\{liveSteps\}[^>]+currentAsk=\{currentAskTitle\}/);
  assert.doesNotMatch(desktop, /<WorkingTurn room=\{selected\}/);
  assert.match(desktop, /<RoomWorkList[^>]+liveSteps=\{liveSteps\}[^>]+currentAsk=\{currentAskTitle\}/);
  assert.match(thread, /renderLiveWork === 'workingTurn'/);
  assert.match(workList, /data-cv6-live-work=""/);
});

test('the Activity fallback inherits live context instead of rendering bare Working', () => {
  assert.match(workList, /currentTurnWorkLabel\(\{ liveSteps, currentAsk \}\)/);
  assert.doesNotMatch(workList, /label: 'Working'/);
});
