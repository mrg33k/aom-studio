// TasksPanelCv4 — CV4 task drawer.
//
// R7.2 (2026-05-13): full redesign per feedback.
//  - Each section has a clear summary line beneath its header.
//  - Tasks render as checkbox rows (square = open, ☑ + strikethrough = done,
//    ✕ = failed, ⏸ = waiting/blocked) so what's a task is unambiguous.
//  - Done show-more bumps by 5 (not "all at once").
//  - Filter scope auto-syncs with the active conversation: agent chat → All,
//    project chat → that project. Pills still let the user override.
//  - Lifts the WeeklyStatsCard ("progress chart") — REMOVED.
//  - Tight rows, sharp brutalist headings, clean visual hierarchy.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { C } from '../lib/cv3Colors.js'
import { useCornerNav } from '../CornerContext.jsx'
import { useTasksPanel } from '../components/cv3/tasks/useTasksPanel.js'
import { authFetch } from '../lib/authFetch.js'
import { TasksPanelProvider, useTasksPanelCtx } from '../components/cv3/tasks/TasksPanelContext.jsx'
import { TaskContextMenu } from '../components/cv3/ContextMenu.jsx'

import { AllFilesSection, ProjectFilesSection, ProjectMissionsSection, MissionBreadcrumb, MissionScaffoldSection, CANON_ICONS } from '../components/cv3/tasks/FilesSection.jsx'
import LivingParagraphCard from '../components/cv3/tasks/LivingParagraphCard.jsx'
import CreateProjectModal from '../components/cv3/tasks/CreateProjectModal.jsx'
import { useCornerAuth } from '../CornerContext.jsx'

export default function TasksPanelCv4() {
  const ctx = useTasksPanel()
  return (
    <TasksPanelProvider value={ctx}>
      <TasksPanelCv4Body />
    </TasksPanelProvider>
  )
}

function TasksPanelCv4Body() {
  const {
    searchQuery, setSearchQuery, searchFocused, setSearchFocused,
    activeProject, setActiveProject,
    activeMissionPath,
    projectPills,
    toggleCreateProjectModal,
    startConversationalProjectCreation,
    filteredActive, filteredCompleted, filteredFailed, filteredBlocked,
    waitingTasks,
    ctxToast,
    taskMenu, setTaskMenu,
    taskProjects,
    handleTaskFollowUp,
    handleTaskNeedsVerification,
    handleTaskResearch,
    handleTaskMoveTo,
    selectedBrief, briefHtml, briefLoading, closeBriefViewer,
    // R5 corner:task-rooms — hash-driven auto-open from the tree.
    expandedTask, toggleTaskExpand,
  } = useTasksPanelCtx()
  const { selectedAgent, conversationTarget, handleSelectProject, handleSelectMission, handleSelectTask, setPrefillMessage } = useCornerNav()
  const { worldId } = useCornerAuth()

  // mission-rooms: pull the missions-tree (one entry per project, each with
  // its missions and underlying tasks). The Working / Completed sections
  // render rows from THIS data, not from the raw tasks table — the surface
  // is missions now, not tasks.
  const [missionsTree, setMissionsTree] = useState(null)
  useEffect(() => {
    if (!worldId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}`, { credentials: 'include' })
        if (!r.ok) return
        const j = await r.json().catch(() => null)
        if (!cancelled && j && Array.isArray(j.projects)) setMissionsTree(j)
      } catch { /* ignore — Working/Completed just stay empty */ }
    })()
    return () => { cancelled = true }
  }, [worldId])

  // Flat list of {project, mission, taskStats} with project + mission
  // metadata zipped together so MissionRow can render a single row.
  const allMissionsFlat = useMemo(() => {
    if (!missionsTree?.projects) return []
    const out = []
    for (const p of missionsTree.projects) {
      for (const m of (p.missions || [])) {
        const tasks = m.tasks || []
        const stats = {
          active: tasks.filter(t => t.status === 'active' || t.status === 'queued' || t.status === 'running').length,
          waiting: tasks.filter(t => t.status === 'waiting' || t.status === 'needs_input').length,
          blocked: tasks.filter(t => t.status === 'blocked').length,
          failed: tasks.filter(t => t.status === 'failed').length,
          done: tasks.filter(t => t.status === 'done' || t.status === 'completed').length,
          total: tasks.length,
        }
        // mission-rooms reframe: a mission is "in flight" because it exists
        // and isn't marked done — task counts are enrichment, not gating.
        // Endpoint sets is_done from CONTEXT.md frontmatter. inFlight counts
        // queued tasks if any (drives the "· N in flight" label) but always
        // reads as at-least-1 when the mission itself is open so the pulse
        // icon shows.
        const isDone = !!m.is_done
        const inFlight = stats.active + stats.waiting + stats.blocked + stats.failed
        out.push({
          project: { slug: p.slug, name: p.name },
          mission: { slug: m.slug, name: m.name || m.slug, status: m.status, path: m.path || `corner:${m.slug}` },
          stats,
          inFlight: isDone ? 0 : Math.max(inFlight, 1),
          taskInFlight: inFlight,
          isDone,
        })
      }
    }
    return out
  }, [missionsTree])

  const workingMissions = useMemo(() => {
    return allMissionsFlat
      .filter(x => !x.isDone)
      .filter(x => activeProject === 'all' || x.project.slug === activeProject)
      .filter(x => !searchQuery || (x.mission.name + ' ' + x.project.name).toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.inFlight - a.inFlight)
  }, [allMissionsFlat, activeProject, searchQuery])

  const completedMissions = useMemo(() => {
    return allMissionsFlat
      .filter(x => x.isDone)
      .filter(x => activeProject === 'all' || x.project.slug === activeProject)
      .filter(x => !searchQuery || (x.mission.name + ' ' + x.project.name).toLowerCase().includes(searchQuery.toLowerCase()))
  }, [allMissionsFlat, activeProject, searchQuery])


  // R6 corner:task-rooms — when the URL hash carries `task=<id>` (from
  // the Drawer's TaskTreeRow click), open the task as a chat room via
  // handleSelectTask. The chat panel takes over. No in-panel focused
  // mode; the task IS the room and rooms are full chat surfaces.
  useEffect(() => {
    const apply = () => {
      const h = (typeof window !== 'undefined' && window.location.hash) || ''
      const m = h.match(/task=([0-9a-f-]{8,})/i)
      if (!m) return
      const taskId = m[1]
      const all = [...filteredActive, ...waitingTasks, ...filteredBlocked, ...filteredFailed, ...filteredCompleted]
      const task = all.find(t => t.id === taskId)
      if (task && typeof handleSelectTask === 'function') {
        handleSelectTask(task)
      }
      try { history.replaceState(null, '', window.location.pathname + window.location.search) } catch { /* ignore */ }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  })

  // R7.2: when the active conversation changes, sync the task filter scope.
  //  - Project chat → that project
  //  - Agent chat / no project → All
  // The user can still override with the pills.
  useEffect(() => {
    if (conversationTarget?.type === 'project' && conversationTarget.slug) {
      setActiveProject(conversationTarget.slug)
    } else if (selectedAgent) {
      setActiveProject('all')
    }
  }, [conversationTarget?.slug, conversationTarget?.type, selectedAgent?.slug, setActiveProject])

  // Active = right_now + queued (no foreman dup); Failed and Blocked are split.
  const waitingFiltered = useMemo(() => (waitingTasks || []).filter(t => {
    if (searchQuery) {
      const title = (t.title || t.text || '').toLowerCase()
      if (!title.includes(searchQuery.toLowerCase())) return false
    }
    if (activeProject === 'all') return true
    return (t.project || '').toLowerCase() === activeProject
  }), [waitingTasks, searchQuery, activeProject])

  const counts = {
    active: filteredActive.length,
    waiting: waitingFiltered.length,
    blocked: filteredBlocked.length,
    failed: filteredFailed.length,
    done: filteredCompleted.length,
    total: filteredActive.length + waitingFiltered.length + filteredBlocked.length + filteredFailed.length,
  }

  const scopeLabel = activeMissionPath
    ? `corner:${activeMissionPath}`
    : (activeProject && activeProject !== 'all')
      ? (projectPills.find(p => p.slug === activeProject)?.name || activeProject)
      : 'All projects'

  return (
    <div data-cv4-tasks-body style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Hanken Grotesk', sans-serif", position: 'relative' }}>
      {selectedBrief && (
        <Cv4BriefViewer
          brief={selectedBrief}
          html={briefHtml}
          loading={briefLoading}
          onClose={closeBriefViewer}
          onAskAboutFile={(text) => {
            // Take the user from the file viewer to the project chat for
            // that file's project, with the message pre-filled and tagged
            // so the agent has explicit file context.
            const projectSlug = selectedBrief?.project || activeProject
            const filename = selectedBrief?.filename || selectedBrief?.slug || ''
            const tag = filename ? `[About ${filename}] ` : ''
            const prefill = `${tag}${text}`.trim()
            setPrefillMessage?.(prefill)
            if (projectSlug && projectSlug !== 'all') {
              const proj = (taskProjects || []).find(p => p.slug === projectSlug)
                || projectPills.find(p => p.slug === projectSlug)
              if (proj) handleSelectProject?.({ name: proj.name, slug: proj.slug })
            }
            closeBriefViewer()
          }}
        />
      )}
      <div data-cv4-tasks-scroll style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 20px' }}>

 {/* SCOPE, what we're looking at, top-of-panel. */}
        <ScopeHeader label={scopeLabel} counts={{ missionCount: workingMissions.length }} />

        {/* Search + project pills. */}
        <Filters
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          searchFocused={searchFocused} setSearchFocused={setSearchFocused}
          projectPills={projectPills}
          activeProject={activeProject} setActiveProject={setActiveProject}
          toggleCreateProjectModal={toggleCreateProjectModal}
          startConversationalProjectCreation={startConversationalProjectCreation}
        />

        {/* Living narrative — the constantly-updated paragraph that keeps
            you up to speed on the current scope. Same component the CV3
            dashboard used; the writer pipeline + Supabase realtime
            subscription are already wired. */}
        {!searchQuery && !activeMissionPath && (
          <div data-cv4-tasks-narrative style={{ marginBottom: 18 }}>
            <h2 style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14, fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              color: C.text, margin: '0 0 8px 0', lineHeight: 1,
            }}>Summary</h2>
            <style>{`
              [data-cv4-tasks-narrative] [data-testid="living-paragraph-text"] {
                font-size: 12px !important;
                font-weight: 400 !important;
                line-height: 1.55 !important;
                letter-spacing: 0 !important;
                font-family: 'Hanken Grotesk', sans-serif !important;
                color: ${C.text2} !important;
              }
              [data-cv4-tasks-narrative] [data-testid="living-paragraph"] > div > div:first-child {
                width: 5px !important;
                height: 5px !important;
                margin-top: 8px !important;
              }
              [data-cv4-tasks-narrative] [data-testid="living-paragraph-read-more"] {
                font-size: 10px !important;
                text-transform: uppercase;
                letter-spacing: 0.08em;
              }
            `}</style>
            <LivingParagraphCard world={worldId} activeProject={activeProject} />
          </div>
        )}

        {/* Pinned missions — surfaces missions the user has pinned. */}
        <PinnedMissionsSection />

        {/* Working missions — missions with anything in flight. */}
        <MissionSection
          title="Working"
          missions={workingMissions}
          empty="Nothing in motion"
        />

        {/* Completed missions. */}
        <MissionSection
          title="Completed missions"
          missions={completedMissions}
          empty="No completed missions yet"
          collapsedInitial
        />

        {/* Files at the bottom. */}
        <FilesBlock activeProject={activeProject} activeMissionPath={activeMissionPath} searchQuery={searchQuery} />

        {/* Empty state. */}
        {counts.total === 0 && filteredCompleted.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, paddingTop: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              {searchQuery ? 'No matches' : 'All clear'}
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>
              {searchQuery ? 'Try a different search' : 'Nothing on your plate'}
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal />

      <TaskContextMenu
        open={!!taskMenu}
        x={taskMenu?.x || 0}
        y={taskMenu?.y || 0}
        task={taskMenu?.task || null}
        projects={(taskProjects || []).map(p => ({ slug: p.slug, name: p.name }))}
        onClose={() => setTaskMenu(null)}
        onFollowUp={(task) => handleTaskFollowUp(task)}
        onNeedsVerification={(task) => handleTaskNeedsVerification(task)}
        onResearch={(task) => handleTaskResearch(task)}
        onMoveTo={(target) => handleTaskMoveTo(taskMenu?.task, target)}
      />

      {ctxToast && (
        <div data-test-id="ctx-toast" style={{
          position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)',
          zIndex: 9998, background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.32)', color: '#A7F3D0',
          padding: '8px 14px', fontSize: 12, fontWeight: 600,
          fontFamily: "'Hanken Grotesk', sans-serif",
        }}>{ctxToast.text}</div>
      )}
    </div>
  )
}

function summarize(kind, c) {
  if (kind === 'active')   return c.active === 0 ? 'Nothing in flight' : `${c.active} in flight`
  if (kind === 'waiting')  return c.waiting === 0 ? 'Nothing pending' : `${c.waiting} awaiting input`
  if (kind === 'blocked')  return c.blocked === 0 ? 'No blockers' : `${c.blocked} blocked`
  if (kind === 'failed')   return c.failed === 0 ? 'No failures' : `${c.failed} need attention`
  return ''
}

function ScopeHeader({ label, counts }) {
  // corner:mission-rooms — tasks retired 2026-05-17. Header is just the
  // scope label + mission count. No task-derived "4 OPEN / 1 ACTIVE /
  // 3 FAILED / 244 DONE" line; those counts came from the tasks table.
  const missionCount = (counts && counts.missionCount) || 0
  return (
    <div data-cv4-tasks-scope style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 4,
      }}>Missions · {label}</div>
      <div style={{
        fontSize: 22, fontWeight: 800,
        fontFamily: "'JetBrains Mono', monospace",
        color: C.text, letterSpacing: '-0.01em',
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>{missionCount === 0 ? 'No missions' : `${missionCount} missions`}</div>
    </div>
  )
}

function Filters({
  searchQuery, setSearchQuery, searchFocused, setSearchFocused,
  projectPills, activeProject, setActiveProject,
  toggleCreateProjectModal, startConversationalProjectCreation,
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid ' + (searchFocused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'),
        padding: '7px 10px',
        marginBottom: 8,
        transition: 'border-color 0.15s',
      }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text" placeholder="Search…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: C.text, fontSize: 12, fontWeight: 500,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0,
          }}>×</button>
        )}
      </div>

      <div data-cv4-tasks-pills onWheel={(e) => { if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.currentTarget.scrollLeft += e.deltaY } }} style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {projectPills.map(p => {
          const isActive = activeProject === p.slug
          return (
            <button
              key={p.slug}
              data-testid={`project-pill-${p.slug}`}
              onClick={() => setActiveProject(p.slug)}
              style={{
                padding: '4px 8px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase',
                cursor: 'pointer', flexShrink: 0,
                border: isActive ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                color: isActive ? C.accent : C.text2,
                whiteSpace: 'nowrap',
                transition: 'all 0.12s',
              }}
            >{p.name}</button>
          )
        })}
        <button
          data-testid="start-new-project-recipe"
          title="Create project"
          onClick={(e) => {
            if (e.shiftKey || e.altKey) { toggleCreateProjectModal(); return }
            startConversationalProjectCreation()
          }}
          onContextMenu={(e) => { e.preventDefault(); toggleCreateProjectModal() }}
          style={{
            padding: '4px 8px',
            fontSize: 12, fontWeight: 700, lineHeight: 1,
            cursor: 'pointer', flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            color: C.text2,
          }}
        >+</button>
      </div>
    </div>
  )
}

function SectionHeader({ title, count, summary }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
        <h2 style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14, fontWeight: 800,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          color: C.text, margin: 0, lineHeight: 1, flex: 1,
        }}>{title}</h2>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, color: C.dim,
        }}>{count.toString().padStart(2, '0')}</span>
      </div>
      <div style={{
        fontSize: 11, color: C.muted,
        fontFamily: "'Hanken Grotesk', sans-serif",
        marginBottom: 6,
      }}>{summary}</div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
    </div>
  )
}

function TaskSection({ title, status, tasks, summary }) {
  if (!tasks || tasks.length === 0) return null
  return (
    <div data-cv4-tasks-section data-status={status} style={{ marginBottom: 18 }}>
      <SectionHeader title={title} count={tasks.length} summary={summary} />
      <div>
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} status={status} />
        ))}
      </div>
    </div>
  )
}

function DoneSection({ tasks }) {
  const [shown, setShown] = useState(3)
  if (!tasks || tasks.length === 0) return null
  const visible = tasks.slice(0, shown)
  const hidden = tasks.length - visible.length
  return (
    <div data-cv4-tasks-section data-status="done" style={{ marginBottom: 18 }}>
      <SectionHeader
        title="Completed missions"
        count={tasks.length}
        summary={`${tasks.length} completed${tasks.length === 1 ? '' : ''}`}
      />
      <div>
        {visible.map(t => <TaskRow key={t.id} task={t} status="done" />)}
      </div>
      {hidden > 0 && (
        <button
          data-testid="cv4-done-show-more"
          onClick={() => setShown(s => s + 5)}
          style={{
            width: '100%', textAlign: 'center',
            padding: '6px',
            marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: C.muted,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted }}
        >Show {Math.min(hidden, 5)} more</button>
      )}
      {shown > 3 && (
        <button
          onClick={() => setShown(3)}
          style={{
            width: '100%', textAlign: 'center',
            padding: '6px', marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: C.dim,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >Collapse</button>
      )}
    </div>
  )
}

function TaskRow({ task, status }) {
  const {
    openTaskMenu, startTaskLongPress, cancelTaskLongPress,
    taskProjects,
  } = useTasksPanelCtx()
  const { worldId } = useCornerAuth()
  const { handleSelectTask } = useCornerNav()
  const t = task
  const agent = t.agent_identity || t.agentIdentity || t.agent
  const projectName = t.project_name || t.projectName
  const projectId = t.project_id
  const isDone = status === 'done'
  const isFailed = status === 'failed' || t.status === 'failed'
  const proj = projectId ? taskProjects.find(p => String(p.id) === String(projectId)) : null
  // Multi-user prefix: when a task is requested by a different tenant than
  // the viewing user, prepend `[<RequesterName>] ` so the viewer sees whose
  // work it is. Falls back to the capitalized client_id slug — no
  // display-name join is wired into this surface yet.
  const rawTitle = t.title || t.text || 'Untitled task'
  const rawClient = t.client_id || t.clientId || null
  const isCrossTenant = rawClient && worldId && rawClient !== worldId
  const requesterLabel = isCrossTenant
    ? (rawClient.startsWith('shared:')
        ? rawClient.slice('shared:'.length)
        : rawClient.charAt(0).toUpperCase() + rawClient.slice(1))
    : null
  const displayTitle = requesterLabel ? `[${requesterLabel}] ${rawTitle}` : rawTitle
  return (
    <div
      data-test-id={isDone ? 'task-card-done' : 'task-card'}
      data-task-id={t.id}
      data-task-status={t.status}
      onClick={() => handleSelectTask && handleSelectTask(t)}
      onContextMenu={(e) => openTaskMenu(e, t)}
      onTouchStart={(e) => startTaskLongPress(e, t)}
      onTouchEnd={cancelTaskLongPress}
      onTouchMove={cancelTaskLongPress}
      onTouchCancel={cancelTaskLongPress}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '7px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.035)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <StatusIcon status={status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500,
          color: isDone ? C.muted : (isFailed ? '#FCA5A5' : C.text),
          textDecoration: isDone ? 'line-through' : 'none',
          textDecorationColor: 'rgba(148,163,184,0.4)',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: (agent || projectName) ? 2 : 0,
        }}>{displayTitle}</div>
        {(agent || projectName) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {proj && <span style={{ width: 5, height: 5, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />}
            {agent && <span>{agent}</span>}
            {projectName && <span style={{ color: C.dim }}>· {projectName}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }) {
  if (status === 'done') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(16,185,129,0.18)" stroke="#34D399" strokeWidth="1.5"/>
        <polyline points="7 12 11 16 17 8" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (status === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(239,68,68,0.14)" stroke="#FCA5A5" strokeWidth="1.5"/>
        <line x1="8" y1="8" x2="16" y2="16" stroke="#FCA5A5" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="16" y1="8" x2="8" y2="16" stroke="#FCA5A5" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    )
  }
  if (status === 'blocked') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(167,139,250,0.14)" stroke="#A78BFA" strokeWidth="1.5"/>
        <line x1="9"  y1="8" x2="9"  y2="16" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
        <line x1="15" y1="8" x2="15" y2="16" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  }
  if (status === 'waiting') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(252,211,77,0.14)" stroke="#FCD34D" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="2.2" fill="#FCD34D"/>
      </svg>
    )
  }
  // active / default — empty square with a soft breathing dot so you can
  // tell at a glance that work is in progress (not just sitting open).
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <style>{`
        @keyframes cv4ActivePulse {
          0%, 100% { opacity: 0.25; transform: scale(0.85); transform-origin: 12px 12px; }
          50%      { opacity: 0.9;  transform: scale(1.05); transform-origin: 12px 12px; }
        }
        @keyframes cv4ActiveBorder {
          0%, 100% { stroke: rgba(255,255,255,0.22); }
          50%      { stroke: rgba(52,211,153,0.55); }
        }
      `}</style>
      <rect x="3" y="3" width="18" height="18" rx="3"
            fill="rgba(255,255,255,0.025)" strokeWidth="1.5"
            style={{ animation: 'cv4ActiveBorder 2.4s ease-in-out infinite' }} />
      <circle cx="12" cy="12" r="2.8" fill="#34D399"
              style={{ animation: 'cv4ActivePulse 2.4s ease-in-out infinite', transformOrigin: '12px 12px' }} />
    </svg>
  )
}

function FilesBlock({ activeProject, activeMissionPath, searchQuery }) {
  // Mission scope keeps the CV3 scaffold/breadcrumb (they're already
  // dense + monospace and fit the file-browser feel).
  if (activeMissionPath) {
    return (
      <div data-cv4-tasks-section data-status="files" style={{ marginTop: 8 }}>
        <SectionHeader title="Files" count={0} summary="Mission scaffold + files" />
        <MissionBreadcrumb />
        <MissionScaffoldSection />
        <ProjectMissionsSection />
        <ProjectFilesSection />
      </div>
    )
  }
  // Project + All scope: render the new CV4 file-tree.
  return <Cv4FileTree activeProject={activeProject} searchQuery={searchQuery} />
}

// R52 — five canonical CAPS files surfaced at the top of every project
// view (VISION/BUILD/CONTEXT/RESEARCH/ROADMAP). Distinct icon per file.
// Clicking a row opens that file via the existing brief-viewer handler
// using the `source: 'canon'` lookup path.
const CV4_PROJECT_CANON = [
  { filename: 'VISION.md',   label: 'Vision',   color: '#A78BFA', iconKey: 'VISION' },
  { filename: 'BUILD.md',    label: 'Build',    color: '#FBBF24', iconKey: 'BUILD' },
  { filename: 'CONTEXT.md',  label: 'Context',  color: '#60A5FA', iconKey: 'CONTEXT' },
  { filename: 'RESEARCH.md', label: 'Research', color: '#6EE7B7', iconKey: 'RESEARCH' },
  { filename: 'ROADMAP.md',  label: 'Roadmap',  color: '#FB923C', iconKey: 'ROADMAP' },
]

/* CV4 file tree — same look as the left drawer's project/mission tree but
   sourced from briefs (all-scope) or task briefs (project scope). Always
   uncollapsed by default; folders expand to show their docs. */
function Cv4FileTree({ activeProject, searchQuery }) {
  const {
    allBriefs, allBriefsLoading,
    setAllBriefsOpen,
    handleBriefClick,
    taskBriefs,
    taskAttachments,
    taskMissions,
    setActiveMissionPath,
    taskProjects,
  } = useTasksPanelCtx()
  // R3 corner:mission-rooms — file-manager mission/project clicks navigate
  // into the same chat rooms the drawer does. Two entry points, one
  // conversation surface.
  const { handleSelectProject, handleSelectMission } = useCornerNav()

  // Keep the underlying CV3 "open" state always-true so the data hooks
  // continue to fetch + sync even though we don't use the collapse UI.
  useEffect(() => { setAllBriefsOpen(true) }, [setAllBriefsOpen])

  const isAll = !activeProject || activeProject === 'all'

  // Group briefs by project for the All view.
  const byProject = useMemo(() => {
    if (!isAll) return null
    const m = new Map()
    for (const b of (allBriefs || [])) {
      if (searchQuery) {
        const t = (b.title || b.filename || '').toLowerCase()
        if (!t.includes(searchQuery.toLowerCase())) continue
      }
      const key = b.project || 'misc'
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(b)
    }
    return m
  }, [allBriefs, isAll, searchQuery])

  // Flat list for project scope: project briefs + (later) project files.
  const projectBriefs = useMemo(() => {
    if (isAll) return []
    return (taskBriefs || []).filter(b => {
      if (!searchQuery) return true
      const t = (b.title || b.filename || '').toLowerCase()
      return t.includes(searchQuery.toLowerCase())
    })
  }, [taskBriefs, isAll, searchQuery])

  const [expanded, setExpanded] = useState(() => new Set())
  // Auto-expand every project folder once data lands so the tree opens
  // by default (per the "uncollapsed" requirement).
  useEffect(() => {
    if (!isAll || !byProject) return
    setExpanded(prev => {
      const next = new Set(prev)
      for (const k of byProject.keys()) next.add(k)
      return next
    })
  }, [byProject, isAll])

  const toggle = (slug) => setExpanded(prev => {
    const n = new Set(prev)
    if (n.has(slug)) n.delete(slug); else n.add(slug)
    return n
  })

  const projectName = (slug) => {
    if (!slug || slug === 'misc') return 'Misc'
    const proj = taskProjects?.find(p => p.slug === slug)
    return proj?.name || PROJECT_LABELS[slug] || slug
  }

  const totalCount = isAll
    ? Array.from(byProject?.values() || []).reduce((s, arr) => s + arr.length, 0)
    : projectBriefs.length

  return (
    <div data-cv4-file-tree data-cv4-tasks-section data-status="files" style={{ marginTop: 8 }}>
      <SectionHeader
        title="Files"
        count={totalCount}
        summary={isAll
 ? (totalCount === 0 ? 'No files yet' : 'All projects, grouped by project')
          : (totalCount === 0 ? 'No files in this project' : `Files in ${projectName(activeProject)}`)
        }
      />
      <div data-cv4-files-tree-inner>
        {allBriefsLoading && (
          <div style={{ padding: '8px 4px', fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>Loading…</div>
        )}

        {isAll && byProject && Array.from(byProject.entries()).map(([slug, briefs]) => {
          const isExpanded = expanded.has(slug)
          return (
            <div key={slug}>
              <TreeFolderRow
                testId={`cv4-file-tree-project-${slug}`}
                label={projectName(slug)}
                count={briefs.length}
                expanded={isExpanded}
                onToggle={() => toggle(slug)}
                onLabelClick={slug && slug !== 'misc' && handleSelectProject
                  ? () => {
                      const proj = (taskProjects || []).find(p => p.slug === slug)
                        || { slug, name: projectName(slug) }
                      handleSelectProject(proj)
                    }
                  : undefined}
              />
              {isExpanded && briefs.map((b, i) => (
                <TreeDocRow
                  key={`${slug}-${b.slug || b.filename || i}`}
                  brief={b}
                  onClick={() => handleBriefClick?.(b)}
                />
              ))}
            </div>
          )
        })}

        {!isAll && (
          <Cv4ProjectCanon
            activeProject={activeProject}
            projectBriefs={projectBriefs}
            taskAttachments={taskAttachments}
            taskMissions={taskMissions}
            setActiveMissionPath={setActiveMissionPath}
            handleBriefClick={handleBriefClick}
            searchQuery={searchQuery}
            handleSelectMission={handleSelectMission}
            taskProjects={taskProjects}
          />
        )}

        {!allBriefsLoading && isAll && totalCount === 0 && (
          <div style={{ padding: '6px 4px', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
            {searchQuery ? 'No files match.' : 'No files yet.'}
          </div>
        )}
      </div>
    </div>
  )
}

// R52 — project file view: 5 canon CAPS rows at top + Missions/ + Files/
// folders for the rest. Used in CV4 task drawer when project scope is
// active and we are NOT drilled into a mission.
function Cv4ProjectCanon({
  activeProject, projectBriefs, taskAttachments, taskMissions,
  setActiveMissionPath, handleBriefClick, searchQuery,
  handleSelectMission, taskProjects,
}) {
  const [missionsOpen, setMissionsOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(true)
  const missions = Array.isArray(taskMissions) ? taskMissions : []
  const attachments = Array.isArray(taskAttachments) ? taskAttachments : []
  const filteredBriefs = projectBriefs || []

  const onClickCanon = (entry) => {
    handleBriefClick?.({
      project: activeProject,
      filename: entry.filename,
      source: 'canon',
 title: `${entry.label}, ${activeProject}`,
    })
  }

  return (
    <div data-testid="cv4-project-canon" data-project={activeProject}>
      {/* Canon rows — five caps files, distinct icon each. */}
      {CV4_PROJECT_CANON.map(entry => (
        <Cv4CanonRow key={entry.filename} entry={entry} onClick={() => onClickCanon(entry)} />
      ))}

      {/* Missions folder */}
      <TreeFolderRow
        label="Missions"
        count={missions.length}
        expanded={missionsOpen}
        onToggle={() => setMissionsOpen(v => !v)}
      />
      {missionsOpen && missions.length === 0 && (
        <div style={{ padding: '4px 0 4px 36px', fontSize: 11, color: C.dim, fontStyle: 'italic' }}>
          No missions yet.
        </div>
      )}
      {missionsOpen && missions.map(m => (
        <div
          key={m.path}
          data-row
          data-mission-path={m.path}
          data-testid={`cv4-file-tree-mission-${m.slug}`}
          onClick={() => {
            // R3 corner:mission-rooms — file-manager mission click navigates
            // into the mission room (same surface as drawer mission click).
            const proj = (taskProjects || []).find(p => p.slug === activeProject)
              || { slug: activeProject, name: activeProject }
            if (handleSelectMission) handleSelectMission(m, proj)
            else setActiveMissionPath?.(m.path)
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 6px 3px 36px', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {CANON_ICONS.FOLDER(C.muted)}
          <span style={{
            flex: 1, fontSize: 11.5, fontWeight: 500, color: C.text2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{m.name}</span>
          {m.file_count > 0 && (
            <span style={{
              fontSize: 9, color: C.dim,
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}>{m.file_count}</span>
          )}
        </div>
      ))}

      {/* Files folder — briefs + attachments. */}
      <TreeFolderRow
        label="Files"
        count={filteredBriefs.length + attachments.length}
        expanded={filesOpen}
        onToggle={() => setFilesOpen(v => !v)}
      />
      {filesOpen && filteredBriefs.length === 0 && attachments.length === 0 && (
        <div style={{ padding: '4px 0 4px 36px', fontSize: 11, color: C.dim, fontStyle: 'italic' }}>
          {searchQuery ? 'No files match.' : 'No files yet.'}
        </div>
      )}
      {filesOpen && filteredBriefs.map((b, i) => (
        <TreeDocRow
          key={`brief-${b.slug || b.filename || i}`}
          brief={b}
          onClick={() => handleBriefClick?.(b)}
          indent={36}
        />
      ))}
      {filesOpen && attachments.map((f, i) => (
        <TreeDocRow
          key={`att-${f.id || f.name || i}`}
          brief={{ title: f.name || f.filename, dateFormatted: '' }}
          onClick={() => { /* attachment clicks handled by ProjectFilesSection elsewhere */ }}
          indent={36}
        />
      ))}
    </div>
  )
}

function Cv4CanonRow({ entry, onClick }) {
  const [hov, setHov] = useState(false)
  const icon = CANON_ICONS[entry.iconKey] || CANON_ICONS.FOLDER
  return (
    <div
      data-row
      data-testid={`cv4-canon-${entry.filename}`}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 6px',
        cursor: 'pointer',
        background: hov ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <span style={{ width: 14, display: 'inline-block', flexShrink: 0 }} />
      {icon(entry.color)}
      <span style={{
        flex: 1, fontSize: 12, fontWeight: 600, color: C.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{entry.label}</span>
      <span style={{
        fontSize: 9, fontWeight: 600, color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}>{entry.filename}</span>
    </div>
  )
}

function TreeFolderRow({ label, count, expanded, onToggle, onLabelClick, testId }) {
  // R3 corner:mission-rooms — when onLabelClick is provided (e.g. a real
  // project folder in the All view), clicking the label navigates into
  // that room; the chevron + folder icon still toggle in place. Callers
  // that don't pass onLabelClick get the original whole-row toggle UX.
  const labelInteractive = typeof onLabelClick === 'function'
  return (
    <div
      data-row
      data-testid={testId}
      onClick={labelInteractive ? undefined : onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 6px 4px 4px',
        cursor: labelInteractive ? 'default' : 'pointer',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <svg
        onClick={labelInteractive ? (e) => { e.stopPropagation(); onToggle?.() } : undefined}
        width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, cursor: labelInteractive ? 'pointer' : 'inherit', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
        <polyline points="9 6 15 12 9 18"/>
      </svg>
      <svg
        onClick={labelInteractive ? (e) => { e.stopPropagation(); onToggle?.() } : undefined}
        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, cursor: labelInteractive ? 'pointer' : 'inherit' }}>
        {expanded ? (
          <>
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/>
            <path d="M3 10h18l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </>
        ) : (
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        )}
      </svg>
      <span
        onClick={labelInteractive ? (e) => { e.stopPropagation(); onLabelClick() } : undefined}
        style={{
          flex: 1, fontSize: 12, fontWeight: 500, color: C.text2,
          cursor: labelInteractive ? 'pointer' : 'inherit',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</span>
      <span style={{
        fontSize: 9, fontWeight: 700, color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}>{count}</span>
    </div>
  )
}

function TreeDocRow({ brief, onClick, indent = 24 }) {
  const title = brief.title || brief.filename || 'Brief'
  const date = brief.dateFormatted || brief.date || ''
  return (
    <div
      data-row
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: `3px 6px 3px ${indent}px`,
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span style={{
        flex: 1, fontSize: 11.5, fontWeight: 500, color: C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{title}</span>
      {date && (
        <span style={{
          fontSize: 9, color: C.dim,
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}>{date}</span>
      )}
    </div>
  )
}

// Project labels for the All-view folder names (matches CV3 mapping).
const PROJECT_LABELS = {
  'corner': 'Corner',
  'ambition-mechanical': 'Ambition',
  'aom-website': 'AOM Website',
  'arsenal-directory': 'Arsenal',
  'sourcing-directory': 'Sourcing',
}

// R7.13 — CV4-themed brief/file viewer with an inline composer at the bottom.
// The composer routes the user's message into the project chat with a
// `[About <filename>]` tag so the agent has explicit file context.
function Cv4BriefViewer({ brief, html, loading, onClose, onAskAboutFile }) {
  const [text, setText] = useState('')
  const filename = brief?.filename || brief?.slug || ''
  const displayName = (brief?.title || filename || 'File').replace(/\.md$/, '')
  const subtitle = [brief?.agent, brief?.project, brief?.dateFormatted || brief?.date]
    .filter(Boolean).join(' · ')

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onAskAboutFile?.(t)
    setText('')
  }

  return (
    <div
      data-cv4-brief-viewer
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: C.bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}
    >
      {/* Header — back arrow + filename + project breadcrumb. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close file viewer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: C.muted,
            padding: '6px 10px',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            borderRadius: 2,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, fontWeight: 800, letterSpacing: '0.03em',
            color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{displayName}</div>
          {subtitle && (
            <div style={{
              fontSize: 10, color: C.dim, marginTop: 2,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.05em', textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{subtitle}</div>
          )}
        </div>
      </div>

      {/* Scrollable file body. */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 24px' }}>
        {loading ? (
          <div style={{ color: C.dim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>Loading…</div>
        ) : (
          <div
            data-testid="cv4-brief-viewer-content"
            className={`briefing-summary-body${brief?.source === 'scaffold' || (brief?.filename || '').endsWith('.md') ? ' article' : ''}`}
            style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: html || '<p style="color:#94A3B8">No content.</p>' }}
          />
        )}
      </div>

      {/* Composer — ask about / suggest edits to this specific file. */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: 10,
        flexShrink: 0,
        background: C.bg,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.10)',
          padding: '8px 10px',
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={`Ask about or suggest an edit to ${filename || 'this file'}…`}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent', border: 'none', outline: 'none',
              color: C.text,
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13, lineHeight: 1.4,
              resize: 'none',
              minHeight: 22, maxHeight: 120,
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Send"
            style={{
              width: 32, height: 32,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: text.trim() ? '#10B981' : 'rgba(255,255,255,0.06)',
              border: '1px solid ' + (text.trim() ? '#10B981' : 'rgba(255,255,255,0.10)'),
              color: text.trim() ? '#0A0A0A' : C.muted,
              cursor: text.trim() ? 'pointer' : 'default',
              borderRadius: 2,
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{
          marginTop: 6,
          fontSize: 10, color: C.dim,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
 ↵ to send · referenced: {filename || '·'}
        </div>
      </div>
    </div>
  )
}


// PinnedMissionsSection -- placeholder for user-pinned missions.
// R3 follow-up (mission-rooms): the model is missions, not tasks. Pinned
// gives the user a always-on shortcut to the missions they care about.
// Renders nothing until pinned-mission data flows in; once it does, this
// list shows the mission name, the room it lives in, and a tap drops
// into the mission room.
function PinnedMissionsSection() {
  // TODO: read pinned-missions list from auth scope / Supabase. For now,
  // surface nothing so the panel stays clean.
  const pinned = []
  if (!pinned.length) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionHeader title="Pinned missions" count={pinned.length} summary={`${pinned.length} pinned`} />
      {/* rows will render here when pinned data is wired */}
    </div>
  )
}


// MissionSection -- list of mission rows. Tap a row to enter that mission room.
// Empty state shows a single line; "Completed" sections collapse by default
// and reveal on click so the eye doesn't have to scroll past everything done.
function MissionSection({ title, missions = [], empty, collapsedInitial = false }) {
  const [collapsed, setCollapsed] = useState(!!collapsedInitial)
  const count = missions.length
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        onClick={() => count > 0 && setCollapsed(c => !c)}
        style={{ cursor: count > 0 ? 'pointer' : 'default', marginBottom: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <h2 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14, fontWeight: 800,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: C.text, margin: 0, lineHeight: 1, flex: 1,
          }}>{title}</h2>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700, color: C.dim,
          }}>{count.toString().padStart(2, '0')}</span>
        </div>
        <div style={{
          fontSize: 10, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>{count === 0 ? empty : `${count} mission${count === 1 ? '' : 's'}`}</div>
      </div>
      {!collapsed && missions.map(m => (
        <MissionRow
          key={`${m.project.slug}:${m.mission.slug}`}
          missionEntry={m}
        />
      ))}
    </div>
  )
}

// MissionRow -- single mission. Tap = enter that mission's room. The dot
// to the left pulses green when there's something in flight under this
// mission, so a glance across the Working list tells you which missions
// are doing something right now.
function MissionRow({ missionEntry }) {
  const { handleSelectMission } = useCornerNav()
  const { taskProjects } = useTasksPanelCtx()
  const { project, mission, stats, inFlight, isDone } = missionEntry
  const proj = (taskProjects || []).find(p => p.slug === project.slug) || null
  const handleClick = () => {
    if (handleSelectMission) handleSelectMission(mission, project)
  }
  return (
    <div
      data-mission-row="true"
      data-mission-slug={mission.slug}
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '7px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.035)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <MissionStatusIcon inFlight={inFlight} isDone={isDone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500,
          color: isDone ? C.muted : C.text,
          textDecoration: isDone ? 'line-through' : 'none',
          textDecorationColor: 'rgba(148,163,184,0.4)',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 2,
        }}>{mission.name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {proj && <span style={{ width: 5, height: 5, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />}
          <span>{project.name}</span>
 {/* corner:mission-rooms, "N in flight" / "N done" removed. Tasks retired 2026-05-17. */}
        </div>
      </div>
    </div>
  )
}

function MissionStatusIcon({ inFlight, isDone }) {
  if (isDone) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(16,185,129,0.18)" stroke="#34D399" strokeWidth="1.5"/>
        <polyline points="7 12 11 16 17 8" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (inFlight > 0) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <style>{`
          @keyframes cv4MissionPulse {
            0%, 100% { opacity: 0.25; transform: scale(0.85); }
            50%      { opacity: 0.9;  transform: scale(1.05); }
          }
          @keyframes cv4MissionBorder {
            0%, 100% { stroke: rgba(255,255,255,0.22); }
            50%      { stroke: rgba(52,211,153,0.55); }
          }
        `}</style>
        <rect x="3" y="3" width="18" height="18" rx="3"
              fill="rgba(255,255,255,0.025)" strokeWidth="1.5"
              style={{ animation: 'cv4MissionBorder 2.4s ease-in-out infinite' }} />
        <circle cx="12" cy="12" r="2.8" fill="#34D399"
                style={{ animation: 'cv4MissionPulse 2.4s ease-in-out infinite', transformOrigin: '12px 12px' }} />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
    </svg>
  )
}