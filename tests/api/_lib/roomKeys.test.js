// Regression guard — qa-sweep 2026-07-17 RC3: Review from a room's Files panel
// opened the Files tab with NO project context (tree stayed on the previously
// open project, selection and meta panel disagreed with the preview). The
// handoff derives the room's project via roomProjectSlug — these are the room
// shapes the shell actually passes.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { roomProjectSlug } from '../../../src/dashboard/cv6next/data/roomKeys.js'

test('project room (home recent entry shape) resolves to its own slug', () => {
  assert.equal(roomProjectSlug({ kind: 'project', id: 'corner', project: 'corner' }), 'corner')
})

test('project room (knav shape with isProject) resolves to its id', () => {
  assert.equal(roomProjectSlug({ isProject: true, id: 'az-tech-council' }), 'az-tech-council')
})

test('mission room resolves to its parent project', () => {
  assert.equal(roomProjectSlug({ isMission: true, projectSlug: 'corner', id: 'backend-hardening' }), 'corner')
  assert.equal(roomProjectSlug({ kind: 'mission', project: 'aheadofmarket.com', missionSlug: 'summerschool' }), 'aheadofmarket.com')
})

test('agent 1:1 room resolves to empty (no project to select)', () => {
  assert.equal(roomProjectSlug({ kind: 'agent', agent: 'rex', id: 'rex' }), '')
  assert.equal(roomProjectSlug(null), '')
})
