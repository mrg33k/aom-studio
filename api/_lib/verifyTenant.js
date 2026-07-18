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
//   3. Shared path:  requestedTenant is "shared:<slug>" and caller's world has
//                    a project_access row for the underlying project (added
//                    2026-05-24 to fix shared-room chat 403s — the world
//                    admin RPC can't match "shared:*" because no world has
//                    that slug; project_access is the real grant table).
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

async function getUserFromJwt(jwt) {
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

// For tenants of the form "shared:<project-slug>", check whether the caller's
// world has been granted access via the project_access table. Returns false on
// any error (missing project, no row, network failure) — caller falls through
// to the existing 403.
async function hasSharedProjectAccess(sharedTenant, callerWorld) {
  if (!callerWorld) return false;
  const projectSlug = sharedTenant.slice('shared:'.length);
  if (!projectSlug) return false;
  // Look up the project id by slug.
  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(projectSlug)}&select=id,client_id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!pr.ok) return false;
  const projects = await pr.json();
  if (!Array.isArray(projects) || projects.length === 0) return false;
  const { id: projectId, client_id: ownerWorld } = projects[0];
  // The owning world always has access to its own shared channel.
  if (ownerWorld && String(ownerWorld).toLowerCase() === callerWorld) return true;
  // Otherwise look for a project_access grant for the caller's world.
  const ar = await fetch(
    `${SUPABASE_URL}/rest/v1/project_access?project_id=eq.${projectId}&client_id=eq.${encodeURIComponent(callerWorld)}&select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!ar.ok) return false;
  const rows = await ar.json();
  return Array.isArray(rows) && rows.length > 0;
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
// Returns { ok: true, tenant, userId, isAdmin } on success.
// Throws TenantAuthError on missing/invalid JWT or cross-tenant denial.
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

  // Super-admin bypass: Patrik (and any future super-admin UID) can read
  // every tenant. Without this, the smoke-test harness can't impersonate
  // through Patrik's session, and the dashboard world-switcher is dead in
  // any world Patrik isn't explicitly a member of.
  if (user.id === SUPER_ADMIN_USER_ID) {
    return { ok: true, tenant, userId: user.id, isAdmin: true };
  }
  const callerWorld = String(user.user_metadata?.world || '').toLowerCase();
  if (callerWorld && callerWorld === tenant) {
    return { ok: true, tenant, userId: user.id, isAdmin: false };
  }
  if (await isWorldAdminForTenant(tenant, user.id)) {
    return { ok: true, tenant, userId: user.id, isAdmin: true };
  }
  if (tenant.startsWith('shared:') && await hasSharedProjectAccess(tenant, callerWorld)) {
    return { ok: true, tenant, userId: user.id, isAdmin: false };
  }
  throw new TenantAuthError(
    `forbidden: caller world "${callerWorld || '(none)'}" cannot access "${tenant}"`,
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
