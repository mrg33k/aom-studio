function normalize(value) {
  return String(value || '').trim();
}

function missionTreeHas(nodes, candidates) {
  for (const node of (nodes || [])) {
    const slug = normalize(node?.slug);
    if (slug && candidates.has(slug)) return true;
    if (missionTreeHas(node?.children, candidates)) return true;
  }
  return false;
}

// Returns true/false when enough registry data is present, null when mission
// validation still needs the mission-tree response.
export function savedRoomExists(room, { agents = [], projects = [], missionTrees = null } = {}) {
  if (!room?.id) return false;
  const id = normalize(room.id);

  if (!room.isProject && !room.isMission) {
    return agents.some((agent) => normalize(agent.id) === id);
  }

  const projectSlug = normalize(room.projectSlug || (room.isProject ? id : normalize(room.missionSlug).split(':')[0]));
  const project = projects.find((item) => [item.id, item.slug].map(normalize).includes(projectSlug));
  if (!project) return false;
  if (room.isProject) return true;
  if (!missionTrees) return null;

  const full = normalize(room.missionSlug || id);
  const bare = full.includes(':') ? full.split(':').pop() : id.includes(':') ? id.split(':').pop() : id;
  const candidates = new Set([full, bare, `${projectSlug}:${bare}`].filter(Boolean));
  const tree = missionTrees[projectSlug] || missionTrees[normalize(project.slug)] || missionTrees[normalize(project.id)] || [];
  return missionTreeHas(tree, candidates);
}

export function missionTreesFromResponse(payload) {
  const out = {};
  for (const project of (payload?.projects || [])) {
    if (!project?.slug) continue;
    out[project.slug] = project.tree || project.missions || [];
  }
  return out;
}
