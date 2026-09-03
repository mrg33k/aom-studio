// POST /api/dashboard/create-project-task
// R21c. Server-side task creation scoped to a project.
//
// Body: { text, projectSlug, clientId?, mission_slug? }
// Returns: { ok: true, task: { id, title, status, project } }
//
// corner:retire-supabase (2026-09-03): the row now lands on the Convex task
// queue (tasks:queue) and the mission warning on tasks:logEvent. The repo path
// comes from projects:lookupBySlug. No Supabase anywhere in this file.
//
// AUTH (corner:identity-attribution, 2026-07-27). The row this endpoint writes
// is status='queued', and scripts/task-runner.sh claims queued rows and runs
// their free text as the brief of a fresh Claude Code session on Patrik's Mac.
// Unauthenticated that is remote code execution from the open internet. So:
//   - a valid session is required and must pass verifyTenant() for the world,
//   - `created_by` comes from the session, never from the body,
//   - CORS is the dashboard origins, not `*`.

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

// May this tenant put work under `slug`? The holder world and any world with a
// grant pass. A project with no registry row is admitted when the tenant
// already has a room for it. Same rule every message writer applies.
async function authorizeTaskProject({ verified, projectSlug }) {
  if (verified.superAdmin) return { ok: true, reason: 'super-admin' };
  const tenant = verified.tenant;
  const access = await convexQuery('projects:hasAccess', { slug: projectSlug, worldId: tenant }, verified.token).catch(() => null);
  if (access && access.ok) return { ok: true, reason: access.role };
  const project = await convexQuery('projects:lookupBySlug', { slug: projectSlug }, verified.token).catch(() => null);
  if (project) return { ok: false, reason: `project "${projectSlug}" belongs to world "${project.ownerWorld}"` };
  const rooms = await convexQuery('rooms:listRooms', { worldId: tenant }, verified.token).catch(() => []);
  const hit = (Array.isArray(rooms) ? rooms : []).some(r => String(r.project || '').toLowerCase() === projectSlug);
  if (hit) return { ok: true, reason: 'unregistered-project' };
  return { ok: false, reason: `world "${tenant}" has no project or room called "${projectSlug}"` };
}

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function cleanTitle(raw) {
  const s = (raw || '').trim().replace(/\s+/g, ' ');
  if (!s) return 'Untitled task';
  return s.length > 140 ? s.slice(0, 137) + '...' : s;
}

// Fire-and-forget: log mission_first_warn to the events ledger.
async function _logMissionWarnEvent({ project, source }) {
  const now = new Date().toISOString();
  await convexMutation('tasks:logEvent', {
    key: CONVEX_KEY,
    event: {
      timestamp: now,
      agent: 'corner-dashboard',
      event_type: 'mission_first_warn',
      payload: { project: project || '', source: source || 'create-project-task.js', timestamp: now },
    },
  });
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { text, projectSlug, clientId, mission_slug: rawMission, ops_query } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  // Tenant gate BEFORE anything is written.
  const _reqClient = clientId && String(clientId).trim();
  if (!_reqClient) return res.status(401).json({ error: 'Missing client' });
  let verified;
  try {
    verified = await verifyTenant(_reqClient.toLowerCase(), req);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  const slug = (projectSlug || '').toString().trim().toLowerCase() || null;
  if (!slug) return res.status(400).json({ error: 'projectSlug is required' });
  if (!/^[a-z0-9][a-z0-9-_]{0,64}$/.test(slug)) {
    return res.status(400).json({ error: 'invalid projectSlug' });
  }

  // PROJECT SCOPE: verifyTenant answered "may this caller act inside their own
  // world". It says nothing about `slug`, and the slug steers execution (the
  // checkout the runner cds into, the brief a worker runs). Refuse, do not drop.
  const scopeVerdict = await authorizeTaskProject({ verified, projectSlug: slug });
  if (!scopeVerdict.ok) {
    console.warn(
      `[create-project-task] project scope DENIED: tenant "${verified.tenant}" slug "${slug}": ${scopeVerdict.reason}`,
    );
    return res.status(403).json({
      error: `World "${verified.tenant}" cannot queue work under project "${slug}": ${scopeVerdict.reason}`,
      code: 'PROJECT_SCOPE_DENIED',
    });
  }

  const missionSlug = (rawMission || '').toString().trim() || null;
  if (!missionSlug) {
    if (!ops_query) {
      return res.status(400).json({
        error: 'mission_slug is required. Every task must belong to a mission. Pass mission_slug in the request body, or set ops_query:true for legitimate non-mission operational tasks.',
        code: 'MISSION_SLUG_REQUIRED',
      });
    }
    // ops_query opt-out: log for observability but allow through.
    _logMissionWarnEvent({ project: slug, source: 'create-project-task.js' }).catch(() => {});
  }

  const title = cleanTitle(text);
  const client = verified.tenant;
  // Who queued this comes from the session. Never a borrowed name.
  const createdBy = verified.userId || null;

  try {
    // Resolve the repo path for this slug so the runner knows where to cd.
    let repoPath = '';
    try {
      const project = await convexQuery('projects:lookupBySlug', { slug, worldId: client }, verified.token);
      repoPath = (project && project.repoPath) || '';
    } catch (_) { /* best effort */ }

    const metadata = {
      repo: slug,
      created_via: 'r21c-in-chat',
      model: 'sonnet',
      // Verified author, carried into the brief's metadata so a worker reading
      // the row can see WHO asked, and see the absence when nobody is named.
      requested_by_name: verified.userName || null,
      requested_by_email: verified.email || null,
    };
    if (missionSlug) metadata.mission_slug = missionSlug;

    const row = {
      title,
      text,
      description: text,
      status: 'queued',
      source: 'corner-dashboard-task',
      client_id: client,
      created_by: createdBy,
      project: slug,
      project_path: repoPath,
      metadata,
    };
    const task = await convexMutation('tasks:queue', { key: CONVEX_KEY, row }, verified.token);
    return res.status(200).json({
      ok: true,
      task: task ? { id: task.id, title: task.title, status: task.status, project: task.project } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
