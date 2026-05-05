// LR-3 acceptance gate: multi-project + mission scaffolding via one call.
//
// Two modes:
//
//   1. Live mode (preferred). Set LR3_API_URL + LR3_JWT, optionally LR3_TENANT.
//      Hits the real endpoint, writes 3 project boxes + 3 mission boxes,
//      reads back via supabase REST, asserts the user descriptions land in
//      VISION.md / CONTEXT.md, then cleans up.
//
//        LR3_API_URL=https://aheadofmarket.com \
//        LR3_JWT=<supabase-access-token> \
//        LR3_TENANT=aom \
//        node tests/lr3-multi-project.test.mjs
//
//   2. Offline mode (no env). Imports the handler directly, drives it with
//      a fake req/res that intercepts the Supabase REST calls. Asserts
//      orchestration: 3 items → 6 project upserts × 3 + 6 mission upserts × 3
//      = 36 stub writes, plus 3 projects-row inserts, plus the mission slug
//      defaults applied per item. No network, no env, runs in CI.

import assert from 'node:assert/strict'

const SCAFFOLD_EVENT_TYPE = 'scaffold_file'

const BATCH_PAYLOAD = {
  workspace_name: 'LR-3 Test Studio',
  items: [
    {
      name: 'Video production',
      description: 'Long-form research videos and brand films for AOM clients.',
      mission: { name: 'Q4 reel', description: 'Edit + publish 3 clips by EOQ.' },
    },
    {
      name: 'Sales outreach',
      description: 'Cold to warm pipeline for AOM consulting work.',
    },
    {
      name: 'Recipe SaaS',
      description: 'Side project: recipe planner with shopping-list export.',
    },
  ],
}

// ─── Live mode ──────────────────────────────────────────────────────────────

async function runLive() {
  const apiUrl = process.env.LR3_API_URL
  const jwt = process.env.LR3_JWT
  const tenant = (process.env.LR3_TENANT || 'aom').trim().toLowerCase()
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log(`[lr3] live mode: POST ${apiUrl}/api/dashboard/ea-scaffold-batch (tenant=${tenant})`)

  const res = await fetch(`${apiUrl}/api/dashboard/ea-scaffold-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ tenant, ...BATCH_PAYLOAD }),
  })
  assert.equal(res.status, 200, `endpoint must respond 200, got ${res.status}`)
  const body = await res.json()
  assert.equal(body.ok, true, `batch must succeed; got ${JSON.stringify(body)}`)
  assert.equal(body.count, 3, 'count must be 3')
  assert.equal(body.results.length, 3, 'must return one result per item')

  for (const r of body.results) {
    assert.equal(r.ok, true, `every item must succeed: ${JSON.stringify(r)}`)
    assert.equal(r.project_files, 6, `${r.slug} must have 6 project stubs`)
    assert.equal(r.mission_files, 6, `${r.slug} must have 6 mission stubs`)
    assert.ok(r.mission_slug, `${r.slug} must scaffold a mission`)
  }

  // Verify description landed in stubs (only meaningful if Supabase env is also present).
  if (supabaseUrl && supabaseKey) {
    for (let i = 0; i < BATCH_PAYLOAD.items.length; i += 1) {
      const item = BATCH_PAYLOAD.items[i]
      const slug = body.results[i].slug
      const url =
        `${supabaseUrl}/rest/v1/events?event_type=eq.${SCAFFOLD_EVENT_TYPE}` +
        `&agent=eq.${encodeURIComponent(slug)}` +
        `&payload->>filename=eq.VISION.md&select=payload&limit=1`
      const r = await fetch(url, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      })
      assert.equal(r.ok, true, `events lookup for ${slug} must succeed`)
      const rows = await r.json()
      assert.ok(rows[0]?.payload?.content?.includes(item.description), `${slug} VISION.md must contain user's description`)
    }

    // Cleanup: delete every events row whose agent matches a created project or mission path.
    const slugs = body.results.map(r => r.slug)
    const missionAgents = body.results.map(r => `${r.slug}:${r.mission_slug}`)
    const toDelete = [...slugs, ...missionAgents]
    const inFilter = `(${toDelete.map(s => `"${s}"`).join(',')})`
    const delUrl = `${supabaseUrl}/rest/v1/events?event_type=eq.${SCAFFOLD_EVENT_TYPE}&agent=in.${encodeURIComponent(inFilter)}`
    await fetch(delUrl, {
      method: 'DELETE',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    const projectsDelUrl = `${supabaseUrl}/rest/v1/projects?slug=in.${encodeURIComponent(`(${slugs.map(s => `"${s}"`).join(',')})`)}&client_id=eq.${tenant}`
    await fetch(projectsDelUrl, {
      method: 'DELETE',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    console.log(`[lr3] cleanup: deleted ${toDelete.length} agent paths from events + ${slugs.length} project rows`)
  }

  console.log('[lr3] live mode: PASS')
}

// ─── Offline mode (handler dry-run) ─────────────────────────────────────────

async function runOffline() {
  console.log('[lr3] offline mode: importing handler with fake fetch + env')

  // Fake env so the handler doesn't bail on the missing-config check.
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://fake.supabase.local'
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-service-role'

  // Capture every fetch the handler issues so we can audit the orchestration.
  const captured = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    captured.push({ url: String(url), method: (opts.method || 'GET').toUpperCase(), body: opts.body || null })
    const u = String(url)

    // verifyTenant calls /auth/v1/user (jwt → user) and /rest/v1/rpc/is_world_admin_for_tenant.
    if (u.endsWith('/auth/v1/user')) {
      return new Response(
        JSON.stringify({ id: 'fake-user-id', user_metadata: { world: 'aom' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (u.includes('/rest/v1/rpc/is_world_admin_for_tenant')) {
      return new Response('false', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    // Lookup query for upsert -> empty array means "insert new"
    if (u.includes('/rest/v1/events?') && opts.method === undefined) {
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    // events insert/update -> echo back representation
    if (u.includes('/rest/v1/events') && (opts.method === 'POST' || opts.method === 'PATCH')) {
      const echo = opts.body ? [JSON.parse(opts.body)] : [{}]
      return new Response(JSON.stringify(echo), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    // projects-table insert -> echo
    if (u.includes('/rest/v1/projects') && opts.method === 'POST') {
      return new Response(JSON.stringify([{ slug: 'echo' }]), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    // Fall-through -> empty array
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  let mod
  try {
    mod = await import('../api/dashboard/ea-scaffold-batch.js')
  } catch (err) {
    globalThis.fetch = origFetch
    throw err
  }
  const handler = mod.default

  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer fake-jwt' },
    body: { tenant: 'aom', ...BATCH_PAYLOAD },
  }
  const resState = { status: 0, body: null, headers: {} }
  const res = {
    setHeader(k, v) { resState.headers[k] = v },
    status(code) { resState.status = code; return this },
    json(obj) { resState.body = obj; return this },
    end() { return this },
  }

  try {
    await handler(req, res)
  } finally {
    globalThis.fetch = origFetch
  }

  assert.equal(resState.status, 200, `handler must return 200, got ${resState.status}`)
  assert.ok(resState.body, 'handler must produce a JSON body')
  assert.equal(resState.body.ok, true, 'all items must succeed in the dry-run')
  assert.equal(resState.body.count, 3, 'count must be 3')
  assert.equal(resState.body.results.length, 3, 'must return three results')

  for (let i = 0; i < BATCH_PAYLOAD.items.length; i += 1) {
    const r = resState.body.results[i]
    assert.equal(r.ok, true, `result ${i} must succeed: ${JSON.stringify(r)}`)
    assert.equal(r.project_files, 6, `result ${i} must scaffold 6 project files`)
    assert.equal(r.mission_files, 6, `result ${i} must scaffold 6 mission files`)
    assert.ok(r.mission_slug, `result ${i} must produce a mission slug`)
  }

  // Item 0 explicitly named the mission "Q4 reel" → slug q4-reel.
  // Items 1 & 2 didn't, → default "first-brief".
  assert.equal(resState.body.results[0].mission_slug, 'q4-reel')
  assert.equal(resState.body.results[1].mission_slug, 'first-brief')
  assert.equal(resState.body.results[2].mission_slug, 'first-brief')

  // Slug derivation:
  assert.equal(resState.body.results[0].slug, 'video-production')
  assert.equal(resState.body.results[1].slug, 'sales-outreach')
  assert.equal(resState.body.results[2].slug, 'recipe-saas')

  // Orchestration audit: per project we expect
  //   1 lookup + 1 insert per stub * 6 stubs = 12 events calls per project box
  //   + same for mission box = another 12
  //   + 1 projects-row INSERT per project
  // Plus the one /auth/v1/user call from verifyTenant up front.
  // Total minimum: 1 (auth) + 3*(1 projects + 24 events) = 1 + 3*25 = 76.
  const eventsLookups = captured.filter(c => c.url.includes('/rest/v1/events?') && c.method === 'GET').length
  const eventsWrites = captured.filter(c => c.url.includes('/rest/v1/events') && (c.method === 'POST' || c.method === 'PATCH')).length
  const projectInserts = captured.filter(c => c.url.includes('/rest/v1/projects') && c.method === 'POST').length

  assert.equal(eventsLookups, 36, `expected 36 events lookups (12 per item × 3), got ${eventsLookups}`)
  assert.equal(eventsWrites, 36, `expected 36 events writes (12 per item × 3), got ${eventsWrites}`)
  assert.equal(projectInserts, 3, `expected 3 projects-table inserts, got ${projectInserts}`)

  // Spot check: the user's description from item 0 must appear in the captured
  // VISION.md write payload.
  const visionWrite = captured.find(c => c.method === 'POST' && c.url.includes('/rest/v1/events') && c.body && c.body.includes('"agent":"video-production"') && c.body.includes('VISION.md'))
  assert.ok(visionWrite, 'must write VISION.md for video-production')
  assert.ok(visionWrite.body.includes(BATCH_PAYLOAD.items[0].description), 'VISION.md must include the user-supplied description verbatim')

  // The mission scaffold must have the colon-joined agent path.
  const missionWrite = captured.find(c => c.method === 'POST' && c.url.includes('/rest/v1/events') && c.body && c.body.includes('"agent":"video-production:q4-reel"'))
  assert.ok(missionWrite, 'must write mission stubs under colon-joined agent path video-production:q4-reel')

  console.log('[lr3] offline mode: PASS — 3 projects + 3 missions, 36 events lookups, 36 events writes, 3 projects rows.')
}

// ─── Main ───────────────────────────────────────────────────────────────────

const live = process.env.LR3_API_URL && process.env.LR3_JWT
try {
  if (live) {
    await runLive()
  } else {
    await runOffline()
  }
} catch (err) {
  console.error('[lr3] FAIL:', err?.message || err)
  process.exit(1)
}
