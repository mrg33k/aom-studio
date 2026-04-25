// GET  /api/dashboard/supabase-messages?agent={slug}&limit=100&client=aom
// POST /api/dashboard/supabase-messages  { agent, text, role, source, client_id }
//
// Server-side Supabase proxy. Uses service role key for writes.
// The ONLY production chat endpoint. No Supabase JS client in browser.
//
// Multi-tenant: all reads + writes are scoped by client_id.
// Default client_id = 'aom'. Pass ?client= on GET or client_id in POST body.

import crypto from 'crypto'
import { detectProjectFromText, crossPostToProjectThread } from '../_lib/crosspost.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const DEFAULT_CLIENT_ID = 'aom'

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // ---- GET: load chat history for an agent --------------------------------
  if (req.method === 'GET') {
    const { agent, limit = 100, all } = req.query
    if (!agent && !all) return res.status(400).json({ error: 'agent required' })

    // client_id filter ready for multi-tenant (add column to Supabase first)
    const clientId = (req.query.client && req.query.client.trim())
      ? req.query.client.trim().toLowerCase()
      : DEFAULT_CLIENT_ID

    // Always filter by client_id for multi-tenant isolation.
    // Requires: ALTER TABLE messages ADD COLUMN client_id text DEFAULT 'aom';
    // Supabase silently ignores unknown column filters -- safe to include always.
    const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`

    // ?search=keyword: full-text search across ALL messages for this agent (no limit cap)
    const searchQuery = req.query.search ? req.query.search.trim() : ''

    // ?all=true: fetch ALL messages across all agents (for AOM Team Room aggregate view)
    const agentFilter = (all === 'true' || all === '1') ? '' : `&agent=eq.${encodeURIComponent(agent)}`
    const searchFilter = searchQuery ? `&text=ilike.*${encodeURIComponent(searchQuery)}*` : ''
    const searchLimit = searchQuery ? 500 : limit  // search returns more results
    const url = `${SUPABASE_URL}/rest/v1/messages?select=*${agentFilter}${clientFilter}${searchFilter}&order=timestamp.desc&limit=${searchLimit}`
    const sbRes = await fetch(url, { headers: supabaseHeaders() })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    const messages = await sbRes.json()
    // Reverse so oldest first (fetched desc to get the LATEST N, display asc)
    messages.reverse()
    return res.status(200).json({ messages })
  }

  // ---- PATCH: update status on an existing message (read receipt persistence) -
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {}
    if (!id || !status) return res.status(400).json({ error: 'id and status required' })
    const allowed = ['sent', 'delivered', 'read', 'composing']
    if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' })

    const url = `${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(id)}`
    const sbRes = await fetch(url, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: JSON.stringify({ status }),
    })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    return res.status(200).json({ ok: true })
  }

  // ---- POST: write a new message (user send from dashboard) ---------------
  if (req.method === 'POST') {
    const {
      agent, text, role = 'user', source = 'corner-dashboard', client_id, sender_role, world_id, project,
      // User identity (multi-user support)
      user_id, user_name,
      // Attachment fields (optional)
      attachment_url, file_mime_type, file_size,
      // Threading + context-menu metadata (right-click Follow-up / verify / research / crosspost)
      reply_to, metadata,
    } = req.body || {}
    if (!agent || !text) return res.status(400).json({ error: 'agent and text required' })

    // Resolve client_id: prefer body field, else default to 'aom'
    const resolvedClientId = (client_id && client_id.trim())
      ? client_id.trim().toLowerCase()
      : DEFAULT_CLIENT_ID

    // --- Project auto-detection ---
    // Priority: explicit project field > [project:slug] tag in text > slug/name
    // lookup. Shared with chat-bridge via api/_lib/crosspost.js.
    let resolvedProject = (project && project.trim()) ? project.trim() : null
    if (!resolvedProject) {
      resolvedProject = await detectProjectFromText({
        text,
        supabaseUrl: SUPABASE_URL,
        headers: supabaseHeaders(),
      })
    }

    const payload = {
      id: crypto.randomUUID(),
      agent,
      role,
      text: text.trim(),
      source,
      client_id: resolvedClientId,  // always include -- multi-tenant isolation
      ...(resolvedProject ? { project: resolvedProject } : {}),
      // Admin context: sender_role ('admin') + world_id when super-admin is in a client world.
      // These fields are optional -- only present when admin is overriding world context.
      ...(sender_role ? { sender_role } : {}),
      ...(world_id ? { world_id } : {}),
      // User identity (multi-user support)
      ...(user_id ? { user_id } : {}),
      ...(user_name ? { user_name } : {}),
      // File attachment fields (optional)
      ...(attachment_url ? { attachment_url } : {}),
      ...(file_mime_type ? { file_mime_type } : {}),
      ...(file_size != null ? { file_size } : {}),
      // Threading (Follow-up right-click menu)
      ...(reply_to ? { reply_to } : {}),
      // Extensible metadata (needs_verification flag, parent_task_id, crosspost source, etc.)
      ...(metadata && typeof metadata === 'object' ? { metadata } : {}),
    }

    const url = `${SUPABASE_URL}/rest/v1/messages`
    const sbRes = await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify(payload),
    })

    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }

    const inserted = await sbRes.json()
    const insertedRow = (Array.isArray(inserted) ? inserted[0] : inserted) || payload

    // --- Cross-post to shared project thread ---
    // Single source-of-truth writer. Idempotent by (source_message_id, project)
    // so retries/reruns don't double-insert. See api/_lib/crosspost.js.
    if (resolvedProject) {
      await crossPostToProjectThread({
        supabaseUrl: SUPABASE_URL,
        headers: supabaseHeaders(),
        sourceMessage: insertedRow,
        project: resolvedProject,
      })
    }

    return res.status(200).json({ ok: true, message: insertedRow })
  }

  // ---- DELETE: clear all messages for a client_id (world switch fresh-start) ------
  if (req.method === 'DELETE') {
    const clientId = (req.query.client && req.query.client.trim())
      ? req.query.client.trim().toLowerCase()
      : null
    if (!clientId || clientId === 'aom') {
      // Safety guard: never allow bulk-delete for aom world
      return res.status(400).json({ error: 'client required and must not be aom' })
    }
    const url = `${SUPABASE_URL}/rest/v1/messages?client_id=eq.${encodeURIComponent(clientId)}`
    const sbRes = await fetch(url, {
      method: 'DELETE',
      headers: supabaseHeaders(),
    })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
