// POST /api/integrations/connect { slug }
// Marks the integration connected for the authenticated user. R1 stub: no real
// OAuth — just sets status='connected'. Real auth flows ship through
// /api/integrations/oauth/start.
//
// corner:retire-supabase (2026-09-03): the caller is identified by their Convex
// Auth token (users:verifyToken) and the row is written to the Convex
// integrations table (arcade:setIntegrationStatus). No Supabase.

import { readFileSync } from 'fs'
import { join } from 'path'
import { extractJwt } from '../_lib/verifyTenant.js'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

async function convex(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}

function loadKnownSlugs() {
  try {
    const p = join(process.cwd(), 'src', 'data', 'integrations.json')
    const raw = readFileSync(p, 'utf-8')
    const data = JSON.parse(raw)
    return new Set((Array.isArray(data.integrations) ? data.integrations : []).map(i => i.slug))
  } catch {
    return new Set()
  }
}

const KNOWN_SLUGS = loadKnownSlugs()

// The signed-in person, from the Bearer token, or null.
async function getUser(req) {
  const token = extractJwt(req)
  if (!token) return null
  try {
    const who = await convex('query', 'users:verifyToken', {}, token)
    return who && who.userId ? { ...who, token } : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const slug = (req.body?.slug || '').toString().trim()
  if (!slug || !KNOWN_SLUGS.has(slug)) {
    return res.status(400).json({ error: 'unknown integration slug' })
  }

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'auth required', degraded: true })

  try {
    const connectedAt = new Date().toISOString()
    await convex('mutation', 'arcade:setIntegrationStatus', {
      userId: user.userId,
      service: slug,
      status: 'connected',
    }, user.token)
    return res.status(200).json({
      ok: true,
      row: { user_id: user.userId, integration_slug: slug, status: 'connected', connected_at: connectedAt },
    })
  } catch (err) {
    // The client persists via localStorage when the server write fails.
    return res.status(202).json({ ok: false, degraded: true, error: err.message })
  }
}
