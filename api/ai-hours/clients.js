// /api/ai-hours/clients
//
// Server-side CRUD for ai_hours_clients using the service role key.
// This runs WITHOUT requiring a Supabase auth session on the client —
// the session isolation fix routes all DB writes through here instead
// of calling supabase.from('ai_hours_clients') client-side.
//
// GET  /api/ai-hours/clients         → list all clients
// POST /api/ai-hours/clients         → insert new client
// PATCH /api/ai-hours/clients?id=... → update current_session

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supa(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ ok: false, error: 'Service unavailable' });
  }

  // GET — fetch all clients
  if (req.method === 'GET') {
    const r = await supa('ai_hours_clients?select=*&order=created_at.desc');
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok: false, error: err });
    }
    const data = await r.json();
    return res.status(200).json({ ok: true, clients: data });
  }

  // POST — insert new client
  if (req.method === 'POST') {
    const { access_code, client_name, email, current_session, granted_by, notes } = req.body || {};
    if (!access_code || !client_name) {
      return res.status(400).json({ ok: false, error: 'access_code and client_name required' });
    }
    const r = await supa('ai_hours_clients', {
      method: 'POST',
      body: JSON.stringify({
        access_code,
        client_name,
        email: email || null,
        current_session: current_session ?? 1,
        granted_by: granted_by || 'aom',
        notes: notes || null,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok: false, error: err });
    }
    const data = await r.json();
    const row = Array.isArray(data) ? data[0] : data;
    return res.status(200).json({ ok: true, client: row });
  }

  // PATCH — update current_session for a client
  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { current_session } = req.body || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id query param required' });
    }
    if (current_session === undefined) {
      return res.status(400).json({ ok: false, error: 'current_session required' });
    }
    const r = await supa(`ai_hours_clients?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ current_session }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok: false, error: err });
    }
    const data = await r.json();
    const row = Array.isArray(data) ? data[0] : data;
    return res.status(200).json({ ok: true, client: row });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
