// Resolves the mail connections (Gmail + Outlook) a user may use. A connection
// is either the user's own (their integrations row) or workspace-owned (the
// row carries a workspaceId and the user is a member of that world).
//
// corner:retire-supabase R3: reads the Convex integrations table
// (integrations:getOAuthTokens by user or connectionId) and memberships
// (worlds:membership) instead of account_integrations and tenant_users.
// Granted OAuth scopes are not stored on the Convex row, so a connection with
// a token blob counts as connected; the OAuth callback enforces the required
// scopes at connect time.

import { convexQuery } from './verifyTenant.js'

// Mail slugs supported by the personal inbox reader.
const MAIL_SLUGS = ['gmail', 'outlook']

function connectionShape(row, slug, userId) {
  const isOutlook = slug === 'outlook'
  const ownEmail = row.email || null
  let mailboxes = null
  if (isOutlook && ownEmail) {
    mailboxes = [{ address: ownEmail, label: ownEmail, type: 'primary' }]
  }
  return {
    id: row.connectionId,
    user_id: userId || null,
    workspace_id: row.workspaceId || null,
    integration_slug: slug,
    provider: slug,
    scope: row.workspaceId ? 'team' : 'personal',
    account_email: ownEmail,
    connector_user_id: null,
    connected_at: null,
    // Outlook only: the mailboxes addressable through this connection.
    mailboxes,
    // Outlook only: whether the token includes Mail.Read.Shared access. Not
    // recorded on the Convex row, so unknown (null) rather than false.
    has_shared_access: null,
  }
}

export async function listConnectionsForUser(userId) {
  if (!userId) return []
  const out = []
  for (const slug of MAIL_SLUGS) {
    let row = null
    try {
      row = await convexQuery('integrations:getOAuthTokens', { userId, slug })
    } catch {
      row = null
    }
    if (row && row.ciphertext && row.connectionId) out.push(connectionShape(row, slug, userId))
  }
  return out
}

async function findConnection(connectionId) {
  for (const slug of MAIL_SLUGS) {
    let row = null
    try {
      row = await convexQuery('integrations:getOAuthTokens', { connectionId, slug })
    } catch {
      row = null
    }
    if (row && row.connectionId) return { row, slug }
  }
  return null
}

export async function assertCanUseConnection(userId, connectionId) {
  const found = await findConnection(String(connectionId || ''))
  if (!found) {
    const err = new Error('connection-not-found')
    err.status = 404
    throw err
  }
  const { row, slug } = found
  const shape = connectionShape(row, slug, null)
  // The user's own connection: the row the user resolves to by slug carries
  // the same connectionId.
  try {
    const own = await convexQuery('integrations:getOAuthTokens', { userId, slug })
    if (own && own.connectionId && String(own.connectionId) === String(row.connectionId)) {
      return { ...shape, user_id: userId }
    }
  } catch { /* fall through to the workspace arm */ }
  // A workspace-owned connection: the user must belong to that world.
  if (row.workspaceId) {
    try {
      const membership = await convexQuery('worlds:membership', { worldId: String(row.workspaceId), userId })
      if (membership && membership.role) return shape
    } catch { /* denied below */ }
  }
  const err = new Error('forbidden')
  err.status = 403
  throw err
}
