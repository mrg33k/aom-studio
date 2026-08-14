// GET /api/dashboard/gemini-spend?client_id=aom
//
// Returns total estimated Gemini API spend for the current billing cycle
// (first of the current month → now). Sums gemini_spend events written
// by sse-room-bridge.py after each successful /cvg Gemini turn.
//
// Response: { cost_usd: 2.47, currency: "USD", period_start: "2026-06-01", turns: 83 }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const _geminiClient = req.query.client_id ? String(req.query.client_id).trim() : ''
  if (!_geminiClient) return res.status(401).json({ error: 'Missing client' })
  let tenant
  try {
    ({ tenant } = await verifyTenant(_geminiClient, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const url = new URL(`${SUPABASE_URL}/rest/v1/events`)
  url.searchParams.set('event_type', 'eq.gemini_spend')
  url.searchParams.set('timestamp', `gte.${periodStart}`)
  url.searchParams.set('select', 'payload')
  url.searchParams.set('limit', '5000')

  const r = await fetch(url.toString(), { headers: sbHeaders() })
  if (!r.ok) {
    const err = await r.text()
    return res.status(500).json({ error: `Supabase query failed: ${err}` })
  }

  const rows = await r.json()
  let totalCost = 0
  for (const row of rows) {
    totalCost += Number(row.payload?.cost_usd ?? 0)
  }

  return res.status(200).json({
    cost_usd: Math.round(totalCost * 100) / 100,
    currency: 'USD',
    period_start: periodStart.slice(0, 10),
    turns: rows.length,
  })
}
