// /api/dashboard/mission-update
//
// corner:right-click-menu R6 — rename + delete missions from the right-click
// menu. Display-name only rename (slug/folder stay; see VISION).
//
// Storage model: mission display names are stored in the `mission_meta` table
// (project_slug, mission_slug, display_name, archived_at). Missing rows mean
// "no override" — the missions endpoint falls back to the slug-derived title.
//
// PATCH { project_slug, mission_slug, name }
//   → upserts the display name override.
// DELETE { project_slug, mission_slug, confirm: "DELETE" }
//   → soft-archives by setting archived_at on the mission_meta row.

import { extractJwt, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
    ...extra,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Derive tenant from body (defaults to 'aom'). For shared rooms callers pass shared:<slug>.
  const requestedTenant = (req.body && (req.body.client_id || req.body.clientId)) || 'aom'
  let tenant
  try {
    tenant = await verifyTenant(requestedTenant, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status || 401).json({ error: err.message })
    return res.status(500).json({ error: err.message || 'auth failure' })
  }
  const clientId = tenant?.tenant || requestedTenant
  const updatedBy = tenant?.userId || null

  if (req.method === 'PATCH') {
    const { project_slug, mission_slug, name } = req.body || {}
    if (!project_slug || !mission_slug || !name) {
      return res.status(400).json({ error: 'project_slug + mission_slug + name required' })
    }
    const trimmed = String(name).trim()
    if (!trimmed) return res.status(400).json({ error: 'name cannot be blank' })

    const row = {
      client_id: clientId,
      project_slug,
      mission_slug,
      display_name: trimmed,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mission_meta`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(row),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: 'supabase: ' + t })
    }
    const rows = await r.json()
    return res.status(200).json({ ok: true, meta: rows?.[0] || row })
  }

  if (req.method === 'DELETE') {
    const { project_slug, mission_slug, confirm } = req.body || {}
    if (!project_slug || !mission_slug) return res.status(400).json({ error: 'project_slug + mission_slug required' })
    if (confirm !== 'DELETE') return res.status(400).json({ error: 'confirm must equal "DELETE" (caps)' })

    const row = {
      client_id: clientId,
      project_slug,
      mission_slug,
      archived_at: new Date().toISOString(),
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mission_meta`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(row),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: 'supabase: ' + t })
    }
    return res.status(200).json({ ok: true, archived: { project_slug, mission_slug } })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
