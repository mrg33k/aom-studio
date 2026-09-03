// api/dashboard/cleo-workspaces.js
// GET  /api/dashboard/cleo-workspaces            -- list all workspaces
// GET  /api/dashboard/cleo-workspaces?slug=X     -- get workspace detail by slug
// Optional: ?client=X (substring match), ?status=X (exact)
//
// corner:retire-supabase (2026-09-03): workspaces are rows in the Convex
// cleoWorkspaces table (cleoWorkspaces:list / cleoWorkspaces:get). They used
// to be the latest video_workspace event per slug in the Supabase events table.
// The payload shape is kept: each workspace is the stored `data` blob with
// slug, title and status on top.

import { requireSuperAdmin, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery } from '../_lib/reportsStore.js'

function shapeWorkspace(row) {
  const data = row && row.data && typeof row.data === 'object' ? row.data : {}
  return {
    ...data,
    id: row._id,
    slug: row.slug,
    title: row.title ?? data.title ?? row.slug,
    status: row.status ?? data.status ?? null,
    updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : (data.updated_at ?? null),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Lists every workspace across all clients (no per-world scoping exists in
  // the payloads), so this is global internal production data: super-admin only.
  try {
    await requireSuperAdmin(req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }

  const { slug, client: clientFilter, status: statusFilter } = req.query

  try {
    if (slug) {
      const row = await convexQuery('cleoWorkspaces:get', { slug: String(slug) })
      if (!row) return res.status(404).json({ error: 'Workspace not found' })
      return res.status(200).json({ workspace: shapeWorkspace(row) })
    }

    // The list query returns slug/title/status only; pull the data blob per
    // slug so the client and status filters below see the same fields the
    // old event payloads carried.
    const summaries = await convexQuery('cleoWorkspaces:list', {})
    const rows = await Promise.all(
      (Array.isArray(summaries) ? summaries : []).map(async (s) => {
        try { return (await convexQuery('cleoWorkspaces:get', { slug: s.slug })) || s } catch { return s }
      })
    )

    let workspaces = rows.map(shapeWorkspace)

    if (clientFilter) {
      const q = String(clientFilter).toLowerCase()
      workspaces = workspaces.filter(w => w.client && String(w.client).toLowerCase().includes(q))
    }
    if (statusFilter) {
      workspaces = workspaces.filter(w => w.status === statusFilter)
    }

    return res.status(200).json({ workspaces })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
