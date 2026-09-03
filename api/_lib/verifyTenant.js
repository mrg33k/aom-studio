// Verify the session token on a request proves the caller can access the
// requested tenant (world) or project.
//
// corner:retire-supabase R3 (2026-09-03): this used to verify a Supabase JWT
// against /auth/v1/user and then read user_metadata.world, the
// is_world_admin_for_tenant RPC, project_access and the messages table. All of
// that is gone. The session is now a Convex Auth token (auth:signIn on
// dev:neat-pony-216) sent as `Authorization: Bearer <token>`, and every fact
// below comes from Convex:
//
//   who is calling        users:verifyToken   (token in the Bearer header)
//   which worlds          users:worldsFor     (memberships table)
//   world role            worlds:membership   (owner | admin | member | viewer)
//   project holder        projects:lookupBySlug
//   sharing grants        projects:access
//   participation floor   rooms:listRooms     (a room for the project in the
//                         caller's world where a person has spoken)
//
// Exported names and return shapes are unchanged so the ~140 route files that
// import from here keep working: verifyTenant, verifyProjectAccess,
// requireSuperAdmin, callerIdentity, callerWorld, getUserFromJwt, extractJwt,
// displayNameForUser, lookupProjectBySlug, TenantAuthError.
//
// Three-path authorization, same as before:
//   1. Primary: the caller belongs to the requested world (membership row).
//   2. Admin:   the caller is a super-admin (AOM owner) or a world admin.
//   3. Shared:  requestedTenant is "shared:<slug>" and the caller's world holds
//               the project, holds a grant on it, or has taken part in it.
//
// *** THE SHARED PATH IS REACHED ONLY FOR A TENANT LITERALLY SPELLED
// *** "shared:<slug>". For a PLAIN world string the grant table is NEVER
// *** consulted. If you are gating a PROJECT, use verifyProjectAccess().
//
// Underscore-prefixed dir keeps this file out of Vercel's serverless routing.

const CONVEX_URL = process.env.CORNER_CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud';
// Optional script key for gated mutations (TASKS_KEY on the deployment).
const CONVEX_KEY = process.env.CORNER_CONVEX_KEY || process.env.TASKS_KEY || '';

// Super-admin: the AOM owners. A super-admin reaches every world and every
// project without needing a membership row in each. Override via env for
// staging or forks: SUPER_ADMIN_EMAILS (comma separated) and, optionally,
// SUPER_ADMIN_USER_ID (a Convex users id).
const SUPER_ADMIN_EMAILS = new Set(
  (process.env.SUPER_ADMIN_EMAILS || 'patrikmatheson@gmail.com,hello@aom-inhouse.com')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
);
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '';

export class TenantAuthError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'TenantAuthError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Convex transport. Same plain-fetch contract as api/_lib/reportsStore.js, plus
// an optional Bearer token so ctx.auth on the deployment sees the caller.
// ---------------------------------------------------------------------------

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  });
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}

export function convexQuery(path, args) { return convexCall('query', path, args); }
export function convexMutation(path, args) { return convexCall('mutation', path, withKey(args)); }
export function convexAction(path, args) { return convexCall('action', path, args); }
export function convexQueryAs(token, path, args) { return convexCall('query', path, args, token); }
export function convexMutationAs(token, path, args) { return convexCall('mutation', path, withKey(args), token); }
export function convexActionAs(token, path, args) { return convexCall('action', path, args, token); }

// Script-facing mutations accept an optional `key`. Sending it when we have it
// is harmless on an ungated deployment and required on a gated one.
function withKey(args) {
  if (!CONVEX_KEY) return args || {};
  return { key: CONVEX_KEY, ...(args || {}) };
}

// Pull the session token from `Authorization: Bearer <token>`, falling back to
// a `corner-auth-token` cookie for browser clients that keep the session in a
// cookie instead of a header.
export function extractJwt(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) {
    const tok = auth.replace(/^Bearer\s+/i, '').trim();
    if (tok) return tok;
  }
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)corner-auth-token=([^;]+)/);
  if (match) {
    try {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
        if (parsed && typeof parsed.token === 'string') return parsed.token;
        if (parsed && typeof parsed.access_token === 'string') return parsed.access_token;
      } else if (decoded) {
        return decoded;
      }
    } catch {
      // bad cookie, fall through to null
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Identity. One token resolves to one person; cached briefly so a single
// request that calls verifyTenant and callerIdentity (common) pays one round
// trip, not two.
// ---------------------------------------------------------------------------

const IDENTITY_CACHE = new Map();
const IDENTITY_TTL_MS = 20_000;
const IDENTITY_CACHE_MAX = 500;

function isSuperAdminUser(user) {
  if (!user) return false;
  if (SUPER_ADMIN_USER_ID && String(user.id) === SUPER_ADMIN_USER_ID) return true;
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  return !!email && SUPER_ADMIN_EMAILS.has(email);
}

// Exported so endpoints that need the SPEAKER can resolve them from the same
// token. Returns a user object shaped like the old Supabase one where it
// matters (id, email, user_metadata.world / full_name) plus the Convex facts
// (worldId, worldSlug, isAdmin, worlds[]). null when the token is not valid.
export async function getUserFromJwt(jwt) {
  if (!jwt) return null;
  const hit = IDENTITY_CACHE.get(jwt);
  if (hit && Date.now() - hit.at < IDENTITY_TTL_MS) return hit.user;
  let v = null;
  try {
    v = await convexQueryAs(jwt, 'users:verifyToken', {});
  } catch (err) {
    console.warn('[verifyTenant] users:verifyToken failed:', err?.message || err);
    return null;
  }
  if (!v || !v.userId) return null;
  let worlds = [];
  try {
    worlds = await convexQueryAs(jwt, 'users:worldsFor', { userId: v.userId });
  } catch {
    worlds = [];
  }
  const worldSlug = String(v.worldSlug || v.world || '').toLowerCase() || null;
  const user = {
    id: String(v.userId),
    email: typeof v.email === 'string' ? v.email : null,
    name: typeof v.name === 'string' ? v.name : null,
    worldId: v.worldId ? String(v.worldId) : null,
    worldSlug,
    isAdmin: !!v.isAdmin,
    worlds: (Array.isArray(worlds) ? worlds : []).map((w) => ({
      worldId: String(w.worldId),
      slug: String(w.slug || '').toLowerCase(),
      name: w.name || null,
      role: w.role || null,
    })),
    // Legacy shape some call sites still read.
    user_metadata: { world: worldSlug, full_name: v.name || null, name: v.name || null },
  };
  if (IDENTITY_CACHE.size >= IDENTITY_CACHE_MAX) IDENTITY_CACHE.clear();
  IDENTITY_CACHE.set(jwt, { at: Date.now(), user });
  return user;
}

function worldSlugsOf(user) {
  const out = new Set();
  if (user?.worldSlug) out.add(user.worldSlug);
  for (const w of user?.worlds || []) if (w.slug) out.add(w.slug);
  return out;
}

// Resolve a project slug to { projectId, ownerWorld }. Returns null when the
// slug has NO projects row, which is a normal, legitimate state, not an error:
// projects are also seeded from disk and the missions registry. "Unregistered"
// must never be treated as "forbidden". ownerWorld is the holder world's slug.
export async function lookupProjectBySlug(projectSlug) {
  const slug = String(projectSlug || '').trim().toLowerCase();
  if (!slug) return null;
  try {
    const row = await convexQuery('projects:lookupBySlug', { slug });
    if (!row) return null;
    return {
      projectId: row.projectId ? String(row.projectId) : null,
      ownerWorld: row.ownerWorld ? String(row.ownerWorld).toLowerCase() : null,
      ownerWorldId: row.ownerWorldId ? String(row.ownerWorldId) : null,
    };
  } catch {
    return null;
  }
}

// Does `callerWorld` hold a sharing grant on this project? Grants are
// WORLD-level, so this is true for every member of the granted world.
// Returns false on any error; the caller falls through to 403.
async function hasProjectAccessGrant(projectId, callerWorld) {
  if (!projectId || !callerWorld) return false;
  try {
    const grants = await convexQuery('projects:access', { projectId });
    const world = String(callerWorld).toLowerCase();
    return (Array.isArray(grants) ? grants : []).some((g) => String(g.worldSlug || '').toLowerCase() === world);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PARTICIPATION EVIDENCE, the floor BOTH gates fall back to.
//
// THE RULE: a world that has demonstrably taken part under this project is a
// PARTICIPANT and may keep reading and writing it. Every other world is
// refused. Merely holding a valid session is NOT evidence.
//
// On Convex the evidence is a room: the caller's world has a project room (or
// mission room) for this slug in which a person has written at least one
// message (rooms.humanMessageCount > 0). That count is kept by the message
// writer on every human send, so it cannot be a default the way the old
// messages.world_id column was. A room with no human traffic is scaffolding
// and counts for nothing.
//
// Still deliberately conservative: a project nobody has spoken in has no
// evident participants, so nobody but the super-admin passes on this arm.
// That is not a lockout, because the floor is only reached after the holder
// world and grant arms have already said no.
// ---------------------------------------------------------------------------

async function worldHasProjectPresence(callerWorld, projectSlug) {
  const world = String(callerWorld || '').trim().toLowerCase();
  const slug = String(projectSlug || '').trim().toLowerCase();
  if (!world || !slug || world.startsWith('shared:')) return false;
  try {
    const rooms = await convexQuery('rooms:listRooms', { worldId: world, filter: 'all' });
    for (const r of Array.isArray(rooms) ? rooms : []) {
      const project = String(r.project || '').toLowerCase();
      const legacy = String(r.legacyRoomId || '').toLowerCase();
      const matches = project === slug || legacy === `${world}:project:${slug}` || legacy.startsWith(`${world}:mission:${slug}:`);
      if (matches && Number(r.humanMessageCount || 0) > 0) return true;
    }
    console.log(`[verifyTenant] no participation evidence: world "${world}" has no spoken-in room under project "${slug}", denied`);
    return false;
  } catch {
    return false;
  }
}

// For tenants of the form "shared:<project-slug>", may any of the caller's
// worlds reach the room: it holds the project, holds a grant on it, or has
// taken part in it. Returns false on any error.
async function hasSharedProjectAccess(sharedTenant, worldSlugs) {
  const projectSlug = sharedTenant.slice('shared:'.length);
  if (!projectSlug || !worldSlugs.size) return false;
  const project = await lookupProjectBySlug(projectSlug);
  for (const world of worldSlugs) {
    if (project?.ownerWorld && project.ownerWorld === world) return true;
    if (project && await hasProjectAccessGrant(project.projectId, world)) return true;
    if (await worldHasProjectPresence(world, projectSlug)) return true;
  }
  return false;
}

// The caller's role in a world (owner | admin | member | viewer), or null.
async function membershipRole(tenant, userId) {
  try {
    const m = await convexQuery('worlds:membership', { worldId: tenant, userId });
    return m && m.role ? String(m.role) : null;
  } catch {
    return null;
  }
}

function isAdminRole(role) {
  return role === 'owner' || role === 'admin';
}

// Verify the request's session is allowed to access `requestedTenant`.
// Returns { ok: true, tenant, userId, isAdmin, userName, email, world } on
// success. Throws TenantAuthError on a missing/invalid session or a
// cross-tenant denial.
//
// SCOPE WARNING: this answers "may the caller act inside WORLD w". The grant
// table is consulted ONLY when `requestedTenant` is literally "shared:<slug>".
// Gating a project with verifyTenant(ownerWorldOfProject, req) refuses every
// world that holds a grant on that project. Use verifyProjectAccess() instead.
export async function verifyTenant(requestedTenant, req) {
  if (!requestedTenant || typeof requestedTenant !== 'string') {
    throw new TenantAuthError('tenant required', 400);
  }
  const tenant = requestedTenant.trim().toLowerCase();
  if (!tenant) throw new TenantAuthError('tenant required', 400);

  const jwt = extractJwt(req);
  if (!jwt) throw new TenantAuthError('jwt required', 401);

  const _gu0 = Date.now();
  const user = await getUserFromJwt(jwt);
  const _guMs = Date.now() - _gu0;
  if (_guMs > 1500) console.log(`[verifyTenant] getUserFromJwt=${_guMs}ms (SLOW) tenant=${tenant}`);
  if (!user) throw new TenantAuthError('invalid jwt', 401);

  const callerWorld = user.worldSlug || null;
  const who = {
    userId: user.id,
    userName: displayNameForUser(user),
    email: user.email,
    world: callerWorld,
  };

  // Super-admin bypass: the AOM owners reach every world.
  if (isSuperAdminUser(user)) {
    return { ok: true, tenant, ...who, isAdmin: true };
  }
  const slugs = worldSlugsOf(user);
  if (slugs.has(tenant)) {
    const role = (user.worlds.find((w) => w.slug === tenant) || {}).role
      || (tenant === callerWorld && user.isAdmin ? 'admin' : null);
    return { ok: true, tenant, ...who, isAdmin: isAdminRole(role) };
  }
  // A membership row that users:worldsFor did not surface (or an owner with no row).
  const role = await membershipRole(tenant, user.id);
  if (role) {
    return { ok: true, tenant, ...who, isAdmin: isAdminRole(role) };
  }
  if (tenant.startsWith('shared:') && await hasSharedProjectAccess(tenant, slugs)) {
    return { ok: true, tenant, ...who, isAdmin: false };
  }
  throw new TenantAuthError(
    `forbidden: caller world "${callerWorld || '(none)'}" cannot access "${tenant}"`,
    403,
  );
}

// ---------------------------------------------------------------------------
// PROJECT ACCESS: "may this caller reach this PROJECT?"
//
// READ THIS BEFORE GATING ANY ENDPOINT THAT IS KEYED BY A PROJECT SLUG.
// verifyTenant(<world>, req) answers a different question and 403s exactly the
// collaborator the sharing model exists to serve. ONE world OWNS a project
// (projects.worldSlug). It shares OUTWARD via a projectAccess row, which is
// WORLD-level, so a grant admits every human in the granted world.
//
// Returns { ok, projectSlug, projectId, ownerWorld, registered, via, tenant,
//           isAdmin, userId, userName, email, world }
//   registered  false when there is no projects row (NOT an error)
//   via         which rule admitted the caller, for logs
//   tenant      ownerWorld when known, else the caller's own world
//
// Admits, in order: the super-admin; the holder world; any world holding a
// grant; the holder world's admins; and, only when there is no holder world
// to compare against, a world with PARTICIPATION EVIDENCE under that project.
// Everything else is a 403. An unregistered slug is NOT an authorization
// failure by itself: the floor is lowered to participation, not to nothing.
// ---------------------------------------------------------------------------
export async function verifyProjectAccess(projectSlug, req) {
  const slug = String(projectSlug || '').trim().toLowerCase();
  if (!slug) throw new TenantAuthError('project required', 400);

  const jwt = extractJwt(req);
  if (!jwt) throw new TenantAuthError('jwt required', 401);
  const user = await getUserFromJwt(jwt);
  if (!user || !user.id) throw new TenantAuthError('invalid jwt', 401);

  const callerWorld = user.worldSlug || null;
  const slugs = worldSlugsOf(user);
  const who = {
    userId: user.id,
    userName: displayNameForUser(user),
    email: user.email,
    world: callerWorld,
  };

  const project = await lookupProjectBySlug(slug);
  const ownerWorld = project?.ownerWorld || null;
  const admit = (via, isAdmin = false) => ({
    ok: true,
    projectSlug: slug,
    projectId: project?.projectId || null,
    ownerWorld,
    registered: !!project,
    via,
    tenant: ownerWorld || callerWorld || null,
    isAdmin,
    ...who,
  });

  if (isSuperAdminUser(user)) return admit('super-admin', true);

  if (project) {
    if (ownerWorld && slugs.has(ownerWorld)) return admit('holder-world');
    for (const world of slugs) {
      if (await hasProjectAccessGrant(project.projectId, world)) return admit('project-access-grant');
    }
    if (ownerWorld && isAdminRole(await membershipRole(ownerWorld, user.id))) return admit('world-admin', true);
  }

  // No holder world to compare against: the caller's world must already have
  // taken part under this project. A session is proof of who you are, never
  // proof that you belong in this room.
  if (!ownerWorld) {
    for (const world of slugs) {
      if (await worldHasProjectPresence(world, slug)) {
        return admit(project ? 'unowned-project' : 'unregistered-project');
      }
    }
  }

  throw new TenantAuthError(
    `forbidden: caller world "${callerWorld || '(none)'}" has no access to project "${slug}"`,
    403,
  );
}

// Require the caller be a SUPER-ADMIN. For endpoints whose data is
// Patrik-personal and must never be world-scoped or shared. Throws
// TenantAuthError (401 no/invalid session, 403 anyone else).
export async function requireSuperAdmin(req) {
  const jwt = extractJwt(req);
  if (!jwt) throw new TenantAuthError('jwt required', 401);
  const user = await getUserFromJwt(jwt);
  if (!user || !user.id) throw new TenantAuthError('invalid jwt', 401);
  if (!isSuperAdminUser(user)) {
    throw new TenantAuthError('forbidden: super-admin only', 403);
  }
  return {
    ok: true,
    userId: user.id,
    userName: displayNameForUser(user),
    email: user.email,
    world: user.worldSlug || null,
    isAdmin: true,
  };
}

// The caller's OWN (home) world slug, lowercased, or null when the request
// carries no valid session. Used to SCOPE a lookup before any tenant gate
// runs, never as an authorization decision by itself.
export async function callerWorld(req) {
  const jwt = extractJwt(req);
  if (!jwt) return null;
  const user = await getUserFromJwt(jwt);
  if (!user) return null;
  return user.worldSlug || null;
}

// ---------------------------------------------------------------------------
// CALLER IDENTITY: who is actually speaking.
//   1. Identity is derived SERVER-SIDE from the token. A client-supplied
//      user_name / user_id is never trusted for attribution or authorization.
//   2. ONE human resolves to ONE display identity on every endpoint.
//   3. An unknown caller reads as UNKNOWN: these return null, never a fallback
//      name, and callers render that as "Someone", never as Patrik.
// ---------------------------------------------------------------------------

// Canonical display name for a user object: the name they set, else the local
// part of their email. Accepts the Convex shape ({name, email}) and the old
// Supabase shape ({user_metadata:{full_name,...}, email}).
export function displayNameForUser(user) {
  if (!user) return null;
  const meta = (user.user_metadata && typeof user.user_metadata === 'object') ? user.user_metadata : {};
  for (const candidate of [user.name, meta.full_name, meta.name, meta.display_name, meta.user_name]) {
    const v = typeof candidate === 'string' ? candidate.trim() : '';
    if (v) return v;
  }
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (email.includes('@')) {
    const local = email.split('@')[0].trim();
    if (local) return local;
  }
  return email || null;
}

// The VERIFIED human behind this request, or null when the request carries no
// valid session. Never throws. This is identity, NOT authorization.
// Returns { userId, userName, email, world }.
export async function callerIdentity(req) {
  const jwt = extractJwt(req);
  if (!jwt) return null;
  let user = null;
  try {
    user = await getUserFromJwt(jwt);
  } catch {
    return null;
  }
  if (!user || !user.id) return null;
  return {
    userId: user.id,
    userName: displayNameForUser(user),
    email: user.email,
    world: user.worldSlug || null,
  };
}

// The raw session token for a request, for endpoints that must call a Convex
// function AS the caller (invites:accept, users:deleteAccount).
export function sessionTokenFromRequest(req) {
  return extractJwt(req);
}
