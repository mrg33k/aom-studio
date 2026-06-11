// GET /api/embed/messages?embed_id=...&since=<iso>
//
// Returns any agent (role=assistant) messages for the embed's routing
// (agent + project) newer than `since`. Widget polls this every 1.5s after
// posting until a reply arrives (max ~60s).

import { getEmbed } from '../../lib/embed-registry.js'

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
  // history=1 → initial page load: return the visitor's full recent
  // conversation (user + agent rows) so a refresh doesn't lose the thread.
  const historyMode = q.history === '1'
  const since =
    q.since ||
    new Date(
      Date.now() - (historyMode ? 7 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000)
    ).toISOString()
  const visitorId = q.visitor_id || ''

  const cfg = await getEmbed(embedId)
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })

  if (origin && cfg.host_allowlist.indexOf(origin) < 0) {
    return res.status(403).json({ error: 'origin not on allowlist' })
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  // The visitor's own message ids — the allowlist anchor. The bridge sets
  // reply_to to the message it answers, so "replies to this visitor" is an
  // exact set. Everything else in the room (operator chat, build updates,
  // task bubbles) must NEVER reach the embed (Patrik 2026-06-11: Ethan only
  // sees the chat with his teacher).
  const visitorMsgIds = new Set()
  if (visitorId) {
    const up = new URLSearchParams()
    up.set('select', 'id,metadata')
    up.set('agent', `eq.${cfg.routing.agent}`)
    up.set('project', `eq.${cfg.routing.project}`)
    up.set('client_id', `eq.${cfg.routing.client_id}`)
    up.set('role', 'eq.user')
    up.set(
      'timestamp',
      `gt.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`
    )
    up.set('order', 'timestamp.desc')
    up.set('limit', '200')
    try {
      const ur = await fetch(`${SUPABASE_URL}/rest/v1/messages?${up.toString()}`, {
        headers: sbHeaders(),
      })
      if (ur.ok) {
        for (const row of await ur.json()) {
          const meta = row.metadata || {}
          if ((meta.embed_visitor_id || '') === visitorId) {
            visitorMsgIds.add(row.id)
          }
        }
      }
    } catch (_) {
      // non-fatal — falls through to the strict filter below, which will
      // simply show no untagged agent rows until the next poll succeeds
    }
  }

  // Build the PostgREST query: assistant messages on the right agent+project,
  // newer than since, with the right mission_slug metadata, scoped to client.
  const params = new URLSearchParams()
  params.set('select', 'id,role,text,timestamp,metadata,reply_to')
  params.set('agent', `eq.${cfg.routing.agent}`)
  params.set('project', `eq.${cfg.routing.project}`)
  params.set('client_id', `eq.${cfg.routing.client_id}`)
  params.set(
    'role',
    historyMode ? 'in.(user,assistant,agent)' : 'in.(assistant,agent)'
  )
  params.set('timestamp', `gt.${since}`)
  params.set('order', 'timestamp.asc')
  params.set('limit', historyMode ? '200' : '20')

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
    // The bridge normalizes mission slugs to the short form (R16), so a
    // reply may carry "summerschool" while the embed config says
    // "aheadofmarket.com:summerschool". Match either form.
    const wantSlug = cfg.routing.mission_slug || ''
    const wantShort = wantSlug.includes(':') ? wantSlug.split(':').pop() : wantSlug
    const filtered = rows.filter((row) => {
      const m = row.metadata || {}
      // Never surface file-share / attachment messages (the mission-folder
      // watcher posts these for operators; they confuse embed visitors).
      if (m.attachment || (Array.isArray(m.attachments) && m.attachments.length)) {
        return false
      }
      // Drop empty/whitespace-only rows — the bridge occasionally writes a
      // blank assistant message after tool work; it renders as a tiny empty
      // bubble in the widget (seen live 2026-06-11).
      const bodyText =
        (row.role === 'user' && m.visitor_text) || row.text || ''
      if (!String(bodyText).trim()) return false
      const rowSlug = m.mission_slug || m.mission || ''
      const rowShort = rowSlug.includes(':') ? rowSlug.split(':').pop() : rowSlug
      if (rowSlug && rowShort !== wantShort) return false
      // User rows only ever belong to their own visitor — in history mode a
      // user row without a matching visitor tag is someone else's (operator).
      if (row.role === 'user' && (m.embed_visitor_id || '') !== visitorId) {
        return false
      }
      // Agent rows: strict allowlist. Show only rows tagged for this visitor
      // (embed-ai path) or bridge replies whose reply_to is one of the
      // visitor's own messages. Operator conversations and build/status
      // traffic in the same room never pass.
      if (row.role !== 'user' && visitorId) {
        const tagged = m.embed_visitor_id || ''
        if (tagged) {
          if (tagged !== visitorId) return false
        } else if (!row.reply_to || !visitorMsgIds.has(row.reply_to)) {
          return false
        }
      }
      return true
    })
    return res.status(200).json({
      messages: filtered.map((row) => ({
        id: row.id,
        role: row.role,
        // User rows store "— Web Portal"-suffixed text; show the clean
        // visitor text preserved in metadata instead.
        text:
          (row.role === 'user' && row.metadata && row.metadata.visitor_text) ||
          row.text,
        timestamp: row.timestamp,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message) })
  }
}
