// GET /api/integrations/oauth/callback?code=...&state=...
// The redirect target every OAuth provider hits after the user approves.
// Steps:
//   1. Verify state HMAC + age (10min window) — extracts user_id + slug.
//   2. Look up provider config + client creds.
//   3. POST to provider's token endpoint to exchange code for access/refresh.
//   4. AES-GCM encrypt the token blob, upsert into account_integrations.
//   5. 302 back to /dashboard?integrations=connected&slug=<x> so the modal
//      can show success on next open.

import { getProvider, getProviderCreds, buildRedirectUri } from '../../_lib/oauthProviders.js'
import { verifyState, encryptJson } from '../../_lib/oauthCrypto.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://aheadofmarket.com'

// Best-effort persistent diagnostic. Writes to the events table so we can
// query the failure trail long after Vercel rotates its runtime logs.
async function logEvent(eventType, payload) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        agent: 'oauth-callback',
        event_type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      }),
    })
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

// R12 (2026-05-25) — Delete any existing scope-insufficient connection row
// so a half-granted consent (user skipped "Select all" on Google's granular
// permissions screen) doesn't linger pretending to be live. Mirrors the
// upsertConnection lookup branches but does a DELETE instead.
async function deleteConnectionMatching({ userId, slug, workspaceId, accountEmail }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, error: 'supabase env missing' }
  const svcHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  try {
    if (workspaceId) {
      const emailKey = encodeURIComponent(accountEmail || '')
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/account_integrations?workspace_id=eq.${workspaceId}&integration_slug=eq.${slug}&config->>account_email=eq.${emailKey}`,
        { method: 'DELETE', headers: { ...svcHeaders, Prefer: 'return=minimal' } },
      )
      return { ok: r.ok, status: r.status }
    }
    // Email-scoped when known, so a partial consent on one account doesn't
    // delete the user's other connected accounts (multi-account, 2026-06-09).
    const emailFilter = accountEmail
      ? `&config->>account_email=eq.${encodeURIComponent(accountEmail)}`
      : ''
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.${slug}${emailFilter}`,
      { method: 'DELETE', headers: { ...svcHeaders, Prefer: 'return=minimal' } },
    )
    return { ok: r.ok, status: r.status }
  } catch (e) {
    return { ok: false, error: (e.message || '').slice(0, 200) }
  }
}

async function upsertConnection({ userId, slug, tokenBlob, providerProfile, workspaceId, accountEmail, grantedScopes = [] }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, error: 'supabase env missing' }
  const svcHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  const now = new Date().toISOString()
  const ownerCols = workspaceId
    ? { workspace_id: workspaceId, user_id: null }
    : { user_id: userId, workspace_id: null }
  const body = {
    ...ownerCols,
    integration_slug: slug,
    status: 'connected',
    credentials_ref: 'inline:v1',
    config: {
      tokens: tokenBlob,
      account_email: accountEmail || null,
      profile: providerProfile || null,
      connector_user_id: userId,
      // R12 — plaintext scope list so listConnectionsForUser can filter without
      // decrypting the blob. Required scopes were already validated upstream.
      granted_scopes: Array.isArray(grantedScopes) ? grantedScopes : [],
    },
    connected_at: now,
    updated_at: now,
  }

  // Workspace-owned: PostgREST can't unique-conflict on a JSON key, so
  // read-then-write keyed on (workspace_id, slug, account_email).
  if (workspaceId) {
    const emailKey = encodeURIComponent(accountEmail || '')
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/account_integrations?workspace_id=eq.${workspaceId}&integration_slug=eq.${slug}&config->>account_email=eq.${emailKey}&select=id&limit=1`,
      { headers: svcHeaders },
    )
    const existingRow = existing.ok ? (await existing.json())[0] : null
    if (existingRow) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${existingRow.id}`, {
        method: 'PATCH',
        headers: { ...svcHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return { ok: false, error: `supabase ws-patch ${r.status}: ${text.slice(0, 200)}` }
      }
      return { ok: true }
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/account_integrations`, {
      method: 'POST',
      headers: { ...svcHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return { ok: false, error: `supabase ws-insert ${r.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  }

  // R12 (2026-05-25) — User-owned: read-then-write pattern. The original code
  // used `?on_conflict=user_id,integration_slug` but the account_integrations
  // table doesn't actually have a unique constraint on (user_id,
  // integration_slug) — Supabase events showed every user-owned upsert
  // failing with Postgres 42P10 ("no unique or exclusion constraint
  // matching the ON CONFLICT specification"). This mirrors the workspace
  // branch above: look up the existing row, PATCH if present, POST if not.
  //
  // MULTI-ACCOUNT (2026-06-09): key on (user_id, slug, account_email) when an
  // account email is known, so connecting a SECOND Google account creates its
  // own row instead of overwriting the first (the bug that flipped hello@ ->
  // personal). Re-authing the SAME account still updates its own row. For
  // providers with no account email (null), fall back to (user_id, slug).
  const emailFilter = accountEmail
    ? `&config->>account_email=eq.${encodeURIComponent(accountEmail)}`
    : ''
  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.${slug}${emailFilter}&select=id&limit=1`,
    { headers: svcHeaders },
  )
  const existingRow = existing.ok ? (await existing.json())[0] : null
  if (existingRow) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/account_integrations?id=eq.${existingRow.id}`, {
      method: 'PATCH',
      headers: { ...svcHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return { ok: false, error: `supabase user-patch ${r.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/account_integrations`, {
    method: 'POST',
    headers: { ...svcHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return { ok: false, error: `supabase user-insert ${r.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true }
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

  const { userId, slug, returnTo, workspaceId, requestedAccess } = verified
  console.log('[oauth/callback] verified', { userId, slug, hasReturnTo: !!returnTo })
  await logEvent('oauth_state_verified', { userId, slug, hasReturnTo: !!returnTo })
  const baseProvider = getProvider(slug)
  // Match validation to the exact consent requested by onboarding. A
  // search-only Gmail token is useful without gmail.modify/gmail.send and must
  // not be discarded as a partial full-access grant.
  const provider = requestedAccess === 'search' && slug === 'gmail'
    ? { ...baseProvider, requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'] }
    : requestedAccess === 'search' && slug === 'outlook'
      ? { ...baseProvider, requiredScopes: ['User.Read', 'Mail.Read'] }
      : baseProvider
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

  // Pull provider profile early so we can target the exact row to delete
  // when scopes are insufficient (the workspace upsert keys on email).
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
  // it as 'connected' makes the UI lie. Instead: delete any prior partial
  // row for this owner/slug/email, then redirect with an explicit reason
  // so the user can re-grant.
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
    // "connected" for a useless connection. Failure here is non-fatal —
    // listConnectionsForUser will also filter on granted_scopes.
    await deleteConnectionMatching({ userId, slug, workspaceId: workspaceId || null, accountEmail })
    return failRedirect(res, `scope-insufficient:${missingScopes.map(s => s.split('/').pop()).join(',')}`, returnTo)
  }

  let encrypted
  try {
    encrypted = encryptJson({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_in: tokens.expires_in || null,
      token_type: tokens.token_type || null,
      scope: tokens.scope || null,
      obtained_at: Date.now(),
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
  })
  console.log('[oauth/callback] upsert', upsert)
  await logEvent('oauth_upsert', { slug, userId, ok: !!upsert.ok, error: upsert.error ? upsert.error.slice(0, 500) : null })
  if (!upsert.ok) {
    console.error('[oauth/callback] db-fail', upsert.error)
    return failRedirect(res, `db:${upsert.error.slice(0, 80)}`, returnTo)
  }

  console.log('[oauth/callback] success', { userId, slug })
  await logEvent('oauth_success', { slug, userId })
  return successRedirect(res, slug, returnTo)
}
