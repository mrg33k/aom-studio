// GET  /api/dashboard/onboarding-state?tenant=<slug>
// POST /api/dashboard/onboarding-state  { tenant, checklist?, nudge_state?, path? }
//
// System-level per-tenant onboarding state for R33 -- pruned-context restart +
// tooltip CTA + decaying nudge. Schema-free: stored as an event row with
// event_type='onboarding_state', agent=<tenant_slug>, payload={checklist,
// nudge_state, path}.
//
// payload shape (all optional at write time; merged into latest on POST):
// {
//   checklist: [{ key, label, status: 'pending'|'done', value?: string }, ...],
//   nudge_state: {
//     last_nudge_ts?: ISO,
//     nudge_count: number,
//     message_count_since_last: number,
//     explicit_no: boolean,          // if user said "no thanks", stop entirely
//   },
//   path: 'projects' | 'onboarding' | null,  // what the user chose after cleanup-hello
// }
//
// This endpoint is tenant-agnostic. Caller passes tenant slug; we never check
// if it equals a specific user. Ben is a proving case; the code does not know
// about Ben.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const EVENT_TYPE = 'onboarding_state'

const EMPTY_STATE = Object.freeze({
  checklist: [],
  nudge_state: { nudge_count: 0, message_count_since_last: 0, explicit_no: false },
  path: null,
})

function validSlug(s) {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-_]{0,64}$/.test(s)
}

async function fetchLatest(tenant) {
  const url = `${SUPABASE_URL}/rest/v1/events` +
    `?event_type=eq.${EVENT_TYPE}` +
    `&agent=eq.${encodeURIComponent(tenant)}` +
    `&order=timestamp.desc` +
    `&limit=1`
  const resp = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!resp.ok) throw new Error(`events read failed: ${resp.status}`)
  const rows = await resp.json()
  if (!rows.length) return { ...EMPTY_STATE }
  const payload = rows[0].payload || {}
  return {
    checklist: Array.isArray(payload.checklist) ? payload.checklist : [],
    nudge_state: { ...EMPTY_STATE.nudge_state, ...(payload.nudge_state || {}) },
    path: payload.path || null,
  }
}

async function writeLatest(tenant, state) {
  const crypto = await import('crypto')
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      event_type: EVENT_TYPE,
      agent: tenant,
      timestamp: new Date().toISOString(),
      payload: state,
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`events write failed: ${resp.status} ${err}`)
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    if (req.method === 'GET') {
      const tenant = (req.query.tenant || '').toString().trim().toLowerCase()
      if (!validSlug(tenant)) return res.status(400).json({ error: 'valid tenant required' })
      const state = await fetchLatest(tenant)
      return res.status(200).json({ tenant, state })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const tenant = (body.tenant || '').toString().trim().toLowerCase()
      if (!validSlug(tenant)) return res.status(400).json({ error: 'valid tenant required' })

      const current = await fetchLatest(tenant)
      const next = {
        checklist: Array.isArray(body.checklist) ? body.checklist : current.checklist,
        nudge_state: body.nudge_state
          ? { ...current.nudge_state, ...body.nudge_state }
          : current.nudge_state,
        path: body.path !== undefined ? body.path : current.path,
      }
      await writeLatest(tenant, next)
      return res.status(200).json({ tenant, state: next })
    }

    return res.status(405).json({ error: 'GET or POST' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
