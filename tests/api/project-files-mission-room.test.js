// Regression guard — 2026-07-18, Patrik: "Outreaches files that appeared 20
// mins ago are missing now." Root cause: top-level mission rooms
// (corner/users/<world>/missions/<slug> — no projects row) 404'd out of
// /api/dashboard/project-files ("Project not found"), so the room's Files
// panel had NO durable library arm; files only showed while their share rows
// sat inside the chat feed's last-40 message window, and 20 harness rows later
// they "vanished". These tests pin the fallback: a top-level mission home
// resolves (rag arm and local-disk arm), is tenant-gated, and unknown slugs
// still 404.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Env BEFORE import — both project-files.js and verifyTenant.js read at module scope.
process.env.SUPABASE_URL = 'https://stub.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-key'
process.env.RAG_TUNNEL_URL = 'https://rag.stub.test'

// Fake AOM-EA tree with a top-level mission home holding a deliverable —
// the exact outreach shape (deliverables/AOM-Sales-Bible.pdf on disk).
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aom-ea-'))
fs.mkdirSync(path.join(tmpRoot, 'corner', 'users', 'aom', 'missions', 'outreach', 'deliverables'), { recursive: true })
fs.writeFileSync(path.join(tmpRoot, 'corner', 'users', 'aom', 'missions', 'outreach', 'VISION.md'), '# outreach')
fs.writeFileSync(path.join(tmpRoot, 'corner', 'users', 'aom', 'missions', 'outreach', 'deliverables', 'AOM-Sales-Bible.pdf'), 'pdf-bytes')
process.env.AOM_EA_ROOT = tmpRoot

const { default: handler } = await import('../../api/dashboard/project-files.js')

// Switchable fetch stub. `ragMode`: 'down' (network error), 'empty' (200, no
// world — unfixed rag), 'mission' (200 with world+files — fixed rag).
// `callerWorld` drives the JWT identity verifyTenant sees.
const state = { ragMode: 'down', callerWorld: 'aom' }
globalThis.fetch = async (url) => {
  const u = String(url)
  if (u.includes('/rest/v1/projects')) return { ok: true, json: async () => [] } // no projects row
  if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'user-1', user_metadata: { world: state.callerWorld } }) }
  if (u.includes('/rest/v1/rpc/is_world_admin_for_tenant')) return { ok: true, json: async () => false }
  if (u.includes('/project-files-walk')) {
    if (state.ragMode === 'down') throw new Error('tunnel down')
    if (state.ragMode === 'empty') return { ok: true, json: async () => ({ project: 'outreach', files: [], missions: [], truncated: false, truncated_dirs: [] }) }
    return {
      ok: true,
      json: async () => ({
        project: 'outreach', world: 'aom', room_kind: 'mission',
        files: [{ kind: 'deliverable', name: 'AOM-Sales-Bible.pdf', path: 'corner/users/aom/missions/outreach/deliverables/AOM-Sales-Bible.pdf', last_modified: '2026-07-18T18:00:00Z' }],
        missions: [], truncated: false, truncated_dirs: [],
      }),
    }
  }
  throw new Error(`unexpected fetch in test: ${u}`)
}

function run(slug) {
  const req = { method: 'GET', query: { slug }, headers: { authorization: 'Bearer test-jwt' } }
  const res = {
    statusCode: null, payload: null,
    setHeader() {}, status(c) { this.statusCode = c; return this }, json(p) { this.payload = p; return this }, end() { return this },
  }
  return handler(req, res).then(() => res)
}

test('top-level mission room resolves via the rag arm (prod path)', async () => {
  state.ragMode = 'mission'; state.callerWorld = 'aom'
  const res = await run('outreach')
  assert.equal(res.statusCode, 200, JSON.stringify(res.payload))
  assert.equal(res.payload.world, 'aom')
  assert.equal(res.payload.room_kind, 'mission')
  assert.ok(res.payload.files.some((f) => f.name === 'AOM-Sales-Bible.pdf'),
    'mission deliverable must be in the library walk')
})

test('top-level mission room resolves via the local-disk arm when the tunnel is down', async () => {
  state.ragMode = 'down'; state.callerWorld = 'aom'
  const res = await run('outreach')
  assert.equal(res.statusCode, 200, JSON.stringify(res.payload))
  assert.equal(res.payload.world, 'aom')
  assert.equal(res.payload.room_kind, 'mission')
  const names = res.payload.files.map((f) => f.name)
  assert.ok(names.includes('VISION.md'), `canon missing: ${names}`)
  assert.ok(names.includes('AOM-Sales-Bible.pdf'), `deliverable missing: ${names}`)
})

test('unfixed rag (200 without world) still falls through to local disk, not 404', async () => {
  state.ragMode = 'empty'; state.callerWorld = 'aom'
  const res = await run('outreach')
  assert.equal(res.statusCode, 200, JSON.stringify(res.payload))
  assert.ok(res.payload.files.some((f) => f.name === 'AOM-Sales-Bible.pdf'))
})

test('mission fallback is tenant-gated: wrong-world caller gets 403, no data', async () => {
  state.ragMode = 'mission'; state.callerWorld = 'ben'
  const res = await run('outreach')
  assert.equal(res.statusCode, 403, JSON.stringify(res.payload))
  assert.ok(!res.payload.files, 'no file data may leak on a denial')
})

test('unknown slug still 404s', async () => {
  state.ragMode = 'down'; state.callerWorld = 'aom'
  const res = await run('no-such-room-anywhere')
  assert.equal(res.statusCode, 404)
})
