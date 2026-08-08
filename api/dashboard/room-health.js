// GET/POST /api/dashboard/room-health
// Tenant-authenticated inspection and narrowly scoped repair for one persisted turn.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'
import { inspectTurnByMessage } from '../_lib/roomSteward.js'

function responseShape(result) {
  const receipt = result?.receipt || null
  const health = result?.health || null
  return {
    found: !!result?.found,
    state: result?.state || health?.state || receipt?.state || 'unknown',
    cause: result?.cause || health?.cause || receipt?.last_error || null,
    repaired: !!result?.repaired,
    action: result?.action || null,
    outcome: result?.outcome || null,
    repair_count: Number(receipt?.repair_count || 0),
    message_id: receipt?.message_id || null,
    room_id: receipt?.room_id || null,
    checked_at: receipt?.last_checked_at || null,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'GET or POST only' })

  const input = req.method === 'POST' ? (req.body || {}) : (req.query || {})
  const requested = String(input.client_id || input.client || '').trim().toLowerCase()
  const messageId = String(input.message_id || '').trim()
  if (!requested || !messageId) return res.status(400).json({ error: 'client_id and message_id required' })
  let clientId
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req))
  } catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message })
    throw error
  }

  try {
    const result = await inspectTurnByMessage({ clientId, messageId, repair: req.method === 'POST' })
    return res.status(200).json(responseShape(result))
  } catch (error) {
    return res.status(500).json({ error: String(error?.message || error) })
  }
}
