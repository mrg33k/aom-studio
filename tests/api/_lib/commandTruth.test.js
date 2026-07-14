import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  classifyCommandRoomStatus,
  freshestCommandWorkEvent,
  isCommandBookkeepingStamp,
} from '../../../api/_lib/commandTruth.js'

const NOW = new Date('2026-07-14T18:00:00.000Z').getTime()

test('fresh real work event marks a command room working', () => {
  const truth = classifyCommandRoomStatus({
    now: NOW,
    workEvents: [
      {
        source: 'assistant',
        timestamp: '2026-07-14T17:45:00.000Z',
        text: 'Implemented the upload preview.',
      },
    ],
  })

  assert.equal(truth.status, 'working')
  assert.equal(truth.statusLabel, 'WORKING')
  assert.equal(truth.source, 'assistant')
  assert.equal(truth.lastActivity, new Date('2026-07-14T17:45:00.000Z').getTime())
})

test('bookkeeping stamps do not make stale command rooms look working', () => {
  const truth = classifyCommandRoomStatus({
    now: NOW,
    workEvents: [
      {
        source: 'goal-notetaker',
        updated_at: '2026-07-14T17:59:00.000Z',
        state_line: 'Goal set: ship the real status contract',
      },
      {
        source: 'assistant',
        timestamp: '2026-07-14T16:00:00.000Z',
        text: 'Old real work.',
      },
    ],
  })

  assert.equal(isCommandBookkeepingStamp({ updated_by: 'goal-notetaker', state_line: 'Goal set: x' }), true)
  assert.equal(truth.status, 'idle')
  assert.equal(truth.lastActivity, new Date('2026-07-14T16:00:00.000Z').getTime())
})

test('live active process marks working even without recent message traffic', () => {
  const truth = classifyCommandRoomStatus({
    now: NOW,
    liveSession: true,
    workEvents: [],
  })

  assert.equal(truth.status, 'working')
  assert.equal(truth.source, 'active_process')
})

test('open questions block only until real work happens after the question', () => {
  const blocked = classifyCommandRoomStatus({
    now: NOW,
    openQuestion: true,
    questionAskedAt: '2026-07-14T17:00:00.000Z',
    workEvents: [
      { source: 'assistant', timestamp: '2026-07-14T16:30:00.000Z', text: 'Before the question.' },
    ],
  })
  const unblocked = classifyCommandRoomStatus({
    now: NOW,
    openQuestion: true,
    questionAskedAt: '2026-07-14T17:00:00.000Z',
    workEvents: [
      { source: 'assistant', timestamp: '2026-07-14T17:40:00.000Z', text: 'Moved past it.' },
    ],
  })

  assert.equal(blocked.status, 'blocked')
  assert.equal(blocked.questionLive, true)
  assert.equal(unblocked.status, 'working')
  assert.equal(unblocked.questionLive, false)
})

test('freshest work event skips newer bookkeeping rows', () => {
  const freshest = freshestCommandWorkEvent([
    { source: 'goal-notetaker', updated_at: '2026-07-14T17:59:00.000Z', state_line: 'Reviewed room.' },
    { source: 'assistant', timestamp: '2026-07-14T17:30:00.000Z', text: 'Real work.' },
  ])

  assert.equal(freshest.t, new Date('2026-07-14T17:30:00.000Z').getTime())
})
