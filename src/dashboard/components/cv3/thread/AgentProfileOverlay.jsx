import { useEffect, useState } from 'react'
// r7:open-agent-surface — file-content is world-gated now; send the session.
import { authFetch } from '../../../lib/authFetch.js'
import { C } from '../../../lib/cv3Colors.js'
import AvatarUploader from '../shared/AvatarUploader.jsx'
import { useChatCore } from '../chat/ChatPanelContext.jsx'

// R40 -- Agent profile screen via info-icon.
//
// Full-height overlay that takes over the thread area (not a small tooltip).
// Shows the agent's scaffold files (Vision / Research / Build / Context) plus
// the tape (last-conversation.md) as collapsible sections. Read-only viewer
// shape: uses /api/dashboard/file-content?project=<agent-slug>&filename=<name>
// the same way R31's drawer FAQ does. If a file is missing (404), the panel
// quietly renders an empty-state line instead of the content -- matches the
// no-placeholder rule from R31 but gives the user a breadcrumb that the
// scaffold exists even if unfilled.
//
// Works for any agent slug because R39-2/6 backfilled the agents/ folder
// scaffold into the events table, keyed by agent=<slug>. No hardcoded slugs.

const SECTIONS = [
  { key: 'vision', filename: 'VISION.md', label: 'Vision', accent: '#A78BFA' },
  { key: 'research', filename: 'RESEARCH.md', label: 'Research', accent: '#6EE7B7' },
  { key: 'build', filename: 'BUILD.md', label: 'Build', accent: '#F9A8D4' },
  { key: 'context', filename: 'CONTEXT.md', label: 'Context', accent: '#FCD34D' },
  { key: 'tape', filename: 'last-conversation.md', label: 'Recent history', accent: '#93C5FD' },
]

function useFileContent(agentSlug, filename) {
  const [state, setState] = useState({ loading: false, html: '', error: false })
  useEffect(() => {
    if (!agentSlug || !filename) return
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: false }))
    authFetch(`/api/dashboard/file-content?project=${encodeURIComponent(agentSlug)}&filename=${encodeURIComponent(filename)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (!cancelled) setState({ loading: false, html: data.content || '', error: false }) })
      .catch(() => { if (!cancelled) setState({ loading: false, html: '', error: true }) })
    return () => { cancelled = true }
  }, [agentSlug, filename])
  return state
}

function Section({ agentSlug, section, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const content = useFileContent(isOpen ? agentSlug : null, isOpen ? section.filename : null)

  return (
    <div
      data-testid={`agent-profile-section-${section.key}`}
      style={{
        borderRadius: 12,
        border: `1px solid ${C.border2}`,
        background: C.s1,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setIsOpen(v => !v)}
        data-testid={`agent-profile-section-${section.key}-toggle`}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          color: C.text, fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: section.accent,
          boxShadow: `0 0 6px ${section.accent}88`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: C.text2,
        }}>
          {section.label}
        </span>
        <span style={{
          fontSize: 11, color: C.dim, fontFamily: 'JetBrains Mono, monospace',
        }}>
          {section.filename}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: C.dim, letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {isOpen ? 'Hide' : 'Show'}
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            padding: '4px 18px 18px',
            fontSize: 13.5,
            lineHeight: 1.6,
            color: C.text,
            fontFamily: "'Inter', sans-serif",
            borderTop: `1px solid ${C.border2}`,
          }}
        >
          {content.loading && (
            <div style={{ color: C.muted, fontSize: 12, padding: '8px 0' }}>Loading…</div>
          )}
          {!content.loading && content.error && (
            <div style={{ color: C.muted, fontSize: 12, padding: '8px 0' }}>
              Not filled in yet.
            </div>
          )}
          {!content.loading && !content.error && (
            <div
              className="agent-profile-content"
              dangerouslySetInnerHTML={{ __html: content.html }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentProfileOverlay({ agent, onClose }) {
  if (!agent) return null
  const slug = agent.slug
  const color = agent.color || '#3B9EFF'
  let worldId = ''
  try { worldId = useChatCore()?.worldId || '' } catch {}

  return (
    <div
      data-testid="agent-profile-overlay"
      data-agent-slug={slug}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(8, 14, 28, 0.97)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        borderBottom: `1px solid ${C.border2}`,
        background: 'rgba(8, 14, 28, 0.95)',
      }}>
        <AvatarUploader
          world={worldId}
          kind="agent"
          slug={slug}
          size={40}
          fallback={(
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {(agent.name || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: "'Inter', sans-serif",
          }}>
            {agent.display_name || agent.name}
          </div>
          <div style={{
            fontSize: 11.5, color: C.muted, fontStyle: 'italic',
            marginTop: 2,
            fontFamily: "'Inter', sans-serif",
          }}>
            {agent.primary_skill || agent.role || 'AI Agent'}
          </div>
        </div>
        <button
          onClick={onClose}
          data-testid="agent-profile-close"
          aria-label="Close agent profile"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: C.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable body of scaffold sections */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18 }}>
        {SECTIONS.map((section, i) => (
          <Section
            key={section.key}
            agentSlug={slug}
            section={section}
            defaultOpen={i === 0}
          />
        ))}
        <div style={{
          marginTop: 20, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(59,158,255,0.06)', border: '1px solid rgba(59,158,255,0.15)',
          color: C.muted, fontSize: 12, lineHeight: 1.5,
          fontFamily: "'Inter', sans-serif",
        }}>
          Read-only preview. The full scaffold lives in
          {' '}<code style={{ color: C.text }}>agents/{slug}/</code>{' '}
          and is maintained by {agent.name}.
        </div>
      </div>
    </div>
  )
}
