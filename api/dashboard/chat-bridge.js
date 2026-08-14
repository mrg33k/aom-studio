// POST /api/dashboard/chat-bridge  -- Send message to local SSE bridge
// GET  /api/dashboard/chat-bridge?stream={messageId} -- Proxy SSE stream from bridge
//
// Thin proxy between dashboard (Vercel) and the local SSE bridge running on the
// Mac Mini. Falls back to Supabase persistence if the bridge is unreachable.
//
// Env vars:
//   LOCAL_BRIDGE_URL   -- Bridge base URL (default: http://localhost:3002)
//   BRIDGE_TUNNEL_URL  -- Cloudflare/ngrok tunnel URL for remote access (optional)
//   BRIDGE_ENABLED     -- Kill switch (default: true)

import crypto from 'crypto'
import { writeMessageRow, makeProjectScopeAuthorizer } from '../_lib/write-message.js'
import { verifyTenant, TenantAuthError, extractJwt, callerIdentity } from '../_lib/verifyTenant.js'
import { makeTaskProjectAuthorizer } from '../_lib/taskScope.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'
const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const BRIDGE_ENABLED = process.env.BRIDGE_ENABLED !== 'false'
const LOCAL_BRIDGE_URL = process.env.LOCAL_BRIDGE_URL || 'http://localhost:3002'
const BRIDGE_TUNNEL_URL = process.env.BRIDGE_TUNNEL_URL || ''
const BRIDGE_TIMEOUT = 3000 // ms to wait for bridge before fallback

const SHARED_PREFIX = 'shared:'

// The repo a projectless chain used to fall back to unconditionally. It is now
// a CANDIDATE, not a default: it goes through the same task-scope gate as any
// other slug, so only a world that can actually reach it gets it (r7).
const DEFAULT_CHAIN_REPO = 'aom-studio'

// One scope verdict per slug per request.
//
// makeProjectScopeAuthorizer costs a few Supabase round trips, and a single send
// through this file asks about the SAME slug up to three times (the message row,
// the chain card, the task rows). This memoizes the promise, so every asker gets
// exactly the authorizer's own answer. It is a CACHE, not a second authorization
// model — it can only ever return a verdict the authorizer produced, and never
// admits anything the authorizer refused. A drifting second model is how r2 and
// r3 each shipped a lockout; this must not become one.
//
// Keyed on the RAW slug, not a lowercased one: the authorizer's first-claim arm
// is case-sensitive on purpose (PostgREST `eq` is), so 'REX' and 'rex' are two
// different questions and must not share an answer.
function onceProjectScope(authorize) {
  const seen = new Map()
  return (slug) => {
    const key = String(slug == null ? '' : slug)
    if (!seen.has(key)) {
      const p = authorize(key)
      // Mark the stored promise handled so a denial that is awaited later never
      // surfaces as an unhandled rejection; the stored promise itself is
      // untouched, so the real verdict (including a throw) still reaches callers.
      p.catch(() => {})
      seen.set(key, p)
    }
    return seen.get(key)
  }
}

function getBridgeUrl() {
  // Prefer tunnel URL for production (remote access)
  if (BRIDGE_TUNNEL_URL) return BRIDGE_TUNNEL_URL
  return LOCAL_BRIDGE_URL
}

// R-SMOOTHNESS Round C: shared token for the two tunnel-publishable bridge
// routes (/stream, /interrupt). The bridge refuses tunneled requests without
// it; local dev (no tunnel) never needs it.
const BRIDGE_PUBLIC_TOKEN = process.env.BRIDGE_PUBLIC_TOKEN || ''
function bridgeAuthHeaders() {
  return BRIDGE_PUBLIC_TOKEN ? { 'X-Bridge-Token': BRIDGE_PUBLIC_TOKEN } : {}
}

// What the agent is told when the sender can't be named. NEVER a person's name:
// the bridge turns user_name into "You are talking to **X**", and "Patrik" there
// is an authorization signal agents act on. An honest label makes the absence
// visible to the agent instead of papering it over (identity audit 2026-07-27).
const UNNAMED_SENDER = 'Unidentified sender'

// Who is actually sending this message. Derived SERVER-SIDE from the JWT — the
// client-supplied body.user_name / body.user_id are ignored for attribution
// (they are caller-controlled and therefore forgeable). Every caller of this
// endpoint already goes through verifyTenant, so a JWT is always present; the
// null cases below are network failure against Supabase auth, not anonymity.
//
// `verified` carries the userId we got straight out of verifyTenant, so even a
// failed name lookup still lands a real, queryable author id on the row.
async function resolveSender(req, verified) {
  let userId = verified?.userId || null
  let userName = null
  // The sender's OWN world, straight off the same verified session. Carried
  // because a row in a SHARED room must record the world that wrote it, not the
  // world that holds the room — see rowWorldId in the POST handler.
  let world = verified?.world || null
  // verifyTenant resolves the user from the JWT already and carries the identity
  // on its result, so the common path costs ZERO extra round trips — that call
  // is the known hot spot here (see the timing note in verifyTenant.js). The
  // fallback only fires for a result shape without identity; callerIdentity uses
  // the same derivation, so one human reads the same either way.
  if (verified && 'userName' in verified) {
    userName = verified.userName || verified.email || null
  } else {
    const ident = await callerIdentity(req).catch(() => null)
    if (ident) {
      userId = userId || ident.userId || null
      userName = ident.userName || ident.email || null
      world = world || ident.world || null
    }
  }
  const name = (userName == null ? '' : String(userName)).trim() || null
  return {
    userId: userId || null,
    // null, never a substituted name — write-message.js records the row as
    // explicitly unattributed rather than crediting anyone.
    userName: name,
    // What the live agent sees. Truthful in both directions.
    bridgeName: name || UNNAMED_SENDER,
    identified: Boolean(name),
    world: world || null,
  }
}

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

async function writeFallbackToSupabase(body, sender, scope) {
  // Thin wrapper over the single write path (corner:one-write-path R1).
  // Routing policy — project resolution (explicit > room > tag, never fuzzy),
  // scope authorization, mission canonicalization, collaborator-gated crosspost
  // — lives in api/_lib/write-message.js. This wrapper only marshals the
  // chat-send body: the ONE thing it knows that the module can't is the room the
  // sender is standing in (`project:<slug>` room → that slug IS the project).
  const room = (body.room || '').trim()
  const roomProject = room.startsWith('project:')
    ? room.slice('project:'.length).trim() || null
    : null

  const result = await writeMessageRow({
    supabaseUrl: SUPABASE_URL,
    headers: supabaseHeaders(),
    text: body.message,
    role: 'user',
    source: 'corner-dashboard',
    agent: body.agent || 'elon',
    clientId: body.client_id || scope?.worldId || null,
    id: body.id,
    project: body.project,
    roomProject,
    mission: body.mission,
    // r5: all THREE routing arms this endpoint feeds the writer — the explicit
    // `project` field, the `project:<slug>` room, and an inline [project:slug]
    // tag in the text — converge on one resolved slug inside writeMessageRow,
    // and this gates that slug. Built from the VERIFIED tenant in the handler.
    authorizeProjectScope: scope?.authorizeProjectScope,
    // The world that WROTE this message. Omitting it let the column's DB default
    // stamp every row 'aom' — including Karen's and Ben's — which is exactly the
    // evidence crosspost.js and the participation floor read as proof of
    // belonging (r5 exploit 2).
    worldId: scope?.worldId || null,
    metadata: body.metadata,
    // Author comes from the JWT, not the body. When the name can't be resolved
    // it stays null and write-message.js marks the row unattributed.
    userId: sender?.userId || null,
    userName: sender?.userName || null,
  })
  return { ok: result.ok, message: result.row }
}

// Detect ">>" chain operator and create N linked tasks. Returns null if no chain.
// Persists three things to Supabase:
//   1. tasks: N rows linked by metadata.chain_id (first 'queued', rest 'waiting')
//   2. messages: the original user prompt so it stays in chat history
//   3. messages: a chain-card assistant message so the UI shows the chain inline
async function maybeCreateChain(body, sender, scope) {
  const message = (body.message || '').trim()
  if (!message.includes('>>')) return null

  const parts = message.split('>>').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const chain_id = crypto.randomUUID()
  const total = parts.length
  const agent = (body.agent || 'elon').trim()
  let project = (body.project || '').trim()
  const now = new Date().toISOString()
  const client_id = body.client_id || scope?.worldId || null
  if (!client_id) throw new Error('client_id required (fail-closed)')

  // Scope-gate the chain's project ONCE, with the same authorizer the writer
  // uses (memoized, so the two writeMessageRow calls below reuse this verdict at
  // no extra cost). It has to happen HERE and not only inside the writer,
  // because this path also mints `tasks` rows: tasks.project and metadata.repo
  // steer which repo task-runner.sh checks a worker out into, so an
  // unauthorized slug here is the same escalation wearing a different hat.
  // Same failure mode as the writer's, deliberately: drop the scope, never drop
  // the work.
  if (project && typeof scope?.authorizeProjectScope === 'function') {
    let verdict
    try {
      verdict = await scope.authorizeProjectScope(project)
    } catch (e) {
      verdict = { ok: false, reason: String((e && e.message) || e) }  // fail closed
    }
    if (!verdict || !verdict.ok) {
      console.warn(
        `[chat-bridge] chain project scope DENIED: tenant "${client_id}" may not queue tasks under project "${project}" — ${verdict?.reason || 'not reachable from this world'}; queueing unscoped`,
      )
      project = ''
    }
  }

  // r7 — the TASK rows take a stricter verdict than the message rows, because
  // they steer a checkout rather than a thread. Two variables, not one, so the
  // extra strictness cannot leak back into chat: `project` keeps the message
  // policy above (and writeMessageRow re-checks it), `taskProject` is what the
  // `tasks` rows and the repo below are allowed to use. The only case where
  // they differ is a first-claim slug — see api/_lib/taskScope.js for why a
  // never-spoken slug may name a room but must not name a working directory.
  let taskProject = project
  if (taskProject) {
    const taskVerdict = await scope.authorizeTaskProject(taskProject).catch(() => ({ ok: false }))
    if (!taskVerdict || !taskVerdict.ok) {
      console.warn(
        `[chat-bridge] chain TASK scope DENIED: tenant "${client_id}" may not queue work under project "${taskProject}" — ${taskVerdict?.reason || 'not reachable from this world'}; the chat message keeps its room, the tasks do not get the checkout`,
      )
      taskProject = ''
    }
  }

  // task-runner.sh requires metadata.repo to spawn a worker. Without it the row
  // gets failed immediately with "metadata.repo missing; front desk must set it".
  //
  // r7 — body.repo IS GONE, and so is the unconditional aom-studio default.
  // Two separate escalations lived on the line that used to be here:
  //
  //   1. `body.repo || …` was caller-supplied and never checked. The r5 comment
  //      above admits it in its own parenthesis. KARENS_MEMBER sending
  //      `do X >> do Y` with body.repo='aom-studio' got a worker dispatched into
  //      AOM's checkout — VERIFIED: two rows landed carrying metadata.repo
  //      'aom-studio' from a karens-world session.
  //   2. `|| 'aom-studio'` was the SAME escalation without needing a body field.
  //      Any world whose chain carried no project — or whose project the gate
  //      above just refused — fell through to a hardcoded AOM repo slug.
  //
  // So the repo is derived from the AUTHORIZED project and nothing else, and the
  // fallback slug faces the same gate the project did. A world that can reach
  // neither gets NO repo, and task-runner.sh fails that row loudly rather than
  // guessing a checkout. Losing the work is recoverable; running it in someone
  // else's repository is not.
  //
  // normalize_repo() in task-runner.sh maps corner/aom-website/arsenal-directory/aom -> aom-studio.
  let repo = taskProject
  if (!repo) {
    const fallbackVerdict = await scope.authorizeTaskProject(DEFAULT_CHAIN_REPO).catch(() => ({ ok: false }))
    if (fallbackVerdict && fallbackVerdict.ok) {
      repo = DEFAULT_CHAIN_REPO
    } else {
      console.warn(
        `[chat-bridge] chain has no authorized project and tenant "${client_id}" cannot reach the default repo — queueing with no repo; task-runner will fail it loudly rather than pick a checkout`,
      )
    }
  }

  // 1) Persist the user's original chain prompt so reload still shows what they asked.
  // Without this, the chat thread looks empty after refresh because the bridge
  // skipped writeFallbackToSupabase. (This was the bug behind the "chain message
  // disappeared" report on 2026-04-16.)
  const userMsgId = body.id || crypto.randomUUID()
  await writeMessageRow({
    supabaseUrl: SUPABASE_URL,
    headers: supabaseHeaders(),
    id: userMsgId,
    agent,
    role: 'user',
    text: message,
    source: 'corner-dashboard',
    clientId: client_id,
    project: project || null,
    // Already authorized above; passed again so the writer re-checks the slug it
    // finally resolves (an inline [project:slug] tag in the chain prompt takes
    // the same gate). Memoized — the explicit slug costs nothing twice.
    authorizeProjectScope: scope?.authorizeProjectScope,
    worldId: scope?.worldId || null,
    userId: sender?.userId || null,
    userName: sender?.userName || null,
    metadata: { chain_id, chain_total: total },
  }).catch(() => {})

  // tasks table has no user_id / user_name columns (messages does). Stash the
  // JWT-verified submitter in metadata so we keep the trail without triggering
  // PGRST204. A worker reading this task can tell "requested by Courtney" from
  // "requester unknown" — it must never read as Patrik by default.
  const rows = parts.map((title, i) => ({
    id: crypto.randomUUID(),
    title,
    text: title,
    status: i === 0 ? 'queued' : 'waiting',
    agent,
    source: 'corner-dashboard',
    client_id,
    // The task's project is the EXEC-authorized one, never the chat one.
    ...(taskProject ? { project: taskProject } : {}),
    created_at: now,
    metadata: {
      chain_id,
      chain_seq: i + 1,
      chain_total: total,
      chain_pending: i !== 0,
      requested_by_agent: agent,
      created_via: 'chain-operator',
      model: 'sonnet',
      // Omitted, never blank-defaulted, when no repo was authorized. An absent
      // key is what makes task-runner.sh fail the row with "metadata.repo
      // missing" instead of resolving an empty slug to somebody's checkout.
      ...(repo ? { repo } : {}),
      ...(sender?.userId ? { user_id: sender.userId } : {}),
      ...(sender?.userName ? { user_name: sender.userName } : {}),
      ...(sender?.identified ? {} : { requester_unattributed: true }),
    },
  }))

  const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(rows),
  })

  if (!sbRes.ok) {
    const err = await sbRes.text().catch(() => 'insert failed')
    return { ok: false, error: err }
  }

  const inserted = await sbRes.json().catch(() => rows)

  // 3) Post the chain-card assistant message so ThreadView renders the chain inline.
  // Surface failures (older code swallowed them silently which hid a missing
  // messages.metadata column for hours).
  const chainMsgId = crypto.randomUUID()
  const summaryLines = inserted.map(r => `${r.metadata.chain_seq}/${total} ${r.title}`)
  const chainText = `Queued chain of ${total} tasks:\n${summaryLines.join('\n')}`

  const cardRes = await writeMessageRow({
    supabaseUrl: SUPABASE_URL,
    headers: supabaseHeaders(),
    id: chainMsgId,
    agent,
    role: 'assistant',
    text: chainText,
    source: 'chain-card',
    clientId: client_id,
    project: project || null,
    authorizeProjectScope: scope?.authorizeProjectScope,
    worldId: scope?.worldId || null,
    // The chain card is the assistant's own summary row, not the human's — it
    // carries no user_name. user_id stays so the card is traceable to the
    // session that triggered it.
    userId: sender?.userId || null,
    metadata: {
      chain_id,
      chain_total: total,
      chain_status: 'queued',
      chain_tasks: inserted.map(r => ({
        id: r.id,
        seq: r.metadata.chain_seq,
        title: r.title,
        status: r.status,
      })),
    },
  }).catch((e) => ({ ok: false, error: String(e) }))

  if (!cardRes || !cardRes.ok) {
    const detail = String(cardRes?.error || '')
    console.error('[chat-bridge] chain-card insert failed', detail.slice(0, 300))
  }

  return {
    ok: true,
    chain_id,
    total,
    tasks: inserted.map(r => ({
      id: r.id,
      seq: r.metadata.chain_seq,
      title: r.title,
      status: r.status,
    })),
    chainMessageId: chainMsgId,
    userMessageId: userMsgId,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // ---- GET: Proxy SSE stream from bridge ----
  if (req.method === 'GET') {
    const messageId = req.query.stream
    if (!messageId) return res.status(400).json({ error: 'stream parameter required' })

    // JWT-only gate: stream is keyed by an opaque crypto.randomUUID messageId
    // that's not tenant-scoped at the bridge protocol level. Per-message tenant
    // binding (look up the message's client_id and verify) is a follow-up; for
    // now require a valid session — blocks unauthenticated stream scraping.
    if (!extractJwt(req)) return res.status(401).json({ error: 'jwt required' })

    if (!BRIDGE_ENABLED) {
      return res.status(503).json({ error: 'bridge disabled', fallback: true })
    }

    const bridgeUrl = getBridgeUrl()

    try {
      const streamRes = await fetch(`${bridgeUrl}/stream/${encodeURIComponent(messageId)}`, {
        headers: bridgeAuthHeaders(),
        signal: AbortSignal.timeout(300000), // 5 min max stream
      })

      if (!streamRes.ok) {
        return res.status(streamRes.status).json({ error: 'bridge stream failed', fallback: true })
      }

      // Pipe SSE from bridge to client
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      const reader = streamRes.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
      } catch (e) {
        // Client disconnected or stream error
      }

      res.end()
      return
    } catch (e) {
      return res.status(503).json({ error: 'bridge unreachable', fallback: true })
    }
  }

  // ---- POST: Send message to bridge, fallback to Supabase ----
  if (req.method === 'POST') {
    const body = req.body || {}
    const message = (body.message || '').trim()
    const raw = (body.client_id || '').toString().trim().toLowerCase()
    if (!raw) return res.status(401).json({ error: 'client_id required' })
    const requestedTenant = raw

    // JWT-gate: verify caller can write to client_id before any bridge dispatch
    // or Supabase write. Replaces the previously-trusted body.client_id with
    // the verified tenant for downstream code paths.
    let verified
    try {
      verified = await verifyTenant(requestedTenant, req)
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
      throw err
    }
    body.client_id = verified.tenant

    // ---- Stop (R-SMOOTHNESS Round C) ---------------------------------------
    // Forward a stop request for an in-flight turn to the local bridge's
    // /interrupt. Tenant-verified above; the bridge does the actual interrupt
    // and owns the durable write. Every failure shape maps to an honest
    // {stopped:false} the UI treats as feature-off (fold remains the floor).
    if ((body.action || '') === 'stop') {
      const stopId = String(body.message_id || '').trim()
      if (!stopId) return res.status(400).json({ error: 'message_id required' })
      try {
        const r = await fetch(`${getBridgeUrl()}/interrupt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...bridgeAuthHeaders() },
          body: JSON.stringify({ message_id: stopId }),
          signal: AbortSignal.timeout(8000),
        })
        const j = await r.json().catch(() => ({}))
        return res.status(200).json({
          stopped: !!j.stopped,
          reason: j.reason || null,
          already: !!j.already,
          pre_send: !!j.pre_send,
          feature_off: r.status === 404,
        })
      } catch (_) {
        return res.status(200).json({ stopped: false, reason: 'bridge_unreachable', feature_off: true })
      }
    }

    // WHO is sending, resolved from the same verified session. Everything below
    // attributes to this and only this — body.user_name / body.user_id are never
    // read again. Before 2026-07-27 an absent name became `|| 'Patrik'`, which is
    // how a second person in the AOM world (Courtney) reached agents as the
    // founder. An unknown sender now reads as unknown, all the way down.
    const sender = await resolveSender(req, verified)

    // ---- Project SCOPE authorization (r5 — finish r4's wiring) --------------
    // The tenant gate above answers "may this caller act inside this ROOM". It
    // says nothing about the project slug, which arrives here by THREE routes —
    // `body.project`, a `project:<slug>` room, and an inline [project:slug] tag
    // — and lands in `messages.project`, one of the two columns the
    // participation floor in verifyTenant.js reads as proof of belonging. Until
    // now this endpoint passed all three straight through, so the busiest write
    // door in the product was the one that let a world mint its own evidence:
    // tag a message with an AOM-only slug from your own world, and the next
    // request walks through the gate on the row you just wrote.
    //
    // Same one line supabase-messages.js uses, built from the VERIFIED tenant
    // and never a body field. Deliberately NOT a second authorization model —
    // the decision stays verifyProjectAccess inside makeProjectScopeAuthorizer,
    // because a drifting second copy is how r2 and r3 each shipped a lockout.
    const authorizeProjectScope = onceProjectScope(
      makeProjectScopeAuthorizer({ req, clientId: verified.tenant }),
    )
    // The world this row is written FROM. In a normal room that is the room's
    // own world; in a SHARED room the message sits in neither world's namespace,
    // so it carries the AUTHOR's world — otherwise Ben's message in an AOM-held
    // shared project reads as AOM's. Identical rule to supabase-messages.js.
    const rowWorldId = String(verified.tenant).startsWith(SHARED_PREFIX)
      ? (sender.world || null)
      : verified.tenant
    // The EXEC verdict, built on the SAME memoized authorizer so the stricter
    // question costs no extra round trips and can never disagree with the
    // looser one about anything except the first-claim arm (r7).
    const authorizeTaskProject = makeTaskProjectAuthorizer(authorizeProjectScope)
    const scope = { authorizeProjectScope, authorizeTaskProject, worldId: rowWorldId }

    // Project-owned rooms route to the owner's EA, not the default AOM dispatcher.
    // Patrik is a guest in Ben's rooms — the host agent answers, not Elon.
    // AOM internal projects stay on Elon.
    // Dashboard uses the short slug ('arsenal', 'sourcing'); phonebook + repo
    // aliases use the long form ('arsenal-directory', 'sourcing-directory').
    // Accept both so whichever the sender used still lands on Ben's EA.
    const BEN_PROJECTS = new Set([
      'arsenal', 'arsenal-directory',
      'sourcing', 'sourcing-directory',
      'valor', 'valor-to-victory',
    ])
    if (body.project && BEN_PROJECTS.has(body.project.trim().toLowerCase())) {
      body.agent = 'arsenal-ea'
    }

    const agent = (body.agent || 'elon').trim()

    if (!message) return res.status(400).json({ error: 'message required' })

    // Chain operator (>>): create N linked tasks, return chain summary,
    // skip bridge dispatch since the runner picks up the first task itself.
    if (message.includes('>>')) {
      const chain = await maybeCreateChain(body, sender, scope).catch((e) => ({ ok: false, error: String(e) }))
      if (chain && chain.ok) {
        return res.status(200).json({
          // messageId points at the user's chain prompt so the frontend can
          // upgrade its optimistic temp-id to the persisted row id, matching
          // the non-chain path below.
          messageId: chain.userMessageId,
          chainCreated: true,
          chain_id: chain.chain_id,
          chain_total: chain.total,
          chainMessageId: chain.chainMessageId,
          tasks: chain.tasks,
        })
      }
      if (chain && !chain.ok) {
        return res.status(500).json({ error: 'chain creation failed', detail: chain.error })
      }
      // chain === null means it didn't actually have ">>" splits; fall through to normal flow
    }

    // Always persist to Supabase (history + fallback receiver)
    const supabaseResult = await writeFallbackToSupabase(body, sender, scope).catch(() => null)
    const messageId = supabaseResult?.message?.id || body.id || crypto.randomUUID()

    // The writer's scope verdict, READ BACK off the row it actually wrote —
    // never recomputed here, so the bridge and the database can never disagree
    // about which room this message belongs to.
    //
    // A refused slug must not reach the live agent either. The tmux bridge
    // routes on `project` / `room` / `mission`, so forwarding a denied scope
    // would seat the sender in the very room the row was just kept out of — and
    // put their text in front of the agent whose CONTEXT.md is the canon every
    // other agent reads fresh. This is the SAME verdict, applied to the second
    // consumer; it is not a second gate.
    //
    // On every non-denied send (i.e. all ordinary chat) the payload below is
    // byte-identical to before this change, including when Supabase is
    // unreachable — supabaseResult is null there, which is not a denial.
    const scopeDenied = supabaseResult?.message?.metadata?.project_scope_denied || null

    // Try the bridge
    if (!BRIDGE_ENABLED) {
      return res.status(200).json({ messageId, fallback: true, supabase: supabaseResult?.ok })
    }

    const bridgeUrl = getBridgeUrl()

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT)

      const bridgeRes = await fetch(`${bridgeUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          message,
          agent,
          // Only a `project:<slug>` room is dropped on denial, and only then —
          // any other room string the caller was already entitled to is passed
          // through untouched.
          room: (scopeDenied && /^project:/i.test(String(body.room || ''))) ? agent : (body.room || agent),
          project: scopeDenied ? '' : (body.project || ''),
          // R3 corner:mission-rooms — forward mission scope so bridge.py
          // can load mission CONTEXT/VISION/BUILD into the SDK system prompt.
          // DEF-14 guard: reject the string "undefined" — it is a JS serialization of a missing value.
          // A mission always hangs off a project, so a denied project takes its
          // mission with it — the same rule writeMessageRow applies to the row.
          ...(!scopeDenied && body.mission && String(body.mission).trim() !== 'undefined' && String(body.mission).trim() !== 'null' ? (() => { const canon = canonicalizeMissionSlug(String(body.mission).trim(), MISSION_SLUG_LOOKUP); return { mission: canon, metadata: { mission_slug: canon } } })() : {}),
          // The live agent's only identity signal. Always non-empty on purpose:
          // scripts/sse-bridge.py falls back to "Patrik" on a missing/blank
          // user_name, so sending the honest label here is what actually stops
          // an unknown sender from being narrated as the founder downstream.
          // `user_verified` lets the bridge distinguish "signed in but unnamed"
          // from "named" once it learns to read it (see escalations).
          user_name: sender.bridgeName,
          user_id: sender.userId || '',
          user_verified: sender.identified,
          thread_id: body.thread_id || body.client_id || '',
          // corner:gemini-workers R10 — per-message model override from the
          // /cvg Gemini workbench surface. Absent on /dashboard sends.
          ...(body.model ? { model: String(body.model) } : {}),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!bridgeRes.ok) {
        const err = await bridgeRes.text().catch(() => 'bridge error')
        return res.status(200).json({ messageId, fallback: true, bridgeError: err })
      }

      const bridgeData = await bridgeRes.json()
      return res.status(200).json({
        messageId: bridgeData.messageId || messageId,
        agent: bridgeData.agent || agent,
        room: bridgeData.room || agent,
        queued: bridgeData.queued || false,
        fallback: false,
      })
    } catch (e) {
      // Bridge unreachable, Supabase write already happened
      return res.status(200).json({ messageId, fallback: true, reason: 'bridge unreachable' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
