import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { buildFilesTruthSnapshot } from '../../../api/_lib/filesTruth.js'
import { fileRefFromChatAttachment, fileRefToReviewQueueItem } from '../../../api/_lib/fileRef.js'

test('files truth stamps mirror rows and counts needs review from one FileRef identity ruleset', () => {
  const mirrorRows = [
    {
      id: 'row-1',
      project: 'site',
      rel_path: 'missions/home',
      name: 'hero.png',
      kind: 'image',
      updated_at: '2026-07-14T12:00:00.000Z',
    },
  ]
  const reviewRef = fileRefFromChatAttachment({
    tenantId: 'tenant-one',
    sourceKind: 'handoff',
    message: {
      id: 'msg-1',
      client_id: 'tenant-one',
      project: 'site',
      timestamp: '2026-07-14T12:05:00.000Z',
      metadata: {
        source_path: '/repo/corner/users/tenant-one/projects/site/missions/home/hero.png',
      },
    },
    attachment: {
      url: 'https://files.example/hero.png',
      name: 'hero.png',
      mime: 'image/png',
    },
  })
  const reviewItems = [fileRefToReviewQueueItem(reviewRef, {
    path: 'https://files.example/hero.png',
    last_modified: '2026-07-14T12:05:00.000Z',
  })]

  const snapshot = buildFilesTruthSnapshot({
    tenantId: 'tenant-one',
    mirrorRows,
    reviewItems,
    reviewTotal: 1,
  })

  assert.equal(snapshot.contract, 'corner.files_truth.v1')
  assert.equal(snapshot.visibleCount, 1)
  assert.equal(snapshot.counts.files, 1)
  assert.equal(snapshot.counts.needsReview, 1)
  assert.equal(snapshot.counts.byProject.site.needsReview, 1)
  assert.equal(snapshot.files[0].needs_review, true)
  assert.equal(snapshot.files[0].review_id, 'https://files.example/hero.png')
  assert.deepEqual(snapshot.ghosts, [])
})

test('files truth creates a visible ghost when a waiting review item has no mirror row', () => {
  const reviewRef = fileRefFromChatAttachment({
    tenantId: 'tenant-one',
    sourceKind: 'handoff',
    message: {
      id: 'msg-2',
      client_id: 'tenant-one',
      project: 'deck',
      timestamp: '2026-07-14T12:10:00.000Z',
      metadata: { mission_slug: 'deck:launch' },
    },
    attachment: {
      url: 'https://files.example/launch.pdf',
      name: 'launch.pdf',
      mime: 'application/pdf',
    },
  })

  const snapshot = buildFilesTruthSnapshot({
    tenantId: 'tenant-one',
    mirrorRows: [],
    uploadRows: [],
    reviewItems: [fileRefToReviewQueueItem(reviewRef, {
      path: 'https://files.example/launch.pdf',
      last_modified: '2026-07-14T12:10:00.000Z',
    })],
  })

  assert.equal(snapshot.counts.files, 0)
  assert.equal(snapshot.counts.needsReview, 1)
  assert.equal(snapshot.counts.ghosts, 1)
  assert.equal(snapshot.counts.byProject.deck.ghosts, 1)
  assert.equal(snapshot.ghosts[0].project, 'deck')
  assert.equal(snapshot.ghosts[0].mission, 'launch')
  assert.equal(snapshot.ghosts[0].review_id, 'https://files.example/launch.pdf')
})

test('files truth decorates uploads without letting upload count drift from visible rows', () => {
  const snapshot = buildFilesTruthSnapshot({
    tenantId: 'tenant-one',
    uploadRows: [
      {
        id: 'https://files.example/my-shot.png',
        url: 'https://files.example/my-shot.png',
        name: 'my-shot.png',
        mime: 'image/png',
        size: 1234,
        project: 'media',
        date: '2026-07-14T12:11:00.000Z',
      },
    ],
  })

  assert.equal(snapshot.visibleCount, 1)
  assert.equal(snapshot.counts.files, 1)
  assert.equal(snapshot.counts.uploads, 1)
  assert.equal(snapshot.counts.byProject.media.files, 1)
  assert.equal(snapshot.uploads[0].file_ref.contract, 'corner.file_ref.v1')
})
