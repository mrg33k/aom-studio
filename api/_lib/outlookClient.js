// Microsoft Graph / Outlook API client (R1, 2026-08-06)
// Mirrors gmailClient.js: loads + decrypts + auto-refreshes a user's Outlook
// OAuth tokens, then exposes a thin fetch helper that targets
// https://graph.microsoft.com/v1.0/me/* with the right Authorization header.
//
// Token blob: account_integrations.config.tokens (AES-GCM-encrypted JSON).
// When the access_token is past its expiry we POST to Microsoft's token endpoint
// with the refresh_token (Microsoft issues refresh tokens via the offline_access
// scope) and write the new blob back to Supabase before returning the bearer.
//
// Key differences from Gmail:
//   - Token refresh: POST to common/oauth2/v2.0/token with grant_type=refresh_token
//   - Profile: GET /v1.0/me — returns mail, userPrincipalName, displayName
//   - Mail API: GET /v1.0/me/messages (OData query params, not Gmail-style labels)
//   - Scopes: passed inline as offline_access (no access_type=offline param)

import { decryptJson, encryptJson } from './oauthCrypto.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me'

async function loadConnectionRow(connectionId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connectionId}&integration_slug=eq.outlook&select=id,user_id,workspace_id,config,connected_at,updated_at&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!r.ok) return null
  const rows = await r.json()
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function writeConnectionRow(connectionId, configPatch) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connectionId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ config: configPatch, updated_at: new Date().toISOString() }),
    },
  )
  return r.ok
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
    // same permission set. Without this, incremental consent may downgrade scopes
    // on quiet re-auths.
    scope: 'openid email profile offline_access User.Read Mail.Read Mail.ReadWrite',
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

// Soft-heal: if the account_email is missing from the row, fetch it from Graph
// and patch it in. Fires once per connection row; non-blocking from caller's POV.
async function backfillAccountEmail(connectionId, row, accessToken) {
  try {
    if (!row || row.integration_slug !== 'outlook') return
    if (row.config && row.config.account_email) return
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (!r.ok) return
    const data = await r.json()
    const email = data.mail || data.userPrincipalName || null
    if (!email) return
    const nextConfig = {
      ...(row.config || {}),
      account_email: email,
      profile: { ...(row.config?.profile || {}), emailAddress: email, displayName: data.displayName || null },
    }
    await writeConnectionRow(connectionId, nextConfig)
    row.config = nextConfig
  } catch { /* soft-fail; cosmetic only */ }
}

// Returns { accessToken, profile, row } for a specific connection row id.
// Caller is responsible for access-checking via mailAccess.assertCanUseConnection.
// Returns null if the connection doesn't exist or tokens are unusable.
export async function getOutlookTokenByConnection(connectionId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const row = await loadConnectionRow(connectionId)
  if (!row || !row.config || !row.config.tokens) return null

  const tokens = decryptJson(row.config.tokens)
  const now = Date.now()
  const expiresAt = tokens.expires_at
    || (tokens.expires_in && row.connected_at
        ? new Date(row.connected_at).getTime() + tokens.expires_in * 1000
        : 0)

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
    // Microsoft may rotate refresh_token on each exchange; always take the new one if present.
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    token_type: refreshed.token_type || tokens.token_type,
    scope: refreshed.scope || tokens.scope,
  }
  await writeConnectionRow(connectionId, {
    ...row.config,
    tokens: encryptJson(merged),
  })
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

// Resolve an Outlook connection id by account email.
// Returns the most-recently-updated connection for the given email, or null.
export async function resolveOutlookConnectionIdByEmail(accountEmail) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !accountEmail) return null
  const emailEnc = encodeURIComponent(accountEmail)
  const svcHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }

  // Workspace-owned first (canonical for shared team inboxes), then user-owned.
  const wsR = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?workspace_id=not.is.null&integration_slug=eq.outlook&config->>account_email=eq.${emailEnc}&select=id&order=updated_at.desc&limit=1`,
    { headers: svcHeaders },
  )
  if (wsR.ok) {
    const rows = await wsR.json()
    if (Array.isArray(rows) && rows.length) return rows[0].id
  }

  const userR = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?user_id=not.is.null&integration_slug=eq.outlook&config->>account_email=eq.${emailEnc}&select=id&order=updated_at.desc&limit=1`,
    { headers: svcHeaders },
  )
  if (userR.ok) {
    const rows = await userR.json()
    if (Array.isArray(rows) && rows.length) return rows[0].id
  }

  return null
}
