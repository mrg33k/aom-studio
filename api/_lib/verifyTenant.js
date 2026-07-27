// Verify the JWT in a request proves the caller can access the requested tenant.
// Used by /api/dashboard/* endpoints that take tenant scope from URL/body and
// would otherwise leak across tenants because they query Supabase with the
// service-role key (bypassing RLS).
//
// Three-path authorization (mirrors RLS migration 029 + 035):
//   1. Primary path: caller's user_metadata.world matches requestedTenant.
//   2. Admin path:   public.is_world_admin_for_tenant(tenant, user_id) is true
//                    (Patrik is admin in every world; future tenant admins
//                    work the same way).
//   3. Shared path:  requestedTenant is "shared:<slug>" and the caller's world
//                    holds the project, holds a project_access row for it, or
//                    already has messages in the room (added 2026-05-24 to fix
//                    shared-room chat 403s — the world admin RPC can't match
//                    "shared:*" because no world has that slug; project_access
//                    is the real grant table, and room traffic is the
//                    participation floor underneath it).
//
// *** THE SHARED PATH IS REACHED ONLY FOR A TENANT LITERALLY SPELLED
// *** "shared:<slug>". For a PLAIN world string the project_access grant table
// *** is NEVER consulted. If you are gating a PROJECT, do not reach for
// *** verifyTenant(ownerWorldOfProject, req) — use verifyProjectAccess() at the
// *** bottom of this file. See the block comment there for what that costs you.
//
// Underscore-prefixed dir keeps this file out of Vercel's serverless routing.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Super-admin (Patrik) is allowed access to every world without needing a
// world_members row in each tenant. Same UUID lives in
// src/dashboard/lib/clientConfig.js::SUPER_ADMIN_USER_ID and api/worlds/index.js.
// Override via env for staging / forks.
const SUPER_ADMIN_USER_ID = process.env.SUPER_ADMIN_USER_ID || '833f6828-1dae-409c-a24b-1438f46544d0';

export class TenantAuthError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'TenantAuthError';
    this.status = status;
  }
}

// Pull the JWT from `Authorization: Bearer <jwt>`, falling back to the
// supabase-js auth-helper cookie (`sb-<projectref>-auth-token`) which holds a
// JSON-encoded `[access_token, refresh_token, ...]` array.
export function extractJwt(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) {
    const tok = auth.replace(/^Bearer\s+/i, '').trim();
    if (tok) return tok;
  }
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (match) {
    try {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
      if (parsed && typeof parsed.access_token === 'string') return parsed.access_token;
    } catch {
      // bad cookie, fall through to null
    }
  }
  return null;
}

// Exported (2026-07-27, identity-attribution fix) so endpoints that need the
// SPEAKER — not just the tenant — can resolve them from the same JWT instead
// of trusting a client-supplied name. Prefer callerIdentity() below; reach for
// this only when you already need the raw Supabase user object.
export async function getUserFromJwt(jwt) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || !user.id) return null;
  return user;
}

function serviceHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

// Resolve a project slug to { projectId, ownerWorld }. Returns null when the
// slug has NO projects row — which is a normal, legitimate state, not an error:
// projects are also seeded from disk / the missions registry, and 4 of the 33
// registry projects (blacknight, bridge-smoke, pala, rex) have no row live as of
// 2026-07-27. "Unregistered" must never be treated as "forbidden".
// ownerWorld is projects.client_id lowercased — the world that HOLDS the project.
export async function lookupProjectBySlug(projectSlug) {
  const slug = String(projectSlug || '').trim();
  if (!slug || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=id,client_id&limit=1`,
      { headers: serviceHeaders() }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const owner = rows[0].client_id;
    return {
      projectId: rows[0].id || null,
      ownerWorld: owner ? String(owner).toLowerCase() : null,
    };
  } catch {
    return null;
  }
}

// Does `callerWorld` hold a project_access grant on this project? Grants are
// WORLD-level (project_access.client_id is a world slug), so this is true for
// every member of the granted world — Ash and Courtney included, not just the
// world owner. Returns false on any error; the caller falls through to 403.
async function hasProjectAccessGrant(projectId, callerWorld) {
  if (!projectId || !callerWorld || !SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${encodeURIComponent(projectId)}&client_id=eq.${encodeURIComponent(callerWorld)}&select=id&limit=1`,
      { headers: serviceHeaders() }
    );
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PARTICIPATION EVIDENCE — the floor BOTH gates in this file fall back to
// (2026-07-27 r2, generalised r3).
//
// THE RULE, stated once so the two gates cannot drift apart again: a world that
// already has messages in the room / under the project is a PARTICIPANT and may
// keep reading and writing it. Every other world is refused. Merely holding a
// valid session is NOT evidence — 19 auth users are live across 10 worlds (plus
// 4 legacy accounts carrying no world at all), and a JWT proves only which of
// them you are, never that you belong in this room.
//
// Read off `messages.world_id`, which records the world the message was WRITTEN
// from, not the world that holds the project: shared:sourcing is arsenal-held
// and every one of its 387 rows carries the AOM world. That is exactly the
// signal we want. The column is NOT NULL on all 45,192 live rows, so an empty
// result is real absence, never a data gap.
//
// Deliberately conservative in one direction: a room / project with no messages
// at all has no evident participants, so nobody but the super-admin passes. That
// is not a dead end and not a lockout, because the floor is only ever reached
// after the holder-world and project_access arms have already said no:
//   - inviting a world to a project writes a project_access row
//     (api/dashboard/project-invite.js), so a freshly shared, still-silent room
//     is admitted by the GRANT, never by this floor;
//   - a project created the supported way gets a projects row with a holder
//     world (api/dashboard/create-project-from-chat.js) and never lands here;
//   - and a disk-scaffolded slug with no row and no traffic self-heals the
//     moment its first message lands, which goes through the world gate above,
//     not through this one.
// Verified live 2026-07-27: all 4 unregistered projects carry traffic, and every
// shared room that anyone has actually used carries traffic by definition.
//
// Returns false on any error; the caller falls through to its existing 403.
// ---------------------------------------------------------------------------
async function worldHasMessages(filter, callerWorld, label) {
  if (!callerWorld || !SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?${filter}&world_id=eq.${encodeURIComponent(callerWorld)}&select=id&limit=1`,
      { headers: serviceHeaders() }
    );
    if (!r.ok) return false;
    const rows = await r.json();
    const present = Array.isArray(rows) && rows.length > 0;
    if (!present) {
      console.log(`[verifyTenant] no participation evidence: world "${callerWorld}" has no messages ${label} — denied`);
    }
    return present;
  } catch {
    return false;
  }
}

// Has the caller's world already spoken in this shared room? Room-scoped:
// presence in the room is presence, whether or not the slug has a projects row.
function hasSharedRoomPresence(sharedTenant, callerWorld) {
  return worldHasMessages(
    `client_id=eq.${encodeURIComponent(sharedTenant)}`,
    callerWorld,
    `in shared room "${sharedTenant}"`
  );
}

// Has the caller's world already spoken under this project? Project-scoped, so
// it counts traffic in the project's own room AND in its shared room — messages
// carry `project` on both (live: shared:pala rows carry project 'pala').
function hasProjectPresence(projectSlug, callerWorld) {
  return worldHasMessages(
    `project=eq.${encodeURIComponent(projectSlug)}`,
    callerWorld,
    `under project "${projectSlug}"`
  );
}

// For tenants of the form "shared:<project-slug>", check whether the caller's
// world may reach the room: it holds the project, it holds a project_access
// grant on it, or it already has traffic in the room.
// Returns false on any error — caller falls through to the existing 403.
//
// r3 FIX — the participation floor applies to REGISTERED rooms too. The r2
// version reached it only via `if (!project) return ...`, so a shared room that
// DOES have a projects row but no grant fell through all three arms to 403.
// That is a live regression, not a hypothetical: shared:sourcing is
// arsenal-held, carries 387 messages every one of which was written from the AOM
// world, and has no AOM project_access grant. Before this change set the shared
// branch was requireJwtOnly and the room worked. After it, Ash and Courtney get
// 403 while Patrik sails through on the super-admin bypass three lines earlier
// and never sees the break — the exact asymmetry this file keeps re-introducing.
// shared:s3c is in the same state (arsenal-held, ungranted, AOM traffic).
//
// Presence in the room is presence. Whether a projects row exists is a fact
// about the registry, not about who is in the conversation.
async function hasSharedProjectAccess(sharedTenant, callerWorld) {
  if (!callerWorld) return false;
  const projectSlug = sharedTenant.slice('shared:'.length);
  if (!projectSlug) return false;
  const project = await lookupProjectBySlug(projectSlug);
  // Unregistered room: no holder world and no grant row exist to consult, so
  // the room's own traffic is the only evidence there is.
  if (!project) return hasSharedRoomPresence(sharedTenant, callerWorld);
  // The owning world always has access to its own shared channel.
  if (project.ownerWorld && project.ownerWorld === callerWorld) return true;
  // Otherwise look for a project_access grant for the caller's world.
  if (await hasProjectAccessGrant(project.projectId, callerWorld)) return true;
  // Registered but ungranted: same participation floor as an unregistered room.
  return hasSharedRoomPresence(sharedTenant, callerWorld);
}

async function isWorldAdminForTenant(tenant, userId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_world_admin_for_tenant`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_slug: tenant, user_uuid: userId }),
  });
  if (!r.ok) return false;
  const result = await r.json();
  return result === true;
}

// Verify the request's JWT is allowed to access `requestedTenant`.
// Returns { ok: true, tenant, userId, isAdmin, userName, email, world } on
// success — userName/email/world added 2026-07-27 (additive; every previously
// returned field is unchanged). They come free: this function already fetched
// the Supabase user, so an endpoint that needs the SPEAKER as well as the
// tenant can read them here instead of paying a second /auth/v1/user round
// trip (the documented hot spot in the timing note below). userName follows
// the same canonical derivation as callerIdentity(), and is null when unknown
// — never a fallback to somebody else's name.
// Throws TenantAuthError on missing/invalid JWT or cross-tenant denial.
//
// SCOPE WARNING: this answers "may the caller act inside WORLD w". The
// project_access grant table is consulted ONLY when `requestedTenant` is
// literally "shared:<slug>". Gating a project with
// verifyTenant(ownerWorldOfProject, req) therefore refuses every world that
// holds a grant on that project. Use verifyProjectAccess() instead.
export async function verifyTenant(requestedTenant, req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new TenantAuthError('supabase not configured', 500);
  }
  if (!requestedTenant || typeof requestedTenant !== 'string') {
    throw new TenantAuthError('tenant required', 400);
  }
  const tenant = requestedTenant.trim().toLowerCase();
  if (!tenant) throw new TenantAuthError('tenant required', 400);

  const jwt = extractJwt(req);
  if (!jwt) throw new TenantAuthError('jwt required', 401);

  // corner:corner-ui-cv6 (2026-06-24): time the auth sub-calls — the dashboard
  // load was ~15-19s with server queries only ~600ms, so the cost is here.
  const _gu0 = Date.now();
  const user = await getUserFromJwt(jwt);
  const _guMs = Date.now() - _gu0;
  if (_guMs > 1500) console.log(`[verifyTenant] getUserFromJwt=${_guMs}ms (SLOW) tenant=${tenant}`);
  if (!user) throw new TenantAuthError('invalid jwt', 401);

  const callerWorld = String(user.user_metadata?.world || '').toLowerCase();
  // Identity carried on every success shape. Same derivation as
  // callerIdentity(), so one human reads the same on every path.
  const who = {
    userId: user.id,
    userName: displayNameForUser(user),
    email: typeof user.email === 'string' ? user.email : null,
    world: callerWorld || null,
  };

  // Super-admin bypass: Patrik (and any future super-admin UID) can read
  // every tenant. Without this, the smoke-test harness can't impersonate
  // through Patrik's session, and the dashboard world-switcher is dead in
  // any world Patrik isn't explicitly a member of.
  if (user.id === SUPER_ADMIN_USER_ID) {
    return { ok: true, tenant, ...who, isAdmin: true };
  }
  if (callerWorld && callerWorld === tenant) {
    return { ok: true, tenant, ...who, isAdmin: false };
  }
  if (await isWorldAdminForTenant(tenant, user.id)) {
    return { ok: true, tenant, ...who, isAdmin: true };
  }
  if (tenant.startsWith('shared:') && await hasSharedProjectAccess(tenant, callerWorld)) {
    return { ok: true, tenant, ...who, isAdmin: false };
  }
  throw new TenantAuthError(
    `forbidden: caller world "${callerWorld || '(none)'}" cannot access "${tenant}"`,
    403
  );
}

// ---------------------------------------------------------------------------
// PROJECT ACCESS — "may this caller reach this PROJECT?" (added 2026-07-27 r2,
// corner:chat/full-chat/voice-chat identity-attribution fix).
//
// READ THIS BEFORE GATING ANY ENDPOINT THAT IS KEYED BY A PROJECT SLUG.
//
// verifyTenant(<world>, req) answers a different question: may the caller act
// inside world W. It touches project_access ONLY for a tenant spelled
// "shared:<slug>". So `verifyTenant(ownerWorldOfProject, req)` is the WRONG
// gate for a project — it 403s exactly the collaborator the sharing model
// exists to serve.
//
// Live proof (2026-07-27): project_access grants world 'aom' into three
// arsenal-held projects — space-rising, arsenal, arsenal-directory. Ash
// (ashtrovfx@gmail.com) and Courtney (courtney@corner.aheadofmarket.com) are
// both in the AOM world and neither is the super-admin. Under
// verifyTenant(<holderWorld>, req) their world is not the holder world, the
// tenant string carries no 'shared:' prefix, the grant table is never read →
// 403 on every Space Rising surface. Patrik returns on the super-admin bypass
// two lines earlier and never sees the break. That asymmetry is the bug this
// function exists to kill.
//
// (Written without a literal world slug after the paren on purpose: the
// hardcoded-tenant guard scans for exactly that shape, and a build gate that
// goes red on the WRITE-UP of a vulnerability is a gate people learn to skip.)
//
// ONE world OWNS a project (projects.client_id). It shares OUTWARD via a
// project_access row, which is WORLD-level — so a grant admits every human in
// the granted world, not just its owner.
// ---------------------------------------------------------------------------

// Verify the request's JWT may reach `projectSlug`. Throws TenantAuthError
// (401 no/invalid session, 403 denied) — same contract as verifyTenant, so a
// call site's existing try/catch works unchanged.
//
// Returns { ok, projectSlug, projectId, ownerWorld, registered, via, tenant,
//           isAdmin, userId, userName, email, world }
//   ownerWorld  the holding world, or null when the project has no projects row
//   registered  false when there is no projects row (NOT an error — see below)
//   via         which rule admitted the caller, for logs/debugging
//   tenant      ownerWorld when known, else the caller's own world — the string
//               to stamp on downstream writes
//   userId/userName/email/world  the VERIFIED speaker (same derivation as
//               callerIdentity, so one human reads the same on every path) —
//               saves the call site a second /auth/v1/user round trip.
//
// Admits, in order: the super-admin; the holder world; any world holding a
// project_access grant; the holder world's admins; and — only when there is no
// holder world to compare against — a world with PARTICIPATION EVIDENCE under
// that project (see worldHasMessages above). Everything else is a 403.
//
// r3 FIX — that last arm used to be "any valid session at all". Two branches,
// `unregistered-project` (no projects row) and `unowned-project` (row with no
// client_id), did no world comparison whatsoever, so ANY caller from ANY world
// was admitted. Live cost: 4 registry projects have no projects row (blacknight,
// bridge-smoke, pala, rex), so Ben — a different world entirely — could POST
// voice-context-update with slug 'rex' and write arbitrary text into AOM's rex
// CONTEXT.md, which rule 5 makes every agent read fresh as canon before acting.
// That is durable prompt injection into the source of truth, not a stray read.
//
// An unregistered slug still is NOT an authorization failure — 404/403-ing it
// outright silently eats writes in rooms that render fine everywhere else, and
// that was a real r1 regression. The floor is lowered to participation, not to
// nothing: all 4 unregistered projects carry traffic from exactly one world, so
// the people actually in those rooms (Ash and Courtney included) keep working
// and every other world is refused. Same rule as the shared-room path above, on
// purpose — one sentence, two gates, so they cannot drift apart again.
export async function verifyProjectAccess(projectSlug, req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new TenantAuthError('supabase not configured', 500);
  }
  const slug = String(projectSlug || '').trim().toLowerCase();
  if (!slug) throw new TenantAuthError('project required', 400);

  const jwt = extractJwt(req);
  if (!jwt) throw new TenantAuthError('jwt required', 401);
  const user = await getUserFromJwt(jwt);
  if (!user || !user.id) throw new TenantAuthError('invalid jwt', 401);

  const callerWorld = String(user.user_metadata?.world || '').toLowerCase() || null;
  const who = {
    userId: user.id,
    userName: displayNameForUser(user),
    email: typeof user.email === 'string' ? user.email : null,
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

  // Super-admin (Patrik) reaches every project, same as verifyTenant.
  if (user.id === SUPER_ADMIN_USER_ID) return admit('super-admin', true);

  // Registered project: holder world, then grant, then the holder's admins.
  // Order and `via` strings are unchanged from r2 — only the fallback below is.
  if (project) {
    if (ownerWorld && callerWorld && ownerWorld === callerWorld) return admit('holder-world');
    if (await hasProjectAccessGrant(project.projectId, callerWorld)) return admit('project-access-grant');
    if (ownerWorld && await isWorldAdminForTenant(ownerWorld, user.id)) return admit('world-admin', true);
  }

  // No holder world to compare against — either no projects row at all
  // (registry/disk-only project) or a row that records no client_id. Both are
  // the same "cannot tell whose it is" state, and both now take the
  // PARTICIPATION floor rather than waving through any session: the caller's
  // world must already have messages under this project. A session is proof of
  // who you are, never proof that you belong in this room.
  if (!ownerWorld && await hasProjectPresence(slug, callerWorld)) {
    return admit(project ? 'unowned-project' : 'unregistered-project');
  }

  throw new TenantAuthError(
    `forbidden: caller world "${callerWorld || '(none)'}" has no access to project "${slug}"`,
    403
  );
}

// The caller's OWN world from the JWT (user_metadata.world), lowercased, or
// null when the request carries no valid session. Used by endpoints that must
// SCOPE a lookup to the caller before any tenant gate runs (e.g. resolving a
// bare mission slug to a world) — never as an authorization decision by itself.
export async function callerWorld(req) {
  const jwt = extractJwt(req);
  if (!jwt) return null;
  const user = await getUserFromJwt(jwt);
  if (!user) return null;
  return String(user.user_metadata?.world || '').toLowerCase() || null;
}

// ---------------------------------------------------------------------------
// CALLER IDENTITY — who is actually speaking (added 2026-07-27,
// corner:chat/full-chat/voice-chat identity-attribution fix).
//
// Why this lives here and not in each endpoint:
//   1. Identity must be derived SERVER-SIDE from the JWT. A client-supplied
//      user_name / user_id is never trusted for attribution or authorization.
//      "Patrik said X" acts as an authorization token in this system — agents
//      take actions for that phrase they take for nobody else — so the string
//      must only ever be produced by a verified session.
//   2. ONE human must resolve to ONE display identity no matter which endpoint
//      they came through. Before this helper, Patrik was recorded as 'Patrik'
//      on one path (user_metadata.full_name) and 'patrikmatheson@gmail.com' on
//      another (raw email) — 371 vs 607 rows for the same person.
//   3. An unknown caller must read as UNKNOWN. These functions return null
//      rather than a fallback name; callers render that as "Someone" /
//      "unattributed" and NEVER as Patrik.
// ---------------------------------------------------------------------------

// Canonical display name for a Supabase user object: the name they set, else
// the local part of their email. Returns null when the object carries no
// usable name — never substitutes anybody else's name.
export function displayNameForUser(user) {
  if (!user) return null;
  const meta = (user.user_metadata && typeof user.user_metadata === 'object') ? user.user_metadata : {};
  for (const candidate of [meta.full_name, meta.name, meta.display_name, meta.user_name]) {
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
// valid session. Never throws — an endpoint that must stay reachable without a
// session (see api/dashboard/voice-session.js) can treat null as "unverified"
// and degrade, while an endpoint that requires auth still gates on
// verifyTenant() separately. This is identity, NOT authorization: passing this
// does not mean the caller may touch the tenant they asked for.
//
// Returns { userId, userName, email, world }:
//   userId   Supabase auth user id (uuid) — safe to persist as messages.user_id
//   userName canonical display name, or null when unknown (render unattributed)
//   email    the account email, or null
//   world    user_metadata.world lowercased, or null (the caller's OWN world)
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
    email: typeof user.email === 'string' ? user.email : null,
    world: String(user.user_metadata?.world || '').toLowerCase() || null,
  };
}
