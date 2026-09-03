// GET /api/dashboard/project-access?project_id=xxx&world_id=<caller world>
// POST /api/dashboard/project-access (invite or update role)
// DELETE /api/dashboard/project-access?id=xxx&world_id=<caller world> (remove member)
//
// R75-d4: Frontend UI for shared-room member management.
// Requires JWT (via verifyTenant) to gate who can manage access.
//
// corner:retire-supabase (2026-09-03): grants live in the Convex projectAccess
// table (projects:access / grantAccess / revokeAccess). Was the Supabase
// project_access table. Grants are WORLD-level: `client_id` on a member row is
// the granted world's slug. An invite may name a world slug or a person's
// email; an email resolves to that person's world first.
//
// Ownership rule (Patrik 2026-07-27): ONE world holds a project and shares it
// outward. Only the holder world may grant, change or revoke access, so every
// write checks the verified world holds the project.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';

// The UI speaks member | read_only; the grant table stores editor | viewer.
const ROLE_TO_GRANT = { member: 'editor', read_only: 'viewer' };
const GRANT_TO_ROLE = { editor: 'member', viewer: 'read_only' };

function memberRow(grant) {
  return {
    id: grant._id,
    project_id: grant.projectId,
    client_id: grant.worldSlug || null,
    world_name: grant.worldName || null,
    role: GRANT_TO_ROLE[grant.role] || grant.role || 'member',
    created_at: new Date(grant.createdAt || Date.now()).toISOString(),
  };
}

// The project row when the verified world holds it, else null.
async function heldProject(projectId, tenant) {
  const rows = await convexQuery('projects:list', { worldId: tenant, includeArchived: true });
  return (Array.isArray(rows) ? rows : []).find((p) => String(p._id) === String(projectId)) || null;
}

// A person's home world: the shared one they belong to, never the personal
// user-* fallback when anything better exists.
async function worldForEmail(email) {
  const user = await convexQuery('users:getByEmail', { email: String(email).trim().toLowerCase() });
  if (!user?._id) return null;
  const worlds = await convexQuery('users:worldsFor', { userId: user._id });
  const list = Array.isArray(worlds) ? worlds : [];
  const shared = list.find((w) => w.slug && !String(w.slug).startsWith('user-'));
  return (shared || list[0])?.slug || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET: List members for a shared room (by project_id)
    if (req.method === 'GET') {
      const { project_id, world_id } = req.query;
      if (!project_id) return res.status(400).json({ error: 'project_id required' });
      if (!world_id) return res.status(400).json({ error: 'world_id required' });

      let verified;
      try {
        verified = await verifyTenant(world_id, req);
      } catch (err) {
        if (err instanceof TenantAuthError) {
          return res.status(err.status || 403).json({ error: err.message });
        }
        throw err;
      }

      if (!(await heldProject(project_id, verified.tenant))) {
        return res.status(403).json({ error: 'only the world that holds this project can list its access' });
      }

      const grants = await convexQuery('projects:access', { projectId: project_id });
      return res.status(200).json({ members: (Array.isArray(grants) ? grants : []).map(memberRow) });
    }

    // POST: Invite new member or update existing member's role
    if (req.method === 'POST') {
      const { project_id, client_id, role, world_id } = req.body || {};

      if (!project_id) return res.status(400).json({ error: 'project_id required' });
      if (!client_id) return res.status(400).json({ error: 'client_id required' });
      if (!role) return res.status(400).json({ error: 'role required' });
      if (!['member', 'read_only'].includes(role)) {
        return res.status(400).json({ error: 'role must be member or read_only' });
      }
      if (!world_id) return res.status(400).json({ error: 'world_id required' });

      let verified;
      try {
        verified = await verifyTenant(world_id, req);
      } catch (err) {
        if (err instanceof TenantAuthError) {
          return res.status(err.status || 403).json({ error: err.message });
        }
        throw err;
      }

      if (!(await heldProject(project_id, verified.tenant))) {
        return res.status(403).json({ error: 'only the world that holds this project can share it' });
      }

      // The grant target: a world slug, or a person's email resolved to their world.
      const raw = String(client_id).trim().toLowerCase();
      const targetWorld = raw.includes('@') ? await worldForEmail(raw) : raw;
      if (!targetWorld) {
        return res.status(404).json({ error: 'No Corner account found for that email.' });
      }
      if (targetWorld === verified.tenant) {
        return res.status(400).json({ error: 'That world already holds this project.' });
      }

      const before = await convexQuery('projects:access', { projectId: project_id });
      const existing = (Array.isArray(before) ? before : []).find((g) => g.worldSlug === targetWorld);

      const grantId = await convexMutation('projects:grantAccess', {
        projectId: project_id,
        worldId: targetWorld,
        role: ROLE_TO_GRANT[role],
      });

      const after = await convexQuery('projects:access', { projectId: project_id });
      const grant = (Array.isArray(after) ? after : []).find((g) => String(g._id) === String(grantId))
        || { _id: grantId, projectId: project_id, worldSlug: targetWorld, role: ROLE_TO_GRANT[role], createdAt: Date.now() };
      return res.status(existing ? 200 : 201).json({ ok: true, member: memberRow(grant) });
    }

    // DELETE: Remove a member
    if (req.method === 'DELETE') {
      const { id, world_id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      if (!world_id) return res.status(400).json({ error: 'world_id required' });

      let verified;
      try {
        verified = await verifyTenant(world_id, req);
      } catch (err) {
        if (err instanceof TenantAuthError) {
          return res.status(err.status || 403).json({ error: err.message });
        }
        throw err;
      }

      // The grant must sit on a project the verified world holds. Scan the
      // holder's own projects for it; a grant on anyone else's project is not
      // this caller's to revoke.
      const held = await convexQuery('projects:list', { worldId: verified.tenant, includeArchived: true });
      let found = false;
      for (const p of (Array.isArray(held) ? held : [])) {
        const grants = await convexQuery('projects:access', { projectId: p._id });
        if ((Array.isArray(grants) ? grants : []).some((g) => String(g._id) === String(id))) { found = true; break; }
      }
      if (!found) return res.status(404).json({ error: 'access row not found in your projects' });

      const out = await convexMutation('projects:revokeAccess', { id });
      if (!out?.ok) return res.status(404).json({ error: 'access row not found' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('project-access error:', err);
    return res.status(500).json({ error: err.message });
  }
}
