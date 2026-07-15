const SLUG_RE = /^[a-z][a-z0-9-]*$/

export const DIRECT_AGENT_PROMOTION_PROJECT = 'agent-work'

const WORK_VERBS = [
  'build', 'create', 'make', 'write', 'draft', 'design', 'edit', 'fix', 'ship',
  'implement', 'research', 'audit', 'analyze', 'review', 'generate', 'produce',
  'organize', 'rework', 'update', 'change', 'add', 'remove', 'publish', 'deploy',
  'store', 'save', 'file', 'deliverable', 'pdf', 'doc', 'deck', 'page', 'site',
  'app', 'mission', 'project',
]

const LIGHTWEIGHT_PATTERNS = [
  /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|cool|nice|great|perfect)[\s.!?]*$/i,
  /^(what'?s up|how are you|you there|status\??|ping)[\s.!?]*$/i,
]

function cleanText(s) {
  return String(s || '').replace(/\s+/g, ' ').trim()
}

export function slugifyMissionTitle(text, agent = 'agent') {
  const base = cleanText(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const compact = base
    .split('-')
    .filter((w) => w && !['please', 'can', 'you', 'the', 'and', 'for', 'with', 'this', 'that', 'into'].includes(w))
    .slice(0, 7)
    .join('-')
  let slug = compact || `${agent}-direct-work`
  if (!/^[a-z]/.test(slug)) slug = `m-${slug}`
  return slug.slice(0, 48).replace(/-+$/g, '') || `${agent}-direct-work`
}

export function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function shouldPromoteDirectAgentMessage({ agent, text, role, project, metadata, source }) {
  const body = cleanText(text)
  if (!agent || !body) return false
  if (role && role !== 'user') return false
  if (project) return false
  if (metadata && typeof metadata === 'object' && (metadata.mission_slug || metadata.no_auto_mission || metadata.direct_shadow)) return false
  if (source && String(source).includes('mission-promotion')) return false
  if (LIGHTWEIGHT_PATTERNS.some((re) => re.test(body))) return false
  const lower = body.toLowerCase()
  return WORK_VERBS.some((w) => lower.includes(w))
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function buildMissionPromotion({ agent, text, tenantId = 'aom' }) {
  const missionSlug = slugifyMissionTitle(text, agent)
  const title = titleFromSlug(missionSlug)
  const fullSlug = `${DIRECT_AGENT_PROMOTION_PROJECT}:${missionSlug}`
  const d = today()
  const safeTenant = String(tenantId || 'aom').trim().toLowerCase()
  const missionPath = `corner/users/${safeTenant}/projects/${DIRECT_AGENT_PROMOTION_PROJECT}/missions/${missionSlug}`
  const instruction = [
    `Auto-promoted from direct ${agent} chat into mission \`${fullSlug}\`.`,
    `Mission home: \`${missionPath}\`.`,
    'Before creating or claiming any files, use this mission structure:',
    '- Update BUILD.md with the active round and status.',
    '- Put deliverables under the mission folder, preferably deliverables/ or research/ as appropriate.',
    '- When you say the work is done, include a user-visible pointer: the mission path plus an exact file path, URL, room link, or attachment for every deliverable. A bare "done" is not complete.',
    '',
    'Original ask:',
    text,
  ].join('\n')
  return {
    parentSlug: DIRECT_AGENT_PROMOTION_PROJECT,
    missionSlug,
    fullSlug,
    name: title || missionSlug,
    missionPath,
    instruction,
    scaffold: missionStubs(missionSlug, DIRECT_AGENT_PROMOTION_PROJECT, title || missionSlug, agent, text, d),
  }
}

export function missionStubs(missionSlug, parentSlug, displayName, agent, originalAsk, d = today()) {
  const fullSlug = `${parentSlug}:${missionSlug}`
  return {
    'VISION.md': `# ${displayName} - Mission Vision

**Mission path:** \`${fullSlug}\`

## What This Mission Is

Auto-promoted work from a direct ${agent} chat.

## North Star

Complete the direct-chat ask with durable files, context, and handoff paths.

## Original Ask

${originalAsk}

## Change Log

- **${d}** - Scaffolded automatically from direct-agent chat.
`,
    'RESEARCH.md': `# ${displayName} - Mission Research

**Started:** ${d}

## Index

No research yet.
`,
    'BUILD.md': `# ${displayName} - Mission Build Plan

**Started:** ${d}
**Mission path:** \`${fullSlug}\`

## Rounds

### R1 - Direct-chat work

Original direct-chat ask:

${originalAsk}

**Status:** in progress.
`,
    'CONTEXT.md': `# ${displayName} - Mission Context

**Mission path:** \`${fullSlug}\`
**Status:** IN PROGRESS
**Scaffolded:** ${d}

## Current State (${d})

This mission was auto-created from a direct ${agent} chat so work products have a durable home.
`,
    'last-conversation.md': `# ${displayName} - Last Conversation

## ${d}

Mission auto-created from direct ${agent} chat.

Original ask:

${originalAsk}

Mission path: \`${fullSlug}\`
`,
    'research/README.md': `# ${displayName} Mission Research

Drop research artifacts here as dated markdown files. \`RESEARCH.md\` is the index.

Scaffolded ${d}.
`,
  }
}

export async function ensurePromotedMission({ supabaseUrl, headers, tenantId, promotion }) {
  if (!supabaseUrl || !headers || !tenantId || !promotion) return false
  if (!SLUG_RE.test(promotion.parentSlug) || !SLUG_RE.test(promotion.missionSlug)) {
    throw new Error('invalid promoted mission slug')
  }
  for (const [filename, content] of Object.entries(promotion.scaffold || {})) {
    await upsertScaffoldStub({ supabaseUrl, headers, agentKey: promotion.fullSlug, filename, content, tenantId })
  }
  await upsertAgentStatusMission({ supabaseUrl, headers, promotion, tenantId })
  return true
}

async function upsertScaffoldStub({ supabaseUrl, headers, agentKey, filename, content, tenantId }) {
  const q = [
    'event_type=eq.scaffold_file',
    `agent=eq.${encodeURIComponent(agentKey)}`,
    `payload->>filename=eq.${encodeURIComponent(filename)}`,
    'select=id',
    'limit=1',
  ].join('&')
  const existingRes = await fetch(`${supabaseUrl}/rest/v1/events?${q}`, { headers })
  if (!existingRes.ok) throw new Error(`promoted mission scaffold lookup failed: ${existingRes.status} ${await existingRes.text()}`)
  const existing = await existingRes.json()
  const payload = { filename, content, updated_at: new Date().toISOString(), tenant_id: tenantId, auto_promoted: true }
  if (Array.isArray(existing) && existing[0]?.id) {
    const r = await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ payload, timestamp: new Date().toISOString() }),
    })
    if (!r.ok) throw new Error(`promoted mission scaffold update failed: ${r.status} ${await r.text()}`)
  } else {
    const r = await fetch(`${supabaseUrl}/rest/v1/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: 'scaffold_file',
        agent: agentKey,
        payload,
        timestamp: new Date().toISOString(),
      }),
    })
    if (!r.ok) throw new Error(`promoted mission scaffold insert failed: ${r.status} ${await r.text()}`)
  }
}

async function upsertAgentStatusMission({ supabaseUrl, headers, promotion, tenantId }) {
  const payload = {
    slug: promotion.fullSlug,
    name: promotion.name,
    type: 'mission',
    client_id: tenantId,
    color: '#6B8AB0',
  }
  const res = await fetch(`${supabaseUrl}/rest/v1/agent_status`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`promoted mission agent_status insert failed: ${res.status} ${await res.text()}`)
}
