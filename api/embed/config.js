// GET /api/embed/config?id=<embed_id>
//
// Returns the public-safe placement config for a widget. Reads the registry
// from api/embed/_embeds.json so new embeds are a JSON-only change — no code
// edits, no merge conflicts when multiple agents add embeds in parallel.
//
// Never returns the context_overlay or secrets — the widget renders with
// surface_name + placement only. Routing (agent / project / mission_slug)
// lives in REGISTRY but is also non-public; it's consumed server-side by
// chat.js, messages.js, steps.js.

import embedsFile from './_embeds.json' with { type: 'json' }

const REGISTRY = embedsFile.embeds || {}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const origin = req.headers.origin || ''

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  const id = (req.query && req.query.id) || ''
  const cfg = REGISTRY[id]
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })

  if (origin && cfg.host_allowlist.indexOf(origin) < 0) {
    return res.status(403).json({ error: 'origin not on allowlist' })
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  if (!cfg.active) return res.status(200).json({ offline: true })

  return res.status(200).json({
    embed_id: cfg.embed_id,
    surface_name: cfg.surface_name,
    placement: cfg.placement,
    offline: false,
  })
}

export { REGISTRY }
