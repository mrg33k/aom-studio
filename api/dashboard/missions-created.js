// GET /api/dashboard/missions-created?project=corner[&limit=20]
//
// R75-h2: returns recent mission_created events for a project. Same
// service-role proxy pattern as /api/dashboard/doc-updates.
//
// Response shape:
//   { missions: [{ id, agent, project, mission, description,
//                  file_count, timestamp }] }

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
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)

  const qs = [
    'select=id,agent,payload,timestamp',
    'event_type=eq.mission_created',
    'order=timestamp.desc',
    `limit=${limit}`,
  ].join('&')

  let rows = []
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${qs}`, { headers: headers() })
    if (r.ok) rows = await r.json()
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
  }
  return res.status(200).json({ missions })
}
