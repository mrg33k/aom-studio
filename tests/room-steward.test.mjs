import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classifyTurnHealth } from '../api/_lib/roomSteward.js'

const acceptedAt = '2026-08-08T18:00:00.000Z'
const now = new Date('2026-08-08T18:02:00.000Z').getTime()
const receipt = { message_id: 'm1', room_id: 'aom:agent:web', accepted_at: acceptedAt, repair_count: 0 }
const message = { id: 'm1', room_id: receipt.room_id, role: 'user', timestamp: acceptedAt }

test('an unclaimed persisted turn gets one narrow wake repair', () => {
  const health = classifyTurnHealth({ receipt, message, now })
  assert.equal(health.cause, 'unclaimed')
  assert.equal(health.repair, 'wake_exact_turn')
  const afterRepair = classifyTurnHealth({ receipt: { ...receipt, repair_count: 1 }, message, now })
  assert.equal(afterRepair.state, 'needs_attention')
  assert.equal(afterRepair.repair, null)
})

test('a visible final reply settles the exact turn', () => {
  const reply = { id: 'r1', room_id: receipt.room_id, role: 'assistant', reply_to: 'm1', timestamp: '2026-08-08T18:00:30.000Z' }
  const health = classifyTurnHealth({ receipt, message, roomMessages: [message, reply], now })
  assert.equal(health.state, 'settled')
  assert.equal(health.reply.id, 'r1')
})

test('an interim reply does not settle while exact work is still live', () => {
  const reply = { id: 'r1', room_id: receipt.room_id, role: 'assistant', reply_to: 'm1', timestamp: '2026-08-08T18:00:30.000Z' }
  const steps = [{ id: 's1', parent_message_id: 'm1', step_index: 2, text: 'Building', timestamp: '2026-08-08T18:01:58.000Z' }]
  const health = classifyTurnHealth({ receipt, message, roomMessages: [message, reply], steps, now })
  assert.equal(health.state, 'active')
})

test('a reply in another room stops without moving or rerunning data', () => {
  const reply = { id: 'r1', room_id: 'aom:agent:other', role: 'assistant', reply_to: 'm1', timestamp: '2026-08-08T18:00:30.000Z' }
  const health = classifyTurnHealth({ receipt, message, roomMessages: [message, reply], now })
  assert.equal(health.cause, 'reply_room_mismatch')
  assert.equal(health.repair, null)
})

test('only an expired exact local-runner lease is requeueable', () => {
  const runnerJob = { id: 'j1', status: 'running', updated_at: '2026-08-08T17:55:00.000Z', lease_expires_at: '2026-08-08T17:59:00.000Z' }
  const health = classifyTurnHealth({ receipt, message, runnerJob, now })
  assert.equal(health.cause, 'expired_runner_lease')
  assert.equal(health.repair, 'requeue_expired_job')
})

test('a repaired turn gets a grace window before asking for attention', () => {
  const recovering = classifyTurnHealth({
    receipt: { ...receipt, repair_count: 1, last_repair_at: '2026-08-08T18:01:50.000Z' },
    message,
    now,
  })
  assert.equal(recovering.state, 'recovering')
  assert.equal(recovering.repair, null)

  const exhausted = classifyTurnHealth({
    receipt: { ...receipt, repair_count: 1, last_repair_at: '2026-08-08T18:01:00.000Z' },
    message,
    now,
  })
  assert.equal(exhausted.state, 'needs_attention')
  assert.equal(exhausted.repair, null)
})

test('stale room status clears only after a successful no-live-process check', () => {
  const reply = { id: 'r1', room_id: receipt.room_id, role: 'assistant', reply_to: 'm1', timestamp: '2026-08-08T18:00:30.000Z' }
  const agentStatus = { status: 'working', updated_at: '2026-08-08T17:50:00.000Z' }
  const unknown = classifyTurnHealth({ receipt, message, roomMessages: [reply], agentStatus, now })
  assert.equal(unknown.repair, null)
  const provenClear = classifyTurnHealth({ receipt, message, roomMessages: [reply], agentStatus, processEvidenceAvailable: true, now })
  assert.equal(provenClear.repair, 'clear_stale_status')
  const live = classifyTurnHealth({ receipt, message, roomMessages: [reply], agentStatus, processEvidenceAvailable: true, agentLiveProcess: { agent: 'web' }, now })
  assert.equal(live.repair, null)
})

test('the steward never calls the tenant-wide unstuck endpoint', () => {
  const helper = readFileSync(new URL('../api/_lib/roomSteward.js', import.meta.url), 'utf8')
  const cron = readFileSync(new URL('../api/cron/room-steward.js', import.meta.url), 'utf8')
  assert.doesNotMatch(`${helper}\n${cron}`, /dashboard\/unstuck|status=eq\.active.*status.*done/s)
  assert.match(helper, /message_id=eq\.\$\{encodeURIComponent\(receipt\.message_id\)\}/)
  assert.match(helper, /reply_to=eq\.\$\{encodeURIComponent\(receipt\.message_id\)\}/)
  assert.match(helper, /task_id=eq\.\$\{encodeURIComponent\(receipt\.message_id\)\}/)
})

test('chat writes create a receipt and the UI preserves failed drafts', () => {
  const endpoint = readFileSync(new URL('../api/dashboard/supabase-messages.js', import.meta.url), 'utf8')
  const roomThread = readFileSync(new URL('../src/dashboard/cv6next/data/useRoomThread.js', import.meta.url), 'utf8')
  const corner = readFileSync(new URL('../src/dashboard/cv6next/CornerCV6.jsx', import.meta.url), 'utf8')
  assert.match(endpoint, /createTurnReceipt/)
  assert.match(roomThread, /api\/dashboard\/room-health/)
  assert.match(corner, /if \(ok !== false\) setDraft\(''\)/)
})
