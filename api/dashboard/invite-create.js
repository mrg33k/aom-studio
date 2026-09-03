// POST /api/dashboard/invite-create
// Generate a single-use invite token for a world. The super-agent calls this
// when onboarding someone new; the returned invite_url is what the EA sends by
// email/text/whatever channel it owns.
//
// Body: { email, world_slug, role?, expires_hours? }
//
// Returns: { ok, invite_id, invite_url, token, email, world_slug, role, expires_at }
//   token is the plaintext, returned exactly once (only its sha256 hash is
//   stored on Convex).
//
// AUTH (corner:identity-attribution, 2026-07-27). This endpoint mints the
// credential that creates world membership. So the gate lives here:
//   - a valid session is required,
//   - the caller must pass verifyTenant() for the world they are inviting INTO,
//   - owner/admin roles may only be granted by a world admin.
//
// corner:retire-supabase (2026-09-03): invites:create on Convex, called with
// the caller's token so createdBy is the verified person. The Convex invite
// TTL is fixed at 14 days; expires_hours is accepted for compatibility and
// reported back as the Convex expiry.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://aheadofmarket.com'

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`)
  const data = await r.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token)
const convexMutation = (path, args, token) => convexCall('mutation', path, args, token)

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null
  return null
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req)
  if (!token) throw new AuthError('sign-in required', 401)
  let who = null
  try { who = await convexQuery('users:verifyToken', {}, token) } catch { who = null }
  if (!who || !who.userId) throw new AuthError('invalid session', 401)
  const world = who.world ? String(who.world).toLowerCase() : null
  let superAdmin = false
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)) } catch { superAdmin = false }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token }
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase()
  if (!t) throw new AuthError('tenant required', 400)
  const who = await requireCaller(req)
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true }
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length)
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false }
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null)
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' }
    if (who.world === t) return { ok: true, tenant: t, ...who }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403)
}

// Same allowlist shape as api/dashboard/voice-handoff.js: the dashboard
// origins and nothing else. `*` on a credential-minting endpoint let any page
// on the internet drive it from a logged-in browser.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
]

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

function applyCors(req, res) {
  const origin = req.headers?.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'private, no-store')
}

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { email, world_slug, role, expires_hours } = req.body || {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email required' })
  }
  // world_slug is REQUIRED: an invite with no world is an invite we cannot authorize.
  if (!world_slug || typeof world_slug !== 'string' || !world_slug.trim()) {
    return res.status(400).json({ error: 'world_slug required' })
  }

  let verified
  try {
    verified = await verifyTenant(world_slug, req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'invalid email' })
  }

  const normalizedRole = role && ['owner', 'admin', 'member'].includes(role) ? role : 'member'
  // Privilege ceiling: only a verified world admin can hand out owner/admin.
  // A plain member of the world can still invite teammates, but only as members.
  if ((normalizedRole === 'owner' || normalizedRole === 'admin') && !verified.isAdmin) {
    return res.status(403).json({ error: 'only a world admin can invite at owner or admin role' })
  }
  const ttlHours = Number.isFinite(Number(expires_hours)) ? Math.max(1, Math.min(168, Number(expires_hours))) : 48
  void ttlHours // the Convex invite keeps its own expiry; reported below

  let created
  try {
    created = await convexMutation('invites:create', {
      key: CONVEX_KEY,
      worldId: verified.tenant,
      email: normalizedEmail,
      role: normalizedRole,
      baseUrl: APP_ORIGIN,
    }, verified.token)
  } catch (err) {
    return res.status(502).json({ error: 'Failed to create invite', detail: err?.message || String(err) })
  }
  if (!created || !created.token) {
    return res.status(502).json({ error: 'Failed to create invite' })
  }

  const inviteUrl = `${APP_ORIGIN}/accept-invite?token=${encodeURIComponent(created.token)}`

  return res.status(200).json({
    ok: true,
    invite_id: created.id,
    invite_url: inviteUrl,
    token: created.token,
    email: created.email || normalizedEmail,
    world_slug: created.worldSlug || verified.tenant,
    role: normalizedRole,
    expires_at: typeof created.expiresAt === 'number' ? new Date(created.expiresAt).toISOString() : null,
    invited_by: verified.userId,
  })
}
