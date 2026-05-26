// Shared validation + config-shape helpers for the embed surface.
// Used by both /api/embed/preview (R0) and /api/embed/create (R1) so a
// payload that validates in preview also validates in create.

import crypto from 'crypto'

// Known EAs the bridge-daemon can route to. Must match scripts/make-embed.py.
export const KNOWN_EAS = new Set([
  'elon', 'rex', 'gary', 'studio', 'mom',
  'bobby', 'cleo', 'steffen', 'tony', 'jacob', 'alex', 'steve',
  'foreman', 'arsenal-ea',
])

export const EMBED_ID_RE = /^emb_[a-z0-9][a-z0-9_-]{2,40}$/
export const MISSION_SLUG_RE = /^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)+$/
export const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i

export function suggestEmbedId({ project, mission_slug }) {
  const ts = Math.random().toString(36).slice(2, 6)
  if (mission_slug) {
    const [proj, mish] = mission_slug.split(':')
    return `emb_${proj}_${mish}_${ts}`.replace(/[^a-z0-9_-]/g, '').slice(0, 44)
  }
  if (project) return `emb_${project}_${ts}`.replace(/[^a-z0-9_-]/g, '').slice(0, 44)
  return `emb_${ts}_${crypto.randomBytes(2).toString('hex')}`
}

export function validatePayload(body) {
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

export function buildConfig(body) {
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

export function buildScriptTag(embed_id) {
  return (
    `<script src="https://aheadofmarket.com/embed/v1/widget.js"\n` +
    `        data-embed-id="${embed_id}"></script>`
  )
}

export function buildCliCommand(body, embed_id) {
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
