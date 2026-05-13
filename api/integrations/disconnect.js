// POST /api/integrations/disconnect { slug }
// Sets the user's integration row back to status='available' (preserves row history).

import integrationsData from '../../src/data/integrations.json'
import { extractJwt } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const KNOWN_SLUGS = new Set(integrationsData.integrations.map(i => i.slug))

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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const slug = (req.body?.slug || '').toString().trim()
  if (!slug || !KNOWN_SLUGS.has(slug)) {
    return res.status(400).json({ error: 'unknown integration slug' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'auth required', degraded: true })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'supabase not configured' })
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&integration_slug=eq.${encodeURIComponent(slug)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'available', connected_at: null }),
      },
    )
    if (!r.ok) {
      const errText = await r.text()
      const status = r.status === 404 || r.status === 400 ? 202 : r.status
      return res.status(status).json({ ok: false, degraded: true, error: errText })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
