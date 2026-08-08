import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export function normalizePairingCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}
export function hashRunnerSecret(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
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

export function runnerServiceHeaders(prefer = '') {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
  if (prefer) headers.Prefer = prefer
  return headers
}

export function runnerConfigAvailable() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

export function runnerSupabaseUrl(path) {
  return `${SUPABASE_URL}${path}`
}

export function extractRunnerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || ''
  const match = String(auth).match(/^Bearer\s+(cr_[A-Za-z0-9_-]{32,})$/)
  return match ? match[1] : null
}

export async function authenticateRunner(req) {
  const token = extractRunnerToken(req)
  if (!token || !runnerConfigAvailable()) return null
  const hash = hashRunnerSecret(token)
  const url = runnerSupabaseUrl(
    `/rest/v1/corner_runner_devices?token_hash=eq.${encodeURIComponent(hash)}`
    + '&revoked_at=is.null&select=id,user_id,client_id,name,platform,status,last_seen_at&limit=1',
  )
  const response = await fetch(url, { headers: runnerServiceHeaders() })
  if (!response.ok) return null
  const rows = await response.json()
  return Array.isArray(rows) ? rows[0] || null : null
}
