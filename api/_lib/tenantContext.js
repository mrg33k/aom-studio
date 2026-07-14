import { verifyTenant } from './verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

function dbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function fetchWorldAlias(requested) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !requested || requested.startsWith('shared:')) return null
  try {
    const eq = encodeURIComponent(requested)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?or=(slug.eq.${eq},client_id.eq.${eq},id.eq.${eq})&select=id,slug,client_id&limit=1`,
      { headers: dbHeaders() },
    )
    if (!response.ok) return null
    const rows = await response.json()
    return Array.isArray(rows) && rows.length ? rows[0] : null
  } catch {
    return null
  }
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
  const canonicalSlug = normalizeTenantSlug(world.slug || world.client_id || requested)
  return {
    tenantId: canonicalSlug,
    canonicalSlug,
    aliases: uniqueAliases([requested, world.slug, world.client_id, world.id]),
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
