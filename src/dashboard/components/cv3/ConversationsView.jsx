// ConversationsView -- home: greeting + real-time search + Elon focus
// R4 (Apr 15): added top-level search bar. Below 2 chars -> normal home.
// At >= 2 chars -> grouped filtered results (Messages, Tasks, Agents, Projects).
import { useState, useEffect, useRef } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { formatChatTime, getStatusColor } from './shared.jsx'
import { supabase } from '../../lib/supabase.js'

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

  // ── R4: real-time home search ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [msgHits, setMsgHits] = useState([])
  const [taskHits, setTaskHits] = useState([])
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0) // cancel out-of-order fetches

  const q = searchQuery.trim()
  const showSearch = q.length >= 2

  useEffect(() => {
    if (!showSearch) {
      setMsgHits([]); setTaskHits([]); setSearching(false)
      return
    }
    const mySeq = ++searchSeq.current
    setSearching(true)
    const ilikeQ = `%${q.replace(/%/g, '')}%`
    const handle = window.setTimeout(async () => {
      try {
        const [msgRes, taskRes] = await Promise.all([
          supabase
            .from('messages')
            .select('id,text,role,source,agent,project,timestamp')
            .ilike('text', ilikeQ)
            .order('timestamp', { ascending: false })
            .limit(8),
          supabase
            .from('tasks')
            .select('id,title,text,status,project,created_at')
            .or(`title.ilike.${ilikeQ},text.ilike.${ilikeQ}`)
            .order('created_at', { ascending: false })
            .limit(8),
        ])
        if (mySeq !== searchSeq.current) return
        setMsgHits(msgRes?.data || [])
        setTaskHits(taskRes?.data || [])
      } catch {
        if (mySeq !== searchSeq.current) return
        setMsgHits([]); setTaskHits([])
      } finally {
        if (mySeq === searchSeq.current) setSearching(false)
      }
    }, 220)
    return () => window.clearTimeout(handle)
  }, [q, showSearch])

  // Agents + projects are already in-memory, filter client-side (instant)
  const qLower = q.toLowerCase()
  const agentHits = !showSearch ? [] : (agents || []).filter(a =>
    (a.name || '').toLowerCase().includes(qLower) ||
    (a.slug || '').toLowerCase().includes(qLower)
  )
  const projectHits = !showSearch ? [] : (projects || []).filter(p =>
    (p.name || '').toLowerCase().includes(qLower) ||
    (p.slug || '').toLowerCase().includes(qLower)
  )

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

      {/* R4: Home search bar. Below 2 chars shows default home; at >=2 chars
          replaces the sections below with grouped filtered results. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: C.s1,
          border: '1px solid ' + (searchFocused
            ? 'rgba(16,185,129,0.25)'
            : showSearch ? 'rgba(96,165,250,0.25)' : C.border),
          borderRadius: 14,
          padding: '12px 16px',
          transition: 'border-color 0.2s',
        }}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none"
            stroke={C.dim} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search messages, tasks, agents, projects…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0,
              }}
            >×</button>
          )}
        </div>
        {showSearch && (
          <div style={{
            fontSize: 10, fontWeight: 600, color: C.dim,
            marginTop: 8, fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {searching ? 'searching…' : `${msgHits.length + taskHits.length + agentHits.length + projectHits.length} results`}
          </div>
        )}
      </div>

      {/* R4: grouped search results -- shown only when query >= 2 chars.
          Default home (Elon hero + Agents + Projects) is hidden below. */}
      {showSearch && (
        <div>
          {/* Agents */}
          {agentHits.length > 0 && (
            <div style={{ marginBottom: 22 }}>
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
            <div style={{ marginBottom: 22 }}>
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
            <div style={{ marginBottom: 22 }}>
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
            <div style={{ marginBottom: 22 }}>
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

          {/* Empty state */}
          {!searching && msgHits.length + taskHits.length + agentHits.length + projectHits.length === 0 && (
            <div style={{
              fontSize: 13, color: C.muted, textAlign: 'center',
              padding: '40px 0',
            }}>
              No matches for "{q}".
            </div>
          )}
        </div>
      )}

      {/* ── Default home (hidden during search) ────────────────── */}
      {!showSearch && (
      <>

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

      </>
      )}
    </div>
  )
}
