// GET  /api/accept-invite?token=<plaintext>
//   Validates the token, returns invite info (email, world_slug, role, expires_at).
//   Does NOT consume.  Safe to call from the landing page for preview.
//
// POST /api/accept-invite
//   Body: { token, password, display_name? }
//   Consumes the invite: creates or links the user, joins them to the target world
//   (creating the world if world_slug is null or unknown), marks token_hash used.
//   The EA onboarding takes over from /dashboard after sign-in.

import crypto from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function sbHeaders(extra) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function isExpired(row) {
  if (!row?.expires_at) return true
  return new Date(row.expires_at).getTime() < Date.now()
}

function sanitizeSlug(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function findInviteByToken(token) {
  const tokenHash = sha256(token)
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/invites?token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,email,world_slug,role,expires_at,consumed_at,consumed_by,invited_by&limit=1`,
    { headers: sbHeaders() }
  )
  if (!r.ok) throw new Error(`lookup failed: ${r.status}`)
  const rows = await r.json()
  return rows[0] || null
}

async function findUserByEmail(email) {
  // admin/users supports ?email=... but to stay compatible we do a listing match.
  const r = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
    { headers: sbHeaders() }
  )
  if (!r.ok) return null
  const payload = await r.json()
  const users = payload.users || []
  return users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function ensureWorld(slug, displayName) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/worlds?slug=eq.${encodeURIComponent(slug)}&select=id,slug,client_id&limit=1`,
    { headers: sbHeaders() }
  )
  if (!r.ok) throw new Error('world lookup failed')
  const rows = await r.json()
  if (rows[0]) return rows[0]

  const id = crypto.randomUUID()
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/worlds`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify({
      id,
      slug,
      client_id: slug,
      name: displayName || slug,
      status: 'active',
    }),
  })
  if (!ins.ok) throw new Error(`world create failed: ${await ins.text()}`)
  const [created] = await ins.json()
  return created
}

async function addWorldMember(worldId, userId, role) {
  // Ignore duplicates via the unique (world_id, user_id) constraint.
  await fetch(`${SUPABASE_URL}/rest/v1/world_members`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify({
      id: crypto.randomUUID(),
      world_id: worldId,
      user_id: userId,
      role: role || 'member',
    }),
  })
}

async function getInviterDisplayName(userId) {
  if (!userId) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: sbHeaders() })
  if (!r.ok) return null
  const u = await r.json()
  return u.user_metadata?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || null
}

async function markConsumed(inviteId, userId) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/invites?id=eq.${inviteId}`,
    {
      method: 'PATCH',
      headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        consumed_at: new Date().toISOString(),
        consumed_by: userId,
      }),
    }
  )
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // ── GET: preview invite ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const token = (req.query.token || '').toString()
    if (!token) return res.status(400).json({ error: 'token required' })

    let invite
    try { invite = await findInviteByToken(token) }
    catch (err) { return res.status(500).json({ error: err.message }) }

    if (!invite) return res.status(404).json({ error: 'invite not found' })
    if (invite.consumed_at) return res.status(410).json({ error: 'invite already used' })
    if (isExpired(invite)) return res.status(410).json({ error: 'invite expired' })

    return res.status(200).json({
      ok: true,
      email: invite.email,
      world_slug: invite.world_slug,
      role: invite.role,
      expires_at: invite.expires_at,
    })
  }

  // ── POST: consume invite ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { token, password, display_name } = req.body || {}
    if (!token) return res.status(400).json({ error: 'token required' })
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'password required (min 8 chars)' })
    }

    let invite
    try { invite = await findInviteByToken(token) }
    catch (err) { return res.status(500).json({ error: err.message }) }

    if (!invite) return res.status(404).json({ error: 'invite not found' })
    if (invite.consumed_at) return res.status(410).json({ error: 'invite already used' })
    if (isExpired(invite)) return res.status(410).json({ error: 'invite expired' })

    const email = invite.email
    const nameForWorld = display_name || email.split('@')[0]
    const worldSlug = invite.world_slug || sanitizeSlug(nameForWorld) || sanitizeSlug(email.split('@')[0]) || 'corner-world'

    // 1. Ensure world exists
    let world
    try { world = await ensureWorld(worldSlug, nameForWorld) }
    catch (err) { return res.status(502).json({ error: err.message }) }

    // 2. Create or link the Supabase auth user
    let user = await findUserByEmail(email)
    if (!user) {
      const uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            world: world.slug,
            display_name: display_name || null,
            full_name: display_name || null,
            name: display_name || null,
            role: invite.role,
            invited_via: invite.id,
            has_completed_onboarding: false,
            onboarded: false,
          },
        }),
      })
      if (!uRes.ok) {
        const detail = await uRes.text()
        return res.status(502).json({ error: 'user create failed', detail })
      }
      user = await uRes.json()
    } else if (!user.user_metadata?.world) {
      // Attach existing user to this world if they aren't yet.
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: sbHeaders(),
        body: JSON.stringify({
          user_metadata: { ...user.user_metadata, world: world.slug, invited_via: invite.id },
        }),
      })
    }

    // 3. Add as world_member
    try { await addWorldMember(world.id, user.id, invite.role) }
    catch (err) { return res.status(502).json({ error: `membership failed: ${err.message}` }) }

    // 4. Seed EA greeting
    try {
      const inviterName = invite.invited_by ? await getInviterDisplayName(invite.invited_by) : null
      const greetingText = invite.invited_by
        ? `Hey ${nameForWorld} — ${inviterName || 'someone'} invited you in. Welcome.\n\nI'm your EA. Tell me what's on your mind and I'll take it from there.`
        : `Hey ${nameForWorld} — welcome.\n\nI'm your EA. I work for you. Tell me whatever's on your mind right now — what you're working on, what's in your head, what you'd want a sharp partner helping you with — and I'll take it from there.`
      await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({
          id: crypto.randomUUID(),
          agent: 'ea',
          role: 'agent',
          text: greetingText,
          source: 'gemini',
          client_id: worldSlug,
        }),
      })
    } catch (_) { /* non-fatal: user is in */ }

    // 5. Mark invite consumed
    try { await markConsumed(invite.id, user.id) }
    catch (_) { /* non-fatal: user is in */ }

    return res.status(200).json({
      ok: true,
      email,
      world: world.slug,
      role: invite.role,
      redirect_url: '/login',
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
