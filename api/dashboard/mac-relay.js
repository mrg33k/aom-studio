// POST /api/dashboard/mac-relay
// Writes a user message to Supabase so the Mac listener can pick it up and run claude --continue
// No Anthropic API call. Returns the message id for polling.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function writeToSupabase(role, agent, text, source = 'dashboard', replyTo = '') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  const id = crypto.randomUUID()
  await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id,
      timestamp: new Date().toISOString(),
      role,
      agent,
      source,
      text,
      project: '',
      reply_to: replyTo,
    }),
  })
  return id
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { slug, message } = req.body

  if (!slug || !message) {
    return res.status(400).json({ error: 'slug and message required' })
  }

  try {
    const id = await writeToSupabase('user', slug, message, 'dashboard')
    if (!id) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }
    return res.status(200).json({
      id,
      timestamp: new Date().toISOString(),
      status: 'pending',
    })
  } catch (err) {
    console.error('mac-relay error:', err)
    return res.status(500).json({ error: 'Failed to write to Supabase: ' + err.message })
  }
}

export const config = { maxDuration: 10 }
