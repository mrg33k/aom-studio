import { normalizeTenantSlug, uniqueAliases } from './tenantContext.js'

export const CAMPAIGN_TRUTH_CONTRACT = 'corner.campaign_setup_truth.v1'

function clean(value) {
  return normalizeTenantSlug(value)
}

function campaignWorld(row) {
  return clean(row?.world || row?.tenant_id || row?.client_id || row?.world_id)
}

function publicCampaignRow(row) {
  if (!row) return null
  return {
    id: row.id || null,
    name: row.name || '',
    slug: row.slug || '',
    world: campaignWorld(row),
    status: row.status || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }
}

export function buildCampaignSetupTruth({
  tenantContext,
  campaigns = [],
  misfiledCampaigns = [],
} = {}) {
  const tenantId = clean(tenantContext?.tenantId || tenantContext?.tenant_id)
  const aliases = uniqueAliases([
    tenantId,
    tenantContext?.canonicalSlug,
    ...(tenantContext?.aliases || []),
  ])
  const aliasSet = new Set(aliases)
  const matching = (campaigns || []).filter(row => aliasSet.has(campaignWorld(row)))
  const misplaced = (misfiledCampaigns || []).filter(row => {
    const world = campaignWorld(row)
    return world && !aliasSet.has(world)
  })

  const status = matching.length
    ? 'configured'
    : misplaced.length
      ? 'misfiled'
      : 'not_configured'

  return {
    contract: CAMPAIGN_TRUTH_CONTRACT,
    status,
    configured: status === 'configured',
    tenant_id: tenantId,
    canonical_slug: clean(tenantContext?.canonicalSlug || tenantId),
    aliases,
    campaign_count: matching.length,
    misfiled_count: misplaced.length,
    expected_worlds: aliases,
    found_worlds: uniqueAliases([
      ...matching.map(campaignWorld),
      ...misplaced.map(campaignWorld),
    ]),
    misfiled_campaigns: misplaced.map(publicCampaignRow).filter(Boolean),
    reason: status === 'configured'
      ? 'campaigns_found_for_tenant'
      : status === 'misfiled'
        ? 'campaigns_found_outside_tenant_aliases'
        : 'no_campaigns_found_for_tenant',
  }
}
