// Resolve which EA owns a project room — used by every chat-send path that
// targets a project (text chat, voice handoff, etc.) so all surfaces agree
// on the agent slug for a given (project, mission) tuple.
//
// Order of preference:
//   1. Corner-specific override: corner mission rooms have been answered by
//      Rex since the May-19 right-menu work; honor that continuity. Until
//      projects.team_members for corner includes 'rex', this is the only
//      way to keep history coherent in those rooms. Remove when team_members
//      is updated.
//   2. First slug in selectedProject.team_members that's a terminal EA in the
//      current agents list.
//   3. First slug in team_members that's any EA (non-terminal EAs count too).
//   4. Global fallback: first is_ea + is_terminal in the agents list.
//   5. Last resort: 'elon'.
//
// The general design intent is that each project should declare its EA via
// team_members ordering — the first EA slug there wins. Override #1 exists
// because corner's team_members is stale (missing 'rex'); the rest of the
// projects rely on the team_members path.
export function getProjectEA(project, agents) {
  if (!project || !Array.isArray(agents) || agents.length === 0) return null

  // Corner override — see top-of-file note. Remove once team_members fixed.
  if (project.slug === 'corner') {
    const rex = agents.find(a => a.slug === 'rex')
    if (rex) return 'rex'
  }

  const team = Array.isArray(project.team_members) ? project.team_members : []

  for (const slug of team) {
    const a = agents.find(x => x.slug === slug && x.is_ea && x.is_terminal)
    if (a) return a.slug
  }
  for (const slug of team) {
    const a = agents.find(x => x.slug === slug && x.is_ea)
    if (a) return a.slug
  }

  return (
    agents.find(a => a.is_ea && a.is_terminal)?.slug
    || agents.find(a => a.is_ea)?.slug
    || 'elon'
  )
}
