// GET  /api/dashboard/agent-voice?client=CLIENT_ID
//   → { voices: { slug: 'kore', 'project:slug': 'puck', ... } }
// PATCH /api/dashboard/agent-voice  { slug, voice, client_id }
//   → saves voice selection for the given slug (agent or project:slug)

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PREF_KEY = 'agent_voices';

async function getVoices(clientId, headers) {
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

async function saveVoices(clientId, voices, headers) {
  const value = JSON.stringify(voices);
  await fetch(
    `${SUPABASE_URL}/rest/v1/user_preferences?on_conflict=key,client_id`,
    {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: PREF_KEY, client_id: clientId, value, updated_at: new Date().toISOString() }),
    }
  );
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
    const _reqClient = req.query.client && String(req.query.client).trim();
    if (!_reqClient) return res.status(401).json({ error: 'Missing client' });
    let tenant;
    try {
      ({ tenant } = await verifyTenant(_reqClient, req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const voices = await getVoices(tenant, headers);
      return res.status(200).json({ voices });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { slug, voice, client_id } = req.body || {};
    if (!slug || !voice) return res.status(400).json({ error: 'slug and voice required' });
    const _patchClient = client_id && String(client_id).trim();
    if (!_patchClient) return res.status(401).json({ error: 'Missing client' });
    let tenant;
    try {
      ({ tenant } = await verifyTenant(_patchClient, req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const voices = await getVoices(tenant, headers);
      voices[slug] = voice;
      await saveVoices(tenant, voices, headers);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or PATCH only' });
}
