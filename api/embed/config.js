// GET /api/embed/config?id=<embed_id>
//
// Returns the public-safe placement config for a widget. Reads from
// lib/embed-registry.js which checks Supabase first, then falls back to
// api/embed/_embeds.json. New embeds shipped via /api/embed/create are
// available immediately — no redeploy.
//
// Never returns context overlays or secrets — the widget renders with
// surface_name + placement only. Routing (agent / project / mission_slug)
// lives in the registry but is also non-public; chat.js, messages.js, and
// steps.js consume it server-side through the same helper.

import { getEmbed } from '../../lib/embed-registry.js'

// ─── Exact origin + scheme check (TOP-20 #3 #13) ────────────────────────────
function normalizeOrigin(origin) {
  try {
    const u = new URL(String(origin).trim());
    const isLocalhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1' || u.hostname === '[::1]';
    if (u.protocol === 'https:') {
      // ok
    } else if (u.protocol === 'http:' && isLocalhost) {
      // allow http for local dev
    } else {
      return null;
    }
    if (u.pathname !== '/' && u.pathname !== '') return null;
    if (u.search || u.hash) return null;
    return u.origin;
  } catch {
    return null;
  }
}
function isOriginAllowed(origin, allowlist) {
  if (!origin || !Array.isArray(allowlist) || allowlist.length === 0) return false;
  const norm = normalizeOrigin(origin);
  if (!norm) return false;
  for (const allowed of allowlist) {
    const aNorm = normalizeOrigin(allowed);
    if (aNorm && aNorm === norm) return true;
  }
  return false;
}

export default async function handler(req, res) {
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
  const cfg = await getEmbed(id)
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })

  // Exact origin + scheme check: require origin to be an exact, scheme-validated member of allowlist
  if (origin && !isOriginAllowed(origin, cfg.host_allowlist)) {
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

// Backward-compat re-export. Callers should migrate to getEmbed directly.
export { getEmbed }
