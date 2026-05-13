// CV4 Sidebar — editorial-midnight convention-first left rail.
//
// R-CV4-3: refreshed visuals (Instrument Serif accents, hairline dividers,
// Hanken Grotesk body, AOM amber as the only accent), plus collapsible
// mission groups under each project. Selecting a mission opens its
// conversation AND emits onSelectMission so the composer pins the mission
// as context for the next message.

import { useState, useMemo, useCallback } from 'react'
import { useCornerAuth, useCornerData, useCornerNav } from '../CornerContext.jsx'
import { getMissionsForProject } from './missionsIndex.js'

function CaretIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function StatusPip({ status }) {
  const map = {
    ACTIVE: 'var(--cv4-status-active)',
    active: 'var(--cv4-status-active)',
    BUILDING: 'var(--cv4-status-building)',
    building: 'var(--cv4-status-building)',
    QUIET: 'var(--cv4-status-quiet)',
    quiet: 'var(--cv4-status-quiet)',
    IDLE: 'var(--cv4-status-quiet)',
    SHIPPED: 'var(--cv4-status-shipped)',
    shipped: 'var(--cv4-status-shipped)',
    QUEUED: 'var(--cv4-status-active)',
    queued: 'var(--cv4-status-active)',
    BLOCKED: 'var(--cv4-status-blocked)',
    blocked: 'var(--cv4-status-blocked)',
  }
  return (
    <span
      className="cv4-pip"
      style={{ backgroundColor: map[status] || 'var(--cv4-status-quiet)' }}
      title={status || 'idle'}
    />
  )
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9.5Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cv4-search__icon">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ProjectGroup({ project, isActive, isExpanded, onToggle, onSelectProject, selectedMissionSlug, onSelectMission }) {
  const missions = getMissionsForProject(project.slug)
  const showCaret = missions.length > 0

  return (
    <div>
      <div className="cv4-row" data-active={isActive ? 'true' : 'false'} style={{ paddingRight: 4 }}>
        {showCaret ? (
          <button
            className="cv4-caret"
            data-open={isExpanded ? 'true' : 'false'}
            onClick={(e) => { e.stopPropagation(); onToggle(project.slug) }}
            aria-label={isExpanded ? 'Collapse missions' : 'Expand missions'}
          >
            <CaretIcon />
          </button>
        ) : (
          <span style={{ width: 16, height: 16, flexShrink: 0 }} />
        )}
        <button
          onClick={() => onSelectProject(project)}
          data-testid={`cv4-sidebar-project-${project.slug}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            flex: 1, minWidth: 0, padding: 0, background: 'transparent', border: 0, color: 'inherit',
            font: 'inherit', textAlign: 'left', cursor: 'pointer',
          }}
        >
          <StatusPip status={project.status} />
          <span className="cv4-row__label">{project.name}</span>
        </button>
        {project.tasks?.length > 0 && (
          <span style={{
            fontFamily: 'var(--cv4-font-mono)',
            fontSize: 10,
            color: 'var(--cv4-bone-3)',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}>
            {project.tasks.length}
          </span>
        )}
      </div>

      {isExpanded && missions.length > 0 && (
        <div className="cv4-mission-group">
          {missions.map((m) => (
            <button
              key={m.slug}
              className="cv4-mission-row"
              data-active={selectedMissionSlug === `${project.slug}:${m.slug}` ? 'true' : 'false'}
              data-testid={`cv4-sidebar-mission-${project.slug}-${m.slug}`}
              onClick={() => onSelectMission(project, m)}
            >
              <StatusPip status={m.status} />
              <span className="cv4-mission-row__label">{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentRow({ agent, active, onClick }) {
  const initial = (agent.name || agent.slug || '?').charAt(0).toUpperCase()
  return (
    <button
      className="cv4-row"
      data-active={active ? 'true' : 'false'}
      data-testid={`cv4-sidebar-agent-${agent.slug}`}
      onClick={onClick}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 999,
        backgroundColor: agent.color || '#475569',
        color: 'white',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '0.01em',
      }}>{initial}</span>
      <span className="cv4-row__label" style={{ textTransform: 'capitalize' }}>{agent.name || agent.slug}</span>
    </button>
  )
}

export default function Sidebar({
  onOpenWorldSwitcher,
  onNewThread,
  onGoHome,
  onSelectMission,
  selectedMissionKey,
}) {
  const { currentUser, worldId } = useCornerAuth()
  const { agents = [], projectRooms = [] } = useCornerData()
  const {
    selectedAgent,
    conversationTarget,
    handleSelectAgent,
    handleSelectProject,
  } = useCornerNav()

  const [query, setQuery] = useState('')
  const [expandedProjects, setExpandedProjects] = useState(() => new Set())

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projectRooms
    const q = query.toLowerCase()
    return projectRooms.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q)
    )
  }, [projectRooms, query])

  const filteredAgents = useMemo(() => {
    if (!query.trim()) return agents
    const q = query.toLowerCase()
    return agents.filter((a) =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.slug || '').toLowerCase().includes(q)
    )
  }, [agents, query])

  const toggleProject = useCallback((slug) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }, [])

  // When searching, auto-expand projects that have matching missions
  const expandedDuringSearch = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    const set = new Set(expandedProjects)
    for (const p of projectRooms) {
      const matches = getMissionsForProject(p.slug).some((m) =>
        (m.name || '').toLowerCase().includes(q) || (m.slug || '').toLowerCase().includes(q)
      )
      if (matches) set.add(p.slug)
    }
    return set
  }, [query, projectRooms, expandedProjects])

  const effectiveExpanded = expandedDuringSearch || expandedProjects

  const activeProjectSlug = conversationTarget?.type === 'project' ? conversationTarget.slug : null
  const activeAgentSlug = selectedAgent?.slug || null
  const isHome = !selectedAgent && !conversationTarget

  const displayName = currentUser?.user_metadata?.full_name
    || currentUser?.email?.split('@')[0]
    || 'you'

  const handleSelectProjectInline = useCallback((project) => {
    handleSelectProject(project)
    onSelectMission?.(null)
  }, [handleSelectProject, onSelectMission])

  const handleSelectMissionInline = useCallback((project, mission) => {
    handleSelectProject(project)
    onSelectMission?.({ project, mission })
  }, [handleSelectProject, onSelectMission])

  return (
    <aside
      data-testid="cv4-sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: 282,
        flexShrink: 0,
        background: 'var(--cv4-ink-1)',
        borderRight: '1px solid var(--cv4-hair)',
      }}
    >
      {/* Header */}
      <div className="cv4-sidebar-header">
        <button
          onClick={onGoHome}
          style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', display: 'block' }}
          title="Home"
        >
          <span className="cv4-wordmark">
            Corner<span className="cv4-wordmark__dot">.</span>
          </span>
        </button>
        <button className="cv4-cta-new" onClick={onNewThread}>
          <PlusIcon />
          New thread
        </button>
      </div>

      {/* Search */}
      <div className="cv4-search">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, missions, agents"
          spellCheck="false"
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 8px' }}>
        {/* Home shortcut */}
        <button
          className="cv4-row"
          data-active={isHome ? 'true' : 'false'}
          data-testid="cv4-sidebar-home"
          onClick={onGoHome}
          style={{ marginBottom: 6 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, color: 'var(--cv4-bone-2)', flexShrink: 0 }}>
            <HomeIcon />
          </span>
          <span className="cv4-row__label">Home</span>
        </button>

        {filteredProjects.length > 0 && (
          <>
            <div className="cv4-section-label">
              <span><i>Projects</i></span>
              <span className="cv4-section-label__count">{filteredProjects.length.toString().padStart(2, '0')}</span>
            </div>
            <div>
              {filteredProjects.map((p) => (
                <ProjectGroup
                  key={p.slug || p.id}
                  project={p}
                  isActive={activeProjectSlug === p.slug}
                  isExpanded={effectiveExpanded.has(p.slug)}
                  onToggle={toggleProject}
                  onSelectProject={handleSelectProjectInline}
                  selectedMissionSlug={selectedMissionKey}
                  onSelectMission={handleSelectMissionInline}
                />
              ))}
            </div>
          </>
        )}

        {filteredAgents.length > 0 && (
          <>
            <div className="cv4-section-label">
              <span><i>Agents</i></span>
              <span className="cv4-section-label__count">{filteredAgents.length.toString().padStart(2, '0')}</span>
            </div>
            <div>
              {filteredAgents.map((a) => (
                <AgentRow
                  key={a.slug || a.id}
                  agent={a}
                  active={activeAgentSlug === a.slug}
                  onClick={() => {
                    handleSelectAgent(a)
                    onSelectMission?.(null)
                  }}
                />
              ))}
            </div>
          </>
        )}

        {filteredProjects.length === 0 && filteredAgents.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 12, color: 'var(--cv4-bone-3)' }}>
            No matches for <i style={{ fontFamily: 'var(--cv4-font-display)' }}>"{query}"</i>
          </div>
        )}
      </div>

      {/* Account */}
      <div style={{ borderTop: '1px solid var(--cv4-hair)' }}>
        <button className="cv4-account" onClick={onOpenWorldSwitcher} data-testid="cv4-sidebar-account">
          <span className="cv4-account__avatar">{displayName.charAt(0).toUpperCase()}</span>
          <span className="cv4-account__body">
            <span className="cv4-account__name">{displayName}</span>
            <span className="cv4-account__world">{worldId || 'no world'}</span>
          </span>
          <span style={{ color: 'var(--cv4-bone-3)', flexShrink: 0, display: 'inline-flex' }}>
            <ChevronDown />
          </span>
        </button>
      </div>
    </aside>
  )
}
