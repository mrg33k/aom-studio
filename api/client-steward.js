// /api/client-steward
//
// ARCHIVED (corner:retire-supabase R4, 2026-09-03).
//
// This endpoint used to serve the queue of prepared client messages from the
// Supabase client_engine tables (prepared_messages, client_parts,
// part_evidence). Those tables are archived to flat files and nothing reads
// them any more. The client-engine mission rebuilds the steward on Convex from
// the v2 sketch (R19+); until that lands there is no queue to serve.
//
// The old board page (public/client-engine/index.html) still calls this URL,
// so it stays as a small, honest stub instead of a 404: every call gets a 410
// with an empty queue and a sentence saying why. No Supabase, no data.
//
// The safety property of the old file is kept by construction: there is no
// transport here and nothing to release.

import { extractJwt } from './_lib/verifyTenant.js'

const ARCHIVED_NOTE =
  'The steward queue was archived when Supabase was retired (2026-09-03). ' +
  'It comes back on Convex with the client-engine Engine tab.'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // Same rule as before: a stranger does not get to make us answer at all.
  if (!extractJwt(req)) {
    return res.status(401).json({ error: 'jwt required', auth: false })
  }

  if (req.method === 'GET') {
    const view = String(req.query.view || '')
    const client = String(req.query.client || '').trim()
    return res.status(410).json({
      ok: false,
      archived: true,
      error: ARCHIVED_NOTE,
      ...(view === 'queue' ? { view: 'queue', clients: [] } : {}),
      ...(client ? { client } : {}),
      state: String(req.query.state || 'waiting'),
      items: [],
      by_person: [],
      counts: { total: 0, waiting: 0, sent: 0, feedback: 0 },
    })
  }

  if (req.method === 'POST') {
    return res.status(410).json({ ok: false, archived: true, error: ARCHIVED_NOTE, transport: 'none' })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
