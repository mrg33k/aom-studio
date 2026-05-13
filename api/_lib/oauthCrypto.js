// AES-GCM helpers for encrypting OAuth tokens at rest.
// Uses TOKEN_ENC_KEY env var — 32 bytes, base64 encoded.
// Generate with: openssl rand -base64 32
//
// Format on disk: <12-byte-iv-base64>.<auth-tag-base64>.<ciphertext-base64>
// All three are base64; the dots are separators.

import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto'

function getKey() {
  const raw = process.env.TOKEN_ENC_KEY
  if (!raw) throw new Error('TOKEN_ENC_KEY not set')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('TOKEN_ENC_KEY must decode to 32 bytes')
  return buf
}

export function encryptJson(obj) {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf-8')
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.')
}

export function decryptJson(blob) {
  const key = getKey()
  const [ivB64, tagB64, ctB64] = blob.split('.')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(pt.toString('utf-8'))
}

// HMAC-SHA256 state signing for the OAuth round-trip. We round-trip the
// user_id + slug + timestamp + nonce so the callback can validate the call
// came from our own /start handler.
export function signState(payload) {
  const key = process.env.TOKEN_ENC_KEY || ''
  if (!key) throw new Error('TOKEN_ENC_KEY not set')
  const json = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url')
  const mac = createHmac('sha256', key).update(json).digest('base64url')
  return `${json}.${mac}`
}

export function verifyState(state) {
  if (typeof state !== 'string' || !state.includes('.')) return null
  const [json, mac] = state.split('.')
  const key = process.env.TOKEN_ENC_KEY || ''
  if (!key) return null
  const expected = createHmac('sha256', key).update(json).digest('base64url')
  if (expected !== mac) return null
  try {
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'))
    // 10-minute window
    if (!payload.ts || Date.now() - payload.ts > 10 * 60 * 1000) return null
    return payload
  } catch {
    return null
  }
}
