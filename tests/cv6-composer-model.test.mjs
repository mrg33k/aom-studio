import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  resolveEffectiveRoomModel,
  roomModelPreferenceKey,
} from '../src/dashboard/cv6next/data/modelPreferences.js'

const input = readFileSync(new URL('../src/dashboard/cv6next/Cv6InputBar.jsx', import.meta.url), 'utf8')

test('room model keys match direct, project, and mission bridge scopes', () => {
  assert.equal(roomModelPreferenceKey({ id: 'bobby' }), 'bobby')
  assert.equal(roomModelPreferenceKey({ id: 'corner', isProject: true }), 'project:corner')
  assert.equal(roomModelPreferenceKey({ id: 'composer', isMission: true, projectSlug: 'corner' }), 'project:corner')
})

test('effective model follows room, workspace, then automatic precedence', () => {
  assert.deepEqual(resolveEffectiveRoomModel({ _all: 'opus', bobby: 'haiku' }, 'bobby'), { id: 'haiku', source: 'room' })
  assert.deepEqual(resolveEffectiveRoomModel({ _all: 'opus', bobby: 'default' }, 'bobby'), { id: 'opus', source: 'workspace' })
  assert.deepEqual(resolveEffectiveRoomModel({ _all: 'default' }, 'bobby'), { id: 'default', source: 'automatic' })
})

test('composer keeps only voice/send below the field and moves state into Commands', () => {
  assert.match(input, /data-testid="cv6-current-model"/)
  assert.match(input, /data-testid="cv6-commands-mode-toggle"/)
  assert.match(input, /testid=\{`cv6-commands-model-\$\{option\.id\}`\}/)
  assert.match(input, /className="cv6-composer-attach"/)
  assert.doesNotMatch(input, /className="cv6-mode-toggle cv6-composer-util"/)
  assert.match(input, /background: 'var\(--composer-solid, var\(--surface\)\)'/)
})
