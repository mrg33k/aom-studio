import test from 'node:test'
import assert from 'node:assert/strict'
import { loopCards, portfolioCards, navigationItems } from '../src/pages/aomSiteData.js'

test('homepage exposes the handoff navigation and a complete portfolio rail', () => {
  assert.deepEqual(navigationItems.map((item) => item.label), ['Our Work', 'Our Studio', 'Work with us'])
  assert.ok(portfolioCards.length >= 5)
  assert.ok(portfolioCards.every((card) => card.id && card.title && card.image))
})

test('homepage loop contains the handoff story, work, service, and CTA card types', () => {
  assert.deepEqual([...new Set(loopCards.map((card) => card.kind))].sort(), ['ask', 'cta', 'post', 'quote', 'service', 'story', 'team', 'work'])
  assert.equal(loopCards.at(-1).kind, 'cta')
})
