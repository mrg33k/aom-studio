import test from 'node:test';
import assert from 'node:assert/strict';
import { isRoomActivityNoise, mailListSnippet } from '../src/dashboard/cv6next/data/presentationClean.js';

test('Home rejects operational bridge alerts from human recency', () => {
  assert.equal(isRoomActivityNoise({ text: 'Chat-serving alert: bridge counter alert: event_empty' }), true);
  assert.equal(isRoomActivityNoise({ metadata: { kind: 'ops-alert' }, text: 'Everything is healthy' }), true);
  assert.equal(isRoomActivityNoise({ text: 'The mobile room hierarchy is ready for review.' }), false);
});

test('Email does not repeat a transported subject as its snippet', () => {
  assert.equal(mailListSnippet('Jessica Fry', 'Re: Great meeting you', 'Re: Great meeting you'), 'Jessica Fry');
  assert.equal(mailListSnippet('Jessica Fry', 'Great meeting you', 'Can we follow up Tuesday?'), 'Jessica Fry · Can we follow up Tuesday?');
});
