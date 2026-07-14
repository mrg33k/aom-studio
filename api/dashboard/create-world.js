// POST /api/dashboard/create-world
// Creates a new world: Supabase auth user + EA agent_status + welcome message.
// Body: { name, email, password? }
// Returns: { ok, world, credentials, invite_text }

import {
  authenticateWorldRequest,
  sendWorldAuthError,
  setWorldCors,
} from '../_lib/worldAuth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders(extra) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function generatePassword(name) {
  const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 6) || 'Corner'
  const num = Math.floor(Math.random() * 900) + 100
  const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)]
  return `${base.charAt(0).toUpperCase()}${base.slice(1).toLowerCase()}${num}${special}`
}

export default async function handler(req, res) {
  setWorldCors(req, res, 'POST')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    const { isSuperAdmin } = await authenticateWorldRequest(req)
    if (!isSuperAdmin) return res.status(403).json({ error: 'Super-admin access required' })

    const { name, email } = req.body || {}
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' })
    }

    const worldSlug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const password = req.body.password || generatePassword(name)
    const displayName = name.trim()

    const existingWorldResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(worldSlug)}&select=id&limit=1`,
      { headers: sbHeaders() },
    )
    if (!existingWorldResponse.ok) {
      return res.status(502).json({ error: 'Failed to check world availability' })
    }
    if ((await existingWorldResponse.json()).length) {
      return res.status(409).json({ error: 'That world name is already in use.' })
    }

    // 1. Create Supabase auth user
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          world: worldSlug,
          display_name: displayName,
          full_name: displayName,
          name: displayName,
          workspace_name: displayName,
          role: 'owner',
          has_completed_onboarding: false,
          onboarded: false,
          temp_password: true,
        },
      }),
    })

    if (!userRes.ok) {
      const err = await userRes.text()
      if (err.includes('already been registered')) {
        return res.status(409).json({ error: 'That email already has a Corner account.' })
      }
      return res.status(502).json({ error: 'Failed to create user', detail: err })
    }

    const user = await userRes.json()

    // 2. Create the registry row and owner membership. CV6 data remains keyed
    // by the stable slug; worlds.client_id preserves the owner-user convention.
    const worldResponse = await fetch(`${SUPABASE_URL}/rest/v1/worlds`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify({
        name: displayName,
        slug: worldSlug,
        client_id: user.id,
        status: 'active',
        config: {},
      }),
    })
    if (!worldResponse.ok) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: sbHeaders(),
      })
      return res.status(502).json({ error: 'Failed to create world registry' })
    }
    const worldRows = await worldResponse.json()
    const world = worldRows[0]

    const membershipResponse = await fetch(`${SUPABASE_URL}/rest/v1/world_members`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        world_id: world.id,
        user_id: user.id,
        role: 'owner',
        created_at: new Date().toISOString(),
      }),
    })
    if (!membershipResponse.ok) {
      await fetch(`${SUPABASE_URL}/rest/v1/worlds?id=eq.${encodeURIComponent(world.id)}`, {
        method: 'DELETE',
        headers: sbHeaders(),
      })
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: sbHeaders(),
      })
      return res.status(502).json({ error: 'Failed to create world membership' })
    }

    // 3. Create EA agent_status
    const crypto = await import('crypto')
    await fetch(`${SUPABASE_URL}/rest/v1/agent_status`, {
      method: 'POST',
      headers: sbHeaders({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        slug: 'ea',
        name: `${displayName} EA`,
        status: 'idle',
        type: 'agent',
        client_id: worldSlug,
      }),
    })

    // 4. Seed EA welcome message
    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: sbHeaders({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        id: crypto.randomUUID(),
        agent: 'ea',
        role: 'agent',
        text: `Hey ${displayName} — welcome.\n\nI'm your EA. I work for you. Tell me whatever's on your mind right now — what you're working on, what's in your head, what you'd want a sharp partner helping you with — and I'll take it from there.`,
        source: 'gemini',
        client_id: worldSlug,
      }),
    })

    // 5. Build invite text
    const inviteText = `Hey ${displayName} 👋\n\nYour Corner workspace is ready. Here's your login:\n\n🔗 https://aheadofmarket.com/login\n📧 ${email.trim().toLowerCase()}\n🔑 ${password}\n\nYour EA is already waiting inside. Just sign in and start talking to it.\n\nChange your password after first login.`

    return res.status(200).json({
      ok: true,
      world: worldSlug,
      user_id: user.id,
      credentials: {
        email: email.trim().toLowerCase(),
        password,
        login_url: 'https://aheadofmarket.com/login',
      },
      invite_text: inviteText,
    })
  } catch (err) {
    return sendWorldAuthError(res, err)
  }
}
