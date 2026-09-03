// /api/blacknight/posts: public read of the Blacknight funding rounds.
// Backs the /blacknight page (src/pages/Blacknight.jsx).
//
// corner:retire-supabase R5 (2026-09-03): the Supabase blacknight_rounds
// table is not read any more. The rounds come from a Convex query
// (blacknight:list) when one exists on the deployment; until then the page
// gets an empty list and renders its own "No rounds yet" state instead of a
// 500. The daily refresh cron that fed the old table never ran (it was not
// registered in vercel.json) and has been deleted.

import { convexQuery } from '../_lib/verifyTenant.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let rounds = []
  let lastRun = null
  let note
  try {
    const out = await convexQuery('blacknight:list', {})
    if (Array.isArray(out)) rounds = out
    else if (out && Array.isArray(out.rounds)) { rounds = out.rounds; lastRun = out.last_updated || out.lastUpdated || null }
  } catch (err) {
    // No blacknight table on Convex yet. Empty is honest; the page handles it.
    note = 'blacknight data is not on Convex yet'
    console.log('[blacknight/posts] %s: %s', note, err?.message || err)
  }

  rounds = rounds
    .map((r) => ({
      id: r.id ?? r._id ?? null,
      company: r.company ?? null,
      amount_usd: r.amount_usd ?? r.amountUsd ?? null,
      amount_display: r.amount_display ?? r.amountDisplay ?? null,
      round_stage: r.round_stage ?? r.roundStage ?? null,
      sector: r.sector ?? null,
      lead_investor: r.lead_investor ?? r.leadInvestor ?? null,
      other_investors: r.other_investors ?? r.otherInvestors ?? null,
      announced_date: r.announced_date ?? r.announcedDate ?? null,
      post_url: r.post_url ?? r.postUrl ?? null,
      source_url: r.source_url ?? r.sourceUrl ?? null,
      summary: r.summary ?? null,
      updated_at: r.updated_at ?? (r.updatedAt ? new Date(r.updatedAt).toISOString() : null),
    }))
    .sort((a, b) => (Number(b.amount_usd) || 0) - (Number(a.amount_usd) || 0))

  // Fall back to the newest row's updated_at when no refresh time is known.
  let latestRowUpdate = null
  for (const r of rounds) {
    if (r.updated_at && (!latestRowUpdate || r.updated_at > latestRowUpdate)) {
      latestRowUpdate = r.updated_at
    }
  }

  res.status(200).json({
    rounds,
    last_updated: lastRun || latestRowUpdate || null,
    ...(note ? { note } : {}),
  })
}
