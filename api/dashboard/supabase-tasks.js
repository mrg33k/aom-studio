// POST /api/dashboard/supabase-tasks  { agent, text, project, status }
// Creates a new task row in the Supabase tasks table.

import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { agent, text, project, status = 'todo' } = req.body || {}
  if (!text) return res.status(400).json({ error: 'text required' })

  const payload = {
    id: crypto.randomUUID(),
    agent: agent || 'elon',
    text: text.trim(),
    project: project || null,
    status,
  }

  const url = `${SUPABASE_URL}/rest/v1/tasks`
  const sbRes = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  if (!sbRes.ok) {
    const err = await sbRes.text()
    return res.status(sbRes.status).json({ error: err })
  }

  const inserted = await sbRes.json()
  return res.status(200).json({ ok: true, task: inserted[0] || payload })
}
