// GET  /api/dashboard/room-agent?client=CLIENT_ID
//   → { agents: { 'project:slug': 'gary', ... } }
// PATCH /api/dashboard/room-agent  { slug, agent, client_id }
//   → saves the agent a project/mission room is talking to (slug = 'project:<slug>')
//
// corner:agent-selection. Mirrors agent-model.js exactly (same user_preferences
// storage, same guards), but keyed by ROOM (project:<slug>) → AGENT slug instead
// of room → model. The dashboard composer reads this per room to decide which
// agent a project/mission message is addressed to; when unset the room talks to
// the front desk ('corner'), which is today's behavior. supabase-listener.py
// already routes on the message's `agent` field, so no backend change is needed —
// this preference only changes which slug the composer writes onto the row.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PREF_KEY = 'room_agents';
// The agents a room may be pointed at. 'corner' is the front desk / auto route.
// Keep in sync with DASHBOARD_AGENTS in src/dashboard/cv6next/data/agentTitles.js.
const ALLOWED_AGENTS = new Set([
  'corner',
  'director',
  'bobby',
  'cleo',
  'steffen',
  'gary',
  'elon',
  'rex',
  'jacob',
  'tony',
  'alex',
  'steve',
  'elmo',
  'pixel',
]);

async function getAgents(clientId, headers) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?key=eq.${encodeURIComponent(PREF_KEY)}&client_id=eq.${encodeURIComponent(clientId)}&select=value&limit=1`,
    { headers }
  );
  if (!r.ok) return {};
  const rows = await r.json();
  const raw = rows[0]?.value;
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
}

async function saveAgents(clientId, agents, headers) {
  const value = JSON.stringify(agents);
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?on_conflict=key,client_id`,
    {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: PREF_KEY, client_id: clientId, value, updated_at: new Date().toISOString() }),
    }
  );
  if (!response.ok) throw new Error('Could not save agent preference');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
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
    let tenant;
    try {
      ({ tenant } = await verifyTenant(req.query.client || 'aom', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const agents = await getAgents(tenant, headers);
      return res.status(200).json({ agents });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { slug, agent, client_id } = req.body || {};
    if (!slug || !agent) return res.status(400).json({ error: 'slug and agent required' });
    const normalizedSlug = String(slug).trim();
    if (!normalizedSlug || normalizedSlug.length > 200
        || ['__proto__', 'prototype', 'constructor'].includes(normalizedSlug)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    const normalizedAgent = String(agent).trim().toLowerCase();
    if (!ALLOWED_AGENTS.has(normalizedAgent)) {
      return res.status(400).json({ error: 'Unsupported agent' });
    }
    let tenant;
    try {
      ({ tenant } = await verifyTenant(client_id || 'aom', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const agents = await getAgents(tenant, headers);
      agents[normalizedSlug] = normalizedAgent;
      await saveAgents(tenant, agents, headers);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or PATCH only' });
}
