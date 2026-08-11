import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  dispatchAgentSlug,
  resolveEffectiveRoomAgent,
  roomAgentPreferenceKey,
} from '../src/dashboard/cv6next/data/agentPreferences.js'
import { pickerAgents } from '../src/dashboard/cv6next/data/agentTitles.js'

const input = readFileSync(new URL('../src/dashboard/cv6next/Cv6InputBar.jsx', import.meta.url), 'utf8')

test('room specialist keys match the bridge canonical keys', () => {
  assert.equal(roomAgentPreferenceKey({ id: 'bobby' }), '')
  assert.equal(roomAgentPreferenceKey({ id: 'corner', isProject: true }), 'project:corner')
  assert.equal(roomAgentPreferenceKey({ id: 'native-ios', missionSlug: 'corner:native-ios', isMission: true }), 'mission:corner:native-ios')
})

test('unassigned rooms use their default identity and dispatch through corner', () => {
  assert.deepEqual(resolveEffectiveRoomAgent({}, 'project:corner'), { slug: 'default', source: 'default' })
  assert.deepEqual(resolveEffectiveRoomAgent({ 'project:corner': 'elon' }, 'project:corner'), { slug: 'elon', source: 'room' })
  assert.equal(dispatchAgentSlug('default'), 'corner')
  assert.equal(dispatchAgentSlug('elon'), 'elon')
})

test('picker uses only the live API roster after the room default', () => {
  const list = pickerAgents([{ slug: 'elon', title: 'Systems', role: 'System Architect' }])
  assert.deepEqual(list.map((row) => row.slug), ['default', 'elon'])
  assert.equal(list[0].title, 'Room default')
  assert.equal(list[1].title, 'Systems')
})

test('composer wires the specialist into the Commands pill and submenu', () => {
  assert.match(input, /data-testid="cv6-current-agent"/)
  assert.match(input, /testid="cv6-commands-agent"/)
  assert.match(input, /agent\?\.enabled/)
})
