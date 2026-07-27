// POST /api/embed/create
//   body: { agent, project, mission_slug, label, host_allowlist[], opening_prompt, accent, font_display, embed_id?, client_id?, created_by? }
//   resp: { embed_id, script_tag, full_config, live_url }
//
// Persists an embed config to Supabase `embed_configs` so the widget can
// boot against the freshly-created embed_id immediately — no redeploy
// required. Same validation as /api/embed/preview; this endpoint is what
// the modal's "Ship it" button calls.
//
// If embed_id already exists in Supabase or in the JSON fallback registry,
// returns 409. Users can override with a different embed_id via the
// modal's Advanced field.

// AUTH (corner:identity-attribution, 2026-07-27): creating an embed is an
// ADMIN action, not a public one — the resulting embed routes live chat into a
// named EA's room in a named world, and /api/embed/chat writes those turns as
// role='user' rows that supabase-listener dispatches into that agent's inbox.
// Unauthenticated, anyone could point a widget at any EA in any world. So:
// a valid JWT is required, the routing world comes from verifyTenant, and the
// body's client_id / created_by are ignored.
//
// NOTE this is the CREATE door only. /api/embed/chat is the public widget door
// and keeps its wide CORS; its own origin-allowlist gate is a separate fix.

import {
  validatePayload,
  buildConfig,
  buildScriptTag,
} from '../../lib/embed-shape.js'
import { getEmbed, insertEmbed } from '../../lib/embed-registry.js'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
]

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

function applyCors(req, res) {
  const origin = req.headers?.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  applyCors(req, res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const body = req.body || {}
  const errors = validatePayload(body)
  if (errors.length) return res.status(400).json({ error: 'invalid', details: errors })

  // The world the embed routes into must be a world this caller belongs to.
  // buildConfig() reads routing.client_id off the body — we overwrite it with
  // the verified tenant below so the body can never choose the destination.
  let verified
  try {
    verified = await verifyTenant(body.client_id || 'aom', req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const config = buildConfig(body)
  config.routing.client_id = verified.tenant

  // Reject duplicates so a typo in Advanced doesn't silently overwrite an
  // existing embed. Modal's submit auto-suggests embed_id when blank.
  const existing = await getEmbed(config.embed_id)
  if (existing) {
    return res.status(409).json({
      error: 'embed_id already exists',
      embed_id: config.embed_id,
    })
  }

  try {
    // created_by is a server-side fact (RULE 1) — never the body.
    const identity = await callerIdentity(req).catch(() => null)
    const createdBy = identity?.userId || verified.userId || null
    const row = await insertEmbed(config, createdBy)
    return res.status(200).json({
      embed_id: row.embed_id,
      script_tag: buildScriptTag(row.embed_id),
      full_config: row,
      live_url: `https://www.aheadofmarket.com/embed?id=${row.embed_id}`,
      live: true,
    })
  } catch (err) {
    return res.status(500).json({
      error: 'create failed',
      details: String(err && err.message || err),
    })
  }
}
