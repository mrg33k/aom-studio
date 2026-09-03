// GET  /api/dashboard/agent-model?client=CLIENT_ID
//   -> { models: { slug: 'default', 'project:slug': 'gemini-3.5-flash', ... } }
// PATCH /api/dashboard/agent-model  { slug, model, client_id }
//   -> saves model selection for the given slug (agent or project:slug)
//
// corner:gemini-workers R3. Mirrors agent-voice.js (same storage). The bridge
// daemon reads this preference per message
// (scripts/bridge-daemon.py::resolve_model_preference) and routes the turn:
// claude aliases ride the normal pool; gemini-* values run the whole turn
// through the Gemini CLI lane. Adding a new model = add it to MODEL_OPTIONS
// in the dashboard UI + (for non-claude providers) a lane in the daemon.
//
// corner:retire-supabase (2026-09-03): the map is one JSON row per WORLD on
// Convex, state:get / state:set with key "agent_models". It was one
// user_preferences row per world before, and it stays per world (not per
// person) because the bridge daemon reads it with no user in hand.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const PREF_KEY = 'agent_models';
import modelsJson from '../../src/dashboard/data/models.json' with { type: 'json' }
const ALLOWED_MODELS = new Set(modelsJson.map(m => m.id));

async function getModels(clientId) {
  const raw = await convexQuery('state:get', { worldId: clientId, key: PREF_KEY });
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : (raw && typeof raw === 'object' ? raw : {}); } catch { return {}; }
}

async function saveModels(clientId, models) {
  await convexMutation('state:set', { worldId: clientId, key: PREF_KEY, json: models, updatedBy: 'agent-model' });
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
      const models = await getModels(tenant);
      return res.status(200).json({ models });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { slug, model, client_id } = req.body || {};
    if (!slug || !model) return res.status(400).json({ error: 'slug and model required' });
    const normalizedSlug = String(slug).trim();
    if (!normalizedSlug || normalizedSlug.length > 200
        || ['__proto__', 'prototype', 'constructor'].includes(normalizedSlug)) {
      return res.status(400).json({ error: 'Invalid room' });
    }
    if (!ALLOWED_MODELS.has(String(model).trim().toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported model' });
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
      const models = await getModels(tenant);
      models[normalizedSlug] = String(model).trim().toLowerCase();
      await saveModels(tenant, models);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET or PATCH only' });
}
