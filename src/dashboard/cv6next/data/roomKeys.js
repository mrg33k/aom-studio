// roomKeys.js — pure room-shape helpers. No imports so node:test can exercise
// them directly (tests/api/_lib/roomKeys.test.js).

// Which project does this room belong to? Rooms arrive in several shapes
// (home recent entries, knav rooms, chat hosts): mission rooms carry
// projectSlug/project, project rooms ARE the project (id/slug). Review/Files
// handoffs must carry this so the Files tree follows the reviewed file instead
// of staying on whatever project was last open (qa-sweep 2026-07-17 RC3).
export function roomProjectSlug(room) {
  if (!room || typeof room !== 'object') return '';
  if (room.isMission || room.kind === 'mission') return room.projectSlug || room.project || '';
  if (room.isProject || room.kind === 'project') return room.id || room.slug || room.project || '';
  return room.projectSlug || room.project || '';
}

// One Home entry per mission room regardless of which slug form a writer lane
// stamped (bare "summerschool" vs composite "aheadofmarket.com:summerschool" —
// qa-sweep WATCH tick 10 caught the same room twice in the recent rail). Key
// recency maps by the bare tail so both forms merge; display fields keep the
// original slug.
export function missionRecencyKey(slug) {
  const s = String(slug || '').trim();
  if (!s) return '';
  return s.includes(':') ? s.split(':').pop() : s;
}

// User checklists are a separate, private room notebook. Keep their room keys
// explicit so Corner's agent room, Corner's project chat, and a mission inside
// that project can never share a bucket by accident.
export function roomChecklistKey(room) {
  if (!room || typeof room !== 'object') return '';
  if (room.isMission || room.kind === 'mission') {
    const slug = String(room.missionSlug || room.slug || room.id || '').trim();
    if (!slug) return '';
    const project = String(room.projectSlug || room.project || '').trim();
    const full = slug.includes(':') || !project ? slug : `${project}:${slug}`;
    return `mission:${full}`;
  }
  if (room.isProject || room.kind === 'project') {
    const slug = String(room.slug || room.id || room.project || '').trim();
    return slug ? `project:${slug}` : '';
  }
  const slug = String(room.slug || room.id || room.agent || '').trim();
  return slug ? `agent:${slug}` : '';
}

export function roomChecklistLabel(room) {
  const name = String(room?.name || room?.title || '').trim();
  if (name) return name;
  const key = roomChecklistKey(room);
  return key ? key.slice(key.indexOf(':') + 1).split(':').pop().replace(/[-_]/g, ' ') : 'Room';
}

// Build the share picker from the whole directory, including nested missions.
// It deliberately ignores visual expansion state: a closed folder is still a
// valid destination.
export function buildChecklistRoomOptions(agents = [], projects = [], missionsByProject = {}) {
  const rooms = [];
  for (const agent of (agents || [])) rooms.push({ ...agent, id: agent.id || agent.slug, slug: agent.slug || agent.id });
  for (const project of (projects || [])) {
    const projectSlug = project.slug || project.id;
    if (!projectSlug) continue;
    rooms.push({ ...project, id: projectSlug, slug: projectSlug, isProject: true });
    const walk = (nodes) => {
      for (const mission of (nodes || [])) {
        const raw = String(mission?.slug || '').trim();
        if (raw) {
          const missionSlug = raw.includes(':') ? raw : `${projectSlug}:${raw}`;
          rooms.push({
            id: missionSlug.split(':').pop(),
            name: mission.name || mission.title || missionSlug.split(':').pop().replace(/[-_]/g, ' '),
            isMission: true,
            missionSlug,
            projectSlug,
          });
        }
        if (Array.isArray(mission?.children)) walk(mission.children);
      }
    };
    walk(missionsByProject?.[projectSlug] || []);
  }
  const seen = new Set();
  return rooms.filter((room) => {
    const key = roomChecklistKey(room);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
