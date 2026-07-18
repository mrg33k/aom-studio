// Regression guard — qa-watch 2026-07-18 tick 33: the project-files slug
// validator rejected dots, so the aheadofmarket.com project room's Files panel
// got a 400 on every load (silently empty for the user). Dotted slugs must
// pass validation; path traversal must stay blocked.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub-key'

const { default: handler } = await import('../../api/dashboard/project-files.js')

// Stub the world lookup so validation is the only thing under test: any slug
// that clears validation reaches resolveProjectWorld, which we answer with null
// (-> 404), cleanly separating "invalid slug" (400) from "passed validation".
globalThis.fetch = async () => ({ ok: true, json: async () => ([]) })

function run(slug) {
  const req = { method: 'GET', query: { slug }, headers: {} }
  const res = {
    statusCode: null, payload: null,
    setHeader() {}, status(c) { this.statusCode = c; return this }, json(p) { this.payload = p; return this }, end() { return this },
  }
  return handler(req, res).then(() => res)
}

test('dotted project slug passes validation (aheadofmarket.com)', async () => {
  const res = await run('aheadofmarket.com')
  assert.notEqual(res.statusCode, 400, `dotted slug must not 400: ${JSON.stringify(res.payload)}`)
})

test('plain and hyphenated slugs still pass', async () => {
  assert.notEqual((await run('corner')).statusCode, 400)
  assert.notEqual((await run('az-tech-council')).statusCode, 400)
})

test('path traversal and malformed slugs still 400', async () => {
  assert.equal((await run('../etc')).statusCode, 400)
  assert.equal((await run('a..b')).statusCode, 400)
  assert.equal((await run('trailing.')).statusCode, 400)
  assert.equal((await run('.leading')).statusCode, 400)
  assert.equal((await run('UPPER.case')).statusCode, 400)
})
