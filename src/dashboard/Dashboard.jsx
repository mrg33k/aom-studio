import React, { useState, useEffect, useCallback, useRef } from 'react'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'

const ORANGE = '#FF4F00'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const RED = '#ef4444'
const BLUE = '#60a5fa'
const PURPLE = '#a78bfa'

// ─── GITHUB API ───────────────────────────────────────────────────────────────
async function fetchFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return atob(data.content.replace(/\n/g, ''))
}

// ─── MARKDOWN PARSERS ─────────────────────────────────────────────────────────
function parsePriorities(md) {
  return md.split('\n')
    .filter(l => /^\d+\.\s+\*\*/.test(l))
    .map((l, i) => {
      const match = l.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-—]?\s*(.*)/)
      return match ? { id: `pri-${i}`, label: match[1], desc: match[2], priority: i + 1 } : null
    })
    .filter(Boolean)
}

function parsePunchList(md) {
  const items = []
  let currentCategory = 'Misc'
  let currentClient = null
  for (const line of md.split('\n')) {
    if (line.startsWith('### ')) { currentClient = line.replace('### ', '').trim(); continue }
    if (line.startsWith('## ')) { currentCategory = line.replace('## ', '').trim(); currentClient = null; continue }
    const checkbox = line.match(/^\s*- \[([ xX])\]\s*(.+)/)
    if (!checkbox) continue
    const done = checkbox[1].toLowerCase() === 'x'
    const raw = checkbox[2].trim()
    const deadline = /HARD DEADLINE/i.test(raw)
    const blocked = /blocked|waiting on|need.*before|holding/i.test(raw)
    const text = raw.replace(/\s*--\s*HARD DEADLINE.*$/i, '').replace(/\s*--.*$/, '').trim()
    items.push({ id: `punch-${items.length}`, text, done, deadline, blocked, category: currentClient || currentCategory, raw })
  }
  return items
}

function parseAgentLog(md) {
  const rows = md.split('\n').filter(l => l.match(/^\|\s*\d{4}-\d{2}-\d{2}/))
  if (!rows.length) return null
  const cols = rows[rows.length - 1].split('|').map(s => s.trim()).filter(Boolean)
  return { date: cols[0], action: cols[1] || '', notes: cols[2] || '' }
}

function relativeTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function deadlineDaysRemaining(taskText) {
  // Known hardcoded deadlines
  const KNOWN = [
    { pattern: /isa energy|brand video|april 27/i, date: '2026-04-27' },
    { pattern: /included health|ih retainer/i, date: '2026-03-11' },
  ]
  for (const k of KNOWN) {
    if (k.pattern.test(taskText)) {
      const diff = Math.ceil((new Date(k.date) - new Date()) / (1000 * 60 * 60 * 24))
      return diff
    }
  }
  // Try to extract a date from the raw text
  const dateMatch = taskText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}/i)
  if (dateMatch) {
    const parsed = new Date(dateMatch[0])
    if (!isNaN(parsed)) {
      const diff = Math.ceil((parsed - new Date()) / (1000 * 60 * 60 * 24))
      return diff
    }
  }
  return null
}

function inferAgentStatus(md) {
  if (!md) return 'idle'
  if (/holding|blocked|waiting on.*patrik|3 open questions/i.test(md)) return 'hold'
  if (/in progress|working on|currently/i.test(md.slice(-600))) return 'active'
  return 'idle'
}

function parseActionsLog(md) {
  if (!md) return []
  return md.split('\n').filter(l => l.startsWith('- ')).slice(-20).reverse()
    .map(l => {
      const text = l.replace(/^- /, '').trim()
      const dateMatch = text.match(/\[(\d{4}-\d{2}-\d{2}[^\]]*)\]/)
      return { text: dateMatch ? text.replace(dateMatch[0], '').trim() : text, date: dateMatch ? dateMatch[1] : '' }
    })
}

function parseHandoff(md) {
  if (!md) return []
  return md.split('\n').filter(l => l.startsWith('- ')).map(l => l.replace('- ', '').trim()).slice(0, 8)
}

function assignTasksToAgents(punchItems) {
  const ownerMap = {
    'Ambition Mechanical': 'Bobby', 'Skylar Music Video': 'Cleo',
    'ISA Energy': 'Cleo', 'Brandon Wiley': 'Cleo', 'KOHRS': 'Cleo',
    'Included Health': 'Cleo', 'Outreach': 'Jacob', 'Revenue': 'Jacob',
  }
  return punchItems.filter(p => !p.done).map(p => {
    let agent = null
    for (const [cat, name] of Object.entries(ownerMap)) {
      if (p.category.toLowerCase().includes(cat.toLowerCase())) { agent = name; break }
    }
    if (!agent && /bobby|ambition|web/i.test(p.text)) agent = 'Bobby'
    if (!agent && /jacob|outreach|email|apollo/i.test(p.text)) agent = 'Jacob'
    if (!agent && /alex|deal|offer|revenue/i.test(p.text)) agent = 'Alex'
    if (!agent && /cleo|video|edit|reel|tiktok|instagram/i.test(p.text)) agent = 'Cleo'
    if (!agent && /steffen|brand|guideline/i.test(p.text)) agent = 'Steffen'
    if (!agent && /rex|stuck|blocked|push/i.test(p.text)) agent = 'Rex'
    if (!agent && /paige|client.*check|payment|invoice|deposit|churn|upsell/i.test(p.text)) agent = 'Paige'
    if (!agent && /tony|social|posting|instagram|linkedin|tiktok|postiz|content.*calendar/i.test(p.text)) agent = 'Tony'
    let column = agent ? 'assigned' : 'unassigned'
    if (p.blocked) column = 'blocked'
    return { ...p, agent, column }
  })
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const config = {
    active: { color: GREEN, label: 'ACTIVE', bg: 'rgba(34,197,94,0.1)' },
    idle: { color: '#555', label: 'IDLE', bg: 'rgba(255,255,255,0.04)' },
    hold: { color: YELLOW, label: 'HOLD', bg: 'rgba(234,179,8,0.1)' },
    blocked: { color: RED, label: 'BLOCKED', bg: 'rgba(239,68,68,0.1)' },
    running: { color: BLUE, label: 'RUNNING', bg: 'rgba(96,165,250,0.1)' },
  }
  const c = config[status] || config.idle
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: c.color, background: c.bg, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' }}>
      {c.label}
    </span>
  )
}

const AGENT_COLORS = { Bobby: ORANGE, Jacob: BLUE, Alex: PURPLE, Cleo: '#f472b6', Steffen: '#34d399', Rex: RED, Paige: '#06b6d4', Tony: '#a3e635', Patrik: '#fff' }

function AgentInitial({ name, size = 28 }) {
  const color = AGENT_COLORS[name] || '#888'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${color}18`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color, flexShrink: 0 }}>
      {name[0]}
    </div>
  )
}

function AgentRow({ agent, selected, onClick, taskCount }) {
  const lastActive = agent.lastEntry ? relativeTime(agent.lastEntry.date) : null
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, width: '100%', background: selected ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
      <AgentInitial name={agent.name} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e5e5' }}>{agent.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {taskCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: ORANGE, background: 'rgba(255,79,0,0.12)', borderRadius: 10, padding: '1px 5px', letterSpacing: '0.04em' }}>{taskCount}</span>
            )}
            <StatusPill status={agent.status} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</div>
          {lastActive && <span style={{ fontSize: 9, color: '#383838', flexShrink: 0, marginLeft: 4 }}>{lastActive}</span>}
        </div>
      </div>
    </button>
  )
}

function TaskCard({ task }) {
  const agentColor = task.agent ? (AGENT_COLORS[task.agent] || '#888') : '#444'
  const daysLeft = task.deadline ? deadlineDaysRemaining(task.raw || task.text) : null
  const urgentColor = daysLeft !== null && daysLeft <= 7 ? '#ff2020' : RED
  return (
    <div style={{ background: '#111', border: `1px solid ${task.deadline ? 'rgba(239,68,68,0.3)' : task.blocked ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, padding: '10px 12px' }}>
      {task.deadline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: urgentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hard Deadline</span>
          {daysLeft !== null ? (
            <span style={{ fontSize: 9, fontWeight: 700, color: urgentColor, background: `${urgentColor}18`, borderRadius: 4, padding: '1px 5px' }}>{daysLeft}d</span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 600, color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '1px 5px' }}>deadline</span>
          )}
        </div>
      )}
      <div style={{ fontSize: 12, color: '#ddd', lineHeight: 1.4 }}>{task.text}</div>
      {(task.agent || task.category) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {task.category && <span style={{ fontSize: 10, color: '#444' }}>{task.category}</span>}
          {task.agent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AgentInitial name={task.agent} size={16} />
              <span style={{ fontSize: 10, color: agentColor, fontWeight: 600 }}>{task.agent}</span>
            </div>
          ) : (
            <span style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>unassigned</span>
          )}
        </div>
      )}
    </div>
  )
}

const COLUMNS = [
  { id: 'unassigned', label: 'Unassigned', color: '#444', desc: 'No owner yet' },
  { id: 'assigned', label: 'Assigned', color: BLUE, desc: 'Queued for agent' },
  { id: 'blocked', label: 'Blocked', color: YELLOW, desc: 'Needs action' },
]

function KanbanColumn({ col, tasks }) {
  const colTasks = tasks.filter(t => t.column === col.id)
  return (
    <div style={{ minWidth: 260, maxWidth: 300, flex: '1 1 260px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{col.label}</span>
        <span style={{ fontSize: 10, color: col.color, background: `${col.color}18`, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{colTasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {colTasks.map(t => <TaskCard key={t.id} task={t} />)}
        {colTasks.length === 0 && (
          <div style={{ border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px 12px', textAlign: 'center', fontSize: 11, color: '#333' }}>{col.desc}</div>
        )}
      </div>
    </div>
  )
}

function ActivityFeed({ actions, handoff }) {
  const combined = [
    ...handoff.map(t => ({ text: t, type: 'handoff' })),
    ...actions.map(a => ({ text: a.text, date: a.date, type: 'action' })),
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {combined.slice(0, 18).map((item, i) => (
        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: item.type === 'handoff' ? ORANGE : '#333' }} />
          <div>
            {item.date && <div style={{ fontSize: 9, color: '#444', marginBottom: 2, letterSpacing: '0.04em' }}>{item.date}</div>}
            <div style={{ fontSize: 11, color: item.type === 'handoff' ? '#999' : '#555', lineHeight: 1.45 }}>{item.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── COUNCIL MODAL ────────────────────────────────────────────────────────────
const COUNCIL_AGENTS = ['Bobby', 'Jacob', 'Alex', 'Cleo', 'Rex', 'Steffen', 'Paige', 'Tony']

function CouncilModal({ onClose }) {
  const [topic, setTopic] = useState('')
  const [phase, setPhase] = useState('idle') // idle | convening | done
  const [responses, setResponses] = useState({})
  const [synthesis, setSynthesis] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => { if (phase === 'idle' && inputRef.current) inputRef.current.focus() }, [phase])
  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }) }, [synthesis])

  const convene = async () => {
    if (!topic.trim() || phase !== 'idle') return
    setPhase('convening')
    setResponses({})
    setSynthesis(null)
    setError(null)

    const message = `COUNCIL TOPIC: ${topic}\n\nYou are in an AOM team council meeting. Respond from your specific domain only. Be direct and specific. Max 4 sentences. No filler, no hedging.`

    try {
      const agentPromises = COUNCIL_AGENTS.map(agent =>
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', message, agent, mode: 'council' }),
        })
        .then(r => r.json())
        .then(data => {
          const text = data.reply || data.error || 'No response.'
          setResponses(prev => ({ ...prev, [agent]: text }))
          return { agent, text }
        })
      )

      const agentResults = await Promise.all(agentPromises)

      const synthRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'council_synthesis', topic, responses: agentResults }),
      })
      const synthData = await synthRes.json()
      setSynthesis(synthData.synthesis || 'Synthesis unavailable.')
      setPhase('done')
    } catch {
      setError('Network error during council.')
      setPhase('idle')
    }
  }

  const reset = () => { setPhase('idle'); setTopic(''); setResponses({}); setSynthesis(null); setError(null) }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.22em', fontWeight: 800, color: ORANGE, textTransform: 'uppercase' }}>Council</span>
            <div style={{ display: 'flex' }}>
              {COUNCIL_AGENTS.map((a, i) => (
                <div key={a} style={{ marginLeft: i > 0 ? -7 : 0, zIndex: COUNCIL_AGENTS.length - i }}>
                  <AgentInitial name={a} size={22} />
                </div>
              ))}
            </div>
            {phase !== 'idle' && topic && (
              <span style={{ fontSize: 11, color: '#444', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {phase === 'done' && (
              <button onClick={reset} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#555', fontSize: 10, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}>NEW</button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Idle: topic input */}
          {phase === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>What's the council on?</div>
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6 }}>Each agent weighs in from their domain. Bobby on tech, Jacob on pipeline, Alex on revenue, Cleo on content, Rex on blockers, Steffen on brand. Synthesis follows.</div>
              </div>
              <textarea
                ref={inputRef}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) convene() }}
                placeholder="e.g. Should we raise Ambition's retainer? / Should we build the social agent next? / What does the team think about taking on NEON?"
                rows={3}
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, padding: '12px 14px', outline: 'none', resize: 'none', lineHeight: 1.55, fontFamily: 'inherit' }}
              />
              {error && <div style={{ fontSize: 11, color: RED }}>{error}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={convene}
                  disabled={!topic.trim()}
                  style={{ background: topic.trim() ? ORANGE : '#1a1a1a', color: topic.trim() ? '#fff' : '#333', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', cursor: topic.trim() ? 'pointer' : 'default', textTransform: 'uppercase', transition: 'all 0.15s' }}
                >
                  Convene
                </button>
                <span style={{ fontSize: 10, color: '#333' }}>or Cmd+Enter</span>
              </div>
            </div>
          )}

          {/* Convening / Done: agent responses */}
          {phase !== 'idle' && COUNCIL_AGENTS.map(agent => {
            const hasResponse = !!responses[agent]
            const agentColor = AGENT_COLORS[agent] || '#888'
            return (
              <div
                key={agent}
                style={{ background: '#0f0f0f', border: `1px solid ${hasResponse ? `${agentColor}28` : 'rgba(255,255,255,0.04)'}`, borderRadius: 10, padding: '14px 16px', transition: 'border-color 0.4s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasResponse ? 10 : 0 }}>
                  <AgentInitial name={agent} size={26} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: hasResponse ? agentColor : '#2a2a2a', transition: 'color 0.4s' }}>{agent}</span>
                  {!hasResponse && (
                    <span style={{ fontSize: 10, color: '#2a2a2a', letterSpacing: '0.08em' }}>thinking…</span>
                  )}
                </div>
                {hasResponse && (
                  <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.65, paddingLeft: 36, whiteSpace: 'pre-wrap' }}>
                    {responses[agent]}
                  </div>
                )}
              </div>
            )
          })}

          {/* Synthesis */}
          {(phase === 'done' || synthesis) && (
            <div style={{ background: '#0a0a0a', border: `1px solid ${ORANGE}28`, borderRadius: 10, padding: '18px 20px', marginTop: 4 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', fontWeight: 800, color: ORANGE, textTransform: 'uppercase', marginBottom: 12 }}>Synthesis</div>
              {synthesis ? (
                <div style={{ fontSize: 12, color: '#ddd', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{synthesis}</div>
              ) : (
                <div style={{ fontSize: 11, color: '#333' }}>Synthesizing…</div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

// ─── COMMAND BAR ──────────────────────────────────────────────────────────────
const CHAT_AGENTS = ['All', 'Bobby', 'Jacob', 'Alex', 'Cleo', 'Rex', 'Steffen', 'Paige', 'Tony']

function CommandBar({ onRefresh }) {
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('All')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)
  const [addTaskMode, setAddTaskMode] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setOpen(true)

    if (addTaskMode) {
      setMessages(m => [...m, { role: 'user', text: `+ ${text}`, type: 'task' }])
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_task', task: text }),
        })
        const data = await res.json()
        setMessages(m => [...m, { role: 'system', text: data.ok ? `Task added: "${text}"` : (data.error || 'Failed to add task.'), type: 'task' }])
        if (data.ok) { setTimeout(onRefresh, 2000); setAddTaskMode(false) }
      } catch {
        setMessages(m => [...m, { role: 'system', text: 'Network error adding task.', type: 'error' }])
      }
    } else {
      setMessages(m => [...m, { role: 'user', text, agent: selectedAgent }])
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', message: text, agent: selectedAgent }),
        })
        const data = await res.json()
        if (data.error) {
          setMessages(m => [...m, { role: 'system', text: data.error, type: 'error' }])
        } else {
          setMessages(m => [...m, { role: 'agent', text: data.reply, agent: data.agent }])
        }
      } catch {
        setMessages(m => [...m, { role: 'system', text: 'Network error. Is ANTHROPIC_API_KEY set in Vercel?', type: 'error' }])
      }
    }
    setSending(false)
  }

  return (
    <>
      {/* Chat panel */}
      {open && messages.length > 0 && (
        <div style={{ position: 'fixed', bottom: 64, right: 24, width: 420, maxHeight: 400, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>Command Log</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                {m.role === 'agent' && <AgentInitial name={m.agent || 'All'} size={22} />}
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                  background: m.role === 'user' ? 'rgba(255,79,0,0.12)' : m.type === 'error' ? 'rgba(239,68,68,0.08)' : m.type === 'task' ? 'rgba(34,197,94,0.08)' : '#161616',
                  color: m.role === 'user' ? '#ffb38a' : m.type === 'error' ? '#fca5a5' : m.type === 'task' ? '#86efac' : '#ccc',
                  border: `1px solid ${m.role === 'user' ? 'rgba(255,79,0,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.role === 'agent' && <div style={{ fontSize: 9, color: AGENT_COLORS[m.agent] || '#888', fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em' }}>{m.agent}</div>}
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AgentInitial name={selectedAgent === 'All' ? 'Bobby' : selectedAgent} size={22} />
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#161616', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: '#444', letterSpacing: '0.06em' }}>thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 56, background: '#080808', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', zIndex: 99 }}>
        {/* Agent selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {CHAT_AGENTS.map(a => (
            <button
              key={a}
              onClick={() => { setSelectedAgent(a); setAddTaskMode(false) }}
              style={{
                padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', cursor: 'pointer', border: 'none',
                background: !addTaskMode && selectedAgent === a ? `${AGENT_COLORS[a] || ORANGE}20` : 'transparent',
                color: !addTaskMode && selectedAgent === a ? (AGENT_COLORS[a] || ORANGE) : '#444',
                transition: 'all 0.1s',
              }}
            >
              {a}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px', alignSelf: 'center' }} />
          <button
            onClick={() => { setAddTaskMode(!addTaskMode); setSelectedAgent('All') }}
            style={{
              padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.06em', cursor: 'pointer', border: 'none',
              background: addTaskMode ? 'rgba(34,197,94,0.15)' : 'transparent',
              color: addTaskMode ? GREEN : '#444',
            }}
          >
            + TASK
          </button>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={addTaskMode ? 'Add a task to the punch list…' : `Message ${selectedAgent === 'All' ? 'all agents' : selectedAgent}…`}
          style={{
            flex: 1, background: '#111', border: `1px solid ${addTaskMode ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 8, color: '#fff', fontSize: 13, padding: '8px 14px',
            outline: 'none',
          }}
        />

        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            background: addTaskMode ? GREEN : ORANGE, color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 11, fontWeight: 800,
            letterSpacing: '0.08em', cursor: input.trim() ? 'pointer' : 'default',
            opacity: input.trim() ? 1 : 0.3, textTransform: 'uppercase',
            transition: 'opacity 0.15s, background 0.15s',
          }}
        >
          {sending ? '…' : addTaskMode ? 'ADD' : 'SEND'}
        </button>

        {messages.length > 0 && (
          <button onClick={() => setOpen(!open)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#555', fontSize: 10, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}>
            {open ? 'HIDE' : `LOG (${messages.length})`}
          </button>
        )}
      </div>
    </>
  )
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === DASHBOARD_PASSWORD) { localStorage.setItem('aom_ops_auth', '1'); onAuth() }
    else { setShake(true); setInput(''); setTimeout(() => setShake(false), 600) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#020202' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ORANGE, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>AOM</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Mission Control</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>Internal operations. Not for public access.</div>
      </div>
      <div style={{ transform: shake ? 'translateX(8px)' : 'translateX(0)', transition: shake ? 'transform 0.1s ease' : 'transform 0.3s ease', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <input autoFocus type="password" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()} placeholder="access code"
          style={{ background: '#111', border: `1px solid ${shake ? RED : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, color: '#fff', fontSize: 14, padding: '12px 18px', outline: 'none', width: 260, textAlign: 'center', letterSpacing: '0.12em', transition: 'border-color 0.15s' }} />
        <button onClick={attempt} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', width: '100%' }}>
          Enter
        </button>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const AGENTS_CONFIG = [
  { name: 'Bobby', role: 'Web Dev -- Ambition Mechanical', agentFile: 'projects/ambition-mechanical/AGENT.md' },
  { name: 'Jacob', role: 'Outreach & Pipeline', agentFile: 'outreach/AGENT.md' },
  { name: 'Alex', role: 'Deal Architect', agentFile: 'projects/aom-strategy/AGENT.md' },
  { name: 'Cleo', role: 'Content & Video', agentFile: 'projects/content-agent/AGENT.md' },
  { name: 'Rex', role: 'Relentless Execution', agentFile: 'projects/rex/AGENT.md' },
  { name: 'Steffen', role: 'Brand Guidelines', agentFile: null },
  { name: 'Paige', role: 'Client Success', agentFile: 'projects/paige/AGENT.md' },
  { name: 'Tony', role: 'Social Media', agentFile: 'projects/tony/AGENT.md' },
]

export default function Dashboard() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('aom_ops_auth') === '1')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [councilOpen, setCouncilOpen] = useState(false)

  const load = useCallback(async () => {
    if (!GITHUB_TOKEN) return
    setLoading(true)
    try {
      const [prioritiesMd, punchMd, actionsMd, handoffMd, ...agentMds] = await Promise.all([
        fetchFile('context/current-priorities.md'),
        fetchFile('punch-list.md'),
        fetchFile('context/actions-log.md'),
        fetchFile('HANDOFF.md'),
        ...AGENTS_CONFIG.map(a => a.agentFile ? fetchFile(a.agentFile) : Promise.resolve(null)),
      ])
      const agents = AGENTS_CONFIG.map((a, i) => ({ ...a, md: agentMds[i] || '', status: inferAgentStatus(agentMds[i] || ''), lastEntry: agentMds[i] ? parseAgentLog(agentMds[i]) : null }))
      const punchItems = punchMd ? parsePunchList(punchMd) : []
      const priorities = prioritiesMd ? parsePriorities(prioritiesMd) : []
      const tasks = assignTasksToAgents(punchItems)
      const actions = actionsMd ? parseActionsLog(actionsMd) : []
      const handoff = handoffMd ? parseHandoff(handoffMd) : []
      const openCount = punchItems.filter(p => !p.done).length
      const blockedCount = punchItems.filter(p => p.blocked && !p.done).length
      const deadlineCount = punchItems.filter(p => p.deadline && !p.done).length
      const unassignedCount = tasks.filter(t => t.column === 'unassigned').length
      const doneCount = punchItems.filter(p => p.done).length
      setData({ agents, tasks, actions, handoff, priorities, openCount, blockedCount, deadlineCount, unassignedCount, doneCount })
      setLastFetched(new Date())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (authed) load() }, [authed, load])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  const activeAgents = data?.agents?.filter(a => a.status === 'active').length || 0
  const filteredTasks = selectedAgent
    ? data?.tasks?.filter(t => t.agent === selectedAgent || t.column === 'unassigned')
    : data?.tasks || []

  return (
    <div style={{ minHeight: '100vh', background: '#020202', display: 'flex', flexDirection: 'column', paddingBottom: 56 }}>

      {/* TOP BAR */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', color: '#fff', textTransform: 'uppercase' }}>AOM</span>
            <span style={{ fontSize: 10, letterSpacing: '0.14em', color: ORANGE, fontWeight: 700, textTransform: 'uppercase' }}>Mission Control</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          {data && (
            <div style={{ display: 'flex', gap: 20 }}>
              <Stat label="OPEN" value={data.openCount} />
              <Stat label="BLOCKED" value={data.blockedCount} color={data.blockedCount > 0 ? YELLOW : undefined} />
              <Stat label="DEADLINES" value={data.deadlineCount} color={data.deadlineCount > 0 ? RED : undefined} />
              <Stat label="UNASSIGNED" value={data.unassignedCount} color={data.unassignedCount > 0 ? '#777' : undefined} />
              <Stat label="DONE" value={data.doneCount} color={data.doneCount > 0 ? GREEN : undefined} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading && <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.06em' }}>syncing…</span>}
          {lastFetched && !loading && <span style={{ fontSize: 10, color: '#333' }}>{lastFetched.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
          <button onClick={() => setCouncilOpen(true)} style={{ background: `${ORANGE}12`, border: `1px solid ${ORANGE}30`, borderRadius: 6, color: ORANGE, fontSize: 10, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700 }}>COUNCIL</button>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#666', fontSize: 10, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 600 }}>REFRESH</button>
          <button onClick={() => { localStorage.removeItem('aom_ops_auth'); setAuthed(false) }} style={{ background: 'none', border: 'none', color: '#333', fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em' }}>LOCK</button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <div style={{ padding: '0 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase' }}>Agents</span>
          </div>
          <button onClick={() => setSelectedAgent(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8, width: '100%', background: !selectedAgent ? 'rgba(255,79,0,0.08)' : 'transparent', border: `1px solid ${!selectedAgent ? 'rgba(255,79,0,0.2)' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,79,0,0.12)', border: '1.5px solid rgba(255,79,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: ORANGE, flexShrink: 0 }}>ALL</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: !selectedAgent ? '#fff' : '#888' }}>All Agents</span>
          </button>
          {data?.agents?.map(a => {
            const taskCount = data.tasks.filter(t => t.agent === a.name).length
            return <AgentRow key={a.name} agent={a} selected={selectedAgent === a.name} onClick={() => setSelectedAgent(selectedAgent === a.name ? null : a.name)} taskCount={taskCount} />
          })}
          {!data && <div style={{ padding: '20px 12px', fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : !GITHUB_TOKEN ? 'Set VITE_GITHUB_TOKEN' : 'No data'}</div>}
          <div style={{ marginTop: 'auto', padding: '12px 12px 4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 10, color: ORANGE, fontWeight: 700, marginBottom: 2 }}>{activeAgents} active</div>
            <div style={{ fontSize: 9, color: '#333', letterSpacing: '0.06em' }}>{data?.agents?.length || 0} total agents</div>
          </div>
        </div>

        {/* MISSION QUEUE */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{selectedAgent ? `${selectedAgent}'s Queue` : 'Mission Queue'}</div>
            <div style={{ fontSize: 11, color: '#444' }}>{selectedAgent ? `Tasks assigned to ${selectedAgent} + unassigned gaps` : 'All active work across every agent — gaps surface as unassigned'}</div>
          </div>

          {/* Priorities */}
          {!selectedAgent && data?.priorities?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>Current Priorities</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {data.priorities.map((p, i) => (
                  <div key={i} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 200px', maxWidth: 300 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ORANGE, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{p.label}</div>
                      {p.desc && <div style={{ fontSize: 10, color: '#555', marginTop: 3, lineHeight: 1.4 }}>{p.desc}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kanban */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
            {COLUMNS.map(col => <KanbanColumn key={col.id} col={col} tasks={filteredTasks} />)}
          </div>
        </div>

        {/* RIGHT SIDEBAR -- ACTIVITY */}
        <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 14 }}>Activity Feed</div>
          {data ? <ActivityFeed actions={data.actions} handoff={data.handoff} /> : <div style={{ fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : 'No activity'}</div>}
        </div>
      </div>

      {/* COMMAND BAR */}
      <CommandBar onRefresh={load} />

      {/* COUNCIL MODAL */}
      {councilOpen && <CouncilModal onClose={() => setCouncilOpen(false)} />}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: color || '#fff', letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}
