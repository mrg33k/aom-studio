// URL contract for a dedicated desktop chat window. Room identity is explicit
// and reloadable; tenant authority is intentionally NOT encoded here — the
// child window resolves its world from the same authenticated tenant context.

function clean(value) { return String(value || '').trim(); }

export function chatWindowRouteFromSearch(search = '') {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  if (params.get('popout') !== '1' || params.get('view') !== 'chat') return null;
  const id = clean(params.get('room'));
  if (!id) return null;
  const kind = clean(params.get('kind'));
  const name = clean(params.get('name')) || id;
  const missionSlug = clean(params.get('mission'));
  const projectSlug = clean(params.get('project'));
  return {
    room: {
      id,
      name,
      initials: clean(params.get('initials')) || name.slice(0, 2).toUpperCase(),
      isProject: kind === 'project',
      isMission: kind === 'mission',
      missionSlug: kind === 'mission' ? (missionSlug || id) : undefined,
      projectSlug: kind === 'mission' ? (projectSlug || (missionSlug.includes(':') ? missionSlug.split(':')[0] : '')) : undefined,
      status: clean(params.get('status')) || 'ready',
      statusText: clean(params.get('sub')) || (kind === 'project' ? 'project chat' : kind === 'mission' ? projectSlug : 'conversation'),
    },
  };
}

export function chatWindowUrl(room, baseHref) {
  if (!room?.id) return '';
  const fallback = 'http://localhost/dashboard';
  const url = new URL(baseHref || (typeof window !== 'undefined' ? window.location.href : fallback), fallback);
  const kind = room.isMission ? 'mission' : room.isProject ? 'project' : 'agent';
  url.search = '';
  url.hash = '';
  url.searchParams.set('cv6', '1');
  url.searchParams.set('view', 'chat');
  url.searchParams.set('popout', '1');
  url.searchParams.set('kind', kind);
  url.searchParams.set('room', clean(room.id));
  url.searchParams.set('name', clean(room.name) || clean(room.id));
  if (room.initials) url.searchParams.set('initials', clean(room.initials));
  if (room.status) url.searchParams.set('status', clean(room.status));
  if (room.statusText) url.searchParams.set('sub', clean(room.statusText));
  if (kind === 'mission') {
    url.searchParams.set('mission', clean(room.missionSlug || room.id));
    if (room.projectSlug) url.searchParams.set('project', clean(room.projectSlug));
  }
  return url.toString();
}

export function chatWindowName(room, worldId = '') {
  const kind = room?.isMission ? 'mission' : room?.isProject ? 'project' : 'agent';
  const raw = `corner-chat-${worldId}-${kind}-${room?.missionSlug || room?.id || 'room'}`;
  return raw.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').slice(0, 110);
}
