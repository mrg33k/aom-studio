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
import { detectProjectFromText, detectProjectTag, crossPostToProjectThread } from '../_lib/crosspost.js'
import { verifyTenant, TenantAuthError, extractJwt } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const BRIDGE_ENABLED = process.env.BRIDGE_ENABLED !== 'false'
const LOCAL_BRIDGE_URL = process.env.LOCAL_BRIDGE_URL || 'http://localhost:3002'
const BRIDGE_TUNNEL_URL = process.env.BRIDGE_TUNNEL_URL || ''
const BRIDGE_TIMEOUT = 3000 // ms to wait for bridge before fallback

function getBridgeUrl() {
  // Prefer tunnel URL for production (remote access)
  if (BRIDGE_TUNNEL_URL) return BRIDGE_TUNNEL_URL
  return LOCAL_BRIDGE_URL
}

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

async function writeFallbackToSupabase(body) {
  // Fallback: persist message directly to Supabase (existing relay path handles response)
  const messageText = (body.message || '').trim()

  // Project tag detection runs here too so a user's `[project:slug]` mention
  // gets the `project` field + shared-thread crosspost without round-tripping
  // through the browser. See api/_lib/crosspost.js.
  let resolvedProject = (body.project && body.project.trim()) ? body.project.trim() : null
  if (!resolvedProject) {
    // Gate fuzzy project detection on project-scoped rooms. For agent 1:1 rooms
    // (room = agent slug), only honour explicit [project:slug] tags — fuzzy name
    // matching against message text causes messages that mention a project name to
    // be silently tagged and then dropped from the agent thread on reload (the
    // agent-thread query excludes rows with a non-empty project field).
    const room = (body.room || '').trim()
    if (room.startsWith('project:')) {
      resolvedProject = await detectProjectFromText({
        text: messageText,
        supabaseUrl: SUPABASE_URL,
        headers: supabaseHeaders(),
      })
    } else {
      resolvedProject = detectProjectTag(messageText)
    }
  }

  const payload = {
    id: body.id || crypto.randomUUID(),
    agent: body.agent || 'elon',
    role: 'user',
    text: messageText,
    source: 'corner-dashboard',
    client_id: body.client_id || 'aom',
    ...(resolvedProject ? { project: resolvedProject } : {}),
    ...(body.user_id ? { user_id: body.user_id } : {}),
    ...(body.user_name ? { user_name: body.user_name } : {}),
  }

  const url = `${SUPABASE_URL}/rest/v1/messages`
  const sbRes = await fetch(url, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(payload),
  })
  const inserted = sbRes.ok ? await sbRes.json() : null
  const insertedRow = inserted?.[0] || payload

  if (resolvedProject) {
    await crossPostToProjectThread({
      supabaseUrl: SUPABASE_URL,
      headers: supabaseHeaders(),
      sourceMessage: insertedRow,
      project: resolvedProject,
    })
  }

  return { ok: sbRes.ok, message: insertedRow }
}

// Detect ">>" chain operator and create N linked tasks. Returns null if no chain.
// Persists three things to Supabase:
//   1. tasks: N rows linked by metadata.chain_id (first 'queued', rest 'waiting')
//   2. messages: the original user prompt so it stays in chat history
//   3. messages: a chain-card assistant message so the UI shows the chain inline
async function maybeCreateChain(body) {
  const message = (body.message || '').trim()
  if (!message.includes('>>')) return null

  const parts = message.split('>>').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const chain_id = crypto.randomUUID()
  const total = parts.length
  const agent = (body.agent || 'elon').trim()
  const project = (body.project || '').trim()
  const now = new Date().toISOString()
  const client_id = body.client_id || 'aom'
  // task-runner.sh requires metadata.repo to spawn a worker. Without it the row
  // gets failed immediately with "metadata.repo missing; front desk must set it".
  // Chain tasks come straight from the dashboard (no front desk classification),
  // so we infer the repo from project slug -> aom-studio default.
  // normalize_repo() in task-runner.sh maps corner/aom-website/arsenal-directory/aom -> aom-studio.
  const repo = (body.repo || project || 'aom-studio').trim() || 'aom-studio'

  // 1) Persist the user's original chain prompt so reload still shows what they asked.
  // Without this, the chat thread looks empty after refresh because the bridge
  // skipped writeFallbackToSupabase. (This was the bug behind the "chain message
  // disappeared" report on 2026-04-16.)
  const userMsgId = body.id || crypto.randomUUID()
  await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      id: userMsgId,
      agent,
      role: 'user',
      text: message,
      source: 'corner-dashboard',
      client_id,
      ...(project ? { project } : {}),
      ...(body.user_id ? { user_id: body.user_id } : {}),
      ...(body.user_name ? { user_name: body.user_name } : {}),
      metadata: { chain_id, chain_total: total },
    }),
  }).catch(() => {})

  // tasks table has no user_id / user_name columns (messages does). Stash the
  // submitter in metadata so we keep the trail without triggering PGRST204.
  const rows = parts.map((title, i) => ({
    id: crypto.randomUUID(),
    title,
    text: title,
    status: i === 0 ? 'queued' : 'waiting',
    agent,
    source: 'corner-dashboard',
    client_id,
    ...(project ? { project } : {}),
    created_at: now,
    metadata: {
      chain_id,
      chain_seq: i + 1,
      chain_total: total,
      chain_pending: i !== 0,
      requested_by_agent: agent,
      created_via: 'chain-operator',
      model: 'sonnet',
      repo,
      ...(body.user_id ? { user_id: body.user_id } : {}),
      ...(body.user_name ? { user_name: body.user_name } : {}),
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

  const cardRes = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      id: chainMsgId,
      agent,
      role: 'assistant',
      text: chainText,
      source: 'chain-card',
      client_id,
      ...(project ? { project } : {}),
      ...(body.user_id ? { user_id: body.user_id } : {}),
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
    }),
  }).catch((e) => ({ ok: false, _err: String(e) }))

  if (!cardRes || !cardRes.ok) {
    const detail = cardRes?._err || (cardRes?.text ? await cardRes.text().catch(() => '') : '')
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
    const requestedTenant = (body.client_id || 'aom').toString().trim().toLowerCase()

    // JWT-gate: verify caller can write to client_id before any bridge dispatch
    // or Supabase write. Replaces the previously-trusted body.client_id with
    // the verified tenant for downstream code paths.
    let verifiedTenant
    try {
      ({ tenant: verifiedTenant } = await verifyTenant(requestedTenant, req))
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
      throw err
    }
    body.client_id = verifiedTenant

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
      const chain = await maybeCreateChain(body).catch((e) => ({ ok: false, error: String(e) }))
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
    const supabaseResult = await writeFallbackToSupabase(body).catch(() => null)
    const messageId = supabaseResult?.message?.id || body.id || crypto.randomUUID()

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
          room: body.room || agent,
          project: body.project || '',
          user_name: body.user_name || 'Patrik',
          user_id: body.user_id || '',
          thread_id: body.thread_id || body.client_id || '',
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
