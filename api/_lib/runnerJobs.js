// Routes a chat message to a paired local runner device and queues a job.
//
// corner:retire-supabase R3: the model preference comes from Convex
// preferences:get (key agent_models, per user and world), the device list from
// runner:listDevices, and the job goes in through runner:enqueueJob.

import { convexQuery, convexMutation } from './verifyTenant.js'

const LOCAL_CODEX_MODEL = 'codex-local'
const RUNNER_ONLINE_MS = 75_000

function parsePreferenceValue(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) || {} } catch { return {} }
}

export function runnerRoomPreferenceKey({ agent, project }) {
  return project ? `project:${project}` : String(agent || '')
}

export function resolveRunnerPreference(models, key) {
  const own = String(models?.[key] || '').trim().toLowerCase()
  const workspace = String(models?._all || '').trim().toLowerCase()
  if (own && own !== 'default') return own
  if (workspace && workspace !== 'default') return workspace
  return 'default'
}

export function runnerDeviceOnline(device, now = Date.now()) {
  const lastSeen = device?.last_seen_at ? Date.parse(device.last_seen_at) : 0
  return Boolean(
    device?.id
    && ['online', 'working'].includes(String(device.status || '').toLowerCase())
    && Number.isFinite(lastSeen)
    && lastSeen > 0
    && now - lastSeen < RUNNER_ONLINE_MS
  )
}

// Convex device row -> the shape runnerDeviceOnline and the routes read.
function legacyDevice(d) {
  if (!d) return null
  const lastSeen = d.lastSeenAt ? Number(d.lastSeenAt) : 0
  return {
    id: String(d._id),
    name: d.name || null,
    user_id: d.userId ? String(d.userId) : null,
    // A device that has checked in within the online window counts as online;
    // the Convex row has no separate status column.
    status: lastSeen && Date.now() - lastSeen < RUNNER_ONLINE_MS ? 'online' : 'offline',
    last_seen_at: lastSeen ? new Date(lastSeen).toISOString() : null,
  }
}

async function newestDeviceFor({ clientId, userId }) {
  const rows = await convexQuery('runner:listDevices', { worldId: clientId })
  const list = (Array.isArray(rows) ? rows : [])
    .filter((d) => !userId || !d.userId || String(d.userId) === String(userId))
    .sort((a, b) => (Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0)) || (Number(b.createdAt || 0) - Number(a.createdAt || 0)))
  return legacyDevice(list[0] || null)
}

export async function resolveRunnerRoute({ clientId, userId, agent, project }) {
  if (!clientId || !userId) return { local: false, device: null }
  let raw = null
  try {
    raw = await convexQuery('preferences:get', { userId, worldId: clientId, key: 'agent_models' })
  } catch {
    return { local: null, device: null, error: 'preference_unavailable' }
  }
  const models = parsePreferenceValue(raw)
  const key = runnerRoomPreferenceKey({ agent, project })
  const preference = resolveRunnerPreference(models, key)
  if (![LOCAL_CODEX_MODEL, 'default'].includes(preference)) {
    return { local: false, device: null }
  }

  let device = null
  try {
    device = await newestDeviceFor({ clientId, userId })
  } catch {
    return preference === LOCAL_CODEX_MODEL
      ? { local: true, device: null, error: 'device_lookup_failed' }
      : { local: false, device: null, fallbackDevice: null, fallbackError: 'device_lookup_failed' }
  }
  if (preference === LOCAL_CODEX_MODEL) return { local: true, device }
  return {
    local: false,
    device: null,
    fallbackDevice: runnerDeviceOnline(device) ? device : null,
  }
}

// Queue the message for the device. The Convex job carries the message text
// plus the ids the runner needs to reply into the right room.
export async function enqueueRunnerJob({ device, userId, clientId, message }) {
  if (!device?.id) throw new Error('Runner queue insert failed (no device)')
  const text = String(message?.text || '').trim()
  const header = `[corner-runner] room=${message?.room_id || ''} message=${message?.id || ''} client=${clientId || ''} user=${userId || ''}`
  const jobId = await convexMutation('runner:enqueueJob', {
    deviceId: device.id,
    message: text ? `${header}\n${text}` : header,
  })
  if (!jobId) throw new Error('Runner queue insert failed')
  return {
    id: String(jobId),
    device_id: device.id,
    user_id: userId || null,
    client_id: clientId || null,
    message_id: message?.id || null,
    room_id: message?.room_id || null,
    status: 'queued',
  }
}

export { LOCAL_CODEX_MODEL }
