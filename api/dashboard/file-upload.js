// POST /api/dashboard/file-upload
// Proxy file uploads to the local RAG server (Mac filesystem via Cloudflare tunnel).
// Body: { world, filename, data_base64, mime_type }
// Returns: { ok, url (relative to RAG server), filename, size, mime_type }
//
// The returned URL is served by rag.aheadofmarket.com/files/{world}/{filename}

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const RAG_URL = process.env.RAG_SERVER_URL || 'http://aom-home:8787'

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { world: rawWorld, filename, data_base64, mime_type } = req.body || {}
  if (!filename || !data_base64) {
    return res.status(400).json({ error: 'filename and data_base64 required' })
  }

  const requestedTenant = (rawWorld || 'aom').toString().trim().toLowerCase()
  let world
  try {
    ({ tenant: world } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  try {
    const r = await fetch(`${RAG_URL}/upload-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ world, filename, data_base64, mime_type }),
    })

    const data = await r.json()
    if (!r.ok) {
      return res.status(r.status).json(data)
    }

    // Convert relative URL to full tunnel URL
    const ragPublic = (process.env.RAG_PUBLIC_URL || 'https://rag.aheadofmarket.com')
    data.full_url = `${ragPublic}${data.url}`

    return res.status(200).json(data)
  } catch (err) {
    return res.status(502).json({ error: `Upload failed: ${err.message}` })
  }
}
