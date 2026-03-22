// GET /api/dashboard/agents
// GET /api/dashboard/agents?slug=bobby
// GET /api/dashboard/agents?client=aom
//
// Returns static agent registry from Supabase `agents` table.
// Falls back to `agent_status` (type=agent rows) until migration 008 is applied.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_CLIENT_ID = 'aom';

async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Supabase ${table} error: ${res.status} ${body}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

function normalizeAgent(row) {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role || '',
    color: row.color || '#6B8AB0',
    sprite_path: row.sprite_path || null,
    has_sprite: row.has_sprite !== false,
    is_assignable: row.is_assignable !== false,
    agent_file_path: row.agent_file_path || null,
    description: row.description || '',
    client_id: row.client_id || DEFAULT_CLIENT_ID,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const clientId = (req.query.client && req.query.client.trim())
    ? req.query.client.trim().toLowerCase()
    : DEFAULT_CLIENT_ID;

  const { slug } = req.query;
  const clientFilter = `client_id=eq.${encodeURIComponent(clientId)}`;

  let rows;
  let source;

  // --- Try agents table first (migration 008) ---
  try {
    let params = `order=slug&${clientFilter}`;
    if (slug) params += `&slug=eq.${encodeURIComponent(slug)}`;

    rows = await supabaseGet('agents', params);
    source = 'agents';
  } catch (err) {
    // Table doesn't exist yet -- fall back to agent_status
    if (err.body && err.body.includes('Could not find the table')) {
      try {
        let params = `type=eq.agent&order=slug&${clientFilter}`;
        if (slug) params += `&slug=eq.${encodeURIComponent(slug)}`;

        rows = await supabaseGet('agent_status', params);
        source = 'agent_status_fallback';
      } catch (fallbackErr) {
        return res.status(500).json({ error: fallbackErr.message });
      }
    } else {
      return res.status(500).json({ error: err.message });
    }
  }

  const agents = rows.map(normalizeAgent);

  if (slug) {
    if (agents.length === 0) {
      return res.status(404).json({ error: `Agent '${slug}' not found` });
    }
    return res.status(200).json({ agent: agents[0], source, lastUpdated: new Date().toISOString() });
  }

  return res.status(200).json({
    agents,
    count: agents.length,
    source,
    clientId,
    lastUpdated: new Date().toISOString(),
  });
}
