// Google Calendar API client — loads + decrypts + auto-refreshes a user's Google
// Calendar OAuth tokens, then exposes helpers for freeBusy queries and event creation
// against https://www.googleapis.com/calendar/v3.
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
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

async function loadRow(userId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.google-calendar&select=config,connected_at,updated_at&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!r.ok) return null
  const rows = await r.json()
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

async function writeRow(userId, configPatch) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.google-calendar`,
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
    const err = new Error(`calendar-refresh ${r.status}: ${text.slice(0, 200)}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

// Returns { accessToken, profile } or null if Google Calendar isn't connected.
// Caller should respond with appropriate error state (graceful fallback to mock slots).
export async function getCalendarToken(userId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const row = await loadRow(userId)
  if (!row || !row.config || !row.config.tokens) return null

  const tokens = decryptJson(row.config.tokens)
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

export async function calendarFetch(accessToken, path, init = {}) {
  const url = path.startsWith('http') ? path : `${CALENDAR_BASE}${path}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  }
  const r = await fetch(url, { ...init, headers })
  return r
}
