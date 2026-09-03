// GET /api/dashboard/missions-created?project=corner[&limit=20]
//
// R75-h2: returns recent mission_created events for a project.
// corner:retire-supabase (2026-09-03): reads the Convex events table through
// events:find. Was a service-role proxy onto the Supabase events table.
//
// Response shape:
//   { missions: [{ id, agent, project, mission, description,
//                  file_count, timestamp }] }

// SECURITY (corner:tenant-isolation R1): the events table has no client_id, so
// this feed was reading mission_created events across ALL worlds with no auth.
// Now ?project is required and gated by verifyProjectAccess(project). The caller
// must prove access to that project, and only that project's rows are returned.
import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery } from '../_lib/reportsStore.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const project = (req.query.project || '').toString().toLowerCase()
  if (!project) return res.status(400).json({ error: 'project required' })
  try {
    await verifyProjectAccess(project, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)

  // The project filter runs here, not in the query: payload.project casing has
  // drifted in old rows, so an exact server-side match would drop some.
  let rows = []
  try {
    const found = await convexQuery('events:find', {
      event_type: 'mission_created',
      order: 'desc',
      limit: Math.min(limit * 5, 500),
    })
    if (Array.isArray(found)) rows = found
  } catch (_) {}

  const missions = []
  for (const row of rows) {
    const p = row.payload || {}
    if (project && (p.project || '').toLowerCase() !== project) continue
    missions.push({
      id: row.id,
      agent: row.agent,
      project: p.project || '',
      mission: p.mission || p.mission_slug || '',
      description: p.description || '',
      file_count: p.file_count || 0,
      timestamp: row.timestamp,
    })
    if (missions.length >= limit) break
  }
  return res.status(200).json({ missions })
}
