// CV4 Missions Index — mock data layer.
//
// R-CV4-3 (2026-05-12): seeded from the actual mission folders under
// corner/users/aom/projects/<slug>/missions/ as of this date, plus a small
// set for Corner platform missions. Static JS for now so the visual + UX
// of "click mission, attach to next message" can ship without an API.
//
// Replace with a real source (Supabase agent_status type='mission' rows OR
// a build-time generated public/data/missions.json) in a follow-up round.
//
// Shape: { [projectSlug]: [{ slug, name, status }] }
// status: 'active' | 'building' | 'shipped' | 'queued' | 'blocked'

const MISSIONS_BY_PROJECT = {
  'ambition-mechanical': [
    { slug: 'google-ads-launch', name: 'Google Ads launch', status: 'active' },
    { slug: 'website-r4', name: 'Website R4 polish', status: 'building' },
    { slug: 'social-flywheel', name: 'Social flywheel', status: 'queued' },
  ],
  'space-rising': [
    { slug: 'launch-readiness', name: 'Launch readiness', status: 'active' },
    { slug: 'directory-onboarding', name: 'Directory onboarding', status: 'building' },
    { slug: 'tagline-research', name: 'Tagline research', status: 'shipped' },
  ],
  's3c': [
    { slug: 'rebrand-rollout', name: 'Rebrand rollout', status: 'active' },
  ],
  'kohrs': [
    { slug: 'cleo-pala-edits', name: 'PALA video edits', status: 'building' },
    { slug: 'site-refresh', name: 'Site refresh', status: 'queued' },
  ],
  'pala': [
    { slug: 'round-six-edits', name: 'Round 6 edits', status: 'building' },
    { slug: 'menu-revision', name: 'Menu revision', status: 'queued' },
  ],
  'isa-energy': [
    { slug: 'pricing-analysis', name: 'Pricing analysis', status: 'active' },
    { slug: 'gaia-video-pipeline', name: 'Gaia video pipeline', status: 'building' },
  ],
  'skylar': [
    { slug: 'content-pipeline', name: 'Content pipeline', status: 'building' },
  ],
  'intelliplay': [
    { slug: 'launch-collateral', name: 'Launch collateral', status: 'queued' },
  ],
  'included-health': [
    { slug: 'brand-system', name: 'Brand system', status: 'queued' },
  ],
  'brandon-wiley-documentary': [
    { slug: 'lbx-rollout', name: 'LBX rollout', status: 'active' },
  ],
  'conrad-foundation': [
    { slug: 'water-masterclass', name: 'Water masterclass', status: 'queued' },
  ],
  // AOM-internal / Corner platform projects (when those project rooms are visible)
  'aom': [
    { slug: 'aom-website', name: 'aheadofmarket.com', status: 'active' },
    { slug: 'aom-strategy', name: 'AOM strategy', status: 'building' },
    { slug: 'brand-identity-rewrite', name: 'Brand identity rewrite', status: 'queued' },
  ],
  'corner': [
    { slug: 'launch-mvp', name: 'Launch MVP', status: 'active' },
    { slug: 'agentic-os-substrate', name: 'Agentic OS substrate', status: 'building' },
    { slug: 'self-healing-chats', name: 'Self-healing chats', status: 'building' },
    { slug: 'integrations', name: 'Integrations', status: 'building' },
    { slug: 'shared-rooms', name: 'Shared rooms', status: 'queued' },
    { slug: 'world-picker', name: 'World picker', status: 'queued' },
    { slug: 'phone-recording', name: 'Phone recording', status: 'queued' },
  ],
}

export function getMissionsForProject(projectSlug) {
  if (!projectSlug) return []
  return MISSIONS_BY_PROJECT[projectSlug] || []
}

export function hasMissions(projectSlug) {
  return getMissionsForProject(projectSlug).length > 0
}
