import { useState } from 'react'
import { marked } from 'marked'
import { C } from '../../../lib/cv3Colors.js'
import { formatFileSize, getFileMeta } from './projectChatConstants.js'
import {
  useChatCore,
  useChatAttachmentsCtx,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'
import useProjectChatFiles from './useProjectChatFiles.js'

marked.setOptions({ gfm: true, breaks: true })

function renderMd(src) {
  if (!src) return ''
  try { return marked.parse(String(src)) } catch { return '' }
}

// Files drawer opened from the project-chat header. Lists every file uploaded
// to this project's files bucket via /api/dashboard/files?type=text. Clicking
// a row toggles an inline content viewer; markdown rows are rendered as HTML,
// everything else falls back to a <pre> block.
export default function ProjectFilesPanel() {
  const { selectedProject } = useChatCore()
  const { uploading } = useChatAttachmentsCtx()
  const { filesOpen } = useChatSettingsCtx()
  const { projectFiles, filesLoading } = useProjectChatFiles({
    filesOpen, selectedProject, uploading,
  })
  const [openId, setOpenId] = useState(null)
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
            const rowKey = file.id || file.path || fileMeta.name || i
            const isOpen = openId === rowKey
            const isMd = (fileMeta.name || '').toLowerCase().endsWith('.md')
            const content = file.content || ''
            return (
              <div
                key={rowKey}
                style={{
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : rowKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', width: '100%',
                    background: 'transparent', border: 'none',
                    cursor: content ? 'pointer' : 'default',
                    color: 'inherit', textAlign: 'left',
                  }}
                  disabled={!content}
                  title={content ? 'Click to view content' : 'No content available'}
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
                  {content ? (
                    <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, width: 12, textAlign: 'center' }}>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  ) : null}
                </button>
                {isOpen && content ? (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: '12px 14px',
                    fontSize: 13,
                    color: C.text,
                    lineHeight: 1.55,
                    maxHeight: 480,
                    overflow: 'auto',
                    background: 'rgba(0,0,0,0.18)',
                  }}>
                    {isMd ? (
                      <div
                        className="cv3-md-body"
                        style={{ wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: renderMd(content) }}
                      />
                    ) : (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>
                        {content}
                      </pre>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
