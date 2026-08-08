// POST /api/dashboard/avatar  -- upload avatar image
// GET  /api/dashboard/avatar?user_id=...  -- get avatar URL for a user
// GET  /api/dashboard/avatar?user_ids=id1,id2  -- batch get avatar URLs
//
// Uploads to Supabase Storage (avatars bucket), saves URL to user_metadata.avatar_url.
// Images are public -- served directly from Supabase CDN.

import { callerIdentity } from '../_lib/verifyTenant.js'
import { applyCors } from '../_lib/originAllowlist.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

function sbHeaders(contentType) {
  const h = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  }
  if (contentType) h['Content-Type'] = contentType
  return h
}

function normalizeInitials(value, fallback = '·') {
  const clean = String(value || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()
  return clean || String(fallback || '·').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '·'
}

function fallbackInitials(user) {
  const meta = user?.user_metadata || {}
  const name = meta.full_name || meta.display_name || meta.name || user?.email?.split('@')[0] || 'U'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  return normalizeInitials(parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2), 'U')
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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // GET: fetch avatar URL(s)
  if (req.method === 'GET') {
    const { user_id, user_ids } = req.query

    // Batch mode
    if (user_ids) {
      const ids = user_ids.split(',').filter(Boolean)
      if (!ids.length) return res.status(400).json({ error: 'user_ids required' })

      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
        headers: sbHeaders('application/json'),
      })
      if (!r.ok) return res.status(502).json({ error: 'Failed to fetch users' })
      const data = await r.json()
      const users = data.users || []

      const avatars = {}
      for (const u of users) {
        if (ids.includes(u.id)) {
          avatars[u.id] = {
            avatar_url: u.user_metadata?.avatar_url || null,
            display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || null,
            initials: u.user_metadata?.avatar_initials || fallbackInitials(u),
            color: u.user_metadata?.avatar_color || null,
          }
        }
      }
      return res.status(200).json({ avatars })
    }

    // Single user
    if (!user_id) return res.status(400).json({ error: 'user_id required' })
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      headers: sbHeaders('application/json'),
    })
    if (!r.ok) return res.status(404).json({ error: 'User not found' })
    const user = await r.json()
    return res.status(200).json({
      avatar_url: user.user_metadata?.avatar_url || null,
      display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
      initials: user.user_metadata?.avatar_initials || fallbackInitials(user),
      color: user.user_metadata?.avatar_color || null,
    })
  }

  // POST: update the authenticated caller's own avatar identity. A client may
  // still send user_id for compatibility, but it can never target another user.
  if (req.method === 'POST') {
    const who = await callerIdentity(req)
    if (!who?.userId) return res.status(401).json({ error: 'sign in required' })

    const { user_id, image_base64, mime_type = 'image/jpeg', initials, color, remove_image } = req.body || {}
    if (user_id && String(user_id) !== String(who.userId)) {
      return res.status(403).json({ error: 'you can only update your own profile' })
    }

    const userId = who.userId
    const currentRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: sbHeaders('application/json'),
    })
    if (!currentRes.ok) return res.status(404).json({ error: 'User not found' })
    const currentUser = await currentRes.json()
    const currentMetadata = currentUser.user_metadata || {}
    const nextInitials = initials == null
      ? (currentMetadata.avatar_initials || fallbackInitials(currentUser))
      : normalizeInitials(initials, currentMetadata.avatar_initials || fallbackInitials(currentUser))
    const nextColor = color == null
      ? (/^#[0-9a-f]{6}$/i.test(String(currentMetadata.avatar_color || '')) ? currentMetadata.avatar_color : '#2563EB')
      : String(color)
    if (!/^#[0-9a-f]{6}$/i.test(nextColor)) return res.status(400).json({ error: 'color must be a six-digit hex value' })

    let avatarUrl = currentMetadata.avatar_url || null
    if (image_base64) {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      if (!allowedTypes.has(mime_type)) return res.status(400).json({ error: 'unsupported image type' })
      const imageBuffer = Buffer.from(image_base64, 'base64')
      if (!validImageBuffer(imageBuffer, mime_type)) return res.status(400).json({ error: 'invalid image data' })
      if (imageBuffer.length > 1024 * 1024) return res.status(413).json({ error: 'profile image must be smaller than 1 MB' })

      const ext = mime_type === 'image/png' ? 'png' : mime_type === 'image/webp' ? 'webp' : mime_type === 'image/gif' ? 'gif' : 'jpg'
      const fileName = `${userId}.${ext}`

      // INVARIANT-VIOLATION TODO(corner:audit R15): avatar bytes go to Supabase Storage; reroute to disk+tunnel
      // Reroute DEFERRED (not ripped out) so avatar rendering keeps working. The only
      // server-side disk+tunnel write path a Vercel function can reach is the RAG server's
      // /upload-file (used by file-upload.js) -- but that endpoint auto-shares every upload
      // into the world chat AND indexes it into RAG search, both wrong for a profile picture.
      // A side-effect-free avatar endpoint on rag-server is needed first; until then the
      // bucket write below stays. See RISK NOTES.
      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
        {
          method: 'PUT',
          headers: {
            ...sbHeaders(mime_type),
            'x-upsert': 'true',
          },
          body: imageBuffer,
        }
      )
      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        return res.status(502).json({ error: 'Upload failed', detail: err })
      }
      avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?v=${Date.now()}`
    } else if (remove_image) {
      avatarUrl = null
    }

    // Preserve tenant/world/name metadata while changing only the caller-owned
    // visual identity fields.
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'PUT',
        headers: sbHeaders('application/json'),
        body: JSON.stringify({
          user_metadata: {
            ...currentMetadata,
            avatar_url: avatarUrl,
            avatar_initials: nextInitials,
            avatar_color: nextColor,
          },
        }),
      }
    )
    if (!updateRes.ok) {
      const err = await updateRes.text()
      return res.status(502).json({ error: 'Failed to update user metadata', detail: err })
    }

    return res.status(200).json({ ok: true, avatar_url: avatarUrl, initials: nextInitials, color: nextColor })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
