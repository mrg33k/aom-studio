// GET /api/dashboard/sourcing-tenants
// Returns active tenants from directory_tenants for the global /signup chooser.
// Mirrors the query in api/sourcing/tenants.js but scoped to what GlobalSignup.jsx needs.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mcngatprgluexjjcqpkp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/directory_tenants` +
      `?status=eq.active` +
      `&select=id,slug,name,logo_url,brand_color,tagline,vertical,hero_text` +
      `&order=sort_order.asc.nullslast,name.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 404 || errText.includes('does not exist')) {
        return res.status(200).json([]);
      }
      return res.status(resp.status).json({ error: errText });
    }

    const tenants = await resp.json();
    return res.status(200).json(tenants || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
