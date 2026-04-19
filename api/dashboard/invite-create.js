// POST /api/dashboard/invite-create
// Generate a signed, email-scoped, single-use invite token with a 48h TTL.
// The super-agent calls this when onboarding someone new; the returned invite_url
// is what the EA sends by email/text/whatever channel it owns.
//
// Body: { email, world_slug?, role?, invited_by?, expires_hours? }
//
// Returns: { ok, invite_id, invite_url, token, email, world_slug, role, expires_at }
//   token is the plaintext — returned exactly once (the caller must deliver it and
//   will never see it again; only its sha256 hash lives in the DB).

import crypto from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://aheadofmarket.com'

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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { email, world_slug, role, invited_by, expires_hours } = req.body || {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email required' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'invalid email' })
  }

  const normalizedRole = role && ['owner','admin','member'].includes(role) ? role : 'member'
  const ttlHours = Number.isFinite(Number(expires_hours)) ? Math.max(1, Math.min(168, Number(expires_hours))) : 48
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()

  // 32 random bytes → 43 url-safe chars. Unique across ~2^128 possibilities.
  const token = crypto.randomBytes(32).toString('base64url')
  const tokenHash = sha256(token)

  const body = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    email: normalizedEmail,
    world_slug: world_slug || null,
    role: normalizedRole,
    invited_by: invited_by || null,
    expires_at: expiresAt,
    metadata: {},
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
