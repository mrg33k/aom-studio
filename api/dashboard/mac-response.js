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

  const { since, agent } = req.query

  try {
    const headers = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: 'application/json',
    }

    // Primary: look for response with reply_to matching our message id
    const url1 = `${SUPABASE_URL}/rest/v1/messages?reply_to=eq.${encodeURIComponent(id)}&role=eq.assistant&order=timestamp.asc&limit=1`
    const r1 = await fetch(url1, { headers })
    if (r1.ok) {
      const rows = await r1.json()
      if (Array.isArray(rows) && rows.length > 0) {
        return res.status(200).json({ found: true, text: rows[0].text || '', timestamp: rows[0].timestamp || '' })
      }
    }

    // Fallback: any recent assistant message after 'since' timestamp (when terminal handles via relay)
    if (since && agent) {
      const url2 = `${SUPABASE_URL}/rest/v1/messages?role=eq.assistant&agent=eq.${encodeURIComponent(agent)}&timestamp=gt.${encodeURIComponent(since)}&order=timestamp.asc&limit=1`
      const r2 = await fetch(url2, { headers })
      if (r2.ok) {
        const rows = await r2.json()
        if (Array.isArray(rows) && rows.length > 0) {
          return res.status(200).json({ found: true, text: rows[0].text || '', timestamp: rows[0].timestamp || '' })
        }
      }
    }

    return res.status(200).json({ found: false })
  } catch (err) {
    console.error('mac-response error:', err)
    return res.status(500).json({ error: 'Query failed: ' + err.message })
  }
}

export const config = { maxDuration: 10 }
