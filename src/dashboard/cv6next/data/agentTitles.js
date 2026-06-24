// cv6next — agents show as TITLES (roles), never their persona names (decided 2026-06-23).
// As Corner goes public, named-after-real-people is a liability and a name tells a new user
// nothing; a role does. The dashboard shows a CURATED set of agents by title, collapsed under
// one "Agents" accordion. Map is agent-slug -> { title, order }.
//
// `aomOnly` agents (Systems) only exist as agents in the AOM internal world, so curating to
// agents actually present in this world's list keeps them out of external worlds naturally.
export const AGENT_TITLES = {
  bobby: { title: 'Web', order: 1 },
  cleo: { title: 'Content', order: 2 },
  steffen: { title: 'Design', order: 3 },
  gary: { title: 'Operations', order: 4 },
  elon: { title: 'Systems', order: 5, aomOnly: true },
  steve: { title: 'QA', order: 6 },
};

function agentKey(a) {
  return String(a?.slug || a?.id || a?.name || '').trim().toLowerCase();
}

// Curate a raw agent list down to the dashboard's titled set, in title order. Names become
// titles; agents not in the map are dropped. Each returned agent carries its real `slug` (so
// the chat still opens the right thread) plus `title`.
export function curateTitledAgents(agents = []) {
  const out = [];
  for (const a of agents || []) {
    const meta = AGENT_TITLES[agentKey(a)];
    if (!meta) continue;
    out.push({ ...a, slug: a.slug || a.id || agentKey(a), title: meta.title, _order: meta.order });
  }
  out.sort((x, y) => x._order - y._order);
  return out;
}
