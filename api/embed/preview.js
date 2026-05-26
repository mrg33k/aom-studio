// POST /api/embed/preview
//   body: { agent, project, mission_slug, label, host_allowlist[], opening_prompt, accent, font_display, embed_id?, client_id? }
//   resp: { embed_id, script_tag, cli_command, full_config, preview_url }
//
// Generates the script tag + CLI command from the modal's form values
// WITHOUT writing to the registry. Used to render the modal's result screen
// before the user clicks "Ship it" (which calls /api/embed/create).
//
// Validation + config-shape live in lib/embed-shape.js so preview and create
// stay in lockstep — what previews must validate must also create.

import {
  validatePayload,
  buildConfig,
  buildScriptTag,
  buildCliCommand,
} from '../../lib/embed-shape.js'

export default function handler(req, res) {
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
  return res.status(200).json({
    embed_id: config.embed_id,
    script_tag: buildScriptTag(config.embed_id),
    cli_command: buildCliCommand(body, config.embed_id),
    full_config: config,
    preview_url: `https://www.aheadofmarket.com/embed?id=${config.embed_id}`,
  })
}
