// POST /api/dashboard/chat-bridge  -- Send message to local SSE bridge
// GET  /api/dashboard/chat-bridge?stream={messageId} -- Proxy SSE stream from bridge
//
// Thin proxy between dashboard (Vercel) and the local SSE bridge running on the
// Mac Mini. The message row is always written to Convex first (history + the
// fallback receiver when the bridge is unreachable).
//
// corner:retire-supabase (2026-09-03): the row goes to messages:send on Convex,
// chain tasks go to tasks:queue, and project scope is projects:hasAccess.
// The Supabase writer (write-message.js) is not used here any more.
//
// Env vars:
//   LOCAL_BRIDGE_URL   -- Bridge base URL (default: http://localhost:3002)
//   BRIDGE_TUNNEL_URL  -- Cloudflare/ngrok tunnel URL for remote access (optional)
//   BRIDGE_ENABLED     -- Kill switch (default: true)

import crypto from 'crypto'
import { verifyTenant, TenantAuthError, extractJwt, callerIdentity } from '../_lib/verifyTenant.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js'
const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry)

const BRIDGE_ENABLED = process.env.BRIDGE_ENABLED !== 'false'
const LOCAL_BRIDGE_URL = process.env.LOCAL_BRIDGE_URL || 'http://localhost:3002'
const BRIDGE_TUNNEL_URL = process.env.BRIDGE_TUNNEL_URL || ''
const BRIDGE_TIMEOUT = 3000 // ms to wait for bridge before fallback

const SHARED_PREFIX = 'shared:'

// The repo a projectless chain used to fall back to unconditionally. It is a
// CANDIDATE, not a default: it goes through the same task-scope gate as any
// other slug, so only a world that can actually reach it gets it.
const DEFAULT_CHAIN_REPO = 'aom-studio'

function getBridgeUrl() {
  // Prefer tunnel URL for production (remote access)
  if (BRIDGE_TUNNEL_URL) return BRIDGE_TUNNEL_URL
  return LOCAL_BRIDGE_URL
}

// Shared token for the two tunnel-publishable bridge routes (/stream,
// /interrupt). The bridge refuses tunneled requests without it.
const BRIDGE_PUBLIC_TOKEN = process.env.BRIDGE_PUBLIC_TOKEN || ''
function bridgeAuthHeaders() {
  return BRIDGE_PUBLIC_TOKEN ? { 'X-Bridge-Token': BRIDGE_PUBLIC_TOKEN } : {}
}

// What the agent is told when the sender can't be named. NEVER a person's name:
// the bridge turns user_name into "You are talking to **X**", and "Patrik" there
// is an authorization signal agents act on.
const UNNAMED_SENDER = 'Unidentified sender'

// Who is actually sending this message. Derived SERVER-SIDE from the JWT; the
// client-supplied body.user_name / body.user_id are ignored for attribution.
async function resolveSender(req, verified) {
  let userId = verified?.userId || null
  let userName = null
  let email = verified?.email || null
  let world = verified?.world || null
  if (verified && 'userName' in verified) {
    userName = verified.userName || verified.email || null
  } else {
    const ident = await callerIdentity(req).catch(() => null)
    if (ident) {
      userId = userId || ident.userId || null
      userName = ident.userName || ident.email || null
      email = email || ident.email || null
      world = world || ident.world || null
    }
  }
  const name = (userName == null ? '' : String(userName)).trim() || null
  return {
    userId: userId || null,
    email: email || null,
    userName: name,
    bridgeName: name || UNNAMED_SENDER,
    identified: Boolean(name),
    world: world || null,
  }
}

// ---------------------------------------------------------------------------
// PROJECT SCOPE. A message may only carry a project slug its world can reach:
// the holder world or a world with a grant (projects:hasAccess). A slug that
// no world has registered is a first claim: fine for a chat tag (the room is
// the caller's own), never for a task, because a task's project steers which
// checkout the runner uses. One verdict per slug per request.
// ---------------------------------------------------------------------------
function makeScope(world) {
  const seen = new Map()
  const verdictFor = async (slug) => {
    const raw = String(slug || '').trim()
    if (!raw) return { ok: true, via: 'no-scope', task: true }
    if (!seen.has(raw)) {
      seen.set(raw, (async () => {
        try {
          const access = await convexQuery('projects:hasAccess', { slug: raw, worldId: world })
          if (access && access.ok) return { ok: true, via: access.role || 'access', task: true }
          const held = await convexQuery('projects:lookupBySlug', { slug: raw })
          if (!held) return { ok: true, via: 'first-claim', task: false, reason: 'project is not registered, so it names a room but not a checkout' }
          return { ok: false, via: 'denied', task: false, reason: `project "${raw}" belongs to world "${held.ownerWorld}"` }
        } catch (e) {
          return { ok: false, via: 'error', task: false, reason: String((e && e.message) || e) }
        }
      })())
    }
    return seen.get(raw)
  }
  return {
    authorizeProjectScope: verdictFor,
    authorizeTaskProject: async (slug) => {
      const v = await verdictFor(slug)
      if (!v.ok) return v
      if (!v.task) return { ok: false, via: 'first-claim-not-a-checkout', reason: v.reason }
      return v
    },
  }
}

// The Convex room key. Grammar: <world>:project:<slug>,
// <world>:mission:<project>:<slug>, <world>:agent:<agent>.
function roomKey(world, { agent, project, mission }) {
  if (mission && project) {
    const leaf = String(mission).includes(':') ? String(mission).slice(String(mission).indexOf(':') + 1) : String(mission)
    return `${world}:mission:${project}:${leaf}`
  }
  if (project) return `${world}:project:${project}`
  return `${world}:agent:${agent || 'elon'}`
}

function cleanMission(value) {
  const s = value == null ? '' : String(value).trim()
  return s && s !== 'undefined' && s !== 'null' ? s : null
}

// Write the user's message to Convex. Returns { ok, messageId, project, scopeDenied }.
async function writeMessage(body, sender, scope, world) {
  const room = (body.room || '').trim()
  const roomProject = room.startsWith('project:') ? room.slice('project:'.length).trim() || null : null
  let project = (body.project && String(body.project).trim()) || roomProject || null
  let scopeDenied = null
  if (project) {
    const verdict = await scope.authorizeProjectScope(project).catch((e) => ({ ok: false, reason: String(e?.message || e) }))
    if (!verdict || !verdict.ok) {
      scopeDenied = { requested: project, via: verdict?.via || 'denied', reason: verdict?.reason || 'not reachable from this world' }
      console.warn(`[chat-bridge] project scope DENIED: tenant "${world}" may not tag project "${project}": ${scopeDenied.reason}; writing the message unscoped`)
      project = null
    }
  }
  const rawMission = scopeDenied ? null : (cleanMission(body.mission) || cleanMission(body.metadata?.mission_slug))
  const mission = rawMission ? canonicalizeMissionSlug(rawMission, MISSION_SLUG_LOOKUP, project) : null
  const metadata = { ...((body.metadata && typeof body.metadata === 'object') ? body.metadata : {}) }
  if (scopeDenied) { delete metadata.mission_slug; metadata.project_scope_denied = scopeDenied }
  if (mission) metadata.mission_slug = mission
  if (!sender.identified) metadata.unattributed = true
  const messageId = await convexMutation('messages:send', {
    roomId: roomKey(world, { agent: body.agent || 'elon', project, mission }),
    text: String(body.message || '').trim(),
    role: 'user',
    source: 'corner-dashboard',
    clientId: world,
    clientMessageId: body.id ? String(body.id).slice(0, 160) : undefined,
    userId: sender.userId || undefined,
    userEmail: sender.email || undefined,
    userName: sender.userName || undefined,
    metadata,
  })
  return { ok: true, messageId, project, mission, scopeDenied }
}

// Detect ">>" chain operator and create N linked tasks. Returns null if no chain.
// Persists three things:
//   1. tasks: N rows linked by metadata.chain_id (first 'queued', the rest parked
//      as 'blocked' with chain_pending until task-complete.sh promotes them)
//   2. messages: the original user prompt so it stays in chat history
//   3. messages: a chain-card assistant message so the UI shows the chain inline
async function maybeCreateChain(body, sender, scope, world) {
  const message = (body.message || '').trim()
  if (!message.includes('>>')) return null

  const parts = message.split('>>').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const chain_id = crypto.randomUUID()
  const total = parts.length
  const agent = (body.agent || 'elon').trim()
  let project = (body.project || '').trim()
  const now = new Date().toISOString()

  if (project) {
    const verdict = await scope.authorizeProjectScope(project).catch((e) => ({ ok: false, reason: String(e?.message || e) }))
    if (!verdict || !verdict.ok) {
      console.warn(`[chat-bridge] chain project scope DENIED: tenant "${world}" may not queue tasks under project "${project}": ${verdict?.reason || 'not reachable from this world'}; queueing unscoped`)
      project = ''
    }
  }

  // The TASK rows take a stricter verdict than the message rows, because they
  // steer a checkout rather than a thread.
  let taskProject = project
  if (taskProject) {
    const taskVerdict = await scope.authorizeTaskProject(taskProject).catch(() => ({ ok: false }))
    if (!taskVerdict || !taskVerdict.ok) {
      console.warn(`[chat-bridge] chain TASK scope DENIED: tenant "${world}" may not queue work under project "${taskProject}": ${taskVerdict?.reason || 'not reachable from this world'}; the chat message keeps its room, the tasks do not get the checkout`)
      taskProject = ''
    }
  }

  // task-runner.sh requires metadata.repo to spawn a worker. The repo is
  // derived from the AUTHORIZED project and nothing else, and the fallback
  // slug faces the same gate. A world that can reach neither gets NO repo,
  // and task-runner.sh fails that row loudly rather than guessing a checkout.
  let repo = taskProject
  if (!repo) {
    const fallbackVerdict = await scope.authorizeTaskProject(DEFAULT_CHAIN_REPO).catch(() => ({ ok: false }))
    if (fallbackVerdict && fallbackVerdict.ok) {
      repo = DEFAULT_CHAIN_REPO
    } else {
      console.warn(`[chat-bridge] chain has no authorized project and tenant "${world}" cannot reach the default repo; queueing with no repo`)
    }
  }

  // 1) Persist the user's original chain prompt so reload still shows what they asked.
  let userMessageId = null
  try {
    userMessageId = await convexMutation('messages:send', {
      roomId: roomKey(world, { agent, project: project || null, mission: null }),
      text: message,
      role: 'user',
      source: 'corner-dashboard',
      clientId: world,
      clientMessageId: body.id ? String(body.id).slice(0, 160) : undefined,
      userId: sender.userId || undefined,
      userEmail: sender.email || undefined,
      userName: sender.userName || undefined,
      metadata: { chain_id, chain_total: total, ...(sender.identified ? {} : { unattributed: true }) },
    })
  } catch (e) {
    console.warn('[chat-bridge] chain prompt write failed', String(e?.message || e).slice(0, 200))
  }

  // 2) The task rows. The JWT-verified submitter rides in metadata so a worker
  // can tell "requested by Courtney" from "requester unknown".
  const inserted = []
  for (let i = 0; i < parts.length; i++) {
    const title = parts[i]
    const row = await convexMutation('tasks:queue', {
      row: {
        title,
        text: title,
        status: i === 0 ? 'queued' : 'blocked',
        agent,
        source: 'corner-dashboard',
        client_id: world,
        ...(taskProject ? { project: taskProject } : {}),
        created_at: now,
        created_by: sender.userId || sender.email || undefined,
        metadata: {
          chain_id,
          chain_seq: i + 1,
          chain_total: total,
          chain_pending: i !== 0,
          requested_by_agent: agent,
          created_via: 'chain-operator',
          model: 'sonnet',
          ...(repo ? { repo } : {}),
          ...(sender.userId ? { user_id: sender.userId } : {}),
          ...(sender.userName ? { user_name: sender.userName } : {}),
          ...(sender.identified ? {} : { requester_unattributed: true }),
        },
      },
    })
    inserted.push(row)
  }

  // 3) Post the chain-card assistant message so the thread renders the chain inline.
  const summaryLines = inserted.map(r => `${r.metadata.chain_seq}/${total} ${r.title}`)
  const chainText = `Queued chain of ${total} tasks:\n${summaryLines.join('\n')}`
  let chainMessageId = null
  try {
    chainMessageId = await convexMutation('messages:send', {
      roomId: roomKey(world, { agent, project: project || null, mission: null }),
      text: chainText,
      role: 'assistant',
      agentSlug: agent,
      source: 'chain-card',
      clientId: world,
      metadata: {
        chain_id,
        chain_total: total,
        chain_status: 'queued',
        chain_tasks: inserted.map(r => ({ id: r.id, seq: r.metadata.chain_seq, title: r.title, status: r.status })),
      },
    })
  } catch (e) {
    console.error('[chat-bridge] chain-card insert failed', String(e?.message || e).slice(0, 300))
  }

  return {
    ok: true,
    chain_id,
    total,
    tasks: inserted.map(r => ({ id: r.id, seq: r.metadata.chain_seq, title: r.title, status: r.status })),
    chainMessageId,
    userMessageId,
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

    // JWT-only gate: stream is keyed by an opaque messageId that's not
    // tenant-scoped at the bridge protocol level. Require a valid session.
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

  // ---- POST: Send message to bridge, persist on Convex ----
  if (req.method === 'POST') {
    const body = req.body || {}
    const message = (body.message || '').trim()
    const raw = (body.client_id || '').toString().trim().toLowerCase()
    if (!raw) return res.status(401).json({ error: 'client_id required' })
    const requestedTenant = raw

    // JWT-gate: verify caller can write to client_id before any bridge dispatch
    // or Convex write. Replaces the previously-trusted body.client_id with
    // the verified tenant for downstream code paths.
    let verified
    try {
      verified = await verifyTenant(requestedTenant, req)
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
      throw err
    }
    body.client_id = verified.tenant

    // ---- Stop: forward a stop request for an in-flight turn to the bridge ----
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
    // attributes to this and only this.
    const sender = await resolveSender(req, verified)

    // The world this row is written FROM. A shared room is in no world's
    // namespace on Convex, so it resolves to the AUTHOR's world.
    const world = String(verified.tenant).startsWith(SHARED_PREFIX)
      ? (sender.world || verified.tenant)
      : verified.tenant
    const scope = makeScope(world)

    // Project-owned rooms route to the owner's EA, not the default AOM dispatcher.
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
      const chain = await maybeCreateChain(body, sender, scope, world).catch((e) => ({ ok: false, error: String(e) }))
      if (chain && chain.ok) {
        return res.status(200).json({
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
    }

    // Always persist to Convex (history + fallback receiver)
    const written = await writeMessage(body, sender, scope, world).catch((e) => {
      console.warn('[chat-bridge] convex write failed', String(e?.message || e).slice(0, 200))
      return null
    })
    const messageId = written?.messageId || body.id || crypto.randomUUID()

    // The writer's scope verdict, read back off what it wrote: a refused slug
    // must not reach the live agent either.
    const scopeDenied = written?.scopeDenied || null

    // Try the bridge
    if (!BRIDGE_ENABLED) {
      return res.status(200).json({ messageId, fallback: true, convex: !!written })
    }

    const bridgeUrl = getBridgeUrl()

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT)

      const mission = written?.mission || null
      const bridgeRes = await fetch(`${bridgeUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          message,
          agent,
          room: (scopeDenied && /^project:/i.test(String(body.room || ''))) ? agent : (body.room || agent),
          project: scopeDenied ? '' : (body.project || ''),
          // Mission scope so bridge.py can load mission CONTEXT/VISION/BUILD
          // into the SDK system prompt. A denied project takes its mission with it.
          ...(mission ? { mission, metadata: { mission_slug: mission } } : {}),
          // The live agent's only identity signal. Always non-empty on purpose.
          user_name: sender.bridgeName,
          user_id: sender.userId || '',
          user_verified: sender.identified,
          thread_id: body.thread_id || body.client_id || '',
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
      // Bridge unreachable, the Convex write already happened
      return res.status(200).json({ messageId, fallback: true, reason: 'bridge unreachable' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
