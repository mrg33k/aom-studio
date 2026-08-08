import test from 'node:test';
import assert from 'node:assert/strict';

import { currentTurnWorkLabel, liveWorkLabels } from '../src/dashboard/cv6next/data/roomWorkProjection.js';

test('live room work keeps the newest truth per step and ignores the settle marker', () => {
  const labels = liveWorkLabels([
    { step_index: 0, text: 'Reading the room', timestamp: '2026-08-07T18:00:00.000Z' },
    { step_index: 0, text: 'Reading the latest request', timestamp: '2026-08-07T18:00:01.000Z' },
    { step_index: 1, text: 'Checking the live render', timestamp: '2026-08-07T18:00:02.000Z' },
    { step_index: 2, text: 'Checking the live render', timestamp: '2026-08-07T18:00:03.000Z' },
    { step_index: 9999, text: 'settled', timestamp: '2026-08-07T18:00:04.000Z' },
  ]);
  assert.deepEqual(labels, ['Reading the latest request', 'Checking the live render']);
});

test('the current-turn fallback names the ask and never degrades to unexplained Working', () => {
  assert.equal(
    currentTurnWorkLabel({ currentAsk: 'Fix the Design room progress display' }),
    'Responding to: Fix the Design room progress display',
  );
  assert.equal(currentTurnWorkLabel({}), 'Preparing a response');
  assert.notEqual(currentTurnWorkLabel({}), 'Working');
});

test('a real bridge step outranks the fallback ask', () => {
  assert.equal(
    currentTurnWorkLabel({
      currentAsk: 'Did you get this?',
      liveSteps: [{ step_index: 0, text: 'Verifying the dashboard render' }],
    }),
    'Verifying the dashboard render',
  );
});
