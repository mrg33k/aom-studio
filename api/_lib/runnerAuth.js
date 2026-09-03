// Corner Runner device auth. A Mac pairs once with a short code, gets a long
// device token back once, and from then on sends it as a Bearer header.
//
// corner:retire-supabase R3: the device row lives in the Convex runnerDevices
// table (token hashed with sha256, looked up by runner:authenticateDevice).
// The pairing and job endpoints call runner:createPairing, runner:redeemPairing,
// runner:claimJob and runner:completeJob directly; the Supabase URL and header
// helpers this file used to export are gone.

import crypto from 'crypto'
import { convexQuery } from './verifyTenant.js'

export function normalizePairingCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Same hash the Convex side uses (lib/hash.ts sha256Hex over the trimmed token).
export function hashRunnerSecret(value) {
  return crypto.createHash('sha256').update(String(value || '').trim(), 'utf8').digest('hex')
}

export function createPairingCode() {
  // 16 base32 characters = 80 bits. The separators are only for readability.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(16)
  let raw = ''
  for (let i = 0; i < 16; i += 1) raw += alphabet[bytes[i] % alphabet.length]
  return raw.match(/.{1,4}/g).join('-')
}

export function createDeviceToken() {
  return `cr_${crypto.randomBytes(32).toString('base64url')}`
}

// Convex is always reachable; kept so callers that gate on it keep working.
export function runnerConfigAvailable() {
  return true
}

// Accepts both token shapes: the old `cr_...` tokens and the hex tokens
// runner:redeemPairing hands out.
export function extractRunnerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || ''
  const match = String(auth).match(/^Bearer\s+((?:cr_[A-Za-z0-9_-]{32,})|(?:[a-f0-9]{48,}))$/i)
  return match ? match[1] : null
}

// Returns the device row in the shape the routes read, or null:
//   { id, user_id, client_id, name, platform, status, last_seen_at, world_id }
export async function authenticateRunner(req) {
  const token = extractRunnerToken(req)
  if (!token) return null
  let device = null
  try {
    device = await convexQuery('runner:authenticateDevice', { tokenHash: hashRunnerSecret(token) })
  } catch {
    return null
  }
  if (!device || !device.deviceId) return null
  return {
    id: String(device.deviceId),
    user_id: device.userId ? String(device.userId) : null,
    client_id: device.worldSlug || null,
    world_id: device.worldId ? String(device.worldId) : null,
    name: device.name || null,
    platform: 'mac',
    status: 'online',
    last_seen_at: device.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : null,
  }
}
