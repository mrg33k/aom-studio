import { extractJwt } from './verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '833f6828-1dae-409c-a24b-1438f46544d0'

export class WorldAuthError extends Error {
  constructor(message, status = 403) {
    super(message)
    this.name = 'WorldAuthError'
    this.status = status
  }
}

export function worldDbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export function setWorldCors(req, res, methods) {
  const origin = req.headers?.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', `${methods},OPTIONS`)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'private, no-store')
}

export async function authenticateWorldRequest(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new WorldAuthError('Supabase not configured', 500)
  }

  const jwt = extractJwt(req)
  if (!jwt) throw new WorldAuthError('Authentication required', 401)

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  })
  if (!response.ok) throw new WorldAuthError('Invalid session', 401)

  const user = await response.json()
  if (!user?.id) throw new WorldAuthError('Invalid session', 401)

  return {
    user,
    userId: user.id,
    isSuperAdmin: user.id === SUPER_ADMIN_USER_ID,
  }
}

export async function getWorldMembership(worldId, userId, allowedRoles = null) {
  const roleFilter = Array.isArray(allowedRoles) && allowedRoles.length
    ? `&role=in.(${allowedRoles.map(encodeURIComponent).join(',')})`
    : ''
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/world_members?world_id=eq.${encodeURIComponent(worldId)}` +
      `&user_id=eq.${encodeURIComponent(userId)}${roleFilter}&select=role&limit=1`,
    { headers: worldDbHeaders() },
  )
  if (!response.ok) throw new WorldAuthError('Could not verify world membership', 502)
  const rows = await response.json()
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

export function sendWorldAuthError(res, error) {
  if (error instanceof WorldAuthError) {
    return res.status(error.status).json({ error: error.message })
  }
  return res.status(500).json({ error: error?.message || 'Internal server error' })
}
