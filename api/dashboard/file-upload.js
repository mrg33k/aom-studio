// POST /api/dashboard/file-upload
// Proxy file uploads to the local RAG server (Mac filesystem via Cloudflare tunnel).
// Body: { world, filename, data_base64, mime_type, scope? }
//   scope (optional, R79-f23 leg1 fallback fix): { project, mission, agent }
//     forwarded to rag-server so the legacy fallback path lands files at
//     the per-chat folder identical to the tunnel path. Without scope,
//     files land at the legacy flat root with uuid prefix.
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

  const { world: rawWorld, filename, data_base64, mime_type, scope } = req.body || {}
  if (!filename || !data_base64) {
    return res.status(400).json({ error: 'filename and data_base64 required' })
  }

  const requestedTenant = (rawWorld || '').toString().trim().toLowerCase()
  let world
  try {
    ({ tenant: world } = await verifyTenant(requestedTenant, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  // R79-f23 leg1 fallback fix (2026-05-30): forward scope to rag-server so
  // legacy fallback uploads (uploadViaLegacyProxy when tunnel fails) land
  // at the right per-chat folder. The rag-server's /upload-file endpoint
  // now accepts scope and writes to FILES_ROOT/<world>/projects/<p>/...
  // identical to /upload-file-binary.
  const safeScope = (scope && typeof scope === 'object')
    ? {
        project: scope.project ? String(scope.project).trim().toLowerCase() : undefined,
        mission: scope.mission ? String(scope.mission).trim().toLowerCase() : undefined,
        agent: scope.agent ? String(scope.agent).trim().toLowerCase() : undefined,
      }
    : undefined

  try {
    const r = await fetch(`${RAG_URL}/upload-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ world, filename, data_base64, mime_type, scope: safeScope }),
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
