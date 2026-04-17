import { C } from '../../../lib/cv3Colors.js'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatRecordingCtx,
  useChatSearchCtx,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'
import useProjectChatSwitcher from './useProjectChatSwitcher.js'

// Header row for the project-chat room: back button, project icon + quick
// switcher, mic, search, files, settings. Quick-switcher dropdown lists all
// agents and projects; clicking a target resets messages and swaps the pane.
export default function ProjectChatHeader() {
  const {
    projectId, navigate,
    selectedProject, agents, projects,
    onBack, onSelectAgent, onSelectProject,
    setInlineProject, setSelectedAgent,
  } = useChatCore()
  const { setMessages } = useChatMessagesCtx()
  const {
    isVoiceActive, setVoiceMinimized, voiceMinimizedAgent,
  } = useChatVoiceCtx()
  const { isRecording, handleMicToggle } = useChatRecordingCtx()
  const {
    chatSearchOpen, setChatSearchOpen,
    setChatSearchQuery, setChatSearchResults,
  } = useChatSearchCtx()
  const {
    filesOpen, setFilesOpen, settingsOpen, setSettingsOpen,
  } = useChatSettingsCtx()

  const { switcherOpen, setSwitcherOpen, switcherRef } = useProjectChatSwitcher()
  const projColor = selectedProject?.color || '#6B8AB0'
  const sortedSwitcherProjects = [...(projects || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(8,14,28,0.95)',
      flexShrink: 0,
    }}>
      <button
        onClick={() => {
          if (isVoiceActive) {
            // Minimize call instead of killing it
            setVoiceMinimized(true)
            voiceMinimizedAgent.current = { type: 'project', data: selectedProject }
            onBack?.()
            if (projectId) navigate('/dashboard')
          } else {
            setMessages([]); setInlineProject(null); onBack?.(); if (projectId) navigate('/dashboard')
          }
        }}
        style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#A0A0A0', fontSize: 18, lineHeight: 1,
        }}
      >
        &#x2190;
      </button>
      {/* Project title + quick-switcher */}
      <div ref={switcherRef} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
          border: `1px solid ${projColor}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: 3,
            background: projColor,
            boxShadow: `0 0 6px ${projColor}66`,
          }} />
        </div>
        <button
          onClick={() => setSwitcherOpen(o => !o)}
          style={{
            flex: 1, minWidth: 0, background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', padding: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedProject?.name || 'Project'}
            </span>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* Quick-switcher dropdown */}
        {switcherOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            width: 260,
            maxHeight: 360,
            overflowY: 'auto',
            background: C.s1,
            border: `1px solid ${C.border2}`,
            borderRadius: 12,
            padding: 6,
            zIndex: 200,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}>
            {/* Agents section */}
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.dim,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '6px 8px 4px',
            }}>
              Agents
            </div>
            {(agents || []).map(agent => (
              <button
                key={`sw-a-${agent.slug}`}
                onClick={() => {
                  setSwitcherOpen(false)
                  setInlineProject(null)
                  setMessages([])
                  setSelectedAgent(agent)
                  onSelectAgent?.(agent)
                  if (projectId) navigate('/dashboard')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 8px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: agent.color || C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 10, color: '#000',
                }}>
                  {(agent.name || '?')[0].toUpperCase()}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: C.text,
                  fontFamily: "'Inter', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {agent.name}
                </span>
              </button>
            ))}

            {/* Projects section */}
            {sortedSwitcherProjects.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 8px' }} />
                <div style={{
                  fontSize: 10, fontWeight: 700, color: C.dim,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '6px 8px 4px',
                }}>
                  Projects
                </div>
                {sortedSwitcherProjects.map(project => {
                  const pColor = project.color || '#6B8AB0'
                  const isCurrent = project.slug === selectedProject?.slug
                  return (
                    <button
                      key={`sw-p-${project.id || project.slug}`}
                      onClick={() => {
                        setSwitcherOpen(false)
                        if (!isCurrent) {
                          setMessages([])
                          setSelectedAgent(null)
                          setInlineProject(project)
                          onSelectProject?.(project)
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 8px',
                        borderRadius: 8,
                        background: isCurrent ? 'rgba(16,185,129,0.1)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = C.s2 }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                        border: `1px solid ${pColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: pColor }} />
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: C.text,
                        fontFamily: "'Inter', sans-serif",
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </span>
                      {isCurrent && (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
      {/* Telephone button in project header */}
      <button
        onClick={handleMicToggle}
        title={isRecording ? 'Stop recording' : 'Record voice message'}
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
          border: isRecording ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isRecording ? '#EF4444' : C.muted,
          transition: 'all 0.15s',
        }}
      >
        {isRecording ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        )}
      </button>
      {/* Search button */}
      <button
        onClick={() => { setChatSearchOpen(o => !o); setChatSearchQuery(''); setChatSearchResults(null) }}
        title="Search chat history"
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: chatSearchOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: chatSearchOpen ? C.text : C.muted,
          transition: 'all 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
      {/* Files button */}
      <button
        onClick={() => setFilesOpen(o => !o)}
        title="Files shared in this chat"
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: filesOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: filesOpen ? C.text : C.muted,
          transition: 'all 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      {/* Settings button */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setSettingsOpen(o => !o)}
          title="Settings"
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
