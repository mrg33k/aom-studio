// Shared embed registry — Supabase first, JSON fallback.
//
// `getEmbed(id)` is the only access pattern. All four /api/embed/* endpoints
// (config, chat, messages, steps) use this so a row written via
// /api/embed/create becomes live immediately — no redeploy needed.
//
// On a cold serverless invocation, the import of _embeds.json is lazy and
// only happens when Supabase misses, keeping the happy path fast.
//
// Cache: 10s in-memory TTL keyed by embed_id. Absorbs the 1.5s widget poll
// without staleness becoming user-visible.

import embedsFile from '../api/embed/_embeds.json' with { type: 'json' }

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const JSON_REGISTRY = embedsFile.embeds || {}

const TTL_MS = 10_000
const cache = new Map() // embed_id → { row, ts }

function fromJson(id) {
  return JSON_REGISTRY[id] || null
}

function rowToCfg(row) {
  if (!row) return null
  return {
    embed_id: row.embed_id,
    surface_name: row.surface_name,
    active: row.active,
    host_allowlist: row.host_allowlist,
    placement: row.placement,
    routing: row.routing,
  }
}

async function fromSupabase(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const url = `${SUPABASE_URL}/rest/v1/embed_configs?embed_id=eq.${encodeURIComponent(id)}&select=*&limit=1`
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    })
    if (!resp.ok) return null
    const rows = await resp.json()
    return Array.isArray(rows) && rows.length ? rowToCfg(rows[0]) : null
  } catch {
    return null
  }
}

export async function getEmbed(id) {
  if (!id) return null
  const cached = cache.get(id)
  if (cached && (Date.now() - cached.ts) < TTL_MS) return cached.row

  const row = (await fromSupabase(id)) || fromJson(id)
  cache.set(id, { row, ts: Date.now() })
  return row
}

export async function insertEmbed(cfg, createdBy = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('supabase not configured')
  }
  const url = `${SUPABASE_URL}/rest/v1/embed_configs`
  const payload = {
    embed_id: cfg.embed_id,
    surface_name: cfg.surface_name,
    active: cfg.active !== false,
    host_allowlist: cfg.host_allowlist,
    placement: cfg.placement,
    routing: cfg.routing,
    created_by: createdBy,
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`supabase insert failed: ${resp.status} ${text}`)
  }
  cache.delete(cfg.embed_id)
  const rows = await resp.json().catch(() => [])
  return Array.isArray(rows) && rows.length ? rowToCfg(rows[0]) : rowToCfg(payload)
}

export function _jsonRegistryForTests() {
  return JSON_REGISTRY
}
