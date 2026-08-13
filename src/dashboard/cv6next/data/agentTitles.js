// cv6next — agents show as TITLES (roles), never their persona names (decided 2026-06-23).
// As Corner goes public, named-after-real-people is a liability and a name tells a new user
// nothing; a role does. Two things live here:
//   1. AGENT_TITLES — the FULL slug -> title map, so a name never leaks ANYWHERE (roster,
//      Catch Up feed, conversation headers).
//   2. DASHBOARD_AGENTS — the ordered set shown in Home's "Agents" accordion.
//
// R1 corner:agent-direct-chats: the old dashboard set was a hard-coded six-agent subset,
// while assignment flows loaded the broader agent roster. Keep the title/privacy doctrine,
// but make every known or live agent discoverable from the agent list too.

import agentProfiles from '../../../data/agent-profiles.js';

// Every agent we run -> its role title. Keep this complete so no persona name is ever shown.
const TITLE_OVERRIDES = {
  director: 'Creative',
  gary: 'Operations',
  rex: 'Assistant',
  elon: 'Systems',
  jacob: 'Outreach',
  alex: 'Strategy',
  steffen: 'Design',
  bobby: 'Web',
  cleo: 'Content',
  tony: 'Social',
  steve: 'Advisory',
  elmo: 'QA',
  pixel: 'Media',
  studio: 'Studio',
};

export const AGENT_TITLES = {
  ...Object.fromEntries((agentProfiles || []).map((a) => [a.slug, TITLE_OVERRIDES[a.slug] || a.role || a.slug])),
  ...TITLE_OVERRIDES,
};

// Full dashboard roster, in a practical working order. Live agent rows not in this list are
// appended by curateTitledAgents(), so tenant-created agents are not hidden either.
export const DASHBOARD_AGENTS = [
  // Creative Director goes FIRST on anything that will be seen (ratified
  // 2026-08-06), so it leads the roster. order 0 keeps the diff to one line.
  // It was scaffolded on disk with a full role definition but never registered,
  // so it could not render at all until 2026-08-07.
  { slug: 'director', order: 0 },
  { slug: 'bobby', order: 1 },
  { slug: 'cleo', order: 2 },
  { slug: 'steffen', order: 3 },
  { slug: 'gary', order: 4 },
  { slug: 'elon', order: 5 },
  { slug: 'rex', order: 6 },
  { slug: 'jacob', order: 7 },
  { slug: 'tony', order: 8 },
  { slug: 'alex', order: 9 },
  { slug: 'steve', order: 10 },
  { slug: 'elmo', order: 11 },
  { slug: 'pixel', order: 12 },
];

function agentKey(a) {
  return String((typeof a === 'string' ? a : (a?.slug || a?.id || a?.name)) || '').trim().toLowerCase();
}

function cap(s) { const v = String(s || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; }

// The title to SHOW for any agent (slug, name, or row). Falls back to a capitalized slug only
// if we somehow have no mapping (so it never renders blank), but the map should be complete.
export function titleForAgent(a) {
  const k = agentKey(a);
  const custom = typeof a === 'object' ? String(a?.chatTitle || '').trim() : '';
  if (custom) return custom;
  return AGENT_TITLES[k] || cap(k) || 'Agent';
}

// Build the dashboard's curated agent roster, in order.
// AOM world: the FULL hard-coded set always shows (titles, with live status merged
// from the real agent list when present, else ready). Tenant-created agents are
// appended after the curated set.
// Non-AOM worlds: ONLY the agents from Supabase agent_status for this client_id
// are shown; the hard-coded roster is skipped entirely so a fresh tenant sees
// exactly their own agents (e.g. just the EA), not the 13-agent AOM roster.
// Display names for non-AOM agents prefer agent_status.name over the slug.
export function curateTitledAgents(agents = [], { isAom = true } = {}) {
  const bySlug = {};
  for (const a of agents || []) bySlug[agentKey(a)] = a;
  const out = [];
  // Walk the hard-coded roster only for the AOM world.
  if (isAom) {
    for (const d of DASHBOARD_AGENTS) {
      const live = bySlug[d.slug];
      const specialistTitle = AGENT_TITLES[d.slug] || cap(d.slug);
      const chatTitle = String(live?.chatTitle || '').trim();
      out.push({
        ...(live || {}),
        slug: d.slug,
        title: chatTitle || specialistTitle,
        specialistTitle,
        chatTitle: chatTitle || null,
        hasCustomTitle: !!chatTitle,
        status: live?.status || 'ready',
        unread: live?.unread || 0,
        _order: d.order,
      });
    }
  }
  for (const [slug, live] of Object.entries(bySlug)) {
    if (!slug || out.some((a) => a.slug === slug)) continue;
    const specialistTitle = AGENT_TITLES[slug] || cap(slug);
    const chatTitle = String(live?.chatTitle || '').trim();
    // Non-AOM worlds: prefer agent_status.name (e.g. "Demo EA") over the slug fallback.
    const agentName = !isAom ? String(live?.name || '').trim() : '';
    out.push({
      ...(live || {}),
      slug,
      title: chatTitle || agentName || specialistTitle,
      specialistTitle: agentName || specialistTitle,
      chatTitle: chatTitle || null,
      hasCustomTitle: !!chatTitle,
      status: live?.status || 'ready',
      unread: live?.unread || 0,
      _order: isAom ? (1000 + out.length) : out.length,
    });
  }
  return out.sort((x, y) => x._order - y._order);
}

export const AGENT_PICKER_BLURBS = {
  director: 'Sets the creative direction before anything gets designed.',
  gary: 'Runs delivery, priorities, and keeps the business on track.',
  elon: 'Keeps the whole system healthy and points work to the right place.',
  rex: 'Handles the day-to-day and keeps the work moving.',
  jacob: 'Finds leads and writes the outreach that starts conversations.',
  alex: 'Sharpens strategy, positioning, and the numbers behind a deal.',
  steffen: 'Owns brand, visual identity, and design decisions.',
  bobby: 'Builds and ships websites and app screens.',
  cleo: 'Turns raw footage into finished, platform-ready video.',
  tony: 'Plans and posts social content across platforms.',
  steve: 'Advises on technology, checks quality, and builds the pitch.',
  elmo: 'Reviews and QAs work before it ships.',
  pixel: 'Generates images, thumbnails, and media assets.',
};

const ROOM_DEFAULT_ENTRY = {
  slug: 'default',
  title: 'Room default',
  blurb: 'Use this room’s own specialist identity.',
};

// The API supplies the live, tenant-scoped roster. Do not inflate it with the
// hard-coded dashboard roster here: the 72-hour upgrade sweep and agent_status are
// the source of truth for who can answer right now.
export function pickerAgents(agents = []) {
  const roster = (agents || []).map((a) => ({
    slug: String(a.slug || '').trim().toLowerCase(),
    title: a.title || titleForAgent(a),
    blurb: AGENT_PICKER_BLURBS[a.slug] || a.role || `Talk to ${a.title || a.slug}.`,
  })).filter((a) => a.slug && a.slug !== 'default');
  return [ROOM_DEFAULT_ENTRY, ...roster];
}
