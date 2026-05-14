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

import { extractJwt } from '../../_lib/verifyTenant.js'
import { getProvider, getProviderCreds, buildRedirectUri } from '../../_lib/oauthProviders.js'
import { signState } from '../../_lib/oauthCrypto.js'
import { randomBytes } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getUserId(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const jwt = extractJwt(req)
  if (!jwt) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
    })
    if (!r.ok) return null
    const user = await r.json()
    return user?.id || null
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

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'not authenticated' })

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
  const state = signState({ userId, slug, ts: Date.now(), nonce, returnTo })

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
  res.setHeader('Location', authUrl)
  return res.status(302).end()
}
