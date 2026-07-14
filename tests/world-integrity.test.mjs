import assert from 'node:assert/strict'

process.env.SUPABASE_URL = 'http://fake.supabase.local'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role'
process.env.SUPER_ADMIN_USER_ID = 'admin-user'

const ADMIN_WORLD = {
  id: 'aom-world-id',
  name: 'AOM',
  slug: 'aom',
  client_id: 'admin-user',
  status: 'active',
  config: {},
}
const KAREN_WORLD = {
  id: 'karen-world-id',
  name: "Karen's World",
  slug: 'karens-world',
  client_id: 'karen-user',
  status: 'active',
  config: {},
}
const QA_WORLD = {
  id: 'qa-world-id',
  name: 'QA',
  slug: 'qa',
  client_id: 'admin-user',
  status: 'active',
  config: {},
}

const usersByToken = {
  'jwt-admin': { id: 'admin-user', user_metadata: { world: 'aom' } },
  'jwt-karen': { id: 'karen-user', user_metadata: { world: 'karens-world' } },
}

const originalFetch = globalThis.fetch
const captured = []

globalThis.fetch = async (url, options = {}) => {
  const href = String(url)
  captured.push({ href, options })

  if (href.endsWith('/auth/v1/user')) {
    const token = String(options.headers?.Authorization || '').replace('Bearer ', '')
    const user = usersByToken[token]
    return user
      ? Response.json(user)
      : Response.json({ error: 'invalid token' }, { status: 401 })
  }

  if (href.includes('/rest/v1/world_members?user_id=eq.karen-user') && href.includes('select=world_id,role')) {
    return Response.json([{ world_id: KAREN_WORLD.id, role: 'owner' }])
  }
  if (href.includes('/rest/v1/world_members?world_id=eq.karen-world-id') && href.includes('user_id=eq.karen-user')) {
    return Response.json([{ role: 'owner' }])
  }
  if (href.includes('/rest/v1/world_members?world_id=eq.qa-world-id') && href.includes('user_id=eq.karen-user')) {
    return Response.json([])
  }
  if (href.includes('/rest/v1/worlds?status=eq.active&id=in.(karen-world-id)')) {
    return Response.json([KAREN_WORLD])
  }
  if (href.includes('/rest/v1/worlds?status=eq.active&select=')) {
    return Response.json([ADMIN_WORLD, KAREN_WORLD, QA_WORLD])
  }
  if (href.includes('/rest/v1/worlds?slug=eq.karens-world')) {
    return Response.json([KAREN_WORLD])
  }
  if (href.includes('/rest/v1/worlds?slug=eq.qa')) {
    return Response.json([QA_WORLD])
  }
  if (href.includes('/rest/v1/agent_status?client_id=eq.karens-world')) {
    return Response.json([{ agent_slug: 'ea', agent_name: 'Karen EA', status: 'idle' }])
  }
  if (href.includes('/rest/v1/worlds?slug=eq.new-client')) {
    return Response.json([])
  }
  if (href.endsWith('/auth/v1/admin/users') && options.method === 'POST') {
    return Response.json({ id: 'new-client-user' })
  }
  if (href.endsWith('/rest/v1/worlds') && options.method === 'POST') {
    return Response.json([{ id: 'new-client-world', slug: 'new-client' }], { status: 201 })
  }
  if (href.endsWith('/rest/v1/world_members') && options.method === 'POST') {
    return new Response('', { status: 201 })
  }
  if ((href.endsWith('/rest/v1/agent_status') || href.endsWith('/rest/v1/messages')) && options.method === 'POST') {
    return new Response('', { status: 201 })
  }

  return Response.json([])
}

function request({ method = 'GET', token, query = {}, body = {}, cookie = '' } = {}) {
  return {
    method,
    query,
    body,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { cookie } : {}),
    },
  }
}

function response() {
  const state = { status: null, body: null, headers: {} }
  return {
    state,
    setHeader(name, value) { state.headers[name] = value },
    status(code) { state.status = code; return this },
    json(body) { state.body = body; return this },
    end() { return this },
  }
}

try {
  const [
    { default: listWorlds },
    { default: getWorld },
    { default: switchWorld },
    { default: createWorld },
    { default: legacyWorldAdmin },
  ] = await Promise.all([
    import('../api/worlds/index.js'),
    import('../api/worlds/[slug].js'),
    import('../api/worlds/[slug]/switch.js'),
    import('../api/dashboard/create-world.js'),
    import('../api/dashboard/worlds.js'),
  ])

  {
    const res = response()
    await listWorlds(request({ query: { user_id: 'admin-user' } }), res)
    assert.equal(res.state.status, 401, 'caller-supplied admin ID must not bypass authentication')
  }

  {
    const res = response()
    await listWorlds(request({
      token: 'jwt-karen',
      query: { user_id: 'admin-user' },
      cookie: 'active_world=aom',
    }), res)
    assert.equal(res.state.status, 200)
    assert.deepEqual(res.state.body.worlds.map(world => world.slug), ['karens-world'])
    assert.equal(res.state.body.worlds[0].role, 'owner')
    assert.equal(res.state.body.is_super_admin, false)
    assert.equal(res.state.body.active_world, 'karens-world', 'stale cross-world cookie must be ignored')
  }

  {
    const res = response()
    await listWorlds(request({ token: 'jwt-admin' }), res)
    assert.equal(res.state.status, 200)
    assert.deepEqual(res.state.body.worlds.map(world => world.slug), ['aom', 'karens-world', 'qa'])
    assert.equal(res.state.body.is_super_admin, true)
  }

  {
    const res = response()
    await getWorld(request({ token: 'jwt-karen', query: { slug: 'karens-world' } }), res)
    assert.equal(res.state.status, 200)
    assert.equal(res.state.body.world.slug, 'karens-world')
    assert.deepEqual(res.state.body.agents.map(agent => agent.agent_slug), ['ea'])
    assert.ok(
      captured.some(call => call.href.includes('/agent_status?client_id=eq.karens-world')),
      'world data must use the stable slug rather than the owner UUID',
    )
  }

  {
    const res = response()
    await switchWorld(request({
      method: 'POST',
      token: 'jwt-karen',
      query: { slug: 'karens-world' },
      body: { user_id: 'admin-user' },
    }), res)
    assert.equal(res.state.status, 200)
    assert.equal(res.state.body.world, 'karens-world')
    assert.match(res.state.headers['Set-Cookie'], /^active_world=karens-world;/)
  }

  {
    const res = response()
    await switchWorld(request({
      method: 'POST',
      token: 'jwt-karen',
      query: { slug: 'qa' },
      body: { user_id: 'admin-user' },
    }), res)
    assert.equal(res.state.status, 403, 'spoofed admin ID must not allow switching into QA')
  }

  {
    const before = captured.filter(call => call.href.includes('/auth/v1/admin/users')).length
    const res = response()
    await createWorld(request({
      method: 'POST',
      token: 'jwt-karen',
      body: { name: 'Unauthorized World', email: 'nope@example.com' },
    }), res)
    const after = captured.filter(call => call.href.includes('/auth/v1/admin/users')).length
    assert.equal(res.state.status, 403)
    assert.equal(after, before, 'non-admin request must never reach the user-creation API')
  }

  {
    const res = response()
    await legacyWorldAdmin(request({ method: 'GET', query: { user_id: 'admin-user' } }), res)
    assert.equal(res.state.status, 401, 'legacy admin world inventory must require a real session')
  }

  {
    const res = response()
    await createWorld(request({
      method: 'POST',
      token: 'jwt-admin',
      body: { name: 'New Client', email: 'new@example.com', password: 'Temporary123!' },
    }), res)
    assert.equal(res.state.status, 200)
    assert.equal(res.state.body.world, 'new-client')

    const worldWrite = captured.find(call =>
      call.href.endsWith('/rest/v1/worlds') && call.options.method === 'POST'
    )
    const membershipWrite = captured.find(call =>
      call.href.endsWith('/rest/v1/world_members') && call.options.method === 'POST'
    )
    assert.deepEqual(JSON.parse(worldWrite.options.body), {
      name: 'New Client',
      slug: 'new-client',
      client_id: 'new-client-user',
      status: 'active',
      config: {},
    })
    assert.deepEqual(JSON.parse(membershipWrite.options.body), {
      world_id: 'new-client-world',
      user_id: 'new-client-user',
      role: 'owner',
      created_at: JSON.parse(membershipWrite.options.body).created_at,
    })
  }

  console.log('world-integrity: PASS')
} finally {
  globalThis.fetch = originalFetch
}
