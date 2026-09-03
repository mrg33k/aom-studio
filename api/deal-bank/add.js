// /api/deal-bank/add — admin-only endpoint to add a new completed round.
// Protected by DEAL_BANK_ADMIN_KEY env var, or a signed-in Corner account on
// the allowlist below.
//
// POST body: { company, amount_raised, round, date, source_url, notes, ... }
//
// Example curl:
//   curl -X POST https://aheadofmarket.com/api/deal-bank/add \
//     -H "Content-Type: application/json" \
//     -H "x-admin-key: $DEAL_BANK_ADMIN_KEY" \
//     -d '{"company":"Acme Space","amount_raised":"$50M","round":"Series A","date":"2026-06-01","source_url":"https://spacenews.com","notes":"Orbital propulsion startup."}'
//
// corner:retire-supabase (2026-09-03): rounds used to be inserted into the
// Supabase deal_bank_completed_rounds table. They are now rows in the Convex
// keyed `state` table (kind DEAL_BANK_KIND, scopeId = round id), written with
// state:put. /api/deal-bank/completed reads them back. The old "use the
// Supabase service key as the admin key" fallback is gone: set
// DEAL_BANK_ADMIN_KEY or sign in.

import crypto from 'crypto'
import { convexMutation } from '../_lib/reportsStore.js'
import { DEAL_BANK_KIND } from './completed.js'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || ''
const ADMIN_KEY = process.env.DEAL_BANK_ADMIN_KEY || ''

// Authorized Corner accounts that may manage the deal bank with their own login
// (no separate admin key needed — "his same logins").
const ALLOWLIST = ['ben@arsenalgpa.com', 'patrikmatheson@gmail.com']
function isAllowedEmail(email) {
  if (!email) return false
  const n = String(email).trim().toLowerCase()
  return n.endsWith('@aom-inhouse.com') || ALLOWLIST.includes(n)
}

// Who does this Convex Auth token belong to? users:verifyToken reads the
// Bearer header through ctx.auth and answers {userId, email, ...} or null.
async function userFromToken(token) {
  try {
    const r = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ path: 'users:verifyToken', args: {}, format: 'json' }),
    })
    if (!r.ok) return null
    const data = await r.json()
    if (!data || data.status !== 'success') return null
    return data.value && data.value.userId ? data.value : null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  // Auth: EITHER the shared admin key, OR a logged-in Corner user on the allowlist.
  let authed = false
  const providedKey = req.headers['x-admin-key']
  if (ADMIN_KEY && providedKey && providedKey === ADMIN_KEY) authed = true
  if (!authed) {
    const h = req.headers['authorization'] || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (token) {
      const u = await userFromToken(token)
      if (u && isAllowedEmail(u.email)) authed = true
    }
  }
  if (!authed) {
    res.status(401).json({ error: 'Unauthorized — log in with an authorized account or provide x-admin-key' })
    return
  }

  const {
    company, amount_raised, round, date, source_url, notes,
    // Extended columns added in R5b schema migration
    amount_usd_m, segment, short_description, source, investors, region,
  } = req.body || {}

  if (!company || !round) {
    res.status(400).json({ error: 'company and round are required' })
    return
  }

  const row = {
    company,
    amount_raised: amount_raised || null,
    round,
    date: date || null,
    source_url: source_url || null,
    notes: notes || null,
    amount_usd_m: amount_usd_m != null ? Number(amount_usd_m) : null,
    segment: segment || null,
    short_description: short_description || null,
    source: source || null,
    investors: investors || null,
    region: region || null,
    created_at: new Date().toISOString(),
  }

  const id = crypto.randomUUID()
  try {
    await convexMutation('state:put', {
      ...(CONVEX_KEY ? { key: CONVEX_KEY } : {}),
      kind: DEAL_BANK_KIND,
      scopeId: id,
      value: row,
      updatedBy: 'deal-bank/add',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
    return
  }

  res.status(201).json({ ok: true, row: { id, ...row } })
}
