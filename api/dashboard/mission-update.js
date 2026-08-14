// /api/dashboard/mission-update
//
// corner:right-click-menu R6 — rename + delete missions from the right-click
// menu. Display-name only rename (slug/folder stay; see VISION).
//
// corner:corner-ui-cv6 R-TREE-MENU (2026-07-02) — rename now writes where the
// tree actually READS. missions-tree.js renders names from (a) the on-disk
// registry (`name:` frontmatter in the mission's CONTEXT.md, rebuilt every 60s
// and live-served over the RAG tunnel) and (b) agent_status rows (drawer-made
// missions). The old mission_meta upsert fed a table nothing reads — renames
// looked accepted but never showed. PATCH now:
//   1. writes `name:` frontmatter on disk via the tunnel (/mission-rename,
//      which also regenerates the live registry immediately) — body.path is
//      the mission's registry path when the caller knows it
//   2. PATCHes agent_status.name for slug "<project>:<mission>"
//   3. keeps the mission_meta upsert (cheap, backwards-compatible)
//
// PATCH { project_slug, mission_slug, name, path? }
//   → renames everywhere the dashboard reads from.
// DELETE { project_slug, mission_slug, confirm: "DELETE" }
//   → soft-archives by setting archived_at on the mission_meta row.

import { extractJwt, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com'

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

  // Derive tenant from body. For shared rooms callers pass shared:<slug>.
  const _requestedRaw = req.body && (req.body.client_id || req.body.clientId) ? String(req.body.client_id || req.body.clientId).trim() : ''
  if (!_requestedRaw) return res.status(401).json({ error: 'Missing client' })
  const requestedTenant = _requestedRaw
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
    const { project_slug, mission_slug, name, path } = req.body || {}
    if (!project_slug || !mission_slug || !name) {
      return res.status(400).json({ error: 'project_slug + mission_slug + name required' })
    }
    const trimmed = String(name).trim()
    if (!trimmed) return res.status(400).json({ error: 'name cannot be blank' })

    // 1. Disk is canon: set `name:` frontmatter in the mission's CONTEXT.md via
    // the tunnel. The tunnel validates the path (must be a real mission folder
    // inside corner/) and regenerates the live registry so the tree shows the
    // new name on the next fetch. Best-effort — a down tunnel must not block
    // the Supabase-side rename (registry missions will catch up when it's back).
    let diskRenamed = false
    const missionPath = typeof path === 'string' && path.trim() ? path.trim() : null
    if (missionPath) {
      try {
        const r = await fetch(`${RAG_TUNNEL_URL}/mission-rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
          body: JSON.stringify({ path: missionPath, name: trimmed }),
        })
        const j = await r.json().catch(() => ({}))
        diskRenamed = !!(r.ok && j?.ok)
        if (!diskRenamed && r.status === 400) {
          return res.status(400).json({ error: j?.error || 'invalid mission path' })
        }
      } catch { /* tunnel down — proceed with the DB-side rename */ }
    }

    // 2. agent_status carries the name for drawer-created missions.
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/agent_status?type=eq.mission&slug=eq.${encodeURIComponent(`${project_slug}:${mission_slug}`)}`, {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ name: trimmed }),
      })
    } catch { /* best-effort */ }

    const row = {
      client_id: clientId,
      project_slug,
      mission_slug,
      display_name: trimmed,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }
    // on_conflict is REQUIRED for merge-duplicates to upsert here: the table's
    // PK is id, the natural key is a UNIQUE(client_id, project_slug,
    // mission_slug) constraint. Without it the second rename of any mission
    // 409s (23505) after the disk + agent_status writes already succeeded —
    // the user sees "could not be renamed" for a rename that actually worked.
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mission_meta?on_conflict=client_id,project_slug,mission_slug`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(row),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: 'supabase: ' + t })
    }
    const rows = await r.json()
    return res.status(200).json({ ok: true, meta: rows?.[0] || row, disk_renamed: diskRenamed })
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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mission_meta?on_conflict=client_id,project_slug,mission_slug`, {
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
