// GET    /api/dashboard/env-vars?scope=project&scope_id=sourcing&client=aom
//        Returns key names + timestamps. NEVER returns values.
// POST   /api/dashboard/env-vars  { scope, scope_id, key, value, client_id }
//        Upserts a key. Creates or updates.
// DELETE /api/dashboard/env-vars  { scope, scope_id, key, client_id }
//        Removes a key.
//
// corner:retire-supabase (2026-09-03): the store is the Convex envVars table
// (envVars:list / set / remove). Two rules the Python side (scripts/lib/
// env_vars.py) must follow when it moves:
//   1. The Convex row has no tenant column, so the tenant is folded into the
//      scope id: scopeId = "<tenant>:<scope_id>".
//   2. Values are encrypted HERE before they reach Convex (AES-GCM with
//      TOKEN_ENC_KEY, api/_lib/oauthCrypto.js). Convex only ever holds the
//      ciphertext; a reader decrypts with the same key.

import { encryptJson } from '../_lib/oauthCrypto.js';

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud';
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined;

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  });
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`);
  const data = await r.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token);
const convexMutation = (path, args, token) => convexCall('mutation', path, args, token);

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status; }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null;
  return null;
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req);
  if (!token) throw new AuthError('sign-in required', 401);
  let who = null;
  try { who = await convexQuery('users:verifyToken', {}, token); } catch { who = null; }
  if (!who || !who.userId) throw new AuthError('invalid session', 401);
  const world = who.world ? String(who.world).toLowerCase() : null;
  let superAdmin = false;
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)); } catch { superAdmin = false; }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token };
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase();
  if (!t) throw new AuthError('tenant required', 400);
  const who = await requireCaller(req);
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true };
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length);
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null;
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false };
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null);
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' };
    if (who.world === t) return { ok: true, tenant: t, ...who };
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403);
}

function scopeIdFor(tenant, scopeId) {
  return `${tenant}:${String(scopeId).trim()}`;
}

function isoOrNull(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: list key names for a scope (never returns values)
  if (req.method === 'GET') {
    const { scope, scope_id, client } = req.query;
    if (!scope || !scope_id) {
      return res.status(400).json({ error: 'scope and scope_id required' });
    }
    let verified;
    try {
      verified = await verifyTenant(client || '', req);
    } catch (err) {
      if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const rows = await convexQuery('envVars:list', { scope: String(scope), scopeId: scopeIdFor(verified.tenant, scope_id) }, verified.token);
      const keys = (Array.isArray(rows) ? rows : []).map(r => ({
        key: r.key,
        created_at: isoOrNull(r.updatedAt),
        updated_at: isoOrNull(r.updatedAt),
      }));
      return res.status(200).json({ keys });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: upsert a key
  if (req.method === 'POST') {
    const { scope, scope_id, key, value, client_id } = req.body || {};
    if (!scope || !scope_id || !key || value === undefined) {
      return res.status(400).json({ error: 'scope, scope_id, key, and value required' });
    }
    if (!['world', 'user', 'project'].includes(scope)) {
      return res.status(400).json({ error: 'scope must be world, user, or project' });
    }
    let verified;
    try {
      verified = await verifyTenant(client_id || '', req);
    } catch (err) {
      if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    let ciphertext;
    try {
      ciphertext = encryptJson({ value: String(value) });
    } catch (err) {
      return res.status(500).json({ error: `cannot encrypt: ${err.message}` });
    }
    try {
      await convexMutation('envVars:set', {
        key: CONVEX_KEY,
        scope: String(scope),
        scopeId: scopeIdFor(verified.tenant, scope_id),
        name: String(key),
        ciphertext,
      }, verified.token);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE: remove a key
  if (req.method === 'DELETE') {
    const { scope, scope_id, key, client_id } = req.body || {};
    if (!scope || !scope_id || !key) {
      return res.status(400).json({ error: 'scope, scope_id, and key required' });
    }
    let verified;
    try {
      verified = await verifyTenant(client_id || '', req);
    } catch (err) {
      if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const result = await convexMutation('envVars:remove', {
        key: CONVEX_KEY,
        scope: String(scope),
        scopeId: scopeIdFor(verified.tenant, scope_id),
        name: String(key),
      }, verified.token);
      return res.status(200).json({ ok: !!(result && result.ok) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'GET, POST, or DELETE only' });
}
