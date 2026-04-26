// GET /api/dashboard/message-steps?client_id=aom&agent=elon[&project=corner][&limit=20]
//
// Returns recent message_step events for a surface. Proxies to Supabase with
// the service-role key because events RLS blocks anon/user reads, which is
// why R65-impl's client-side subscription never rendered steps in practice.
//
// Response shape:
//   { steps: [{ id, agent, parent_message_id, step_index, text, status, timestamp, project }] }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  let tenant
  try {
    ({ tenant } = await verifyTenant(req.query.client_id || 'aom', req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const clientId = tenant
  const agent = (req.query.agent || '').toString().toLowerCase()
  const project = (req.query.project || '').toString().toLowerCase()
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100)

  const qsParts = [
    'select=id,agent,payload,timestamp',
    'event_type=eq.message_step',
    `order=timestamp.desc`,
    `limit=${limit}`,
  ]
  if (agent) qsParts.push(`agent=eq.${encodeURIComponent(agent)}`)

  const url = `${SUPABASE_URL}/rest/v1/events?${qsParts.join('&')}`
  let rows = []
  try {
    const r = await fetch(url, { headers: headers() })
    if (r.ok) rows = await r.json()
  } catch (_) {}

  const steps = []
  for (const row of rows) {
    const p = row.payload || {}
    if ((p.client_id || clientId) !== clientId) continue
    if (project && (p.project || '') !== project) continue
    const pid = p.parent_message_id
    if (!pid) continue
    steps.push({
      id: row.id,
      agent: row.agent,
      parent_message_id: pid,
      step_index: p.step_index ?? 0,
      text: p.text || '',
      status: p.status || 'in_progress',
      timestamp: row.timestamp,
      project: p.project || '',
    })
  }
  return res.status(200).json({ steps })
}
