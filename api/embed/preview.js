// POST /api/embed/preview
//   body: { agent, project, mission_slug, label, host_allowlist[], opening_prompt, accent, font_display, embed_id?, client_id? }
//   resp: { embed_id, script_tag, cli_command, full_config }
//
// Generates the script tag + the make-embed.py CLI command from the modal's
// form values WITHOUT writing to _embeds.json. The actual ship is still a
// terminal step in R0 (`make-embed.py --deploy`). R1 swaps this for
// /api/embed/create that writes to Supabase + deploys.
//
// Used by:
//   - EmbedModal in CV4 (corner:embed-modal R0)

import crypto from 'crypto'

// Known EAs the bridge-daemon can route to. Must match scripts/make-embed.py.
const KNOWN_EAS = new Set([
  'elon', 'rex', 'gary', 'studio', 'mom',
  'bobby', 'cleo', 'steffen', 'tony', 'jacob', 'alex', 'steve',
  'foreman', 'arsenal-ea',
])

const EMBED_ID_RE = /^emb_[a-z0-9][a-z0-9_-]{2,40}$/
const MISSION_SLUG_RE = /^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)+$/
const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i

function suggestEmbedId({ project, mission_slug }) {
  // Stable suggestion derived from scope. Modal lets user override.
  const ts = Math.random().toString(36).slice(2, 6)
  if (mission_slug) {
    const [proj, mish] = mission_slug.split(':')
    return `emb_${proj}_${mish}_${ts}`.replace(/[^a-z0-9_-]/g, '').slice(0, 44)
  }
  if (project) return `emb_${project}_${ts}`.replace(/[^a-z0-9_-]/g, '').slice(0, 44)
  return `emb_${ts}_${crypto.randomBytes(2).toString('hex')}`
}

function validate(body) {
  const errors = []
  if (!body.agent) errors.push('agent required')
  else if (typeof body.agent !== 'string') errors.push('agent must be a string')
  else if (body.agent.startsWith('project:')) errors.push("agent can't be 'project:<slug>' — use a real EA slug (elon, studio, etc.)")
  else if (!KNOWN_EAS.has(body.agent)) errors.push(`agent '${body.agent}' isn't a known EA`)

  if (!body.label || typeof body.label !== 'string') errors.push('label required')
  else if (body.label.length > 80) errors.push('label too long (max 80)')

  if (!Array.isArray(body.host_allowlist) || body.host_allowlist.length === 0) {
    errors.push('at least one host_allowlist entry required (no wildcards in v1)')
  } else {
    for (const h of body.host_allowlist) {
      if (typeof h !== 'string' || !ORIGIN_RE.test(h)) errors.push(`host '${h}' isn't a valid origin (https://example.com)`)
    }
  }

  if (body.mission_slug) {
    if (!MISSION_SLUG_RE.test(body.mission_slug)) errors.push(`mission_slug '${body.mission_slug}' must be canonical '<project>:<mission>'`)
    if (!body.project) errors.push('mission_slug requires project')
  }

  if (body.embed_id && !EMBED_ID_RE.test(body.embed_id)) {
    errors.push(`embed_id '${body.embed_id}' invalid. Pattern: emb_<a-z0-9_-> 3-44 chars total`)
  }

  return errors
}

function buildConfig(body) {
  const embed_id = body.embed_id || suggestEmbedId(body)
  return {
    embed_id,
    surface_name: body.label,
    active: true,
    host_allowlist: body.host_allowlist,
    placement: {
      mode: 'inline',
      position: 'centered',
      opening_prompt: body.opening_prompt || `Hi — how can I help with ${body.label}?`,
      theme: {
        accent: body.accent || '#E5451F',
        bg: '#0B0F14',
        label: body.label,
        ...(body.font_display ? { font_display: body.font_display } : {}),
      },
    },
    routing: {
      agent: body.agent,
      client_id: body.client_id || 'aom',
      project: body.project || null,
      mission_slug: body.mission_slug || null,
    },
  }
}

function buildScriptTag(embed_id) {
  return (
    `<script src="https://aheadofmarket.com/embed/v1/widget.js"\n` +
    `        data-embed-id="${embed_id}"></script>`
  )
}

function buildCliCommand(body, embed_id) {
  const parts = ['python3 scripts/make-embed.py']
  parts.push(`    --id ${embed_id}`)
  parts.push(`    --label "${body.label.replace(/"/g, '\\"')}"`)
  parts.push(`    --agent ${body.agent}`)
  if (body.project) parts.push(`    --project ${body.project}`)
  if (body.mission_slug) parts.push(`    --mission-slug "${body.mission_slug}"`)
  for (const h of body.host_allowlist) parts.push(`    --host ${h}`)
  if (body.opening_prompt) parts.push(`    --opening "${body.opening_prompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`)
  if (body.accent) parts.push(`    --accent "${body.accent}"`)
  if (body.font_display) parts.push(`    --font-display "${body.font_display}"`)
  parts.push('    --deploy')
  return parts.join(' \\\n')
}

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
  const errors = validate(body)
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
