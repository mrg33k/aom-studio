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

import {
  validatePayload,
  buildConfig,
  buildScriptTag,
} from '../../lib/embed-shape.js'
import { getEmbed, insertEmbed } from '../../lib/embed-registry.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const origin = req.headers.origin || ''

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  const body = req.body || {}
  const errors = validatePayload(body)
  if (errors.length) return res.status(400).json({ error: 'invalid', details: errors })

  const config = buildConfig(body)

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
    const row = await insertEmbed(config, body.created_by || null)
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
