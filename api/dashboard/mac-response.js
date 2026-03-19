// GET /api/dashboard/mac-response?id={msgId}
// Polls Supabase for an assistant message where reply_to = msgId
// Returns { found: false } if nothing yet, or { found: true, text, timestamp } when the Mac has responded

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'id query param required' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/messages?reply_to=eq.${encodeURIComponent(id)}&role=eq.assistant&order=timestamp.asc&limit=1`
    const supaRes = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: 'application/json',
      },
    })

    if (!supaRes.ok) {
      const errText = await supaRes.text()
      console.error('mac-response Supabase error:', supaRes.status, errText)
      return res.status(500).json({ error: 'Supabase query failed' })
    }

    const rows = await supaRes.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ found: false })
    }

    const row = rows[0]
    return res.status(200).json({
      found: true,
      text: row.text || '',
      timestamp: row.timestamp || new Date().toISOString(),
    })
  } catch (err) {
    console.error('mac-response error:', err)
    return res.status(500).json({ error: 'Query failed: ' + err.message })
  }
}

export const config = { maxDuration: 10 }
