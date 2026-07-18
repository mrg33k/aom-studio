// Regression guard — corner:corner-ui-cv6, Patrik 2026-07-18: "When you click
// comment in review it takes you to the projects panel of review and not to the
// document." The mobile chat galleries and the FileCollectionViewer's
// "Comment in Review" button hand raw message rows ({attachmentUrl, fileName,
// fileMime}) to Files/Review, but the Organize target resolvers only read
// f.url/f.path and f.name — the identity resolved empty, no pending-open was
// queued, and the user landed on the projects panel with no document open.
// resolveFilesTarget must produce a non-null pending handle for EVERY producer
// shape, because pending === null IS the stranding condition.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { fileTargetIdentity, filesTargetKey, resolveFilesTarget } from '../../../src/dashboard/cv6next/data/reviewTargetResolve.js'

const queue = [
  { id: 'corner/users/aom/projects/corner/missions/qa/qa-rev-notes.txt', whoRaw: 'corner' },
  { id: 'corner/users/aom/projects/azt/deliverables/flyer.png', whoRaw: 'az-tech-council' },
  { id: 'https://rag.aheadofmarket.com/files/aom/6e91-qa-rev-brief.md', whoRaw: 'corner' },
]

// ── fileTargetIdentity: every shape resolves to the same identity contract ──

test('attachment shape {url, name} resolves', () => {
  const id = fileTargetIdentity({ url: 'https://rag.aheadofmarket.com/files/aom/x-shot.png', name: 'x-shot.png' })
  assert.equal(id.path, 'https://rag.aheadofmarket.com/files/aom/x-shot.png')
  assert.equal(id.name, 'x-shot.png')
})

test('message-row shape {attachmentUrl, fileName} resolves (the Comment-in-Review bug shape)', () => {
  const id = fileTargetIdentity({ attachmentUrl: 'https://rag.aheadofmarket.com/files/aom/6e91-qa-rev-notes.txt', fileName: 'qa-rev-notes.txt', fileMime: 'text/plain' })
  assert.equal(id.path, 'https://rag.aheadofmarket.com/files/aom/6e91-qa-rev-notes.txt')
  assert.equal(id.name, 'qa-rev-notes.txt')
})

test('corner path sheds leading slashes; name falls back to the basename', () => {
  const id = fileTargetIdentity({ path: '/corner/users/aom/projects/corner/missions/qa/qa-rev-notes.txt' })
  assert.equal(id.path, 'corner/users/aom/projects/corner/missions/qa/qa-rev-notes.txt')
  assert.equal(id.name, 'qa-rev-notes.txt')
})

test('empty object resolves to an honest empty identity', () => {
  assert.deepEqual(fileTargetIdentity({}), { path: '', name: '' })
})

// ── resolveFilesTarget: pending must exist for every real hand-off ──

test('message-row hand-off produces a pending open (was null → stranded on projects panel)', () => {
  const r = resolveFilesTarget(
    { files: [{ attachmentUrl: 'https://rag.aheadofmarket.com/files/aom/6e91-qa-rev-notes.txt', fileName: 'qa-rev-notes.txt' }], project: '', needsReview: true },
    queue,
  )
  assert.ok(r.pending, 'pending open handle must exist for a message-row file')
  // basename matches a queue item → the resolver upgrades to its real corner id
  assert.equal(r.rid, 'corner/users/aom/projects/corner/missions/qa/qa-rev-notes.txt')
  assert.equal(r.proj, 'corner', 'project comes from the matched queue item')
})

test('attachment hand-off still resolves exactly as before', () => {
  const r = resolveFilesTarget(
    { files: [{ url: 'corner/users/aom/projects/azt/deliverables/flyer.png', name: 'flyer.png' }], project: '', needsReview: true },
    queue,
  )
  assert.equal(r.rid, 'corner/users/aom/projects/azt/deliverables/flyer.png')
  assert.equal(r.proj, 'az-tech-council')
  assert.ok(r.pending)
})

test('file outside the queue still opens directly (pending carries the raw path)', () => {
  const r = resolveFilesTarget(
    { files: [{ attachmentUrl: 'https://rag.aheadofmarket.com/files/aom/never-queued.pdf', fileName: 'never-queued.pdf' }], project: 'corner', needsReview: true },
    queue,
  )
  assert.ok(r.pending)
  assert.equal(r.pending.rid, 'https://rag.aheadofmarket.com/files/aom/never-queued.pdf')
  assert.equal(r.pending.project, 'corner')
})

test('name-only target (catch-up card) matches project-scoped first', () => {
  const r = resolveFilesTarget({ name: 'qa-rev-notes.txt', project: 'corner' }, queue)
  assert.equal(r.rid, 'corner/users/aom/projects/corner/missions/qa/qa-rev-notes.txt')
  assert.equal(r.proj, 'corner')
})

test('bare needs-review target (no file) resolves to no pending, triage handles it', () => {
  const r = resolveFilesTarget({ needsReview: true }, queue)
  assert.equal(r.wantsFile, false)
  assert.equal(r.pending, null)
})

// ── filesTargetKey: distinct message-row targets must not collide ──

test('two different message-row targets produce different keys (both serialized empty before)', () => {
  const a = filesTargetKey({ files: [{ attachmentUrl: 'https://x/a.png', fileName: 'a.png' }], needsReview: true })
  const b = filesTargetKey({ files: [{ attachmentUrl: 'https://x/b.png', fileName: 'b.png' }], needsReview: true })
  assert.notEqual(a, b)
})

// Regression guard — 2026-07-18 post-deploy: the FileCollectionViewer's
// "Comment in Review" button was wired `onClick={onReview}`, handing the click
// EVENT to reviewHandoff. The old guard `Array.isArray(files) ? files : null`
// dropped it to null, so Review opened with no injected file and stranded the
// user on the projects panel — the exact symptom Patrik reported, reproduced
// 20/20 live. normalizeReviewHandoff makes the hand-off shape-proof.
import { normalizeReviewHandoff } from '../../../src/dashboard/cv6next/data/reviewTargetResolve.js'

test('a DOM click event hands off as null (the projects-panel strand)', () => {
  const fakeEvent = { nativeEvent: {}, currentTarget: {}, target: {}, type: 'click' }
  assert.equal(normalizeReviewHandoff(fakeEvent), null)
})

test('a single message-row file object becomes a one-item list', () => {
  const row = { attachmentUrl: 'https://rag.aheadofmarket.com/files/aom/x-brief.md', fileName: 'brief.md', fileMime: 'text/markdown' }
  const out = normalizeReviewHandoff(row)
  assert.ok(Array.isArray(out) && out.length === 1)
  assert.equal(out[0].fileName, 'brief.md')
})

test('a single attachment-shape file object also becomes a one-item list', () => {
  const att = { url: 'https://rag.aheadofmarket.com/files/aom/y.png', name: 'y.png', mime: 'image/png' }
  const out = normalizeReviewHandoff(att)
  assert.ok(Array.isArray(out) && out.length === 1 && out[0].name === 'y.png')
})

test('an array passes straight through', () => {
  const arr = [{ name: 'a.md' }, { name: 'b.md' }]
  assert.equal(normalizeReviewHandoff(arr), arr)
})

test('null / undefined / addressless object all hand off as null', () => {
  assert.equal(normalizeReviewHandoff(null), null)
  assert.equal(normalizeReviewHandoff(undefined), null)
  assert.equal(normalizeReviewHandoff({ foo: 'bar' }), null)
})
