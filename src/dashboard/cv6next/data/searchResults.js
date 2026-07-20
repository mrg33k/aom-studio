// Pure search shaping shared by the live command palette and node tests.
// Room identity is the product contract here: mission results must preserve the
// mission slug + parent project instead of collapsing into the project room.

export function buildSearchGroups({ query = '', agents = [], projects = [], byProject = {} } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  const match = (value) => !needle || String(value || '').toLowerCase().includes(needle);

  const roomResults = [
    ...agents.filter((agent) => match(agent.name)).map((agent) => ({
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
      },
    })),
    ...projects.filter((project) => match(project.name)).map((project) => ({
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
        if (match(mission.name || mission.slug)) {
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
              },
            });
          }
        }
        if (Array.isArray(mission.children) && mission.children.length) visit(mission.children);
      }
    };
    visit(missions);
  }

  const groups = [];
  if (roomResults.length) groups.push({ label: 'Rooms', count: roomResults.length, results: roomResults });
  if (missionResults.length) groups.push({ label: 'Missions', count: missionResults.length, results: missionResults });
  return groups;
}
