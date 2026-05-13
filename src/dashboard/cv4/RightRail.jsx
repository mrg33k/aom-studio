// CV4 RightRail — collapsible tasks panel (editorial header).

import TasksPanel from '../components/cv3/TasksPanel.jsx'

export default function RightRail({ open, onClose }) {
  if (!open) return null

  return (
    <aside data-testid="cv4-rightrail" className="cv4-rail">
      <div className="cv4-rail__header">
        <div className="cv4-rail__title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cv4-amber)' }}>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Tasks</span>
        </div>
        <button
          onClick={onClose}
          className="cv4-iconbtn"
          aria-label="Hide tasks"
          style={{ width: 30, height: 30 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="cv4-rail__body">
        <TasksPanel />
      </div>
    </aside>
  )
}
