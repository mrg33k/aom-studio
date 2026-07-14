// GET /api/support/activity?wish_id=...&access_code=...
//
// Read-only bridge between the Email desk and the agent room. A support wish is
// dispatched to the agent by writing a row to `messages` with
// metadata.support_wish_id/support_access_code; the agent's live work is written
// to `events` as message_step rows keyed to that parent message. The Email pane
// needs both sources to answer "what is being done on this thread?"

import { verifyTenant } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPPORT_AGENT = process.env.SUPPORT_AGENT_SLUG || 'elon'

function headers(prefer = false) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: 'return=representation' } : {}),
  }
}

async function supa(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers() })
  if (!r.ok) return []
  return r.json().catch(() => [])
}

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
    id: row.id,
    role: row.role || '',
    source: row.source || '',
    agent: row.agent || '',
    text: String(row.text || '').slice(0, 4000),
    timestamp: row.timestamp || null,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' })
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Supabase not configured' })

  try {
    await verifyTenant('aom', req)
  } catch {
    return res.status(401).json({ ok: false, error: 'Sign in to the dashboard.' })
  }

  const wishId = String(req.query.wish_id || '').trim()
  const accessCode = String(req.query.access_code || '').trim().toUpperCase()
  if (!wishId && !accessCode) return res.status(400).json({ ok: false, error: 'wish_id or access_code required' })

  const triggerFilters = [
    'select=*',
    'client_id=eq.aom',
    `agent=eq.${encodeURIComponent(String(req.query.agent || SUPPORT_AGENT).toLowerCase())}`,
    'order=timestamp.asc',
    'limit=1',
  ]
  if (wishId) triggerFilters.push(`metadata->>support_wish_id=eq.${encodeURIComponent(wishId)}`)
  else triggerFilters.push(`metadata->>support_access_code=eq.${encodeURIComponent(accessCode)}`)
  const triggers = await supa(`messages?${triggerFilters.join('&')}`)
  const trigger = Array.isArray(triggers) && triggers.length ? triggers[0] : null

  const updatesWhere = wishId
    ? `wish_id=eq.${encodeURIComponent(wishId)}`
    : ''
  const updates = updatesWhere
    ? await supa(`support_wish_updates?select=kind,body,status,author,created_at&${updatesWhere}&order=created_at.asc&limit=50`)
    : []
  const publicUpdates = (Array.isArray(updates) ? updates : [])
    .filter((u) => !['thread_cache', 'thread_meta'].includes(u.kind))
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

  const agent = trigger.agent || SUPPORT_AGENT
  const since = encodeURIComponent(trigger.timestamp || new Date(0).toISOString())
  const roomRows = await supa(`messages?select=*&client_id=eq.aom&agent=eq.${encodeURIComponent(agent)}&timestamp=gte.${since}&order=timestamp.asc&limit=40`)
  const scoped = []
  for (const row of Array.isArray(roomRows) ? roomRows : []) {
    if (row.id !== trigger.id && (row.role === 'user' || row.user_name)) break
    scoped.push(row)
  }

  const eventRows = await supa([
    'events?select=id,agent,payload,timestamp',
    'event_type=eq.message_step',
    `agent=eq.${encodeURIComponent(agent)}`,
    'payload->>client_id=eq.aom',
    `payload->>parent_message_id=eq.${encodeURIComponent(trigger.id)}`,
    'order=timestamp.asc',
    'limit=100',
  ].join('&'))
  const steps = (Array.isArray(eventRows) ? eventRows : [])
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
    trigger: publicMessage(trigger),
    messages: scoped.map(publicMessage),
    steps,
    updates: publicUpdates,
  })
}

