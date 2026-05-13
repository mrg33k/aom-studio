// CV4 Sidebar — convention-first left rail.
// Holds projects + agents + account switcher. Mirrors the ChatGPT/Claude.ai
// organizational flow Patrik ratified in corner/VISION.md 2026-05-12.

import { useState, useMemo } from 'react'
import { useCornerAuth, useCornerData, useCornerNav } from '../CornerContext.jsx'
import { AomLogo } from '../components/cv3/icons.jsx'
import { getStatusCfg } from '../lib/cv3Colors.js'

function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-aom-text-muted">
      {children}
    </div>
  )
}

function StatusPip({ status }) {
  const cfg = getStatusCfg(status)
  return (
    <span
      className="inline-block size-[6px] rounded-full flex-shrink-0"
      style={{ backgroundColor: cfg.color }}
      title={cfg.label}
    />
  )
}

function ProjectRow({ project, active, onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid={`cv4-sidebar-project-${project.slug}`}
      className={[
        'group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors',
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-aom-text-light/85 hover:bg-white/[0.04] hover:text-white',
      ].join(' ')}
    >
      <StatusPip status={project.status} />
      <span className="flex-1 truncate font-medium">{project.name}</span>
      {project.tasks?.length > 0 && (
        <span className="rounded bg-aom-orange/15 px-1.5 py-0.5 text-[10px] font-bold text-aom-orange">
          {project.tasks.length}
        </span>
      )}
    </button>
  )
}

function AgentRow({ agent, active, onClick }) {
  const initial = (agent.name || agent.slug || '?').charAt(0).toUpperCase()
  return (
    <button
      onClick={onClick}
      data-testid={`cv4-sidebar-agent-${agent.slug}`}
      className={[
        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-aom-text-light/85 hover:bg-white/[0.04] hover:text-white',
      ].join(' ')}
    >
      <span
        className="flex size-[22px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white/95"
        style={{ backgroundColor: agent.color || '#475569' }}
      >
        {initial}
      </span>
      <span className="flex-1 truncate font-medium capitalize">{agent.name || agent.slug}</span>
    </button>
  )
}

export default function Sidebar({ onOpenWorldSwitcher, onNewThread, onGoHome }) {
  const { currentUser, worldId } = useCornerAuth()
  const { agents = [], projectRooms = [] } = useCornerData()
  const {
    selectedAgent,
    conversationTarget,
    handleSelectAgent,
    handleSelectProject,
  } = useCornerNav()

  const [query, setQuery] = useState('')

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projectRooms
    const q = query.toLowerCase()
    return projectRooms.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q)
    )
  }, [projectRooms, query])

  const filteredAgents = useMemo(() => {
    if (!query.trim()) return agents
    const q = query.toLowerCase()
    return agents.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.slug || '').toLowerCase().includes(q)
    )
  }, [agents, query])

  const activeProjectSlug = conversationTarget?.type === 'project' ? conversationTarget.slug : null
  const activeAgentSlug = selectedAgent?.slug || null
  const isHome = !selectedAgent && !conversationTarget

  const displayName = currentUser?.user_metadata?.full_name
    || currentUser?.email?.split('@')[0]
    || 'you'

  return (
    <aside
      data-testid="cv4-sidebar"
      className="flex h-full w-[268px] flex-shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0d14] text-aom-text-light"
    >
      {/* Header: logo + new thread */}
      <div className="flex-shrink-0 px-4 pb-3 pt-4">
        <button
          onClick={onGoHome}
          className={[
            'flex w-full items-center gap-2 rounded-md py-1 transition-opacity',
            isHome ? 'opacity-100' : 'opacity-90 hover:opacity-100',
          ].join(' ')}
          title="Home"
        >
          <AomLogo />
        </button>
        <button
          onClick={onNewThread}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-[13px] font-semibold text-aom-text-light transition-colors hover:border-white/[0.18] hover:bg-white/[0.07]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New thread
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-black/30 px-2.5 py-1.5 focus-within:border-white/[0.18]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-shrink-0 text-aom-text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[12px] text-aom-text-light placeholder:text-aom-text-muted/70 focus:outline-none"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Home shortcut */}
        <button
          onClick={onGoHome}
          data-testid="cv4-sidebar-home"
          className={[
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
            isHome
              ? 'bg-white/[0.08] text-white'
              : 'text-aom-text-light/85 hover:bg-white/[0.04] hover:text-white',
          ].join(' ')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="flex-1 truncate font-medium">Home</span>
        </button>

        {filteredProjects.length > 0 && (
          <>
            <SectionLabel>Projects</SectionLabel>
            <div className="flex flex-col gap-px">
              {filteredProjects.map((p) => (
                <ProjectRow
                  key={p.slug || p.id}
                  project={p}
                  active={activeProjectSlug === p.slug}
                  onClick={() => handleSelectProject(p)}
                />
              ))}
            </div>
          </>
        )}

        {filteredAgents.length > 0 && (
          <>
            <SectionLabel>Agents</SectionLabel>
            <div className="flex flex-col gap-px">
              {filteredAgents.map((a) => (
                <AgentRow
                  key={a.slug || a.id}
                  agent={a}
                  active={activeAgentSlug === a.slug}
                  onClick={() => handleSelectAgent(a)}
                />
              ))}
            </div>
          </>
        )}

        {filteredProjects.length === 0 && filteredAgents.length === 0 && (
          <div className="px-3 py-6 text-center text-[12px] text-aom-text-muted">
            No matches for "{query}"
          </div>
        )}
      </div>

      {/* Account switcher */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-2 py-2">
        <button
          onClick={onOpenWorldSwitcher}
          data-testid="cv4-sidebar-account"
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-full bg-aom-orange/90 text-[11px] font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-aom-text-light">
              {displayName}
            </span>
            <span className="block truncate text-[10.5px] text-aom-text-muted">
              {worldId || 'no world'}
            </span>
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-aom-text-muted">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
