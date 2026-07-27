// POST /api/dashboard/invite-create
// Generate a signed, email-scoped, single-use invite token with a 48h TTL.
// The super-agent calls this when onboarding someone new; the returned invite_url
// is what the EA sends by email/text/whatever channel it owns.
//
// Body: { email, world_slug, role?, expires_hours? }
//
// Returns: { ok, invite_id, invite_url, token, email, world_slug, role, expires_at }
//   token is the plaintext — returned exactly once (the caller must deliver it and
//   will never see it again; only its sha256 hash lives in the DB).
//
// AUTH (corner:identity-attribution, 2026-07-27). This endpoint mints the
// credential that creates a Supabase auth user carrying user_metadata.world —
// i.e. it manufactures world membership. Unauthenticated it was an open door to
// every world at any role (accept-invite is also unauthenticated by design: the
// TOKEN is the credential). So the gate lives here:
//   - a valid JWT is required,
//   - the caller must pass verifyTenant() for the world they are inviting INTO,
//   - `invited_by` is the verified JWT user id, never the body,
//   - owner/admin roles may only be granted by a world admin.

import crypto from 'node:crypto'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://aheadofmarket.com'

// Same allowlist shape as api/dashboard/voice-handoff.js — the dashboard
// origins and nothing else. `*` on a credential-minting endpoint let any page
// on the internet drive it from a logged-in browser.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
]

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

function applyCors(req, res) {
  const origin = req.headers?.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'private, no-store')
}

function sbHeaders(extra) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export default async function handler(req, res) {
  applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { email, world_slug, role, expires_hours } = req.body || {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email required' })
  }
  // world_slug is now REQUIRED: an invite with no world is an invite we cannot
  // authorize, and a null world_slug used to sail straight past any check.
  if (!world_slug || typeof world_slug !== 'string' || !world_slug.trim()) {
    return res.status(400).json({ error: 'world_slug required' })
  }

  let verified
  try {
    verified = await verifyTenant(world_slug, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'invalid email' })
  }

  const normalizedRole = role && ['owner','admin','member'].includes(role) ? role : 'member'
  // Privilege ceiling: only a verified world admin can hand out owner/admin.
  // A plain member of the world can still invite teammates, but only as members.
  if ((normalizedRole === 'owner' || normalizedRole === 'admin') && !verified.isAdmin) {
    return res.status(403).json({ error: 'only a world admin can invite at owner or admin role' })
  }
  const ttlHours = Number.isFinite(Number(expires_hours)) ? Math.max(1, Math.min(168, Number(expires_hours))) : 48
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()

  // Who is doing the inviting is a server-side fact, not a body field.
  const identity = await callerIdentity(req).catch(() => null)
  const invitedBy = identity?.userId || verified.userId || null

  // 32 random bytes → 43 url-safe chars. Unique across ~2^128 possibilities.
  const token = crypto.randomBytes(32).toString('base64url')
  const tokenHash = sha256(token)

  const body = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    email: normalizedEmail,
    world_slug: verified.tenant,
    role: normalizedRole,
    invited_by: invitedBy,
    expires_at: expiresAt,
    metadata: {
      invited_by_name: identity?.userName || null,
      invited_by_email: identity?.email || null,
    },
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/invites`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  })

  if (!r.ok) {
    const detail = await r.text()
    return res.status(502).json({ error: 'Failed to create invite', detail })
  }

  const [row] = await r.json()
  const inviteUrl = `${APP_ORIGIN}/accept-invite?token=${encodeURIComponent(token)}`

  return res.status(200).json({
    ok: true,
    invite_id: row.id,
    invite_url: inviteUrl,
    token,
    email: row.email,
    world_slug: row.world_slug,
    role: row.role,
    expires_at: row.expires_at,
  })
}
