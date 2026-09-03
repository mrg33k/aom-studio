// GET /api/embed/steps?embed_id=...&parent_message_id=<id>
//
// Returns the live-thread step events for the visitor's last message.
// Two sources, merged (corner:retire-supabase, 2026-09-03):
//   1. The Convex events table, event_type='message_step', scoped by
//      payload.parent_message_id. This is the shape the terminal bridge
//      writes (relay-emit-step) and the dashboard live thread reads.
//   2. The Convex turns table for the embed's room: an agent turn that names
//      this message carries its own steps ([{label, done}]).
//
// Widget polls this in parallel with /api/embed/messages so the visitor
// sees real progress while the agent works ("Looking at SRWPartnerships.jsx",
// "Running a quick command", "Reading your message"...).

// The embed config comes from getEmbed in ./messages.js (Convex embeds:get
// first, bundled _embeds.json as the fallback).
import { getEmbed } from './messages.js'
import { convexQuery } from '../_lib/reportsStore.js'

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

// Steps written as message_step events (latest status per step_index; an index
// can flip in_progress -> done).
async function stepsFromEvents(parentId) {
  const rows = await convexQuery('events:find', {
    event_type: 'message_step',
    payload_eq: { key: 'parent_message_id', value: parentId },
    order: 'asc',
    limit: 100,
  })
  const latestByIdx = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    const p = row.payload || {}
    const idx = p.step_index
    if (idx === undefined || idx === null) continue
    const prev = latestByIdx.get(idx)
    if (!prev || (row.timestamp || '') > (prev.timestamp || '')) {
      latestByIdx.set(idx, { ...row, _idx: idx })
    }
  }
  return Array.from(latestByIdx.values())
    .sort((a, b) => a._idx - b._idx)
    .map((row) => ({
      index: row._idx,
      text: row.payload.text || '',
      status: row.payload.status || 'in_progress',
      timestamp: row.timestamp,
    }))
}

// Steps from the Convex agent turn that answers this message, if the embed's
// room can be resolved. Room key grammar mirrors api/_lib/write-message.js
// deriveRoomId: mission room when the embed names a mission, else project.
async function stepsFromTurns(cfg, parentId) {
  const routing = cfg.routing || {}
  const world = routing.client_id
  if (!world || String(world).startsWith('shared:')) return []
  let lookup
  if (routing.mission_slug) {
    const slug = String(routing.mission_slug)
    const idx = slug.indexOf(':')
    lookup = idx > 0
      ? { worldSlug: world, kind: 'mission', project: slug.slice(0, idx), key: slug.slice(idx + 1) }
      : { worldSlug: world, kind: 'mission', project: routing.project || undefined, key: slug }
  } else if (routing.project) {
    lookup = { worldSlug: world, kind: 'project', key: String(routing.project) }
  } else {
    lookup = { worldSlug: world, kind: 'agent', key: String(routing.agent || 'elon') }
  }
  const room = await convexQuery('rooms:resolveCanonical', lookup)
  if (!room || !room._id) return []
  const turns = await convexQuery('turns:listTurns', { roomId: room._id })
  const mine = (Array.isArray(turns) ? turns : []).filter((t) => String(t.messageId || '') === String(parentId))
  const out = []
  let index = 0
  for (const turn of mine.sort((a, b) => a.startedAt - b.startedAt)) {
    const ts = new Date(turn.completedAt || turn.startedAt).toISOString()
    for (const step of Array.isArray(turn.steps) ? turn.steps : []) {
      out.push({
        index: index++,
        text: step.label || '',
        status: step.done ? 'done' : (turn.status === 'failed' ? 'failed' : 'in_progress'),
        timestamp: ts,
      })
    }
  }
  return out
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

  try {
    let steps = await stepsFromEvents(String(parentId))
    if (!steps.length) {
      try {
        steps = await stepsFromTurns(cfg, String(parentId))
      } catch (_) {
        steps = []
      }
    }
    return res.status(200).json({ steps })
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message) })
  }
}
