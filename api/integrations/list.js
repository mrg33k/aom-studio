// GET /api/integrations/list
// Returns the integrations registry merged with the caller's connected rows.
// Used by IntegrationsModal to render Available vs Connected per account.
//
// corner:retire-supabase (2026-09-03): the caller and their world come from the
// Convex Auth token (users:verifyToken, which reads the memberships table) and
// the per-user rows come from the Convex integrations table
// (integrations:listForUser). No Supabase.

import { readFileSync } from 'fs'
import { join } from 'path'
import { extractJwt } from '../_lib/verifyTenant.js'

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

// System integrations that should remain visible to TENANT users (non-AOM
// worlds: Karen, Tim, Taryn, every future tester). Anthropic powers the EA
// itself and is shown as "connected (system)" so tenants understand where
// the agent runs. Everything else marked system:true is AOM-internal
// infrastructure (Vercel, Convex, Dropbox, Apollo, Postiz, GitHub,
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

// The signed-in person plus their home world slug, or null.
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

function toIso(ms) {
  if (!ms) return null
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const user = await getUser(req)

  // If we can't identify the user (anonymous or stale session), return the registry
  // with no connected state — the client falls back to localStorage.
  if (!user) {
    return res.status(200).json({
      integrations: REGISTRY.map(i => ({ ...i, status: 'available', connected_at: null })),
      mode: 'anonymous',
    })
  }

  // Hide AOM-internal system integrations from every other tenant. Patrik
  // 2026-05-25: "the only connected platforms users get by default are
  // anthropic". The caller's world is their home world on Convex.
  const isAomTeam = (user.world || user.worldSlug || '') === 'aom'

  // Best-effort fetch of per-user rows. On any failure we degrade to the
  // registry-only view.
  let rowsBySlug = {}
  try {
    const rows = await convex('query', 'integrations:listForUser', { userId: user.userId }, user.token)
    if (Array.isArray(rows)) {
      rows.forEach(row => {
        rowsBySlug[row.service] = {
          integration_slug: row.service,
          // A disconnected row reads as available: the row is history, not a state.
          status: row.status === 'disconnected' ? 'available' : (row.status || 'available'),
          connected_at: toIso(row.connectedAt),
        }
      })
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
      // authed user. The user's own row, if any, can still override (e.g.
      // the user explicitly disconnected).
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
