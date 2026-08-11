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
