import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  resolveEffectiveRoomModel,
  roomModelPreferenceKey,
} from '../src/dashboard/cv6next/data/modelPreferences.js'
import { MODEL_OPTIONS } from '../src/dashboard/components/cv3/chat/chatConstants.js'

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

test('OpenAI is a deliberate room model, not an automatic fallback', () => {
  const option = MODEL_OPTIONS.find(({ id }) => id === 'openai-gpt-5.6')
  assert.deepEqual(option, {
    id: 'openai-gpt-5.6',
    label: 'OpenAI GPT-5.6',
    desc: 'Hosted reasoning · AOM managed',
  })
  assert.deepEqual(
    resolveEffectiveRoomModel({ bobby: 'openai-gpt-5.6' }, 'bobby'),
    { id: 'openai-gpt-5.6', source: 'room' },
  )
})

test('local Codex is an explicit per-room option backed by Corner Runner', () => {
  assert.deepEqual(MODEL_OPTIONS.find(({ id }) => id === 'codex-local'), {
    id: 'codex-local',
    label: 'Codex on this computer',
    desc: 'Your ChatGPT subscription · local runner',
  })
  assert.deepEqual(
    resolveEffectiveRoomModel({ bobby: 'codex-local' }, 'bobby'),
    { id: 'codex-local', source: 'room' },
  )
})

test('composer keeps only voice/send below the field and moves state into Commands', () => {
  assert.match(input, /data-testid="cv6-current-model"/)
  assert.match(input, /data-testid="cv6-commands-mode-toggle"/)
  assert.match(input, /testid=\{`cv6-commands-model-\$\{option\.id\}`\}/)
  assert.match(input, /className="cv6-composer-attach"/)
  assert.doesNotMatch(input, /className="cv6-mode-toggle cv6-composer-util"/)
  assert.match(input, /background: 'var\(--composer-solid, var\(--surface\)\)'/)
})
