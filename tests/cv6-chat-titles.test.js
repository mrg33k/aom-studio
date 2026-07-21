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
