// GET /api/dashboard/preferences?key=hex_positions&client=aom
// POST /api/dashboard/preferences  { key, client_id, value }
// Reads/writes user_preferences table via service role (bypasses RLS).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  if (req.method === 'GET') {
    const { key, client } = req.query;
    if (!key) return res.status(400).json({ error: 'key required' });
    const clientId = client || 'aom';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_preferences?key=eq.${encodeURIComponent(key)}&client_id=eq.${encodeURIComponent(clientId)}&select=value&limit=1`,
        { headers }
      );
      if (!r.ok) return res.status(500).json({ error: 'fetch failed' });
      const rows = await r.json();
      return res.status(200).json({ value: rows[0]?.value || null });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { key, client_id, value } = req.body || {};
    if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });
    const clientId = client_id || 'aom';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_preferences?on_conflict=key,client_id`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ key, client_id: clientId, value, updated_at: new Date().toISOString() }),
        }
      );
      return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or POST only' });
}
