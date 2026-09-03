// GET /api/dashboard/mail/connections
// Returns every Gmail / Outlook connection visible to the caller, scope-tagged.
// Drives MailAccountSwitcher.
//
// corner:retire-supabase (2026-09-03): the caller comes from the Convex Auth
// token and the rows from integrations:listForUser. Row shape kept for the
// panels: { id, user_id, workspace_id, integration_slug, provider, scope,
// account_email, connector_user_id, connected_at, mailboxes, has_shared_access }.
// The Convex row does not keep the granted OAuth scopes, so mailboxes and
// has_shared_access are null (the mail panels treat null as "not known").

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

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
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, token }
}

// Mail slugs supported by the personal inbox reader.
const MAIL_SLUGS = ['gmail', 'outlook']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  let caller
  try { caller = await requireCaller(req) }
  catch (e) { return res.status(e.status || 401).json({ error: 'not-authenticated' }) }

  let rows = []
  try { rows = await convexQuery('integrations:listForUser', {}, caller.token) } catch { rows = [] }

  const connections = (Array.isArray(rows) ? rows : [])
    .filter(r => r && MAIL_SLUGS.includes(r.service) && r.status === 'connected' && r.hasTokens)
    .map(r => {
      const isOutlook = r.service === 'outlook'
      const ownEmail = r.email || null
      return {
        // integrations:setOAuthTokens defaults connectionId to "<slug>:<userId>".
        id: `${r.service}:${caller.userId}`,
        user_id: r.workspaceId ? null : caller.userId,
        workspace_id: r.workspaceId || null,
        integration_slug: r.service,
        provider: r.provider || r.service,
        scope: r.workspaceId ? 'team' : 'personal',
        account_email: ownEmail,
        connector_user_id: null,
        connected_at: typeof r.connectedAt === 'number' ? new Date(r.connectedAt).toISOString() : (r.connectedAt || null),
        mailboxes: isOutlook && ownEmail ? [{ address: ownEmail, label: ownEmail, type: 'primary' }] : null,
        has_shared_access: null,
      }
    })
  return res.status(200).json({ connections })
}
