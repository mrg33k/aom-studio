// GET /api/support/activity?wish_id=...&access_code=...
//
// Read-only bridge between the Email desk and the agent room. A support wish is
// handed to the agent as a message (source support-desk) carrying
// metadata.support_wish_id / support_access_code; the agent's live work lands
// in the events ledger as message_step rows keyed to that parent message. The
// Email pane needs both sources to answer "what is being done on this thread?"
//
// corner:retire-supabase (2026-09-03): the trigger comes from
// messages:findBySource, the room thread from messages:list, the steps from
// events:find and the wish timeline from support:get.

import { requiredTenantFromEnv, resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js'
import { convexQuery } from '../_lib/verifyTenant.js'
import { loadWish } from './wishes.js'

const SUPPORT_AGENT = process.env.SUPPORT_AGENT_SLUG || 'elon'

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null)

function cleanStep(raw) {
  let t = String(raw || '').trim()
  if (!t || t === 'settled') return t
  const run = t.match(/^Running:\s*(\S+)/i)
  if (run) {
    const cmd = run[1].replace(/.*\//, '').toLowerCase()
    if (['grep', 'rg', 'find'].includes(cmd)) return 'Searching the thread context'
    if (['curl', 'wget'].includes(cmd)) return 'Checking a live endpoint'
    if (['npm', 'pnpm', 'yarn', 'node'].includes(cmd)) return 'Running a quick check'
    if (['cat', 'sed', 'head', 'tail'].includes(cmd)) return 'Reading the details'
    return 'Working through the request'
  }
  return t
    .replace(/(?:\/[\w.\-]+){2,}\/?/g, 'the files')
    .replace(/\b[\w\-]+\.(?:jsx?|tsx?|py|sh|json|ya?ml|md|css|html?|png|jpe?g|gif|webp|svg)\b/gi, 'the file')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 180)
}

function publicMessage(row) {
  return {
    id: String(row._id),
    role: row.role || (row.agentSlug ? 'assistant' : 'user'),
    source: row.source || '',
    agent: row.agentSlug || '',
    text: String(row.text || '').slice(0, 4000),
    timestamp: iso(row.createdAt),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' })

  let tenantContext
  try {
    tenantContext = await resolveTenantContext(req, {
      fallback: requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']),
    })
  } catch (error) {
    return sendTenantContextError(res, error)
  }
  const tenantId = tenantContext.tenantId

  const wishId = String(req.query.wish_id || '').trim()
  const accessCode = String(req.query.access_code || '').trim().toUpperCase()
  if (!wishId && !accessCode) return res.status(400).json({ ok: false, error: 'wish_id or access_code required' })

  const wantedAgent = String(req.query.agent || SUPPORT_AGENT).toLowerCase()

  // The trigger: the oldest support-desk message that names this wish.
  let candidates = []
  try {
    candidates = await convexQuery('messages:findBySource', { worldId: tenantId, source: 'support-desk', limit: 500 })
  } catch {
    candidates = []
  }
  const trigger = (Array.isArray(candidates) ? candidates : [])
    .filter((m) => {
      const md = m.metadata || {}
      return wishId ? String(md.support_wish_id || '') === wishId : String(md.support_access_code || '').toUpperCase() === accessCode
    })
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0] || null

  // The wish's own timeline (hidden bookkeeping rows stay hidden).
  const found = await loadWish(wishId ? { id: wishId, includeHidden: true } : { accessCode, includeHidden: true })
  const publicUpdates = (found ? found.updates : [])
    .filter((u) => !['thread_cache', 'thread_meta'].includes(u.kind))
    .slice(0, 50)
    .map((u) => ({
      kind: u.kind || '',
      body: String(u.body || '').slice(0, 2000),
      status: u.status || '',
      author: u.author || '',
      created_at: u.created_at || null,
    }))

  if (!trigger) {
    return res.status(200).json({ ok: true, trigger: null, messages: [], steps: [], updates: publicUpdates })
  }

  // The room thread from the trigger onward, up to the next human message.
  let roomRows = []
  try {
    roomRows = await convexQuery('messages:list', { roomId: String(trigger.roomId), limit: 200 })
  } catch {
    roomRows = []
  }
  const scoped = []
  for (const row of (Array.isArray(roomRows) ? roomRows : []).filter((r) => (r.createdAt || 0) >= (trigger.createdAt || 0))) {
    const isHuman = (row.role || (row.agentSlug ? 'assistant' : 'user')) === 'user'
    if (String(row._id) !== String(trigger._id) && isHuman) break
    scoped.push(row)
  }
  if (!scoped.length) scoped.push(trigger)

  // The agent's steps on that message.
  const agent = wantedAgent
  let eventRows = []
  try {
    eventRows = await convexQuery('events:find', {
      event_type: 'message_step',
      payload_eq: { key: 'parent_message_id', value: String(trigger._id) },
      order: 'asc',
      limit: 100,
    })
  } catch {
    eventRows = []
  }
  const steps = (Array.isArray(eventRows) ? eventRows : [])
    .filter((row) => !row.payload || !row.payload.client_id || String(row.payload.client_id) === tenantId)
    .map((row) => {
      const p = row.payload || {}
      return {
        id: row.id,
        text: cleanStep(p.text),
        status: p.status || 'in_progress',
        step_index: p.step_index ?? 0,
        timestamp: row.timestamp || null,
      }
    })
    .filter((s) => s.text && s.text !== 'settled')

  return res.status(200).json({
    ok: true,
    agent,
    trigger: publicMessage(trigger),
    messages: scoped.map(publicMessage),
    steps,
    updates: publicUpdates,
  })
}
