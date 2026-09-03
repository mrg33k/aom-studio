// Tenant alias resolution for the campaign and support endpoints. A caller may
// name a world by slug, by its old client id or by its Convex document id;
// this turns any of them into the canonical slug, then runs verifyTenant.
//
// corner:retire-supabase R3: the alias lookup used to read the Supabase worlds
// table. It now asks Convex (worlds:getBySlug, then worlds:resolveForSession
// for a document id).

import { verifyTenant, convexQuery } from './verifyTenant.js'

export class TenantContextError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'TenantContextError'
    this.status = status
  }
}

export function normalizeTenantSlug(value) {
  return String(value || '').trim().toLowerCase()
}

export function uniqueAliases(values) {
  const out = []
  const seen = new Set()
  for (const value of values || []) {
    const slug = normalizeTenantSlug(value)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push(slug)
  }
  return out
}

export function requestedTenantFromCompat({ query = {}, body = {}, fallback = '' } = {}) {
  return normalizeTenantSlug(
    query.tenant_id || query.tenant || query.world || query.world_id || query.client || query.client_id ||
    body.tenant_id || body.tenant || body.world || body.world_id || body.client || body.client_id ||
    fallback
  )
}

export function tenantCompatFields(tenantContext) {
  const tenantId = tenantContext?.tenantId || ''
  return {
    tenant_id: tenantId,
    tenant: tenantId,
    world: tenantId,
    world_id: tenantId,
    client: tenantId,
    client_id: tenantId,
  }
}

// Find the world the caller named. Returns { id, slug } or null.
async function fetchWorldAlias(requested) {
  if (!requested || requested.startsWith('shared:')) return null
  try {
    const bySlug = await convexQuery('worlds:getBySlug', { slug: requested })
    if (bySlug && bySlug.slug) return { id: String(bySlug._id), slug: String(bySlug.slug) }
  } catch {
    // fall through to the id path
  }
  try {
    // resolveForSession heals unknown ids into a default world; only a result
    // that was NOT healed means the id itself exists here.
    const byId = await convexQuery('worlds:resolveForSession', { worldId: requested })
    if (byId && byId.healed === false && byId.slug) return { id: String(byId.worldId), slug: String(byId.slug) }
  } catch {
    // unknown id
  }
  return null
}

export async function resolveTenantAlias(requestedTenant) {
  const requested = normalizeTenantSlug(requestedTenant)
  if (!requested) throw new TenantContextError('tenant required', 400)
  const world = await fetchWorldAlias(requested)
  if (!world) {
    return {
      tenantId: requested,
      canonicalSlug: requested,
      aliases: [requested],
    }
  }
  const canonicalSlug = normalizeTenantSlug(world.slug || requested)
  return {
    tenantId: canonicalSlug,
    canonicalSlug,
    aliases: uniqueAliases([requested, world.slug, world.id]),
  }
}

export async function resolveTenantContext(req, options = {}) {
  const body = options.body || req.body || {}
  const query = options.query || req.query || {}
  const requested = requestedTenantFromCompat({ query, body, fallback: options.fallback })
  if (!requested) throw new TenantContextError('tenant required', 400)

  const alias = await resolveTenantAlias(requested)
  const auth = await verifyTenant(alias.tenantId, req)
  return {
    ok: true,
    tenantId: alias.tenantId,
    canonicalSlug: alias.canonicalSlug,
    aliases: alias.aliases,
    userId: auth.userId,
    isAdmin: !!auth.isAdmin,
    compat: tenantCompatFields(alias),
  }
}

export function sendTenantContextError(res, error, fallbackStatus = 401, fallbackMessage = 'Sign in to the dashboard.') {
  const status = Number(error?.status || fallbackStatus)
  return res.status(status).json({ ok: false, error: error?.status ? error.message : fallbackMessage })
}

export function requiredEnvTenant(name) {
  const tenant = normalizeTenantSlug(process.env[name])
  if (!tenant) throw new TenantContextError(`${name} required`, 500)
  return tenant
}

export function requiredTenantFromEnv(names) {
  for (const name of names || []) {
    const tenant = normalizeTenantSlug(process.env[name])
    if (tenant) return tenant
  }
  throw new TenantContextError(`${(names || []).join(' or ')} required`, 500)
}
