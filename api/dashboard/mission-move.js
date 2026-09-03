// POST /api/dashboard/mission-move
//
// Moves a mission to another project: it reparents the mission folder on disk
// AND re-files the mission room on Convex so the dashboard tree shows it under
// the new project.
//
// Body: { world, project_slug, mission_slug, new_project_slug, source_path? }
//   world            tenant/world (e.g. "aom")
//   project_slug     current parent project slug
//   mission_slug     bare mission slug (e.g. "hero-section")
//   new_project_slug destination project slug
//
// Disk move runs on the RAG tunnel (Vercel has no disk). The room re-file is
// rooms:move on Convex (rooms:resolveCanonical finds the room first).
//
// corner:retire-supabase (2026-09-03): no Supabase in this file.

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

const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// The destination must be a real project in this world: a registry row or a
// project room. Otherwise the mission would be orphaned.
async function projectExists(world, slug, token) {
  try {
    const row = await convexQuery('projects:lookupBySlug', { slug, worldId: world }, token);
    if (row) return true;
  } catch { /* fall through */ }
  try {
    const room = await convexQuery('rooms:resolveCanonical', { worldSlug: world, kind: 'project', key: slug }, token);
    return !!room;
  } catch { return false; }
}

// Re-file the mission room under the new project.
async function moveMissionRoom(world, projectSlug, missionSlug, newProjectSlug, token) {
  try {
    const room = await convexQuery('rooms:resolveCanonical', { worldSlug: world, kind: 'mission', key: missionSlug, project: projectSlug }, token);
    if (!room) return false;
    const r = await convexMutation('rooms:move', { key: CONVEX_KEY, roomId: String(room._id), project: newProjectSlug }, token);
    return !!(r && r.ok);
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { world, project_slug, mission_slug, new_project_slug, source_path } = req.body || {};
  const _wRaw = world ? String(world).trim() : '';
  if (!_wRaw) return res.status(401).json({ error: 'Missing client' });

  if (!project_slug || !SLUG_RE.test(project_slug)) return res.status(400).json({ error: 'project_slug required' });
  if (!new_project_slug || !SLUG_RE.test(new_project_slug)) return res.status(400).json({ error: 'new_project_slug required' });
  if (!mission_slug || !SLUG_RE.test(mission_slug)) return res.status(400).json({ error: 'mission_slug required' });
  if (project_slug === new_project_slug) return res.status(400).json({ error: 'mission already in that project' });

  let verified;
  try {
    verified = await verifyTenant(_wRaw, req);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status || 403).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }
  const w = verified.tenant;

  // Destination project must be real, or we'd orphan the mission.
  if (!(await projectExists(w, new_project_slug, verified.token))) {
    return res.status(404).json({ error: 'Target project does not exist' });
  }

  // The caller may pass the mission's real registry path (nested missions live
  // at .../missions/<parent>/missions/<leaf>). Validate hard: relative, no
  // traversal, inside corner/users/, a mission folder, leaf = mission_slug.
  let src_rel = `corner/users/${w}/projects/${project_slug}/missions/${mission_slug}`;
  if (typeof source_path === 'string' && source_path.trim()) {
    const sp = source_path.trim().replace(/\/+$/, '');
    const parts = sp.split('/');
    const okPath = !sp.startsWith('/') && !sp.includes('\\') && !parts.includes('..')
      && sp.startsWith(`corner/users/${w}/`) && sp.includes('/missions/')
      && parts[parts.length - 1] === mission_slug;
    if (!okPath) return res.status(400).json({ error: 'invalid source_path' });
    src_rel = sp;
  }
  const dest_path = `corner/users/${w}/projects/${new_project_slug}/missions/${mission_slug}`;

  // 1. Move the folder on disk via the tunnel. A mission with no materialized
  // folder yet (record-only) has nothing on disk; that is NOT a failure.
  let folderMoved = false;
  try {
    const r = await fetch(`${RAG_TUNNEL_URL}/command-deck-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
      body: JSON.stringify({ source_path: src_rel, dest_path }),
    });
    const moveResp = await r.json().catch(() => ({}));
    if (r.ok && moveResp?.ok) {
      folderMoved = true;
    } else if (r.status === 404 && /source mission not found/i.test(moveResp?.error || '')) {
      folderMoved = false; // no folder yet, fall through to the room re-file
    } else {
      return res.status(r.status === 200 ? 500 : r.status).json({ error: moveResp?.error || 'disk move failed' });
    }
  } catch (err) {
    return res.status(502).json({ error: 'tunnel unreachable for move' });
  }

  // 2. Re-file the mission room so the tree shows it under the new project.
  const reKeyed = await moveMissionRoom(w, project_slug, mission_slug, new_project_slug, verified.token);

  return res.status(200).json({
    ok: true,
    mission_slug,
    from_project: project_slug,
    to_project: new_project_slug,
    folder_moved: folderMoved,
    reregistered: reKeyed,
  });
}
