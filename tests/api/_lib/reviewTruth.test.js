import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { buildReviewTruthSnapshot } from '../../../api/_lib/reviewTruth.js'

const items = [
  {
    path: 'https://files.example/new-hero.png',
    name: 'new-hero.png',
    source_kind: 'handoff',
    source_path: '/repo/corner/users/tenant/projects/site/new-hero.png',
    sha256: 'new',
    last_modified: '2026-07-14T12:03:00.000Z',
  },
  {
    path: 'https://files.example/approved.pdf',
    name: 'approved.pdf',
    source_kind: 'handoff',
    source_path: '/repo/corner/users/tenant/projects/site/approved.pdf',
    sha256: 'approved',
    last_modified: '2026-07-14T12:02:00.000Z',
  },
  {
    path: 'https://files.example/my-upload.png',
    name: 'my-upload.png',
    source_kind: 'upload',
    source_path: '/tmp/my-upload.png',
    sha256: 'upload',
    last_modified: '2026-07-14T12:01:00.000Z',
  },
]

test('waiting review rows, total, and counts come from one snapshot', () => {
  const snapshot = buildReviewTruthSnapshot({
    items,
    decisions: {
      decidedIds: new Map([
        ['https://files.example/approved.pdf', { action: 'approve', id: 'decision-1' }],
      ]),
    },
    limit: 10,
  })

  assert.equal(snapshot.total, 1)
  assert.equal(snapshot.counts.waiting, 1)
  assert.equal(snapshot.counts.decided, 1)
  assert.equal(snapshot.items.length, 1)
  assert.equal(snapshot.items[0].path, 'https://files.example/new-hero.png')
  assert.equal(snapshot.items[0].verdict, undefined)
  assert.equal(snapshot.newest_ts, '2026-07-14T12:03:00.000Z')
})

test('all review view stamps verdicts from the same decision rules', () => {
  const snapshot = buildReviewTruthSnapshot({
    items,
    decisions: {
      decidedContent: new Map([
        ['/repo/corner/users/tenant/projects/site/approved.pdf approved', { action: 'request-changes', id: 'decision-2' }],
      ]),
    },
    view: 'all',
    limit: 2,
    offset: 1,
  })

  assert.equal(snapshot.total, 3)
  assert.equal(snapshot.counts.waiting, 1)
  assert.equal(snapshot.counts.decided, 1)
  assert.deepEqual(snapshot.items.map((item) => item.path), [
    'https://files.example/approved.pdf',
    'https://files.example/my-upload.png',
  ])
  assert.equal(snapshot.items[0].verdict, 'request-changes')
  assert.equal(snapshot.items[0].decision_id, 'decision-2')
  assert.equal(snapshot.items[1].verdict, null)
  assert.equal(snapshot.hasMore, false)
})

test('uploads never enter waiting count even when undecided', () => {
  const snapshot = buildReviewTruthSnapshot({
    items: [items[2]],
    decisions: {},
  })

  assert.equal(snapshot.total, 0)
  assert.equal(snapshot.counts.waiting, 0)
  assert.equal(snapshot.counts.decided, 0)
  assert.deepEqual(snapshot.items, [])
})
