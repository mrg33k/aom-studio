// api/dashboard/cleo-workspaces.js
// GET  /api/dashboard/cleo-workspaces            -- list all workspaces
// GET  /api/dashboard/cleo-workspaces?slug=X     -- get workspace detail by slug
// Optional: ?client=X (ilike), ?status=X (exact)

import { requireSuperAdmin, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function dbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // Lists every video_workspace across all clients (no per-world scoping exists
  // in the payloads), so this is global internal production data — super-admin
  // only. Was fully unauthenticated.
  try {
    await requireSuperAdmin(req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }

  const { slug, client: clientFilter, status: statusFilter } = req.query

  try {
    if (slug) {
      const url = `${SUPABASE_URL}/rest/v1/events?event_type=eq.video_workspace&payload->>slug=eq.${encodeURIComponent(slug)}&order=timestamp.desc&limit=1`
      const r = await fetch(url, { headers: dbHeaders() })
      if (!r.ok) {
        const text = await r.text()
        return res.status(r.status).json({ error: text })
      }
      const rows = await r.json()
      if (!rows.length) return res.status(404).json({ error: 'Workspace not found' })
      return res.status(200).json({ workspace: rows[0].payload })
    }

    // List: fetch latest 500 events, group by slug, keep latest per slug
    const url = `${SUPABASE_URL}/rest/v1/events?event_type=eq.video_workspace&order=timestamp.desc&limit=500`
    const r = await fetch(url, { headers: dbHeaders() })
    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: text })
    }
    const events = await r.json()

    // Deduplicate: keep latest event per slug
    const seen = new Set()
    let workspaces = []
    for (const event of events) {
      const p = event.payload || {}
      if (!p.slug || seen.has(p.slug)) continue
      seen.add(p.slug)
      workspaces.push(p)
    }

    if (clientFilter) {
      const q = clientFilter.toLowerCase()
      workspaces = workspaces.filter(w => w.client && w.client.toLowerCase().includes(q))
    }
    if (statusFilter) {
      workspaces = workspaces.filter(w => w.status === statusFilter)
    }

    return res.status(200).json({ workspaces })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
