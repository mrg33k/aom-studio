// /api/dashboard/project-update
//
// corner:right-click-menu R6 — rename + delete projects from the right-click
// menu. Display-name only rename (slug/folder stay; see VISION).
//
// PATCH { slug, name }
//   → updates projects.name for the row matching slug + the JWT user's world.
// PATCH { slug, is_active: false }  (corner:corner-ui-cv6 wd40 DEF-3)
//   → archives the project: projects.is_active=false + archived_at=now, AND
//     agent_status.hidden=true for the matching type='project' row (that row
//     is what feeds the Home room list / pickers via supabase-status.js).
//     Fully reversible: PATCH { slug, is_active: true } restores both sides
//     (archived_at back to null, hidden back to false). Disk content is
//     never touched — archive is a visibility flag, not a delete.
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

  const _rawTenant = req.body && (req.body.client_id || req.body.clientId);
  const _reqTenant = _rawTenant && String(_rawTenant).trim();
  if (!_reqTenant) return res.status(401).json({ error: 'Missing client' });
  const requestedTenant = _reqTenant;
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
    const { slug, name, is_active } = req.body || {}
    if (!slug) return res.status(400).json({ error: 'slug required' })

    const patch = {}
    if (name !== undefined) {
      const trimmedName = String(name).trim()
      if (!trimmedName) return res.status(400).json({ error: 'name cannot be blank' })
      patch.name = trimmedName
    }
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active must be a boolean' })
      patch.is_active = is_active
      // Real archive timestamp so "when was this archived" is answerable;
      // cleared on unarchive so the row reads active again everywhere.
      patch.archived_at = is_active ? null : new Date().toISOString()
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'name or is_active required' })

    const url = `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}`
    const r = await fetch(url, {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify(patch),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: 'supabase: ' + t })
    }
    const rows = await r.json()
    if (!rows?.length) return res.status(404).json({ error: 'project not found' })

    // Archive/unarchive must also flip the project's agent_status row —
    // supabase-status.js builds the Home room list, live dots and pickers
    // from agent_status (type='project'), where the visibility flag is
    // `hidden` (migration 028). Without this the archived room keeps showing
    // with a live dot an hour later (wd40 DEF-4). Best-effort: a project
    // without an agent_status row is fine (fromDefs already respects is_active).
    if (is_active !== undefined) {
      try {
        const asUrl = `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(slug)}&type=eq.project&client_id=eq.${encodeURIComponent(clientId)}`
        await fetch(asUrl, {
          method: 'PATCH',
          headers: sbHeaders({ Prefer: 'return=minimal' }),
          body: JSON.stringify({ hidden: !is_active, updated_at: new Date().toISOString() }),
        })
      } catch { /* non-fatal: projects.is_active is the canonical flag */ }
    }

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
