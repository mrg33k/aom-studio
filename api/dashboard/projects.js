// GET /api/dashboard/projects
// Fetch the CALLER'S projects from the Convex project registry, scoped to
// their own world (corner:retire-supabase, 2026-09-03; was the Supabase
// projects table).
//
// Row shape is kept for the callers (Organize tree, Review pickers, Settings):
//   { id, name, slug, client_id, created_at, is_active }
// `id` is the Convex project document id; project-shared, project-access and
// project-invite take that same id.

import { callerWorld, verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  try {
    // TENANT SCOPE (corner:audit cross-tenant leak, 2026-07-21). This endpoint
    // MUST scope to the caller's own world itself. It used to return EVERY
    // tenant's projects to anyone (no auth, no filter), leaking the whole
    // project list into Settings and the Organize/Review pickers. Derive the
    // world from the caller's JWT. A ?client= override is honored ONLY when
    // verifyTenant proves the caller may read it (super-admin / world-admin /
    // shared) so Patrik's world-switcher keeps working without reopening the hole.
    let world;
    const requested = (req.query.client || '').toString().trim().toLowerCase();
    if (requested) {
      await verifyTenant(requested, req); // throws TenantAuthError on denial
      world = requested;
    } else {
      world = await callerWorld(req);
      if (!world) return res.status(401).json({ error: 'auth required' });
    }

    // Only THIS world's projects.
    // corner:corner-ui-cv6 wd40 DEF-4: archived projects are excluded. This
    // endpoint feeds the Organize tree + pickers, and an archived room must
    // disappear there.
    const rows = await convexQuery('projects:list', {
      worldId: world,
      activeOnly: true,
      includeArchived: false,
    });

    let projects = (Array.isArray(rows) ? rows : []).map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      client_id: p.worldSlug || world,
      created_at: new Date(p.createdAt || Date.now()).toISOString(),
      is_active: p.isActive !== false,
    }));
    projects.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

    // LAB-RAIL (2026-08-14 Block 3): filter infra slugs even if is_active leaked true
    const isInfra = (slug) => {
      if (!slug) return false;
      const s = String(slug).toLowerCase();
      return s === 'bridge-smoke' || s.startsWith('lab-') || s.startsWith('qa-') || s.startsWith('smoke-') || s.startsWith('proj-tool-') || s.startsWith('loop-test-');
    };
    projects = projects.filter(p => !isInfra(p.slug));
    return res.status(200).json({ ok: true, projects });
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
