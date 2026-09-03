// POST /api/dashboard/dismiss-followup  { id, client }
//
// The user releasing a promise. The followup lifecycle deliberately keeps a
// promise open until delivery is PROVEN, which is right for live promises and
// hopeless for orphaned ones: a promise minted by a mechanism that no longer
// exists can never produce delivery evidence, so it sat on screen forever with
// no control anywhere to clear it. That gap is this endpoint (corner:one-corner
// M19, Patrik: "I don't know how to make these go away").
//
// `dismissed` is a USER decision, a third terminal state beside `resolved`
// (proven delivered) and open. Nothing reads `dismissed`; every consumer lists
// open rows only, so a dismissed row simply exits every surface. Never write
// `resolved` here, that would forge delivery evidence into the ledger.
//
// corner:retire-supabase (2026-09-03): the row lives in the Convex followups
// table. The id must be one of the world's open promises (followups:listPending
// scoped to the verified world) before followups:dismiss runs, so one tenant
// can never clear another tenant's promise and a closed row is not rewritten.

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const id = String(body.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id required' });

  let verified;
  try {
    let requested = body.client == null ? '' : String(body.client).trim().toLowerCase();
    if (!requested) {
      const who = await requireCaller(req);
      if (!who.world) throw new AuthError('this account is not in a world; send an explicit world', 400);
      requested = who.world;
    }
    verified = await verifyTenant(requested, req);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    // Only an OPEN promise in THIS world can be dismissed.
    const open = await convexQuery('followups:listPending', { worldId: verified.tenant, limit: 1000 }, verified.token);
    const row = (Array.isArray(open) ? open : []).find(r => String(r._id) === id);
    if (!row) {
      return res.status(404).json({ error: 'no pending promise with that id in this world' });
    }
    const result = await convexMutation('followups:dismiss', { key: CONVEX_KEY, id, userId: String(verified.userId) }, verified.token);
    if (!result || !result.ok) return res.status(502).json({ error: 'dismiss did not apply' });
    return res.status(200).json({ ok: true, id });
  } catch (err) {
    return res.status(502).json({ error: `dismiss did not apply: ${err?.message || err}` });
  }
}
