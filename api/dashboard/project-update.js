// /api/dashboard/project-update
//
// corner:right-click-menu R6: rename + archive projects from the right-click
// menu. Display-name only rename (slug/folder stay; see VISION).
//
// corner:retire-supabase (2026-09-03): writes go to the Convex project
// registry (projects:update) and the project's room (rooms:setTitle,
// rooms:archive). Was the Supabase projects and agent_status tables.
//
// PATCH { slug, name }
//   -> updates the project's name for the row matching slug + the JWT user's
//      world, and retitles the project's chat room to match.
// PATCH { slug, is_active: false }  (corner:corner-ui-cv6 wd40 DEF-3)
//   -> archives the project: isActive=false + archived=true on the registry
//      row, AND archived=true on the project's room (that room is what feeds
//      the Home room list / pickers). Fully reversible: PATCH { slug,
//      is_active: true } restores both sides. Disk content is never touched;
//      archive is a visibility flag, not a delete.
// DELETE { slug, confirm: "DELETE" }
//   -> retires the registry row: isActive=false, archived=true, plus the room.
//      The registry has no hard delete; retiring hides it everywhere and keeps
//      the sharing grants and rooms consistent. Requires the literal string
//      "DELETE" in `confirm` to prevent single-click destruction.
//
// All writes verify tenant access via verifyTenant. Audit `updated_by` from
// the JWT user.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js'

// The project's chat room key, in the same grammar every writer uses.
function projectRoomId(world, slug) {
  return `${world}:project:${slug}`
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
      patch.isActive = is_active
      patch.archived = !is_active
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'name or is_active required' })

    let out
    try {
      out = await convexMutation('projects:update', { slug, worldId: clientId, patch })
    } catch (err) {
      return res.status(502).json({ error: 'convex: ' + err.message })
    }
    if (!out?.ok) return res.status(404).json({ error: 'project not found' })

    // The room is what the Home rail, live dots and pickers render from, so
    // it has to move with the registry row. Best effort: a project without a
    // room yet is fine.
    const roomId = projectRoomId(clientId, slug)
    if (patch.name) {
      try { await convexMutation('rooms:setTitle', { roomId, title: patch.name }) } catch { /* no room yet */ }
    }
    if (is_active !== undefined) {
      try { await convexMutation('rooms:archive', { roomId, archived: !is_active }) } catch { /* no room yet */ }
    }

    const project = await convexQuery('projects:lookupBySlug', { slug, worldId: clientId }).catch(() => null)
    return res.status(200).json({
      ok: true,
      project: project
        ? { id: project.projectId, slug: project.slug, name: project.name, client_id: project.ownerWorld, is_active: project.isActive, archived_at: project.archived ? new Date().toISOString() : null }
        : { slug, ...patch },
      updated_by: updatedBy,
    })
  }

  if (req.method === 'DELETE') {
    const { slug, confirm } = req.body || {}
    if (!slug) return res.status(400).json({ error: 'slug required' })
    if (confirm !== 'DELETE') return res.status(400).json({ error: 'confirm must equal "DELETE" (caps)' })

    let out
    try {
      out = await convexMutation('projects:update', { slug, worldId: clientId, patch: { isActive: false, archived: true } })
    } catch (err) {
      return res.status(502).json({ error: 'convex: ' + err.message })
    }
    if (!out?.ok) return res.status(404).json({ error: 'project not found' })
    try { await convexMutation('rooms:archive', { roomId: projectRoomId(clientId, slug), archived: true }) } catch { /* no room */ }
    return res.status(200).json({ ok: true, deleted: slug, deleted_by: updatedBy, retired: true })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
