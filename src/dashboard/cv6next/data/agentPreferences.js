// The room-specialist preference uses the bridge's canonical room keys exactly:
// agent:<slug> | project:<slug> | mission:<project>:<mission>.
// Agent 1:1 rooms do not expose this picker because the specialist is the room.

export function roomAgentPreferenceKey(room) {
  if (room?.isMission) {
    const canonical = String(room?.missionSlug || room?.id || '').trim();
    return canonical ? `mission:${canonical}` : '';
  }
  if (room?.isProject) {
    const slug = String(room?.projectSlug || room?.id || '').trim();
    return slug ? `project:${slug}` : '';
  }
  return '';
}

export function resolveEffectiveRoomAgent(assignments = {}, preferenceKey = '') {
  const own = String(assignments?.[preferenceKey] || '').trim().toLowerCase();
  return own ? { slug: own, source: 'room' } : { slug: 'default', source: 'default' };
}

export function dispatchAgentSlug(selection) {
  const slug = String(selection || '').trim().toLowerCase();
  return !slug || slug === 'default' ? 'corner' : slug;
}

// ── R-B1: every room has a host, never the generic EA by default ─────────
// A room's default host resolves from the room's own subject at creation, not
// a global fallback. `corner` and `elon` stop being the silent default for
// project and mission rooms. His existing pin still wins when set. The host
// is visible in the room header by title, so he always knows who he is talking to.
//
// Routing: agent 1:1 rooms are fixed to that agent. Project/mission rooms
// resolve via `resolveRoomHost` — subject-derived, defaulting to Creative
// (director) per "Creative Director goes FIRST on anything that will be seen"
// (agentTitles.js order 0, ratified 2026-08-06). Tunable via the routing keys in
// agentRouting.js; this is the host, not the per-message specialist.
//
export function resolveRoomHost(room) {
  if (!room) return 'director'
  // Agent 1:1 rooms — the agent IS the host
  if (room.isAgent || (!room.isProject && !room.isMission && room.id)) {
    const slug = String(room.id || room.slug || '').trim().toLowerCase()
    if (slug && slug !== 'corner' && slug !== 'elon') return slug
    // Bare agent rooms that somehow carry corner/elon still resolve to director
    // rather than the generic — 0 unpinned rooms fall back to corner/elon
    if (slug === 'corner' || slug === 'elon') return 'director'
  }
  if (room.isMission) {
    const missionSlug = String(room.missionSlug || room.id || '').toLowerCase()
    const projectSlug = String(room.projectSlug || '').toLowerCase()
    const combined = `${projectSlug}:${missionSlug}`
    // Subject heuristics — keep lightweight, routing accuracy is tunable (R-B2)
    if (/design|brand|visual|creative|logo|identity|style|mockup|figma/.test(combined)) return 'director'
    if (/web|site|code|build|app|engineer|system|infra/.test(combined)) return 'bobby'
    if (/content|video|edit|reel|footage|media|shoot/.test(combined)) return 'cleo'
    if (/outreach|lead|prospect|email|dm/.test(combined)) return 'jacob'
    if (/social|post|tiktok|insta|content.*social/.test(combined)) return 'tony'
    if (/operation|ops|delivery|priority|track/.test(combined)) return 'gary'
    // Default: Creative first on anything that will be seen — covers visual work
    return 'director'
  }
  if (room.isProject) {
    const slug = String(room.id || room.slug || room.projectSlug || '').toLowerCase()
    if (/design|brand|visual|creative/.test(slug)) return 'director'
    if (/web|site|code|app|tech/.test(slug)) return 'bobby'
    if (/content|video|media/.test(slug)) return 'cleo'
    if (/outreach|growth/.test(slug)) return 'jacob'
    // Default: Creative — any project may produce visible work, so Creative host
    // ensures the creative process is present before a pixel ships (R-B4 floor)
    return 'director'
  }
  return 'director'
}

// Resolve the effective agent for a turn: pinned preference wins, else host.
// This replaces the old `resolveEffectiveRoomAgent` → `dispatchAgentSlug` chain
// that fell back to `corner` for every unpinned room.
export function resolveEffectiveAgentForRoom(room, assignments = {}, preferenceKey = '') {
  const pinned = String(assignments?.[preferenceKey] || '').trim().toLowerCase()
  if (pinned && pinned !== 'default') return { slug: pinned, source: 'room' }
  const host = resolveRoomHost(room)
  return { slug: host, source: 'host' }
}
