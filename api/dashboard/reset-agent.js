// POST /api/dashboard/reset-agent?agent=elon
// Hard-resets a super-agent tmux session via the Supabase -> listener ->
// signal-file -> relay-keepalive bridge. The dashboard "Reset Agent" button
// (in the Control tab of the chat settings modal) calls this.
//
// Flow:
//   1. This route writes a row to the Supabase messages table with
//      source = "reset_agent" and agent = <slug>.
//   2. supabase-listener.py picks up the Realtime INSERT and writes a
//      signal file at ~/Library/Application Support/aom-ea/data/context/.reset-request-{agent}.
//   3. relay-keepalive.py sees the signal file on its next 3s tick and
//      runs force_reset_session(): tmux kill-session + new-session + claude.
//
// Allowlist enforced server-side: only elon and gary. This matches the
// agents that relay-keepalive owns.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_AGENTS = new Set(['elon', 'gary']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'GET or POST only' });
  }

  const agent = (req.query.agent || (req.body && req.body.agent) || '').toString().trim().toLowerCase();
  if (!agent) return res.status(400).json({ error: 'agent required' });
  if (!ALLOWED_AGENTS.has(agent)) {
    return res.status(400).json({ error: 'agent not in reset allowlist' });
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
        source: 'reset_agent',
        text: agent,
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
