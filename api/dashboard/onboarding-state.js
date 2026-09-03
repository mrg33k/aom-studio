// GET  /api/dashboard/onboarding-state?tenant=<slug>
// POST /api/dashboard/onboarding-state  { tenant, checklist?, nudge_state?, path? }
//
// System-level per-tenant onboarding state for R33: pruned-context restart +
// tooltip CTA + decaying nudge.
//
// corner:retire-supabase (2026-09-03): stored as ONE keyed row in the Convex
// state table (state:get / state:put, kind='onboarding_state', scopeId=<tenant>,
// scoped to the tenant's world). It used to be an append-only event row per
// write in the Supabase events table; a keyed row is the same read with no
// history to page through. kb:get was the suggested replacement but it returns
// only the key and byte count, never the content, so it cannot back a read.
//
// value shape (all optional at write time; merged into latest on POST):
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
// This endpoint is tenant-agnostic: it doesn't hardcode any specific tenant,
// but every call still requires a JWT authorized for the requested tenant via
// verifyTenant (R3 Phase 2, 2026-04-26).

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js'

const STATE_KIND = 'onboarding_state'

const EMPTY_STATE = Object.freeze({
  checklist: [],
  nudge_state: { nudge_count: 0, message_count_since_last: 0, explicit_no: false },
  path: null,
})

function validSlug(s) {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-_]{0,64}$/.test(s)
}

async function fetchLatest(tenant) {
  const row = await convexQuery('state:get', { kind: STATE_KIND, scopeId: tenant, worldId: tenant })
  const payload = (row && row.value && typeof row.value === 'object') ? row.value : null
  if (!payload) return { ...EMPTY_STATE }
  return {
    checklist: Array.isArray(payload.checklist) ? payload.checklist : [],
    nudge_state: { ...EMPTY_STATE.nudge_state, ...(payload.nudge_state || {}) },
    path: payload.path || null,
  }
}

async function writeLatest(tenant, state) {
  await convexMutation('state:put', {
    kind: STATE_KIND,
    scopeId: tenant,
    worldSlug: tenant,
    value: state,
    updatedBy: 'onboarding-state.js',
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const requested = (req.query.tenant || '').toString().trim().toLowerCase()
      if (!validSlug(requested)) return res.status(400).json({ error: 'valid tenant required' })
      let tenant
      try {
        ({ tenant } = await verifyTenant(requested, req))
      } catch (err) {
        if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
        throw err
      }
      const state = await fetchLatest(tenant)
      return res.status(200).json({ tenant, state })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const requested = (body.tenant || '').toString().trim().toLowerCase()
      if (!validSlug(requested)) return res.status(400).json({ error: 'valid tenant required' })
      let tenant
      try {
        ({ tenant } = await verifyTenant(requested, req))
      } catch (err) {
        if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
        throw err
      }

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
