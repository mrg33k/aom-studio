// /api/dashboard/project-update
//
// corner:right-click-menu R6 — rename + delete projects from the right-click
// menu. Display-name only rename (slug/folder stay; see VISION).
//
// PATCH { slug, name }
//   → updates projects.name for the row matching slug + the JWT user's world.
// DELETE { slug, confirm: "DELETE" }
//   → deletes the projects row (cascade by Supabase FK rules). Requires the
//     literal string "DELETE" in `confirm` to prevent single-click destruction.
//
// All writes verify tenant access via verifyTenant + go through the service
// role so RLS doesn't block. Audit `updated_by` from the JWT user.

import { extractJwt, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
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
    const { slug, name } = req.body || {}
    if (!slug || !name) return res.status(400).json({ error: 'slug + name required' })
    const trimmedName = String(name).trim()
    if (!trimmedName) return res.status(400).json({ error: 'name cannot be blank' })

    const url = `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`
    const r = await fetch(url, {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify({ name: trimmedName, updated_at: new Date().toISOString() }),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: 'supabase: ' + t })
    }
    const rows = await r.json()
    if (!rows?.length) return res.status(404).json({ error: 'project not found' })
    return res.status(200).json({ ok: true, project: rows[0], updated_by: updatedBy })
  }

  if (req.method === 'DELETE') {
    const { slug, confirm } = req.body || {}
    if (!slug) return res.status(400).json({ error: 'slug required' })
    if (confirm !== 'DELETE') return res.status(400).json({ error: 'confirm must equal "DELETE" (caps)' })

    const url = `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`
    const r = await fetch(url, { method: 'DELETE', headers: sbHeaders() })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: 'supabase: ' + t })
    }
    return res.status(200).json({ ok: true, deleted: slug, deleted_by: updatedBy })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
