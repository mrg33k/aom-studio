// GET /api/integrations/list
// Returns the integrations registry merged with the caller's account_integrations rows.
// Used by IntegrationsModal to render Available vs Connected per account.

import { readFileSync } from 'fs'
import { join } from 'path'
import { extractJwt } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// System integrations that should remain visible to TENANT users (non-AOM
// worlds: Karen, Tim, Taryn, every future tester). Anthropic powers the EA
// itself and is shown as "connected (system)" so tenants understand where
// the agent runs. Everything else marked system:true is AOM-internal
// infrastructure (Vercel, Supabase, Dropbox, Apollo, Postiz, GitHub,
// OpenAI, ElevenLabs, Google Calendar) -- those stay functional under the
// hood but get hidden from tenant integration lists so they aren't surfaced
// as "available" platforms or shown as "AOM is connected to them".
const TENANT_SYSTEM_ALLOWLIST = new Set(['anthropic'])

function loadRegistry() {
  try {
    const p = join(process.cwd(), 'src', 'data', 'integrations.json')
    const raw = readFileSync(p, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data.integrations) ? data.integrations : []
  } catch {
    return []
  }
}

const REGISTRY = loadRegistry()

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

// Returns the caller's primary tenant id (e.g. "aom", "karens-world",
// "arsenal"). Falls back to null on lookup error -- caller treats null as
// "non-aom" by default, the safer side for AOM-internal integrations.
async function getUserTenant(userId) {
  if (!userId || !SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/tenant_users?user_id=eq.${userId}&select=tenant_id&limit=5`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    )
    if (!r.ok) return null
    const rows = await r.json()
    if (!Array.isArray(rows) || rows.length === 0) return null
    // Prefer "aom" if present (user is on the AOM team), else first row.
    const aom = rows.find(x => x.tenant_id === 'aom')
    return (aom || rows[0]).tenant_id || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const userId = await getUserId(req)

  // If we can't identify the user (anonymous or stale session), return the registry
  // with no connected state — the client falls back to localStorage.
  if (!userId || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(200).json({
      integrations: REGISTRY.map(i => ({ ...i, status: 'available', connected_at: null })),
      mode: 'anonymous',
    })
  }

  // Resolve tenant so we can hide AOM-internal system integrations from
  // every other tenant. Patrik 2026-05-25: "the only connected platforms
  // users get by default are anthropic". AOM-internal system platforms
  // (Vercel, Supabase, Dropbox, Apollo, Postiz, GitHub, OpenAI,
  // ElevenLabs, Google Calendar) stay functional under the hood — they
  // just don't surface to tenants as connected or as available.
  const callerTenant = await getUserTenant(userId)
  const isAomTeam = callerTenant === 'aom' 

  // Best-effort fetch of per-user rows. If the table doesn't exist yet (migration
  // pending), we degrade gracefully to the registry-only view.
  let rowsBySlug = {}
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/account_integrations?user_id=eq.${userId}&select=integration_slug,status,connected_at`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    )
    if (r.ok) {
      const rows = await r.json()
      if (Array.isArray(rows)) {
        rows.forEach(row => { rowsBySlug[row.integration_slug] = row })
      }
    }
  } catch {
    // ignore; degrade gracefully
  }

  const integrations = REGISTRY
    // Tenant-side filter: AOM-internal system integrations are stripped
    // entirely so they don't appear under either Connected or Available.
    // Anthropic is on the allowlist (every tenant runs on Anthropic for
    // their EA), but the rest of the system:true entries are AOM's own
    // accounts and shouldn't show in another tenant's world. AOM team
    // members still see everything.
    .filter(i => {
      if (!i.system) return true
      if (isAomTeam) return true
      return TENANT_SYSTEM_ALLOWLIST.has(i.slug)
    })
    .map(i => {
      const row = rowsBySlug[i.slug]
      // System integrations are platform-level -- always connected for the
      // authed user. The user's account_integrations row, if any, can still
      // override (e.g. user explicitly disconnected).
      if (i.system && (!row || row.status !== 'available')) {
        return {
          ...i,
          status: 'connected',
          connected_at: row?.connected_at || '2026-01-01T00:00:00Z',
        }
      }
      return {
        ...i,
        status: row?.status || 'available',
        connected_at: row?.connected_at || null,
      }
    })

  return res.status(200).json({ integrations, mode: 'authenticated' })
}
