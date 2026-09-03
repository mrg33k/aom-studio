// Google Calendar API client: loads, decrypts and auto-refreshes a user's
// Google Calendar OAuth tokens, then exposes helpers for freeBusy queries and
// event creation against https://www.googleapis.com/calendar/v3.
//
// corner:retire-supabase R3: the encrypted token blob lives in the Convex
// integrations table (integrations:getOAuthTokens / setOAuthTokens, slug
// "google-calendar"), keyed by the user.

import { decryptJson, encryptJson } from './oauthCrypto.js'
import { convexQuery, convexMutation } from './verifyTenant.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const SLUG = 'google-calendar'

async function loadRow(userId) {
  const row = await convexQuery('integrations:getOAuthTokens', { userId, slug: SLUG })
  if (!row || !row.ciphertext) return null
  const email = row.email || null
  return {
    workspace_id: row.workspaceId || null,
    config: {
      tokens: row.ciphertext,
      account_email: email,
      profile: email ? { emailAddress: email, email } : null,
    },
  }
}

async function writeTokens(userId, row, tokens) {
  try {
    const r = await convexMutation('integrations:setOAuthTokens', {
      userId,
      slug: SLUG,
      ciphertext: encryptJson(tokens),
      email: row?.config?.account_email || undefined,
      expiresAt: tokens.expires_at || undefined,
      workspaceId: row?.workspace_id || undefined,
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
    const err = new Error(`calendar-refresh ${r.status}: ${text.slice(0, 200)}`)
    err.status = r.status
    throw err
  }
  return r.json()
}

// Returns { accessToken, profile } or null if Google Calendar is not connected.
// Caller should fall back gracefully (mock slots) in that case.
export async function getCalendarToken(userId) {
  if (!userId) return null
  const row = await loadRow(userId)
  if (!row) return null

  const tokens = decryptJson(row.config.tokens)
  const now = Date.now()
  const expiresAt = tokens.expires_at || 0

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
  await writeTokens(userId, row, merged)
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
