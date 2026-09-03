// POST /api/integrations/migrate
// Body: { connection_id, workspace_id, slug? }
// Caller must (a) own the connection, AND
//             (b) be a member of the target workspace (world).
// Effect: stamps workspace_id on the connection row. Tokens stay valid.
//
// corner:retire-supabase (2026-09-03): the caller comes from the Convex Auth
// token (users:verifyToken), the workspace check is worlds:membership, the
// row lookup is integrations:getOAuthTokens and the flip is
// integrations:setOwner. Ownership: getOAuthTokens refuses a caller who is
// not the row's owner whenever the deployment has TASKS_KEY set; with no key
// set the deployment does not gate reads, so the membership check is the
// wall that remains.

import { extractJwt } from '../_lib/verifyTenant.js'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || ''

async function convex(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}

async function getUser(req) {
  const token = extractJwt(req)
  if (!token) return null
  try {
    const who = await convex('query', 'users:verifyToken', {}, token)
    return who && who.userId ? { ...who, token } : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'not-authenticated' })

  const { connection_id, workspace_id, slug } = req.body || {}
  if (!connection_id || !workspace_id) {
    return res.status(400).json({ error: 'connection_id + workspace_id required' })
  }

  // (a) the row exists and the caller may read it (owner gate lives in Convex)
  let ownRow = null
  try {
    ownRow = await convex('query', 'integrations:getOAuthTokens', {
      connectionId: String(connection_id),
      slug: String(slug || 'gmail'),
    }, user.token)
  } catch (err) {
    if (/not allowed/i.test(err.message || '')) return res.status(403).json({ error: 'not-owner' })
    return res.status(502).json({ error: 'lookup-failed', detail: String(err.message || '').slice(0, 200) })
  }
  if (!ownRow) return res.status(404).json({ error: 'connection-not-found' })
  if (ownRow.workspaceId) return res.status(400).json({ error: 'already-workspace-owned' })

  // (b) caller is a member of the workspace
  let membership = null
  try {
    membership = await convex('query', 'worlds:membership', { worldId: String(workspace_id), userId: user.userId }, user.token)
  } catch {
    membership = null
  }
  if (!membership) return res.status(403).json({ error: 'not-workspace-member' })

  // Flip ownership: workspace_id -> set.
  try {
    const out = await convex('mutation', 'integrations:setOwner', {
      ...(CONVEX_KEY ? { key: CONVEX_KEY } : {}),
      connectionId: String(connection_id),
      workspaceId: membership.slug || String(workspace_id),
    }, user.token)
    if (!out || !out.ok) return res.status(404).json({ error: 'connection-not-found' })
  } catch (err) {
    return res.status(502).json({ error: 'migrate-failed', detail: String(err.message || '').slice(0, 200) })
  }
  return res.status(200).json({ ok: true })
}
