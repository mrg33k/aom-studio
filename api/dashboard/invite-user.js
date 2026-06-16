// POST /api/dashboard/invite-user
// Owner-only. Provisions a COMPLETE new Corner user in one call:
//   auth user (world claim) + tenants row + tenant_users row + EA agent_status
//   + welcome message. Returns credentials + a copy-ready invite message.
//
// Mirrors scripts/corner-new-user.py (the CLI workflow) for the dashboard path.
// Public day-one = EA only. Only the super-admin (Patrik) may call this.
// Body: { name, email, password? }
// Returns: { ok, world, user_id, credentials, invite_text }

import { extractJwt } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '833f6828-1dae-409c-a24b-1438f46544d0'
const RESERVED = new Set(['aom', 'ben', 'arsenal', 'template'])

function sbHeaders(extra) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function generatePassword(name) {
  const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 6) || 'Corner'
  const num = Math.floor(Math.random() * 900) + 100
  const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)]
  return `${base.charAt(0).toUpperCase()}${base.slice(1).toLowerCase()}${num}${special}`
}

async function callerIsOwner(req) {
  const jwt = extractJwt(req)
  if (!jwt) return false
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${jwt}` },
  })
  if (!r.ok) return false
  const user = await r.json()
  return user && user.id === SUPER_ADMIN_USER_ID
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  // Owner gate — only Patrik may invite users.
  if (!(await callerIsOwner(req))) {
    return res.status(403).json({ error: 'Only the workspace owner can invite users.' })
  }

  const { name, email } = req.body || {}
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' })

  const world = slugify(name)
  if (!world) return res.status(400).json({ error: 'name must contain letters or numbers' })
  if (RESERVED.has(world)) return res.status(400).json({ error: `'${world}' is reserved` })
  const password = req.body.password || generatePassword(name)
  const displayName = name.trim()
  const userSlug = displayName.split(/\s+/)[0].toLowerCase()

  try {
    // 1. Auth user (world claim drives RLS via current_client_id()).
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          world, display_name: displayName, full_name: displayName, name: displayName,
          workspace_name: displayName, role: 'owner',
          has_completed_onboarding: false, onboarded: false, temp_password: true,
        },
      }),
    })
    if (!userRes.ok) {
      const err = await userRes.text()
      if (err.includes('already been registered')) {
        return res.status(409).json({ error: 'That email already has a Corner account.' })
      }
      return res.status(502).json({ error: 'Failed to create user', detail: err.slice(0, 300) })
    }
    const user = await userRes.json()

    // 2. tenants row (world identity).
    await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=minimal,resolution=merge-duplicates' }),
      body: JSON.stringify({
        id: world, display_name: displayName, plan_tier: 'free',
        access_level: 'owner', settings: { notes: 'Invited via dashboard Members tab' },
      }),
    })

    // 3. tenant_users row (links the auth user to the world as owner).
    await fetch(`${SUPABASE_URL}/rest/v1/tenant_users`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=minimal,resolution=merge-duplicates' }),
      body: JSON.stringify({
        tenant_id: world, user_id: user.id, access_level: 'owner',
        display_name: displayName, slug: userSlug,
      }),
    })

    // 4. EA agent_status (public day-one = EA only).
    await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=minimal,resolution=merge-duplicates' }),
      body: JSON.stringify({
        slug: 'ea', name: `${displayName} EA`, role: 'EA',
        status: 'idle', type: 'agent', client_id: world,
      }),
    })

    // 5. Welcome message, waiting in the room.
    const crypto = await import('crypto')
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        id: crypto.randomUUID(), agent: 'ea', role: 'agent',
        text: `Hey ${displayName} — welcome.\n\nI'm your EA. I work for you. Tell me what you're working on, what's on your plate, what you'd want a sharp partner helping you with — and I'll take it from there.`,
        source: 'gemini', client_id: world,
      }),
    })

    const inviteText = `Hey ${displayName} 👋\n\nYour Corner workspace is ready. Here's your login:\n\n🔗 https://aheadofmarket.com/login\n📧 ${email.trim().toLowerCase()}\n🔑 ${password}\n\nYour assistant is already waiting inside. Just sign in and start talking to it.\n\nChange your password after first login.`

    return res.status(200).json({
      ok: true,
      world,
      user_id: user.id,
      credentials: { email: email.trim().toLowerCase(), password, login_url: 'https://aheadofmarket.com/login' },
      invite_text: inviteText,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
