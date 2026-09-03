// POST /api/dashboard/avatar  -- upload avatar image / set initials and color
// GET  /api/dashboard/avatar?user_id=...  -- get avatar URL for a user
// GET  /api/dashboard/avatar?user_ids=id1,id2  -- batch get avatar URLs
//
// corner:retire-supabase (2026-09-03): avatars live on Convex.
//   bytes    -> files:generateUploadUrl, then one POST of the image to that URL
//   identity -> users:saveProfile (avatarStorageId, initials, color, removeImage)
//   reads    -> users:getUser / users:getByEmail
// The public image URL is the deployment's storage URL for the stored file,
// which is the same URL ctx.storage.getUrl hands back inside Convex.

import { callerIdentity, extractJwt } from '../_lib/verifyTenant.js'
import { applyCors } from '../_lib/originAllowlist.js'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

// A Convex call that carries the caller's own Bearer token, so users:saveProfile
// sees the signed-in person through ctx.auth. Falls back to the legacy
// userId/email argument when the token is not a Convex token.
async function convexAs(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || `HTTP ${res.status}`}`)
  }
  return data.value
}

async function saveProfile(args, token) {
  if (token) {
    try { return await convexAs('mutation', 'users:saveProfile', args, token) } catch { /* not a Convex token; use the fallback id */ }
  }
  return await convexMutation('users:saveProfile', args)
}

function storageUrl(storageId) {
  return storageId ? `${CONVEX_URL}/api/storage/${storageId}` : null
}

function normalizeInitials(value, fallback = '·') {
  const clean = String(value || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()
  return clean || String(fallback || '·').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '·'
}

function fallbackInitials(user) {
  const name = user?.name || user?.email?.split('@')[0] || 'U'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  return normalizeInitials(parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2), 'U')
}

function shapeUser(user) {
  return {
    avatar_url: storageUrl(user?.avatarStorageId),
    display_name: user?.name || user?.email?.split('@')[0] || null,
    initials: user?.avatarInitials || fallbackInitials(user),
    color: user?.avatarColor || user?.color || null,
  }
}

// Accepts a Convex user id or an email. Returns the users row or null.
async function findUser(ref) {
  const value = String(ref || '').trim()
  if (!value) return null
  if (value.includes('@')) {
    try { return await convexQuery('users:getByEmail', { email: value.toLowerCase() }) } catch { return null }
  }
  try { return await convexQuery('users:getUser', { userId: value }) } catch { return null }
}

function validImageBuffer(buffer, mimeType) {
  if (!buffer?.length) return false
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())
  return false
}

export default async function handler(req, res) {
  applyCors(req, res, 'GET,POST')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: fetch avatar URL(s)
  if (req.method === 'GET') {
    const { user_id, user_ids } = req.query

    // Batch mode
    if (user_ids) {
      const ids = String(user_ids).split(',').map((s) => s.trim()).filter(Boolean)
      if (!ids.length) return res.status(400).json({ error: 'user_ids required' })
      const avatars = {}
      await Promise.all(ids.slice(0, 200).map(async (id) => {
        const user = await findUser(id)
        if (user) avatars[id] = shapeUser(user)
      }))
      return res.status(200).json({ avatars })
    }

    // Single user
    if (!user_id) return res.status(400).json({ error: 'user_id required' })
    const user = await findUser(user_id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.status(200).json(shapeUser(user))
  }

  // POST: update the authenticated caller's own avatar identity. A client may
  // still send user_id for compatibility, but it can never target another user.
  if (req.method === 'POST') {
    const who = await callerIdentity(req)
    if (!who?.userId) return res.status(401).json({ error: 'sign in required' })

    const { user_id, image_base64, mime_type = 'image/jpeg', initials, color, remove_image } = req.body || {}
    if (user_id && String(user_id) !== String(who.userId) && String(user_id).toLowerCase() !== String(who.email || '').toLowerCase()) {
      return res.status(403).json({ error: 'you can only update your own profile' })
    }

    if (color != null && !/^#[0-9a-f]{6}$/i.test(String(color))) {
      return res.status(400).json({ error: 'color must be a six-digit hex value' })
    }

    const args = {
      // Fallback identity when the token is not a Convex token: email resolves
      // to the same users row.
      userId: who.email || who.userId,
    }
    if (initials != null) args.initials = normalizeInitials(initials, 'U')
    if (color != null) args.color = String(color)

    if (image_base64) {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      if (!allowedTypes.has(mime_type)) return res.status(400).json({ error: 'unsupported image type' })
      const imageBuffer = Buffer.from(image_base64, 'base64')
      if (!validImageBuffer(imageBuffer, mime_type)) return res.status(400).json({ error: 'invalid image data' })
      if (imageBuffer.length > 1024 * 1024) return res.status(413).json({ error: 'profile image must be smaller than 1 MB' })

      let storageId = null
      try {
        const uploadUrl = await convexMutation('files:generateUploadUrl', {})
        const up = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mime_type }, body: imageBuffer })
        if (!up.ok) throw new Error(`upload HTTP ${up.status}`)
        const uploaded = await up.json()
        storageId = uploaded && uploaded.storageId
        if (!storageId) throw new Error('no storageId returned')
      } catch (err) {
        return res.status(502).json({ error: 'Upload failed', detail: String(err?.message || err) })
      }
      args.avatarStorageId = storageId
    } else if (remove_image) {
      args.removeImage = true
    }

    try {
      const profile = await saveProfile(args, extractJwt(req))
      return res.status(200).json({
        ok: true,
        avatar_url: profile?.avatarUrl || null,
        initials: profile?.initials || args.initials || null,
        color: profile?.color || args.color || null,
      })
    } catch (err) {
      return res.status(502).json({ error: 'Failed to update profile', detail: String(err?.message || err) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
