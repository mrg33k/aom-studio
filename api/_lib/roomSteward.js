import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const headers = (prefer = '') => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...(prefer ? { Prefer: prefer } : {}),
})

async function db(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(options.prefer), ...(options.headers || {}) },
  })
  if (!response.ok) throw new Error(`room steward database ${response.status}: ${(await response.text()).slice(0, 240)}`)
  if (response.status === 204) return null
  return response.json().catch(() => null)
}

const ms = (value) => {
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export function classifyTurnHealth({ receipt, message, roomMessages = [], steps = [], runnerJob = null, activeProcess = null, agentLiveProcess = null, processEvidenceAvailable = false, agentStatus = null, now = Date.now() }) {
  const ageMs = Math.max(0, now - ms(receipt?.accepted_at))
  const sinceRepairMs = receipt?.last_repair_at ? Math.max(0, now - ms(receipt.last_repair_at)) : null
  if (!message) return { state: 'needs_attention', cause: 'message_missing', repair: null, ageMs }

  const later = roomMessages
    .filter((row) => ms(row.timestamp) >= ms(receipt.accepted_at) && row.id !== receipt.message_id)
    .sort((a, b) => ms(a.timestamp) - ms(b.timestamp))
  const exactReply = later.find((row) => row.reply_to === receipt.message_id && row.role !== 'user')
  const beforeNextUser = []
  for (const row of later) {
    if (row.role === 'user' || row.user_id || row.user_name) break
    beforeNextUser.push(row)
  }
  const reply = exactReply || beforeNextUser.find((row) => row.role === 'assistant') || null
  const replyVisible = !!reply && reply.room_id === receipt.room_id
  const settledStep = steps.find((step) => Number(step.step_index) === 9999 || step.text === 'settled') || null
  const liveStep = steps.filter((step) => !settledStep || step.id !== settledStep.id).sort((a, b) => ms(b.timestamp) - ms(a.timestamp))[0] || null
  const runnerState = runnerJob?.status || null
  const runnerActive = ['claimed', 'running'].includes(runnerState)
  const runnerFinished = ['completed', 'failed', 'cancelled'].includes(runnerState)
  const heartbeatAt = liveStep?.timestamp || activeProcess?.heartbeat || runnerJob?.updated_at || null
  const heartbeatStale = heartbeatAt && now - ms(heartbeatAt) > 180000
  const staleStatus = agentStatus && ['working', 'stuck', 'active'].includes(agentStatus.status)
    && now - ms(agentStatus.updated_at) > 300000 && processEvidenceAvailable
    && !agentLiveProcess && !activeProcess && !runnerActive && !liveStep

  if (reply && !replyVisible) {
    return { state: 'needs_attention', cause: 'reply_room_mismatch', repair: null, ageMs, reply, settledStep, staleStatus }
  }
  if (replyVisible && (runnerActive || liveStep || activeProcess) && !settledStep && runnerState !== 'completed') {
    return { state: 'active', cause: null, repair: staleStatus ? 'clear_stale_status' : null, ageMs, reply, heartbeatAt, runnerJob, liveStep, staleStatus }
  }
  if (replyVisible) {
    return { state: 'settled', cause: null, repair: staleStatus ? 'clear_stale_status' : null, ageMs, reply, settledStep, staleStatus }
  }
  if (settledStep || runnerState === 'completed') {
    return { state: 'needs_attention', cause: 'settled_without_reply', repair: null, ageMs, settledStep, staleStatus }
  }
  if (['failed', 'cancelled'].includes(runnerState)) {
    return { state: 'needs_attention', cause: 'runner_failed', repair: null, ageMs, runnerJob, staleStatus }
  }
  if ((runnerActive || liveStep || activeProcess) && !heartbeatStale) {
    return { state: 'active', cause: null, repair: staleStatus ? 'clear_stale_status' : null, ageMs, heartbeatAt, runnerJob, liveStep, staleStatus }
  }
  if (runnerActive && heartbeatStale && runnerJob?.lease_expires_at && ms(runnerJob.lease_expires_at) < now) {
    return { state: 'needs_attention', cause: 'expired_runner_lease', repair: 'requeue_expired_job', ageMs, heartbeatAt, runnerJob, staleStatus }
  }
  if (ageMs >= 45000) {
    if (Number(receipt.repair_count || 0) > 0 && sinceRepairMs !== null && sinceRepairMs < 45000) {
      return { state: 'recovering', cause: 'unclaimed', repair: null, ageMs, staleStatus }
    }
    return {
      state: receipt.repair_count > 0 ? 'needs_attention' : 'accepted',
      cause: 'unclaimed',
      repair: receipt.repair_count > 0 ? null : 'wake_exact_turn',
      ageMs,
      staleStatus,
    }
  }
  return { state: 'accepted', cause: null, repair: null, ageMs, staleStatus }
}

export async function createTurnReceipt({ message, userId = null, route = 'central', jobId = null }) {
  if (!message?.id || !message?.client_id || !message?.room_id || !message?.agent) return null
  const rows = await db('room_turn_receipts?on_conflict=message_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({
      message_id: message.id,
      client_id: message.client_id,
      room_id: message.room_id,
      agent: message.agent,
      user_id: userId,
      route: route === 'local' ? 'local' : 'central',
      job_id: jobId,
      state: 'accepted',
      accepted_at: message.timestamp || new Date().toISOString(),
      evidence: { source: message.source || 'corner-dashboard' },
      updated_at: new Date().toISOString(),
    }),
  })
  return Array.isArray(rows) ? rows[0] || null : rows
}

async function receiptEvidence(receipt) {
  const after = encodeURIComponent(receipt.accepted_at)
  const liveAfter = encodeURIComponent(new Date(Date.now() - 90000).toISOString())
  const room = encodeURIComponent(receipt.room_id)
  const client = encodeURIComponent(receipt.client_id)
  const agent = encodeURIComponent(receipt.agent)
  const [messageRows, roomMessages, exactReplyRows, stepRows, runnerRows, exactProcessRows, agentProcessRows, statusRows] = await Promise.all([
    db(`messages?id=eq.${encodeURIComponent(receipt.message_id)}&client_id=eq.${client}&select=id,role,room_id,agent,project,metadata,timestamp,reply_to,user_id,user_name&limit=1`),
    db(`messages?client_id=eq.${client}&room_id=eq.${room}&timestamp=gte.${after}&select=id,role,room_id,agent,project,metadata,timestamp,reply_to,user_id,user_name&order=timestamp.asc&limit=40`),
    db(`messages?client_id=eq.${client}&reply_to=eq.${encodeURIComponent(receipt.message_id)}&select=id,role,room_id,agent,project,metadata,timestamp,reply_to,user_id,user_name&order=timestamp.asc&limit=10`).catch(() => []),
    db(`events?event_type=eq.message_step&payload->>parent_message_id=eq.${encodeURIComponent(receipt.message_id)}&select=id,timestamp,payload&order=timestamp.asc&limit=100`).catch(() => []),
    receipt.route === 'local'
      ? db(`corner_runner_jobs?message_id=eq.${encodeURIComponent(receipt.message_id)}&select=id,status,lease_expires_at,claimed_at,finished_at,error,updated_at&limit=1`).catch(() => [])
      : Promise.resolve([]),
    db(`active_processes?client_id=eq.${client}&agent=eq.${agent}&task_id=eq.${encodeURIComponent(receipt.message_id)}&select=agent,task_id,heartbeat,task_text&order=heartbeat.desc&limit=1`).catch(() => []),
    db(`active_processes?client_id=eq.${client}&agent=eq.${agent}&heartbeat=gt.${liveAfter}&select=agent,task_id,heartbeat&order=heartbeat.desc&limit=1`).catch(() => null),
    db(`agent_status?client_id=eq.${client}&slug=eq.${agent}&select=slug,status,current_task,updated_at&limit=1`).catch(() => []),
  ])
  return {
    message: messageRows?.[0] || null,
    roomMessages: [...new Map([...(roomMessages || []), ...(exactReplyRows || [])].map((row) => [row.id, row])).values()],
    steps: (stepRows || []).map((row) => ({ id: row.id, timestamp: row.timestamp, ...(row.payload || {}) })),
    runnerJob: runnerRows?.[0] || null,
    activeProcess: exactProcessRows?.[0] || null,
    agentLiveProcess: agentProcessRows?.[0] || null,
    processEvidenceAvailable: agentProcessRows !== null,
    agentStatus: statusRows?.[0] || null,
  }
}

async function updateReceipt(receipt, health, additions = {}) {
  const now = new Date().toISOString()
  const patch = {
    state: health.state,
    last_checked_at: now,
    last_error: health.cause || null,
    evidence: {
      age_ms: health.ageMs,
      cause: health.cause || null,
      repair: health.repair || null,
      heartbeat_at: health.heartbeatAt || null,
      reply_id: health.reply?.id || null,
      runner_status: health.runnerJob?.status || null,
    },
    updated_at: now,
    ...(health.heartbeatAt ? { heartbeat_at: health.heartbeatAt } : {}),
    ...(health.reply ? { replied_at: health.reply.timestamp || now, visible_at: now } : {}),
    ...(health.state === 'settled' ? { settled_at: health.reply?.timestamp || now } : {}),
    ...additions,
  }
  const rows = await db(`room_turn_receipts?id=eq.${encodeURIComponent(receipt.id)}`, {
    method: 'PATCH', prefer: 'return=representation', body: JSON.stringify(patch),
  })
  return Array.isArray(rows) ? rows[0] || { ...receipt, ...patch } : { ...receipt, ...patch }
}

async function auditRepair(receipt, action, outcome) {
  await db('events', {
    method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
      id: crypto.randomUUID(),
      client_id: receipt.client_id,
      agent: receipt.agent,
      event_type: 'room_turn_repair',
      timestamp: new Date().toISOString(),
      payload: { message_id: receipt.message_id, room_id: receipt.room_id, action, outcome, source: 'room-steward' },
    }),
  }).catch(() => null)
}

export async function applyScopedRepair(receipt, health) {
  if (!health.repair || Number(receipt.repair_count || 0) >= 3) return { repaired: false, receipt, health }
  const now = new Date().toISOString()
  const action = health.repair
  if (!['requeue_expired_job', 'clear_stale_status', 'wake_exact_turn'].includes(action)) {
    return { repaired: false, receipt, health }
  }
  // Optimistic compare-and-set: the browser and cron may inspect the same turn
  // together, but only one caller may claim this repair count and emit an action.
  const repairCount = Number(receipt.repair_count || 0)
  const claimRows = await db(
    `room_turn_receipts?id=eq.${encodeURIComponent(receipt.id)}&repair_count=eq.${repairCount}`,
    {
      method: 'PATCH', prefer: 'return=representation',
      body: JSON.stringify({
        state: action === 'clear_stale_status' ? health.state : 'recovering',
        repair_count: repairCount + 1,
        last_repair: action,
        last_repair_at: now,
        updated_at: now,
      }),
    },
  )
  const claimedReceipt = claimRows?.[0]
  if (!claimedReceipt) return { repaired: false, action, outcome: 'already_claimed', receipt, health }
  let outcome = 'skipped'
  if (action === 'requeue_expired_job' && health.runnerJob?.id) {
    const rows = await db(
      `corner_runner_jobs?id=eq.${encodeURIComponent(health.runnerJob.id)}&client_id=eq.${encodeURIComponent(receipt.client_id)}&status=in.(claimed,running)&lease_expires_at=lt.${encodeURIComponent(now)}`,
      { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ status: 'queued', lease_expires_at: null, updated_at: now }) },
    )
    outcome = rows?.length ? 'requeued' : 'no_expired_job'
  } else if (action === 'clear_stale_status') {
    const freshCutoff = new Date(Date.now() - 90000).toISOString()
    const liveRows = await db(`active_processes?client_id=eq.${encodeURIComponent(receipt.client_id)}&agent=eq.${encodeURIComponent(receipt.agent)}&heartbeat=gt.${encodeURIComponent(freshCutoff)}&select=agent&limit=1`)
    if (liveRows?.length) {
      await auditRepair(claimedReceipt, action, 'live_process_found')
      const updated = await updateReceipt(claimedReceipt, health)
      return { repaired: false, action, outcome: 'live_process_found', receipt: updated, health }
    }
    const rows = await db(
      `agent_status?client_id=eq.${encodeURIComponent(receipt.client_id)}&slug=eq.${encodeURIComponent(receipt.agent)}&status=in.(working,stuck,active)&updated_at=lt.${encodeURIComponent(new Date(Date.now() - 300000).toISOString())}`,
      { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ status: 'idle', current_task: null, updated_at: now }) },
    )
    outcome = rows?.length ? 'cleared' : 'status_changed'
  } else if (action === 'wake_exact_turn') {
    await db('events', {
      method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
        id: crypto.randomUUID(), client_id: receipt.client_id, agent: receipt.agent,
        event_type: 'runner_start_requested', timestamp: now,
        payload: { source: 'room-steward', message_id: receipt.message_id, room_id: receipt.room_id, agent: receipt.agent },
      }),
    })
    outcome = 'wake_requested'
  }
  await auditRepair(claimedReceipt, action, outcome)
  const nextState = action === 'clear_stale_status'
    ? health.state
    : (outcome === 'no_expired_job' ? health.state : 'recovering')
  const updated = await updateReceipt(claimedReceipt, { ...health, state: nextState })
  return { repaired: !['skipped', 'no_expired_job'].includes(outcome), action, outcome, receipt: updated, health: { ...health, state: updated.state } }
}

export async function inspectTurnByMessage({ clientId, messageId, repair = false }) {
  const rows = await db(`room_turn_receipts?client_id=eq.${encodeURIComponent(clientId)}&message_id=eq.${encodeURIComponent(messageId)}&select=*&limit=1`)
  const receipt = rows?.[0]
  if (!receipt) return { found: false, state: 'unknown', repaired: false }
  const evidence = await receiptEvidence(receipt)
  const health = classifyTurnHealth({ receipt, ...evidence })
  const saved = await updateReceipt(receipt, health)
  if (repair && health.repair) {
    const result = await applyScopedRepair(saved, health)
    return { found: true, ...result, state: result.receipt?.state || health.state, cause: health.cause, evidence: saved.evidence }
  }
  return { found: true, repaired: false, receipt: saved, health, state: health.state, cause: health.cause, evidence: saved.evidence }
}

export async function runRoomSteward({ limit = 50 } = {}) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const receipts = await db(`room_turn_receipts?accepted_at=gte.${encodeURIComponent(cutoff)}&state=in.(accepted,active,recovering,needs_attention)&select=*&order=accepted_at.desc&limit=${Math.max(1, Math.min(100, limit))}`)
  const summary = { checked: 0, repaired: 0, healthy: 0, attention: 0, errors: 0 }
  // Small bounded batches keep the cron inside its runtime without turning a
  // tenant's full recent history into one burst of database traffic.
  for (let index = 0; index < (receipts || []).length; index += 5) {
    const batch = receipts.slice(index, index + 5)
    const results = await Promise.all(batch.map(async (receipt) => {
      try {
        return await inspectTurnByMessage({ clientId: receipt.client_id, messageId: receipt.message_id, repair: true })
      } catch {
        return null
      }
    }))
    for (const result of results) {
      if (!result) { summary.errors += 1; continue }
      summary.checked += 1
      if (result.repaired) summary.repaired += 1
      if (result.state === 'settled') summary.healthy += 1
      if (result.state === 'needs_attention') summary.attention += 1
    }
  }
  return summary
}
