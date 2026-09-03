// GET /api/integrations/oauth/start?slug=<provider>
// Kicks off the OAuth handshake: validates the user, looks up the provider in
// the registry, builds the auth URL with scopes + signed state, and 302s the
// browser to the provider's consent screen.
//
// Provider configs live in api/_lib/oauthProviders.js. To wire a new provider:
//   1. Add it to OAUTH_PROVIDERS in oauthProviders.js
//   2. Register an OAuth app at the provider with redirect URI:
//      https://<host>/api/integrations/oauth/callback
//   3. Set <PREFIX>_OAUTH_CLIENT_ID + _SECRET in Vercel env vars
//   4. Add the slug to src/data/integrations.json (auth_type: "oauth", omit
//      oauth_status:"coming_soon" so the Connect button activates)
//
// Required env: TOKEN_ENC_KEY (signs state), per-provider OAuth creds.
//
// corner:retire-supabase (2026-09-03): the caller is identified by their Convex
// Auth token (users:verifyToken) and the workspace membership check is
// worlds:membership. The userId signed into state is the Convex users id, which
// is what callback.js hands to integrations:setOAuthTokens.

import { extractJwt } from '../../_lib/verifyTenant.js'
import { getProvider, getProviderCreds, buildRedirectUri } from '../../_lib/oauthProviders.js'
import { signState } from '../../_lib/oauthCrypto.js'
import { randomBytes } from 'crypto'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

async function convex(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}

async function getUser(req) {
  const token = extractJwt(req)
  if (!token) return null
  try {
    const who = await convex('query', 'users:verifyToken', {}, token)
    return who && who.userId ? { ...who, token } : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const slug = (req.query?.slug || '').toString()
  if (!slug) return res.status(400).json({ error: 'slug required' })

  const provider = getProvider(slug)
  if (!provider) {
    return res.status(404).json({
      error: `No OAuth config for "${slug}". See api/_lib/oauthProviders.js to wire it.`,
    })
  }

  const creds = getProviderCreds(slug)
  if (!creds) {
    return res.status(503).json({
      error: `OAuth credentials not configured for "${slug}". Set ${provider.envPrefix}_OAUTH_CLIENT_ID + _SECRET in Vercel env.`,
    })
  }

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'not authenticated' })
  const userId = user.userId

  // return_to lets callers (e.g. the onboarding flow) ask the callback to land
  // them on a specific same-origin path instead of /dashboard. Must be a
  // relative path starting with "/" and not "//" (no open redirects).
  const rawReturnTo = (req.query?.return_to || '').toString()
  let returnTo = null
  if (rawReturnTo) {
    if (rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') && !rawReturnTo.includes('://')) {
      returnTo = rawReturnTo
    }
  }

  const redirectUri = buildRedirectUri(req)
  const nonce = randomBytes(8).toString('base64url')
  // R7: scope=workspace means store the resulting token on the workspace row
  // instead of the user row. Caller must be a member of the named workspace.
  const scope = (req.query?.scope || 'user').toString()
  let workspaceId = null
  if (scope === 'workspace') {
    const requested = (req.query?.workspace_id || '').toString()
    if (!requested) return res.status(400).json({ error: 'workspace_id required when scope=workspace' })
    let membership = null
    try {
      membership = await convex('query', 'worlds:membership', { worldId: requested, userId }, user.token)
    } catch {
      membership = null
    }
    if (!membership) {
      return res.status(403).json({ error: 'not a member of requested workspace' })
    }
    workspaceId = membership.slug || requested
  }
  const state = signState({ userId, slug, ts: Date.now(), nonce, returnTo, workspaceId })

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  })
  if (provider.scopes && provider.scopes.length) {
    params.set('scope', provider.scopes.join(' '))
  }
  if (provider.extraAuthParams) {
    Object.entries(provider.extraAuthParams).forEach(([k, v]) => params.set(k, String(v)))
  }

  const authUrl = `${provider.authUrl}?${params.toString()}`
  // Fetch-then-redirect callers (Authorization header present) get JSON so they
  // can redirect client-side after attaching the JWT. Legacy top-level nav falls
  // back to the 302.
  if (req.headers?.authorization) {
    return res.status(200).json({ authUrl })
  }
  res.setHeader('Location', authUrl)
  return res.status(302).end()
}
