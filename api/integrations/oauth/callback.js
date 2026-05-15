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

async function upsertConnection({ userId, slug, tokenBlob, providerProfile }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, error: 'supabase env missing' }
  const payload = {
    user_id: userId,
    integration_slug: slug,
    status: 'connected',
    credentials_ref: 'inline:v1',
    config: {
      tokens: tokenBlob,
      profile: providerProfile || null,
    },
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/account_integrations?on_conflict=user_id,integration_slug`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    },
  )
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return { ok: false, error: `supabase upsert ${r.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true }
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

  const { userId, slug, returnTo } = verified
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
    providerProfile: tokens.team || tokens.workspace_name || null,
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
