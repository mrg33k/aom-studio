// CV4 RightRail — collapsible tasks panel.
// Replaces the top-tab Chat/Tasks switcher; chat stays visible while tasks fold in.

import TasksPanel from '../components/cv3/TasksPanel.jsx'

export default function RightRail({ open, onClose }) {
  if (!open) return null

  return (
    <aside
      data-testid="cv4-rightrail"
      className="flex h-full w-[360px] flex-shrink-0 flex-col border-l border-white/[0.06] bg-[#0a0d14]"
    >
      <div className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-aom-text-light">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aom-orange">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Tasks
        </div>
        <button
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-md text-aom-text-muted transition-colors hover:bg-white/[0.06] hover:text-aom-text-light"
          aria-label="Hide tasks"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TasksPanel />
      </div>
    </aside>
  )
}
