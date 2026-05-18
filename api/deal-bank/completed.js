// /api/deal-bank/completed — public read of Deal Bank Completed Rounds.
// Backs the /space-rising/deal-bank/completed page.
// Falls back to embedded seed data if the table hasn't been created yet.
//
// SETUP: run the migration SQL in Supabase Studio:
//   supabase/migrations/20260518100000_deal_bank_completed_rounds.sql

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

const supabase = SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null

// Seed data embedded as fallback until the Supabase table is created.
// Source: research/2026-05-18-blacknight-seed.json
const SEED_ROUNDS = [
  {
    id: 'seed-1', company: 'ORBCOMM', amount_raised: '$460M',
    round: 'Refinancing (private credit)', date: '2026-04-29',
    source_url: 'https://satellitetoday.com',
    notes: 'Private credit refinancing led by Carlyle. Co-investors: Bain Credit (Private Credit Group), Morgan Stanley Private Credit.',
  },
  {
    id: 'seed-2', company: 'Astranis Space Technologies', amount_raised: '$300M',
    round: 'Series E', date: '2026-05-06',
    source_url: 'https://spacenews.com',
    notes: 'microGEO satellite company. Co-led by Snowpoint Ventures and Franklin Templeton. Other investors: a16z, BlackRock, Baillie Gifford, Fidelity, BAM Elevate, Nimble Partners.',
  },
  {
    id: 'seed-3', company: 'Cowboy Space Corporation', amount_raised: '$275M',
    round: 'Series B', date: '2026-05-08',
    source_url: 'https://spacenews.com',
    notes: 'Orbital compute and data centers. Led by Index Ventures. Co-investors: IVP, Blossom Capital, SAIC, Breakthrough Energy Ventures, Construct Capital, a16z, NEA, Interlagos.',
  },
  {
    id: 'seed-4', company: 'Star Catcher', amount_raised: '$65M',
    round: 'Series A', date: '2026-05-12',
    source_url: 'https://spacenews.com',
    notes: 'Power-beaming networks for orbital infrastructure. Led by B Capital. Co-investors: Shield Capital, Cerberus Ventures, GreatPoint Ventures, Helena, Oceans Ventures, MVP Ventures.',
  },
  {
    id: 'seed-5', company: 'Lunar Outpost', amount_raised: '$30M',
    round: 'Series B', date: '2026-05-07',
    source_url: 'https://spacenews.com',
    notes: 'Lunar mobility (rovers). Led by Industrious Ventures. Co-investors: Type One Ventures, Eniac Ventures, Promus Ventures, Reliable Equity.',
  },
  {
    id: 'seed-6', company: 'Scout Space', amount_raised: '$18M',
    round: 'Series A', date: '2026-05-06',
    source_url: 'https://payloadspace.com',
    notes: 'Orbital tracking and space domain awareness (SDA). Led by Washington Harbour Partners. Co-investors: VIPC, Noblis Ventures, Decisive Point, Fusion Fund.',
  },
  {
    id: 'seed-7', company: 'INTALUS, Inc.', amount_raised: '$11M',
    round: 'Seed', date: '2026-05-06',
    source_url: 'https://semafor.com',
    notes: 'Advanced aerospace materials. Led by Origin Ventures. Co-investors: Lockheed Martin, Scout Ventures.',
  },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Try Supabase first
  if (supabase) {
    const { data, error } = await supabase
      .from('deal_bank_completed_rounds')
      .select('id, company, amount_raised, round, date, source_url, notes, created_at')
      .order('date', { ascending: false, nullsFirst: false })

    if (!error && data) {
      res.status(200).json({ rounds: data, source: 'supabase' })
      return
    }
    // Table likely not created yet — fall through to seed data
    console.warn('[deal-bank/completed] Supabase error (table may not exist yet):', error?.message)
  }

  // Fallback to embedded seed data
  res.status(200).json({ rounds: SEED_ROUNDS, source: 'seed' })
}
