// cv6next — agents show as TITLES (roles), never their persona names (decided 2026-06-23).
// As Corner goes public, named-after-real-people is a liability and a name tells a new user
// nothing; a role does. Two things live here:
//   1. AGENT_TITLES — the FULL slug -> title map, so a name never leaks ANYWHERE (roster,
//      Catch Up feed, conversation headers).
//   2. DASHBOARD_ORDER — the CURATED subset (with order) shown in Home's "Agents" accordion.
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

// The curated set shown in the Home Agents accordion, in display order.
export const DASHBOARD_ORDER = { bobby: 1, cleo: 2, steffen: 3, gary: 4, elon: 5, steve: 6 };

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

// Curate a raw agent list down to the dashboard's accordion set, in order. Names become titles;
// agents not in the curated set are dropped. Each returned agent carries its real `slug` (so the
// chat still opens the right thread) plus `title`.
export function curateTitledAgents(agents = []) {
  const out = [];
  for (const a of agents || []) {
    const k = agentKey(a);
    const order = DASHBOARD_ORDER[k];
    if (!order) continue;
    out.push({ ...a, slug: a.slug || a.id || k, title: titleForAgent(a), _order: order });
  }
  out.sort((x, y) => x._order - y._order);
  return out;
}
