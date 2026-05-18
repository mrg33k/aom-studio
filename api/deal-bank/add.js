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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  // Auth check
  const providedKey = req.headers['x-admin-key']
  if (!providedKey || providedKey !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized — provide x-admin-key header' })
    return
  }

  if (!supabase) {
    res.status(500).json({ error: 'Supabase not configured' })
    return
  }

  const { company, amount_raised, round, date, source_url, notes } = req.body || {}
  if (!company || !amount_raised || !round) {
    res.status(400).json({ error: 'company, amount_raised, and round are required' })
    return
  }

  const { data, error } = await supabase
    .from('deal_bank_completed_rounds')
    .insert([{ company, amount_raised, round, date: date || null, source_url, notes }])
    .select()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ ok: true, row: data?.[0] })
}
