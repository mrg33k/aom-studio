// /api/client-parts: the old Client Engine board's read/write path.
//
// ARCHIVED (corner:retire-supabase R4, 2026-09-03). The board's tables
// (client_engine_parts, client_engine_settings, client_engine_evidence and
// friends) lived on Supabase, which is retired. Nothing is migrated from the
// old board: the Engine tab is rebuilt fresh on Convex from the v2 sketch in
// the client-engine mission (R19 and on). Until that lands, every request
// here answers 410 Gone with a plain note, so the two static pages under
// public/client-engine/ show a clear message instead of hanging on a 500.
//
// withBlockCounts stays exported because api/client-steward.js imports it and
// the unit tests build its three shapes in memory. It is pure: no database.

// A part's `blocks` array lists the part keys it holds up. Count them, but
// only the ones that name a real part, once each, never the part itself:
//   a DANGLING key   names no part. A typo, not something being held up.
//   a DUPLICATE key  is one dependency written twice, not two dependencies.
//   a SELF reference is a part blocking itself.
// Keyed by client too, so the count is right on the cross-client day view
// where two clients own a part_key of the same name.
export function withBlockCounts(parts) {
  const byKey = new Map()
  for (const p of parts) byKey.set(`${p.project_slug} ${p.part_key}`, p)
  return parts.map((p) => {
    const keys = Array.isArray(p.blocks) ? p.blocks : []
    const resolved = [...new Set(keys)]
      .filter((k) => k !== p.part_key)
      .map((k) => byKey.get(`${p.project_slug} ${k}`))
      .filter(Boolean)
    return {
      ...p,
      blocks_count: resolved.length,
      blocks_open_count: resolved.filter((d) => d.state !== 'completed').length,
    }
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  return res.status(410).json({
    ok: false,
    archived: true,
    error: 'The Client Engine board has been archived. The Engine tab is being rebuilt on Convex; nothing from the old board is served here any more.',
    parts: [],
    evidence: {},
    settings: null,
  })
}
