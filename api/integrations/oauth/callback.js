// GET /api/integrations/oauth/callback?code=...&state=...
// The redirect target every OAuth provider hits after the user approves.
// Steps:
//   1. Verify state HMAC + age (10min window) — extracts user_id + slug.
//   2. Look up provider config + client creds.
//   3. POST to provider's token endpoint to exchange code for access/refresh.
//   4. AES-GCM encrypt the token blob, store it on the Convex integrations row.
//   5. 302 back to /dashboard?integrations=connected&slug=<x> so the modal
//      can show success on next open.
//
// corner:retire-supabase (2026-09-03): the encrypted blob used to be upserted
// into the Supabase account_integrations table. It now goes to the Convex
// integrations table through integrations:setOAuthTokens (one row per user +
// provider; the connectionId is what the mail clients address). The
// diagnostic trail goes to the Convex events table through tasks:logEvent.
// A scope-insufficient consent clears the row with integrations:disconnect.

import { getProvider, getProviderCreds, buildRedirectUri } from '../../_lib/oauthProviders.js'
import { verifyState, encryptJson } from '../../_lib/oauthCrypto.js'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || ''
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://aheadofmarket.com'

async function convex(kind, path, args) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}

const withKey = (args) => (CONVEX_KEY ? { key: CONVEX_KEY, ...args } : args)

// Best-effort persistent diagnostic. Writes to the events table so we can
// query the failure trail long after Vercel rotates its runtime logs.
async function logEvent(eventType, payload) {
  try {
    await convex('mutation', 'tasks:logEvent', withKey({
      event: { agent: 'oauth-callback', event_type: eventType, payload, timestamp: new Date().toISOString() },
    }))
  } catch { /* never throw out of diagnostics */ }
}

// Append query params to a path that may or may not already have a query
// string. The path is trusted at this point — start.js validated it as a
// same-origin relative path before signing it into state.
function withParams(path, params) {
  const sep = path.includes('?') ? '&' : '?'
  const q = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return `${path}${sep}${q}`
}

function failRedirect(res, reason, returnTo) {
  const path = returnTo
    ? withParams(returnTo, { integrations: 'error', reason })
    : `/dashboard?integrations=error&reason=${encodeURIComponent(reason)}`
  res.setHeader('Location', `${APP_ORIGIN}${path}`)
  return res.status(302).end()
}

function successRedirect(res, slug, returnTo) {
  const path = returnTo
    ? withParams(returnTo, { integrations: 'connected', slug })
    : `/dashboard?integrations=connected&slug=${encodeURIComponent(slug)}`
  res.setHeader('Location', `${APP_ORIGIN}${path}`)
  return res.status(302).end()
}

async function exchangeCode(provider, creds, code, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  })
  const r = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`token exchange ${r.status}: ${text.slice(0, 200)}`)
  }
  // Some providers return JSON; GitHub historically returned form-encoded
  // but the Accept header above persuades it to use JSON.
  return r.json()
}

// Parse a space-separated OAuth scope string into a Set for membership checks.
function parseGrantedScopes(scopeStr) {
  if (!scopeStr || typeof scopeStr !== 'string') return new Set()
  return new Set(scopeStr.split(/\s+/).map(s => s.trim()).filter(Boolean))
}

// R12 (2026-05-25) — Clear any existing scope-insufficient connection so a
// half-granted consent (user skipped "Select all" on Google's granular
// permissions screen) doesn't linger pretending to be live.
async function deleteConnectionMatching({ userId, slug }) {
  try {
    const out = await convex('mutation', 'integrations:disconnect', withKey({ userId, slug }))
    return { ok: !!(out && out.ok) }
  } catch (e) {
    return { ok: false, error: (e.message || '').slice(0, 200) }
  }
}

async function upsertConnection({ userId, slug, tokenBlob, providerProfile, workspaceId, accountEmail, grantedScopes = [], expiresAt }) {
  try {
    // The profile and granted scope list ride inside the encrypted blob (see
    // the handler): the Convex row only carries the ciphertext, the account
    // email, the expiry and the owner.
    void providerProfile
    void grantedScopes
    const out = await convex('mutation', 'integrations:setOAuthTokens', withKey({
      userId,
      slug,
      ciphertext: tokenBlob,
      email: accountEmail || undefined,
      expiresAt: expiresAt || undefined,
      workspaceId: workspaceId || undefined,
    }))
    if (!out || !out.ok) return { ok: false, error: 'convex setOAuthTokens returned no ok' }
    return { ok: true, connectionId: out.connectionId || null }
  } catch (e) {
    return { ok: false, error: `convex setOAuthTokens: ${(e.message || '').slice(0, 200)}` }
  }
}

async function fetchGmailProfile(accessToken) {
  try {
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

// R1 (2026-08-06) — Fetch the signed-in Microsoft account identity from Graph /me.
// Normalises the result to { emailAddress, displayName } so downstream code has a
// consistent profile shape regardless of whether the account is a personal Microsoft
// account (mail field) or a work/school account (userPrincipalName field).
async function fetchOutlookProfile(accessToken) {
  try {
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (!r.ok) return null
    const data = await r.json()
    // Personal accounts: data.mail is the email. Work/school accounts may have
    // data.mail null (no assigned mailbox) and fall back to userPrincipalName.
    const emailAddress = data.mail || data.userPrincipalName || null
    return { emailAddress, displayName: data.displayName || null }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const { code, state, error: providerError } = req.query || {}
  console.log('[oauth/callback] hit', { hasCode: !!code, hasState: !!state, providerError: providerError || null })
  await logEvent('oauth_callback_hit', { hasCode: !!code, hasState: !!state, providerError: providerError || null })
  if (providerError) {
    console.warn('[oauth/callback] provider error', providerError)
    await logEvent('oauth_provider_error', { providerError })
    return failRedirect(res, `provider:${providerError}`, null)
  }
  if (!code || !state) {
    console.warn('[oauth/callback] missing code or state')
    await logEvent('oauth_missing_code_or_state', { hasCode: !!code, hasState: !!state })
    return failRedirect(res, 'missing-code-or-state', null)
  }

  const verified = verifyState(state.toString())
  if (!verified) {
    console.warn('[oauth/callback] invalid state')
    await logEvent('oauth_invalid_state', { stateLen: state.toString().length })
    return failRedirect(res, 'invalid-state', null)
  }

  const { userId, slug, returnTo, workspaceId } = verified
  console.log('[oauth/callback] verified', { userId, slug, hasReturnTo: !!returnTo })
  await logEvent('oauth_state_verified', { userId, slug, hasReturnTo: !!returnTo })
  const provider = getProvider(slug)
  if (!provider) {
    console.warn('[oauth/callback] unknown slug', slug)
    await logEvent('oauth_unknown_slug', { slug })
    return failRedirect(res, 'unknown-slug', returnTo)
  }
  const creds = getProviderCreds(slug)
  if (!creds) {
    console.warn('[oauth/callback] provider creds missing', slug, provider.envPrefix)
    await logEvent('oauth_provider_creds_missing', { slug, envPrefix: provider.envPrefix })
    return failRedirect(res, 'provider-creds-missing', returnTo)
  }

  let tokens
  try {
    tokens = await exchangeCode(provider, creds, code.toString(), buildRedirectUri(req))
    console.log('[oauth/callback] token exchange ok', {
      hasAccess: !!tokens.access_token,
      hasRefresh: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope ? tokens.scope.slice(0, 100) : null,
    })
    await logEvent('oauth_exchange_ok', {
      slug,
      hasAccess: !!tokens.access_token,
      hasRefresh: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope ? tokens.scope.slice(0, 200) : null,
    })
  } catch (e) {
    console.error('[oauth/callback] exchange-failed', e.message)
    await logEvent('oauth_exchange_failed', { slug, error: (e.message || '').slice(0, 500) })
    return failRedirect(res, `exchange-failed:${e.message?.slice(0, 80) || 'unknown'}`, returnTo)
  }

  // Pull provider profile early so the row carries the account email.
  let gmailProfile = null
  let outlookProfile = null
  let accountEmail = null
  if (slug === 'gmail' && tokens.access_token) {
    gmailProfile = await fetchGmailProfile(tokens.access_token)
    accountEmail = gmailProfile?.emailAddress || null
  }
  if (slug === 'outlook' && tokens.access_token) {
    outlookProfile = await fetchOutlookProfile(tokens.access_token)
    accountEmail = outlookProfile?.emailAddress || null
  }

  // R12 (2026-05-25) — validate granted scopes BEFORE storing. If the user
  // skipped "Select all" on Google's granular consent page, Google returns
  // a token whose scope list is missing the required Gmail scopes. Storing
  // it as 'connected' makes the UI lie. Instead: clear any prior partial
  // row for this owner/slug, then redirect with an explicit reason so the
  // user can re-grant.
  const grantedSet = parseGrantedScopes(tokens.scope)
  const required = Array.isArray(provider.requiredScopes) ? provider.requiredScopes : []
  const missingScopes = required.filter(s => !grantedSet.has(s))
  if (missingScopes.length > 0) {
    console.warn('[oauth/callback] scope-insufficient', { slug, missingScopes, granted: Array.from(grantedSet) })
    await logEvent('oauth_scope_insufficient', {
      slug,
      missingScopes,
      granted: Array.from(grantedSet),
      accountEmail,
    })
    // Best-effort cleanup of any partial row so the UI doesn't keep showing
    // "connected" for a useless connection. Failure here is non-fatal.
    await deleteConnectionMatching({ userId, slug })
    return failRedirect(res, `scope-insufficient:${missingScopes.map(s => s.split('/').pop()).join(',')}`, returnTo)
  }

  const obtainedAt = Date.now()
  const expiresAt = tokens.expires_in ? obtainedAt + Number(tokens.expires_in) * 1000 : null
  let encrypted
  try {
    encrypted = encryptJson({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_in: tokens.expires_in || null,
      expires_at: expiresAt,
      token_type: tokens.token_type || null,
      scope: tokens.scope || null,
      obtained_at: obtainedAt,
      // What the old row kept beside the tokens: the provider profile, the
      // account email and the plaintext scope list. They ride inside the
      // blob now so the gmail/outlook clients can keep reading them.
      account_email: accountEmail || null,
      profile: gmailProfile || outlookProfile || tokens.team || tokens.workspace_name || null,
      granted_scopes: Array.from(grantedSet),
      connector_user_id: userId,
    })
    console.log('[oauth/callback] encrypt ok', { blobLen: encrypted?.length })
    await logEvent('oauth_encrypt_ok', { slug, blobLen: encrypted?.length || 0 })
  } catch (e) {
    console.error('[oauth/callback] encrypt-failed', e.message)
    await logEvent('oauth_encrypt_failed', { slug, error: (e.message || '').slice(0, 500) })
    return failRedirect(res, `encrypt-failed:${e.message?.slice(0, 80) || 'unknown'}`, returnTo)
  }

  const upsert = await upsertConnection({
    userId,
    slug,
    tokenBlob: encrypted,
    providerProfile: gmailProfile || outlookProfile || tokens.team || tokens.workspace_name || null,
    workspaceId: workspaceId || null,
    accountEmail,
    grantedScopes: Array.from(grantedSet),
    expiresAt,
  })
  console.log('[oauth/callback] upsert', upsert)
  await logEvent('oauth_upsert', { slug, userId, ok: !!upsert.ok, connectionId: upsert.connectionId || null, error: upsert.error ? upsert.error.slice(0, 500) : null })
  if (!upsert.ok) {
    console.error('[oauth/callback] db-fail', upsert.error)
    return failRedirect(res, `db:${upsert.error.slice(0, 80)}`, returnTo)
  }

  console.log('[oauth/callback] success', { userId, slug })
  await logEvent('oauth_success', { slug, userId })
  return successRedirect(res, slug, returnTo)
}
