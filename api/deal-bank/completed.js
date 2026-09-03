// /api/deal-bank/completed — public read of Deal Bank Completed Rounds.
// Backs the /space-rising/deal-bank/completed page.
// Falls back to embedded seed data when nothing has been added yet.
//
// corner:retire-supabase (2026-09-03): rounds used to live in the Supabase
// deal_bank_completed_rounds table. They now live on Convex in the keyed
// `state` table, one row per round: kind DEAL_BANK_KIND, scopeId = round id,
// value = the round fields. /api/deal-bank/add writes them with state:put and
// this endpoint reads them all back with state:get {kind}.

import { convexQuery } from '../_lib/reportsStore.js'

export const DEAL_BANK_KIND = 'deal-bank-completed-round'

// Seed data embedded as fallback until real rounds have been added.
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

const ROUND_COLUMNS = [
  'company', 'amount_raised', 'round', 'date', 'source_url', 'notes',
  'amount_usd_m', 'segment', 'short_description', 'source', 'investors', 'region',
]

// Turn one state row into the row shape the page has always read.
function rowToRound(row) {
  const value = (row && row.value && typeof row.value === 'object') ? row.value : {}
  const out = { id: row.scopeId }
  for (const col of ROUND_COLUMNS) out[col] = value[col] ?? null
  out.created_at = value.created_at || (row.updatedAt ? new Date(row.updatedAt).toISOString() : null)
  return out
}

// Newest date first; rows with no date sink to the bottom.
function byDateDesc(a, b) {
  if (!a.date && !b.date) return 0
  if (!a.date) return 1
  if (!b.date) return -1
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const rows = await convexQuery('state:get', { kind: DEAL_BANK_KIND })
    if (Array.isArray(rows) && rows.length) {
      const rounds = rows.map(rowToRound).sort(byDateDesc).slice(0, 1000)
      res.status(200).json({ rounds, source: 'convex', count: rounds.length })
      return
    }
  } catch (err) {
    console.warn('[deal-bank/completed] Convex read failed, serving seed:', err?.message)
  }

  // Fallback to embedded seed data
  res.status(200).json({ rounds: SEED_ROUNDS, source: 'seed', count: SEED_ROUNDS.length })
}
