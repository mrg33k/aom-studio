// POST /api/dashboard/create-world
// Creates a new world on Convex: the person (users row), the world, the owner
// membership, an EA agent for that world, and a welcome message in the EA room.
// Body: { name, email, password? }
// Returns: { ok, world, user_id, credentials, invite_text }
//
// corner:retire-supabase (2026-09-03). Was: Supabase auth user + worlds +
// world_members + agent_status + messages. Now: users:createUser, worlds:create,
// worlds:addMember, agents:upsert, messages:send. The password is set through
// auth:adminSetPassword, which needs AUTH_SEED_KEY on this route. Without the
// key the world is still created and the response says the password is not
// set yet (scripts/seed-auth-accounts.mjs can set it).

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined
const AUTH_SEED_KEY = process.env.AUTH_SEED_KEY || undefined

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
const convexAction = (path, args, token) => convexCall('action', path, args, token)

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

function setWorldCors(req, res, methods) {
  const origin = req.headers?.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', `${methods},OPTIONS`)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'private, no-store')
}

function generatePassword(name) {
  const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 6) || 'Corner'
  const num = Math.floor(Math.random() * 900) + 100
  const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)]
  return `${base.charAt(0).toUpperCase()}${base.slice(1).toLowerCase()}${num}${special}`
}

export default async function handler(req, res) {
  setWorldCors(req, res, 'POST')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let caller
  try {
    caller = await requireCaller(req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: err?.message || 'Internal server error' })
  }
  if (!caller.superAdmin) return res.status(403).json({ error: 'Super-admin access required' })

  try {
    const { name, email } = req.body || {}
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' })
    }

    const worldSlug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const password = req.body.password || generatePassword(name)
    const displayName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!worldSlug) return res.status(400).json({ error: 'name must contain letters or numbers' })
    const existingWorld = await convexQuery('worlds:getBySlug', { slug: worldSlug }, caller.token)
    if (existingWorld) {
      return res.status(409).json({ error: 'That world name is already in use.' })
    }
    const existingUser = await convexQuery('users:getByEmail', { email: normalizedEmail }, caller.token)
    if (existingUser) {
      return res.status(409).json({ error: 'That email already has a Corner account.' })
    }

    // 1. The person.
    const userId = await convexMutation('users:createUser', {
      email: normalizedEmail,
      name: displayName,
      role: 'owner',
    }, caller.token)
    if (!userId) return res.status(502).json({ error: 'Failed to create user' })

    // 2. The world and the owner membership.
    const worldId = await convexMutation('worlds:create', { name: displayName, ownerId: userId, slug: worldSlug }, caller.token)
    if (!worldId) return res.status(502).json({ error: 'Failed to create world registry' })
    await convexMutation('worlds:addMember', { key: CONVEX_KEY, worldId, userId, role: 'owner' }, caller.token)

    // Temporary password, flagged so the app asks for a new one on first sign-in.
    let passwordSet = false
    if (AUTH_SEED_KEY) {
      try {
        await convexAction('auth:adminSetPassword', {
          key: AUTH_SEED_KEY,
          email: normalizedEmail,
          password,
          name: displayName,
          temporary: true,
        }, caller.token)
        passwordSet = true
      } catch (err) {
        console.warn('[create-world] password not set:', err?.message || err)
      }
    }

    // 3. The EA agent for this world.
    try {
      await convexMutation('agents:upsert', {
        key: CONVEX_KEY,
        slug: 'ea',
        title: `${displayName} EA`,
        worldId,
      }, caller.token)
    } catch (err) {
      console.warn('[create-world] EA agent not created:', err?.message || err)
    }

    // 4. Welcome message in the EA room. messages:send creates the room from
    // the key when it does not exist yet.
    try {
      await convexMutation('messages:send', {
        roomId: `${worldSlug}:agent:ea`,
        clientId: worldSlug,
        role: 'assistant',
        agentSlug: 'ea',
        source: 'create-world',
        text: `Hey ${displayName}, welcome.\n\nI'm your EA. I work for you. Tell me whatever's on your mind right now: what you're working on, what's in your head, what you'd want a sharp partner helping you with, and I'll take it from there.`,
      }, caller.token)
    } catch (err) {
      console.warn('[create-world] welcome message not sent:', err?.message || err)
    }

    // 5. Invite text.
    const passwordLine = passwordSet
      ? `🔑 ${password}`
      : '🔑 (password not set yet: run scripts/seed-auth-accounts.mjs or set AUTH_SEED_KEY on this route)'
    const inviteText = `Hey ${displayName} 👋\n\nYour Corner workspace is ready. Here's your login:\n\n🔗 https://aheadofmarket.com/login\n📧 ${normalizedEmail}\n${passwordLine}\n\nYour EA is already waiting inside. Just sign in and start talking to it.\n\nChange your password after first login.`

    return res.status(200).json({
      ok: true,
      world: worldSlug,
      world_id: worldId,
      user_id: userId,
      password_set: passwordSet,
      credentials: {
        email: normalizedEmail,
        password: passwordSet ? password : null,
        login_url: 'https://aheadofmarket.com/login',
      },
      invite_text: inviteText,
    })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Internal server error' })
  }
}
