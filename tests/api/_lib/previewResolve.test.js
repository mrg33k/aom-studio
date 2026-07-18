// Regression guard — R-CHAT-FILE-MODAL (corner:corner-ui-cv6, 2026-07-18).
// Patrik: "click an individual file in the chat brings up a small modal but
// never loads the preview." Root cause: the chat modal forked its own kind
// detection and never resolved a loadable address/viewer type for non-image
// files. previewResolve.js is now the ONE home for that resolution, shared by
// the chat file modal (ChatLifecycle FileCollectionViewer) and the Review
// injected queue (useReview reviewItemsFromFiles). These tests pin the contract.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { typeKeyOf, chatFileToReviewTarget, REVIEW_VIEWER_TYPES } from '../../../src/dashboard/cv6next/data/previewResolve.js'

// ── typeKeyOf: extension / mime → viewer key ─────────────────────────────────

test('pdf and word docs resolve to the doc viewer', () => {
  assert.equal(typeKeyOf('deck.pdf', ''), 'doc')
  assert.equal(typeKeyOf('memo.docx', ''), 'doc')
  assert.equal(typeKeyOf('slides.pptx', ''), 'doc')
})

test('images resolve by extension or mime', () => {
  assert.equal(typeKeyOf('shot.png', ''), 'image')
  assert.equal(typeKeyOf('shot', 'image/jpeg'), 'image')
})

test('video and audio resolve to their players', () => {
  assert.equal(typeKeyOf('clip.mp4', ''), 'video')
  assert.equal(typeKeyOf('take.wav', ''), 'audio')
})

test('html files resolve to the sitefile viewer, text-ish files to copy, code to code', () => {
  assert.equal(typeKeyOf('page.html', ''), 'sitefile')
  assert.equal(typeKeyOf('notes.txt', ''), 'copy')
  assert.equal(typeKeyOf('brief.md', ''), 'copy')
  assert.equal(typeKeyOf('data.json', ''), 'copy')
  assert.equal(typeKeyOf('app.jsx', ''), 'code')
})

test('a bare live URL with no file extension is a live site', () => {
  assert.equal(typeKeyOf('https://os.spacerising.org/', '', 'https://os.spacerising.org/'), 'sitelive')
})

test('every detected key is one the Review renderer understands', () => {
  for (const name of ['a.pdf', 'a.png', 'a.mp4', 'a.wav', 'a.html', 'a.txt', 'a.jsx', 'a.zip']) {
    assert.ok(REVIEW_VIEWER_TYPES.has(typeKeyOf(name, '')), `${name} maps into REVIEW_VIEWER_TYPES`)
  }
})

// ── chatFileToReviewTarget: every chat file shape → { path, title, type } ────

test('attachment shape ({url,name,mime}) resolves with the store URL intact', () => {
  const t = chatFileToReviewTarget({ url: 'https://rag.aheadofmarket.com/files/aom/abc-deck.pdf', name: 'deck.pdf', mime: 'application/pdf' })
  assert.deepEqual(t, { path: 'https://rag.aheadofmarket.com/files/aom/abc-deck.pdf', title: 'deck.pdf', type: 'doc' })
})

test('mobile message-row shape ({attachmentUrl,fileName,fileMime}) resolves — the exact shape the chat modal receives', () => {
  const t = chatFileToReviewTarget({ attachmentUrl: 'https://rag.aheadofmarket.com/files/aom/xyz-notes.txt', fileName: 'notes.txt', fileMime: 'text/plain' })
  assert.deepEqual(t, { path: 'https://rag.aheadofmarket.com/files/aom/xyz-notes.txt', title: 'notes.txt', type: 'copy' })
})

test('a corner path sheds leading slashes to match review-queue item ids', () => {
  const t = chatFileToReviewTarget({ url: '/corner/users/aom/projects/x/missions/y/shot.png', name: 'shot.png' })
  assert.equal(t.path, 'corner/users/aom/projects/x/missions/y/shot.png')
  assert.equal(t.type, 'image')
})

test('a file with no address anywhere returns null (honest empty state, not a broken fetch)', () => {
  assert.equal(chatFileToReviewTarget({ fileName: 'ghost.pdf' }), null)
  assert.equal(chatFileToReviewTarget(null), null)
})

test('title falls back to the path basename when no name is carried', () => {
  const t = chatFileToReviewTarget({ url: 'corner/missions/m/deliverables/report.pdf' })
  assert.equal(t.title, 'report.pdf')
  assert.equal(t.type, 'doc')
})

test('broad stamped types never override a concrete extension (the binary-symbols bug)', () => {
  // A .png stamped 'doc' must still render as an image…
  assert.equal(chatFileToReviewTarget({ url: 'x/y/shot.png', type: 'doc' }).type, 'image')
  // …and a generic shelf discriminator type:'file' is not a viewer key at all.
  assert.equal(chatFileToReviewTarget({ url: 'x/y/clip.mp4', type: 'file' }).type, 'video')
})

test('intentional explicit viewer types are honored (sitelive artifact card)', () => {
  const t = chatFileToReviewTarget({ url: 'https://client-site.vercel.app', name: 'Client draft', type: 'sitelive' })
  assert.equal(t.type, 'sitelive')
})
