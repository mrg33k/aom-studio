// /api/dashboard/mission-folders
//
// corner:right-menu R7 — per-project sub-folders for missions.
//
// GET ?client=<world>
//   → { folders: [{id,project_slug,slug,name,created_at}],
//       assignments: [{project_slug,mission_slug,folder_slug}] }
//
// POST { project_slug, name }
//   → creates folder, derived slug. Returns the new row.
//
// PUT  { project_slug, mission_slug, folder_slug | null }
//   → upserts the mission's folder assignment. null = ungrouped.
//
// All write paths verify tenant access via verifyTenant + capture created_by /
// updated_by from the JWT user. RLS allows authenticated SELECT scoped by
// world; INSERT/UPDATE always go via service-role here.

import { extractJwt, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'folder'
}

async function getUserId(jwt) {
  if (!jwt) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
    })
    if (!r.ok) return null
    const j = await r.json()
    return j?.id || null
  } catch { return null }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') { try { return JSON.parse(req.body) } catch { return {} } }
  return await new Promise((resolve) => {
    let chunks = ''
    req.on('data', c => { chunks += c })
    req.on('end', () => { try { resolve(JSON.parse(chunks || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const jwt = extractJwt(req)
  if (!jwt) return res.status(401).json({ error: 'jwt required' })

  // ── GET — list folders + assignments for the world ─────────────────────────
  if (req.method === 'GET') {
    const _worldRaw = req.query.client ? String(req.query.client).trim() : ''
    if (!_worldRaw) return res.status(401).json({ error: 'Missing client' })
    const world = _worldRaw.toLowerCase()
    try {
      const [foldersRes, assignRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/mission_folders?world=eq.${encodeURIComponent(world)}&select=id,project_slug,slug,name,parent_folder_slug,created_at&order=created_at.asc`, { headers: sbHeaders() }),
        fetch(`${SUPABASE_URL}/rest/v1/mission_folder_assignments?world=eq.${encodeURIComponent(world)}&folder_slug=not.is.null&select=project_slug,mission_slug,folder_slug,updated_at`, { headers: sbHeaders() }),
      ])
      const folders = foldersRes.ok ? await foldersRes.json() : []
      const assignments = assignRes.ok ? await assignRes.json() : []
      return res.status(200).json({ folders, assignments })
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed', detail: String(e?.message || e) })
    }
  }

  // ── POST — create a new folder ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await readBody(req)
    const project_slug = String(body.project_slug || '').trim().toLowerCase()
    const name = String(body.name || '').trim()
    const parent_folder_slug = body.parent_folder_slug ? String(body.parent_folder_slug).trim().toLowerCase() : null
    if (!project_slug || !name) return res.status(400).json({ error: 'project_slug and name required' })

    try { await verifyTenant('aom', req) } catch (e) {
      if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message })
      return res.status(500).json({ error: String(e?.message || e) })
    }
    const user_id = await getUserId(jwt)

    // Derive a unique slug within (world, project_slug). Try slugify(name); on
    // conflict append -2, -3, etc.
    const world = 'aom'
    const baseSlug = slugify(name)
    let attempt = baseSlug
    let n = 1
    let row = null
    for (n = 1; n <= 20; n++) {
      const slug = n === 1 ? baseSlug : `${baseSlug}-${n}`
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/mission_folders`, {
        method: 'POST',
        headers: sbHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify({ world, project_slug, slug, name, parent_folder_slug, created_by: user_id }),
      })
      if (insertRes.ok) {
        const rows = await insertRes.json()
        row = Array.isArray(rows) ? rows[0] : rows
        attempt = slug
        break
      }
      const errBody = await insertRes.text()
      // 23505 = unique violation — try next suffix
      if (!/23505|duplicate key/i.test(errBody)) {
        return res.status(insertRes.status).json({ error: 'insert failed', detail: errBody })
      }
    }
    if (!row) return res.status(409).json({ error: 'could not derive unique slug' })
    return res.status(201).json({ folder: row })
  }

  // ── PUT — assign mission to folder (folder_slug=null → ungroup) ────────────
  if (req.method === 'PUT') {
    const body = await readBody(req)
    const project_slug = String(body.project_slug || '').trim().toLowerCase()
    const mission_slug = String(body.mission_slug || '').trim()
    const folder_slug = body.folder_slug == null ? null : String(body.folder_slug).trim().toLowerCase() || null
    if (!project_slug || !mission_slug) return res.status(400).json({ error: 'project_slug and mission_slug required' })

    try { await verifyTenant('aom', req) } catch (e) {
      if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message })
      return res.status(500).json({ error: String(e?.message || e) })
    }
    const user_id = await getUserId(jwt)
    const world = 'aom'

    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/mission_folder_assignments?on_conflict=world,project_slug,mission_slug`,
      {
        method: 'POST',
        headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify({
          world, project_slug, mission_slug, folder_slug,
          updated_at: new Date().toISOString(),
          updated_by: user_id,
        }),
      },
    )
    if (!upsertRes.ok) {
      const errBody = await upsertRes.text()
      return res.status(upsertRes.status).json({ error: 'upsert failed', detail: errBody })
    }
    const rows = await upsertRes.json()
    return res.status(200).json({ assignment: Array.isArray(rows) ? rows[0] : rows })
  }

  res.setHeader('Allow', 'GET, POST, PUT, OPTIONS')
  return res.status(405).json({ error: 'method not allowed' })
}
