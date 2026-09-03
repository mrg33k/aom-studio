// GET /api/dashboard/get-directory-tenants
// Returns the curated list of public tenants for the signup page.
//
// PUBLIC BY DESIGN (corner:tenant-isolation R1, audit defect 8, accepted). This
// is consumed PRE-AUTH by the signup page (src/pages/SignupPage.jsx), which has
// no session yet, so it cannot require a token. It returns only curated public
// marketing metadata (slug, name, brand_color, vertical, logo_url, description),
// never private world data.
//
// corner:retire-supabase (2026-09-03): the old directory_tenants table is now
// one keyed JSON row on Convex: state kind "directory_tenants", scopeId
// "public", value { tenants: [...] }. Reads are open, so no key is needed.
// To edit the list: state:put {kind:"directory_tenants", scopeId:"public",
// value:{tenants:[{slug,name,brand_color,vertical,logo_url,description}]}}.
// An empty list means nobody has written that row yet.

const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud';

async function convexQuery(path, args) {
  const r = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  });
  if (!r.ok) throw new Error(`convex query ${path}: HTTP ${r.status}`);
  const data = await r.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex query ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}

const PUBLIC_FIELDS = ['slug', 'name', 'brand_color', 'vertical', 'logo_url', 'description'];

function publicSlice(row) {
  const out = {};
  for (const k of PUBLIC_FIELDS) out[k] = row && row[k] != null ? row[k] : null;
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  try {
    const row = await convexQuery('state:get', { kind: 'directory_tenants', scopeId: 'public' });
    const list = Array.isArray(row?.value?.tenants) ? row.value.tenants : (Array.isArray(row?.value) ? row.value : []);
    const tenants = list
      .filter(t => t && t.slug && t.name && t.active !== false)
      .map(publicSlice)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return res.status(200).json({ tenants });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
