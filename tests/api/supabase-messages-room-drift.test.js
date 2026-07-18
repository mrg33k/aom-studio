// Regression guard — qa-sweep 2026-07-17 RC1 (room-key drift, the P0):
// writer lanes stamped project rooms as fake missions (mission_slug="corner",
// room_id aom:mission:corner / aom:mission:corner:corner) and mission rooms
// with BARE slugs (aom:mission:backend-hardening next to the canonical
// aom:mission:corner:backend-hardening). Without read-side rescue arms those
// rows render NOWHERE: the live Corner room showed a tail hours stale while
// Home previewed the missing messages. These tests pin the or() arms the GET
// handler sends to Supabase for both room modes.
import { strict as assert } from 'node:assert'
import { test, beforeEach } from 'node:test'

process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-key'

const { default: handler } = await import('../../api/dashboard/supabase-messages.js')

let capturedUrls = []
beforeEach(() => { capturedUrls = [] })

globalThis.fetch = async (url) => {
  const u = String(url)
  capturedUrls.push(u)
  if (u.includes('/auth/v1/user')) {
    return {
      ok: true,
      json: async () => ({ id: 'user-1', user_metadata: { world: 'aom' } }),
    }
  }
  return { ok: true, json: async () => ([]) }
}

function fakeReqRes(query) {
  const req = { method: 'GET', query, headers: { authorization: 'Bearer stub-jwt' }, body: null }
  const res = {
    statusCode: null,
    payload: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v },
    status(c) { this.statusCode = c; return this },
    json(p) { this.payload = p; return this },
    end() { return this },
  }
  return { req, res }
}

function messagesQuery() {
  const q = capturedUrls.find((u) => u.includes('/rest/v1/messages'))
  assert.ok(q, 'handler should query the messages table')
  return decodeURIComponent(q)
}

test('project CHAT rescues rows stamped as a fake mission named after the project', async () => {
  const { req, res } = fakeReqRes({ project: 'corner', project_only: '1', client: 'aom', limit: 40 })
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  const q = messagesQuery()
  assert.ok(q.includes('room_id.eq.aom:project:corner'), 'canonical project room arm')
  assert.ok(q.includes('room_id.eq.aom:mission:corner,'), 'bogus mission-named-as-project arm')
  assert.ok(q.includes('room_id.eq.aom:mission:corner:corner'), 'canonicalized bogus arm')
  assert.ok(q.includes('metadata->>mission_slug.eq.corner'), 'metadata fake-mission arm')
  assert.ok(q.includes('mission_slug.is.null'), 'legacy no-mission arm still present')
})

test('mission room matches BOTH canonical and bare room_id forms', async () => {
  const { req, res } = fakeReqRes({ agent: 'corner', mission_slug: 'corner:backend-hardening', client: 'aom', limit: 40 })
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  const q = messagesQuery()
  assert.ok(q.includes('room_id.eq.aom:mission:corner:backend-hardening'), 'canonical mission arm')
  assert.ok(q.includes('room_id.eq.aom:mission:backend-hardening'), 'bare-slug drift arm')
})

test('newest rows win the window: query orders timestamp desc with the limit', async () => {
  const { req, res } = fakeReqRes({ project: 'corner', project_only: '1', client: 'aom', limit: 40 })
  await handler(req, res)
  const q = messagesQuery()
  assert.ok(q.includes('order=timestamp.desc'), 'must fetch latest-first so limit keeps the newest rows')
  assert.ok(q.includes('limit=40'))
})
