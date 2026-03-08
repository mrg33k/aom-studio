import React, { useState, useEffect, useCallback } from 'react'

// ─── CONFIG (build: 2026-03-09) ───────────────────────────────────────────────
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD

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
    if (line.startsWith('### ')) {
      currentClient = line.replace('### ', '').trim()
      continue
    }
    if (line.startsWith('## ')) {
      currentCategory = line.replace('## ', '').trim()
      currentClient = null
      continue
    }
    const checkbox = line.match(/^\s*- \[([ xX])\]\s*(.+)/)
    if (!checkbox) continue
    const done = checkbox[1].toLowerCase() === 'x'
    const raw = checkbox[2].trim()
    const deadline = /HARD DEADLINE/i.test(raw)
    const blocked = /blocked|waiting on|need.*before|holding/i.test(raw)
    const text = raw.replace(/\s*--\s*HARD DEADLINE.*$/i, '').replace(/\s*--.*$/, '').trim()
    items.push({
      id: `punch-${items.length}`,
      text,
      done,
      deadline,
      blocked,
      category: currentClient || currentCategory,
      raw,
    })
  }
  return items
}

function parseAgentLog(md) {
  const lines = md.split('\n')
  const tableRows = lines.filter(l => l.match(/^\|\s*\d{4}-\d{2}-\d{2}/))
  if (tableRows.length === 0) return null
  const latest = tableRows[tableRows.length - 1]
  const cols = latest.split('|').map(s => s.trim()).filter(Boolean)
  return { date: cols[0], action: cols[1] || '', notes: cols[2] || '' }
}

function inferAgentStatus(md, name) {
  if (!md) return 'idle'
  const lower = md.toLowerCase()
  if (/holding|blocked|waiting on.*patrik|3 open questions/i.test(md)) return 'hold'
  if (/in progress|working on|currently/i.test(md.slice(-600))) return 'active'
  return 'idle'
}

function parseActionsLog(md) {
  if (!md) return []
  return md.split('\n')
    .filter(l => l.startsWith('- '))
    .slice(-20)
    .reverse()
    .map(l => {
      const text = l.replace(/^- /, '').trim()
      const dateMatch = text.match(/\[(\d{4}-\d{2}-\d{2}[^\]]*)\]/)
      return {
        text: dateMatch ? text.replace(dateMatch[0], '').trim() : text,
        date: dateMatch ? dateMatch[1] : '',
      }
    })
}

function parseHandoff(md) {
  if (!md) return []
  const items = []
  for (const line of md.split('\n')) {
    if (line.startsWith('- ')) items.push(line.replace('- ', '').trim())
  }
  return items.slice(0, 8)
}

// ─── ASSIGN TASKS TO AGENTS ───────────────────────────────────────────────────
function assignTasksToAgents(punchItems, priorities) {
  const ownerMap = {
    'Ambition Mechanical': 'Bobby',
    'Skylar Music Video': 'Cleo',
    'ISA Energy': 'Cleo',
    'Brandon Wiley': 'Cleo',
    'KOHRS': 'Cleo',
    'Included Health': 'Cleo',
    'Outreach': 'Jacob',
    'Revenue': 'Jacob',
    'AOM Systems': null,
    'Team': null,
    'Admin': null,
  }

  return punchItems
    .filter(p => !p.done)
    .map(p => {
      let agent = null
      for (const [cat, name] of Object.entries(ownerMap)) {
        if (p.category.toLowerCase().includes(cat.toLowerCase())) { agent = name; break }
      }
      if (!agent && /bobby|ambition|web/i.test(p.text)) agent = 'Bobby'
      if (!agent && /jacob|outreach|email|apollo/i.test(p.text)) agent = 'Jacob'
      if (!agent && /alex|deal|offer|revenue/i.test(p.text)) agent = 'Alex'
      if (!agent && /cleo|video|edit|reel|tiktok|instagram/i.test(p.text)) agent = 'Cleo'
      if (!agent && /steffen|brand|guideline/i.test(p.text)) agent = 'Steffen'

      let column = 'assigned'
      if (p.blocked) column = 'blocked'
      else if (!agent) column = 'unassigned'

      return { ...p, agent, column }
    })
}

// ─── STATUS DOT ───────────────────────────────────────────────────────────────
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
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
      color: c.color, background: c.bg, borderRadius: 4,
      padding: '2px 6px', textTransform: 'uppercase',
    }}>
      {c.label}
    </span>
  )
}

// ─── AGENT ROW ────────────────────────────────────────────────────────────────
const AGENT_COLORS = {
  Bobby: ORANGE,
  Jacob: BLUE,
  Alex: PURPLE,
  Cleo: '#f472b6',
  Steffen: '#34d399',
  Patrik: '#fff',
}

function AgentInitial({ name, size = 28 }) {
  const color = AGENT_COLORS[name] || '#888'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}18`,
      border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color,
      flexShrink: 0,
    }}>
      {name[0]}
    </div>
  )
}

function AgentRow({ agent, tasks, selected, onClick }) {
  const activeTasks = tasks.filter(t => t.agent === agent.name && !t.done).length
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8, width: '100%',
        background: selected ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s',
      }}
    >
      <AgentInitial name={agent.name} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e5e5' }}>{agent.name}</span>
          <StatusPill status={agent.status} />
        </div>
        <div style={{ fontSize: 10, color: '#555', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {agent.role}
        </div>
      </div>
    </button>
  )
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task }) {
  const agentColor = task.agent ? (AGENT_COLORS[task.agent] || '#888') : '#444'
  return (
    <div style={{
      background: '#111',
      border: `1px solid ${task.deadline ? 'rgba(239,68,68,0.3)' : task.blocked ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 8,
      padding: '10px 12px',
      cursor: 'default',
      transition: 'border-color 0.15s',
    }}>
      {task.deadline && (
        <div style={{ fontSize: 9, color: RED, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>
          Hard Deadline
        </div>
      )}
      <div style={{ fontSize: 12, color: '#ddd', lineHeight: 1.4, marginBottom: task.agent ? 8 : 0 }}>
        {task.text}
      </div>
      {(task.agent || task.category) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {task.category && (
            <span style={{ fontSize: 10, color: '#444' }}>{task.category}</span>
          )}
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

// ─── KANBAN COLUMN ────────────────────────────────────────────────────────────
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
        <span style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {col.label}
        </span>
        <span style={{
          fontSize: 10, color: col.color, background: `${col.color}18`,
          borderRadius: 4, padding: '1px 6px', fontWeight: 700,
        }}>
          {colTasks.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {colTasks.map(t => <TaskCard key={t.id} task={t} />)}
        {colTasks.length === 0 && (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 8,
            padding: '16px 12px', textAlign: 'center',
            fontSize: 11, color: '#333',
          }}>
            {col.desc}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ACTIVITY FEED ────────────────────────────────────────────────────────────
function ActivityFeed({ actions, handoff }) {
  const combined = [
    ...handoff.map(t => ({ text: t, type: 'handoff' })),
    ...actions.map(a => ({ text: a.text, date: a.date, type: 'action' })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {combined.slice(0, 18).map((item, i) => (
        <div key={i} style={{
          padding: '8px 0',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0, marginTop: 5,
            background: item.type === 'handoff' ? ORANGE : '#333',
          }} />
          <div>
            {item.date && (
              <div style={{ fontSize: 9, color: '#444', marginBottom: 2, letterSpacing: '0.04em' }}>{item.date}</div>
            )}
            <div style={{ fontSize: 11, color: item.type === 'handoff' ? '#999' : '#555', lineHeight: 1.45 }}>
              {item.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === DASHBOARD_PASSWORD) {
      sessionStorage.setItem('aom_ops_auth', '1')
      onAuth()
    } else {
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, background: '#020202',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ORANGE, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
          AOM
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Mission Control</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>Internal operations. Not for public access.</div>
      </div>
      <div style={{
        transform: shake ? 'translateX(8px)' : 'translateX(0)',
        transition: shake ? 'transform 0.1s ease' : 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      }}>
        <input
          autoFocus type="password" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="access code"
          style={{
            background: '#111', border: `1px solid ${shake ? RED : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, color: '#fff', fontSize: 14, padding: '12px 18px',
            outline: 'none', width: 260, textAlign: 'center', letterSpacing: '0.12em',
            transition: 'border-color 0.15s',
          }}
        />
        <button onClick={attempt} style={{
          background: ORANGE, color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 28px', fontSize: 11, fontWeight: 800,
          letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', width: '100%',
        }}>
          Enter
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.08em', marginTop: 8 }}>
        {DASHBOARD_PASSWORD ? `env: set (${DASHBOARD_PASSWORD.length} chars)` : 'env: not set'}
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
  { name: 'Steffen', role: 'Brand Guidelines', agentFile: null },
]

export default function Dashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('aom_ops_auth') === '1')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

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

      const agents = AGENTS_CONFIG.map((a, i) => ({
        ...a,
        md: agentMds[i] || '',
        status: inferAgentStatus(agentMds[i] || '', a.name),
        lastEntry: agentMds[i] ? parseAgentLog(agentMds[i]) : null,
      }))

      const punchItems = punchMd ? parsePunchList(punchMd) : []
      const priorities = prioritiesMd ? parsePriorities(prioritiesMd) : []
      const tasks = assignTasksToAgents(punchItems, priorities)
      const actions = actionsMd ? parseActionsLog(actionsMd) : []
      const handoff = handoffMd ? parseHandoff(handoffMd) : []

      const openCount = punchItems.filter(p => !p.done).length
      const blockedCount = punchItems.filter(p => p.blocked && !p.done).length
      const deadlineCount = punchItems.filter(p => p.deadline && !p.done).length
      const unassignedCount = tasks.filter(t => t.column === 'unassigned').length

      setData({ agents, tasks, actions, handoff, priorities, openCount, blockedCount, deadlineCount, unassignedCount })
      setLastFetched(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authed) load() }, [authed, load])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  const activeAgents = data?.agents?.filter(a => a.status === 'active').length || 0
  const filteredTasks = selectedAgent
    ? data?.tasks?.filter(t => t.agent === selectedAgent || t.column === 'unassigned')
    : data?.tasks || []

  return (
    <div style={{ minHeight: '100vh', background: '#020202', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
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
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading && <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.06em' }}>syncing…</span>}
          {lastFetched && !loading && (
            <span style={{ fontSize: 10, color: '#333' }}>
              {lastFetched.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button onClick={load} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: '#666', fontSize: 10, padding: '4px 12px',
            cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 600,
          }}>
            REFRESH
          </button>
          <button onClick={() => { sessionStorage.removeItem('aom_ops_auth'); setAuthed(false) }} style={{
            background: 'none', border: 'none', color: '#333', fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em',
          }}>
            LOCK
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR -- AGENTS */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 8px', display: 'flex', flexDirection: 'column', gap: 2,
          overflowY: 'auto',
        }}>
          <div style={{ padding: '0 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase' }}>
              Agents
            </span>
          </div>

          <button
            onClick={() => setSelectedAgent(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px', borderRadius: 8, width: '100%',
              background: !selectedAgent ? 'rgba(255,79,0,0.08)' : 'transparent',
              border: `1px solid ${!selectedAgent ? 'rgba(255,79,0,0.2)' : 'transparent'}`,
              cursor: 'pointer', textAlign: 'left', marginBottom: 4,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,79,0,0.12)', border: '1.5px solid rgba(255,79,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: ORANGE, flexShrink: 0,
            }}>
              ALL
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: !selectedAgent ? '#fff' : '#888' }}>All Agents</span>
          </button>

          {data?.agents?.map(a => (
            <AgentRow
              key={a.name}
              agent={a}
              tasks={data?.tasks || []}
              selected={selectedAgent === a.name}
              onClick={() => setSelectedAgent(selectedAgent === a.name ? null : a.name)}
            />
          ))}

          {!data && (
            <div style={{ padding: '20px 12px', fontSize: 11, color: '#333' }}>
              {loading ? 'Loading agents…' : !GITHUB_TOKEN ? 'Set VITE_GITHUB_TOKEN' : 'No data'}
            </div>
          )}

          <div style={{ marginTop: 'auto', padding: '12px 12px 4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 10, color: ORANGE, fontWeight: 700, marginBottom: 2 }}>
              {activeAgents} active
            </div>
            <div style={{ fontSize: 9, color: '#333', letterSpacing: '0.06em' }}>
              {data?.agents?.length || 0} total agents
            </div>
          </div>
        </div>

        {/* MISSION QUEUE */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {selectedAgent ? `${selectedAgent}'s Queue` : 'Mission Queue'}
            </div>
            <div style={{ fontSize: 11, color: '#444' }}>
              {selectedAgent
                ? `Tasks assigned to ${selectedAgent} + unassigned gaps`
                : 'All active work across every agent — gaps surface as unassigned'}
            </div>
          </div>

          {/* Current Priorities */}
          {!selectedAgent && data?.priorities?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>
                Current Priorities
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {data.priorities.map((p, i) => (
                  <div key={i} style={{
                    background: '#111', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, padding: '10px 14px',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    flex: '1 1 200px', maxWidth: 300,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ORANGE, flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </span>
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
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={filteredTasks}
              />
            ))}
          </div>
        </div>

        {/* RIGHT SIDEBAR -- ACTIVITY */}
        <div style={{
          width: 260, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0,
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 14 }}>
            Activity Feed
          </div>
          {data ? (
            <ActivityFeed actions={data.actions} handoff={data.handoff} />
          ) : (
            <div style={{ fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : 'No activity'}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── STAT CHIP ────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: color || '#fff', letterSpacing: '-0.02em' }}>
        {value}
      </span>
      <span style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}
