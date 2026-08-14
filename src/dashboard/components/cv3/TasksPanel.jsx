// TasksPanel -- task queue shell. State lives in useTasksPanel and is exposed
// via TasksPanelContext to all subcomponents in ./tasks/*.
// pipeline-test 2026-04-12 safe_push verification -- do not remove
//
// R2a (Apr 16, 2026): split the 2774 LOC component into shell + ./tasks/ pieces.
// R3a (Apr 17, 2026): moved state routing into useTasksPanel + TasksPanelContext.
// Subcomponents now read via useTasksPanelCtx() instead of being prop-drilled.
// R3d (Apr 17, 2026): cross-cutting state (currentUser, worldId, task pipes,
// chat-nav callbacks) now flows in via CornerContext, not props. The shell
// takes zero props -- useTasksPanel reads CornerAuth/Data/Nav internally.
import { C } from '../../lib/cv3Colors.js'
import { TaskContextMenu } from './ContextMenu.jsx'

import { AllFilesSection, ProjectFilesSection, ProjectMissionsSection, MissionBreadcrumb, MissionScaffoldSection, ProjectCanonSection } from './tasks/FilesSection.jsx'
import TaskDrawerProjectSummary from './tasks/TaskDrawerProjectSummary.jsx'
import DocUpdatesStripe from './shared/DocUpdateCard.jsx'
import ActiveTasksSection from './tasks/ActiveTasksSection.jsx'
import ForemanTasksSection from './tasks/ForemanTasksSection.jsx'
import LivingParagraphCard from './tasks/LivingParagraphCard.jsx'
import PersonalTodosSection from './tasks/PersonalTodosSection.jsx'
import WaitingTasksSection from './tasks/WaitingTasksSection.jsx'
import BlockedTasksSection from './tasks/BlockedTasksSection.jsx'
import FailedTasksSection from './tasks/FailedTasksSection.jsx'
import DoneTasksSection from './tasks/DoneTasksSection.jsx'
import WeeklyStatsCard from './tasks/WeeklyStatsCard.jsx'
import TaskInputBar from './tasks/TaskInputBar.jsx'
import CreateProjectModal from './tasks/CreateProjectModal.jsx'
import { TasksPanelProvider, useTasksPanelCtx } from './tasks/TasksPanelContext.jsx'
import { useTasksPanel } from './tasks/useTasksPanel.js'

export default function TasksPanel() {
  const ctx = useTasksPanel()
  return (
    <TasksPanelProvider value={ctx}>
      <TasksPanelBody />
    </TasksPanelProvider>
  )
}

function TasksPanelBody() {
  const {
    searchQuery, setSearchQuery, searchFocused, setSearchFocused,
    activeProject, setActiveProject,
    activeMissionPath,
    projectPills,
    toggleCreateProjectModal,
    startConversationalProjectCreation,
    filteredActive, filteredCompleted,
    selectedBrief, briefHtml, briefLoading, closeBriefViewer,
    ctxToast,
    taskMenu, setTaskMenu,
    taskProjects,
    handleTaskFollowUp,
    handleTaskNeedsVerification,
    handleTaskResearch,
    handleTaskMoveTo,
    worldId,
  } = useTasksPanelCtx()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

      {/* Keyframes for animated progress bars */}
      <style>{`
        @keyframes cv3-progress-sweep {
          0%   { width: 25% }
          50%  { width: 72% }
          100% { width: 25% }
        }
        @keyframes bld {
          0%   { width: 5% }
          50%  { width: 60% }
          100% { width: 90% }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes rec-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5) } 60% { box-shadow: 0 0 0 8px rgba(239,68,68,0) } }
        @keyframes rec-dot { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes cv3-summary-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); border-color: rgba(16,185,129,0.55) }
          70%  { box-shadow: 0 0 0 12px rgba(16,185,129,0) }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0) }
        }
        @keyframes cv3-summary-dot {
          0%, 100% { opacity: 0.35; transform: scale(1) }
          50%      { opacity: 1;    transform: scale(1.4) }
        }
        .briefing-summary-body {
          font-family: 'Inter', sans-serif;
          word-break: break-word;
        }
        .briefing-summary-body p {
          margin: 0 0 8px 0;
          line-height: 1.65;
        }
        .briefing-summary-body p:last-child { margin-bottom: 0; }
        .briefing-summary-body strong { font-weight: 700; color: #F1F5F9; }
        .briefing-summary-body em { font-style: italic; color: #94A3B8; }
        .briefing-summary-body ul, .briefing-summary-body ol {
          margin: 6px 0 10px 0;
          padding-left: 18px;
        }
        .briefing-summary-body li {
          margin-bottom: 4px;
          line-height: 1.55;
        }
        .briefing-summary-body h1, .briefing-summary-body h2,
        .briefing-summary-body h3, .briefing-summary-body h4 {
          font-weight: 700;
          color: #F1F5F9;
          margin: 12px 0 6px 0;
          line-height: 1.3;
        }
        .briefing-summary-body h1 { font-size: 15px; }
        .briefing-summary-body h2 { font-size: 14px; }
        .briefing-summary-body h3 { font-size: 13px; }
        .briefing-summary-body a {
          color: #60a5fa;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: rgba(96,165,250,0.3);
        }
        .briefing-summary-body code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85em;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          padding: 1px 5px;
        }
        .briefing-summary-body hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 12px 0;
        }
        .briefing-summary-body blockquote {
          border-left: 3px solid rgba(255,255,255,0.15);
          margin: 8px 0;
          padding: 4px 12px;
          color: #94A3B8;
        }
        /* R37b — article-shape typography for the file viewer overlay.
           Briefs are short summaries (kept tight above). Long scaffold MDs
           need real document hierarchy: clearly tiered headings, generous
           paragraph rhythm, code blocks with background, indented lists. */
        .briefing-summary-body.article {
          font-size: 15px;
          color: #CBD5E1;
          line-height: 1.75;
        }
        .briefing-summary-body.article h1 { font-size: 28px; margin: 0 0 18px 0; letter-spacing: -0.02em; }
        .briefing-summary-body.article h2 { font-size: 22px; margin: 32px 0 12px 0; letter-spacing: -0.01em; padding-top: 4px; }
        .briefing-summary-body.article h3 { font-size: 17px; margin: 22px 0 10px 0; }
        .briefing-summary-body.article h4 { font-size: 15px; margin: 18px 0 8px 0; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; }
        .briefing-summary-body.article p { margin: 0 0 14px 0; line-height: 1.75; }
        .briefing-summary-body.article ul,
        .briefing-summary-body.article ol { margin: 8px 0 16px 0; padding-left: 24px; }
        .briefing-summary-body.article li { margin-bottom: 8px; line-height: 1.7; }
        .briefing-summary-body.article li > p { margin: 0 0 6px 0; }
        .briefing-summary-body.article hr { margin: 24px 0; border-top-color: rgba(255,255,255,0.1); }
        .briefing-summary-body.article blockquote { margin: 14px 0; padding: 8px 16px; border-left-width: 4px; }
        .briefing-summary-body.article pre {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 14px 16px;
          margin: 12px 0 16px 0;
          overflow-x: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.55;
        }
        .briefing-summary-body.article pre code {
          background: transparent;
          padding: 0;
          font-size: inherit;
          color: #CBD5E1;
        }
        .briefing-summary-body.article table {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0 18px 0;
          font-size: 13px;
        }
        .briefing-summary-body.article th,
        .briefing-summary-body.article td {
          border: 1px solid rgba(255,255,255,0.08);
          padding: 8px 12px;
          text-align: left;
        }
        .briefing-summary-body.article th {
          background: rgba(255,255,255,0.04);
          color: #F1F5F9;
          font-weight: 600;
        }
        @keyframes rn-glow {
          0%, 100% { opacity: 0.4 }
          50%      { opacity: 1 }
        }
      `}</style>

      {/* ── Inline brief viewer overlay ─────────────────────────── */}
      {selectedBrief && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: C.bg,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px 14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <button
              onClick={closeBriefViewer}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                minWidth: 44, minHeight: 44,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.muted, padding: '0 8px', borderRadius: 8,
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedBrief.title || selectedBrief.filename || 'Brief'}
              </div>
              {(selectedBrief.agent || selectedBrief.dateFormatted || selectedBrief.date) && (
                <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                  {[selectedBrief.agent, selectedBrief.dateFormatted || selectedBrief.date].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
          {/* Content */}
          <div style={{ flex: 1, padding: '28px 32px 56px', maxWidth: 760, width: '100%', boxSizing: 'border-box' }}>
            {briefLoading ? (
              <div style={{ color: C.dim, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Loading…</div>
            ) : (
              <div
                data-testid="brief-viewer-content"
                className={`briefing-summary-body${selectedBrief.source === 'scaffold' || (selectedBrief.filename || '').endsWith('.md') ? ' article' : ''}`}
                dangerouslySetInnerHTML={{ __html: briefHtml }}
              />
            )}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 24px' }}>

        {/* ── Search + Project filters ────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          {/* Search input — minimal */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid ' + (searchFocused ? 'rgba(255,255,255,0.1)' : 'transparent'),
            borderRadius: 14,
            padding: '10px 16px',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: 12,
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
              stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                  fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
              >×</button>
            )}
          </div>

          {/* Project filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
            {projectPills.map(p => {
              const isActive = activeProject === p.slug
              return (
                <button
                  key={p.slug}
                  data-testid={`project-pill-${p.slug}`}
                  onClick={() => setActiveProject(p.slug)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? C.accent : C.text2,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >{p.name}</button>
              )
            })}
            {/* R49: default "+ project" click starts the conversational
                recipe with the EA. Shift-click (or right-click) falls back
                to the R24 modal for power users who want direct input. */}
            <button
              data-testid="start-new-project-recipe"
              title="Create project guided by your EA"
              onClick={(e) => {
                if (e.shiftKey || e.altKey) { toggleCreateProjectModal(); return }
                startConversationalProjectCreation()
              }}
              onContextMenu={(e) => { e.preventDefault(); toggleCreateProjectModal() }}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: C.text2,
                fontFamily: "'Inter', sans-serif",
              }}
            >+</button>
            {/* R24 modal fallback — kept as a secondary affordance so the
                gate + power users can open the form directly. */}
            <button
              data-testid="open-create-project-modal"
              title="Create project (direct form)"
              aria-label="Create project via direct form"
              onClick={toggleCreateProjectModal}
              style={{
                padding: '6px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                color: C.muted,
                fontFamily: "'Inter', sans-serif",
                opacity: 0.6,
              }}
            >+ form</button>
          </div>
        </div>

        {/* R39-4: breadcrumb appears when the drawer is in mission scope.
            R51: inside a mission, show the six-file scaffold for THAT
            mission FIRST, then any nested sub-missions, then the free-form
            file list. The scaffold is the shape; sub-missions nest under it. */}
        {activeMissionPath && (
          <div data-testid="mission-view" data-mission-path={activeMissionPath}>
            <MissionBreadcrumb />
            <MissionScaffoldSection />
            <ProjectMissionsSection />
            <ProjectFilesSection />
          </div>
        )}

        {/* Project scope (no mission drilled in). R15: whole block is a
            single project-card per VISION Pillar 2. Testid surfaces the card
            as a unit so acceptance gates can find it + its freshness dot. */}
        {!activeMissionPath && activeProject && activeProject !== 'all' && (
          <div data-testid="project-card" data-slug={activeProject}>
            <TaskDrawerProjectSummary />
            {/* R75-h4 -- live project-state feed: recent doc edits + mission creates.
                Reuses DocUpdatesStripe already live in project-chat (h1/h2). */}
            <DocUpdatesStripe project={activeProject} limit={5} />
            {/* R52 — five canon CAPS files (VISION/BUILD/CONTEXT/RESEARCH/ROADMAP)
                at top with distinct icons, then Missions/ and Files/ folders. */}
            <ProjectCanonSection />
          </div>
        )}
        {/* ── Owner's Personal Todos (R14e-4) ──────────────────── */}
        <PersonalTodosSection />

        {/* ── R62: living greeting-paragraph above the stats + hero stack.
               "All" filter → roundup across projects; project pill → scoped.
               Read-more expands detail sourced from the same endpoint. */}
        {!searchQuery && !activeMissionPath && (
          <LivingParagraphCard world={worldId} activeProject={activeProject} />
        )}

        {/* ── FOREMAN — Parent card + grouped children ─────────── */}
        <ForemanTasksSection />

        {/* ── RIGHT NOW — Hero section ─────────────────────────── */}
        <ActiveTasksSection />

        {/* ── This Week — Clean stats ─────────────────────────── */}
        <WeeklyStatsCard />

        {/* ── Needs Input ──────────────────────────────────────── */}
        <WaitingTasksSection />

        {/* ── Blocked ─────────────────────────────────────────── */}
        <BlockedTasksSection />

        {/* ── Failed ──────────────────────────────────────────── */}
        <FailedTasksSection />

        {/* R14b: Files drop below failed + active on the 'all' view so
            actionable state (failed, active) lives above archival state
            (files). Files section is already count-only + expand per R30. */}
        {(!activeProject || activeProject === 'all') && !searchQuery && <AllFilesSection />}

        {/* ── Done ────────────────────────────────────────────── */}
        <DoneTasksSection />

        {/* Empty state */}
        {filteredActive.length === 0 && filteredCompleted.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, gap: 16, paddingTop: 80 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', marginBottom: 6 }}>
                {searchQuery || activeProject !== 'all' ? 'No matching tasks' : 'All clear'}
              </div>
              <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
                {searchQuery || activeProject !== 'all' ? 'Try a different search or filter' : 'Nothing on your plate right now'}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Task creation input bar */}
      <TaskInputBar />

      {/* Create Project Modal */}
      <CreateProjectModal />

      {/* Right-click context menu for task cards */}
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
        <div
          data-test-id="ctx-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 20,
            transform: 'translateX(-50%)',
            zIndex: 9998,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.32)',
            color: '#A7F3D0',
            padding: '8px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          {ctxToast.text}
        </div>
      )}
    </div>
  )
}

