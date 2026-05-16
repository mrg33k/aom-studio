// POST /api/dashboard/mail/seed-clients
// Body: { connection_id }
//
// One-time on first Mail open: should scan the calling user's project
// CONTEXT.md files for email addresses and write them into
// account_integrations.config.client_emails.
//
// In a Vercel serverless function we can't read the repo filesystem. The full
// implementation will paginate Gmail /threads with `from:me newer_than:90d`,
// collect distinct external From addresses, and persist them onto the row.
//
// v1 ships as a placeholder so the front-end can hit a stable endpoint while
// the Gmail walk is benchmarked. Returns ok:true regardless.

import { extractJwt } from '../../_lib/verifyTenant.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getUserId(req) {
  const jwt = extractJwt(req)
  if (!jwt) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` } })
  return r.ok ? (await r.json())?.id : null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const { connection_id } = req.body || {}
  if (!connection_id) return res.status(400).json({ error: 'connection_id required' })

  try { await assertCanUseConnection(userId, connection_id) }
  catch (e) { return res.status(e.status || 403).json({ error: e.message }) }

  return res.status(200).json({ ok: true, mode: 'placeholder' })
}
