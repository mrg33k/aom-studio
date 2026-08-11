// Per-room agent selection. Mirrors modelPreferences.js: a project/mission room
// remembers WHICH agent it is talking to, keyed the same way the model preference
// is (project:<slug>), so the two choices are independent but stored the same way.
// 1:1 agent rooms don't use this — their agent IS the room.

export function roomAgentPreferenceKey(room) {
  if (!room?.isProject && !room?.isMission) return '';
  return `project:${room?.projectSlug || room?.id || ''}`;
}

// An explicit room agent wins; otherwise the room talks to the front desk
// ('corner'), which auto-routes — today's behavior for every project/mission room.
export function resolveEffectiveRoomAgent(agents = {}, preferenceKey = '') {
  const own = String(agents?.[preferenceKey] || '').trim().toLowerCase();
  if (own && own !== 'corner') return { slug: own, source: 'room' };
  return { slug: 'corner', source: 'default' };
}
