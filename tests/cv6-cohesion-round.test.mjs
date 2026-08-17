import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSearchGroups, fuzzySearchScore } from '../src/dashboard/cv6next/data/searchResults.js'
import { savedRoomExists, missionTreesFromResponse } from '../src/dashboard/cv6next/data/lastRoomValidation.js'

test('mission search preserves the exact nested mission room identity', () => {
  const groups = buildSearchGroups({
    query: 'launch',
    projects: [{ id: 'project-uuid', slug: 'corner', name: 'Corner' }],
    byProject: {
      corner: [{ slug: 'platform', name: 'Platform', children: [{ slug: 'launch-room', name: 'Launch Room', status: 'active' }] }],
    },
  })

  assert.equal(groups.length, 1)
  assert.equal(groups[0].label, 'Missions')
  assert.deepEqual(groups[0].results[0].room, {
    id: 'launch-room',
    name: 'Launch Room',
    initials: 'LA',
    isMission: true,
    missionSlug: 'corner:launch-room',
    projectSlug: 'corner',
    status: 'active',
    statusText: 'Corner',
  })
})

test('project search uses the project slug that message scoping expects', () => {
  const groups = buildSearchGroups({
    query: 'corner',
    projects: [{ id: 'project-uuid', slug: 'corner', name: 'Corner' }],
  })
  assert.equal(groups[0].results[0].room.id, 'corner')
  assert.equal(groups[0].results[0].room.isProject, true)
})

test('command palette blank state follows real attention and recency order', () => {
  const direct = { kind: 'agent', id: 'corner', agent: 'corner', name: 'Corner', roomObj: { id: 'corner', name: 'Corner' } }
  const project = { kind: 'project', id: 'wolfpack', project: 'wolfpack', name: 'Wolfpack', roomObj: { id: 'wolfpack', name: 'Wolfpack', isProject: true } }
  const groups = buildSearchGroups({
    recent: [direct, project],
    actions: [{ id: 'all-rooms', title: 'All rooms', action: 'home' }],
  })
  assert.equal(groups[0].label, 'Recent')
  assert.deepEqual(groups[0].results.map((room) => room.title), ['Corner', 'Wolfpack'])
  assert.equal(groups[1].results[0].action, 'home')
})

test('command palette fuzzy matching tolerates missing characters', () => {
  assert.notEqual(fuzzySearchScore('wlfpk', 'Wolfpack'), null)
  const groups = buildSearchGroups({
    query: 'wlfpk',
    projects: [{ id: 'wolfpack-id', slug: 'wolfpack', name: 'Wolfpack' }],
  })
  assert.equal(groups[0].results[0].title, 'Wolfpack')
})

test('saved room validation rejects archived missions but keeps live room types', () => {
  const agents = [{ id: 'rex', name: 'Rex' }]
  const projects = [{ id: 'corner', slug: 'corner', name: 'Corner' }]
  const missionTrees = missionTreesFromResponse({
    projects: [{ slug: 'corner', tree: [{ slug: 'one-corner', children: [{ slug: 'nested-live' }] }] }],
  })

  assert.equal(savedRoomExists({ id: 'rex' }, { agents, projects }), true)
  assert.equal(savedRoomExists({ id: 'corner', isProject: true }, { agents, projects }), true)
  assert.equal(savedRoomExists({ id: 'one-corner', isMission: true, missionSlug: 'corner:one-corner', projectSlug: 'corner' }, { agents, projects }), null)
  assert.equal(savedRoomExists({ id: 'one-corner', isMission: true, missionSlug: 'corner:one-corner', projectSlug: 'corner' }, { agents, projects, missionTrees }), true)
  assert.equal(savedRoomExists({ id: 'archived-room', isMission: true, missionSlug: 'corner:archived-room', projectSlug: 'corner' }, { agents, projects, missionTrees }), false)
})
