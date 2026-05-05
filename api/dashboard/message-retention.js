// PATCH /api/dashboard/message-retention?id=<msg_id>&retention=<keep|prune|null>
// Updates the retention flag on a message (R75-d3).
// Only the message sender can modify their own retention flag.

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function dbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function getUserIdFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: authHeader,
      },
    })
    if (!r.ok) return null
    const user = await r.json()
    return user.id || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { id, retention } = req.query
  const authHeader = req.headers.authorization

  if (!id) return res.status(400).json({ error: 'Missing id' })
  if (!['keep', 'prune', 'null'].includes(String(retention))) {
    return res.status(400).json({ error: 'Invalid retention value' })
  }

  // Get current user from auth token
  const userId = await getUserIdFromAuth(authHeader)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Fetch message to verify ownership
    const msgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(id)}&select=id,user_id`,
      { headers: dbHeaders() }
    )
    if (!msgRes.ok) return res.status(404).json({ error: 'Message not found' })

    const msgs = await msgRes.json()
    if (!Array.isArray(msgs) || msgs.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }

    const msg = msgs[0]
    if (msg.user_id !== userId) {
      return res.status(403).json({ error: 'Not the message owner' })
    }

    // Update retention flag
    const retentionVal = String(retention) === 'null' ? null : String(retention)
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: dbHeaders(),
        body: JSON.stringify({ retention: retentionVal }),
      }
    )

    if (!updateRes.ok) {
      const err = await updateRes.text()
      return res.status(500).json({ error: 'Failed to update retention', details: err })
    }

    return res.status(200).json({ success: true, id, retention: retentionVal })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
