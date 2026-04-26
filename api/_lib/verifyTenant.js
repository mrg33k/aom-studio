// Verify the JWT in a request proves the caller can access the requested tenant.
// Used by /api/dashboard/* endpoints that take tenant scope from URL/body and
// would otherwise leak across tenants because they query Supabase with the
// service-role key (bypassing RLS).
//
// Two-path authorization (mirrors RLS migration 029):
//   1. Primary path: caller's user_metadata.world matches requestedTenant.
//   2. Admin path:   public.is_world_admin_for_tenant(tenant, user_id) is true
//                    (Patrik is admin in every world; future tenant admins
//                    work the same way).
//
// Underscore-prefixed dir keeps this file out of Vercel's serverless routing.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const user = await getUserFromJwt(jwt);
  if (!user) throw new TenantAuthError('invalid jwt', 401);

  const callerWorld = String(user.user_metadata?.world || '').toLowerCase();
  if (callerWorld && callerWorld === tenant) {
    return { ok: true, tenant, userId: user.id, isAdmin: false };
  }
  if (await isWorldAdminForTenant(tenant, user.id)) {
    return { ok: true, tenant, userId: user.id, isAdmin: true };
  }
  throw new TenantAuthError(
    `forbidden: caller world "${callerWorld || '(none)'}" cannot access "${tenant}"`,
    403
  );
}
