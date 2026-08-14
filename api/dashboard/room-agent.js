// GET  /api/dashboard/room-agent?client=CLIENT_ID
//   → { agents: [{ slug, title, role }], assignments: { roomKey: slug, ... } }
// PATCH /api/dashboard/room-agent  { room, agent, client_id }
//   → assigns which specialist ANSWERS that room (or 'default' to clear).
//
// corner:native-ios R15. Mirrors agent-model.js (same user_preferences
// storage, key `room_agents`). Room keys are canonical bridge slugs:
//   agent:<slug> | project:<slug> | mission:<project>:<mission>
//
// The roster is served LIVE from agent_status — the table the 72h
// agent-upgrade sweep maintains — so clients (web pill, native pill) always
// list the CURRENT agents, never a baked-in copy. Titles ride the
// agentTitles.js doctrine (roles, never persona names).
//
// The room bridge reads the same preference per message
// (scripts/sse-room-bridge.py) and boots/recycles the room session with the
// assigned specialist's identity read from disk at boot — which is what makes
// the assignment take effect in the conversation itself.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { AGENT_TITLES } from '../../src/dashboard/cv6next/data/agentTitles.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PREF_KEY = 'room_agents';
const ROOM_KEY_RE = /^(agent:[a-z0-9_-]+|project:[a-z0-9_-]+|mission:[a-z0-9_-]+:[a-z0-9_-]+)$/;

async function getRoster(clientId, headers) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_status?client_id=eq.${encodeURIComponent(clientId)}` +
    `&type=eq.agent&hidden=eq.false&is_assignable=eq.true&select=slug,name,role,is_owner`,
    { headers }
  );
  if (!r.ok) return [];
  const rows = await r.json();
  return rows
    // is_terminal describes how an agent is served, not whether it is a valid
    // specialist. Elon, Gary, and Rex are terminal-capable and must stay in this
    // picker; only the signed-in human/owner row is not an assignable specialist.
    .filter((a) => !a.is_owner)
    .map((a) => ({
      slug: a.slug,
      // Tenant agents carry their real name in agent_status.name ("Demo EA");
      // the AGENT_TITLES doctrine map only describes the aom roster. Without
      // this preference every tenant surface trusting this endpoint renders
      // the raw role/slug ("EA") — the phone's R19 roster fix reads this field.
      title: (clientId !== 'aom' && a.name) || AGENT_TITLES[a.slug] || a.role || a.slug,
      name: a.name || '',
      role: a.role || '',
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function getAssignments(clientId, headers) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?key=eq.${PREF_KEY}&client_id=eq.${encodeURIComponent(clientId)}&select=value&limit=1`,
    { headers }
  );
  if (!r.ok) return {};
  const rows = await r.json();
  const raw = rows[0]?.value;
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
}

async function saveAssignments(clientId, assignments, headers) {
  const value = JSON.stringify(assignments);
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?on_conflict=key,client_id`,
    {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: PREF_KEY, client_id: clientId, value, updated_at: new Date().toISOString() }),
    }
  );
  if (!response.ok) throw new Error('Could not save room agent assignment');
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
      const [agents, assignments] = await Promise.all([
        getRoster(tenant, headers),
        getAssignments(tenant, headers),
      ]);
      return res.status(200).json({ agents, assignments });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  if (req.method === 'PATCH') {
    const { room, agent } = req.body || {};
    let tenant;
    try {
      ({ tenant } = await verifyTenant(req.body?.client_id || 'aom', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    if (!room || !ROOM_KEY_RE.test(String(room))) {
      return res.status(400).json({ error: 'room must be agent:<slug>, project:<slug>, or mission:<project>:<mission>' });
    }
    if (!agent) return res.status(400).json({ error: 'agent required (a roster slug, or "default" to clear)' });

    try {
      const assignments = await getAssignments(tenant, headers);
      if (agent === 'default') {
        delete assignments[room];
      } else {
        const roster = await getRoster(tenant, headers);
        if (!roster.some((a) => a.slug === agent)) {
          return res.status(400).json({ error: `unknown agent "${agent}" — not in the live roster` });
        }
        assignments[room] = agent;
      }
      await saveAssignments(tenant, assignments, headers);
      return res.status(200).json({ ok: true, assignments });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ error: 'GET or PATCH only' });
}
