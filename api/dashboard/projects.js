// GET /api/dashboard/projects
// Fetch user's projects from Supabase.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Fetch all projects; the dashboard will filter by client_id if needed
    const url = `${SUPABASE_URL}/rest/v1/projects?select=id,name,slug,client_id,created_at,updated_at&order=updated_at.desc`;
    const r = await fetch(url, { headers });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const projects = await r.json();
    return res.status(200).json({ ok: true, projects: Array.isArray(projects) ? projects : [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
