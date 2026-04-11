// ConversationsView -- home view with agent/project cards, search, favorites
// Extracted from ChatPanel.jsx. Receives all state via ctx props.
import { Reorder } from 'framer-motion'
import { C, agentColors } from '../../lib/cv3Colors.js'
import AgentCard from './AgentCard.jsx'
import { Badge, formatChatTime, getStatusColor } from './shared.jsx'
import VoiceChat from '../VoiceChat.jsx'

export default function ConversationsView(ctx) {
  const {
    agents, inboxItems, worldId, onSelectAgent, onSelectProject, currentUser,
    isMobile, isVoiceActive, setIsVoiceActive, voiceMinimized, handleReturnToCall,
    voiceStatus, setVoiceStatus, voiceVolume, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText, voiceMuted, setVoiceMuted,
    voiceChatRef, voiceMinimizedAgent,
    selectedAgent, setSelectedAgent, setMessages, setInlineProject,
    setSettingsOpen, customizeTarget, setCustomizeTarget, customizeFileRef,
    searchQuery, setSearchQuery, conversationFilter, setConversationFilter,
    displayName, greetingIdx, GREETINGS, lastLoginText,
    pinnedItems, filteredPinnedItems, conversationItems,
    isFav, toggleFav, isMuted, toggleMute,
    unreadMap, unreadCounts, projectPreviews,
    filteredVisibleAgents, filteredVisibleProjects,
    sectionStates, toggleSection, toggleHidden,
    projects, chattableAgents,
    handleMicToggle, isRecording, sendAgentTextRef,
    setVoiceMinimized,
    allTasks,
  } = ctx

  return (
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* ── Call in progress banner ──────────────────────────────────── */}
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

        {/* ── Greeting hero ──────────────────────────────────────────────── */}
        <div style={{ paddingBottom: 16 }}>
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

        {/* ── Search bar ───────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '8px 12px',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search agents and projects..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'rgba(255,255,255,0.8)',
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1, flexShrink: 0,
                }}
              >
                &#x2715;
              </button>
            )}
          </div>
        </div>

        {/* ── Pins section ─────────────────────────────────────── */}
        {filteredPinnedItems.length > 0 && (
          <>
            <div
              onClick={() => toggleSection('favorites')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 11, fontWeight: 700, color: C.muted,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: sectionStates.favorites ? 12 : 4,
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <span>Pins <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '1px 6px', letterSpacing: '0.02em' }}>{filteredPinnedItems.length}</span></span>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: sectionStates.favorites ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{ maxHeight: sectionStates.favorites ? 9999 : 0, overflow: 'hidden', transition: 'max-height 300ms ease', marginBottom: sectionStates.favorites ? 16 : 0 }}>
              {filteredPinnedItems.map(item => {
                if (item.type === 'agent') {
                  const agent = item.data
                  const lastMsg    = unreadMap[agent.slug]
                  const unreadCount = unreadCounts[agent.slug] || 0
                  const isActive   = agent.status?.toUpperCase() !== 'IDLE'
                  const muted      = isMuted(agent.slug)
                  const statusInfo = getStatusColor(agent.status)
                  const statusLabel = agent.status === 'building' ? 'Building' : agent.status === 'qa' ? 'QA' : agent.status === 'queued' ? 'Queued' : isActive ? 'Online' : 'Idle'
                  return (
                    <SwipeCard key={`pin-${agent.slug}`} actions={[
                      { label: 'Unpin', bg: C.s2, color: C.accent,
                        icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                        onAction: () => toggleFav('agent', agent.slug) },
                      { label: muted ? 'Unmute' : 'Mute', bg: 'rgba(255,255,255,0.06)', color: C.muted,
                        icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><path d={muted ? "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" : "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}/></svg>,
                        onAction: () => toggleMute(agent.slug) },
                    ]}>
                      <button
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
                        onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                      >
                        {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />}
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: agent.color || C.accent,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 15, color: '#000',
                        }}>
                          {(agent.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{agent.name}</span>
                              <svg width={10} height={10} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2} style={{ opacity: 0.4 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            </div>
                            <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
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
                            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                          )}
                        </div>
                      </button>
                    </SwipeCard>
                  )
                }
                // project item
                const project = item.data
                const pColor = project.color || '#6B8AB0'
                return (
                  <SwipeCard key={`pin-${project.id || project.slug}`} actions={[
                    { label: 'Unpin', bg: C.s2, color: C.accent,
                      icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                      onAction: () => toggleFav('project', project.slug) },
                  ]}>
                    <button
                      onClick={() => { setInlineProject(project); setMessages([]); setSelectedAgent(null); onSelectProject?.(project) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '12px 14px',
                        borderRadius: 14,
                        background: C.s1,
                        border: `1px solid ${C.border}`,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 200ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                        border: `1px solid ${pColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: pColor, boxShadow: `0 0 8px ${pColor}55` }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth={2} style={{ opacity: 0.4, flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </div>
                      </div>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(80,100,128,0.4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </SwipeCard>
                )
              })}
            </div>
          </>
        )}

        {/* ── Conversations section (unified agents + projects) ──────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
            userSelect: 'none',
          }}
        >
          <span>Conversations{conversationItems.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.muted, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '1px 6px', letterSpacing: '0.02em' }}>{conversationItems.length}</span>}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'agents', 'projects'].map(f => (
              <button
                key={f}
                onClick={() => setConversationFilter(f)}
                style={{
                  padding: '2px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  background: conversationFilter === f ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                  color: conversationFilter === f ? C.accent : C.muted,
                }}
              >
                {f === 'all' ? 'All' : f === 'agents' ? 'Agents' : 'Projects'}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filtered = conversationFilter === 'all' ? conversationItems
            : conversationItems.filter(i => conversationFilter === 'agents' ? i.type === 'agent' : i.type === 'project')
          return filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingTop: 60, gap: 8, color: C.muted,
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 13 }}>No conversations yet</span>
          </div>
        ) : (
          filtered.map(item => {
            if (item.type === 'agent') {
              const agent = item.data
              const lastMsg    = unreadMap[agent.slug]
              const unreadCount = unreadCounts[agent.slug] || 0
              const isActive   = agent.status?.toUpperCase() !== 'IDLE'
              const pinned     = isFav('agent', agent.slug)
              const muted      = isMuted(agent.slug)
              const statusInfo = getStatusColor(agent.status)
              const statusLabel = agent.status === 'building' ? 'Building' : agent.status === 'qa' ? 'QA' : agent.status === 'queued' ? 'Queued' : isActive ? 'Online' : 'Idle'
              return (
                <SwipeCard key={`conv-${agent.slug}`} actions={[
                  { label: pinned ? 'Unpin' : 'Pin', bg: pinned ? C.s2 : 'rgba(16,185,129,0.2)', color: C.accent,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={pinned ? C.accent : 'none'} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                    onAction: () => toggleFav('agent', agent.slug) },
                  { label: muted ? 'Unmute' : 'Mute', bg: 'rgba(255,255,255,0.06)', color: C.muted,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round"><path d={muted ? "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" : "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}/></svg>,
                    onAction: () => toggleMute(agent.slug) },
                ]}>
                  <div
                    onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 14px',
                      borderRadius: 14,
                      background: C.s1,
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 200ms ease',
                      position: 'relative', overflow: 'visible',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setCustomizeTarget({ agent, type: 'menu', x: e.clientX, y: e.clientY })
                    }}
                  >
                    {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: agent.color || C.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, color: '#000',
                    }}>
                      {(agent.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{agent.name}</span>
                        <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
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
                        }}>{unreadCount}</span>
                      )}
                    </div>
                    {/* Kebab menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setCustomizeTarget({ agent, type: 'menu', x: rect.left - 100, y: rect.bottom + 4 })
                      }}
                      style={{
                        width: 24, height: 28, flexShrink: 0,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0.4, transition: 'opacity 0.15s',
                        padding: 0, WebkitTapHighlightColor: 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.4' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={C.muted}>
                        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                      </svg>
                    </button>
                  </div>
                </SwipeCard>
              )
            }
            // Project item
            const project = item.data
            const pColor = project.color || '#6B8AB0'
            const pinned = isFav('project', project.slug)
            const pPreview = projectPreviews[`project:${project.slug}`]
            return (
              <SwipeCard key={`conv-${project.id || project.slug}`} actions={[
                { label: pinned ? 'Unpin' : 'Pin', bg: pinned ? C.s2 : 'rgba(16,185,129,0.2)', color: C.accent,
                  icon: <svg width={16} height={16} viewBox="0 0 24 24" fill={pinned ? C.accent : 'none'} stroke={C.accent} strokeWidth={2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                  onAction: () => toggleFav('project', project.slug) },
                { label: 'Archive', bg: 'rgba(239,68,68,0.15)', color: C.red,
                  icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={2} strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
                  onAction: () => {} },
              ]}>
                <div
                  onClick={(e) => {
                    if (e.target.closest('[data-kebab]')) return
                    setInlineProject(project); setMessages([]); setSelectedAgent(null); onSelectProject?.(project)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '12px 14px',
                    borderRadius: 14,
                    background: C.s1,
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 200ms ease',
                    position: 'relative', overflow: 'visible',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2; e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.s1; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCustomizeTarget({ agent: { ...project, slug: project.slug, name: project.name, color: pColor }, type: 'project-menu', x: e.clientX, y: e.clientY })
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                    border: `1px solid ${pColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: pColor, boxShadow: `0 0 8px ${pColor}55` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
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
                  {/* Kebab menu for project */}
                  <button
                    data-kebab
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = e.currentTarget.getBoundingClientRect()
                      setCustomizeTarget({ agent: { ...project, slug: project.slug, name: project.name, color: pColor }, type: 'project-menu', x: rect.left - 100, y: rect.bottom + 4 })
                    }}
                    style={{
                      width: 24, height: 28, flexShrink: 0,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0.5, transition: 'opacity 0.15s',
                      padding: 0, WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.5' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={C.muted}>
                      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                </div>
              </SwipeCard>
            )
          })
        )
        })()}

        {/* Agent context menu (conversation list) */}
        {customizeTarget?.type === 'menu' && (
          <div
            onClick={() => setCustomizeTarget(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: customizeTarget.y,
                left: Math.max(8, Math.min(customizeTarget.x, window.innerWidth - 180)),
                background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 10,
                padding: 4, zIndex: 99999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160,
              }}
            >
              {[
                { label: 'Open chat', action: () => { setCustomizeTarget(null); setSelectedAgent(customizeTarget.agent); onSelectAgent?.(customizeTarget.agent) } },
                { label: isFav('agent', customizeTarget.agent?.slug) ? 'Unpin' : 'Pin to top', action: () => { setCustomizeTarget(null); toggleFav('agent', customizeTarget.agent.slug) } },
                { label: isMuted(customizeTarget.agent?.slug) ? 'Unmute' : 'Mute', action: () => { setCustomizeTarget(null); toggleMute(customizeTarget.agent.slug) } },
                null,
                { label: 'Change color', action: () => { setCustomizeTarget({ ...customizeTarget, type: 'color' }) } },
                null,
                { label: 'Archive', action: () => { setCustomizeTarget(null); toggleHidden(customizeTarget.agent.slug) } },
              ].map((item, idx) => !item ? (
                <div key={`d${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />
              ) : (
                <button key={item.label} onClick={item.action} style={{
                  display: 'flex', alignItems: 'center', width: '100%', padding: '7px 10px',
                  background: 'transparent', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: C.text2, fontFamily: "'Inter', sans-serif", textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >{item.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Project context menu (conversation list) */}
        {customizeTarget?.type === 'project-menu' && (
          <div
            onClick={() => setCustomizeTarget(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: customizeTarget.y,
                left: Math.max(8, Math.min(customizeTarget.x, window.innerWidth - 180)),
                background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 10,
                padding: 4, zIndex: 99999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160,
              }}
            >
              {[
                { label: isFav('project', customizeTarget.agent?.slug) ? 'Unpin' : 'Pin to top', action: () => { setCustomizeTarget(null); toggleFav('project', customizeTarget.agent.slug) } },
                { label: 'Settings', action: () => { const p = customizeTarget.agent; setCustomizeTarget(null); setInlineProject(p); setMessages([]); setSelectedAgent(null); onSelectProject?.(p); setTimeout(() => setSettingsOpen(true), 200) } },
                null,
                { label: 'Change color', action: () => { setCustomizeTarget({ ...customizeTarget, type: 'color' }) } },
                null,
                { label: 'Archive', action: () => setCustomizeTarget(null) },
              ].map((item, idx) => !item ? (
                <div key={`pd${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />
              ) : (
                <button key={item.label} onClick={item.action} style={{
                  display: 'flex', alignItems: 'center', width: '100%', padding: '7px 10px',
                  background: 'transparent', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: C.text2, fontFamily: "'Inter', sans-serif", textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >{item.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Color picker (conversation list) */}
        {customizeTarget?.type === 'color' && (
          <div
            onClick={() => setCustomizeTarget(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 14,
              padding: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', width: 260,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14, fontFamily: "'Inter', sans-serif" }}>
                Pick color for {customizeTarget.agent?.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['#10B981', '#EAB308', '#A78BFA', '#F472B6', '#60A5FA', '#FB923C', '#22C55E', '#EF4444', '#E91E90', '#3B82F6', '#2DD4BF', '#F59E0B'].map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      fetch('/api/dashboard/agent-customize', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slug: customizeTarget.agent.slug, client_id: worldId, color: c }),
                      }).then(() => window.location.reload()).catch(() => {})
                      setCustomizeTarget(null)
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: c, border: '2px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.1s, border-color 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
}
