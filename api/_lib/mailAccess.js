// Resolves mail connections (Gmail + Outlook) visible to a user against the
// workspace-owned model. A connection is either user-owned (config in
// account_integrations with user_id set) or workspace-owned (workspace_id set
// and the user is a member of that workspace via tenant_users).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// R12 (2026-05-25) — required Gmail scopes for a connection to actually be
// usable. A row missing either of these is treated as "not connected" and
// hidden from the rail so the user gets the Connect prompt again. The same
// list is enforced in api/integrations/oauth/callback.js — keep in sync.
const GMAIL_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
]

// R1 (2026-08-06) — required Outlook/Graph scopes. User.Read identifies the
// account; Mail.Read lets us pull the inbox. Keep in sync with oauthProviders.js
// requiredScopes for outlook and outlookClient.js.
const OUTLOOK_REQUIRED_SCOPES = ['User.Read', 'Mail.Read']

// R3 (2026-08-06) — Outlook shared-mailbox scopes. These are checked separately
// (not in OUTLOOK_REQUIRED_SCOPES) because a connection is still valid for the
// user's own mailbox even if the tenant hasn't granted .Shared scopes. The
// listConnectionsForUser response surfaces whether the token covers shared access.
const OUTLOOK_SHARED_SCOPES = ['Mail.Read.Shared', 'Mail.ReadWrite.Shared']

// Mail slugs supported by the personal inbox reader.
// Add 'outlook' here; it is now wired with a real OAuth flow.
const MAIL_SLUGS = ['gmail', 'outlook']

function hasAllScopes(grantedScopes, required) {
  if (!Array.isArray(grantedScopes)) return false
  const set = new Set(grantedScopes)
  return required.every(s => set.has(s))
}

function hasUsableMailScopes(slug, grantedScopes) {
  if (slug !== 'gmail') return hasAllScopes(grantedScopes, OUTLOOK_REQUIRED_SCOPES)
  // Existing full-access connections remain valid; new public onboarding uses
  // the materially narrower readonly grant.
  return hasAllScopes(grantedScopes, GMAIL_REQUIRED_SCOPES)
    || grantedScopes?.includes('https://www.googleapis.com/auth/gmail.modify')
}

function requiredScopesFor(slug) {
  if (slug === 'outlook') return OUTLOOK_REQUIRED_SCOPES
  return GMAIL_REQUIRED_SCOPES
}

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
  // Query for all supported mail slugs (gmail + outlook) in one round trip.
  // PostgREST IN filter: integration_slug=in.(gmail,outlook)
  const slugFilter = `integration_slug=in.(${MAIL_SLUGS.join(',')})`
  const url = `${SUPABASE_URL}/rest/v1/account_integrations?or=(${filters.join(',')})&${slugFilter}&status=eq.connected&select=id,user_id,workspace_id,connected_at,config,integration_slug`
  const r = await fetch(url, { headers: svcHeaders() })
  if (!r.ok) return []
  const rows = await r.json()
  if (!Array.isArray(rows)) return []
  // Hide any row where the granted OAuth scopes are missing the bits that make
  // the connection actually functional. Per-slug scope requirements differ.
  // Rows from before R12 have no config.granted_scopes → treated as insufficient.
  return rows
    .filter(row => hasUsableMailScopes(row.integration_slug, row.config?.granted_scopes))
    .map(row => {
      const isOutlook = row.integration_slug === 'outlook'
      const ownEmail = row.config?.account_email || null

      // Build the mailboxes array for Outlook connections.
      // The primary mailbox is always the signed-in account. extra_mailboxes
      // (stored in config by an admin) adds shared mailboxes reachable via the
      // same delegated token with Mail.Read.Shared / Mail.ReadWrite.Shared.
      // extra_mailboxes shape: [{address, label, type}] where type = 'shared'
      //   or 'distribution_list' (read-only, no inbox — surface a warning in the UI).
      let mailboxes = null
      if (isOutlook && ownEmail) {
        mailboxes = [{ address: ownEmail, label: row.config?.profile?.displayName || ownEmail, type: 'primary' }]
        const extras = row.config?.extra_mailboxes
        if (Array.isArray(extras) && extras.length) {
          for (const box of extras) {
            if (box && box.address) {
              mailboxes.push({
                address: box.address,
                label: box.label || box.address,
                type: box.type || 'shared',
              })
            }
          }
        }
      }

      // Indicate whether the token covers shared-mailbox access.
      // If the .Shared scopes are missing, shared mailboxes will 403 on Graph.
      // This lets the UI warn Karen BEFORE she selects a shared mailbox.
      const hasSharedAccess = isOutlook
        ? hasAllScopes(row.config?.granted_scopes, OUTLOOK_SHARED_SCOPES)
        : null  // not applicable to Gmail

      return {
        id: row.id,
        user_id: row.user_id,
        workspace_id: row.workspace_id,
        integration_slug: row.integration_slug,
        provider: row.integration_slug,
        scope: row.workspace_id ? 'team' : 'personal',
        account_email: ownEmail,
        connector_user_id: row.config?.connector_user_id || null,
        connected_at: row.connected_at,
        // Outlook only — list of mailboxes addressable through this connection.
        // null for Gmail connections.
        mailboxes,
        // Outlook only — whether the token includes Mail.Read.Shared access.
        // null for Gmail. false means shared mailboxes will fail until Karen
        // re-authorises (or the token refreshes with the new .Shared scopes).
        has_shared_access: hasSharedAccess,
      }
    })
}

export async function assertCanUseConnection(userId, connectionId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connectionId}&select=id,user_id,workspace_id,integration_slug&limit=1`,
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
