// tenant-isolation.test.mjs (corner:tenant-isolation R1)
//
// Regression guard for the audit-confirmed cross-tenant leaks. Asserts that a
// NON-super user (Karen, world=karens-world) and an UNAUTHENTICATED caller are
// denied on every endpoint that was fixed, and — as a positive control — that
// the auth libs still ADMIT a user to their own world and the super-admin.
//
// Pure unit test: Supabase + auth are mocked via globalThis.fetch, same style
// as tests/world-integrity.test.mjs. No live network, no secrets, runs in CI.
//
//   node --test tests/tenant-isolation.test.mjs

import { test } from 'node:test'
import assert from 'node:assert/strict'

// Env must be set BEFORE importing the handlers (they read it at module load).
process.env.SUPABASE_URL = 'http://fake.supabase.local'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fake.supabase.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role'
process.env.SUPER_ADMIN_USER_ID = 'super-admin-uid'

// ---- Fixtures --------------------------------------------------------------
const KAREN_JWT = 'jwt-karen'      // non-super, world=karens-world
const ADMIN_JWT = 'jwt-admin'      // super-admin
const usersByToken = {
  [KAREN_JWT]: { id: 'karen-uid', email: 'karen@corner.aheadofmarket.com', user_metadata: { world: 'karens-world' } },
  [ADMIN_JWT]: { id: 'super-admin-uid', email: 'patrik@aom', user_metadata: { world: 'aom' } },
}

// Projects: space-rising is arsenal-held; 'aom' is aom-held; 'karens-world-main'
// is karens-world-held (positive control).
const projectsBySlug = {
  'space-rising': { id: 'sr-pid', client_id: 'arsenal' },
  'aom': { id: 'aom-pid', client_id: 'aom' },
  'karens-world-main': { id: 'kw-pid', client_id: 'karens-world' },
}

const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
  const href = String(url)
  const headers = options.headers || {}

  // Auth: resolve the bearer token to a user.
  if (href.endsWith('/auth/v1/user')) {
    const token = String(headers.Authorization || headers.authorization || '').replace(/^Bearer\s+/i, '')
    const user = usersByToken[token]
    return user
      ? Response.json(user)
      : Response.json({ error: 'invalid token' }, { status: 401 })
  }

  // Project lookup by slug (verifyProjectAccess -> lookupProjectBySlug).
  const projMatch = href.match(/\/rest\/v1\/projects\?slug=eq\.([^&]+)/)
  if (projMatch) {
    const slug = decodeURIComponent(projMatch[1])
    const row = projectsBySlug[slug]
    return Response.json(row ? [{ id: row.id, client_id: row.client_id }] : [])
  }

  // project_access grants — none in these tests (Karen holds no grants).
  if (href.includes('/rest/v1/project_access')) return Response.json([])

  // World-admin RPC — always false (Karen is not an admin of any other world).
  if (href.includes('/rest/v1/rpc/is_world_admin_for_tenant')) return Response.json(false)

  // Participation-floor message probes — no evidence.
  if (href.includes('/rest/v1/messages')) return Response.json([])

  // cm_state / anything else — empty.
  return Response.json([])
}

process.on('exit', () => { globalThis.fetch = originalFetch })

// ---- Mock req/res ----------------------------------------------------------
function mkReq({ method = 'GET', query = {}, body = {}, jwt = null } = {}) {
  const headers = {}
  if (jwt) headers.authorization = `Bearer ${jwt}`
  return { method, query, body, headers }
}
function mkRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    end() { return this },
  }
}
async function call(handler, reqOpts) {
  const req = mkReq(reqOpts)
  const res = mkRes()
  await handler(req, res)
  return res
}

// Import the fixed handlers + the auth libs.
const finance = (await import('../api/dashboard/finance.js')).default
const trackers = (await import('../api/dashboard/trackers.js')).default
const adminTickets = (await import('../api/dashboard/admin-tickets.js')).default
const missionsCreated = (await import('../api/dashboard/missions-created.js')).default
const docUpdates = (await import('../api/dashboard/doc-updates.js')).default
const supabaseStatus = (await import('../api/dashboard/supabase-status.js')).default
const { verifyTenant, verifyProjectAccess, requireSuperAdmin } = await import('../api/_lib/verifyTenant.js')

const denied = (code) => code === 401 || code === 403
const hasData = (res, key) => Array.isArray(res.body?.[key]) && res.body[key].length > 0

// ---------------------------------------------------------------------------
// NEGATIVE: a non-super user and an anonymous caller must NOT read other worlds.
// ---------------------------------------------------------------------------

test('finance: unauthenticated is denied', async () => {
  const res = await call(finance, { method: 'GET' })
  assert.ok(denied(res.statusCode), `expected 401/403, got ${res.statusCode}`)
  assert.ok(!hasData(res, 'transactions'))
})

test('finance: non-super (Karen) is denied', async () => {
  const res = await call(finance, { method: 'GET', jwt: KAREN_JWT })
  assert.equal(res.statusCode, 403)
  assert.ok(!hasData(res, 'transactions'))
})

test('trackers GET: unauthenticated is denied (and world required)', async () => {
  const noWorld = await call(trackers, { method: 'GET', query: {} })
  assert.equal(noWorld.statusCode, 400)
  const res = await call(trackers, { method: 'GET', query: { world: 'aom' } })
  assert.ok(denied(res.statusCode), `expected 401/403, got ${res.statusCode}`)
  assert.ok(!hasData(res, 'trackers'))
})

test('trackers GET: non-super (Karen) cannot read aom trackers', async () => {
  const res = await call(trackers, { method: 'GET', query: { world: 'aom' }, jwt: KAREN_JWT })
  assert.equal(res.statusCode, 403)
  assert.ok(!hasData(res, 'trackers'))
})

test('admin-tickets: unauthenticated is denied', async () => {
  const res = await call(adminTickets, { method: 'GET' })
  assert.ok(denied(res.statusCode), `expected 401/403, got ${res.statusCode}`)
  assert.ok(!hasData(res, 'tickets'))
})

test('admin-tickets: non-super (Karen) cannot read Space Rising tickets', async () => {
  const res = await call(adminTickets, { method: 'GET', jwt: KAREN_JWT })
  assert.equal(res.statusCode, 403)
  assert.ok(!hasData(res, 'tickets'))
})

test('missions-created: unauthenticated denied; project required', async () => {
  const noProj = await call(missionsCreated, { method: 'GET', query: {}, jwt: KAREN_JWT })
  assert.equal(noProj.statusCode, 400)
  const res = await call(missionsCreated, { method: 'GET', query: { project: 'aom' } })
  assert.ok(denied(res.statusCode), `expected 401/403, got ${res.statusCode}`)
  assert.ok(!hasData(res, 'missions'))
})

test('missions-created: non-super (Karen) cannot read aom missions', async () => {
  const res = await call(missionsCreated, { method: 'GET', query: { project: 'aom' }, jwt: KAREN_JWT })
  assert.equal(res.statusCode, 403)
  assert.ok(!hasData(res, 'missions'))
})

test('doc-updates: unauthenticated denied; project required', async () => {
  const noProj = await call(docUpdates, { method: 'GET', query: {}, jwt: KAREN_JWT })
  assert.equal(noProj.statusCode, 400)
  const res = await call(docUpdates, { method: 'GET', query: { project: 'aom' } })
  assert.ok(denied(res.statusCode), `expected 401/403, got ${res.statusCode}`)
  assert.ok(!hasData(res, 'updates'))
})

test('doc-updates: non-super (Karen) cannot read aom doc updates', async () => {
  const res = await call(docUpdates, { method: 'GET', query: { project: 'aom' }, jwt: KAREN_JWT })
  assert.equal(res.statusCode, 403)
  assert.ok(!hasData(res, 'updates'))
})

test('supabase-status: non-super (Karen) cannot request aom (needs-you pipe)', async () => {
  const res = await call(supabaseStatus, { method: 'GET', query: { client: 'aom' }, jwt: KAREN_JWT })
  assert.equal(res.statusCode, 403)
  assert.ok(!hasData(res, 'messages'))
})

// ---------------------------------------------------------------------------
// POSITIVE CONTROL: isolation must not be "deny everyone". Own-world + super
// still resolve. Asserted at the lib level (no data-table mocking needed).
// ---------------------------------------------------------------------------

test('own-world access still works (Karen -> karens-world)', async () => {
  const req = mkReq({ jwt: KAREN_JWT })
  const vt = await verifyTenant('karens-world', req)
  assert.equal(vt.ok, true)
  assert.equal(vt.isAdmin, false)
  const vp = await verifyProjectAccess('karens-world-main', req)
  assert.equal(vp.ok, true)
})

test('super-admin still reaches every world + finance', async () => {
  const req = mkReq({ jwt: ADMIN_JWT })
  const vt = await verifyTenant('karens-world', req) // super bypass
  assert.equal(vt.ok, true)
  assert.equal(vt.isAdmin, true)
  const su = await requireSuperAdmin(req)
  assert.equal(su.ok, true)
})

test('requireSuperAdmin rejects a non-super user', async () => {
  const req = mkReq({ jwt: KAREN_JWT })
  await assert.rejects(() => requireSuperAdmin(req), /super-admin only/)
})
