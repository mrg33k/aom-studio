// /api/ai-hours/clients
//
// Server-side CRUD for AI Hours clients. Runs without a session on the client
// portal path (possession of an access code proves one row); every admin path
// (full list, insert, session update) is super-admin only, because the rows
// carry each client's secret access code plus name and email.
//
// GET  /api/ai-hours/clients                  -> list all clients (admin)
// GET  /api/ai-hours/clients?access_code=...  -> one client (portal)
// POST /api/ai-hours/clients                  -> insert new client (admin)
// PATCH /api/ai-hours/clients?id=...          -> update current_session (admin)
//
// corner:retire-supabase R3: rows live in the Convex aiHoursClients table.
// The admin page mints the access code in the browser and shows it to the
// facilitator, so that code has to be the one that works: it is stored as the
// row's slug (aiHours:upsertClient by slug), and lookups try the slug first.
// The fields the old table had beyond name/email (current_session,
// granted_by, notes) ride in the row's checklist object.

import { requireSuperAdmin, TenantAuthError, convexQuery, convexMutation } from '../_lib/verifyTenant.js';

async function requireAdmin(req, res) {
  try {
    await requireSuperAdmin(req);
    return true;
  } catch (err) {
    if (err instanceof TenantAuthError) res.status(err.status).json({ ok: false, error: err.message });
    else res.status(500).json({ ok: false, error: 'Auth verification failed' });
    return false;
  }
}

function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

// Convex row -> the shape the pages read.
function legacyClient(row) {
  if (!row) return null;
  const extra = row.checklist && typeof row.checklist === 'object' ? row.checklist : {};
  return {
    id: row.slug,
    convex_id: String(row._id),
    access_code: row.slug,
    alias_code: row.accessCode || null,
    client_name: row.name,
    email: row.email || null,
    current_session: Number.isFinite(Number(extra.current_session)) ? Number(extra.current_session) : 1,
    granted_by: extra.granted_by || 'aom',
    notes: extra.notes || null,
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

async function findClient(code) {
  const bySlug = await convexQuery('aiHours:getClient', { slug: code });
  if (bySlug) return bySlug;
  return await convexQuery('aiHours:getClient', { accessCode: code });
}

export default async function handler(req, res) {
  // GET: fetch clients (all, or single by access_code)
  if (req.method === 'GET') {
    const { access_code } = req.query;
    if (access_code) {
      let row;
      try {
        row = await findClient(normalizeCode(access_code));
      } catch (err) {
        return res.status(502).json({ ok: false, error: String(err?.message || err) });
      }
      if (!row) return res.status(404).json({ ok: false, error: 'Access code not found' });
      return res.status(200).json({ ok: true, client: legacyClient(row) });
    }
    if (!(await requireAdmin(req, res))) return;
    let rows;
    try {
      rows = await convexQuery('aiHours:clients', {});
    } catch (err) {
      return res.status(502).json({ ok: false, error: String(err?.message || err) });
    }
    const clients = (Array.isArray(rows) ? rows : []).map(legacyClient)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return res.status(200).json({ ok: true, clients });
  }

  // POST: insert new client
  if (req.method === 'POST') {
    if (!(await requireAdmin(req, res))) return;
    const { access_code, client_name, email, current_session, granted_by, notes } = req.body || {};
    if (!access_code || !client_name) {
      return res.status(400).json({ ok: false, error: 'access_code and client_name required' });
    }
    const code = normalizeCode(access_code);
    try {
      await convexMutation('aiHours:upsertClient', {
        slug: code,
        name: String(client_name).trim(),
        email: email ? String(email).trim() : undefined,
        checklist: {
          current_session: current_session ?? 1,
          granted_by: granted_by || 'aom',
          notes: notes || null,
        },
      });
      const row = await convexQuery('aiHours:getClient', { slug: code });
      return res.status(200).json({ ok: true, client: legacyClient(row) });
    } catch (err) {
      return res.status(502).json({ ok: false, error: String(err?.message || err) });
    }
  }

  // PATCH: update current_session for a client
  if (req.method === 'PATCH') {
    if (!(await requireAdmin(req, res))) return;
    const { id } = req.query;
    const { current_session } = req.body || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id query param required' });
    }
    if (current_session === undefined) {
      return res.status(400).json({ ok: false, error: 'current_session required' });
    }
    try {
      const row = await findClient(normalizeCode(id));
      if (!row) return res.status(404).json({ ok: false, error: 'Client not found' });
      const extra = row.checklist && typeof row.checklist === 'object' ? row.checklist : {};
      await convexMutation('aiHours:updateChecklist', { slug: row.slug, checked: { ...extra, current_session } });
      const fresh = await convexQuery('aiHours:getClient', { slug: row.slug });
      return res.status(200).json({ ok: true, client: legacyClient(fresh) });
    } catch (err) {
      return res.status(502).json({ ok: false, error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
