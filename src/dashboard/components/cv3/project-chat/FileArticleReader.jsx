// FileArticleReader -- article-style reader for project canonical MD files.
// Single-column layout, max-width 720px, large readable type.
// Opened by clicking a canonical file in CanonFilesPanel.
// R75-e3 MVP slice.

import { useState, useEffect } from 'react'
// r7:open-agent-surface — file-content is world-gated now; send the session.
import { authFetch } from '../../../lib/authFetch.js'
import { C } from '../../../lib/cv3Colors.js'
import { useChatCore } from '../chat/ChatPanelContext.jsx'

export default function FileArticleReader({ filename, onClose }) {
  const { selectedProject, worldId } = useChatCore()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const projectSlug = selectedProject?.slug
  if (!projectSlug) return null

  useEffect(() => {
    async function loadFile() {
      try {
        let url = `/api/dashboard/file-content?project=${encodeURIComponent(projectSlug)}&filename=${encodeURIComponent(filename)}`
        if (worldId) url += `&client_id=${encodeURIComponent(worldId)}`
        const res = await authFetch(url)
        if (res.ok) {
          const data = await res.json()
          setContent(data.content || '')
        } else if (res.status === 404) {
          setError(true)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      }
      setLoading(false)
    }
    loadFile()
  }, [projectSlug, filename, worldId])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bg,
          borderRadius: 12,
          width: '90%', maxWidth: 820, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: C.text,
              fontFamily: "'Inter', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {filename.replace(/\.md$/, '')}
            </div>
            <div style={{ fontSize: 12, color: C.dim, fontFamily: "'Inter', sans-serif", marginTop: 4 }}>
              {projectSlug}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.muted, flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '40px 48px 60px',
          background: C.bg,
        }}>
          {loading ? (
            <div style={{ color: C.dim, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
              Loading…
            </div>
          ) : error ? (
            <div style={{ color: '#EF4444', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
              File not available.
            </div>
          ) : (
            <div
              className="article-reader"
              style={{
                maxWidth: 720, margin: '0 auto',
                fontSize: 16, lineHeight: 1.7, color: C.text,
                fontFamily: "'Inter', sans-serif",
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>

      <style>{`
        .article-reader h1 {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
          margin: 32px 0 16px;
          color: ${C.text};
        }
        .article-reader h2 {
          font-size: 24px;
          font-weight: 700;
          line-height: 1.3;
          margin: 28px 0 14px;
          color: ${C.text};
        }
        .article-reader h3 {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
          margin: 24px 0 12px;
          color: ${C.text};
        }
        .article-reader p {
          margin: 16px 0;
          color: ${C.text};
        }
        .article-reader code {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: "'JetBrains Mono', monospace";
          font-size: 14px;
          color: #E0E0E0;
        }
        .article-reader pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 16px;
          overflow-x: auto;
          margin: 20px 0;
          font-family: "'JetBrains Mono', monospace";
          font-size: 13px;
          line-height: 1.6;
        }
        .article-reader pre code {
          background: none;
          border: none;
          padding: 0;
          color: #E0E0E0;
        }
        .article-reader blockquote {
          border-left: 4px solid ${C.muted};
          padding-left: 16px;
          margin: 20px 0;
          opacity: 0.8;
          font-style: italic;
        }
        .article-reader ul, .article-reader ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .article-reader li {
          margin: 8px 0;
        }
        .article-reader a {
          color: #60A5FA;
          text-decoration: none;
          border-bottom: 1px solid rgba(96, 165, 250, 0.3);
          transition: all 0.15s;
        }
        .article-reader a:hover {
          color: #93C5FD;
          border-bottom-color: rgba(96, 165, 250, 0.6);
        }
        .article-reader hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 32px 0;
        }
      `}</style>
    </div>
  )
}
