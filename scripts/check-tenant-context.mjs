import assert from 'node:assert/strict'
import {
  normalizeTenantSlug,
  requestedTenantFromCompat,
  tenantCompatFields,
  uniqueAliases,
} from '../api/_lib/tenantContext.js'

assert.equal(normalizeTenantSlug('  Example-World  '), 'example-world')
assert.deepEqual(uniqueAliases(['world-a', 'WORLD-A', 'alias-b', '', null]), ['world-a', 'alias-b'])

assert.equal(requestedTenantFromCompat({ query: { world: 'legacy-world' } }), 'legacy-world')
assert.equal(requestedTenantFromCompat({ query: {}, body: { client_id: 'legacy-client' } }), 'legacy-client')
assert.equal(requestedTenantFromCompat({ query: {}, body: {}, fallback: 'fallback-world' }), 'fallback-world')

assert.deepEqual(tenantCompatFields({ tenantId: 'canonical-world' }), {
  tenant_id: 'canonical-world',
  tenant: 'canonical-world',
  world: 'canonical-world',
  world_id: 'canonical-world',
  client: 'canonical-world',
  client_id: 'canonical-world',
})

console.log('tenant context contract ok')
