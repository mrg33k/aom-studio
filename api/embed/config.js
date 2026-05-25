// GET /api/embed/config?id=<embed_id>
//
// Returns the public-safe placement config for a widget. Hardcoded registry
// for the R0 test page; future rounds move to embed_configs Supabase table.
// Never returns the context_overlay or secrets -- the widget renders with
// surface_name + placement only.

const REGISTRY = {
  emb_sr_website: {
    embed_id: 'emb_sr_website',
    surface_name: 'Space Rising — Website Mission',
    active: true,
    host_allowlist: [
      'https://www.aheadofmarket.com',
      'https://aheadofmarket.com',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    placement: {
      mode: 'inline',
      position: 'centered',
      opening_prompt:
        "Hi — I'm the Space Rising website EA. I know the SRW mission, the 8 pages live at /srw, and what's still open (team photos, sponsor logos, source links, event dates). What are we working on?",
      theme: {
        accent: '#E5451F',
        bg: '#0B0F14',
        label: 'Space Rising — Website',
        font_display: 'Oswald',
      },
    },
    routing: {
      // The row shape /api/embed/chat writes. Mirrors the dashboard's own
      // project-chat send for space-rising:website mission room.
      agent: 'project:space-rising',
      project: 'space-rising',
      mission_slug: 'space-rising:website',
      client_id: 'aom',
    },
  },
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const origin = req.headers.origin || ''

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  const id = (req.query && req.query.id) || ''
  const cfg = REGISTRY[id]
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })

  if (origin && cfg.host_allowlist.indexOf(origin) < 0) {
    return res.status(403).json({ error: 'origin not on allowlist' })
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  if (!cfg.active) return res.status(200).json({ offline: true })

  return res.status(200).json({
    embed_id: cfg.embed_id,
    surface_name: cfg.surface_name,
    placement: cfg.placement,
    offline: false,
  })
}

export { REGISTRY }
