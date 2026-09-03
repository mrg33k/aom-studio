// Sign-in helper for the /api/worlds/* family. corner:retire-supabase R3: the
// session check and the membership lookup now go through the same Convex
// identity verifyTenant.js uses (users:verifyToken, worlds:membership), so
// there is one gate, not two.
//
// worldDbHeaders() is gone: it built Supabase service headers for the routes'
// own table reads. Those routes read Convex directly now (worlds:getBySlug,
// worlds:membersOf, worlds:forViewer).

import { extractJwt, getUserFromJwt, requireSuperAdmin, convexQuery } from './verifyTenant.js'

export class WorldAuthError extends Error {
  constructor(message, status = 403) {
    super(message)
    this.name = 'WorldAuthError'
    this.status = status
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

// Returns { user, userId, isSuperAdmin, token }. Throws WorldAuthError.
export async function authenticateWorldRequest(req) {
  const jwt = extractJwt(req)
  if (!jwt) throw new WorldAuthError('Authentication required', 401)
  const user = await getUserFromJwt(jwt)
  if (!user?.id) throw new WorldAuthError('Invalid session', 401)
  let isSuperAdmin = false
  try {
    await requireSuperAdmin(req)
    isSuperAdmin = true
  } catch {
    isSuperAdmin = false
  }
  return {
    user,
    userId: user.id,
    isSuperAdmin,
    token: jwt,
  }
}

// The caller's membership row in a world (by slug or id): { role } or null.
// `allowedRoles` narrows the answer the way the old role=in.(...) filter did.
export async function getWorldMembership(worldId, userId, allowedRoles = null) {
  let row = null
  try {
    row = await convexQuery('worlds:membership', { worldId: String(worldId), userId })
  } catch {
    throw new WorldAuthError('Could not verify world membership', 502)
  }
  if (!row || !row.role) return null
  if (Array.isArray(allowedRoles) && allowedRoles.length && !allowedRoles.includes(row.role)) return null
  return { role: row.role, worldId: row.worldId ? String(row.worldId) : null, slug: row.slug || null }
}

export function sendWorldAuthError(res, error) {
  if (error instanceof WorldAuthError) {
    return res.status(error.status).json({ error: error.message })
  }
  return res.status(500).json({ error: error?.message || 'Internal server error' })
}
