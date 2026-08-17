// Pure search shaping shared by the live command palette and node tests.
// Room identity is the product contract here: mission results must preserve the
// mission slug + parent project instead of collapsing into the project room.

export function fuzzySearchScore(query, value) {
  const needle = String(query || '').trim().toLowerCase();
  const haystack = String(value || '').trim().toLowerCase();
  if (!needle) return 0;
  if (!haystack) return null;
  if (haystack.startsWith(needle)) return 0;
  const containedAt = haystack.indexOf(needle);
  if (containedAt >= 0) return 10 + containedAt;
  let cursor = -1;
  let gaps = 0;
  for (const character of needle) {
    const next = haystack.indexOf(character, cursor + 1);
    if (next < 0) return null;
    if (cursor >= 0) gaps += next - cursor - 1;
    cursor = next;
  }
  return 100 + gaps + Math.max(0, haystack.length - needle.length) / 100;
}

function resultIdentity(result) {
  return `${result.kind}:${result.id}`;
}

function recentResult(room) {
  const kind = room.kind || (room.roomObj?.isMission ? 'mission' : room.roomObj?.isProject ? 'project' : 'agent');
  const id = kind === 'mission'
    ? (room.missionSlug || room.roomObj?.missionSlug || room.id)
    : (kind === 'agent' ? (room.agent || room.id) : (room.project || room.id));
  return {
    id,
    kind,
    type: kind === 'agent' ? 'room' : kind,
    initials: room.initials,
    title: room.name,
    meta: [room.author, room.preview, room.sub, room.age].filter(Boolean).join(' · '),
    room: room.roomObj || {
      id,
      name: room.name,
      initials: room.initials,
      ...(kind === 'project' ? { isProject: true } : {}),
      ...(kind === 'mission' ? { isMission: true, missionSlug: id, projectSlug: room.project } : {}),
    },
  };
}

export function buildSearchGroups({ query = '', agents = [], projects = [], byProject = {}, recent = [], actions = [] } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  const recentRank = new Map((recent || []).map((room, index) => [resultIdentity(recentResult(room)), index]));
  const rank = (result) => {
    const score = fuzzySearchScore(needle, `${result.title} ${result.meta || ''}`);
    if (score === null) return null;
    return score * 1000 + (recentRank.get(resultIdentity(result)) ?? 999);
  };
  const filterAndRank = (results) => results
    .map((result) => ({ result, score: rank(result) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => a.score - b.score)
    .map(({ result }) => result);

  const roomResults = [
    ...agents.map((agent) => ({
      id: agent.id,
      kind: 'agent',
      type: 'room',
      initials: agent.initials,
      title: agent.name,
      meta: agent.statusLabel ? agent.statusLabel.toLowerCase() : 'agent',
      status: agent.status,
      room: {
        id: agent.id,
        name: agent.name,
        initials: agent.initials,
        status: agent.status,
        statusText: agent.statusLabel,
        specialistTitle: agent.specialistTitle,
        hasCustomTitle: agent.hasCustomTitle,
      },
    })),
    ...projects.map((project) => ({
      id: project.id,
      kind: 'project',
      type: 'project',
      initials: (project.name || '?').slice(0, 2).toUpperCase(),
      title: project.name,
      meta: 'project',
      room: {
        id: project.slug || project.id,
        name: project.name,
        isProject: true,
        status: project.status,
      },
    })),
  ];

  const missionResults = [];
  for (const project of projects) {
    const missions = byProject[project.id] || byProject[project.slug] || [];
    const visit = (nodes) => {
      for (const mission of (nodes || [])) {
        {
          const rawSlug = mission.slug == null ? '' : String(mission.slug).trim();
          if (rawSlug && rawSlug !== 'undefined') {
            const projectSlug = project.slug || project.id;
            const missionSlug = rawSlug.includes(':') ? rawSlug : `${projectSlug}:${rawSlug}`;
            const name = mission.name || rawSlug.split(':').pop().replace(/[-_]/g, ' ');
            missionResults.push({
              id: missionSlug,
              kind: 'mission',
              type: 'mission',
              title: name,
              meta: `${project.name}${mission.status ? ` · ${mission.status}` : ''}`,
              room: {
                id: rawSlug,
                name,
                initials: name.slice(0, 2).toUpperCase(),
                isMission: true,
                missionSlug,
                projectSlug,
                status: mission.status,
                statusText: project.name,
                ...(mission.path ? { path: mission.path } : {}),
              },
            });
          }
        }
        if (Array.isArray(mission.children) && mission.children.length) visit(mission.children);
      }
    };
    visit(missions);
  }

  const actionResults = actions.map((action) => ({
    id: action.id,
    kind: 'action',
    type: 'action',
    title: action.title,
    meta: action.meta || 'Action',
    action: action.action || action.id,
  }));

  if (!needle && recent.length) {
    const seen = new Set();
    const recentResults = recent.map(recentResult).filter((result) => {
      const identity = resultIdentity(result);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, 12);
    const groups = [{ label: 'Recent', count: recentResults.length, results: recentResults }];
    if (actionResults.length) groups.push({ label: 'Actions', count: actionResults.length, results: actionResults });
    return groups;
  }

  const rankedRooms = filterAndRank(roomResults);
  const rankedMissions = filterAndRank(missionResults);
  const rankedActions = filterAndRank(actionResults);
  const groups = [];
  if (rankedRooms.length) groups.push({ label: 'Rooms', count: rankedRooms.length, results: rankedRooms });
  if (rankedMissions.length) groups.push({ label: 'Missions', count: rankedMissions.length, results: rankedMissions });
  if (rankedActions.length) groups.push({ label: 'Actions', count: rankedActions.length, results: rankedActions });
  return groups;
}
