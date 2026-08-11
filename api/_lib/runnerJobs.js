import { runnerServiceHeaders, runnerSupabaseUrl } from './runnerAuth.js'

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

export async function resolveRunnerRoute({ clientId, userId, agent, project }) {
  if (!clientId || !userId) return { local: false, device: null }
  const prefResponse = await fetch(
    runnerSupabaseUrl(
      `/rest/v1/user_preferences?key=eq.agent_models&client_id=eq.${encodeURIComponent(clientId)}`
      + '&select=value&limit=1',
    ),
    { headers: runnerServiceHeaders() },
  )
  if (!prefResponse.ok) return { local: null, device: null, error: 'preference_unavailable' }
  const prefRows = await prefResponse.json()
  const models = parsePreferenceValue(prefRows?.[0]?.value)
  const key = runnerRoomPreferenceKey({ agent, project })
  const preference = resolveRunnerPreference(models, key)
  if (![LOCAL_CODEX_MODEL, 'default'].includes(preference)) {
    return { local: false, device: null }
  }

  const deviceResponse = await fetch(
    runnerSupabaseUrl(
      `/rest/v1/corner_runner_devices?user_id=eq.${encodeURIComponent(userId)}`
      + `&client_id=eq.${encodeURIComponent(clientId)}&revoked_at=is.null`
      + '&select=id,name,status,last_seen_at&order=last_seen_at.desc.nullslast,created_at.desc&limit=1',
    ),
    { headers: runnerServiceHeaders() },
  )
  if (!deviceResponse.ok) {
    return preference === LOCAL_CODEX_MODEL
      ? { local: true, device: null, error: 'device_lookup_failed' }
      : { local: false, device: null, fallbackDevice: null, fallbackError: 'device_lookup_failed' }
  }
  const devices = await deviceResponse.json()
  const device = Array.isArray(devices) ? devices[0] || null : null
  if (preference === LOCAL_CODEX_MODEL) return { local: true, device }
  return {
    local: false,
    device: null,
    fallbackDevice: runnerDeviceOnline(device) ? device : null,
  }
}

export async function enqueueRunnerJob({ device, userId, clientId, message }) {
  const payload = {
    device_id: device.id,
    user_id: userId,
    client_id: clientId,
    message_id: message.id,
    room_id: message.room_id,
    status: 'queued',
  }
  const response = await fetch(runnerSupabaseUrl('/rest/v1/corner_runner_jobs'), {
    method: 'POST',
    headers: runnerServiceHeaders('return=representation'),
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Runner queue insert failed (${response.status})`)
  const rows = await response.json()
  return rows?.[0] || null
}

export { LOCAL_CODEX_MODEL }
