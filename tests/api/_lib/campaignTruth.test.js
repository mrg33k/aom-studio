import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { buildCampaignSetupTruth } from '../../../api/_lib/campaignTruth.js'

const tenantContext = {
  tenantId: 'canonical-world',
  canonicalSlug: 'canonical-world',
  aliases: ['canonical-world', 'legacy-world', 'world-uuid'],
  userId: 'user-one',
}

test('campaign setup is configured when campaigns are stamped with a tenant alias', () => {
  const truth = buildCampaignSetupTruth({
    tenantContext,
    campaigns: [
      {
        id: 'campaign-1',
        name: 'Spring outreach',
        world: 'legacy-world',
        status: 'active',
      },
    ],
  })

  assert.equal(truth.contract, 'corner.campaign_setup_truth.v1')
  assert.equal(truth.status, 'configured')
  assert.equal(truth.configured, true)
  assert.equal(truth.campaign_count, 1)
  assert.deepEqual(truth.found_worlds, ['legacy-world'])
})

test('campaign setup is not configured when no tenant campaigns are found', () => {
  const truth = buildCampaignSetupTruth({ tenantContext, campaigns: [] })

  assert.equal(truth.status, 'not_configured')
  assert.equal(truth.configured, false)
  assert.equal(truth.campaign_count, 0)
  assert.equal(truth.misfiled_count, 0)
})

test('campaign setup is misfiled when scoped candidate campaigns live outside aliases', () => {
  const truth = buildCampaignSetupTruth({
    tenantContext,
    campaigns: [],
    misfiledCampaigns: [
      {
        id: 'campaign-2',
        name: 'Directory outreach',
        slug: 'directory-outreach',
        world: 'stale-workspace-key',
        status: 'active',
        created_at: '2026-07-14T18:00:00.000Z',
      },
    ],
  })

  assert.equal(truth.status, 'misfiled')
  assert.equal(truth.configured, false)
  assert.equal(truth.misfiled_count, 1)
  assert.equal(truth.reason, 'campaigns_found_outside_tenant_aliases')
  assert.deepEqual(truth.found_worlds, ['stale-workspace-key'])
  assert.deepEqual(truth.misfiled_campaigns, [
    {
      id: 'campaign-2',
      name: 'Directory outreach',
      slug: 'directory-outreach',
      world: 'stale-workspace-key',
      status: 'active',
      created_at: '2026-07-14T18:00:00.000Z',
      updated_at: null,
    },
  ])
})
