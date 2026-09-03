// Turn-health watchdog. Backs the 5-minute cron (/api/cron/room-steward),
// the room-health endpoint and the receipt hook in the chat write path.
//
// corner:retire-supabase R2 (2026-09-03). The Supabase room_turn_receipts,
// active_processes, agent_status and corner_runner_jobs tables are gone.
// Convex already models a turn: the `turns` table (roomId, messageId,
// agentSlug, status thinking | working | done | failed, steps, startedAt,
// completedAt) is created by the dispatcher for every human message and
// closed by the agent reply. So:
//
//   createTurnReceipt   is a no-op. The dispatcher opens the turn itself the
//                       moment messages:send lands; a second receipt would
//                       only disagree with it.
//   inspectTurnByMessage reads the turns for the message's room
//                       (turns:listTurns), classifies the one for this
//                       message, and with repair=true marks a turn that has
//                       sat in thinking/working past the stale window as
//                       failed (turns:updateTurnStatus) so the room stops
//                       showing a spinner for a worker that is gone.
//   runRoomSteward      sweeps turns:stale and applies the same repair.
//
// classifyTurnHealth keeps its export and its verdict shape for the callers
// that read `state`, `cause` and `repair`.

import { convexQuery, convexMutation } from './verifyTenant.js'

// A turn that has not finished in this long is treated as abandoned. Agent
// turns finish in seconds; a long build reports steps, and steps refresh the
// verdict, so ten minutes of pure silence is a dead worker, not a slow one.
const STALE_MS = 10 * 60 * 1000
// Under this age an unanswered turn is simply in progress.
const ACCEPTED_MS = 45_000

const ms = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

// Convex turn -> the receipt shape the verdict reads.
function receiptFromTurn(turn) {
  if (!turn) return null
  return {
    id: String(turn._id),
    message_id: turn.messageId ? String(turn.messageId) : null,
    room_id: String(turn.roomId),
    agent: turn.agentSlug,
    state: turn.status,
    accepted_at: new Date(ms(turn.startedAt)).toISOString(),
    completed_at: turn.completedAt ? new Date(ms(turn.completedAt)).toISOString() : null,
    steps: Array.isArray(turn.steps) ? turn.steps : [],
    triggered_by: turn.triggeredBy || null,
    repair_count: 0,
  }
}

export function classifyTurnHealth(args) {
  const verdict = classifyTurnHealthCore(args)
  const steps = args.steps || []
  const live = steps.length ? steps[steps.length - 1] : null
  verdict.phase = live && live.done === false ? 'working' : (verdict.state === 'settled' ? 'done' : null)
  if (verdict.state === 'needs_attention' && verdict.cause === 'settled_without_reply') {
    verdict.suggested_action = 'room_reset'
  }
  return verdict
}

function classifyTurnHealthCore({ receipt, turn = null, now = Date.now() }) {
  if (!receipt) return { state: 'unknown', cause: 'message_missing', repair: null, ageMs: 0 }
  const ageMs = Math.max(0, now - ms(receipt.accepted_at))
  const status = turn?.status || receipt.state
  if (status === 'done') {
    return { state: 'settled', cause: null, repair: null, ageMs }
  }
  if (status === 'failed') {
    return { state: 'needs_attention', cause: 'runner_failed', repair: null, ageMs }
  }
  // thinking or working
  const steps = receipt.steps || []
  const hasProgress = steps.some((s) => s && s.done)
  if (ageMs >= STALE_MS) {
    return { state: 'needs_attention', cause: hasProgress ? 'settled_without_reply' : 'agent_silent', repair: 'mark_failed', ageMs }
  }
  if (ageMs >= ACCEPTED_MS) {
    return { state: 'active', cause: null, repair: null, ageMs }
  }
  return { state: 'accepted', cause: null, repair: null, ageMs }
}

// The dispatcher opens the turn itself (messages:send -> ai:dispatchMessage
// -> beginAgentTurn). Nothing to write from here. Returns null, which every
// caller already treats as "no receipt".
export async function createTurnReceipt() {
  return null
}

async function turnsForMessage({ clientId, messageId }) {
  const message = String(messageId || '').trim()
  if (!message) return { room: null, turns: [] }
  // The message id is a Convex id; rooms:listRooms gives the room ids of the
  // world, and turns:listTurns needs one of them. Read the message first for
  // its room (messages:getMessage accepts a legacy room key, so the world's
  // rooms are tried until one owns the message).
  const rooms = await convexQuery('rooms:listRooms', { worldId: String(clientId), filter: 'all' }).catch(() => [])
  for (const room of Array.isArray(rooms) ? rooms : []) {
    const turns = await convexQuery('turns:listTurns', { roomId: String(room._id) }).catch(() => [])
    const mine = (Array.isArray(turns) ? turns : []).filter((t) => t.messageId && String(t.messageId) === message)
    if (mine.length) return { room, turns: mine }
  }
  return { room: null, turns: [] }
}

async function auditRepair(receipt, action, outcome) {
  try {
    await convexMutation('tasks:logEvent', {
      event: {
        event_type: 'room_turn_repair',
        agent: receipt.agent,
        payload: { message_id: receipt.message_id, room_id: receipt.room_id, action, outcome, source: 'room-steward' },
      },
    })
  } catch { /* audit is best effort */ }
}

// The one repair this steward may make: close a turn that will never finish.
export async function applyScopedRepair(receipt, health) {
  if (health.repair !== 'mark_failed' || !receipt?.id) return { repaired: false, receipt, health }
  try {
    const updated = await convexMutation('turns:updateTurnStatus', { turnId: receipt.id, status: 'failed' })
    await auditRepair(receipt, 'mark_failed', 'failed')
    const next = receiptFromTurn(updated) || { ...receipt, state: 'failed' }
    return { repaired: true, action: 'mark_failed', outcome: 'failed', receipt: next, health: { ...health, state: 'needs_attention', cause: 'runner_failed', repair: null } }
  } catch (err) {
    return { repaired: false, action: 'mark_failed', outcome: `error: ${String(err?.message || err)}`, receipt, health }
  }
}

export async function inspectTurnByMessage({ clientId, messageId, repair = false }) {
  const { turns } = await turnsForMessage({ clientId, messageId })
  if (!turns.length) return { found: false, state: 'unknown', repaired: false }
  // Several agents may have a turn on one message; the least healthy one is
  // the verdict, since that is the spinner the person is looking at.
  const rank = { needs_attention: 0, accepted: 1, active: 2, settled: 3 }
  let worst = null
  for (const turn of turns) {
    const receipt = receiptFromTurn(turn)
    const health = classifyTurnHealth({ receipt, turn })
    if (!worst || rank[health.state] < rank[worst.health.state]) worst = { receipt, health, turn }
  }
  const { receipt, health } = worst
  if (repair && health.repair) {
    const result = await applyScopedRepair(receipt, health)
    return { found: true, ...result, state: result.health?.state || health.state, cause: result.health?.cause ?? health.cause, evidence: { age_ms: health.ageMs, turns: turns.length } }
  }
  return { found: true, repaired: false, receipt, health, state: health.state, cause: health.cause, evidence: { age_ms: health.ageMs, turns: turns.length } }
}

export async function runRoomSteward({ limit = 50 } = {}) {
  const stale = await convexQuery('turns:stale', { olderThanMs: STALE_MS, limit: Math.max(1, Math.min(100, limit)) })
  const summary = { checked: 0, repaired: 0, healthy: 0, attention: 0, errors: 0 }
  for (const turn of Array.isArray(stale) ? stale : []) {
    try {
      const receipt = receiptFromTurn(turn)
      const health = classifyTurnHealth({ receipt, turn })
      summary.checked += 1
      if (health.repair) {
        const result = await applyScopedRepair(receipt, health)
        if (result.repaired) summary.repaired += 1
      }
      if (health.state === 'settled') summary.healthy += 1
      if (health.state === 'needs_attention') summary.attention += 1
    } catch {
      summary.errors += 1
    }
  }
  return summary
}
