// /api/runner/pair: pairing a Corner Runner (a Mac running corner-runner.mjs)
// with the signed-in person's world.
//
//   POST { action: 'claim', code, name }   from the runner: trade the code for a device token
//   GET  ?client=<world>                   from the dashboard: this person's runners
//   POST { client_id, name }               from the dashboard: mint a pairing code
//   DELETE { client_id, device_id }        from the dashboard: disconnect a runner
//
// corner:retire-supabase (2026-09-03): corner_runner_pairings / _devices are
// gone. The code comes from runner:createPairing (6 characters, 10 minute
// life, minted AS the caller so the device is owned by them), the runner
// redeems it with runner:redeemPairing and gets a hex device token back once,
// and the device list is runner:listDevices. There is no revoke mutation on
// the deployment yet, so DELETE answers 501 until runner:revokeDevice exists.

import { hashRunnerSecret, normalizePairingCode, runnerConfigAvailable } from '../_lib/runnerAuth.js'
import { callerIdentity, TenantAuthError, verifyTenant, extractJwt, convexQuery, convexMutation, convexMutationAs } from '../_lib/verifyTenant.js'

const RUNNER_ONLINE_MS = 75_000

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

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!runnerConfigAvailable()) return res.status(500).json({ error: 'Runner service is not configured' })

  if (req.method === 'POST' && req.body?.action === 'claim') {
    const normalized = normalizePairingCode(req.body?.code)
    if (normalized.length < 6 || normalized.length > 16) return res.status(400).json({ error: 'Pairing code is invalid' })
    let redeemed
    try {
      redeemed = await convexMutation('runner:redeemPairing', {
        code: normalized,
        name: String(req.body?.name || 'My computer').slice(0, 80),
      })
    } catch {
      return res.status(400).json({ error: 'Pairing code is invalid or expired' })
    }
    if (!redeemed?.deviceId || !redeemed?.token) return res.status(500).json({ error: 'Runner pairing did not return a device' })
    let clientId = null
    try {
      const d = await convexQuery('runner:authenticateDevice', { tokenHash: hashRunnerSecret(redeemed.token) })
      clientId = d?.worldSlug || null
    } catch {
      clientId = null
    }
    return res.status(200).json({
      ok: true,
      device: { id: String(redeemed.deviceId), name: String(req.body?.name || 'My computer').slice(0, 80), clientId },
      token: redeemed.token,
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
    let rows
    try {
      rows = await convexQuery('runner:listDevices', { worldId: tenant })
    } catch {
      return res.status(502).json({ error: 'Could not load runners' })
    }
    const now = Date.now()
    const devices = (Array.isArray(rows) ? rows : [])
      // Only this person's runners (a device paired before ownership was
      // recorded has no userId and stays visible).
      .filter((d) => !d.userId || String(d.userId) === String(identity.userId))
      .sort((a, b) => (Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0)) || (Number(b.createdAt || 0) - Number(a.createdAt || 0)))
      .map((d) => {
        const lastSeen = Number(d.lastSeenAt || 0)
        const online = lastSeen > 0 && now - lastSeen < RUNNER_ONLINE_MS
        return {
          id: String(d._id),
          name: d.name || null,
          platform: 'mac',
          status: online ? 'online' : 'offline',
          last_seen_at: iso(lastSeen),
          created_at: iso(Number(d.createdAt || 0)),
          online,
        }
      })
    return res.status(200).json({ devices })
  }

  if (req.method === 'POST') {
    let pairing
    try {
      pairing = await convexMutationAs(extractJwt(req), 'runner:createPairing', { userId: identity.userId, worldId: tenant })
    } catch {
      return res.status(502).json({ error: 'Could not create pairing code' })
    }
    if (!pairing?.code) return res.status(502).json({ error: 'Could not create pairing code' })
    return res.status(200).json({
      code: pairing.code,
      expiresAt: iso(pairing.expiresAt) || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      downloadUrl: `${apiBase(req)}/downloads/corner-runner.mjs`,
    })
  }

  if (req.method === 'DELETE') {
    const deviceId = String(req.body?.device_id || '')
    if (!deviceId) return res.status(400).json({ error: 'device_id required' })
    // No runner:revokeDevice on the deployment yet. Say so plainly instead of
    // pretending the runner was disconnected.
    return res.status(501).json({ error: 'Disconnecting a runner is not available yet. Stop the runner on that computer for now.' })
  }

  return res.status(405).json({ error: 'GET, POST, or DELETE only' })
}
