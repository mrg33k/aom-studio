// /api/blacknight/refresh — daily auto-update for the /blacknight funding tracker.
//
// Triggered by Vercel Cron (see vercel.json `crons`). Uses Claude + web_search
// to find recent funding-round posts from Blacknight Space Labs on LinkedIn,
// then upserts structured rows into the `blacknight_rounds` table.
//
// Manual trigger (for testing):
//   curl -X POST https://aheadofmarket.com/api/blacknight/refresh \
//     -H "Authorization: Bearer $CRON_SECRET"

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

const supabase = SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null

// Today's date for the prompt — injected at runtime so refreshes stay accurate.
const TODAY = new Date().toISOString().slice(0, 10)

const EXTRACTION_PROMPT = `You are building a comprehensive database of publicly announced space-industry funding rounds from January 1, 2026 through ${TODAY}.

Use the web_search tool as many times as needed. Try as many of these searches as possible within your allowed uses, prioritising variety of sources:

Search 1: space startup "funding round" OR "raised" 2026 site:techcrunch.com
Search 2: space company investment 2026 site:spacenews.com
Search 3: space funding 2026 site:payloadspace.com
Search 4: "Blacknight Space Labs" funding announcement 2026
Search 5: space company "series A" OR "series B" OR "series C" 2026 million
Search 6: space startup funding 2026 site:crunchbase.com
Search 7: satellite OR launch OR "space tourism" funding raised 2026 SpaceCapital OR "Space Capital"
Search 8: space company raised million 2026 -site:twitter.com
Search 9: space industry investment Q1 2026 OR Q2 2026
Search 10: rocket OR satellite OR lunar OR orbital company funding 2026

Collect every DISTINCT funding round you find that was announced between 2026-01-01 and ${TODAY}. The space-industry scope is broad — include:
- Launch vehicles / rockets
- Satellites (comms, earth observation, navigation, weather)
- In-space propulsion, servicing, or manufacturing
- Space tourism / transportation
- Defense / national security space
- Lunar, Mars, or asteroid-resource companies
- Space ground-systems software or hardware
- Space-adjacent deep-tech where space is the primary market

Return ONLY a JSON array (no prose, no markdown fences) of objects with these exact keys:

[
  {
    "company": "Company name",
    "amount_usd": 65000000,
    "amount_display": "$65M",
    "round_stage": "Series A",
    "sector": "One-line sector description",
    "lead_investor": "Lead investor name or null",
    "other_investors": ["Investor 1", "Investor 2"],
    "announced_date": "2026-04-15",
    "post_url": null,
    "source_url": "https://techcrunch.com/2026/04/15/...",
    "summary": "One sentence summary of the round.",
    "raw_post": null
  }
]

Rules:
- amount_usd is an integer in USD ("$65M" → 65000000, "$1.2B" → 1200000000). Use null if undisclosed.
- announced_date is ISO YYYY-MM-DD, or null if unknown. Only include rounds from 2026-01-01 to ${TODAY}.
- other_investors is an array (possibly empty).
- source_url must be the most authoritative public URL for the announcement (TechCrunch > SpaceNews > Payload > company press release > LinkedIn post). This field is REQUIRED — do not leave it null unless you truly cannot find any URL.
- For Blacknight Space Labs posts on LinkedIn, use the LinkedIn post URL as source_url (and post_url).
- If a field can't be determined, use null (or [] for other_investors).
- Return ALL rounds found across all sources, deduplicated by company + round stage.
- Do not invent data. If the company name is unclear, skip the row.
- Aim to be comprehensive — the goal is 30-80+ rows covering every publicly known round.
- Output MUST be a valid JSON array and nothing else.`

function extractJsonArray(text) {
  if (!text) return null
  const trimmed = text.trim()
  // Strip ```json fences if Claude wrapped them despite instructions
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('[')
  const end = candidate.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

async function callClaudeForRounds() {
  const requestBody = {
    model: 'claude-sonnet-4-5-20251001',
    max_tokens: 8192,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
    messages: [{ role: 'user', content: EXTRACTION_PROMPT }],
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!r.ok) {
    const errText = await r.text()
    throw new Error(`Anthropic API ${r.status}: ${errText.slice(0, 500)}`)
  }

  const json = await r.json()
  const textBlocks = (json.content || []).filter(b => b.type === 'text')
  const fullText = textBlocks.map(b => b.text).join('\n')
  const rounds = extractJsonArray(fullText)
  if (!Array.isArray(rounds)) {
    throw new Error(`Could not parse JSON array from model output. First 300 chars: ${fullText.slice(0, 300)}`)
  }
  return rounds
}

function sanitizeRow(r) {
  if (!r || typeof r !== 'object') return null
  const company = (r.company || '').toString().trim()
  if (!company) return null
  const roundStage = (r.round_stage || '').toString().trim() || 'Unknown'

  let amountUsd = null
  if (typeof r.amount_usd === 'number' && Number.isFinite(r.amount_usd)) {
    amountUsd = Math.round(r.amount_usd)
  } else if (typeof r.amount_usd === 'string' && r.amount_usd.trim() !== '') {
    const parsed = Number(r.amount_usd)
    if (Number.isFinite(parsed)) amountUsd = Math.round(parsed)
  }

  let announcedDate = null
  if (typeof r.announced_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.announced_date)) {
    announcedDate = r.announced_date
  }

  const otherInvestors = Array.isArray(r.other_investors)
    ? r.other_investors.map(s => (s || '').toString().trim()).filter(Boolean)
    : []

  return {
    company,
    amount_usd: amountUsd,
    amount_display: (r.amount_display || '').toString().trim() || null,
    round_stage: roundStage,
    sector: (r.sector || '').toString().trim() || null,
    lead_investor: (r.lead_investor || '').toString().trim() || null,
    other_investors: otherInvestors,
    announced_date: announcedDate,
    post_url: (r.post_url || '').toString().trim() || null,
    source_url: (r.source_url || '').toString().trim() || null,
    summary: (r.summary || '').toString().trim() || null,
    raw_post: (r.raw_post || '').toString().trim() || null,
    updated_at: new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  // Vercel Cron uses GET with `Authorization: Bearer ${CRON_SECRET}`.
  // We also allow POST for manual runs.
  const auth = req.headers.authorization || ''
  const expected = CRON_SECRET ? `Bearer ${CRON_SECRET}` : null
  if (expected && auth !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (!supabase) {
    res.status(500).json({ error: 'Supabase not configured (SUPABASE_SERVICE_KEY missing)' })
    return
  }
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  const startedAt = Date.now()
  let rounds = []
  let rowsUpserted = 0
  let status = 'ok'
  let errorMessage = null

  try {
    rounds = await callClaudeForRounds()
    const sanitized = rounds.map(sanitizeRow).filter(Boolean)

    if (sanitized.length > 0) {
      const { data, error } = await supabase
        .from('blacknight_rounds')
        .upsert(sanitized, { onConflict: 'company,round_stage' })
        .select('id')
      if (error) throw new Error(`Supabase upsert: ${error.message}`)
      rowsUpserted = (data || []).length
    }
  } catch (err) {
    status = 'error'
    errorMessage = err?.message || String(err)
    console.error('[blacknight refresh]', errorMessage)
  }

  const durationMs = Date.now() - startedAt

  await supabase.from('blacknight_refresh_log').insert({
    status,
    rows_upserted: rowsUpserted,
    rows_seen: rounds.length,
    error_message: errorMessage,
    duration_ms: durationMs,
  })

  res.status(status === 'ok' ? 200 : 500).json({
    status,
    rows_seen: rounds.length,
    rows_upserted: rowsUpserted,
    duration_ms: durationMs,
    error: errorMessage,
  })
}
