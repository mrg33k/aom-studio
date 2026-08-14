// POST /api/dashboard/mission-move
//
// Moves a mission to another project: it reparents the mission folder on disk
// AND re-registers the mission row in Supabase so the dashboard tree shows it
// under the new project. proj-1.
//
// Body: { world, project_slug, mission_slug, new_project_slug }
//   world            — tenant/world (e.g. "aom")
//   project_slug     — current parent project slug
//   mission_slug     — bare mission slug (e.g. "hero-section")
//   new_project_slug — destination project slug
//
// Disk move runs on the RAG tunnel (Vercel has no disk). Supabase agent_status
// re-key runs here (this layer holds the service role key + tenant gate). Same
// posture as room-autopilot.js / project-file-move.js.
//
// Mission: corner:corner-ui-cv6

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

async function projectExists(slug) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return true; // can't check; let the move proceed
  try {
    const url = `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=slug&limit=1`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

async function rekeyAgentStatus(oldSlug, newSlug) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return true;
  try {
    const url = `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.${encodeURIComponent(oldSlug)}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ slug: newSlug }),
    });
    return r.ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { world, project_slug, mission_slug, new_project_slug, source_path } = req.body || {};
  const _wRaw = world ? String(world).trim() : '';
  if (!_wRaw) return res.status(401).json({ error: 'Missing client' });
  const w = _wRaw;

  if (!project_slug || !SLUG_RE.test(project_slug)) return res.status(400).json({ error: 'project_slug required' });
  if (!new_project_slug || !SLUG_RE.test(new_project_slug)) return res.status(400).json({ error: 'new_project_slug required' });
  if (!mission_slug || !SLUG_RE.test(mission_slug)) return res.status(400).json({ error: 'mission_slug required' });
  if (project_slug === new_project_slug) return res.status(400).json({ error: 'mission already in that project' });

  try {
    await verifyTenant(w, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status || 403).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // Destination project must be real, or we'd orphan the mission.
  if (!(await projectExists(new_project_slug))) {
    return res.status(404).json({ error: 'Target project does not exist' });
  }

  // R-TREE-MENU: the caller may pass the mission's real registry path (nested
  // missions live at .../missions/<parent>/missions/<leaf>, which the naive
  // construction below misses). Validate hard: relative, no traversal, inside
  // corner/users/, a mission folder, and its leaf must be the mission_slug.
  let src_rel = `corner/users/${w}/projects/${project_slug}/missions/${mission_slug}`;
  if (typeof source_path === 'string' && source_path.trim()) {
    const sp = source_path.trim().replace(/\/+$/, '');
    const parts = sp.split('/');
    const okPath = !sp.startsWith('/') && !sp.includes('\\') && !parts.includes('..')
      && sp.startsWith(`corner/users/${w}/`) && sp.includes('/missions/')
      && parts[parts.length - 1] === mission_slug;
    if (!okPath) return res.status(400).json({ error: 'invalid source_path' });
    src_rel = sp;
  }
  const dest_path = `corner/users/${w}/projects/${new_project_slug}/missions/${mission_slug}`;

  // 1. Move the folder on disk via the tunnel. A mission with no materialized
  // folder yet (brand new, record-only) has nothing on disk — that is NOT a
  // failure: we skip the folder move and still re-register it below.
  let folderMoved = false;
  try {
    const r = await fetch(`${RAG_TUNNEL_URL}/command-deck-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
      body: JSON.stringify({ source_path: src_rel, dest_path }),
    });
    const moveResp = await r.json().catch(() => ({}));
    if (r.ok && moveResp?.ok) {
      folderMoved = true;
    } else if (r.status === 404 && /source mission not found/i.test(moveResp?.error || '')) {
      folderMoved = false; // no folder yet — record-only mission, fall through to re-register
    } else {
      return res.status(r.status === 200 ? 500 : r.status).json({ error: moveResp?.error || 'disk move failed' });
    }
  } catch (err) {
    return res.status(502).json({ error: 'tunnel unreachable for move' });
  }

  // 2. Re-key the Supabase mission row so the tree shows it under the new project.
  const oldSlug = `${project_slug}:${mission_slug}`;
  const newSlug = `${new_project_slug}:${mission_slug}`;
  const reKeyed = await rekeyAgentStatus(oldSlug, newSlug);

  return res.status(200).json({
    ok: true,
    mission_slug,
    from_project: project_slug,
    to_project: new_project_slug,
    folder_moved: folderMoved,
    reregistered: reKeyed,
  });
}
