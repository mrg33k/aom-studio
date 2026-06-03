// /api/ai-hours/checklist
//
// Stores and retrieves client checklist progress per session.
// All DB operations use the service role key — no client auth required.
//
// GET  /api/ai-hours/checklist?access_code=XXX&session=N
//   → returns { ok: true, checked_items: [0, 2, 3] }
//
// POST /api/ai-hours/checklist
//   body: { access_code, session_number, checked_items: [0, 1, 2] }
//   → upserts the row, returns { ok: true }

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

  // GET — fetch checked items for a client/session
  if (req.method === 'GET') {
    const { access_code, session } = req.query;
    if (!access_code || !session) {
      return res.status(400).json({ ok: false, error: 'access_code and session required' });
    }
    const encoded = encodeURIComponent(access_code.trim().toUpperCase());
    const r = await supa(
      `ai_hours_progress?select=checked_items&access_code=eq.${encoded}&session_number=eq.${session}`
    );
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok: false, error: err });
    }
    const data = await r.json();
    const row = data && data.length > 0 ? data[0] : null;
    return res.status(200).json({ ok: true, checked_items: row ? row.checked_items : [] });
  }

  // POST — upsert checked items
  if (req.method === 'POST') {
    const { access_code, session_number, checked_items } = req.body || {};
    if (!access_code || session_number === undefined) {
      return res.status(400).json({ ok: false, error: 'access_code and session_number required' });
    }
    const normalizedCode = access_code.trim().toUpperCase();
    const r = await supa('ai_hours_progress', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        access_code: normalizedCode,
        session_number,
        checked_items: checked_items || [],
        updated_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ ok: false, error: err });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
