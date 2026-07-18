// Regression guard — corner:corner-ui-cv6 R-CMD-BUCKETS (2026-07-18).
// Patrik: "Command center doesnt know whats in progress vs whats proposed vs
// whats done." The activity feed rendered only heartbeat-live sessions and
// stamped every card LIVE; queued (proposed) and done work never appeared.
// This pins the ONE shared status map both the API stamp (supabase-status
// `bucket`) and the Command hook render from.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  classifyCommandWorkBucket,
  commandResultSummary,
  commandWorkSubLine,
  shapeCommandWorkItems,
  COMMAND_WORK_LABEL,
} from '../../../api/_lib/commandWorkStatus.js'

test('every raw task status lands in the right bucket', () => {
  // proposed: queued/idea work nothing has claimed
  for (const s of ['queued', 'todo', 'idea', 'proposed', 'pending', 'classifying', 'planning']) {
    assert.equal(classifyCommandWorkBucket(s), 'proposed', s)
  }
  // in progress: claimed and being worked
  for (const s of ['running', 'active', 'working', 'building', 'qa', 'claimed']) {
    assert.equal(classifyCommandWorkBucket(s), 'inprogress', s)
  }
  // done: completed with payload
  for (const s of ['done', 'completed']) assert.equal(classifyCommandWorkBucket(s), 'done', s)
  // honest edge states — never folded into the three buckets
  for (const s of ['needs_input', 'blocked']) assert.equal(classifyCommandWorkBucket(s), 'blocked', s)
  for (const s of ['failed', 'error']) assert.equal(classifyCommandWorkBucket(s), 'failed', s)
})

test('status matching is case/whitespace tolerant', () => {
  assert.equal(classifyCommandWorkBucket(' Queued '), 'proposed')
  assert.equal(classifyCommandWorkBucket('DONE'), 'done')
  assert.equal(classifyCommandWorkBucket('Needs_Input'), 'blocked')
})

test('cancelled and unknown statuses are hidden, never mislabeled', () => {
  assert.equal(classifyCommandWorkBucket('cancelled'), null)
  assert.equal(classifyCommandWorkBucket('archived'), null)
  assert.equal(classifyCommandWorkBucket(''), null)
  assert.equal(classifyCommandWorkBucket(null), null)
  assert.equal(classifyCommandWorkBucket('something-new'), null)
})

test('every bucket has a chip label in the user words', () => {
  assert.deepEqual(COMMAND_WORK_LABEL, {
    proposed: 'PROPOSED',
    inprogress: 'WORKING',
    done: 'DONE',
    blocked: 'NEEDS YOU',
    failed: 'FAILED',
  })
})

test('commandResultSummary reads full JSON, truncated JSON, and objects', () => {
  const full = JSON.stringify({ type: 'link', payload: 'https://x.test/a', summary: 'Preview page shipped' })
  assert.equal(commandResultSummary(full), 'Preview page shipped')
  // supabase-status truncates result to a preview length — the JSON arrives cut off
  const truncated = '{"type":"link","payload":"https://x.test/a","summary":"Preview page shi'
  assert.equal(commandResultSummary(truncated), 'Preview page shi')
  assert.equal(commandResultSummary({ summary: 'Object summary' }), 'Object summary')
  assert.equal(commandResultSummary('no summary here'), '')
  assert.equal(commandResultSummary(''), '')
})

const NOW = Date.parse('2026-07-18T12:00:00Z')
const HOUR = 60 * 60 * 1000
const iso = (msAgo) => new Date(NOW - msAgo).toISOString()

test('shapeCommandWorkItems: three buckets come out distinct and ranked', () => {
  const items = shapeCommandWorkItems({
    now: NOW,
    tasks: [
      { id: 't-done', status: 'done', title: 'Ship preview', completed_at: iso(2 * HOUR), result: '{"summary":"Preview live"}' },
      { id: 't-queued', status: 'queued', title: 'Draft outreach', created_at: iso(1 * HOUR) },
      { id: 't-running', status: 'running', title: 'Build page', created_at: iso(3 * HOUR) },
    ],
  })
  assert.deepEqual(items.map((i) => [i.id, i.bucket, i.label]), [
    ['t-running', 'inprogress', 'WORKING'],
    ['t-queued', 'proposed', 'PROPOSED'],
    ['t-done', 'done', 'DONE'],
  ])
  assert.equal(items[2].summary, 'Preview live')
})

test('a task already carried by a live heartbeat session is not doubled', () => {
  const items = shapeCommandWorkItems({
    now: NOW,
    sessions: [{ agent: 'bobby', task_id: 't-live' }],
    tasks: [
      { id: 't-live', status: 'running', title: 'Live one', created_at: iso(HOUR) },
      { id: 't-other', status: 'running', title: 'Other', created_at: iso(HOUR) },
    ],
  })
  assert.deepEqual(items.map((i) => i.id), ['t-other'])
})

test('duplicate rows (legacy + v2 lanes) dedupe by id, first stamp wins', () => {
  const items = shapeCommandWorkItems({
    now: NOW,
    tasks: [
      { id: 't-1', status: 'running', title: 'v2 row', created_at: iso(HOUR) },
      { id: 't-1', status: 'queued', title: 'legacy echo', created_at: iso(HOUR) },
    ],
  })
  assert.equal(items.length, 1)
  assert.equal(items[0].bucket, 'inprogress')
})

test('terminal work ages out after its window; open work lives longer', () => {
  const DAY = 24 * HOUR
  const items = shapeCommandWorkItems({
    now: NOW,
    tasks: [
      { id: 't-old-done', status: 'done', title: 'Old done', completed_at: iso(2 * DAY) },
      { id: 't-fresh-done', status: 'done', title: 'Fresh done', completed_at: iso(3 * HOUR) },
      { id: 't-old-blocked', status: 'needs_input', title: 'Aging question', created_at: iso(3 * DAY) },
      { id: 't-ancient-queued', status: 'queued', title: 'Stale idea', created_at: iso(10 * DAY) },
      { id: 't-cancelled', status: 'cancelled', title: 'Killed', completed_at: iso(HOUR) },
      { id: 't-no-time', status: 'queued', title: 'No timestamp at all' },
    ],
  })
  assert.deepEqual(items.map((i) => i.id), ['t-old-blocked', 't-fresh-done'])
})

test('an API-stamped bucket wins; a bogus stamp falls back to the status map', () => {
  const items = shapeCommandWorkItems({
    now: NOW,
    tasks: [
      { id: 't-stamped', status: 'weird-new-status', bucket: 'proposed', title: 'Stamped', created_at: iso(HOUR) },
      { id: 't-bogus', status: 'running', bucket: 'nonsense', title: 'Bogus stamp', created_at: iso(HOUR) },
    ],
  })
  assert.deepEqual(items.map((i) => [i.id, i.bucket]), [
    ['t-bogus', 'inprogress'],
    ['t-stamped', 'proposed'],
  ])
})

test('failed items carry their error line', () => {
  const items = shapeCommandWorkItems({
    now: NOW,
    tasks: [
      { id: 't-fail', status: 'failed', title: 'Broke', error: 'worker exited 1', completed_at: iso(HOUR) },
    ],
  })
  assert.equal(items[0].error, 'worker exited 1')
  assert.equal(items[0].label, 'FAILED')
})

test('the rail caps at 20 items', () => {
  const many = Array.from({ length: 30 }, (_, i) => (
    { id: 'q-' + i, status: 'queued', title: 'Q' + i, created_at: iso(HOUR + i) }
  ))
  const items = shapeCommandWorkItems({ now: NOW, tasks: many })
  assert.equal(items.length, 20)
})

test('the header line always names the three buckets; edge states only when real', () => {
  assert.equal(
    commandWorkSubLine({ proposed: 0, inprogress: 2, done: 5 }),
    '0 proposed · 2 in progress · 5 done',
  )
  assert.equal(
    commandWorkSubLine({ proposed: 1, inprogress: 0, done: 0, blocked: 1, failed: 2 }),
    '1 proposed · 0 in progress · 0 done · 1 needs you · 2 failed',
  )
})
