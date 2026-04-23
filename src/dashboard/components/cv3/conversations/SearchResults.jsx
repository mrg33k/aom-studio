// R4 grouped search results: agents, projects, tasks, messages -- shown
// only when the home search query is >= 2 chars. Replaces the default
// home (Elon hero + agents + projects). Extracted verbatim from
// ConversationsView during R2e split.
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime } from '../shared.jsx'

export default function SearchResults({
  q,
  searching,
  agentHits, projectHits, taskHits, msgHits, fileHits = [],
  agents, projects,
  setSearchQuery,
  setSelectedAgent, onSelectAgent,
  setInlineProject, onSelectProject,
  setMessages,
}) {
  return (
    <div data-testid="search-results">
      {/* Agents */}
      {agentHits.length > 0 && (
        <div data-testid="search-section" data-section="agents" style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', gap: 6,
          }}>
            <span>Agents</span>
            <span style={{
              fontSize: 10, color: C.muted,
              background: 'rgba(255,255,255,0.06)', borderRadius: 8,
              padding: '1px 6px',
            }}>{agentHits.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {agentHits.slice(0, 6).map(a => (
              <button
                key={`srch-a-${a.slug}`}
                data-testid="search-result"
                data-result-type="agent"
                data-result-slug={a.slug}
                onClick={() => { setSearchQuery(''); setSelectedAgent(a); onSelectAgent?.(a) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px',
                  borderRadius: 10, background: C.s1,
                  border: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: a.color || C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11, color: '#000',
                }}>{(a.name || '?')[0].toUpperCase()}</div>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projectHits.length > 0 && (
        <div data-testid="search-section" data-section="projects" style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', gap: 6,
          }}>
            <span>Projects</span>
            <span style={{
              fontSize: 10, color: C.muted,
              background: 'rgba(255,255,255,0.06)', borderRadius: 8,
              padding: '1px 6px',
            }}>{projectHits.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {projectHits.slice(0, 6).map(p => {
              const pColor = p.color || '#6B8AB0'
              return (
                <button
                  key={`srch-p-${p.id || p.slug}`}
                  data-testid="search-result"
                  data-result-type="project"
                  data-result-slug={p.slug}
                  onClick={() => {
                    setSearchQuery('')
                    setInlineProject(p)
                    setMessages([])
                    setSelectedAgent(null)
                    onSelectProject?.(p)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 12px',
                    borderRadius: 10, background: C.s1,
                    border: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                    border: `1px solid ${pColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: pColor }} />
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks */}
      {taskHits.length > 0 && (
        <div data-testid="search-section" data-section="tasks" style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', gap: 6,
          }}>
            <span>Tasks</span>
            <span style={{
              fontSize: 10, color: C.muted,
              background: 'rgba(255,255,255,0.06)', borderRadius: 8,
              padding: '1px 6px',
            }}>{taskHits.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {taskHits.map(t => (
              <div
                key={`srch-t-${t.id}`}
                data-testid="search-result"
                data-result-type="task"
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  background: C.s1, border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: C.muted, fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    padding: '1px 6px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.04)',
                    flexShrink: 0,
                  }}>{t.status || '?'}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: C.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1, minWidth: 0,
                  }}>{t.title || t.text || '(untitled)'}</span>
                  {t.project && (
                    <span style={{
                      fontSize: 9, color: C.dim,
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}>{t.project}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {msgHits.length > 0 && (
        <div data-testid="search-section" data-section="messages" style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', gap: 6,
          }}>
            <span>Messages</span>
            <span style={{
              fontSize: 10, color: C.muted,
              background: 'rgba(255,255,255,0.06)', borderRadius: 8,
              padding: '1px 6px',
            }}>{msgHits.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {msgHits.map(m => {
              const scopeLabel = m.project ? `#${m.project}` : (m.agent ? `@${m.agent}` : '')
              return (
                <button
                  key={`srch-m-${m.id}`}
                  data-testid="search-result"
                  data-result-type="message"
                  onClick={() => {
                    setSearchQuery('')
                    // Jump to the conversation scope this message belongs to
                    if (m.project) {
                      const proj = (projects || []).find(p => p.slug === m.project)
                      if (proj) {
                        setInlineProject(proj)
                        setMessages([])
                        setSelectedAgent(null)
                        onSelectProject?.(proj)
                      }
                    } else if (m.agent) {
                      const agent = (agents || []).find(a => a.slug === m.agent)
                      if (agent) {
                        setSelectedAgent(agent)
                        onSelectAgent?.(agent)
                      }
                    }
                  }}
                  style={{
                    padding: '9px 12px', borderRadius: 10,
                    background: C.s1, border: `1px solid ${C.border}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: m.role === 'user' ? '#60A5FA' : C.accent,
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase',
                    }}>{m.role}</span>
                    {scopeLabel && (
                      <span style={{
                        fontSize: 9, color: C.dim,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{scopeLabel}</span>
                    )}
                    <span style={{
                      fontSize: 9, color: C.dim,
                      fontFamily: "'JetBrains Mono', monospace",
                      marginLeft: 'auto',
                    }}>
                      {m.timestamp ? formatChatTime(m.timestamp) : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: C.text2,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {(m.text || '').trim()}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Files (R68) */}
      {fileHits.length > 0 && (
        <div data-testid="search-section" data-section="files" style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 8, display: 'flex', gap: 6,
          }}>
            <span>Files</span>
            <span style={{
              fontSize: 10, color: C.muted,
              background: 'rgba(255,255,255,0.06)', borderRadius: 8,
              padding: '1px 6px',
            }}>{fileHits.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fileHits.map(f => {
              const proj = (projects || []).find(p => p.slug === (f.parent || f.project))
              const projectLabel = f.parent ? `#${f.parent}/${f.project}` : `#${f.project}`
              return (
                <button
                  key={`srch-f-${f.id}`}
                  data-testid="search-result"
                  data-result-type="file"
                  data-result-project={f.parent || f.project}
                  data-result-filename={f.filename}
                  onClick={() => {
                    // Open the project the file belongs to; deep link into file
                    // selection is a later sub-round.
                    if (proj) {
                      setSearchQuery('')
                      setInlineProject(proj)
                      setMessages([])
                      setSelectedAgent(null)
                      onSelectProject?.(proj)
                    }
                  }}
                  style={{
                    padding: '9px 12px', borderRadius: 10,
                    background: C.s1, border: `1px solid ${C.border}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 10, color: C.accent,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>📄</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: C.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, minWidth: 0,
                    }}>{f.filename}</span>
                    <span style={{
                      fontSize: 9, color: C.dim,
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}>{projectLabel}</span>
                  </div>
                  {f.preview && (
                    <div style={{
                      fontSize: 11, color: C.text2,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {f.preview}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && msgHits.length + taskHits.length + agentHits.length + projectHits.length + fileHits.length === 0 && (
        <div style={{
          fontSize: 13, color: C.muted, textAlign: 'center',
          padding: '40px 0',
        }}>
          No matches for "{q}".
        </div>
      )}
    </div>
  )
}
