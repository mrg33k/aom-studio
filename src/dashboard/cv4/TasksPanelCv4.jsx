// TasksPanelCv4 — CV4 task panel.
//
// Same data hooks as the CV3 TasksPanel (we reuse useTasksPanel +
// TasksPanelProvider so all the section components still find their context).
// Differences:
//   - drops WeeklyStatsCard (the "progress chart")
//   - reorders so Done sits ABOVE Files
//   - caps Done at 3 with a Show-more disclosure (overrides CV3's
//     shippedLimit default of 50)
//   - tight brutalist body padding (no 28px gutter)
//
// R7.1 (2026-05-13).

import { useEffect, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { useTasksPanel } from '../components/cv3/tasks/useTasksPanel.js'
import { TasksPanelProvider, useTasksPanelCtx } from '../components/cv3/tasks/TasksPanelContext.jsx'
import { TaskContextMenu } from '../components/cv3/ContextMenu.jsx'

import { AllFilesSection, ProjectFilesSection, ProjectMissionsSection, MissionBreadcrumb, MissionScaffoldSection } from '../components/cv3/tasks/FilesSection.jsx'
import TaskDrawerProjectSummary from '../components/cv3/tasks/TaskDrawerProjectSummary.jsx'
import TaskDrawerFileFAQ from '../components/cv3/tasks/TaskDrawerFileFAQ.jsx'
import DocUpdatesStripe from '../components/cv3/shared/DocUpdateCard.jsx'
import ActiveTasksSection from '../components/cv3/tasks/ActiveTasksSection.jsx'
import ForemanTasksSection from '../components/cv3/tasks/ForemanTasksSection.jsx'
import PersonalTodosSection from '../components/cv3/tasks/PersonalTodosSection.jsx'
import WaitingTasksSection from '../components/cv3/tasks/WaitingTasksSection.jsx'
import BlockedTasksSection from '../components/cv3/tasks/BlockedTasksSection.jsx'
import FailedTasksSection from '../components/cv3/tasks/FailedTasksSection.jsx'
import TaskInputBar from '../components/cv3/tasks/TaskInputBar.jsx'
import CreateProjectModal from '../components/cv3/tasks/CreateProjectModal.jsx'

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
    filteredActive, filteredCompleted,
    ctxToast,
    taskMenu, setTaskMenu,
    taskProjects,
    handleTaskFollowUp,
    handleTaskNeedsVerification,
    handleTaskResearch,
    handleTaskMoveTo,
    setShippedLimit,
  } = useTasksPanelCtx()

  // Cap Done at 3 on first mount. CV3's hook defaults to 50; this is the only
  // CV4 override. Show-more bumps by 10 each tap (smaller than CV3's 50).
  useEffect(() => {
    setShippedLimit(3)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px' }}>

        {/* Search + project filter pills — the only piece the user explicitly
            wants preserved. */}
        <div style={{ marginBottom: 18 }}>
          <div data-cv4-tasks-search style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid ' + (searchFocused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'),
            padding: '8px 12px',
            marginBottom: 10,
            transition: 'border-color 0.15s',
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: C.text, fontSize: 13, fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
              }}>×</button>
            )}
          </div>

          <div data-cv4-tasks-pills style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {projectPills.map(p => {
              const isActive = activeProject === p.slug
              return (
                <button
                  key={p.slug}
                  data-testid={`project-pill-${p.slug}`}
                  onClick={() => setActiveProject(p.slug)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    cursor: 'pointer', flexShrink: 0,
                    border: isActive ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.025)',
                    color: isActive ? C.accent : C.text2,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s',
                  }}
                >{p.name}</button>
              )
            })}
            <button
              data-testid="start-new-project-recipe"
              title="Create project — guided by your EA"
              onClick={(e) => {
                if (e.shiftKey || e.altKey) { toggleCreateProjectModal(); return }
                startConversationalProjectCreation()
              }}
              onContextMenu={(e) => { e.preventDefault(); toggleCreateProjectModal() }}
              style={{
                padding: '5px 10px',
                fontSize: 13, fontWeight: 700, lineHeight: 1,
                cursor: 'pointer', flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                color: C.text2,
              }}
            >+</button>
          </div>
        </div>

        {/* Project / mission scope blocks — kept as-is; they're the FAQ/scaffold/missions trees.
            We're keeping them above the live task list because they ARE the task list when
            you've drilled into a specific project or mission. */}
        {activeMissionPath && (
          <div data-testid="mission-view" data-mission-path={activeMissionPath}>
            <MissionBreadcrumb />
            <MissionScaffoldSection />
            <ProjectMissionsSection />
          </div>
        )}
        {!activeMissionPath && activeProject && activeProject !== 'all' && (
          <div data-testid="project-card" data-slug={activeProject}>
            <TaskDrawerProjectSummary />
            <DocUpdatesStripe project={activeProject} limit={5} />
            <TaskDrawerFileFAQ filename="VISION.md"   label="Vision"   testid="task-drawer-vision-faq"   iconColor="#A78BFA" />
            <TaskDrawerFileFAQ filename="RESEARCH.md" label="Research" testid="task-drawer-research-faq" iconColor="#6EE7B7" />
            <ProjectMissionsSection />
          </div>
        )}

        <PersonalTodosSection />

        {/* Live task state — Right Now > Needs Input > Blocked > Failed > Foreman.
            Stripped of WeeklyStatsCard (the "progress chart" the user asked us to remove). */}
        <ActiveTasksSection />
        <WaitingTasksSection />
        <BlockedTasksSection />
        <FailedTasksSection />
        <ForemanTasksSection />

        {/* Done — 3 most recent + show more. Sits ABOVE Files per the new order. */}
        <DoneSectionCv4 />

        {/* Files — bottom of the scroll. */}
        {(!activeProject || activeProject === 'all') && !searchQuery && <AllFilesSection />}
        {!activeMissionPath && activeProject && activeProject !== 'all' && <ProjectFilesSection />}
        {activeMissionPath && <ProjectFilesSection />}

        {/* Empty state */}
        {filteredActive.length === 0 && filteredCompleted.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 12, paddingTop: 60 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {searchQuery || activeProject !== 'all' ? 'No matching tasks' : 'All clear'}
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>
              {searchQuery || activeProject !== 'all' ? 'Try a different search or filter' : 'Nothing on your plate right now'}
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

/* CV4 Done section — 3 items collapsed by default, show-more bumps by 10.
   Uses the shared context for click handlers; renders a much simpler card
   (single line + meta strip) instead of the colored chrome on the CV3 cards. */
function DoneSectionCv4() {
  const {
    filteredCompleted,
    expandedTask, toggleTaskExpand,
    openTaskMenu, startTaskLongPress, cancelTaskLongPress,
    taskProjects,
  } = useTasksPanelCtx()
  const [showAll, setShowAll] = useState(false)

  if (filteredCompleted.length === 0) return null
  const visible = showAll ? filteredCompleted : filteredCompleted.slice(0, 3)
  const hidden = filteredCompleted.length - visible.length

  return (
    <div data-cv4-done style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h2
          data-testid="task-column-header"
          data-column="done"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18, fontWeight: 800,
            color: C.text, letterSpacing: '0.02em',
            textTransform: 'uppercase',
            margin: 0, lineHeight: 1, flex: 1,
            paddingBottom: 8,
            borderBottom: '2px solid rgba(255,255,255,0.08)',
          }}
        >Done</h2>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700, color: C.dim,
          padding: '2px 7px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>{filteredCompleted.length}</span>
      </div>

      {visible.map((t) => {
        const qa = t.qa_score || t.qaScore
        const agent = t.agent_identity || t.agentIdentity
        const project = t.project_name || t.projectName
        const isFailed = t.status === 'failed'
        return (
          <div
            key={t.id}
            data-test-id="task-card-done"
            data-task-id={t.id}
            onClick={() => toggleTaskExpand(t.id)}
            onContextMenu={(e) => openTaskMenu(e, t)}
            onTouchStart={(e) => startTaskLongPress(e, t)}
            onTouchEnd={cancelTaskLongPress}
            onTouchMove={cancelTaskLongPress}
            onTouchCancel={cancelTaskLongPress}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer',
              opacity: isFailed ? 0.78 : 1,
            }}
          >
            {/* Project color dot */}
            {t.project_id && (() => {
              const proj = taskProjects.find(p => String(p.id) === String(t.project_id))
              return proj ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, flexShrink: 0 }} /> : null
            })()}
            {/* Title */}
            <span style={{
              flex: 1, minWidth: 0,
              fontSize: 13, fontWeight: 500,
              color: isFailed ? '#FCA5A5' : C.text2,
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: expandedTask === t.id ? 'normal' : 'nowrap',
            }}>{t.title || t.text || 'Untitled task'}</span>
            {/* Meta */}
            {(agent || project) && (
              <span style={{
                fontSize: 10, color: C.muted,
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {[agent, project].filter(Boolean).join(' · ')}
              </span>
            )}
            {qa != null && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isFailed ? '#FCA5A5' : C.muted,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '1px 5px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}>QA {qa}</span>
            )}
          </div>
        )
      })}

      {!showAll && hidden > 0 && (
        <button
          data-testid="cv4-done-show-more"
          onClick={() => setShowAll(true)}
          style={{
            width: '100%', textAlign: 'center',
            padding: '8px',
            marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: C.muted,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted }}
        >Show {hidden} more</button>
      )}
      {showAll && filteredCompleted.length > 3 && (
        <button
          onClick={() => setShowAll(false)}
          style={{
            width: '100%', textAlign: 'center',
            padding: '8px',
            marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: C.muted,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
          }}
        >Collapse</button>
      )}
    </div>
  )
}
