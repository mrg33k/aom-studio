// POST /api/dashboard/avatar  -- upload avatar image
// GET  /api/dashboard/avatar?user_id=...  -- get avatar URL for a user
// GET  /api/dashboard/avatar?user_ids=id1,id2  -- batch get avatar URLs
//
// Uploads to Supabase Storage (avatars bucket), saves URL to user_metadata.avatar_url.
// Images are public -- served directly from Supabase CDN.

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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
    })
  }

  // POST: upload avatar
  if (req.method === 'POST') {
    const { user_id, image_base64, mime_type = 'image/jpeg' } = req.body || {}
    if (!user_id || !image_base64) {
      return res.status(400).json({ error: 'user_id and image_base64 required' })
    }

    const ext = mime_type === 'image/png' ? 'png' : mime_type === 'image/webp' ? 'webp' : mime_type === 'image/gif' ? 'gif' : 'jpg'
    const fileName = `${user_id}.${ext}`
    const imageBuffer = Buffer.from(image_base64, 'base64')

    // INVARIANT-VIOLATION TODO(corner:audit R15): avatar bytes go to Supabase Storage; reroute to disk+tunnel
    // Reroute DEFERRED (not ripped out) so avatar rendering keeps working. The only
    // server-side disk+tunnel write path a Vercel function can reach is the RAG server's
    // /upload-file (used by file-upload.js) -- but that endpoint auto-shares every upload
    // into the world chat AND indexes it into RAG search, both wrong for a profile picture.
    // A side-effect-free avatar endpoint on rag-server is needed first; until then the
    // bucket write below stays. See RISK NOTES.
    // Upload to Supabase Storage (upsert)
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

    // Build public URL
    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?v=${Date.now()}`

    // Update user metadata with avatar URL
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user_id}`,
      {
        method: 'PUT',
        headers: sbHeaders('application/json'),
        body: JSON.stringify({
          user_metadata: { avatar_url: avatarUrl },
        }),
      }
    )
    if (!updateRes.ok) {
      const err = await updateRes.text()
      return res.status(502).json({ error: 'Failed to update user metadata', detail: err })
    }

    return res.status(200).json({ ok: true, avatar_url: avatarUrl })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
