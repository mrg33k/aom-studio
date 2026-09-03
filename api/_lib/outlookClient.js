// Microsoft Graph / Outlook API client. Mirrors gmailClient.js: loads,
// decrypts and auto-refreshes a user's Outlook OAuth tokens, then exposes a
// thin fetch helper that targets https://graph.microsoft.com/v1.0/me/*.
//
// corner:retire-supabase R3: the encrypted token blob lives in the Convex
// integrations table (integrations:getOAuthTokens / setOAuthTokens, slug
// "outlook"), addressed by connectionId.
//
// Key differences from Gmail:
//   - Token refresh: POST to common/oauth2/v2.0/token with grant_type=refresh_token
//   - Profile: GET /v1.0/me returns mail, userPrincipalName, displayName
//   - Mail API: GET /v1.0/me/messages (OData query params, not Gmail-style labels)
//   - Scopes: passed inline as offline_access (no access_type=offline param)

import { decryptJson, encryptJson } from './oauthCrypto.js'
import { convexQuery, convexMutation } from './verifyTenant.js'

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me'
const SLUG = 'outlook'

function legacyRow(row, connectionId) {
  if (!row || !row.ciphertext) return null
  const email = row.email || null
  return {
    id: row.connectionId || connectionId || null,
    user_id: null,
    workspace_id: row.workspaceId || null,
    integration_slug: SLUG,
    connected_at: null,
    updated_at: null,
    config: {
      tokens: row.ciphertext,
      account_email: email,
      profile: email ? { emailAddress: email, email } : null,
    },
  }
}

async function loadConnectionRow(connectionId) {
  const row = await convexQuery('integrations:getOAuthTokens', { connectionId, slug: SLUG })
  return legacyRow(row, connectionId)
}

// setOAuthTokens needs the owner. The default connection id is
// `outlook:<userId>`, so a connection-only caller can still name the owner.
function ownerFromConnectionId(connectionId) {
  const m = String(connectionId || '').match(/^outlook:(.+)$/)
  return m ? m[1] : null
}

async function writeTokens({ connectionId, tokens, email, workspaceId }) {
  try {
    const r = await convexMutation('integrations:setOAuthTokens', {
      userId: ownerFromConnectionId(connectionId) || undefined,
      connectionId,
      slug: SLUG,
      ciphertext: encryptJson(tokens),
      email: email || undefined,
      expiresAt: tokens.expires_at || undefined,
      workspaceId: workspaceId || undefined,
    })
    return !!(r && r.ok)
  } catch {
    return false
  }
}

async function refresh(refreshToken) {
  const clientId = process.env.OUTLOOK_OAUTH_CLIENT_ID
  const clientSecret = process.env.OUTLOOK_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('outlook-oauth-creds-missing')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    // Restate the scopes so Microsoft always returns an updated token with the
    // same permission set. Includes .Shared variants so existing connections
    // gain shared-mailbox access on the next refresh.
    scope: 'openid email profile offline_access User.Read Mail.Read Mail.ReadWrite Mail.Read.Shared Mail.ReadWrite.Shared',
  })
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    const err = new Error(`outlook-refresh ${r.status}: ${text.slice(0, 200)}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

// Soft-heal: if the account email is missing from the row, fetch it from Graph
// and store it. Fires once per connection; non-blocking from the caller's view.
async function backfillAccountEmail(connectionId, row, accessToken) {
  try {
    if (!row || row.config?.account_email) return
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (!r.ok) return
    const data = await r.json()
    const email = data.mail || data.userPrincipalName || null
    if (!email) return
    const tokens = decryptJson(row.config.tokens)
    await writeTokens({ connectionId, tokens, email, workspaceId: row.workspace_id })
    row.config = {
      ...(row.config || {}),
      account_email: email,
      profile: { ...(row.config?.profile || {}), emailAddress: email, displayName: data.displayName || null },
    }
  } catch { /* soft-fail; cosmetic only */ }
}

// Returns { accessToken, profile, row } for a specific connection id.
// Caller is responsible for access-checking via mailAccess.assertCanUseConnection.
// Returns null if the connection does not exist or tokens are unusable.
export async function getOutlookTokenByConnection(connectionId) {
  if (!connectionId) return null
  const row = await loadConnectionRow(connectionId)
  if (!row) return null

  const tokens = decryptJson(row.config.tokens)
  const now = Date.now()
  const expiresAt = tokens.expires_at || 0

  if (tokens.access_token && (!expiresAt || expiresAt - now > 60_000)) {
    await backfillAccountEmail(connectionId, row, tokens.access_token)
    return { accessToken: tokens.access_token, profile: row.config.profile || null, row }
  }

  if (!tokens.refresh_token) return null
  const refreshed = await refresh(tokens.refresh_token)
  const merged = {
    ...tokens,
    access_token: refreshed.access_token,
    expires_in: refreshed.expires_in,
    expires_at: Date.now() + (refreshed.expires_in || 0) * 1000,
    // Microsoft may rotate refresh_token on each exchange; always take the new one.
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    token_type: refreshed.token_type || tokens.token_type,
    scope: refreshed.scope || tokens.scope,
  }
  await writeTokens({ connectionId, tokens: merged, email: row.config.account_email, workspaceId: row.workspace_id })
  await backfillAccountEmail(connectionId, row, merged.access_token)
  return { accessToken: merged.access_token, profile: row.config.profile || null, row }
}

// Thin fetch wrapper for Microsoft Graph /v1.0/me endpoints.
// Pass an absolute URL or a path that gets prefixed with GRAPH_BASE.
export async function graphFetch(accessToken, path, init = {}) {
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    ...(init.headers || {}),
  }
  return fetch(url, { ...init, headers })
}

// Resolve a Graph path to either the signed-in user's mailbox (/v1.0/me/...)
// or a shared/delegated mailbox (/v1.0/users/{address}/...).
//
//   relPath        the path segment after the mailbox root
//   mailboxAddress the target mailbox email address, or null for the signed-in user
//   ownEmail       the account email on the connection; if mailboxAddress matches
//                  it (case-insensitive) we still use /me for reliability
//
// Shared mailboxes in Microsoft 365 are separate mailbox objects identified by
// their SMTP address. The delegated Graph path is /v1.0/users/{sharedAddress}/...
// even when the signed-in user holds Full Access; the same token is used.
export function buildMailboxPath(relPath, mailboxAddress, ownEmail) {
  if (!mailboxAddress) return relPath
  const isOwn = ownEmail
    && mailboxAddress.trim().toLowerCase() === ownEmail.trim().toLowerCase()
  if (isOwn) return relPath
  return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailboxAddress.trim())}${relPath}`
}

// Translate a Graph 403 on a shared mailbox into a human message.
// Returns null if the error is not a shared-mailbox-access issue.
export function sharedMailboxAccessError(graphStatus, mailboxAddress) {
  if (graphStatus !== 403) return null
  const box = mailboxAddress || 'this mailbox'
  return (
    `Your admin needs to grant you Full Access delegation on ${box} ` +
    'in the Microsoft 365 admin center before it can be read here. ' +
    'Ask your Exchange/M365 admin to add a Full Access delegation under ' +
    'Recipients > Mailboxes > [the shared mailbox] > Mailbox delegation.'
  )
}

// Resolve an Outlook connection id by account email: the connection of the
// Convex user with that email. Returns null when none exists.
export async function resolveOutlookConnectionIdByEmail(accountEmail) {
  const email = String(accountEmail || '').trim().toLowerCase()
  if (!email) return null
  try {
    const user = await convexQuery('users:getByEmail', { email })
    if (!user?._id) return null
    const row = await convexQuery('integrations:getOAuthTokens', { userId: String(user._id), slug: SLUG })
    return row?.connectionId ? String(row.connectionId) : null
  } catch {
    return null
  }
}
