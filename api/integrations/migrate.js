// POST /api/integrations/migrate
// Body: { connection_id, workspace_id }
// Caller must (a) own the connection (user_id === auth.uid()), AND
//             (b) be a member of the target workspace.
// Effect: nulls user_id, sets workspace_id on the row. Tokens stay valid.

import { extractJwt } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function svcHeaders() {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
}

async function getUserId(req) {
  const jwt = extractJwt(req)
  if (!jwt) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  return user?.id || null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const { connection_id, workspace_id } = req.body || {}
  if (!connection_id || !workspace_id) {
    return res.status(400).json({ error: 'connection_id + workspace_id required' })
  }

  // (a) caller owns the connection
  const ownCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connection_id}&select=id,user_id,workspace_id,integration_slug,config&limit=1`,
    { headers: svcHeaders() },
  )
  const ownRow = ownCheck.ok ? (await ownCheck.json())[0] : null
  if (!ownRow) return res.status(404).json({ error: 'connection-not-found' })
  if (ownRow.user_id !== userId) return res.status(403).json({ error: 'not-owner' })
  if (ownRow.workspace_id) return res.status(400).json({ error: 'already-workspace-owned' })

  // (b) caller is a member of the workspace
  const memCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/tenant_users?user_id=eq.${userId}&tenant_id=eq.${workspace_id}&select=tenant_id&limit=1`,
    { headers: svcHeaders() },
  )
  const memRow = memCheck.ok ? (await memCheck.json())[0] : null
  if (!memRow) return res.status(403).json({ error: 'not-workspace-member' })

  // Detect collision: another row already owns this (workspace, slug, email).
  const accountEmail = ownRow.config?.account_email || ''
  const collisionCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?workspace_id=eq.${workspace_id}&integration_slug=eq.${ownRow.integration_slug}&config->>account_email=eq.${encodeURIComponent(accountEmail)}&select=id&limit=1`,
    { headers: svcHeaders() },
  )
  const collision = collisionCheck.ok ? (await collisionCheck.json())[0] : null
  if (collision) return res.status(409).json({ error: 'workspace-already-has-this-account' })

  // Flip ownership: user_id -> null, workspace_id -> set.
  const patch = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connection_id}`,
    {
      method: 'PATCH',
      headers: { ...svcHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: null,
        workspace_id,
        config: { ...(ownRow.config || {}), migrated_at: new Date().toISOString(), migrated_by: userId },
      }),
    },
  )
  if (!patch.ok) {
    const text = await patch.text().catch(() => '')
    return res.status(502).json({ error: 'migrate-failed', detail: text.slice(0, 200) })
  }
  return res.status(200).json({ ok: true })
}
