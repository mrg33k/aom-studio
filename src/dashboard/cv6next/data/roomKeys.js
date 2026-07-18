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
