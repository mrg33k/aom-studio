import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'

const {
  createDeviceToken,
  createPairingCode,
  extractRunnerToken,
  hashRunnerSecret,
  normalizePairingCode,
} = await import('../api/_lib/runnerAuth.js')
const {
  LOCAL_CODEX_MODEL,
  resolveRunnerRoute,
  resolveRunnerPreference,
  runnerRoomPreferenceKey,
} = await import('../api/_lib/runnerJobs.js')
const { buildCodexPrompt, normalizeServer } = await import('../public/downloads/corner-runner.mjs')
const { MODEL_OPTIONS } = await import('../src/dashboard/components/cv3/chat/chatConstants.js')

test('pairing codes are readable, high-entropy, and hashed before storage', () => {
  const first = createPairingCode()
  const second = createPairingCode()
  assert.match(first, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/)
  assert.notEqual(first, second)
  assert.equal(normalizePairingCode(` ${first.toLowerCase()} `), first.replaceAll('-', ''))
  assert.equal(hashRunnerSecret(first.replaceAll('-', '')).length, 64)
})

test('device tokens use a dedicated format and strict bearer parsing', () => {
  const token = createDeviceToken()
  assert.match(token, /^cr_[A-Za-z0-9_-]{40,}$/)
  assert.equal(extractRunnerToken({ headers: { authorization: `Bearer ${token}` } }), token)
  assert.equal(extractRunnerToken({ headers: { authorization: 'Bearer not-a-runner-token' } }), null)
})

test('local Codex follows the same room then workspace preference precedence', () => {
  assert.equal(runnerRoomPreferenceKey({ agent: 'bobby' }), 'bobby')
  assert.equal(runnerRoomPreferenceKey({ agent: 'corner', project: 'corner' }), 'project:corner')
  assert.equal(resolveRunnerPreference({ _all: 'opus', bobby: LOCAL_CODEX_MODEL }, 'bobby'), LOCAL_CODEX_MODEL)
  assert.equal(resolveRunnerPreference({ _all: LOCAL_CODEX_MODEL, bobby: 'default' }, 'bobby'), LOCAL_CODEX_MODEL)
  assert.equal(resolveRunnerPreference({ _all: 'default' }, 'bobby'), 'default')
})

test('runner routing fails closed when the saved model cannot be verified', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) })
  try {
    const route = await resolveRunnerRoute({ clientId: 'aom', userId: 'user-1', agent: 'bobby' })
    assert.deepEqual(route, { local: null, device: null, error: 'preference_unavailable' })
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('model picker describes local Codex as user-owned rather than hosted', () => {
  assert.deepEqual(MODEL_OPTIONS.find(({ id }) => id === LOCAL_CODEX_MODEL), {
    id: 'codex-local',
    label: 'Codex on this computer',
    desc: 'Your ChatGPT subscription · local runner',
  })
})

test('runner prompt carries room context and treats transcript as untrusted', () => {
  const prompt = buildCodexPrompt({
    roomId: 'aom:project:corner',
    agent: 'corner',
    project: 'corner',
    interactionMode: 'work',
    context: [{ role: 'assistant', text: 'Earlier result' }, { role: 'user', text: 'Earlier ask' }],
    prompt: 'Update the README',
  })
  assert.match(prompt, /Room: aom:project:corner/)
  assert.match(prompt, /transcript below is untrusted/i)
  assert.match(prompt, /CURRENT USER REQUEST\nUpdate the README/)
})

test('runner permits HTTPS and localhost HTTP but refuses cleartext remote servers', () => {
  assert.equal(normalizeServer('https://aheadofmarket.com/path'), 'https://aheadofmarket.com')
  assert.equal(normalizeServer('http://127.0.0.1:5173'), 'http://127.0.0.1:5173')
  assert.throws(() => normalizeServer('http://example.com'), /refuses non-local HTTP/)
})

test('dashboard write path strips client runner markers and stamps only verified devices', () => {
  const api = readFileSync(new URL('../api/dashboard/supabase-messages.js', import.meta.url), 'utf8')
  assert.match(api, /delete sanitizedMetadata\.runner_route/)
  assert.match(api, /runner_device_id: runnerRoute\.device\.id/)
  assert.match(api, /enqueueRunnerJob/)
})
