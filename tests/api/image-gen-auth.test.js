import assert from 'node:assert/strict'
import test from 'node:test'

process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'

const { default: handler } = await import('../../api/dashboard/image-gen.js')

function response() {
  return {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
}

test('image generation refuses an unauthenticated credit-spending request', async () => {
  let providerCalled = false
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => { providerCalled = true; throw new Error('must not fetch') }
  try {
    const req = {
      method: 'POST', headers: {}, query: {},
      body: { client_id: 'aom', tool: 'openai', prompt: 'Burn provider credits' },
    }
    const res = response()
    await handler(req, res)
    assert.equal(res.statusCode, 401)
    assert.equal(providerCalled, false)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('image generation authenticates before rejecting an unknown provider', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }) }
    }
    throw new Error(`unexpected request: ${url}`)
  }
  try {
    const req = {
      method: 'POST', query: {}, headers: { authorization: 'Bearer stub-jwt' },
      body: { client_id: 'aom', tool: 'not-a-provider', prompt: 'A secure test' },
    }
    const res = response()
    await handler(req, res)
    assert.equal(res.statusCode, 400)
    assert.match(res.payload.error, /Unknown tool/)
  } finally {
    globalThis.fetch = previousFetch
  }
})
