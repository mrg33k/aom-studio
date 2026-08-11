import assert from 'node:assert/strict'
import test from 'node:test'

process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'

const { default: handler } = await import('../../api/dashboard/supabase-messages.js')

test('a direct specialist request stays one direct message and creates no project or mission', async () => {
  const writes = []
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url)
    if (value.includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }) }
    }
    if (value.includes('/rest/v1/user_preferences')) {
      return { ok: true, json: async () => ([]) }
    }
    // Auto routing now checks for a recently online local runner before falling
    // back to the central bridge. No paired device means the original direct
    // specialist path, not a lookup failure.
    if (value.includes('/rest/v1/corner_runner_devices')) {
      return { ok: true, json: async () => ([]) }
    }
    if (value.includes('/rest/v1/messages') && options.method === 'POST') {
      const body = JSON.parse(options.body)
      writes.push({ url: value, body })
      return { ok: true, json: async () => ([body]) }
    }
    throw new Error(`unexpected request: ${options.method || 'GET'} ${value}`)
  }

  const req = {
    method: 'POST', query: {}, headers: { authorization: 'Bearer stub-jwt' },
    body: { client_id: 'aom', agent: 'bobby', text: 'Build the landing page and save the files.', role: 'user', source: 'corner-dashboard' },
  }
  const res = {
    statusCode: null, payload: null, headers: {},
    setHeader(k, v) { this.headers[k] = v },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
    end() { return this },
  }

  await handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].body.text, req.body.text)
  assert.equal(writes[0].body.agent, 'bobby')
  assert.equal(writes[0].body.room_id, 'aom:agent:bobby')
  assert.equal(writes[0].body.project, undefined)
  assert.deepEqual(writes[0].body.metadata, {})
  assert.equal(res.payload.promoted_to, undefined)
})
