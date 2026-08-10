// GET /api/dashboard/doc-updates?project=corner[&mission=launch-mvp][&limit=40]
//
// R75-h1: returns recent doc_update events for a project/mission surface.
// Proxies to Supabase with the service-role key (events RLS blocks anon/user
// reads). Mirrors /api/dashboard/message-steps.
//
// Response shape:
//   { updates: [{ id, agent, file, project, mission, doc_type, summary,
//                 commit_sha, actor, timestamp }] }

// SECURITY (corner:tenant-isolation R1): the events table has no client_id, so
// this feed was reading doc_update events across ALL worlds with no auth —
// exposing repo file paths, commit shas, and agent identities cross-world. Now
// ?project is required and gated by verifyProjectAccess(project); only that
// project's rows are returned.
import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const project = (req.query.project || '').toString().toLowerCase()
  if (!project) return res.status(400).json({ error: 'project required' })
  try {
    await verifyProjectAccess(project, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }
  const mission = (req.query.mission || '').toString().toLowerCase()
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100)

  const qsParts = [
    'select=id,agent,payload,timestamp',
    'event_type=eq.doc_update',
    `order=timestamp.desc`,
    `limit=${limit}`,
  ]

  const url = `${SUPABASE_URL}/rest/v1/events?${qsParts.join('&')}`
  let rows = []
  try {
    const r = await fetch(url, { headers: headers() })
    if (r.ok) rows = await r.json()
  } catch (_) {}

  const updates = []
  for (const row of rows) {
    const p = row.payload || {}
    if (project && (p.project || '').toLowerCase() !== project) continue
    if (mission && (p.mission || '').toLowerCase() !== mission) continue
    updates.push({
      id: row.id,
      agent: row.agent,
      file: p.file || '',
      project: p.project || '',
      mission: p.mission || '',
      doc_type: p.doc_type || '',
      summary: p.summary || 'updated',
      commit_sha: p.commit_sha || '',
      actor: p.actor || '',
      timestamp: row.timestamp,
    })
  }
  return res.status(200).json({ updates })
}
