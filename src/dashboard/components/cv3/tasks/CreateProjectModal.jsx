// CreateProjectModal -- new-project naming + color picker overlay
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

const PALETTE = ['#EAB308', '#22C55E', '#A78BFA', '#F59E0B', '#10B981', '#F97316']

export default function CreateProjectModal() {
  const {
    showCreateProjectModal,
    closeCreateProjectModal,
    projectName,
    setProjectName,
    selectedColor,
    setSelectedColor,
    handleCreateProject,
    createProjectSubmitting,
    createProjectError,
  } = useTasksPanelCtx()

  if (!showCreateProjectModal) return null

  const onClose = closeCreateProjectModal
  const onSubmit = handleCreateProject
  const isSubmitting = createProjectSubmitting
  const createError = createProjectError

  return (
    <div
      data-testid="create-project-modal"
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.s1,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
          padding: 28,
          width: 320,
          display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
          New Project
        </div>

        <input
          data-testid="project-name-input"
          type="text"
          placeholder="Project name..."
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '12px 16px',
            color: C.text,
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          {PALETTE.map(color => (
            <div
              key={color}
              onClick={() => setSelectedColor(color)}
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: color,
                cursor: 'pointer',
                border: selectedColor === color ? '2.5px solid #fff' : '2.5px solid transparent',
                boxSizing: 'border-box',
                flexShrink: 0,
                outline: selectedColor === color ? '2px solid rgba(255,255,255,0.2)' : 'none',
                outlineOffset: 3,
                transition: 'transform 0.15s',
              }}
            />
          ))}
        </div>

        {createError && (
          <div style={{ fontSize: 12, color: '#F87171', fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
            {createError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: isSubmitting ? 'default' : 'pointer',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'none',
              color: C.text2,
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.15s',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >Cancel</button>
          <button
            data-testid="create-project-confirm"
            onClick={onSubmit}
            disabled={isSubmitting || !projectName.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: (isSubmitting || !projectName.trim()) ? 'default' : 'pointer',
              border: 'none',
              background: C.accent,
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              transition: 'transform 0.15s, box-shadow 0.15s',
              opacity: (isSubmitting || !projectName.trim()) ? 0.5 : 1,
            }}
          >{isSubmitting ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}
