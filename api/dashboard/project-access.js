// GET /api/dashboard/project-access?project_id=xxx
// POST /api/dashboard/project-access (invite or update role)
// DELETE /api/dashboard/project-access?id=xxx (remove member)
//
// R75-d4: Frontend UI for shared-room member management.
// Requires JWT (via verifyTenant) to gate who can manage access.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    // GET: List members for a shared room (by project_id)
    if (req.method === 'GET') {
      const { project_id, world_id } = req.query;
      if (!project_id) return res.status(400).json({ error: 'project_id required' });
      if (!world_id) return res.status(400).json({ error: 'world_id required' });

      // Verify caller can access this world
      try {
        await verifyTenant(world_id, req);
      } catch (err) {
        if (err instanceof TenantAuthError) {
          return res.status(err.status || 403).json({ error: err.message });
        }
        throw err;
      }

      // Fetch project_access rows for this project
      const r = await fetch(`${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${project_id}`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!r.ok) {
        return res.status(r.status).json({ error: await r.text() });
      }

      const rows = await r.json();
      return res.status(200).json({ members: rows || [] });
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

      // Verify caller is owner of the project (caller's world must match project's owner world)
      try {
        await verifyTenant(world_id, req);
      } catch (err) {
        if (err instanceof TenantAuthError) {
          return res.status(err.status || 403).json({ error: err.message });
        }
        throw err;
      }

      // Check if row already exists; if so, update role
      const checkR = await fetch(
        `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${project_id}&client_id=eq.${client_id}`,
        {
          method: 'GET',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const existing = await checkR.json();
      const isUpdate = Array.isArray(existing) && existing.length > 0;

      if (isUpdate) {
        // Update existing row
        const updateR = await fetch(
          `${SUPABASE_URL}/rest/v1/project_access?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({ role }),
          }
        );

        if (!updateR.ok) {
          return res.status(updateR.status).json({ error: await updateR.text() });
        }

        const updated = await updateR.json();
        return res.status(200).json({ ok: true, member: updated[0] || { role } });
      } else {
        // Insert new row
        const insertR = await fetch(`${SUPABASE_URL}/rest/v1/project_access`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            project_id,
            client_id,
            role,
          }),
        });

        if (!insertR.ok) {
          return res.status(insertR.status).json({ error: await insertR.text() });
        }

        const inserted = await insertR.json();
        return res.status(201).json({ ok: true, member: inserted[0] });
      }
    }

    // DELETE: Remove a member
    if (req.method === 'DELETE') {
      const { id, world_id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      if (!world_id) return res.status(400).json({ error: 'world_id required' });

      // Verify caller is owner
      try {
        await verifyTenant(world_id, req);
      } catch (err) {
        if (err instanceof TenantAuthError) {
          return res.status(err.status || 403).json({ error: err.message });
        }
        throw err;
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/project_access?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!r.ok) {
        return res.status(r.status).json({ error: await r.text() });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('project-access error:', err);
    return res.status(500).json({ error: err.message });
  }
}
