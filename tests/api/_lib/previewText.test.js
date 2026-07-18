// Regression guard — qa-sweep 2026-07-17 RC6: room-card previews showed raw
// storage URLs ("Deliverable approved: https://rag.aheadofmarket.com/files/aom/
// <uuid>-aztc-prize-website.pdf"). Previews must speak the user's world.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { humanizeUrls, normalizePreview } from '../../../src/dashboard/cv6next/data/previewText.js'

test('storage URL with uuid prefix becomes the human file name', () => {
  const input = 'Deliverable approved: https://rag.aheadofmarket.com/files/aom/b2f6b578-6a36-43ee-a1ff-c212125cc8ba-aztc-prize-website.pdf'
  assert.equal(normalizePreview(input), 'Deliverable approved: aztc-prize-website.pdf')
})

test('URL without a file segment falls back to the hostname', () => {
  assert.equal(humanizeUrls('Check https://os.spacerising.org/ now'), 'Check os.spacerising.org now')
})

test('attached-file messages keep the Shared a file treatment', () => {
  assert.equal(
    normalizePreview('Attached file: corner/missions/backend-hardening/corner-backend-xray.html'),
    'Shared a file: corner-backend-xray.html',
  )
})

test('plain text passes through untouched', () => {
  assert.equal(normalizePreview('The deck is ready and parked on one decision'), 'The deck is ready and parked on one decision')
})

test('trailing punctuation and backticks never leak into the derived name', () => {
  assert.equal(humanizeUrls('See `https://example.com/report.pdf`.'), 'See `report.pdf`.')
})
