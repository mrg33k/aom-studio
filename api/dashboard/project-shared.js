// GET /api/dashboard/project-shared?project_ids=id1,id2,...
//
// Returns which project IDs have at least one project_access entry (i.e. are shared).
// Uses service role key to bypass RLS — browser can't query project_access for other users.

import { callerIdentity } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Service-key read of project_access — was fully unauthenticated. Require any
  // verified session (a logged-in dashboard user renders share badges for their
  // own project ids); anonymous callers are refused.
  const who = await callerIdentity(req)
  if (!who) return res.status(401).json({ error: 'authentication required' })

  const { project_ids } = req.query
  if (!project_ids) return res.status(400).json({ error: 'project_ids required' })

  const ids = project_ids.split(',').map(s => s.trim()).filter(Boolean)
  if (!ids.length) return res.json({ shared: [] })

  const inFilter = ids.map(id => `"${id}"`).join(',')
  const url = `${SUPABASE_URL}/rest/v1/project_access?select=project_id&project_id=in.(${ids.join(',')})`

  const sbRes = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })

  if (!sbRes.ok) {
    return res.status(500).json({ error: 'Supabase query failed' })
  }

  const rows = await sbRes.json()
  const sharedIds = [...new Set((rows || []).map(r => r.project_id))]
  return res.json({ shared: sharedIds })
}
