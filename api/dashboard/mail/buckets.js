// GET /api/dashboard/mail/buckets?connection_id=<id>
// Returns { counts: { 'awaiting-reply': N, today: N, ... } }.
// One Gmail messages.list call per bucket; only the id list is read.
//
// corner:retire-supabase (2026-09-03): the caller is resolved from the Convex
// Auth token (users:verifyToken) and the connection ownership check reads the
// Convex integrations table: a connection is usable when it is one of the
// caller's own rows (integrations:listForUser) or a team row whose workspace
// is a world the caller belongs to (integrations:getOAuthTokens.workspaceId).
// The Gmail token itself still comes from api/_lib/gmailClient.js.

import { getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'
import { BUCKET_SLUGS, buildBucketQuery } from '../../_lib/mailBuckets.js'

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

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

// The caller may use a connection when it is their own, or a team connection
// in one of their worlds. Throws 403 / 404 like the old mailAccess helper.
async function assertCanUseConnection(caller, connectionId) {
  const mine = await convexQuery('integrations:listForUser', {}, caller.token).catch(() => [])
  const ownIds = new Set((Array.isArray(mine) ? mine : [])
    .filter(r => r && r.status === 'connected' && r.hasTokens)
    .map(r => `${r.service}:${caller.userId}`))
  if (ownIds.has(connectionId)) return { id: connectionId, user_id: caller.userId, workspace_id: null }
  let row = null
  try {
    row = await convexQuery('integrations:getOAuthTokens', { key: CONVEX_KEY, connectionId, slug: 'gmail' }, caller.token)
  } catch { row = null }
  if (!row) { const err = new Error('connection-not-found'); err.status = 404; throw err }
  if (row.workspaceId) {
    const worlds = await convexQuery('worlds:forViewer', {}, caller.token).catch(() => [])
    const slugs = new Set((Array.isArray(worlds) ? worlds : []).flatMap(w => [w.slug, String(w.worldId)]))
    if (slugs.has(String(row.workspaceId))) return { id: connectionId, user_id: null, workspace_id: row.workspaceId }
  }
  const err = new Error('forbidden'); err.status = 403; throw err
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  let caller
  try { caller = await requireCaller(req) }
  catch (e) { return res.status(e.status || 401).json({ error: 'not-authenticated' }) }
  const connectionId = (req.query?.connection_id || '').toString()
  if (!connectionId) return res.status(400).json({ error: 'connection_id required' })

  try { await assertCanUseConnection(caller, connectionId) }
  catch (e) { return res.status(e.status || 403).json({ error: e.message }) }

  const creds = await getGmailTokenByConnection(connectionId)
  if (!creds) return res.status(200).json({ counts: {}, mode: 'not-connected' })
  const accountEmail = creds.row?.config?.account_email || creds.row?.email || creds.email
  const clientEmails = creds.row?.config?.client_emails || []
  const prospectEmails = creds.row?.config?.prospect_emails || []

  const counts = {}
  await Promise.all(BUCKET_SLUGS.map(async slug => {
    const { q, postFilter } = buildBucketQuery(slug, { account_email: accountEmail, client_emails: clientEmails, prospect_emails: prospectEmails })
    // postFilter==='empty' is the no-seed escape hatch (clients/prospects with
    // no list yet): surface 0 so the bucket header reflects the actual empty
    // state rather than Gmail's estimate for the fallback q.
    if (postFilter === 'empty') { counts[slug] = 0; return }
    // Gmail's resultSizeEstimate is unreliable at maxResults=1, so the real id
    // list is counted (maxResults=200) and "+" marks a capped count.
    const r = await gmailFetch(creds.accessToken, `/messages?q=${encodeURIComponent(q)}&maxResults=200`)
    if (!r.ok) { counts[slug] = 0; return }
    const body = await r.json()
    const n = body.messages?.length || 0
    counts[slug] = body.nextPageToken ? `${n}+` : n
  }))
  return res.status(200).json({ counts, mode: 'live' })
}
