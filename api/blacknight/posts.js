// /api/blacknight/posts — public read of the Blacknight funding-rounds table.
// Backs the /blacknight page (src/pages/Blacknight.jsx).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const supabase = SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!supabase) {
    res.status(500).json({ error: 'Supabase not configured (SUPABASE_SERVICE_KEY missing)' })
    return
  }

  const [{ data: rounds, error: roundsErr }, { data: lastRun }] = await Promise.all([
    supabase
      .from('blacknight_rounds')
      .select('id, company, amount_usd, amount_display, round_stage, sector, lead_investor, other_investors, announced_date, post_url, source_url, summary, updated_at')
      .order('amount_usd', { ascending: false, nullsFirst: false }),
    supabase
      .from('blacknight_refresh_log')
      .select('ran_at, status, rows_upserted')
      .eq('status', 'ok')
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (roundsErr) {
    res.status(500).json({ error: roundsErr.message })
    return
  }

  // Fall back to the newest row's updated_at when no successful refresh log
  // exists yet — proves the data IS fresh even if the log row didn't land.
  let latestRowUpdate = null
  for (const r of rounds || []) {
    if (r.updated_at && (!latestRowUpdate || r.updated_at > latestRowUpdate)) {
      latestRowUpdate = r.updated_at
    }
  }

  res.status(200).json({
    rounds: rounds || [],
    last_updated: lastRun?.ran_at || latestRowUpdate || null,
  })
}
