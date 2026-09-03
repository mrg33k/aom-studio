// POST /api/embed/create
//   body: { agent, project, mission_slug, label, host_allowlist[], opening_prompt, accent, font_display, embed_id?, client_id?, created_by? }
//   resp: { embed_id, script_tag, full_config, live_url }
//
// Persists an embed config to the Convex `embeds` table (embeds:upsert) so the
// widget can boot against the freshly-created embed_id immediately — no
// redeploy required. Same validation as /api/embed/preview; this endpoint is
// what the modal's "Ship it" button calls.
//
// If embed_id already exists on Convex or in the JSON fallback registry,
// returns 409. Users can override with a different embed_id via the
// modal's Advanced field.
//
// corner:retire-supabase (2026-09-03): the row used to be inserted into the
// Supabase embed_configs table through lib/embed-registry.js. The write now
// goes straight to embeds:upsert; the duplicate check reads through getEmbed
// in ./messages.js (Convex embeds:get first, bundled _embeds.json fallback),
// the same lookup chat.js and steps.js use.

// AUTH (corner:identity-attribution, 2026-07-27): creating an embed is an
// ADMIN action, not a public one — the resulting embed routes live chat into a
// named EA's room in a named world, and /api/embed/chat writes those turns as
// role='user' rows that the Convex dispatcher hands to that agent.
// Unauthenticated, anyone could point a widget at any EA in any world. So:
// a valid session is required, the routing world comes from verifyTenant, and
// the body's client_id / created_by are ignored.
//
// NOTE this is the CREATE door only. /api/embed/chat is the public widget door
// and keeps its wide CORS; its own origin-allowlist gate is a separate fix.
//
// ── 2026-07-27 r7, corner:tenant-isolation — THE WORLD WAS GATED, THE PROJECT
//    WAS NOT ────────────────────────────────────────────────────────────────
// routing.client_id is overwritten with the verified tenant above. routing.project
// (and routing.mission_slug) came straight out of buildConfig(body) and were
// never scope-checked — and api/embed/chat.js then writes rows carrying
// BOTH of them from a PUBLIC, unauthenticated, wildcard-CORS endpoint, with
// source='corner-dashboard', which the dispatcher hands to the agent.
//
//   KARENS_MEMBER POSTs {agent:'elon', project:'rex', client_id:'karens-world'}
//   -> embed row created                                    (replayed: HTTP 200)
//   -> from then on ANY anonymous visitor POSTing to /api/embed/chat with that
//      embed_id writes messages{client_id:'karens-world', project:'rex'} with
//      no JWT, forever.
//
// So ONE authenticated setup step installed an UNAUTHENTICATED evidence pump
// against another world's project. Everything r4/r5 did to gate the write path
// is bypassed, because the write happens later, from a door that has no caller.
//
// The scope check therefore has to happen HERE, at the only moment there IS a
// verified caller. Same decision function as every other create door
// (makeProjectScopeAuthorizer), run on routing.project and on the ROOT project of
// routing.mission_slug. REFUSE rather than degrade: an embed silently created
// without the routing it was asked for would answer in the wrong room.
//
// Create-time only, on purpose — existing embed rows are untouched.

import {
  validatePayload,
  buildConfig,
  buildScriptTag,
} from '../../lib/embed-shape.js'
import { getEmbed } from './messages.js'
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'
import { makeProjectScopeAuthorizer } from '../_lib/write-message.js'
import { convexMutation } from '../_lib/reportsStore.js'

const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || ''

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

// The stored config is exactly what the registry hands back to the widget
// endpoints: the same keys the old embed_configs row carried, plus who made it.
function storedConfig(config, createdBy) {
  return {
    embed_id: config.embed_id,
    surface_name: config.surface_name,
    active: config.active !== false,
    host_allowlist: config.host_allowlist,
    placement: config.placement,
    routing: config.routing,
    ...(config.ai ? { ai: config.ai } : {}),
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }
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

  // MAY THIS TENANT ROUTE INTO THIS PROJECT? The r4 authorizer, reused — the same
  // decision the message write path makes about a project tag, made once here
  // because the writes themselves (api/embed/chat.js) carry no caller at all.
  //
  // The mission's ROOT project is what is checked, never the colon-joined slug:
  // no projects row and no messages.project ever carries the colon form, so
  // gating the path itself would 403 every mission-scoped embed. Both fields are
  // optional — an embed with neither is unchanged by this.
  const scopeTargets = [
    ...(config.routing.project ? [String(config.routing.project).trim().toLowerCase()] : []),
    ...(config.routing.mission_slug
      ? [String(config.routing.mission_slug).split(':')[0].trim().toLowerCase()]
      : []),
  ].filter((s, i, a) => s && a.indexOf(s) === i)

  if (scopeTargets.length) {
    const authorizeProjectScope = makeProjectScopeAuthorizer({ req, clientId: verified.tenant })
    for (const slug of scopeTargets) {
      let verdict
      try {
        verdict = await authorizeProjectScope(slug)
      } catch (err) {
        if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
        // Fail closed: an authorizer that threw decided nothing, and an
        // unchecked routing target is the whole vulnerability.
        verdict = { ok: false, reason: String((err && err.message) || err) }
      }
      if (!verdict || !verdict.ok) {
        console.warn(
          `[embed/create] DENIED: world "${verified.tenant}" may not route an embed into project "${slug}" — ${verdict?.reason || 'not reachable from this world'}`,
        )
        return res.status(403).json({
          error: `project "${slug}" belongs to another world`,
          reason: verdict?.reason || 'not reachable from this world',
        })
      }
    }
  }

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
    const row = storedConfig(config, createdBy)
    await convexMutation('embeds:upsert', {
      ...(CONVEX_KEY ? { key: CONVEX_KEY } : {}),
      embedId: row.embed_id,
      config: row,
    })
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
