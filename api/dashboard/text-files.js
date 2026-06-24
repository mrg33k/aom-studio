// GET /api/dashboard/text-files
// Fetch user's text files from Supabase.

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
    // Fetch all text files; dashboard filters by project_id if needed
    const url = `${SUPABASE_URL}/rest/v1/text_files?select=id,name,project_id,content,created_at,updated_at&order=updated_at.desc&limit=500`;
    const r = await fetch(url, { headers });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const files = await r.json();
    return res.status(200).json({ ok: true, files: Array.isArray(files) ? files : [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
