// Resolves "which Gmail connections can this user see and use?" against the
// new workspace-owned model. A connection is either user-owned (config in
// account_integrations with user_id set) or workspace-owned (workspace_id set
// and the user is a member of that workspace via tenant_users).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function svcHeaders() {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
}

async function workspaceIdsForUser(userId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/tenant_users?user_id=eq.${userId}&select=tenant_id`,
    { headers: svcHeaders() },
  )
  if (!r.ok) return []
  const rows = await r.json()
  return Array.isArray(rows) ? rows.map(x => x.tenant_id) : []
}

export async function listConnectionsForUser(userId) {
  const wsIds = await workspaceIdsForUser(userId)
  const filters = [
    `user_id.eq.${userId}`,
    ...wsIds.map(w => `workspace_id.eq.${w}`),
  ]
  const url = `${SUPABASE_URL}/rest/v1/account_integrations?or=(${filters.join(',')})&integration_slug=eq.gmail&status=eq.connected&select=id,user_id,workspace_id,connected_at,config,integration_slug`
  const r = await fetch(url, { headers: svcHeaders() })
  if (!r.ok) return []
  const rows = await r.json()
  if (!Array.isArray(rows)) return []
  return rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    workspace_id: row.workspace_id,
    integration_slug: row.integration_slug,
    scope: row.workspace_id ? 'team' : 'personal',
    account_email: row.config?.account_email || null,
    connector_user_id: row.config?.connector_user_id || null,
    connected_at: row.connected_at,
  }))
}

export async function assertCanUseConnection(userId, connectionId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connectionId}&select=id,user_id,workspace_id&limit=1`,
    { headers: svcHeaders() },
  )
  if (!r.ok) {
    const err = new Error('connection-lookup-failed')
    err.status = 502
    throw err
  }
  const rows = await r.json()
  const row = Array.isArray(rows) && rows[0]
  if (!row) {
    const err = new Error('connection-not-found')
    err.status = 404
    throw err
  }
  if (row.user_id && row.user_id === userId) return row
  if (row.workspace_id) {
    const wsIds = await workspaceIdsForUser(userId)
    if (wsIds.includes(row.workspace_id)) return row
  }
  const err = new Error('forbidden')
  err.status = 403
  throw err
}
