// R-SMOOTHNESS Round E — one status vocabulary for the open room.
// Behavioral: every input combination yields exactly one defined status, and
// the honesty rules hold. Plus wiring assertions: every surface derives from
// the same module (pill and step card can never disagree).
import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { deriveRoomStatus, ROOM_STATUS_LABEL, ROOM_STATUS_TONE } from '../src/dashboard/cv6next/data/roomStatus.js'

const VALUES = ['thinking', 'working', 'streaming', 'stopping', 'needs_you', 'stuck', 'idle']

test('every combination yields exactly one known status', () => {
  const bools = [true, false]
  const healths = [null, { state: 'needs_attention', cause: 'agent_silent' }, { state: 'needs_attention', cause: 'runner_failed' }, { state: 'stopping' }, { state: 'accepted' }]
  const feeds = [{ feed: 'live' }, { feed: 'stale' }, null]
  for (const awaiting of bools) for (const hasSteps of bools) for (const hasDraft of bools)
    for (const turnHealth of healths) for (const connection of feeds) {
      const k = deriveRoomStatus({ awaiting, liveSteps: hasSteps ? [{}] : [], draft: hasDraft ? { streaming: true } : null, turnHealth, connection })
      assert.ok(VALUES.includes(k), `unknown status ${k}`)
      assert.ok(typeof ROOM_STATUS_LABEL[k] === 'string', `label for ${k}`)
      assert.ok(typeof ROOM_STATUS_TONE[k] === 'string', `tone for ${k}`)
    }
})

test('honesty rules', () => {
  // stopping wins over everything else
  assert.equal(deriveRoomStatus({ awaiting: true, draft: { streaming: true }, turnHealth: { state: 'stopping' } }), 'stopping')
  // hard causes are stuck, recoverable ones are needs_you
  assert.equal(deriveRoomStatus({ turnHealth: { state: 'needs_attention', cause: 'runner_failed' } }), 'stuck')
  assert.equal(deriveRoomStatus({ turnHealth: { state: 'needs_attention', cause: 'agent_silent' } }), 'needs_you')
  // a live turn on a stale feed is stuck, an idle room on a stale feed is not
  assert.equal(deriveRoomStatus({ awaiting: true, connection: { feed: 'stale' } }), 'stuck')
  assert.equal(deriveRoomStatus({ awaiting: false, connection: { feed: 'stale' } }), 'idle')
  // draft beats steps beats bare awaiting
  assert.equal(deriveRoomStatus({ awaiting: true, draft: { streaming: true }, liveSteps: [{}] }), 'streaming')
  assert.equal(deriveRoomStatus({ awaiting: true, liveSteps: [{}] }), 'working')
  assert.equal(deriveRoomStatus({ awaiting: true }), 'thinking')
  assert.equal(deriveRoomStatus({}), 'idle')
})

test('both surfaces and the step card wire the same vocabulary + stop + restart', () => {
  const desktop = readFileSync(new URL('../src/dashboard/cv6next/ChatDesktop.jsx', import.meta.url), 'utf8')
  const lifecycle = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8')
  const worklist = readFileSync(new URL('../src/dashboard/cv6next/RoomWorkList.jsx', import.meta.url), 'utf8')
  const recovery = readFileSync(new URL('../src/dashboard/cv6next/RoomRecoveryNotice.jsx', import.meta.url), 'utf8')
  const engine = readFileSync(new URL('../src/dashboard/cv6next/data/useRoomThread.js', import.meta.url), 'utf8')
  for (const src of [desktop, lifecycle]) {
    assert.match(src, /deriveRoomStatus\(/)
    assert.match(src, /ROOM_STATUS_LABEL\[/)
  }
  assert.match(worklist, /cv6-sc-stop/)
  assert.match(worklist, /Stopping…/)
  assert.match(recovery, /Restart this turn/)
  // the engine never fakes a settled turn on stop: awaiting untouched in stopTurn
  const stopBody = engine.slice(engine.indexOf('async stopTurn()'), engine.indexOf('// The old reloadKey bump'))
  assert.ok(!/awaiting: false/.test(stopBody), 'stopTurn must not locally settle the turn')
  assert.match(stopBody, /feature_off/)
})
