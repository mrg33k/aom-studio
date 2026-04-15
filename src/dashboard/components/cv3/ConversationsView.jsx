// ConversationsView -- home: Elon focus + Agents/Projects sections
// Redesigned to put Elon front and center with dedicated Agents and Projects sections below.
import { C } from '../../lib/cv3Colors.js'
import { formatChatTime, getStatusColor } from './shared.jsx'

export default function ConversationsView(ctx) {
  const {
    agents, onSelectAgent, onSelectProject,
    selectedAgent, setSelectedAgent, setMessages, setInlineProject,
    displayName, greetingIdx, GREETINGS, lastLoginText,
    unreadMap, unreadCounts, projectPreviews,
    projects,
    isVoiceActive, voiceMinimized, voiceMinimizedAgent,
    setVoiceMinimized,
  } = ctx

  const elonAgent = agents?.find(a => a.slug === 'elon')
  const elonLastMsg = elonAgent ? unreadMap[elonAgent.slug] : null
  const elonUnread = elonAgent ? (unreadCounts[elonAgent.slug] || 0) : 0
  const elonStatusInfo = elonAgent ? getStatusColor(elonAgent.status) : { dot: '#506480', glow: 'none' }
  const elonIsActive = elonAgent?.status?.toUpperCase() !== 'IDLE'

  const sortedProjects = [...(projects || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '16px 20px',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Call in progress banner */}
      {voiceMinimized && isVoiceActive && voiceMinimizedAgent.current && (
        <button
          onClick={() => {
            const saved = voiceMinimizedAgent.current
            if (saved?.type === 'project') {
              setInlineProject(saved.data)
              onSelectProject?.(saved.data)
            } else if (saved?.type === 'agent') {
              setSelectedAgent(saved.data)
              onSelectAgent?.(saved.data)
            }
            setVoiceMinimized(false)
          }}
          style={{
            width: '100%', padding: '10px 14px', marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            color: '#10B981',
          }}
        >
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#10B981',
            animation: 'pulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(16,185,129,0.5)',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Call in progress with {voiceMinimizedAgent.current?.data?.name || 'agent'}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(16,185,129,0.7)', marginLeft: 'auto' }}>
            Tap to return
          </span>
        </button>
      )}

      {/* Greeting hero */}
      <div style={{ paddingBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: C.accent,
            boxShadow: `0 0 6px ${C.accent}`,
          }} />
          {lastLoginText ? `Last login: ${lastLoginText}` : 'Online now'}
        </div>
        <h1 style={{
          fontSize: 'clamp(26px, 5.5vw, 40px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.04em',
          color: C.text,
          margin: 0,
          fontFamily: "'Inter', sans-serif",
        }}>
          {GREETINGS[greetingIdx](displayName)}
        </h1>
      </div>

      {/* ── ELON HERO CARD ──────────────────────────────────────── */}
      {elonAgent && (
        <button
          onClick={() => { setSelectedAgent(elonAgent); onSelectAgent?.(elonAgent) }}
          style={{
            width: '100%',
            padding: '20px 18px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))',
            border: `1.5px solid rgba(96,165,250,${elonIsActive ? '0.3' : '0.15'})`,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 200ms ease',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(96,165,250,0.12)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = `rgba(96,165,250,${elonIsActive ? '0.3' : '0.15'})`
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = ''
          }}
        >
          {elonIsActive && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#60A5FA' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: elonAgent.color || '#60A5FA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 22, color: '#000',
              boxShadow: `0 0 20px ${(elonAgent.color || '#60A5FA')}44`,
            }}>
              E
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                  {elonAgent.name || 'Elon'}
                </span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: elonIsActive ? '#60A5FA' : C.dim,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: elonStatusInfo.dot,
                    boxShadow: elonStatusInfo.glow,
                  }} />
                  {elonIsActive ? 'Online' : 'Idle'}
                </div>
                {elonUnread > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: '#60A5FA', color: '#000',
                    fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '0 5px',
                  }}>
                    {elonUnread > 9 ? '9+' : elonUnread}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 13, color: C.text2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {elonLastMsg?.text || 'Start a conversation with Elon'}
              </div>
              {elonLastMsg?.timestamp && (
                <div style={{
                  fontSize: 10, color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: 4,
                }}>
                  {formatChatTime(elonLastMsg.timestamp)}
                </div>
              )}
            </div>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke="rgba(96,165,250,0.5)" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      )}

      {/* ── AGENTS ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.muted,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>Agents</span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.muted,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '1px 6px',
            letterSpacing: '0.02em',
          }}>
            {(agents || []).length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(agents || []).map(agent => {
            const lastMsg = unreadMap[agent.slug]
            const unreadCount = unreadCounts[agent.slug] || 0
            const isActive = agent.status?.toUpperCase() !== 'IDLE'
            const statusInfo = getStatusColor(agent.status)
            const statusLabel = agent.status === 'building' ? 'Building'
              : agent.status === 'qa' ? 'QA'
              : agent.status === 'queued' ? 'Queued'
              : isActive ? 'Online' : 'Idle'

            return (
              <button
                key={agent.slug}
                onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 14px',
                  borderRadius: 14,
                  background: C.s1,
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 200ms ease',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = C.s2
                  e.currentTarget.style.borderColor = C.border2
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = C.s1
                  e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: agent.color || C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14, color: '#000',
                }}>
                  {(agent.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                      {agent.name}
                    </span>
                    <span style={{
                      fontSize: 10, color: C.dim,
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}>
                      {lastMsg?.timestamp ? formatChatTime(lastMsg.timestamp) : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: C.muted, marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {lastMsg?.text || 'No messages yet'}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 9, fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isActive ? C.accent : agent.status === 'building' ? C.yellow : C.dim,
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: statusInfo.dot,
                      boxShadow: statusInfo.glow,
                    }} />
                    {statusLabel}
                  </div>
                  {unreadCount > 0 && (
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9,
                      background: C.accent, color: '#000',
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '0 4px',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── PROJECTS ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.muted,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>Projects</span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.muted,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '1px 6px',
            letterSpacing: '0.02em',
          }}>
            {sortedProjects.length}
          </span>
        </div>
        {sortedProjects.length === 0 ? (
          <div style={{
            fontSize: 13, color: C.muted,
            padding: '20px 0', textAlign: 'center',
          }}>
            No projects yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sortedProjects.map(project => {
              const pColor = project.color || '#6B8AB0'
              const pPreview = projectPreviews[`project:${project.slug}`]
              return (
                <button
                  key={project.id || project.slug}
                  onClick={() => {
                    setInlineProject(project)
                    setMessages([])
                    setSelectedAgent(null)
                    onSelectProject?.(project)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '12px 14px',
                    borderRadius: 14,
                    background: C.s1,
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = C.s2
                    e.currentTarget.style.borderColor = C.border2
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = C.s1
                    e.currentTarget.style.borderColor = C.border
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                    border: `1px solid ${pColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: 3,
                      background: pColor,
                      boxShadow: `0 0 8px ${pColor}55`,
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: C.text,
                        fontFamily: "'Inter', sans-serif",
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </span>
                      <span style={{
                        fontSize: 10, color: C.dim,
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}>
                        {pPreview?.timestamp ? formatChatTime(pPreview.timestamp) : ''}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: C.muted, marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {pPreview?.text || 'No messages yet'}
                    </div>
                  </div>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                    stroke="rgba(80,100,128,0.4)" strokeWidth={2.5}
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
