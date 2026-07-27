// GET /api/dashboard/mission-state?project=<slug>&mission=<rawSlug|project:slug>
//
// corner:mission-rooms R4 — state-of-the-mission card payload.
//
// Returns the snapshot the mission room renders above the chat so the user
// sees where things stand the moment they walk in — no more empty room.

import fs from 'node:fs/promises'
import path from 'node:path'
import { extractJwt, verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function resolveMission(projectSlug, missionSlug) {
  const missions = missionsRegistry?.missions || []
  const qualified = missionSlug.includes(':') ? missionSlug : `${projectSlug}:${missionSlug}`
  for (const m of missions) {
    if (m.slug === qualified) return m
    if (!missionSlug.includes(':') && m.project_slug === projectSlug && m.raw_slug === missionSlug) return m
  }
  return null
}

function parseBodyHints(text) {
  if (!text) return { headline: null, next_line: null }
  let body = text
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 4)
    if (end !== -1) body = text.slice(end + 4)
  }
  const lines = body.split('\n')
  let headline = null
  let next_line = null
  let inStatusSection = false
  let collectingHeadline = false
  const headlineBuffer = []
  for (const ln of lines) {
    const trimmed = ln.trim()
    if (/^#+\s*(status|what'?s next|what next|next|r\d+)\b/i.test(trimmed)) {
      inStatusSection = true
      continue
    }
    if (inStatusSection && /^#+\s+/.test(trimmed)) inStatusSection = false
    if (inStatusSection && trimmed && !trimmed.startsWith('#') && !next_line) {
      next_line = trimmed
        .replace(/^[-*]\s+/, '')
        .replace(/^\*\*([^*]+)\*\*\s*[—\-]?\s*/, '$1 — ')
        .slice(0, 240)
    }
    if (!headline) {
      if (!collectingHeadline) {
        if (trimmed.startsWith('#') || trimmed === '') continue
        collectingHeadline = true
        headlineBuffer.push(trimmed)
      } else {
        if (trimmed === '' || trimmed.startsWith('#')) {
          headline = headlineBuffer.join(' ').slice(0, 320)
          collectingHeadline = false
          headlineBuffer.length = 0
        } else {
          headlineBuffer.push(trimmed)
        }
      }
    }
  }
  if (!headline && headlineBuffer.length > 0) headline = headlineBuffer.join(' ').slice(0, 320)
  return { headline, next_line }
}

async function readContextBody(missionEntry) {
  if (!missionEntry?.path) return ''
  const candidates = [
    path.resolve(process.cwd(), '..', missionEntry.path, 'CONTEXT.md'),
    path.resolve(process.cwd(), missionEntry.path, 'CONTEXT.md'),
  ]
  for (const p of candidates) {
    try { return await fs.readFile(p, 'utf8') } catch { /* try next */ }
  }
  return ''
}

async function lastMessageStats(canonicalSlug, rawSlug) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { last_message_at: null, message_count: 0 }
  try {
    // Match both canonical "<project>:<mission>" and legacy bare "<mission>"
    // forms — historical rows from before slug normalization used the bare form.
    // See canonicalize-mission-slug.js for the drift backstory.
    const forms = rawSlug && rawSlug !== canonicalSlug ? [canonicalSlug, rawSlug] : [canonicalSlug]
    const inExpr = '(' + forms.map(s => '"' + s + '"').join(',') + ')'
    const filter = `metadata->>mission_slug=in.${encodeURIComponent(inExpr)}`
    // messages timestamp column is `timestamp`, not `created_at`. See
    // missions-tree.js — querying created_at 400s and returns null.
    const newestR = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?select=timestamp&${filter}&order=timestamp.desc&limit=1`,
      { headers: supabaseHeaders() },
    )
    let last_message_at = null
    if (newestR.ok) {
      const rows = await newestR.json()
      last_message_at = rows?.[0]?.timestamp || null
    }
    let message_count = 0
    try {
      const countR = await fetch(
        `${SUPABASE_URL}/rest/v1/messages?select=id&${filter}&limit=1`,
        { headers: { ...supabaseHeaders(), Prefer: 'count=exact' } },
      )
      if (countR.ok) {
        const cr = countR.headers.get('content-range') || ''
        const m = cr.match(/\/(\d+|\*)$/)
        if (m && m[1] !== '*') message_count = parseInt(m[1], 10) || 0
      }
    } catch { /* count is non-critical */ }
    return { last_message_at, message_count }
  } catch {
    return { last_message_at: null, message_count: 0 }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' })

  const jwt = extractJwt(req)
  if (!jwt) return res.status(401).json({ error: 'jwt required' })

  const projectSlug = String(req.query.project || '').trim().toLowerCase()
  const missionSlug = String(req.query.mission || '').trim()
  if (!projectSlug || !missionSlug) {
    return res.status(400).json({ error: 'project and mission required' })
  }

  // corner:identity-attribution 2026-07-27 — verifyTenant was imported here but
  // never called, so any signed-in user of any world could read any mission's
  // CONTEXT.md headline, next line and activity stats.
  //
  // r2: the gate is PROJECT access, not world equality. The first pass used
  // verifyTenant(holderWorld, req), which never reads the project_access grant
  // table for a plain world string — so Ash or Courtney (world 'aom', not
  // super-admins) opening any Space Rising mission got a 403, because
  // space-rising is arsenal-held and AOM reaches it through a grant. Patrik
  // returned on the super-admin bypass and never saw it.
  //
  // verifyProjectAccess admits the holder world, any world holding a
  // project_access grant, the holder world's admins, and the super-admin. A
  // project with no projects row (blacknight, bridge-smoke, pala, rex are live
  // examples) is registry/disk-only — no holder world exists to check, so it
  // keeps the verified-session floor rather than 403-ing a room that renders
  // fine everywhere else.
  try {
    await verifyProjectAccess(projectSlug, req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const entry = resolveMission(projectSlug, missionSlug)
  if (!entry) {
    return res.status(200).json({
      slug: missionSlug.includes(':') ? missionSlug : `${projectSlug}:${missionSlug}`,
      name: missionSlug.replace(/-/g, ' '),
      status: 'unscaffolded',
      is_done: false,
      last_updated_disk: null,
      last_message_at: null,
      message_count: 0,
      headline: 'This mission has no on-disk home yet. The chat works; ask the agent to scaffold the mission files when you are ready.',
      next_line: null,
    })
  }

  const qualified = entry.slug
  const [ctx, msgStats] = await Promise.all([
    readContextBody(entry),
    lastMessageStats(qualified, entry?.raw_slug || null),
  ])
  const { headline, next_line } = parseBodyHints(ctx)

  return res.status(200).json({
    slug: qualified,
    name: entry.name,
    status: entry.status,
    is_done: !!entry.is_done,
    last_updated_disk: entry.last_updated || null,
    last_message_at: msgStats.last_message_at,
    message_count: msgStats.message_count,
    headline,
    next_line,
  })
}
