// Gmail API client — loads + decrypts + auto-refreshes a user's Gmail OAuth
// tokens, then exposes a thin fetch helper that targets
// https://gmail.googleapis.com/gmail/v1/users/me/* with the right
// Authorization header.
//
// The token blob lives in supabase: account_integrations.config.tokens
// (AES-GCM-encrypted JSON, see api/_lib/oauthCrypto.js). When the access_token
// is past its expiry we POST to Google's token endpoint with the refresh_token
// and write the new blob back to supabase before returning the bearer.

import { decryptJson, encryptJson } from './oauthCrypto.js'
import { extractJwt } from './verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export async function getUserIdFromRequest(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const jwt = extractJwt(req)
  if (!jwt) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  return user?.id || null
}

async function loadRow(userId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.gmail&select=config,connected_at,updated_at&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!r.ok) return null
  const rows = await r.json()
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function writeRow(userId, configPatch) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.gmail`,
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
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('google-oauth-creds-missing')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
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
    const err = new Error(`gmail-refresh ${r.status}: ${text.slice(0, 200)}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

// Returns { accessToken, profile } or null if Gmail isn't connected for this
// user. Caller should respond 401 with {error:'integration:not-connected'} in
// that case so the UI can render the "Connect Gmail" empty state.
export async function getGmailToken(userId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const row = await loadRow(userId)
  if (!row || !row.config || !row.config.tokens) return null

  const tokens = decryptJson(row.config.tokens)
  // Google returns expires_in (seconds). callback.js stores tokens as-is, so
  // we compute absolute expiry from connected_at + expires_in unless an
  // explicit expires_at is already set (later writes do this).
  const now = Date.now()
  const expiresAt = tokens.expires_at
    || (tokens.expires_in && row.connected_at
        ? new Date(row.connected_at).getTime() + tokens.expires_in * 1000
        : 0)

  if (tokens.access_token && (!expiresAt || expiresAt - now > 60_000)) {
    return { accessToken: tokens.access_token, profile: row.config.profile || null }
  }

  if (!tokens.refresh_token) return null
  const refreshed = await refresh(tokens.refresh_token)
  const merged = {
    ...tokens,
    access_token: refreshed.access_token,
    expires_in: refreshed.expires_in,
    expires_at: Date.now() + (refreshed.expires_in || 0) * 1000,
    // Google sometimes rotates refresh_token; if it sent a new one, store it.
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    token_type: refreshed.token_type || tokens.token_type,
    scope: refreshed.scope || tokens.scope,
  }
  await writeRow(userId, {
    ...row.config,
    tokens: encryptJson(merged),
  })
  return { accessToken: merged.access_token, profile: row.config.profile || null }
}


async function loadConnectionRow(connectionId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${connectionId}&integration_slug=eq.gmail&select=id,user_id,workspace_id,config,connected_at,updated_at&limit=1`,
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

// Self-heal: fetch Gmail profile and patch row.config.account_email if missing.
// Only fires when the row is a Gmail connection AND account_email isn't set —
// once patched it never fires again. Non-blocking from the caller's POV via
// catch().
async function backfillAccountEmail(connectionId, row, accessToken) {
  try {
    if (!row || row.integration_slug !== 'gmail') return
    if (row.config && row.config.account_email) return
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) return
    const profile = await r.json()
    const email = profile && profile.emailAddress
    if (!email) return
    const nextConfig = { ...(row.config || {}), account_email: email, profile: { ...(row.config?.profile || {}), emailAddress: email } }
    await writeConnectionRow(connectionId, nextConfig)
    row.config = nextConfig
  } catch { /* soft-fail; cosmetic only */ }
}

// Same shape as getGmailToken but keyed on a specific connection row id.
// Caller is responsible for checking access via mailAccess.assertCanUseConnection.
export async function getGmailTokenByConnection(connectionId) {
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

export async function gmailFetch(accessToken, path, init = {}) {
  const url = path.startsWith('http') ? path : `${GMAIL_BASE}${path}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...(init.headers || {}),
  }
  const r = await fetch(url, { ...init, headers })
  return r
}

// Decode a Gmail RFC 4648 base64url-encoded message body to UTF-8 string.
export function decodeBase64Url(b64url) {
  if (!b64url) return ''
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64').toString('utf-8')
}
