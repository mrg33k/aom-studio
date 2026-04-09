// GET /api/dashboard/get-directory-tenants
// Returns the list of active tenants from the directory_tenants table.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SELECT_COLUMNS = 'slug,name,brand_color,vertical,logo_url,description';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/directory_tenants?select=${SELECT_COLUMNS}&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const tenants = await resp.json();
    return res.status(200).json({ tenants });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
