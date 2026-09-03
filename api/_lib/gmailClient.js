// Gmail API client: loads, decrypts and auto-refreshes a user's Gmail OAuth
// tokens, then exposes a thin fetch helper that targets
// https://gmail.googleapis.com/gmail/v1/users/me/* with the right
// Authorization header.
//
// corner:retire-supabase R3: the encrypted token blob lives in the Convex
// integrations table (integrations:getOAuthTokens / setOAuthTokens, slug
// "gmail"). The blob is the same AES-GCM JSON api/_lib/oauthCrypto.js has
// always produced; Convex never sees a plaintext refresh token. A connection
// is addressed by its connectionId (default `gmail:<userId>`), which is what
// the mail routes carry around as the connection id.

import { decryptJson, encryptJson } from './oauthCrypto.js'
import { extractJwt, getUserFromJwt, convexQuery, convexMutation } from './verifyTenant.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const SLUG = 'gmail'

export async function getUserIdFromRequest(req) {
  const jwt = extractJwt(req)
  if (!jwt) return null
  const user = await getUserFromJwt(jwt)
  return user?.id || null
}

// Convex row -> the row shape the callers read (config.tokens, config.profile,
// config.account_email, connected_at, user_id, workspace_id).
function legacyRow(row, { userId = null, connectionId = null } = {}) {
  if (!row || !row.ciphertext) return null
  const email = row.email || null
  return {
    id: row.connectionId || connectionId || null,
    user_id: userId,
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

async function loadRow(userId) {
  const row = await convexQuery('integrations:getOAuthTokens', { userId, slug: SLUG })
  return legacyRow(row, { userId })
}

async function loadConnectionRow(connectionId) {
  const row = await convexQuery('integrations:getOAuthTokens', { connectionId, slug: SLUG })
  return legacyRow(row, { connectionId })
}

// Write the refreshed blob back. `expiresAt` (ms) lets the next reader skip
// the decrypt when the token is plainly fresh.
// setOAuthTokens needs the owner. The default connection id is
// `gmail:<userId>`, so a connection-only caller can still name the owner.
function ownerFromConnectionId(connectionId) {
  const m = String(connectionId || '').match(/^gmail:(.+)$/)
  return m ? m[1] : null
}

async function writeTokens({ userId, connectionId, tokens, email, workspaceId }) {
  try {
    const r = await convexMutation('integrations:setOAuthTokens', {
      userId: userId || ownerFromConnectionId(connectionId) || undefined,
      connectionId: connectionId || undefined,
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

function expiryOf(tokens) {
  return tokens.expires_at || 0
}

async function freshAccessToken(row, { userId, connectionId }) {
  const tokens = decryptJson(row.config.tokens)
  const now = Date.now()
  const expiresAt = expiryOf(tokens)
  if (tokens.access_token && (!expiresAt || expiresAt - now > 60_000)) {
    return { accessToken: tokens.access_token, tokens }
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
  await writeTokens({ userId, connectionId, tokens: merged, email: row.config.account_email, workspaceId: row.workspace_id })
  return { accessToken: merged.access_token, tokens: merged }
}

// Returns { accessToken, profile } or null if Gmail is not connected for this
// user. Caller should respond 401 with {error:'integration:not-connected'} in
// that case so the UI can render the "Connect Gmail" empty state.
export async function getGmailToken(userId) {
  if (!userId) return null
  const row = await loadRow(userId)
  if (!row) return null
  const fresh = await freshAccessToken(row, { userId })
  if (!fresh) return null
  return { accessToken: fresh.accessToken, profile: row.config.profile || null }
}

// Self-heal: fetch the Gmail profile and store the account email when the row
// has none. Fires once per connection; non-blocking from the caller's view.
async function backfillAccountEmail(connectionId, row, accessToken) {
  try {
    if (!row || row.config?.account_email) return
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) return
    const profile = await r.json()
    const email = profile && profile.emailAddress
    if (!email) return
    const tokens = decryptJson(row.config.tokens)
    await writeTokens({ connectionId, tokens, email, workspaceId: row.workspace_id })
    row.config = { ...(row.config || {}), account_email: email, profile: { ...(row.config?.profile || {}), emailAddress: email } }
  } catch { /* soft-fail; cosmetic only */ }
}

// Same shape as getGmailToken but keyed on a specific connection id.
// Caller is responsible for checking access via mailAccess.assertCanUseConnection.
export async function getGmailTokenByConnection(connectionId) {
  if (!connectionId) return null
  const row = await loadConnectionRow(connectionId)
  if (!row) return null
  const fresh = await freshAccessToken(row, { connectionId })
  if (!fresh) return null
  await backfillAccountEmail(connectionId, row, fresh.accessToken)
  return { accessToken: fresh.accessToken, profile: row.config.profile || null, row }
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

// Resolve a Gmail connection id by account email. Used by the internal mail
// endpoints so agents can pass account_email instead of a connection id.
// The connection belongs to the Convex user with that email (the shared
// hello@ inbox is the hello@ account's own connection). Returns null when no
// such user or no Gmail connection exists.
export async function resolveConnectionIdByEmail(accountEmail) {
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
