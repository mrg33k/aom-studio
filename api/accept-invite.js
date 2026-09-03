// GET  /api/accept-invite?token=<plaintext>
//   Validates the token, returns invite info (email, world_slug, role, expires_at).
//   Does NOT consume. Safe to call from the landing page for preview.
//
// POST /api/accept-invite
//   Body: { token, password, display_name? }
//   Consumes the invite: creates the sign-in (or signs the existing person in
//   with the password they gave), joins them to the invite's world, marks the
//   invite used, posts the EA greeting. The EA onboarding takes over from
//   /dashboard after sign-in.
//
// corner:retire-supabase R3 (2026-09-03): sign-in is Convex Auth. The steps:
//   1. invites:peek         read the invite by token (only its hash is stored)
//   2. auth:signIn          flow signUp with the invited email; if the account
//                           already exists, flow signIn with the same password
//   3. invites:accept       as that person (Bearer token): membership row,
//                           invite consumed
//   4. messages:send        the EA greeting into `<world>:agent:ea`
// The session tokens come back in the response so the page can finish
// sign-in without a second password prompt.

import { convexQuery, convexAction, convexMutationAs, convexMutation } from './_lib/verifyTenant.js'

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: preview invite
  if (req.method === 'GET') {
    const token = (req.query.token || '').toString()
    if (!token) return res.status(400).json({ error: 'token required' })

    let invite
    try { invite = await convexQuery('invites:peek', { token }) }
    catch (err) { return res.status(500).json({ error: err.message }) }

    if (!invite) return res.status(404).json({ error: 'invite not found' })
    if (invite.consumed) return res.status(410).json({ error: 'invite already used' })
    if (invite.expired) return res.status(410).json({ error: 'invite expired' })

    return res.status(200).json({
      ok: true,
      email: invite.email,
      world_slug: invite.worldSlug || null,
      world_name: invite.worldName || null,
      role: invite.role,
      expires_at: null,
    })
  }

  // POST: consume invite
  if (req.method === 'POST') {
    const { token, password, display_name } = req.body || {}
    if (!token) return res.status(400).json({ error: 'token required' })
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'password required (min 8 chars)' })
    }

    let invite
    try { invite = await convexQuery('invites:peek', { token }) }
    catch (err) { return res.status(500).json({ error: err.message }) }

    if (!invite) return res.status(404).json({ error: 'invite not found' })
    if (invite.consumed) return res.status(410).json({ error: 'invite already used' })
    if (invite.expired) return res.status(410).json({ error: 'invite expired' })

    const email = normalizeEmail(invite.email)
    const nameForWorld = (display_name && String(display_name).trim()) || email.split('@')[0]

    // 1. Create the sign-in, or sign the existing person in.
    let tokens = null
    let created = false
    try {
      const out = await convexAction('auth:signIn', {
        provider: 'password',
        params: { email, password, name: nameForWorld, flow: 'signUp' },
      })
      tokens = out?.tokens || null
      created = true
    } catch (signUpErr) {
      try {
        const out = await convexAction('auth:signIn', {
          provider: 'password',
          params: { email, password, flow: 'signIn' },
        })
        tokens = out?.tokens || null
      } catch {
        return res.status(409).json({
          error: 'account exists',
          detail: 'An account with this email already exists. Sign in with its password to accept the invite.',
          signup_error: String(signUpErr?.message || signUpErr),
        })
      }
    }
    if (!tokens?.token) return res.status(502).json({ error: 'sign-in did not return a session' })

    // 2. Accept as that person: membership row, invite consumed.
    let accepted
    try {
      accepted = await convexMutationAs(tokens.token, 'invites:accept', { token, name: nameForWorld })
    } catch (err) {
      return res.status(502).json({ error: `membership failed: ${err.message}` })
    }

    const worldSlug = invite.worldSlug || null

    // 3. Seed the EA greeting. Non-fatal: the person is in.
    if (worldSlug) {
      try {
        const greetingText = `Hey ${nameForWorld}, welcome.\n\nI'm your EA. I work for you. Tell me whatever's on your mind right now: what you're working on, what's in your head, what you'd want a sharp partner helping you with, and I'll take it from there.`
        await convexMutation('messages:send', {
          roomId: `${worldSlug}:agent:ea`,
          clientId: worldSlug,
          text: greetingText,
          role: 'assistant',
          agentSlug: 'ea',
          source: 'gemini',
          clientMessageId: `invite-greeting-${String(accepted?.userId || email).slice(0, 100)}`,
        })
      } catch (_) { /* non-fatal */ }
    }

    return res.status(200).json({
      ok: true,
      email,
      world: worldSlug,
      role: invite.role,
      created,
      user_id: accepted?.userId ? String(accepted.userId) : null,
      tokens,
      redirect_url: '/login',
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
