// cv6next — agents show as TITLES (roles), never their persona names (decided 2026-06-23).
// As Corner goes public, named-after-real-people is a liability and a name tells a new user
// nothing; a role does. Two things live here:
//   1. AGENT_TITLES — the FULL slug -> title map, so a name never leaks ANYWHERE (roster,
//      Catch Up feed, conversation headers).
//   2. DASHBOARD_AGENTS — the CURATED set (with order) shown in Home's "Agents" accordion.
//
// `aomOnly`-style agents (Systems) only exist as agents in the AOM internal world, so curating
// to agents actually present in this world's list keeps them out of external worlds naturally.

// Every agent we run -> its role title. Keep this complete so no persona name is ever shown.
export const AGENT_TITLES = {
  gary: 'Operations',
  rex: 'Assistant',
  elon: 'Systems',
  jacob: 'Outreach',
  alex: 'Strategy',
  steffen: 'Design',
  bobby: 'Web',
  cleo: 'Content',
  tony: 'Social',
  steve: 'QA',
  studio: 'Studio',
};

// The curated set shown in the Home Agents accordion, in display order. The roster is the
// FULL set every time (you reach them at different moments, so they show even when idle);
// `aomOnly` agents (Systems) appear only when they actually exist in this world's live list,
// which keeps them out of external/client worlds.
export const DASHBOARD_AGENTS = [
  { slug: 'bobby', order: 1 },
  { slug: 'cleo', order: 2 },
  { slug: 'steffen', order: 3 },
  { slug: 'gary', order: 4 },
  { slug: 'elon', order: 5, aomOnly: true },
  { slug: 'steve', order: 6 },
];

function agentKey(a) {
  return String((typeof a === 'string' ? a : (a?.slug || a?.id || a?.name)) || '').trim().toLowerCase();
}

function cap(s) { const v = String(s || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; }

// The title to SHOW for any agent (slug, name, or row). Falls back to a capitalized slug only
// if we somehow have no mapping (so it never renders blank), but the map should be complete.
export function titleForAgent(a) {
  const k = agentKey(a);
  return AGENT_TITLES[k] || cap(k) || 'Agent';
}

// Build the dashboard's curated agent roster, in order. The FULL set always shows (titles, with
// live status merged from the real agent list when present, else idle), so you see every agent
// you reach for even when they're quiet. `aomOnly` agents only show when they actually exist in
// this world's live list. Each row carries its real `slug` so the chat opens the right thread.
export function curateTitledAgents(agents = []) {
  const bySlug = {};
  for (const a of agents || []) bySlug[agentKey(a)] = a;
  const out = [];
  for (const d of DASHBOARD_AGENTS) {
    const live = bySlug[d.slug];
    if (d.aomOnly && !live) continue; // Systems only where it exists (the AOM world)
    out.push({
      ...(live || {}),
      slug: d.slug,
      title: AGENT_TITLES[d.slug] || cap(d.slug),
      status: live?.status || 'idle',
      unread: live?.unread || 0,
      _order: d.order,
    });
  }
  return out.sort((x, y) => x._order - y._order);
}
