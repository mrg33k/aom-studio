// BoardView.jsx -- Multi-Terminal Command Center
// v2: Agent columns (RNB tasks + live chat) | Project columns (checklist + assign)
// Data: pipeData from useDataPipe, messages from Supabase
// Same right-click context menu as sidebar (TaskContextMenu)

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { AGENTS, PROJECTS } from './gridSpec.js'
import { getClientId } from './lib/clientConfig.js'
import { supabase } from './lib/supabase.js'
import TaskContextMenu, { handleTaskContextAction } from './components/TaskContextMenu.jsx'

const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getAgentColor(slug) {
  const a = AGENTS.find(x => x.slug === slug?.toLowerCase())
  if (a) return a.color
  const p = PROJECTS.find(x => x.slug === slug?.toLowerCase())
  return p?.color || '#60A5FA'
}

function getAgentName(slug) {
  const a = AGENTS.find(x => x.slug === slug?.toLowerCase())
  if (a) return a.name
  const p = PROJECTS.find(x => x.slug === slug?.toLowerCase())
  return p?.name || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Agent')
}

// ── CSS VARS (night / day) ───────────────────────────────────────────────────

function cssVars(isNight) {
  if (isNight) return {
    '--bv-bg': '#0B1A3E',
    '--bv-bar': 'rgba(10,20,50,0.6)',
    '--bv-bar2': 'rgba(10,20,50,0.3)',
    '--bv-col': 'rgba(15,35,90,0.35)',
    '--bv-col-exp': 'rgba(20,45,110,0.4)',
    '--bv-col-border': 'rgba(60,120,255,0.15)',
    '--bv-col-border-exp': 'rgba(80,150,255,0.35)',
    '--bv-card': 'rgba(15,45,140,0.2)',
    '--bv-card-border': 'rgba(60,120,255,0.12)',
    '--bv-card-hover': 'rgba(20,55,160,0.3)',
    '--bv-divider': 'rgba(60,120,255,0.08)',
    '--bv-input-bg': 'rgba(15,35,80,0.5)',
    '--bv-input-border': 'rgba(60,120,255,0.15)',
    '--bv-chat-agent': 'rgba(15,45,140,0.25)',
    '--bv-chat-user': 'rgba(59,130,246,0.2)',
    '--bv-text': '#E8ECF4',
    '--bv-text2': '#C8D4E0',
    '--bv-muted': '#6B7280',
    '--bv-dim': '#4A6585',
    '--bv-accent': 'rgba(59,130,246,0.2)',
    '--bv-accent-border': 'rgba(59,130,246,0.5)',
    '--bv-accent-text': '#60A5FA',
    '--bv-badge': 'rgba(60,120,255,0.1)',
  }
  return {
    '--bv-bg': '#1A3A7A',
    '--bv-bar': 'rgba(20,50,120,0.7)',
    '--bv-bar2': 'rgba(25,55,130,0.5)',
    '--bv-col': 'rgba(30,65,155,0.45)',
    '--bv-col-exp': 'rgba(35,75,175,0.55)',
    '--bv-col-border': 'rgba(80,150,255,0.25)',
    '--bv-col-border-exp': 'rgba(100,175,255,0.45)',
    '--bv-card': 'rgba(40,85,200,0.25)',
    '--bv-card-border': 'rgba(80,150,255,0.2)',
    '--bv-card-hover': 'rgba(50,100,220,0.35)',
    '--bv-divider': 'rgba(80,150,255,0.12)',
    '--bv-input-bg': 'rgba(30,65,160,0.5)',
    '--bv-input-border': 'rgba(80,150,255,0.25)',
    '--bv-chat-agent': 'rgba(40,85,200,0.3)',
    '--bv-chat-user': 'rgba(59,158,255,0.3)',
    '--bv-text': '#F0F4FF',
    '--bv-text2': '#D4E0F8',
    '--bv-muted': '#8AABE0',
    '--bv-dim': '#6B90CC',
    '--bv-accent': 'rgba(59,158,255,0.3)',
    '--bv-accent-border': 'rgba(80,170,255,0.6)',
    '--bv-accent-text': '#7CC4FF',
    '--bv-badge': 'rgba(80,150,255,0.15)',
  }
}

// ── COLUMN CHAT HOOK ─────────────────────────────────────────────────────────
// Each agent column gets its own chat state (messages, input, loading)

function useColumnChat(agentSlug, isActive) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const pollRef = useRef(null)
  const loadedRef = useRef(false)

  // Load messages on first activation
  useEffect(() => {
    if (!agentSlug || !isActive || loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    const clientId = getClientId()
    const url = IS_LOCAL
      ? `/api/local/conversations?agent=${encodeURIComponent(agentSlug)}&limit=50`
      : `/api/dashboard/supabase-messages?agent=${encodeURIComponent(agentSlug)}&limit=50&client=${encodeURIComponent(clientId)}`

    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const msgs = (data?.messages || [])
          .filter(m => !m.agent || m.agent === agentSlug)
          .map(m => ({ role: m.role || 'assistant', content: m.text || '', time: m.timestamp || '' }))
          .filter(m => m.content && !m.content.startsWith('[SESSION LOG]'))
        setMessages(msgs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentSlug, isActive])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || sending) return
    const sentTime = new Date().toISOString()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text.trim(), time: sentTime }])
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, time: sentTime }])
    setSending(true)

    try {
      const clientId = getClientId()
      const sendUrl = IS_LOCAL ? '/api/local/relay-send' : '/api/dashboard/supabase-messages'
      await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, text: text.trim(), message: text.trim(), source: 'corner-dashboard', client_id: clientId }),
      })

      // Poll for response
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const clientId = getClientId()
          const pollUrl = IS_LOCAL
            ? `/api/local/conversations?agent=${encodeURIComponent(agentSlug)}&limit=5`
            : `/api/dashboard/supabase-messages?agent=${encodeURIComponent(agentSlug)}&limit=5&client=${encodeURIComponent(clientId)}`
          const res = await fetch(pollUrl)
          if (!res.ok) return
          const data = await res.json()
          const msgs = data.messages || []
          const newResp = msgs.filter(m => m.role === 'assistant' && m.timestamp > sentTime)
          if (newResp.length > 0) {
            const latest = newResp[newResp.length - 1]
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last?.streaming) {
                updated[updated.length - 1] = { ...last, content: latest.text, streaming: false, time: latest.timestamp }
              } else {
                updated.push({ role: 'assistant', content: latest.text, streaming: false, time: latest.timestamp })
              }
              return updated
            })
            setSending(false)
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        } catch {}
      }, 1500)

      // Timeout after 60s
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.streaming) updated[updated.length - 1] = { ...last, content: 'Agent is offline. Message saved.', streaming: false }
            return updated
          })
          setSending(false)
        }
      }, 60000)
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.streaming) updated[updated.length - 1] = { ...last, content: 'Failed to send.', streaming: false }
        return updated
      })
      setSending(false)
    }
  }, [agentSlug, sending])

  // Cleanup polls on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  return { messages, input, setInput, loading, sending, sendMessage }
}

// ── AGENT COLUMN ─────────────────────────────────────────────────────────────

function AgentColumn({ agent, tasks, isExpanded, onExpand, isNight, isMobile, onContextMenu, onDragStart, onDragOver, onDrop, isDragTarget }) {
  const chatRef = useRef(null)
  const chat = useColumnChat(agent.slug, true)
  const color = agent.color || getAgentColor(agent.slug)
  const status = agent.status || 'IDLE'
  const statusCfg = status === 'WORKING' ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22C55E', glow: true }
    : status === 'DONE' ? { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', color: '#3B82F6', glow: false }
    : { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', color: '#6B7280', glow: false }

  // Tasks minimized by default, expandable
  const [tasksOpen, setTasksOpen] = useState(false)

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [chat.messages.length])

  const handleSend = (e) => {
    e?.preventDefault()
    if (chat.input.trim()) chat.sendMessage(chat.input)
  }

  return (
    <div
      draggable={!isMobile}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(agent.slug) }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(agent.slug) }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(agent.slug) }}
      onClick={() => !isExpanded && onExpand?.()}
      style={{
        display: 'flex', flexDirection: 'column',
        ...(isMobile ? { position: 'absolute', inset: 0 } : {
          minWidth: isExpanded ? 380 : 300, maxWidth: isExpanded ? 420 : 360, flex: '0 0 auto',
          borderRadius: 14,
          border: `1px solid ${isDragTarget ? 'var(--bv-accent-border)' : isExpanded ? 'var(--bv-col-border-exp)' : 'var(--bv-col-border)'}`,
          background: isDragTarget ? 'var(--bv-accent)' : isExpanded ? 'var(--bv-col-exp)' : 'var(--bv-col)',
          backdropFilter: 'blur(8px)',
          boxShadow: isExpanded ? '0 0 30px rgba(59,130,246,0.08)' : 'none',
        }),
        transition: 'all 0.25s', overflow: 'hidden',
      }}
    >
      {/* Header (drag handle) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: '1px solid var(--bv-divider)',
        flexShrink: 0, position: 'relative', cursor: isMobile ? 'default' : 'grab',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: color, borderRadius: '0 2px 2px 0',
        }} />
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${color}22`, border: `1.5px solid ${color}60`,
          color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {agent.name?.charAt(0) || agent.slug?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--bv-text)' }}>{agent.name || agent.slug}</div>
          <div style={{ fontSize: 11, color: 'var(--bv-muted)', marginTop: 1 }}>{agent.role || ''}</div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: 20,
          background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
          fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.1em', color: statusCfg.color,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: statusCfg.color,
            boxShadow: statusCfg.glow ? `0 0 6px ${statusCfg.color}` : 'none',
          }} />
          {status}
        </div>
      </div>

      {/* Active Tasks (minimized by default, click to expand) */}
      <div
        onClick={(e) => { e.stopPropagation(); setTasksOpen(!tasksOpen) }}
        style={{
          fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--bv-muted)',
          padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, cursor: 'pointer',
          borderBottom: '1px solid var(--bv-divider)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bv-card)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: tasksOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
          Active Tasks
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
          color: tasks.length > 0 ? '#22C55E' : 'var(--bv-dim)',
          background: tasks.length > 0 ? 'rgba(34,197,94,0.12)' : 'var(--bv-badge)',
          padding: '2px 8px', borderRadius: 10,
          minWidth: 22, textAlign: 'center',
        }}>{tasks.length}</span>
      </div>
      {tasksOpen && (
        <div style={{
          padding: '4px 12px 6px', maxHeight: 160, overflowY: 'auto', flexShrink: 0,
          borderBottom: '1px solid var(--bv-divider)',
        }}>
          {tasks.length === 0 && (
            <div style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic' }}>
              No active tasks
            </div>
          )}
          {tasks.map((t, i) => (
            <div
              key={t.taskId || t.text || i}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, t) }}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--bv-card)', border: '1px solid var(--bv-card-border)',
                marginBottom: 5, cursor: 'context-menu', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bv-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bv-card)'}
            >
              <div style={{ fontSize: 13, color: 'var(--bv-text2)', lineHeight: 1.4 }}>{t.text || 'Task'}</div>
              {t.project && (
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                    background: `${getAgentColor(t.project)}18`, color: getAgentColor(t.project),
                  }}>{t.project}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      <div style={{
        fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--bv-muted)',
        padding: '10px 16px 6px', flexShrink: 0,
      }}>
        Chat
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div ref={chatRef} style={{
          flex: 1, overflowY: 'auto', padding: '6px 12px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {chat.loading && (
            <div style={{ textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, padding: 20 }}>Loading...</div>
          )}
          {chat.messages.map((m, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
              maxWidth: '88%',
              background: m.role === 'user' ? 'var(--bv-chat-user)' : 'var(--bv-chat-agent)',
              border: `1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.25)' : 'var(--bv-card-border)'}`,
              color: m.role === 'user' ? 'var(--bv-text)' : 'var(--bv-text2)',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              borderBottomLeftRadius: m.role !== 'user' ? 4 : 12,
              borderBottomRightRadius: m.role === 'user' ? 4 : 12,
              opacity: m.streaming ? 0.6 : 1,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2, opacity: 0.6 }}>
                {m.role === 'user' ? 'You' : agent.name}
              </div>
              {m.streaming ? (
                <span style={{ animation: 'bvPulse 1.5s infinite' }}>Thinking...</span>
              ) : m.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} style={{
          display: 'flex', gap: 6, padding: '8px 12px',
          borderTop: '1px solid var(--bv-divider)', flexShrink: 0,
          background: 'var(--bv-bar)',
        }}>
          <input
            value={chat.input}
            onChange={e => chat.setInput(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            style={{
              flex: 1, background: 'var(--bv-input-bg)', border: '1.5px solid var(--bv-input-border)',
              borderRadius: 12, padding: '10px 14px', color: 'var(--bv-text)', fontSize: 14,
              fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
          />
          <button type="submit" style={{
            width: 38, height: 38, borderRadius: 12, border: 'none',
            background: 'var(--bv-accent)', color: 'var(--bv-accent-text)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}

// ── PROJECT COLUMN ───────────────────────────────────────────────────────────

function ProjectColumn({ project, tasks, isExpanded, onExpand, isMobile, onContextMenu, onAddTask, onDragStart, onDragOver, onDrop, isDragTarget }) {
  const color = project.color || '#60A5FA'
  const [newTaskText, setNewTaskText] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e?.preventDefault()
    if (!newTaskText.trim()) return
    setAdding(true)
    await onAddTask?.(newTaskText.trim(), project.slug)
    setNewTaskText('')
    setAdding(false)
  }

  return (
    <div
      draggable={!isMobile}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(project.slug) }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(project.slug) }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(project.slug) }}
      onClick={() => !isExpanded && onExpand?.()}
      style={{
        display: 'flex', flexDirection: 'column',
        ...(isMobile ? { position: 'absolute', inset: 0 } : {
          minWidth: isExpanded ? 380 : 300, maxWidth: isExpanded ? 420 : 360, flex: '0 0 auto',
          borderRadius: 14,
          border: `1px solid ${isDragTarget ? 'var(--bv-accent-border)' : isExpanded ? 'var(--bv-col-border-exp)' : 'var(--bv-col-border)'}`,
          background: isDragTarget ? 'var(--bv-accent)' : isExpanded ? 'var(--bv-col-exp)' : 'var(--bv-col)',
          backdropFilter: 'blur(8px)',
          boxShadow: isExpanded ? '0 0 30px rgba(59,130,246,0.08)' : 'none',
        }),
        transition: 'all 0.25s', overflow: 'hidden',
      }}
    >
      {/* Header (drag handle) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: '1px solid var(--bv-divider)',
        flexShrink: 0, position: 'relative', cursor: isMobile ? 'default' : 'grab',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: color, borderRadius: '0 2px 2px 0',
        }} />
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${color}22`, border: `1.5px solid ${color}60`,
          color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {project.name?.charAt(0) || 'P'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--bv-text)' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: 'var(--bv-muted)', marginTop: 1 }}>Project</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--bv-dim)', background: 'var(--bv-badge)',
          padding: '2px 8px', borderRadius: 10,
        }}>{tasks.length} tasks</span>
      </div>

      {/* Add Task */}
      <form onSubmit={handleAdd} style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        borderBottom: '1px solid var(--bv-divider)', flexShrink: 0,
      }}>
        <input
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          placeholder="Add task..."
          disabled={adding}
          style={{
            flex: 1, background: 'var(--bv-input-bg)', border: '1.5px solid var(--bv-input-border)',
            borderRadius: 8, padding: '7px 10px', color: 'var(--bv-text)', fontSize: 12,
            fontFamily: "'Inter', sans-serif", outline: 'none',
          }}
        />
        <button type="submit" disabled={adding} style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid var(--bv-col-border)',
          background: 'transparent', color: 'var(--bv-accent-text)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>+</button>
      </form>

      {/* Task Checklist (scrollable, full height) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
        {tasks.length === 0 && (
          <div style={{ padding: '20px 4px', textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic' }}>
            No tasks yet
          </div>
        )}
        {tasks.map((t, i) => (
          <div
            key={t.id || t.taskId || t.text || i}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, t) }}
            style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bv-card)', border: '1px solid var(--bv-card-border)',
              marginBottom: 5, cursor: 'context-menu', transition: 'background 0.15s',
              display: 'flex', gap: 8, alignItems: 'flex-start',
              opacity: t.done || t.status === 'completed' ? 0.5 : 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bv-card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bv-card)'}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, marginTop: 1, flexShrink: 0,
              border: `1.5px solid ${t.done || t.status === 'completed' ? '#22C55E' : 'var(--bv-col-border)'}`,
              background: t.done || t.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(t.done || t.status === 'completed') && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, color: 'var(--bv-text2)', lineHeight: 1.4,
                textDecoration: t.done || t.status === 'completed' ? 'line-through' : 'none',
              }}>{t.text || 'Task'}</div>
              {t.agent && (
                <div style={{ marginTop: 3 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                    background: `${getAgentColor(t.agent)}18`, color: getAgentColor(t.agent),
                  }}>{getAgentName(t.agent)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN BOARD VIEW ──────────────────────────────────────────────────────────

export default function BoardView({ pipeData, isMobile, isNightMode = true, hudHeight = 60, onTaskTap, onViewDetail }) {
  const rightNow = pipeData?.rightNow || []
  const agents = pipeData?.agents || []
  const punchData = pipeData?.punchData || null

  // Filter mode: 'agents' | 'projects' | 'custom'
  const [filterMode, setFilterMode] = useState(() => {
    try { return localStorage.getItem('corner-board-filter') || 'agents' } catch { return 'agents' }
  })
  // Expanded column (desktop)
  const [expandedCol, setExpandedCol] = useState(0)
  // Active column (mobile)
  const [activeMobileCol, setActiveMobileCol] = useState(0)
  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null)

  // Drag reorder state
  const [dragSource, setDragSource] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)

  // Column order persistence per filter mode (localStorage)
  const [agentOrder, setAgentOrder] = useState(() => {
    try { const s = localStorage.getItem('corner-board-agent-order'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [projectOrder, setProjectOrder] = useState(() => {
    try { const s = localStorage.getItem('corner-board-project-order'); return s ? JSON.parse(s) : null } catch { return null }
  })

  const vars = cssVars(isNightMode)

  // Build agent column data: top agents with their RNB tasks
  const topAgentSlugs = useMemo(() => {
    // Prioritize: WORKING first, then those with tasks, then IDLE
    const withTasks = new Set(rightNow.map(t => t.agent).filter(Boolean))
    const sorted = [...agents].sort((a, b) => {
      const aScore = (a.status === 'WORKING' ? 100 : 0) + (withTasks.has(a.slug) ? 50 : 0)
      const bScore = (b.status === 'WORKING' ? 100 : 0) + (withTasks.has(b.slug) ? 50 : 0)
      return bScore - aScore
    })
    return sorted.slice(0, isMobile ? 8 : 12).map(a => a.slug)
  }, [agents, rightNow, isMobile])

  const agentColumns = useMemo(() => {
    // Apply saved order if available
    let orderedSlugs = [...topAgentSlugs]
    if (agentOrder) {
      const known = new Set(topAgentSlugs)
      const ordered = agentOrder.filter(s => known.has(s))
      const missing = topAgentSlugs.filter(s => !agentOrder.includes(s))
      orderedSlugs = [...ordered, ...missing]
    }
    return orderedSlugs.map(slug => {
      const agent = agents.find(a => a.slug === slug) || { slug, name: getAgentName(slug), status: 'IDLE' }
      const tasks = rightNow.filter(t => t.agent === slug)
      return { agent: { ...agent, color: agent.color || getAgentColor(slug) }, tasks }
    })
  }, [topAgentSlugs, agents, rightNow, agentOrder])

  // Build project column data from punchData
  const projectColumns = useMemo(() => {
    if (!punchData?.projects) return []
    const cols = punchData.projects.map(p => ({
      project: { slug: p.section, name: p.name, color: p.color || getAgentColor(p.section) },
      tasks: (p.tasks || []).map(t => ({ ...t, project: p.section })),
    }))
    // Apply saved order if available
    if (projectOrder) {
      const slugMap = Object.fromEntries(cols.map(c => [c.project.slug, c]))
      const ordered = projectOrder.filter(s => slugMap[s]).map(s => slugMap[s])
      const missing = cols.filter(c => !projectOrder.includes(c.project.slug))
      return [...ordered, ...missing]
    }
    return cols
  }, [punchData, projectOrder])

  // Unread tracking (simple: agents with recent assistant messages we haven't viewed)
  const [viewedCols, setViewedCols] = useState(new Set())
  const inboxItems = pipeData?.inboxItems || []
  const unreadAgents = useMemo(() => {
    const set = new Set()
    for (const item of inboxItems) {
      if (item.agent && !viewedCols.has(item.agent)) set.add(item.agent)
    }
    return set
  }, [inboxItems, viewedCols])

  const handleMobileSwitch = (idx) => {
    setActiveMobileCol(idx)
    const cols = filterMode === 'agents' ? agentColumns : projectColumns
    const slug = filterMode === 'agents' ? cols[idx]?.agent?.slug : cols[idx]?.project?.slug
    if (slug) setViewedCols(prev => new Set([...prev, slug]))
  }

  const handleContextMenu = (e, task) => {
    setCtxMenu({
      position: { x: e.clientX, y: e.clientY },
      task: {
        text: task.text || '',
        id: task.taskId || task.id || null,
        agent: task.agent || null,
        projectSection: task.project || task.projectSection || null,
        done: task.done === true || task.status === 'completed',
        status: task.status,
      },
    })
  }

  const handleAddProjectTask = async (text, projectSlug) => {
    try {
      const clientId = getClientId()
      await fetch('/api/dashboard/agent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, project: projectSlug, agent: null, status: 'todo', client_id: clientId }),
      })
      pipeData?.refetch?.()
    } catch {}
  }

  // Drag reorder handlers
  const handleDragDrop = useCallback((targetSlug) => {
    if (!dragSource || dragSource === targetSlug) { setDragSource(null); setDragTarget(null); return }
    const isAgentMode = filterMode === 'agents' || filterMode === 'custom'
    const cols = isAgentMode ? agentColumns : projectColumns
    const slugs = cols.map(c => isAgentMode ? c.agent.slug : c.project.slug)
    const srcIdx = slugs.indexOf(dragSource)
    const tgtIdx = slugs.indexOf(targetSlug)
    if (srcIdx < 0 || tgtIdx < 0) { setDragSource(null); setDragTarget(null); return }
    const newOrder = [...slugs]
    newOrder.splice(srcIdx, 1)
    newOrder.splice(tgtIdx, 0, dragSource)
    if (isAgentMode) {
      setAgentOrder(newOrder)
      try { localStorage.setItem('corner-board-agent-order', JSON.stringify(newOrder)) } catch {}
    } else {
      setProjectOrder(newOrder)
      try { localStorage.setItem('corner-board-project-order', JSON.stringify(newOrder)) } catch {}
    }
    setDragSource(null)
    setDragTarget(null)
  }, [dragSource, filterMode, agentColumns, projectColumns])

  const currentCols = filterMode === 'projects' ? projectColumns : agentColumns

  // Save filter mode on change
  const switchFilter = (mode) => {
    setFilterMode(mode)
    setActiveMobileCol(0)
    setExpandedCol(0)
    try { localStorage.setItem('corner-board-filter', mode) } catch {}
  }

  // Custom view: shows whatever the current drag arrangement is (agents + projects mixed later)
  // For now: custom = agents view with saved order (the "save my arrangement" mode)

  return (
    <div style={{
      ...vars,
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      background: 'var(--bv-bg)',
      overflow: 'hidden',
      transition: 'background 0.4s',
      // Pad top to clear the fixed TaskHUD top bar
      paddingTop: isMobile ? 'calc(48px + env(safe-area-inset-top, 0px))' : 52,
    }}>
      <style>{`
        @keyframes bvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 16px',
        borderBottom: '1px solid var(--bv-divider)',
        background: 'var(--bv-bar2)', flexShrink: 0,
      }}>
        {['agents', 'projects', 'custom'].map(mode => (
          <button
            key={mode}
            onClick={() => switchFilter(mode)}
            style={{
              padding: '5px 14px', borderRadius: 20,
              border: `1.5px solid ${filterMode === mode ? 'var(--bv-accent-border)' : 'var(--bv-col-border)'}`,
              background: filterMode === mode ? 'var(--bv-accent)' : 'transparent',
              color: filterMode === mode ? 'var(--bv-accent-text)' : 'var(--bv-dim)',
              fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Mobile Tab Bar */}
      {isMobile && (
        <div style={{
          display: 'flex', gap: 2, padding: '6px 12px',
          overflowX: 'auto', flexShrink: 0,
          borderBottom: '1px solid var(--bv-divider)',
          background: 'var(--bv-bar2)',
          WebkitOverflowScrolling: 'touch',
        }}>
          {currentCols.map((col, idx) => {
            const slug = filterMode === 'agents' ? col.agent.slug : col.project.slug
            const name = filterMode === 'agents' ? col.agent.name : col.project.name
            const color = filterMode === 'agents' ? (col.agent.color || '#60A5FA') : (col.project.color || '#60A5FA')
            const isActive = idx === activeMobileCol
            const hasUnread = unreadAgents.has(slug)
            const taskCount = col.tasks?.length || 0
            const status = filterMode === 'agents' ? (col.agent.status || 'IDLE') : null

            return (
              <div
                key={slug}
                onClick={() => handleMobileSwitch(idx)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '4px 10px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${isActive ? 'var(--bv-accent-border)' : 'transparent'}`,
                  background: isActive ? 'var(--bv-accent)' : 'transparent',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `${color}22`, border: `1.5px solid ${color}60`,
                  color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                  position: 'relative',
                  boxShadow: status === 'WORKING' ? `0 0 0 2px #22C55E, 0 0 8px rgba(34,197,94,0.3)` : 'none',
                }}>
                  {name?.charAt(0) || '?'}
                  {hasUnread && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#F97316', border: `2px solid var(--bv-bg)`,
                      boxShadow: '0 0 6px rgba(249,115,22,0.5)',
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                  color: isActive ? 'var(--bv-accent-text)' : 'var(--bv-muted)',
                }}>{name}</span>
                <span style={{
                  fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--bv-dim)', background: 'var(--bv-badge)',
                  padding: '0 5px', borderRadius: 8,
                }}>{taskCount}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Columns */}
      <div style={{
        flex: 1, overflow: isMobile ? 'hidden' : 'auto',
        display: isMobile ? 'block' : 'flex',
        gap: 10, padding: isMobile ? 0 : '12px 16px',
        position: 'relative',
      }}>
        {(filterMode === 'agents' || filterMode === 'custom') && agentColumns.map((col, idx) => {
          const show = isMobile ? idx === activeMobileCol : true
          if (!show && isMobile) return null
          return (
            <AgentColumn
              key={col.agent.slug}
              agent={col.agent}
              tasks={col.tasks}
              isExpanded={isMobile || idx === expandedCol}
              onExpand={() => setExpandedCol(idx)}
              isNight={isNightMode}
              isMobile={isMobile}
              onContextMenu={handleContextMenu}
              onDragStart={(slug) => setDragSource(slug)}
              onDragOver={(slug) => setDragTarget(slug)}
              onDrop={(slug) => handleDragDrop(slug)}
              isDragTarget={dragTarget === col.agent.slug && dragSource !== col.agent.slug}
            />
          )
        })}
        {filterMode === 'projects' && projectColumns.map((col, idx) => {
          const show = isMobile ? idx === activeMobileCol : true
          if (!show && isMobile) return null
          return (
            <ProjectColumn
              key={col.project.slug}
              project={col.project}
              tasks={col.tasks}
              isExpanded={isMobile || idx === expandedCol}
              onExpand={() => setExpandedCol(idx)}
              isMobile={isMobile}
              onContextMenu={handleContextMenu}
              onAddTask={handleAddProjectTask}
              onDragStart={(slug) => setDragSource(slug)}
              onDragOver={(slug) => setDragTarget(slug)}
              onDrop={(slug) => handleDragDrop(slug)}
              isDragTarget={dragTarget === col.project.slug && dragSource !== col.project.slug}
            />
          )
        })}
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <TaskContextMenu
          task={ctxMenu.task}
          position={ctxMenu.position}
          onClose={() => setCtxMenu(null)}
          onAction={(action, payload) => {
            handleTaskContextAction(action, ctxMenu.task, payload)
            setCtxMenu(null)
            pipeData?.refetch?.()
          }}
          isNightMode={isNightMode}
        />
      )}
    </div>
  )
}
