// POST /api/dashboard/cutscene-action
// { item_id, item_type, action, user_id }
//
// Updates a message row's metadata with action_resolved_at and action_type
// when user interacts with a cutscene overlay item.
//
// Supports actions: 'archive' | 'tell_more' | 'leave_it'

import { extractJwt } from '../_lib/verifyTenant.js'

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require JWT
  const jwt = extractJwt(req)
  if (!jwt) {
    return res.status(401).json({ error: 'JWT required' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { item_id, item_type, action, user_id } = req.body

  // Validation
  if (!item_id || !item_type || !action || !user_id) {
    return res.status(400).json({
      error: 'Missing required fields: item_id, item_type, action, user_id',
    })
  }

  const validActions = ['archive', 'tell_more', 'leave_it']
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action: ${action}` })
  }

  // Only support 'stale_nudge' item type for R1
  if (item_type !== 'stale_nudge') {
    return res.status(400).json({ error: `Unsupported item type: ${item_type}` })
  }

  try {
    // Build metadata update: set action_resolved_at and action_type
    const now = new Date().toISOString()
    const metadata = {
      action_resolved_at: now,
      action_type: action,
    }

    // Prepare PATCH request to messages table
    const patchUrl = `${SUPABASE_URL}/rest/v1/messages?id=eq.${encodeURIComponent(item_id)}&user_id=eq.${encodeURIComponent(user_id)}`

    const patchBody = JSON.stringify({
      metadata,
    })

    const sbRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: patchBody,
    })

    if (!sbRes.ok) {
      const errText = await sbRes.text()
      console.error('Supabase PATCH error:', sbRes.status, errText)
      return res.status(sbRes.status).json({ error: errText })
    }

    const updated = await sbRes.json()

    return res.status(200).json({
      success: true,
      item_id,
      action,
      updated_at: now,
    })
  } catch (err) {
    console.error('Cutscene action error:', err)
    return res.status(500).json({ error: err.message })
  }
}
