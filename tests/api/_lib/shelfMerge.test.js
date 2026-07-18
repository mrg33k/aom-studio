// Regression guard — qa-files matrix 2026-07-18: the Home room Files panel
// dropped conversation file attachments (user uploads scored 0/50 in the panel;
// agent shares 0/20 in mission rooms) because its shelf merged library files +
// links only. mergeRoomShelf must keep conversation files, dedupe against the
// library, and preserve links.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { mergeRoomShelf } from '../../../src/dashboard/cv6next/data/shelfMerge.js'

const lib = [
  { type: 'file', name: 'BUILD.md', url: 'corner/users/aom/projects/corner/missions/support/BUILD.md', ts: '2026-05-26' },
]
const convo = [
  { type: 'file', name: 'qa-ft-corner-user-00.txt', url: 'https://rag.aheadofmarket.com/files/aom/projects/corner/Uploads/qa-ft-corner-user-00.txt', ts: '2026-07-18' },
  { type: 'file', name: 'corner-backend-xray.html', url: 'https://rag.aheadofmarket.com/files/aom/corner-backend-xray.html', ts: '2026-07-18' },
  { type: 'link', name: 'drive.google.com', url: 'https://drive.google.com/drive/folders/x', ts: '2026-07-14' },
]

test('conversation file attachments survive the merge (the 0/50 uploads break)', () => {
  const shelf = mergeRoomShelf(lib, convo)
  const names = shelf.map((i) => i.name)
  assert.ok(names.includes('qa-ft-corner-user-00.txt'), 'user upload must appear in the room shelf')
  assert.ok(names.includes('corner-backend-xray.html'), 'agent share must appear in the room shelf')
  assert.ok(names.includes('BUILD.md'), 'library files stay')
  assert.ok(names.includes('drive.google.com'), 'links stay')
})

test('duplicates dedupe by url, library wins its slot', () => {
  const dupConvo = [...convo, { type: 'file', name: 'BUILD.md', url: 'corner/users/aom/projects/corner/missions/support/BUILD.md', ts: '2026-05-26' }]
  const shelf = mergeRoomShelf(lib, dupConvo)
  assert.equal(shelf.filter((i) => i.name === 'BUILD.md').length, 1)
})

test('empty inputs behave', () => {
  assert.deepEqual(mergeRoomShelf([], []), [])
  assert.equal(mergeRoomShelf(null, convo).length, 3)
})
