import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  buildFileRefIdentityMap,
  fileRefFromChatAttachment,
  fileRefFromProjectFileRow,
  fileRefToReviewQueueItem,
} from '../../../api/_lib/fileRef.js'

test('project file rows produce stable corner storage and review identity', () => {
  const ref = fileRefFromProjectFileRow({
    id: 'row-1',
    project: 'corner',
    rel_path: 'missions/truth-contracts',
    name: 'BUILD.md',
    kind: 'deliverable',
    size: 2048,
    updated_at: '2026-07-14T12:00:00.000Z',
  }, { tenantId: 'tenant-one' })

  assert.equal(ref.contract, 'corner.file_ref.v1')
  assert.equal(ref.tenantId, 'tenant-one')
  assert.equal(ref.storageKey, 'corner/users/tenant-one/projects/corner/missions/truth-contracts/BUILD.md')
  assert.equal(ref.review.id, ref.storageKey)
  assert.equal(ref.type.key, 'copy')
  assert.equal(ref.health.status, 'ready')
  assert.ok(ref.identities.includes(ref.storageKey))
})

test('chat attachments and review queue items carry the same file identity', () => {
  const ref = fileRefFromChatAttachment({
    tenantId: 'tenant-one',
    sourceKind: 'handoff',
    message: {
      id: 'msg-1',
      client_id: 'tenant-one',
      project: 'corner',
      timestamp: '2026-07-14T12:01:00.000Z',
      metadata: {
        mission_slug: 'truth-contracts',
        source_path: '/repo/corner/users/tenant-one/projects/corner/missions/truth-contracts/output.png',
      },
    },
    attachment: {
      url: 'https://files.example/output.png',
      name: 'output.png',
      mime: 'image/png',
      size: 4096,
      sha256: 'a'.repeat(64),
    },
  })
  const item = fileRefToReviewQueueItem(ref)

  assert.equal(item.path, 'https://files.example/output.png')
  assert.equal(item.file_ref.review.id, 'https://files.example/output.png')
  assert.equal(item.file_ref.sourcePath, '/repo/corner/users/tenant-one/projects/corner/missions/truth-contracts/output.png')
  assert.equal(item.type.key, 'image')
  assert.equal(item.health_status, 'ready')
})

test('identity maps bridge store URLs and corner paths without duplicate count logic', () => {
  const ref = fileRefFromChatAttachment({
    tenantId: 'tenant-one',
    sourceKind: 'handoff',
    message: {
      id: 'msg-2',
      client_id: 'tenant-one',
      project: 'corner',
      timestamp: '2026-07-14T12:02:00.000Z',
      metadata: {
        source_path: '/repo/corner/users/tenant-one/projects/corner/final.pdf',
      },
    },
    attachment: { url: 'https://files.example/final.pdf', name: 'final.pdf' },
  })

  const map = buildFileRefIdentityMap([{ id: ref.review.id, fileRef: ref, ts: ref.updatedAt }], (item) => ({ id: item.id }))
  assert.equal(map.get('https://files.example/final.pdf').id, 'https://files.example/final.pdf')
  assert.equal(map.get('corner/users/tenant-one/projects/corner/final.pdf').id, 'https://files.example/final.pdf')
})
