// GET /api/dashboard/project-shared?project_ids=id1,id2,...
//
// Returns which project ids have at least one sharing grant (i.e. are shared).
// corner:retire-supabase (2026-09-03): grants are read from the Convex
// projectAccess table through projects:access, one call per id. Ids are Convex
// project document ids (what /api/dashboard/projects returns as `id`).

import { callerIdentity } from '../_lib/verifyTenant.js'
import { convexQuery } from '../_lib/reportsStore.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Was fully unauthenticated. Require any verified session (a logged-in
  // dashboard user renders share badges for their own project ids); anonymous
  // callers are refused.
  const who = await callerIdentity(req)
  if (!who) return res.status(401).json({ error: 'authentication required' })

  const { project_ids } = req.query
  if (!project_ids) return res.status(400).json({ error: 'project_ids required' })

  const ids = [...new Set(String(project_ids).split(',').map(s => s.trim()).filter(Boolean))].slice(0, 200)
  if (!ids.length) return res.json({ shared: [] })

  const sharedIds = []
  for (const id of ids) {
    try {
      // An id that is not a Convex project id makes the validator throw; that
      // project is simply not shared.
      const grants = await convexQuery('projects:access', { projectId: id })
      if (Array.isArray(grants) && grants.length > 0) sharedIds.push(id)
    } catch (_) {}
  }
  return res.json({ shared: sharedIds })
}
