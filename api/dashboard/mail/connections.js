// GET /api/dashboard/mail/connections
// Returns every Gmail connection visible to the caller (personal + workspaces),
// scope-tagged. Drives MailAccountSwitcher.

import { extractJwt } from '../../_lib/verifyTenant.js'
import { listConnectionsForUser } from '../../_lib/mailAccess.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getUserId(req) {
  const jwt = extractJwt(req)
  if (!jwt) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  return user?.id || null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'not-authenticated' })

  const connections = await listConnectionsForUser(userId)
  return res.status(200).json({ connections })
}
