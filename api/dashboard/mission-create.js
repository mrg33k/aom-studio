// POST /api/dashboard/mission-create
//
// corner:corner-ui-cv6 R-TREE-MENU-2 — "New subfolder" on the tree's
// right-click menu. Scaffolds a REAL mission home on disk via the RAG tunnel
// (canonical 6-file stub set + synchronous live-registry regen), so the new
// subfolder appears in the tree on the caller's refetch and is a first-class
// room from birth (unlike the drawer's record-only agent_status missions).
//
// Body: { world, parent_path, slug, name }
//   world       — tenant (e.g. "aom")
//   parent_path — AOM-EA-relative disk path of the parent: 'corner' (platform
//                 missions root), a project home corner/users/<w>/projects/<p>,
//                 or a mission home (creates a NESTED sub-mission).
//   slug        — new folder slug, lowercase-hyphen
//   name        — display name typed by the user

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { world, parent_path, slug, name } = req.body || {};
  const _wRaw = world ? String(world).trim() : '';
  if (!_wRaw) return res.status(401).json({ error: 'Missing client' });
  const w = _wRaw.toLowerCase();

  if (!slug || !SLUG_RE.test(slug) || slug.length > 50) {
    return res.status(400).json({ error: 'slug must be lowercase letters/numbers/hyphens, max 50' });
  }
  const parent = String(parent_path || '').trim().replace(/\/+$/, '');
  if (!parent || parent.startsWith('/') || parent.includes('..') || parent.includes('\\')) {
    return res.status(400).json({ error: 'parent_path required (relative, no traversal)' });
  }
  // Tenant fence: users create inside their own world; the platform tree
  // (corner, corner/missions/...) belongs to the aom super-admin world.
  const inOwnWorld = parent.startsWith(`corner/users/${w}/`);
  const inPlatform = (parent === 'corner' || parent.startsWith('corner/missions/')) && w === 'aom';
  if (!inOwnWorld && !inPlatform) {
    return res.status(403).json({ error: 'parent_path outside your world' });
  }

  try {
    await verifyTenant(w, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status || 403).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const r = await fetch(`${RAG_TUNNEL_URL}/mission-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
      body: JSON.stringify({ parent_path: parent, slug, name: (name || '').trim() }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      return res.status(r.status === 200 ? 500 : r.status).json({ error: j?.error || 'scaffold failed' });
    }
    return res.status(200).json({ ok: true, path: j.path, slug });
  } catch {
    return res.status(502).json({ error: 'tunnel unreachable for create' });
  }
}
