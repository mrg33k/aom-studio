import {
  createDeviceToken,
  createPairingCode,
  hashRunnerSecret,
  normalizePairingCode,
  runnerConfigAvailable,
  runnerServiceHeaders,
  runnerSupabaseUrl,
} from '../_lib/runnerAuth.js'
import { callerIdentity, TenantAuthError, verifyTenant } from '../_lib/verifyTenant.js'

const PAIRING_TTL_MS = 10 * 60 * 1000

function apiBase(req) {
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0]
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || 'aheadofmarket.com').split(',')[0]
  return `${proto}://${host}`
}
async function browserIdentity(req, clientId) {
  const { tenant } = await verifyTenant(clientId || 'aom', req)
  const identity = await callerIdentity(req)
  if (!identity?.userId) throw new TenantAuthError('Authenticated user required', 401)
  return { tenant, identity }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!runnerConfigAvailable()) return res.status(500).json({ error: 'Runner service is not configured' })

  if (req.method === 'POST' && req.body?.action === 'claim') {
    const normalized = normalizePairingCode(req.body?.code)
    if (normalized.length !== 16) return res.status(400).json({ error: 'Pairing code is invalid' })
    const token = createDeviceToken()
    const response = await fetch(runnerSupabaseUrl('/rest/v1/rpc/claim_corner_runner_pairing'), {
      method: 'POST',
      headers: runnerServiceHeaders(),
      body: JSON.stringify({
        p_code_hash: hashRunnerSecret(normalized),
        p_token_hash: hashRunnerSecret(token),
        p_name: String(req.body?.name || 'My computer').slice(0, 80),
        p_platform: String(req.body?.platform || '').slice(0, 80) || null,
      }),
    })
    if (!response.ok) return res.status(400).json({ error: 'Pairing code is invalid or expired' })
    const rows = await response.json()
    const device = rows?.[0]
    if (!device?.id) return res.status(500).json({ error: 'Runner pairing did not return a device' })
    return res.status(200).json({
      ok: true,
      device: { id: device.id, name: device.name, clientId: device.client_id },
      token,
      server: apiBase(req),
    })
  }

  const clientId = String(req.method === 'GET' ? req.query?.client : req.body?.client_id || 'aom').trim().toLowerCase()
  let tenant
  let identity
  try {
    ({ tenant, identity } = await browserIdentity(req, clientId))
  } catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message })
    return res.status(401).json({ error: 'Authentication failed' })
  }

  if (req.method === 'GET') {
    const response = await fetch(
      runnerSupabaseUrl(
        `/rest/v1/corner_runner_devices?user_id=eq.${encodeURIComponent(identity.userId)}`
        + `&client_id=eq.${encodeURIComponent(tenant)}&revoked_at=is.null`
        + '&select=id,name,platform,status,last_seen_at,created_at&order=last_seen_at.desc.nullslast,created_at.desc',
      ),
      { headers: runnerServiceHeaders() },
    )
    if (!response.ok) return res.status(502).json({ error: 'Could not load runners' })
    const rows = await response.json()
    const now = Date.now()
    const devices = (Array.isArray(rows) ? rows : []).map((device) => {
      const lastSeen = device.last_seen_at ? Date.parse(device.last_seen_at) : 0
      const online = lastSeen > 0 && now - lastSeen < 75_000
      return { ...device, online, status: online ? device.status : 'offline' }
    })
    return res.status(200).json({ devices })
  }

  if (req.method === 'POST') {
    const code = createPairingCode()
    const normalized = normalizePairingCode(code)
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString()
    const response = await fetch(runnerSupabaseUrl('/rest/v1/corner_runner_pairings'), {
      method: 'POST',
      headers: runnerServiceHeaders('return=representation'),
      body: JSON.stringify({
        user_id: identity.userId,
        client_id: tenant,
        code_hash: hashRunnerSecret(normalized),
        requested_name: String(req.body?.name || 'My computer').slice(0, 80),
        expires_at: expiresAt,
      }),
    })
    if (!response.ok) return res.status(502).json({ error: 'Could not create pairing code' })
    return res.status(200).json({
      code,
      expiresAt,
      downloadUrl: `${apiBase(req)}/downloads/corner-runner.mjs`,
    })
  }

  if (req.method === 'DELETE') {
    const deviceId = String(req.body?.device_id || '')
    if (!deviceId) return res.status(400).json({ error: 'device_id required' })
    const response = await fetch(
      runnerSupabaseUrl(
        `/rest/v1/corner_runner_devices?id=eq.${encodeURIComponent(deviceId)}`
        + `&user_id=eq.${encodeURIComponent(identity.userId)}&client_id=eq.${encodeURIComponent(tenant)}`,
      ),
      {
        method: 'PATCH',
        headers: runnerServiceHeaders('return=minimal'),
        body: JSON.stringify({ revoked_at: new Date().toISOString(), status: 'offline', updated_at: new Date().toISOString() }),
      },
    )
    if (!response.ok) return res.status(502).json({ error: 'Could not disconnect runner' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'GET, POST, or DELETE only' })
}
