import assert from 'node:assert/strict'
import test from 'node:test'

import { curateTitledAgents } from '../src/dashboard/cv6next/data/agentTitles.js'

test('custom chat title changes the room name but preserves specialist identity', () => {
  const input = { agents: [{ slug: 'bobby', status: 'idle', chatTitle: 'Website refresh' }] }
  const chat = curateTitledAgents(input.agents).find((a) => a.slug === 'bobby')

  assert.equal(chat.title, 'Website refresh')
  assert.equal(chat.specialistTitle, 'Web')
  assert.equal(chat.hasCustomTitle, true)
})

test('AOM world shows the full 13-agent hard-coded roster', () => {
  // Even with no live agents, AOM sees all 13 curated agents
  const roster = curateTitledAgents([], { isAom: true })
  assert.equal(roster.length, 13, 'AOM roster should have 13 agents')
  assert.ok(roster.some((a) => a.slug === 'bobby'), 'should include bobby')
  assert.ok(roster.some((a) => a.slug === 'director'), 'should include director')
})

test('non-AOM world shows ONLY its own agent_status rows', () => {
  const tenantAgents = [{ slug: 'ea', name: 'Demo EA', status: 'idle' }]
  const roster = curateTitledAgents(tenantAgents, { isAom: false })
  assert.equal(roster.length, 1, 'demo tenant should see exactly 1 agent')
  assert.equal(roster[0].slug, 'ea')
  assert.equal(roster[0].title, 'Demo EA', 'display name should be agent_status.name, not slug')
  assert.equal(roster[0].specialistTitle, 'Demo EA', 'specialistTitle should prefer name')
})

test('non-AOM world falls back to cap(slug) when name is missing', () => {
  const tenantAgents = [{ slug: 'support', status: 'idle' }]
  const roster = curateTitledAgents(tenantAgents, { isAom: false })
  assert.equal(roster.length, 1)
  assert.equal(roster[0].title, 'Support', 'fallback to capitalized slug')
})

test('non-AOM world never shows the AOM hard-coded roster', () => {
  // A tenant with 2 agents should see exactly 2, not 13+2
  const tenantAgents = [
    { slug: 'ea', name: 'My EA', status: 'active' },
    { slug: 'web-dev', name: 'Web Dev', status: 'idle' },
  ]
  const roster = curateTitledAgents(tenantAgents, { isAom: false })
  assert.equal(roster.length, 2, 'should see exactly 2 agents, not 13+2')
  assert.ok(!roster.some((a) => a.slug === 'bobby'), 'should not include AOM bobby')
  assert.ok(!roster.some((a) => a.slug === 'director'), 'should not include AOM director')
})
