import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  resolveEffectiveRoomAgent,
  roomAgentPreferenceKey,
} from '../src/dashboard/cv6next/data/agentPreferences.js'
import { pickerAgents, AGENT_PICKER_BLURBS } from '../src/dashboard/cv6next/data/agentTitles.js'

const input = readFileSync(new URL('../src/dashboard/cv6next/Cv6InputBar.jsx', import.meta.url), 'utf8')

test('room agent key exists only for project/mission rooms (never a 1:1 agent room)', () => {
  // A 1:1 agent room has no key — its agent IS the room, so the picker never shows.
  assert.equal(roomAgentPreferenceKey({ id: 'bobby' }), '')
  assert.equal(roomAgentPreferenceKey({ id: 'corner', isProject: true }), 'project:corner')
  assert.equal(roomAgentPreferenceKey({ id: 'composer', isMission: true, projectSlug: 'corner' }), 'project:corner')
})

test('effective room agent follows the room choice, else the front desk', () => {
  assert.deepEqual(resolveEffectiveRoomAgent({ 'project:corner': 'gary' }, 'project:corner'), { slug: 'gary', source: 'room' })
  // Unset, or an explicit 'corner', both mean the front desk / auto route (today's behavior).
  assert.deepEqual(resolveEffectiveRoomAgent({}, 'project:corner'), { slug: 'corner', source: 'default' })
  assert.deepEqual(resolveEffectiveRoomAgent({ 'project:corner': 'corner' }, 'project:corner'), { slug: 'corner', source: 'default' })
})

test('picker leads with Auto, then the titled roster with tenant-agnostic blurbs', () => {
  const list = pickerAgents([])
  assert.equal(list[0].slug, 'corner')
  assert.equal(list[0].title, 'Auto')
  // Every row carries a slug, a title, and a blurb.
  for (const row of list) {
    assert.ok(row.slug && row.title && row.blurb, `row for ${row.slug} is complete`)
  }
  // Gary reads as Operations and its blurb is business-generic, not AOM-specific.
  const gary = list.find((a) => a.slug === 'gary')
  assert.ok(gary, 'gary is in the picker')
  assert.equal(gary.title, 'Operations')
  assert.equal(gary.blurb, AGENT_PICKER_BLURBS.gary)
  assert.doesNotMatch(gary.blurb, /\bAOM\b/i)
  assert.doesNotMatch(gary.blurb, /\bCOO\b/)
})

test('composer wires the Agent picker into Commands (button label + submenu)', () => {
  assert.match(input, /data-testid="cv6-current-agent"/)
  assert.match(input, /testid="cv6-commands-agent"/)
  assert.match(input, /testid=\{`cv6-commands-agent-\$\{option\.slug\}`\}/)
  // The Agent row is gated behind agent.enabled (project/mission rooms only).
  assert.match(input, /agent\?\.enabled/)
})
