// PATCH /api/dashboard/agent-customize
// Update agent/room color and/or photo.
// Body: { slug, client_id, color?, image_base64? }
//
// Photos stored in avatars bucket as agent-{slug}-{client_id}.jpg (64x64, compressed client-side).
//
// AUTH (r7:open-agent-surface, 2026-07-27). Unauthenticated with
// `Access-Control-Allow-Origin: *`: anyone could repaint or re-photograph any
// agent in any world, and the 2MB body limit made it a cheap way to push
// arbitrary image bytes into the shared avatars bucket under a predictable,
// overwritable filename (`x-upsert: true`). Now verifyTenant on the target
// world — an ordinary member of that world still customizes their own agents.
//
// The client_id default also stopped being a hardcoded literal: an unnamed
// world now falls back to the CALLER'S OWN world from their verified session,
// which is both correct and impossible to point at somebody else's tenant.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { applyCors, sendAuthError } from '../_lib/originAllowlist.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

export default async function handler(req, res) {
  applyCors(req, res, 'PATCH')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'PATCH only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { slug, color, image_base64 } = req.body || {}
  if (!slug) return res.status(400).json({ error: 'slug required' })

  // Resolve the target world: what the caller asked for, else their own.
  const who = await callerIdentity(req)
  const client_id = String(req.body?.client_id || who?.world || '').trim().toLowerCase()
  if (!client_id) return res.status(401).json({ error: 'sign in required' })

  try {
    await verifyTenant(client_id, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return sendAuthError(res, err)
    return res.status(500).json({ error: err?.message || 'auth check failed' })
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  const updates = {}

  // Upload photo if provided
  if (image_base64) {
    const fileName = `agent-${slug}-${client_id}.jpg`
    const imageBuffer = Buffer.from(image_base64, 'base64')
    // INVARIANT-VIOLATION TODO(corner:audit R15): avatar bytes go to Supabase Storage; reroute to disk+tunnel
    // Reroute DEFERRED (not ripped out) so agent sprite rendering keeps working -- same
    // blocker as avatar.js: the reachable disk+tunnel path (rag-server /upload-file) auto-
    // shares to chat + indexes to RAG, wrong for a sprite. See RISK NOTES.
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
      {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
        body: imageBuffer,
      }
    )
    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      return res.status(502).json({ error: 'Photo upload failed', detail: err })
    }
    updates.sprite_path = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?v=${Date.now()}`
  }

  // Update color if provided
  if (color) {
    updates.color = color
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update. Provide color or image_base64.' })
  }

  // Update agent_status
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(client_id)}`,
    { method: 'PATCH', headers, body: JSON.stringify(updates) }
  )
  if (!r.ok) {
    const err = await r.text()
    return res.status(502).json({ error: 'Update failed', detail: err })
  }

  const result = await r.json()
  return res.status(200).json({ ok: true, agent: result[0] || updates })
}
