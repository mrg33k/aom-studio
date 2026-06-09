// OAuth provider registry. Server-only — underscore-prefixed dir keeps it out
// of Vercel's serverless routing. Each entry describes the OAuth dance for one
// provider. The /api/integrations/oauth/start + callback handlers read this
// registry and the per-provider env vars to drive the flow.
//
// Env var convention: each provider reads <SLUG_UPPER>_OAUTH_CLIENT_ID and
// <SLUG_UPPER>_OAUTH_CLIENT_SECRET. Example: GITHUB_OAUTH_CLIENT_ID. The
// callback URL registered at the provider must be:
//   https://<host>/api/integrations/oauth/callback
// (single redirect URI for all providers; we pull slug from signed state).

export const OAUTH_PROVIDERS = {
  gmail: {
    label: 'Gmail',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    // requiredScopes — the strict subset the connection is useless without.
    // openid/email/profile are sign-in only; without gmail.modify the API
    // can't read mail and without gmail.send it can't reply. If Google's
    // consent screen returned without these (e.g. user skipped "Select all"
    // on the granular permissions page), the callback throws the connection
    // away instead of marking it connected.
    requiredScopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    extraAuthParams: {
      access_type: 'offline',
      // select_account forces Google's account chooser so connecting a SECOND
      // mailbox (e.g. hello@ alongside personal) always lets you pick which
      // account — never silently reuses the active one. consent guarantees a
      // fresh refresh_token on every (re)auth. (multi-account, 2026-06-09)
      prompt: 'select_account consent',
      // include_granted_scopes lets a re-auth keep previously granted scopes
      // while adding any missing ones — minimises consent friction on retry.
      include_granted_scopes: 'true',
    },
    envPrefix: 'GOOGLE',
  },
  'google-calendar': {
    label: 'Google Calendar',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    envPrefix: 'GOOGLE',
  },
  'google-drive': {
    label: 'Google Drive',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/drive.file',
    ],
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    envPrefix: 'GOOGLE',
  },
  github: {
    label: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user', 'user:email'],
    envPrefix: 'GITHUB',
  },
  slack: {
    label: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['channels:read', 'chat:write', 'users:read'],
    envPrefix: 'SLACK',
  },
  notion: {
    label: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    extraAuthParams: { owner: 'user', response_type: 'code' },
    envPrefix: 'NOTION',
  },
  linear: {
    label: 'Linear',
    authUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    scopes: ['read', 'write'],
    envPrefix: 'LINEAR',
  },
  hubspot: {
    label: 'HubSpot',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['crm.objects.contacts.read', 'crm.objects.deals.read'],
    envPrefix: 'HUBSPOT',
  },
}

export function getProvider(slug) {
  return OAUTH_PROVIDERS[slug] || null
}

export function getProviderCreds(slug) {
  const p = getProvider(slug)
  if (!p) return null
  const id = process.env[`${p.envPrefix}_OAUTH_CLIENT_ID`]
  const secret = process.env[`${p.envPrefix}_OAUTH_CLIENT_SECRET`]
  if (!id || !secret) return null
  return { clientId: id, clientSecret: secret }
}

export function buildRedirectUri(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0]
  return `${proto}://${host}/api/integrations/oauth/callback`
}
