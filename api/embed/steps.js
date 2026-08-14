// GET /api/embed/steps?embed_id=...&parent_message_id=<uuid>
//
// Returns the live-thread step events for the visitor's last message.
// Same source the dashboard live thread reads: events table,
// event_type='message_step', scoped by payload.parent_message_id.
//
// Widget polls this in parallel with /api/embed/messages so the visitor
// sees real progress while the agent works ("Looking at SRWPartnerships.jsx",
// "Running a quick command", "Reading your message"...).

import { getEmbed } from '../../lib/embed-registry.js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// ─── Exact origin + scheme check (TOP-20 #3 #13) ────────────────────────────
function normalizeOrigin(origin) {
  try {
    const u = new URL(String(origin).trim());
    const isLocalhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1' || u.hostname === '[::1]';
    if (u.protocol === 'https:') {
    } else if (u.protocol === 'http:' && isLocalhost) {
    } else {
      return null;
    }
    if (u.pathname !== '/' && u.pathname !== '') return null;
    if (u.search || u.hash) return null;
    return u.origin;
  } catch {
    return null;
  }
}
function isOriginAllowed(origin, allowlist) {
  if (!origin || !Array.isArray(allowlist) || allowlist.length === 0) return false;
  const norm = normalizeOrigin(origin);
  if (!norm) return false;
  for (const allowed of allowlist) {
    const aNorm = normalizeOrigin(allowed);
    if (aNorm && aNorm === norm) return true;
  }
  return false;
}

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
  const parentId = q.parent_message_id

  const cfg = await getEmbed(embedId)
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })
  if (!parentId) return res.status(400).json({ error: 'parent_message_id required' })

  // Exact origin + scheme check
  if (origin && !isOriginAllowed(origin, cfg.host_allowlist)) {
    return res.status(403).json({ error: 'origin not on allowlist' })
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  // events table — event_type='message_step', payload.parent_message_id eq parentId
  const params = new URLSearchParams()
  params.set('select', 'id,timestamp,payload')
  params.set('event_type', 'eq.message_step')
  params.set('payload->>parent_message_id', `eq.${parentId}`)
  params.set('limit', '100')

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?${params.toString()}`,
      { headers: sbHeaders() }
    )
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: t })
    }
    const rows = await r.json()
    // Latest status per step_index (an index can flip in_progress -> done).
    const latestByIdx = new Map()
    for (const row of rows) {
      const p = row.payload || {}
      const idx = p.step_index
      if (idx === undefined || idx === null) continue
      const prev = latestByIdx.get(idx)
      if (!prev || (row.timestamp || '') > (prev.timestamp || '')) {
        latestByIdx.set(idx, { ...row, _idx: idx })
      }
    }
    const steps = Array.from(latestByIdx.values())
      .sort((a, b) => a._idx - b._idx)
      .map((row) => ({
        index: row._idx,
        text: row.payload.text || '',
        status: row.payload.status || 'in_progress',
        timestamp: row.timestamp,
      }))

    return res.status(200).json({ steps })
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message) })
  }
}
