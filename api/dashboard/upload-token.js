// POST /api/dashboard/upload-token
// Body: { world }
// Returns: { token, expires_at, upload_url }
//
// Mints a short-lived HMAC-signed token that lets the browser upload a file
// directly to the RAG server's /upload-file-binary endpoint (rag.aheadofmarket.com),
// bypassing the Vercel 25MB body cap.
//
// The same UPLOAD_SIGNING_SECRET must be set in both this Vercel env and the
// rag-server.py environment. See research/2026-05-12-r79-f7-signed-url-plan.md.

import crypto from 'node:crypto'
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const SIGNING_SECRET = process.env.UPLOAD_SIGNING_SECRET || ''
const TOKEN_TTL_SECONDS = 5 * 60 // 5 minutes
const UPLOAD_BASE_URL = process.env.RAG_PUBLIC_URL || 'https://rag.aheadofmarket.com'

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SIGNING_SECRET) {
    return res.status(500).json({ error: 'UPLOAD_SIGNING_SECRET not configured' })
  }

  const { world: rawWorld } = req.body || {}
  const requestedTenant = (rawWorld || 'aom').toString().trim().toLowerCase()

  let tenant, userId
  try {
    ({ tenant, userId } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  const payload = { world: tenant, user_id: userId, exp }
  const payloadB64 = b64url(JSON.stringify(payload))
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(payloadB64).digest()
  const sigB64 = b64url(sig)
  const token = `${payloadB64}.${sigB64}`

  return res.status(200).json({
    token,
    expires_at: exp,
    world: tenant,
    upload_url: `${UPLOAD_BASE_URL}/upload-file-binary`,
  })
}
