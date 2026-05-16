// GET /api/dashboard/mail/buckets?connection_id=<id>
// Returns { counts: { 'awaiting-reply': N, today: N, ... } }.
// One Gmail messages.list call per bucket with maxResults=1 — only
// resultSizeEstimate is read.

import { extractJwt } from '../../_lib/verifyTenant.js'
import { assertCanUseConnection } from '../../_lib/mailAccess.js'
import { getGmailTokenByConnection, gmailFetch } from '../../_lib/gmailClient.js'
import { BUCKET_SLUGS, buildBucketQuery } from '../../_lib/mailBuckets.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getUserId(req) {
  const jwt = extractJwt(req)
  if (!jwt) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` } })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id || null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })
  const connectionId = (req.query?.connection_id || '').toString()
  if (!connectionId) return res.status(400).json({ error: 'connection_id required' })

  try { await assertCanUseConnection(userId, connectionId) }
  catch (e) { return res.status(e.status || 403).json({ error: e.message }) }

  const creds = await getGmailTokenByConnection(connectionId)
  if (!creds) return res.status(200).json({ counts: {}, mode: 'not-connected' })
  const accountEmail = creds.row?.config?.account_email
  const clientEmails = creds.row?.config?.client_emails || []
  const prospectEmails = creds.row?.config?.prospect_emails || []

  const counts = {}
  await Promise.all(BUCKET_SLUGS.map(async slug => {
    const { q } = buildBucketQuery(slug, { account_email: accountEmail, client_emails: clientEmails, prospect_emails: prospectEmails })
    const r = await gmailFetch(creds.accessToken, `/messages?q=${encodeURIComponent(q)}&maxResults=1`)
    if (!r.ok) { counts[slug] = 0; return }
    const body = await r.json()
    counts[slug] = body.resultSizeEstimate ?? (body.messages?.length || 0)
  }))
  return res.status(200).json({ counts, mode: 'live' })
}
