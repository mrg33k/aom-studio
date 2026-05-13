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

import { useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { useCornerNav } from '../CornerContext.jsx'
import { useTasksPanel } from '../components/cv3/tasks/useTasksPanel.js'
import { TasksPanelProvider, useTasksPanelCtx } from '../components/cv3/tasks/TasksPanelContext.jsx'
import { TaskContextMenu } from '../components/cv3/ContextMenu.jsx'

import { AllFilesSection, ProjectFilesSection, ProjectMissionsSection, MissionBreadcrumb, MissionScaffoldSection } from '../components/cv3/tasks/FilesSection.jsx'
import LivingParagraphCard from '../components/cv3/tasks/LivingParagraphCard.jsx'
import TaskInputBar from '../components/cv3/tasks/TaskInputBar.jsx'
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
  } = useTasksPanelCtx()
  const { selectedAgent, conversationTarget } = useCornerNav()
  const { worldId } = useCornerAuth()

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
    <div data-cv4-tasks-body style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <div data-cv4-tasks-scroll style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 20px' }}>

        {/* SCOPE — what we're looking at, top-of-panel. */}
        <ScopeHeader label={scopeLabel} counts={counts} />

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
          <div data-cv4-tasks-narrative style={{ marginBottom: 14 }}>
            <LivingParagraphCard world={worldId} activeProject={activeProject} />
          </div>
        )}

        {/* Live state. */}
        <TaskSection
          title="Active" status="active" tasks={filteredActive}
          summary={summarize('active', counts)}
        />
        <TaskSection
          title="Needs input" status="waiting" tasks={waitingFiltered}
          summary={summarize('waiting', counts)}
        />
        <TaskSection
          title="Blocked" status="blocked" tasks={filteredBlocked}
          summary={summarize('blocked', counts)}
        />
        <TaskSection
          title="Failed" status="failed" tasks={filteredFailed}
          summary={summarize('failed', counts)}
        />

        {/* Done — 3 visible, +5 per click. */}
        <DoneSection tasks={filteredCompleted} />

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

      <TaskInputBar />
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
          fontFamily: "'Inter', sans-serif",
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
  return (
    <div data-cv4-tasks-scope style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 4,
      }}>Tasks · {label}</div>
      <div style={{
        fontSize: 22, fontWeight: 800,
        fontFamily: "'JetBrains Mono', monospace",
        color: C.text, letterSpacing: '-0.01em',
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>{counts.total === 0 ? 'All clear' : `${counts.total} open`}</div>
      <div style={{
        marginTop: 6,
        display: 'flex', gap: 8, flexWrap: 'wrap',
        fontSize: 10, fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        color: C.muted, letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {counts.active   > 0 && <span style={{ color: '#34D399' }}>{counts.active} active</span>}
        {counts.waiting  > 0 && <span style={{ color: '#FCD34D' }}>{counts.waiting} waiting</span>}
        {counts.blocked  > 0 && <span style={{ color: '#A78BFA' }}>{counts.blocked} blocked</span>}
        {counts.failed   > 0 && <span style={{ color: '#FCA5A5' }}>{counts.failed} failed</span>}
        {counts.done     > 0 && <span style={{ color: C.muted }}>{counts.done} done</span>}
      </div>
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
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0,
          }}>×</button>
        )}
      </div>

      <div data-cv4-tasks-pills style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
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
        fontFamily: "'Inter', sans-serif",
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
        title="Done"
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
    expandedTask, toggleTaskExpand,
    openTaskMenu, startTaskLongPress, cancelTaskLongPress,
    taskProjects,
  } = useTasksPanelCtx()
  const t = task
  const agent = t.agent_identity || t.agentIdentity || t.agent
  const projectName = t.project_name || t.projectName
  const projectId = t.project_id
  const isDone = status === 'done'
  const isFailed = status === 'failed' || t.status === 'failed'
  const proj = projectId ? taskProjects.find(p => String(p.id) === String(projectId)) : null
  return (
    <div
      data-test-id={isDone ? 'task-card-done' : 'task-card'}
      data-task-id={t.id}
      data-task-status={t.status}
      onClick={() => toggleTaskExpand(t.id)}
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
          whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap',
          marginBottom: (agent || projectName) ? 2 : 0,
        }}>{t.title || t.text || 'Untitled task'}</div>
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
  // active / default — empty square
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
    </svg>
  )
}

function FilesBlock({ activeProject, activeMissionPath, searchQuery }) {
  return (
    <div data-cv4-tasks-section data-status="files" style={{ marginTop: 8 }}>
      <SectionHeader title="Files" count={0} summary="Recent docs across the scope" />
      <div data-cv4-files-inner>
        {activeMissionPath && (
          <>
            <MissionBreadcrumb />
            <MissionScaffoldSection />
            <ProjectMissionsSection />
            <ProjectFilesSection />
          </>
        )}
        {!activeMissionPath && activeProject && activeProject !== 'all' && (
          <>
            <ProjectMissionsSection />
            <ProjectFilesSection />
          </>
        )}
        {(!activeProject || activeProject === 'all') && !searchQuery && (
          <AllFilesSection />
        )}
      </div>
    </div>
  )
}
