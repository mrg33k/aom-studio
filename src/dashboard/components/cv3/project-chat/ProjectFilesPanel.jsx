import { C } from '../../../lib/cv3Colors.js'
import { formatFileSize, getFileMeta } from './projectChatConstants.js'

// Files drawer opened from the project-chat header. Lists every file uploaded
// to this project's files bucket via /api/dashboard/files?type=text.
export default function ProjectFilesPanel({ projectFiles, filesLoading }) {
  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(8,14,28,0.95)',
      padding: '10px 14px',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Project Files
      </div>
      {filesLoading ? (
        <div style={{ fontSize: 13, color: C.muted, padding: '18px 0', textAlign: 'center' }}>Loading files...</div>
      ) : projectFiles.length === 0 ? (
        <div style={{ fontSize: 13, color: C.muted, padding: '18px 0', textAlign: 'center' }}>No project files</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {projectFiles.map((file, i) => {
            const fileMeta = getFileMeta(file)
            return (
              <div
                key={file.id || file.path || fileMeta.name || i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ width: 18, textAlign: 'center', flexShrink: 0, fontSize: 13, lineHeight: 1 }}>
                  {fileMeta.icon}
                </div>
                <span style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {fileMeta.name}
                </span>
                <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
                  {formatFileSize(fileMeta.size)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
