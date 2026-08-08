import assert from 'node:assert/strict'
import test from 'node:test'

process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'

const { default: handler } = await import('../../api/dashboard/agent-model.js')

function responseRecorder() {
  return {
    statusCode: null, payload: null, headers: {},
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
    end() { return this },
  }
}

test('model preferences reject provider ids that are not allowlisted', async () => {
  let fetches = 0
  globalThis.fetch = async () => { fetches += 1; throw new Error('should not fetch') }
  const req = {
    method: 'PATCH', query: {}, headers: {},
    body: { slug: 'bobby', model: 'untrusted-provider', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.payload.error, 'Unsupported model')
  assert.equal(fetches, 0)
})

test('model preferences reject object prototype keys', async () => {
  const req = {
    method: 'PATCH', query: {}, headers: {},
    body: { slug: '__proto__', model: 'openai-gpt-5.6', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.payload.error, 'Invalid room')
})

test('OpenAI preference is saved only after tenant authentication', async () => {
  const writes = []
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url)
    if (value.endsWith('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method !== 'POST') {
      return { ok: true, json: async () => ([{ value: { bobby: 'sonnet' } }]) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method === 'POST') {
      writes.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({}) }
    }
    throw new Error(`unexpected request: ${options.method || 'GET'} ${value}`)
  }
  const req = {
    method: 'PATCH', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { slug: 'bobby', model: 'openai-gpt-5.6', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(writes.length, 1)
  assert.deepEqual(JSON.parse(writes[0].value), { bobby: 'openai-gpt-5.6' })
})

test('local Codex preference is allowlisted for paired-runner rooms', async () => {
  const writes = []
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url)
    if (value.endsWith('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method !== 'POST') {
      return { ok: true, json: async () => ([]) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method === 'POST') {
      writes.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({}) }
    }
    throw new Error(`unexpected request: ${options.method || 'GET'} ${value}`)
  }
  const req = {
    method: 'PATCH', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { slug: 'bobby', model: 'codex-local', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(writes[0].value), { bobby: 'codex-local' })
})

test('a failed preference write is reported instead of pretending success', async () => {
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url)
    if (value.endsWith('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method !== 'POST') {
      return { ok: true, json: async () => ([]) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method === 'POST') {
      return { ok: false, status: 500, json: async () => ({}) }
    }
    throw new Error(`unexpected request: ${options.method || 'GET'} ${value}`)
  }
  const req = {
    method: 'PATCH', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { slug: 'bobby', model: 'openai-gpt-5.6', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.match(res.payload.error, /Could not save/)
})
