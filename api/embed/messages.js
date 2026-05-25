// GET /api/embed/messages?embed_id=...&since=<iso>
//
// Returns any agent (role=assistant) messages for the embed's routing
// (agent + project) newer than `since`. Widget polls this every 1.5s after
// posting until a reply arrives (max ~60s).

import { REGISTRY } from './config.js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const origin = req.headers.origin || ''

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const q = req.query || {}
  const embedId = q.embed_id
  const since = q.since || new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const visitorId = q.visitor_id || ''

  const cfg = REGISTRY[embedId]
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })

  if (origin && cfg.host_allowlist.indexOf(origin) < 0) {
    return res.status(403).json({ error: 'origin not on allowlist' })
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  // Build the PostgREST query: assistant messages on the right agent+project,
  // newer than since, with the right mission_slug metadata, scoped to client.
  const params = new URLSearchParams()
  params.set('select', 'id,role,text,timestamp,metadata')
  params.set('agent', `eq.${cfg.routing.agent}`)
  params.set('project', `eq.${cfg.routing.project}`)
  params.set('client_id', `eq.${cfg.routing.client_id}`)
  params.set('role', 'in.(assistant,agent)')
  params.set('timestamp', `gt.${since}`)
  params.set('order', 'timestamp.asc')
  params.set('limit', '20')

  const url = `${SUPABASE_URL}/rest/v1/messages?${params.toString()}`
  try {
    const r = await fetch(url, { headers: sbHeaders() })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: t })
    }
    const rows = await r.json()
    // Filter to rows tagged for this mission. Other project messages might
    // share the same agent+project pair if multiple missions are in flight.
    const filtered = rows.filter((row) => {
      const m = row.metadata || {}
      if (m.mission_slug && m.mission_slug !== cfg.routing.mission_slug) return false
      // If a visitor_id was provided, only return rows tagged for that
      // visitor OR untagged replies (older agents won't carry visitor_id).
      if (visitorId && m.embed_visitor_id && m.embed_visitor_id !== visitorId) {
        return false
      }
      return true
    })
    return res.status(200).json({
      messages: filtered.map((row) => ({
        id: row.id,
        role: row.role,
        text: row.text,
        timestamp: row.timestamp,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message) })
  }
}
