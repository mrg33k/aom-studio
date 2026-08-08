// Vercel Cron: inspect recent unhealthy room turns and apply only allowlisted,
// exact-turn recovery from api/_lib/roomSteward.js.

import { runRoomSteward } from '../_lib/roomSteward.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null
  if (!expected || req.headers.authorization !== expected) return res.status(401).json({ error: 'unauthorized' })
  try {
    const summary = await runRoomSteward({ limit: 60 })
    return res.status(200).json({ ok: true, ...summary, at: new Date().toISOString() })
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) })
  }
}
