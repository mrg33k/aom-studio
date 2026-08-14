export function roomModelPreferenceKey(room) {
  if (!room?.isProject && !room?.isMission) return room?.id || '';
  return `project:${room?.projectSlug || room?.id || ''}`;
}

// Match the bridge's precedence: an explicit room model wins; "default" means
// inherit the workspace-wide `_all` choice; an unset/default workspace uses the
// automatic route — for now Muse Spark is the default (was Claude).
export function resolveEffectiveRoomModel(models = {}, preferenceKey = '') {
  const own = String(models?.[preferenceKey] || '').trim();
  const workspace = String(models?._all || '').trim();
  if (own && own !== 'default') return { id: own, source: 'room' };
  if (workspace && workspace !== 'default') return { id: workspace, source: 'workspace' };
  return { id: 'muse-spark', source: 'default-muse' };
}
