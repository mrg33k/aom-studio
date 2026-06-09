// /api/deal-bank/add — admin-only endpoint to add a new completed round.
// Protected by DEAL_BANK_ADMIN_KEY env var (or SUPABASE_SERVICE_KEY for quick setup).
//
// POST body: { company, amount_raised, round, date, source_url, notes }
//
// Example curl:
//   curl -X POST https://aheadofmarket.com/api/deal-bank/add \
//     -H "Content-Type: application/json" \
//     -H "x-admin-key: $DEAL_BANK_ADMIN_KEY" \
//     -d '{"company":"Acme Space","amount_raised":"$50M","round":"Series A","date":"2026-06-01","source_url":"https://spacenews.com","notes":"Orbital propulsion startup."}'
//
// ALTERNATIVELY: paste a row directly in Supabase Studio:
//   INSERT INTO deal_bank_completed_rounds (company, amount_raised, round, date, source_url, notes)
//   VALUES ('Acme Space', '$50M', 'Series A', '2026-06-01', 'https://spacenews.com', 'Orbital propulsion startup.');

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const supabase = SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null

const ADMIN_KEY = process.env.DEAL_BANK_ADMIN_KEY || SUPABASE_SERVICE_KEY

// Authorized Corner accounts that may manage the deal bank with their own login
// (no separate admin key needed — "his same logins").
const ALLOWLIST = ['ben@arsenalgpa.com', 'patrikmatheson@gmail.com']
function isAllowedEmail(email) {
  if (!email) return false
  const n = String(email).trim().toLowerCase()
  return n.endsWith('@aom-inhouse.com') || ALLOWLIST.includes(n)
}
async function userFromJwt(jwt) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${jwt}` },
    })
    if (!r.ok) return null
    const u = await r.json()
    return u && u.id ? u : null
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
  if (providedKey && providedKey === ADMIN_KEY) authed = true
  if (!authed) {
    const h = req.headers['authorization'] || ''
    const jwt = h.startsWith('Bearer ') ? h.slice(7) : null
    if (jwt) {
      const u = await userFromJwt(jwt)
      if (u && isAllowedEmail(u.email)) authed = true
    }
  }
  if (!authed) {
    res.status(401).json({ error: 'Unauthorized — log in with an authorized account or provide x-admin-key' })
    return
  }

  if (!supabase) {
    res.status(500).json({ error: 'Supabase not configured' })
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
  }

  const { data, error } = await supabase
    .from('deal_bank_completed_rounds')
    .insert([row])
    .select()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ ok: true, row: data?.[0] })
}
