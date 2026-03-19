// GET  /api/dashboard/supabase-messages?agent={slug}&limit=100
// POST /api/dashboard/supabase-messages  { agent, text, role, source, status }
//
// Server-side Supabase proxy. Uses service role key for writes.
// Client uses anon key for realtime subscriptions directly.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // ---- GET: load chat history for an agent --------------------------------
  if (req.method === 'GET') {
    const { agent, limit = 100 } = req.query
    if (!agent) return res.status(400).json({ error: 'agent required' })

    const url = `${SUPABASE_URL}/rest/v1/messages?agent=eq.${encodeURIComponent(agent)}&order=timestamp.desc&limit=${limit}`
    const sbRes = await fetch(url, { headers: supabaseHeaders() })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    const messages = await sbRes.json()
    // Reverse so oldest first (fetched desc to get the LATEST N, display asc)
    messages.reverse()
    return res.status(200).json({ messages })
  }

  // ---- POST: write a new message (user send from dashboard) ---------------
  if (req.method === 'POST') {
    const { agent, text, role = 'user', source = 'corner-dashboard' } = req.body || {}
    if (!agent || !text) return res.status(400).json({ error: 'agent and text required' })

    const payload = {
      agent,
      role,
      text: text.trim(),
      source,
    }

    const url = `${SUPABASE_URL}/rest/v1/messages`
    const sbRes = await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify(payload),
    })

    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }

    const inserted = await sbRes.json()
    return res.status(200).json({ ok: true, message: inserted[0] || payload })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
