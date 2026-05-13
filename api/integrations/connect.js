// POST /api/integrations/connect { slug }
// Marks the integration connected for the authenticated user via upsert into
// account_integrations. R1 stub: no real OAuth — just sets status='connected'.
// Real auth flows ship in R2+ as per-integration follow-up rounds.

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

  const payload = [{
    user_id: userId,
    integration_slug: slug,
    status: 'connected',
    connected_at: new Date().toISOString(),
  }]

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/account_integrations?on_conflict=user_id,integration_slug`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(payload),
      },
    )
    if (!r.ok) {
      const errText = await r.text()
      // If table missing (migration pending), surface a soft error so the client
      // can persist via localStorage only.
      const status = r.status === 404 || r.status === 400 ? 202 : r.status
      return res.status(status).json({ ok: false, degraded: true, error: errText })
    }
    const inserted = await r.json()
    return res.status(200).json({ ok: true, row: inserted[0] || null })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
