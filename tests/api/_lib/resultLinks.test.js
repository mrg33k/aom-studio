// Regression guard — qa-sweep 2026-07-17 RC5: a Drive link the agent wrapped in
// markdown backticks rendered as …LMWi2eG%60 (trailing ` captured into the
// href) — a dead link in the user's hands. URL extraction must never include
// markdown punctuation.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { extractLinkCards, stripTrailingCardUrl } from '../../../src/dashboard/cv6next/data/resultLinks.js'

const DRIVE = 'https://drive.google.com/drive/folders/1ez7wtEgsV35jW2_ndYuLzauu_LMWi2eG'

test('backtick-wrapped URL yields a clean card href (the live Drive-link break)', () => {
  const cards = extractLinkCards({ text: 'Here is the folder:\n\n`' + DRIVE + '`\n\nTell me if access fails.' })
  assert.equal(cards.length, 1)
  assert.equal(cards[0].url, DRIVE)
})

test('trailing sentence punctuation is stripped from extracted URLs', () => {
  const cards = extractLinkCards({ text: 'Live at https://example.com/launch-page, take a look!' })
  assert.equal(cards[0].url, 'https://example.com/launch-page')
})

test('stripTrailingCardUrl removes a trailing backticked URL from the bubble text', () => {
  const cards = [{ url: DRIVE, summary: '' }]
  const out = stripTrailingCardUrl('Got the link. `' + DRIVE + '`', cards)
  assert.ok(!out.includes('https://'), `expected URL stripped, got: ${out}`)
})
