// GET  /api/dashboard/agent-voice?client=CLIENT_ID
//   -> { voices: { slug: 'kore', 'project:slug': 'puck', ... } }
// PATCH /api/dashboard/agent-voice  { slug, voice, client_id }
//   -> saves voice selection for the given slug (agent or project:slug)
//
// corner:retire-supabase (2026-09-03): one JSON row per world on Convex,
// state:get / state:set with key "agent_voices" (was user_preferences).

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const PREF_KEY = 'agent_voices';

async function getVoices(clientId) {
  const raw = await convexQuery('state:get', { worldId: clientId, key: PREF_KEY });
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : (raw && typeof raw === 'object' ? raw : {}); } catch { return {}; }
}

async function saveVoices(clientId, voices) {
  await convexMutation('state:set', { worldId: clientId, key: PREF_KEY, json: voices, updatedBy: 'agent-voice' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
      const voices = await getVoices(tenant);
      return res.status(200).json({ voices });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { slug, voice, client_id } = req.body || {};
    if (!slug || !voice) return res.status(400).json({ error: 'slug and voice required' });
    const normalizedSlug = String(slug).trim();
    if (!normalizedSlug || normalizedSlug.length > 200
        || ['__proto__', 'prototype', 'constructor'].includes(normalizedSlug)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
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
      const voices = await getVoices(tenant);
      voices[normalizedSlug] = String(voice).trim().slice(0, 100);
      await saveVoices(tenant, voices);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or PATCH only' });
}
