import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMissionPromotion,
  shouldPromoteDirectAgentMessage,
  slugifyMissionTitle,
} from '../../../api/_lib/directMissionPromotion.js'

test('does not promote lightweight direct chat', () => {
  assert.equal(shouldPromoteDirectAgentMessage({
    agent: 'bobby',
    text: 'hey',
    role: 'user',
  }), false)
  assert.equal(shouldPromoteDirectAgentMessage({
    agent: 'bobby',
    text: 'status?',
    role: 'user',
  }), false)
})

test('promotes direct work asks only when unscoped', () => {
  assert.equal(shouldPromoteDirectAgentMessage({
    agent: 'bobby',
    text: 'Can you build a landing page and save the files?',
    role: 'user',
  }), true)
  assert.equal(shouldPromoteDirectAgentMessage({
    agent: 'bobby',
    text: 'Can you build a landing page?',
    role: 'user',
    project: 'corner',
  }), false)
  assert.equal(shouldPromoteDirectAgentMessage({
    agent: 'bobby',
    text: 'Can you build a landing page?',
    role: 'user',
    metadata: { mission_slug: 'corner:landing-page' },
  }), false)
})

test('builds a tenant-scoped mission promotion payload', () => {
  const promotion = buildMissionPromotion({
    agent: 'bobby',
    text: 'Can you build a landing page and save the files?',
    tenantId: 'ben',
  })
  assert.equal(promotion.parentSlug, 'agent-work')
  assert.equal(promotion.fullSlug, `agent-work:${promotion.missionSlug}`)
  assert.equal(promotion.missionPath, `corner/users/ben/projects/agent-work/missions/${promotion.missionSlug}`)
  assert.match(promotion.instruction, /Auto-promoted from direct bobby chat/)
  assert.match(promotion.instruction, /include a user-visible pointer/)
  assert.match(promotion.instruction, /file path, URL, room link, or attachment/)
  assert.ok(promotion.scaffold['BUILD.md'].includes('**Status:** in progress.'))
})

test('slugifies direct asks into stable mission slugs', () => {
  assert.equal(slugifyMissionTitle('Please create the new client deck!!!', 'steffen'), 'create-new-client-deck')
  assert.equal(slugifyMissionTitle('123', 'steffen'), 'm-123')
})
