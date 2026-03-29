// GET /api/dashboard/poke-agent?agent=elon
// Writes a poke_agent record to Supabase messages table.
// supabase-listener.py picks it up via Realtime and runs:
//   tmux send-keys -t {agent}-relay "check relay" Enter

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  const agent = req.query.agent || (req.body && req.body.agent);
  if (!agent) return res.status(400).json({ error: 'agent required' });

  // Validate slug: lowercase alphanumeric + hyphens only
  if (!/^[a-z][a-z0-9-]*$/.test(agent)) {
    return res.status(400).json({ error: 'invalid agent slug' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const crypto = await import('crypto');
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        agent,
        role: 'system',
        source: 'poke_agent',
        text: `poke ${agent}`,
        client_id: 'aom',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(500).json({ error: err });
    }

    return res.status(200).json({ ok: true, agent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
