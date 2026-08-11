import assert from 'node:assert/strict'
import test from 'node:test'

process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'

const { default: handler } = await import('../../api/dashboard/room-agent.js')

function responseRecorder() {
  return {
    statusCode: null, payload: null, headers: {},
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
    end() { return this },
  }
}

function authenticatedFetch({ roster = [], assignments = {}, writes = [] } = {}) {
  return async (url, options = {}) => {
    const value = String(url)
    if (value.endsWith('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }) }
    }
    if (value.includes('/rest/v1/agent_status')) {
      assert.match(value, /type=eq\.agent/)
      return { ok: true, json: async () => roster }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method !== 'POST') {
      return { ok: true, json: async () => ([{ value: assignments }]) }
    }
    if (value.includes('/rest/v1/user_preferences') && options.method === 'POST') {
      writes.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({}) }
    }
    throw new Error(`unexpected request: ${options.method || 'GET'} ${value}`)
  }
}

test('GET returns only the live agent roster and keeps terminal-capable specialists', async () => {
  globalThis.fetch = authenticatedFetch({
    roster: [
      { slug: 'elon', name: 'Elon', role: 'System Architect', is_owner: false },
      { slug: 'patrik', name: 'Patrik', role: 'Owner', is_owner: true },
    ],
    assignments: { 'project:corner': 'elon' },
  })
  const req = { method: 'GET', query: { client: 'aom' }, headers: { authorization: 'Bearer stub-jwt' } }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.payload.assignments, { 'project:corner': 'elon' })
  assert.deepEqual(res.payload.agents, [{ slug: 'elon', title: 'Systems', role: 'System Architect' }])
})

test('PATCH stores a canonical room assignment after roster validation', async () => {
  const writes = []
  globalThis.fetch = authenticatedFetch({
    roster: [{ slug: 'rex', name: 'Rex', role: 'Super Agent', is_owner: false }],
    assignments: {}, writes,
  })
  const req = {
    method: 'PATCH', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { room: 'mission:corner:native-ios', agent: 'rex', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(writes[0].value), { 'mission:corner:native-ios': 'rex' })
})

test('PATCH rejects unknown specialists without writing', async () => {
  const writes = []
  globalThis.fetch = authenticatedFetch({ roster: [], assignments: {}, writes })
  const req = {
    method: 'PATCH', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { room: 'project:corner', agent: 'not-an-agent', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.match(res.payload.error, /unknown agent/)
  assert.equal(writes.length, 0)
})

test('PATCH default clears an existing room assignment', async () => {
  const writes = []
  globalThis.fetch = authenticatedFetch({
    assignments: { 'project:corner': 'elon', 'agent:rex': 'rex' }, writes,
  })
  const req = {
    method: 'PATCH', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { room: 'project:corner', agent: 'default', client_id: 'aom' },
  }
  const res = responseRecorder()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(writes[0].value), { 'agent:rex': 'rex' })
})
