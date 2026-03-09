import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ─── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

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
  const raw = atob(data.content.replace(/\n/g, ''))
  // atob only handles Latin-1; decode as UTF-8 to preserve emojis
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
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
  // Parse a date string into a local-midnight Date to avoid UTC drift
  function localDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return isNaN(d) ? null : d
  }
  function todayLocal() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  function daysDiff(target) {
    if (!target) return null
    return Math.ceil((target - todayLocal()) / (1000 * 60 * 60 * 24))
  }

  // Known hardcoded deadlines
  const KNOWN = [
    { pattern: /isa energy|brand video|april 27/i, date: '2026-04-27' },
    { pattern: /included health|ih retainer/i, date: '2026-03-11' },
  ]
  for (const k of KNOWN) {
    if (k.pattern.test(taskText)) return daysDiff(localDate(k.date))
  }

  // Try to extract a date from the raw text (match "Apr 27, 2026" or "2026-04-27" but NOT "Mar 9-11")
  const dateMatch = taskText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},\s*\d{4}|\b\d{4}-\d{2}-\d{2}\b/i)
  if (dateMatch) {
    const parsed = localDate(dateMatch[0].replace(',', ''))
    if (parsed) return daysDiff(parsed)
  }
  return null
}

// ─── PRIORITY SORTING ────────────────────────────────────────────────────────
const URGENCY_RE = /urgent|owe|behind|overdue|blocking|asap|bottleneck/i

function getTaskPriorityTier(task) {
  const text = task.raw || task.text
  const daysLeft = deadlineDaysRemaining(text)

  // Tier 1: deadline within 14 days
  if (task.deadline && daysLeft !== null && daysLeft <= 14) {
    return { tier: 1, daysLeft }
  }

  // Tier 2: urgency keywords
  if (URGENCY_RE.test(text)) {
    return { tier: 2, daysLeft }
  }

  // Tier 3: has a deadline beyond 14 days
  if (task.deadline && daysLeft !== null && daysLeft > 14) {
    return { tier: 3, daysLeft }
  }

  // Tier 4: everything else
  return { tier: 4, daysLeft }
}

function sortTasksByPriority(tasks) {
  // Attach priority info, preserving original index for stable sort
  const tagged = tasks.map((t, i) => ({ ...t, _pri: getTaskPriorityTier(t), _origIdx: i }))

  tagged.sort((a, b) => {
    // Sort by tier first
    if (a._pri.tier !== b._pri.tier) return a._pri.tier - b._pri.tier
    // Within Tier 1, sort by closest deadline
    if (a._pri.tier === 1) {
      const da = a._pri.daysLeft ?? Infinity
      const db = b._pri.daysLeft ?? Infinity
      if (da !== db) return da - db
    }
    // Otherwise maintain original order
    return a._origIdx - b._origIdx
  })

  return tagged
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

// ─── BLOCKER CONTEXT ─────────────────────────────────────────────────────────
function getBlockerContext(taskText) {
  const lower = taskText.toLowerCase()
  // Desktop-required tasks
  if (/postiz|docker|vercel|deploy|firebase console|gcp console|codespaces|terminal|cli|npm|git push/i.test(lower))
    return { label: 'Needs desktop', icon: '\u{1F5A5}' }
  // Needs client response
  if (/client.*confirm|waiting.*client|need.*from.*client|stats bar.*confirm|client.*approve/i.test(lower))
    return { label: 'Waiting on client', icon: '\u{23F3}' }
  // Needs Patrik in person
  if (/filming|on-site|on site|load-in|shoot|set up.*gear/i.test(lower))
    return { label: 'On-site required', icon: '\u{1F4CD}' }
  // Manual action in external tool
  if (/manually|gmail ui|send.*gmail|schedule.*gmail/i.test(lower))
    return { label: 'Manual action', icon: '\u{270B}' }
  return null
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
    if (!agent && /mom|stuck|blocked|push/i.test(p.text)) agent = 'Mom'
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

const AGENT_COLORS = { Bobby: ORANGE, Jacob: BLUE, Alex: PURPLE, Cleo: '#f472b6', Steffen: '#34d399', Mom: RED, Paige: '#06b6d4', Tony: '#a3e635', Elon: '#8b8b8b', Patrik: '#fff' }

const AGENT_SKILLS = {
  Bobby: ['Web Dev', 'Vercel Deploy', 'Pre-flight QA', 'Responsive Design', 'Firebase Admin'],
  Jacob: ['Lead Research', 'Email Outreach', 'Follow-up Pipeline', 'Apollo Search'],
  Alex: ['Deal Strategy', 'Proposal Writing', 'Offer Architecture', 'Revenue Planning'],
  Cleo: ['Content Writing', 'Social Copy', 'Blog Posts', 'Brand Voice'],
  Mom: ['Accountability', 'Email Triage', 'Session Tracking', 'Blocker Detection'],
  Steffen: ['Brand Strategy', 'Visual Identity', 'Logo Design', 'Design Systems'],
  Paige: ['Client Communication', 'Project Updates', 'Onboarding', 'Retention'],
  Tony: ['Social Strategy', 'Content Calendar', 'Platform Management', 'Analytics'],
  Elon: ['System Audit', 'Architecture Review', 'Gap Analysis', 'Performance Optimization'],
}

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
          <div style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</div>
          {lastActive && <span style={{ fontSize: 10, color: '#383838', flexShrink: 0, marginLeft: 4 }}>{lastActive}</span>}
        </div>
      </div>
    </button>
  )
}

// ─── MOBILE TASK CARD ─────────────────────────────────────────────────────────
function MobileTaskCard({ task, onRefresh }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [subtasks, setSubtasks] = useState(null)
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState(null)
  const [swipeX, setSwipeX] = useState(0)
  const [actionsRevealed, setActionsRevealed] = useState(false)
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignFlash, setAssignFlash] = useState(null)
  const inputRef = useRef(null)
  const editRef = useRef(null)
  const subtaskCacheRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const isScrollingRef = useRef(false)
  const swipeWidth = task.agent ? 180 : 140
  const swipeThreshold = 80
  const agentColor = task.agent ? (AGENT_COLORS[task.agent] || '#888') : '#444'
  const daysLeft = task.deadline ? deadlineDaysRemaining(task.raw || task.text) : null
  const urgentColor = daysLeft !== null && daysLeft <= 7 ? '#ff2020' : RED
  const blockerCtx = getBlockerContext(task.raw || task.text)

  useEffect(() => { if (replyOpen && inputRef.current) inputRef.current.focus() }, [replyOpen])
  useEffect(() => { if (editing && editRef.current) { editRef.current.focus(); editRef.current.select() } }, [editing])

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isScrollingRef.current = false
  }

  const handleTouchMove = (e) => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
    if (deltaY > 20 && Math.abs(deltaX) < deltaY) { isScrollingRef.current = true; return }
    if (isScrollingRef.current) return
    if (actionsRevealed && deltaX > 0) {
      setSwipeX(Math.min(deltaX - swipeWidth, 0))
    } else if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -swipeWidth - 20))
    }
  }

  const handleTouchEnd = () => {
    if (isScrollingRef.current) return
    if (swipeX < -swipeThreshold) {
      setActionsRevealed(true)
      setSwipeX(-swipeWidth)
    } else {
      setActionsRevealed(false)
      setSwipeX(0)
    }
  }

  const closeActions = () => {
    setActionsRevealed(false)
    setSwipeX(0)
  }

  const toggleExpand = async () => {
    if (actionsRevealed) { closeActions(); return }
    const next = !expanded
    setExpanded(next)
    if (next && !subtaskCacheRef.current && !loadingSubtasks) {
      setLoadingSubtasks(true)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', message: `Break this task into actionable subtasks (3-5 bullet points). Task: "${task.text}"`, agent: task.agent || 'All' }),
        })
        const data = await res.json()
        const bullets = (data.reply || 'Could not generate subtasks.')
        subtaskCacheRef.current = bullets
        setSubtasks(bullets)
      } catch {
        subtaskCacheRef.current = 'Network error fetching subtasks.'
        setSubtasks('Network error fetching subtasks.')
      }
      setLoadingSubtasks(false)
    } else if (next && subtaskCacheRef.current) {
      setSubtasks(subtaskCacheRef.current)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const agent = task.agent || 'All'
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `TASK: "${task.text}"\n\nPatrik says: ${text}`, agent }),
      })
      const data = await res.json()
      setReply({ text: data.reply || data.error || 'No response.', agent: data.agent || agent })
    } catch {
      setReply({ text: 'Network error.', agent: 'System' })
    }
    setSending(false)
  }

  const deleteTask = async () => {
    if (deleting || deleted) return
    setDeleting(true)
    setDeleteFailed(false)
    closeActions()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_task', taskText: task.text }),
      })
      const data = await res.json()
      if (data.ok) {
        setDeleted(true)
        setTimeout(onRefresh, 1200)
      } else {
        setDeleteFailed(true)
        setTimeout(() => setDeleteFailed(false), 2000)
      }
    } catch {
      setDeleteFailed(true)
      setTimeout(() => setDeleteFailed(false), 2000)
    }
    setDeleting(false)
  }

  const markDone = async () => {
    if (marking || marked) return
    setMarking(true)
    closeActions()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_done', taskText: task.text }),
      })
      const data = await res.json()
      if (data.ok) {
        setMarked(true)
        setTimeout(onRefresh, 1200)
      }
    } catch { /* silently fail */ }
    setMarking(false)
  }

  const launchAgent = async () => {
    if (launching || !task.agent) return
    setLaunching(true)
    closeActions()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch_agent', taskText: task.text, agentName: task.agent }),
      })
      const data = await res.json()
      setLaunchResult({ text: data.reply || data.error || 'No response.', agent: data.agent || task.agent, actions: data.actions_taken || [] })
    } catch {
      setLaunchResult({ text: 'Network error launching agent.', agent: 'System', actions: [] })
    }
    setLaunching(false)
  }

  const saveRename = async () => {
    const newText = editText.trim()
    if (!newText || newText === task.text || saving) { setEditing(false); setEditText(task.text); return }
    setSaving(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_task', oldText: task.text, newText }),
      })
      const data = await res.json()
      if (data.ok) { setTimeout(onRefresh, 1500) }
    } catch { /* silently fail */ }
    setSaving(false)
    setEditing(false)
  }

  const ASSIGNABLE_AGENTS = ['Bobby', 'Jacob', 'Alex', 'Cleo', 'Tony', 'Steffen', 'Elon', 'Paige', 'Mom']

  const assignAgent = async (agentName) => {
    if (assigning) return
    setAssigning(true)
    setAgentPickerOpen(false)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_agent', taskText: task.text, agentName }),
      })
      const data = await res.json()
      if (data.ok) {
        setAssignFlash(agentName)
        setTimeout(() => { setAssignFlash(null); onRefresh() }, 1200)
      }
    } catch { /* silently fail */ }
    setAssigning(false)
  }

  if (deleted || marked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', background: '#0a0a0a', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', opacity: 0.6, transition: 'opacity 0.4s' }}>
        <span style={{ color: '#22c55e', fontSize: 16 }}>&#10003;</span>
        <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>{marked ? 'Done' : 'Removed'}</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      {/* Action buttons revealed by swipe */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: task.agent ? 180 : 140,
        display: 'flex', alignItems: 'stretch', gap: 0, borderRadius: '0 10px 10px 0',
        overflow: 'hidden',
      }}>
        <button
          onClick={markDone}
          style={{
            flex: 1, background: 'rgba(34,197,94,0.15)', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            color: '#22c55e', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
          }}
        >
          <span style={{ fontSize: 18 }}>{marking ? '...' : '\u2713'}</span>
          DONE
        </button>
        {task.agent && (
          <button
            onClick={launchAgent}
            style={{
              flex: 1, background: 'rgba(255,79,0,0.15)', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              color: ORANGE, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
            }}
          >
            <span style={{ fontSize: 18 }}>{launching ? '...' : '\u26A1'}</span>
            RUN
          </button>
        )}
        <button
          onClick={() => { closeActions(); setReplyOpen(!replyOpen) }}
          style={{
            flex: 1, background: 'rgba(96,165,250,0.15)', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            color: BLUE, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
          }}
        >
          <span style={{ fontSize: 18 }}>&#8617;</span>
          REPLY
        </button>
        <button
          onClick={deleteTask}
          style={{
            flex: 1, background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            color: RED, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
          }}
        >
          <span style={{ fontSize: 18 }}>{deleting ? '...' : '\u00d7'}</span>
          DEL
        </button>
      </div>

      {/* Card body (slides on swipe) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: '#111', border: `1px solid ${task.deadline ? 'rgba(239,68,68,0.3)' : task.blocked ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 10, padding: '14px 16px',
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 || actionsRevealed ? 'transform 0.25s ease' : 'none',
          position: 'relative', zIndex: 2,
        }}
      >
        {/* Priority + Deadline + blocker badges */}
        {(task._pri?.tier === 1 || task._pri?.tier === 2 || task.deadline || blockerCtx) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {task._pri?.tier === 1 && (
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: ORANGE, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ORANGE, display: 'inline-block', boxShadow: '0 0 6px rgba(255,79,0,0.5)' }} />
                RIGHT NOW
              </span>
            )}
            {task._pri?.tier === 2 && !task.deadline && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: YELLOW, textTransform: 'uppercase' }}>URGENT</span>
            )}
            {task.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, color: urgentColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Deadline</span>
                {daysLeft !== null && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: urgentColor, background: `${urgentColor}18`, borderRadius: 5, padding: '2px 7px' }}>{daysLeft}d</span>
                )}
              </div>
            )}
            {blockerCtx && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11 }}>{blockerCtx.icon}</span>
                <span style={{ fontSize: 10, color: '#666', fontWeight: 600 }}>{blockerCtx.label}</span>
              </div>
            )}
          </div>
        )}

        {/* Task text */}
        {editing ? (
          <input
            ref={editRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { setEditing(false); setEditText(task.text) } }}
            onBlur={saveRename}
            style={{ fontSize: 16, color: '#fff', lineHeight: 1.5, background: '#0a0a0a', border: '1px solid rgba(255,79,0,0.3)', borderRadius: 6, padding: '8px 12px', width: '100%', outline: 'none', fontFamily: 'inherit' }}
          />
        ) : (
          <div
            onClick={toggleExpand}
            style={{ minHeight: 44, display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ display: 'inline-block', width: 12, fontSize: 10, color: '#444', marginTop: 5, transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>&#9654;</span>
            <span style={{ fontSize: 14, color: '#ddd', lineHeight: 1.5 }}>
              {task.text}
              {saving && <span style={{ fontSize: 10, color: '#555', marginLeft: 8 }}>saving...</span>}
            </span>
          </div>
        )}

        {/* Expanded subtasks */}
        <div style={{ maxHeight: expanded ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
          {expanded && (
            <div style={{ padding: '10px 0 4px 20px', borderLeft: '2px solid rgba(255,255,255,0.06)', marginTop: 8, marginLeft: 4 }}>
              {loadingSubtasks && <div style={{ fontSize: 11, color: '#444', letterSpacing: '0.06em' }}>breaking down...</div>}
              {subtasks && (
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{subtasks}</div>
              )}
            </div>
          )}
        </div>

        {/* Agent + category footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {task.category && <span style={{ fontSize: 11, color: '#444' }}>{task.category}</span>}
          {!task.category && <span />}
          {assignFlash ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#22c55e', fontSize: 14 }}>&#10003;</span>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{assignFlash}</span>
            </div>
          ) : task.agent ? (
            <button
              onClick={(e) => { e.stopPropagation(); setAgentPickerOpen(!agentPickerOpen) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', minHeight: 44, minWidth: 44, justifyContent: 'flex-end' }}
            >
              <AgentInitial name={task.agent} size={20} />
              <span style={{ fontSize: 11, color: agentColor, fontWeight: 600 }}>{task.agent}</span>
              <span style={{ fontSize: 8, color: '#444', marginLeft: 2 }}>&#9660;</span>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setAgentPickerOpen(!agentPickerOpen) }}
              style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 6, cursor: 'pointer', padding: '4px 10px', minHeight: 44, display: 'flex', alignItems: 'center' }}
            >
              <span style={{ fontSize: 11, color: '#444', fontStyle: 'italic' }}>Unassigned</span>
              <span style={{ fontSize: 8, color: '#333', marginLeft: 6 }}>&#9660;</span>
            </button>
          )}
        </div>

        {/* Agent picker dropdown */}
        {agentPickerOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 6, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '6px 0', overflow: 'hidden',
            }}
          >
            {ASSIGNABLE_AGENTS.map(name => {
              const c = AGENT_COLORS[name] || '#888'
              const isCurrentAgent = task.agent === name
              return (
                <button
                  key={name}
                  onClick={() => { if (!isCurrentAgent) assignAgent(name) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
                    background: isCurrentAgent ? `${c}12` : 'transparent', border: 'none', cursor: isCurrentAgent ? 'default' : 'pointer',
                    textAlign: 'left', minHeight: 44,
                  }}
                >
                  <AgentInitial name={name} size={22} />
                  <span style={{ fontSize: 13, color: isCurrentAgent ? c : '#ccc', fontWeight: isCurrentAgent ? 700 : 500 }}>{name}</span>
                  {isCurrentAgent && <span style={{ fontSize: 10, color: c, marginLeft: 'auto', fontWeight: 700 }}>&#10003;</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Inline reply (outside swipe area) */}
      {replyOpen && (
        <div style={{ marginTop: 2, padding: '12px 16px', background: '#0d0d0d', borderRadius: '0 0 10px 10px', border: '1px solid rgba(255,255,255,0.04)', borderTop: 'none' }}>
          {reply && (
            <div style={{ marginBottom: 10, padding: '10px 12px', background: '#161616', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 10, color: AGENT_COLORS[reply.agent] || '#888', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em' }}>{reply.agent}</div>
              <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{reply.text}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setReplyOpen(false) }}
              placeholder="Quick note..."
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 16, padding: '10px 14px', outline: 'none' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap', minHeight: 44 }}
            >
              {sending ? '...' : 'GO'}
            </button>
          </div>
        </div>
      )}

      {/* Agent launch result */}
      {(launching || launchResult) && (
        <div style={{ marginTop: 2, padding: '12px 16px', background: '#0d0d0d', borderRadius: '0 0 10px 10px', border: `1px solid rgba(255,79,0,0.15)`, borderTop: 'none' }}>
          {launching && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: ORANGE }}>&#9889;</span>
              <span style={{ fontSize: 11, color: '#888' }}>{task.agent} is working...</span>
            </div>
          )}
          {launchResult && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: ORANGE }}>&#9889;</span>
                  <span style={{ fontSize: 10, color: AGENT_COLORS[launchResult.agent] || ORANGE, fontWeight: 700, letterSpacing: '0.06em' }}>{launchResult.agent}</span>
                </div>
                <button onClick={() => setLaunchResult(null)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 14, cursor: 'pointer', padding: '4px' }}>&times;</button>
              </div>
              <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{launchResult.text}</div>
              {launchResult.actions.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {launchResult.actions.map((a, i) => (
                    <div key={i} style={{ fontSize: 10, color: '#22c55e', marginBottom: 2 }}>&#10003; {a.tool}: {a.result?.task || a.input?.task_description || 'done'}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete failed indicator */}
      {deleteFailed && (
        <div style={{ marginTop: 2, padding: '8px 16px', background: '#1a0a0a', borderRadius: '0 0 10px 10px', border: '1px solid rgba(239,68,68,0.3)', borderTop: 'none' }}>
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Failed to remove</span>
        </div>
      )}
    </div>
  )
}

// ─── DESKTOP TASK CARD ────────────────────────────────────────────────────────
function TaskCard({ task, onRefresh }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [subtasks, setSubtasks] = useState(null)
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const inputRef = useRef(null)
  const editRef = useRef(null)
  const subtaskCacheRef = useRef(null)
  const agentColor = task.agent ? (AGENT_COLORS[task.agent] || '#888') : '#444'
  const daysLeft = task.deadline ? deadlineDaysRemaining(task.raw || task.text) : null
  const urgentColor = daysLeft !== null && daysLeft <= 7 ? '#ff2020' : RED
  const blockerCtx = getBlockerContext(task.raw || task.text)

  useEffect(() => { if (replyOpen && inputRef.current) inputRef.current.focus() }, [replyOpen])
  useEffect(() => { if (editing && editRef.current) { editRef.current.focus(); editRef.current.select() } }, [editing])

  const toggleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && !subtaskCacheRef.current && !loadingSubtasks) {
      setLoadingSubtasks(true)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', message: `Break this task into actionable subtasks (3-5 bullet points). Task: "${task.text}"`, agent: task.agent || 'All' }),
        })
        const data = await res.json()
        const bullets = (data.reply || 'Could not generate subtasks.')
        subtaskCacheRef.current = bullets
        setSubtasks(bullets)
      } catch {
        subtaskCacheRef.current = 'Network error fetching subtasks.'
        setSubtasks('Network error fetching subtasks.')
      }
      setLoadingSubtasks(false)
    } else if (next && subtaskCacheRef.current) {
      setSubtasks(subtaskCacheRef.current)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const agent = task.agent || 'All'
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `TASK: "${task.text}"\n\nPatrik says: ${text}`, agent }),
      })
      const data = await res.json()
      setReply({ text: data.reply || data.error || 'No response.', agent: data.agent || agent })
    } catch {
      setReply({ text: 'Network error.', agent: 'System' })
    }
    setSending(false)
  }

  const deleteTask = async () => {
    if (deleting || deleted) return
    setDeleting(true)
    setDeleteFailed(false)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_task', taskText: task.text }),
      })
      const data = await res.json()
      if (data.ok) {
        setDeleted(true)
        setTimeout(onRefresh, 1200)
      } else {
        setDeleteFailed(true)
        setTimeout(() => setDeleteFailed(false), 2000)
      }
    } catch {
      setDeleteFailed(true)
      setTimeout(() => setDeleteFailed(false), 2000)
    }
    setDeleting(false)
  }

  const saveRename = async () => {
    const newText = editText.trim()
    if (!newText || newText === task.text || saving) { setEditing(false); setEditText(task.text); return }
    setSaving(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_task', oldText: task.text, newText }),
      })
      const data = await res.json()
      if (data.ok) { setTimeout(onRefresh, 1500) }
    } catch { /* silently fail */ }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{ background: deleted ? '#0a0a0a' : deleteFailed ? '#1a0a0a' : '#111', border: `1px solid ${deleted ? 'rgba(34,197,94,0.3)' : deleteFailed ? 'rgba(239,68,68,0.4)' : task.deadline ? 'rgba(239,68,68,0.3)' : task.blocked ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, padding: '10px 12px', opacity: deleted ? 0 : 1, maxHeight: deleted ? 0 : 500, overflow: 'hidden', transition: 'opacity 0.4s ease, max-height 0.5s ease 0.3s, padding 0.5s ease 0.3s, margin 0.5s ease 0.3s, border-color 0.3s ease, background 0.3s ease', ...(deleted ? { padding: 0, marginBottom: -8 } : {}) }}>
      {deleteFailed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 600 }}>Failed to remove</span>
        </div>
      )}
      {task._pri?.tier === 1 && !task.deadline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, display: 'inline-block', boxShadow: '0 0 5px rgba(255,79,0,0.5)' }} />
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: ORANGE, textTransform: 'uppercase' }}>Right Now</span>
        </div>
      )}
      {task._pri?.tier === 2 && !task.deadline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: YELLOW, textTransform: 'uppercase' }}>Urgent</span>
        </div>
      )}
      {task.deadline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {task._pri?.tier === 1 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE, display: 'inline-block', boxShadow: '0 0 5px rgba(255,79,0,0.5)', flexShrink: 0 }} />}
          <span style={{ fontSize: 9, color: urgentColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hard Deadline</span>
          {daysLeft !== null ? (
            <span style={{ fontSize: 9, fontWeight: 700, color: urgentColor, background: `${urgentColor}18`, borderRadius: 4, padding: '1px 5px' }}>{daysLeft}d</span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 600, color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '1px 5px' }}>deadline</span>
          )}
        </div>
      )}

      {/* Blocker context badge */}
      {blockerCtx && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <span style={{ fontSize: 10 }}>{blockerCtx.icon}</span>
          <span style={{ fontSize: 9, color: '#777', fontWeight: 600, letterSpacing: '0.04em' }}>{blockerCtx.label}</span>
        </div>
      )}

      {/* Task title: click to expand, double-click to edit */}
      {editing ? (
        <input
          ref={editRef}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') { setEditing(false); setEditText(task.text) } }}
          onBlur={saveRename}
          style={{ fontSize: 12, color: '#fff', lineHeight: 1.4, background: '#0a0a0a', border: '1px solid rgba(255,79,0,0.3)', borderRadius: 4, padding: '3px 6px', width: '100%', outline: 'none', fontFamily: 'inherit' }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <div
            onClick={toggleExpand}
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); setEditText(task.text) }}
            style={{ flex: 1, fontSize: 12, color: '#ddd', lineHeight: 1.4, cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ display: 'inline-block', width: 10, fontSize: 8, color: '#444', marginRight: 4, transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
            {task.text}
            {saving && <span style={{ fontSize: 9, color: '#555', marginLeft: 6 }}>saving...</span>}
          </div>
          <button
            onClick={e => { e.stopPropagation(); deleteTask() }}
            title="Remove task"
            style={{ background: 'none', border: 'none', color: '#333', fontSize: 14, cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = '#ef4444'}
            onMouseLeave={e => e.target.style.color = '#333'}
          >
            {deleting ? '...' : '\u00d7'}
          </button>
        </div>
      )}

      {/* Expanded subtasks */}
      <div style={{ maxHeight: expanded ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
        {expanded && (
          <div style={{ padding: '8px 0 4px 14px', borderLeft: '2px solid rgba(255,255,255,0.06)', marginTop: 6, marginLeft: 4 }}>
            {loadingSubtasks && <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.06em' }}>breaking down...</div>}
            {subtasks && (
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{subtasks}</div>
            )}
          </div>
        )}
      </div>

      {(task.agent || task.category) && (
        <div
          onClick={() => { setReplyOpen(!replyOpen); setReply(null) }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
        >
          {task.category && <span style={{ fontSize: 10, color: replyOpen ? '#666' : '#444', transition: 'color 0.15s' }}>{task.category}</span>}
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

      {/* Inline reply */}
      {replyOpen && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {reply && (
            <div style={{ marginBottom: 8, padding: '6px 10px', background: '#161616', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 9, color: AGENT_COLORS[reply.agent] || '#888', fontWeight: 700, marginBottom: 3, letterSpacing: '0.06em' }}>{reply.agent}</div>
              <div style={{ fontSize: 11, color: '#bbb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{reply.text}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); if (e.key === 'Escape') setReplyOpen(false) }}
              placeholder="Quick note..."
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#fff', fontSize: 11, padding: '6px 10px', outline: 'none' }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}
            >
              {sending ? '...' : 'GO'}
            </button>
          </div>
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

function KanbanColumn({ col, tasks, onRefresh }) {
  const colTasks = tasks.filter(t => t.column === col.id)
  return (
    <div style={{ minWidth: 260, maxWidth: 300, flex: '1 1 260px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{col.label}</span>
        <span style={{ fontSize: 10, color: col.color, background: `${col.color}18`, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{colTasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {colTasks.map(t => <TaskCard key={t.id} task={t} onRefresh={onRefresh} />)}
        {colTasks.length === 0 && (
          <div style={{ border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px 12px', textAlign: 'center', fontSize: 11, color: '#333' }}>{col.desc}</div>
        )}
      </div>
    </div>
  )
}

function AgentProfile({ agent }) {
  const [skillIdea, setSkillIdea] = useState('')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState(null)
  const color = AGENT_COLORS[agent.name] || '#888'
  const skills = AGENT_SKILLS[agent.name] || []
  const inputRef = useRef(null)

  const submitIdea = async () => {
    const text = skillIdea.trim()
    if (!text || sending) return
    setSkillIdea('')
    setSending(true)
    setResponse(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Skill idea for ${agent.name}: ${text}`, agent: agent.name }),
      })
      const data = await res.json()
      setResponse(data.reply || data.error || 'No response.')
    } catch {
      setResponse('Network error.')
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Agent header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AgentInitial name={agent.name} size={38} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: color, fontWeight: 600, marginTop: 1 }}>{agent.role}</div>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusPill status={agent.status} />
        {agent.lastEntry && (
          <span style={{ fontSize: 10, color: '#444' }}>Last active {relativeTime(agent.lastEntry.date)}</span>
        )}
      </div>

      {/* Skills */}
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Skills</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {skills.map(skill => (
            <span key={skill} style={{ fontSize: 10, color: color, background: `${color}14`, border: `1px solid ${color}28`, borderRadius: 5, padding: '3px 8px', fontWeight: 600, letterSpacing: '0.02em' }}>
              {skill}
            </span>
          ))}
          {skills.length === 0 && (
            <span style={{ fontSize: 10, color: '#333', fontStyle: 'italic' }}>No skills defined</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

      {/* Skill idea input */}
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Suggest a Skill</div>
        {response && (
          <div style={{ marginBottom: 8, padding: '6px 10px', background: '#111', borderRadius: 6, border: `1px solid ${color}18` }}>
            <div style={{ fontSize: 9, color, fontWeight: 700, marginBottom: 3, letterSpacing: '0.06em' }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: '#bbb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{response}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            value={skillIdea}
            onChange={e => setSkillIdea(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitIdea() }}
            placeholder="Skill idea..."
            style={{ flex: 1, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#fff', fontSize: 16, padding: '8px 10px', outline: 'none' }}
          />
          <button
            onClick={submitIdea}
            disabled={!skillIdea.trim() || sending}
            style={{ background: color, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', cursor: skillIdea.trim() ? 'pointer' : 'default', opacity: skillIdea.trim() ? 1 : 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}
          >
            {sending ? '...' : 'ADD'}
          </button>
        </div>
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

// ─── REPORT COMPONENTS ───────────────────────────────────────────────────────
const REPORT_TYPE_CONFIG = {
  audit: { label: 'AUDIT', color: '#ef4444' },
  brief: { label: 'BRIEF', color: '#60a5fa' },
  research: { label: 'RESEARCH', color: '#a78bfa' },
  plan: { label: 'PLAN', color: '#22c55e' },
  session: { label: 'SESSION', color: '#eab308' },
  report: { label: 'REPORT', color: '#888' },
}

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false)
  const typeConfig = REPORT_TYPE_CONFIG[report.type] || REPORT_TYPE_CONFIG.report
  const agentColor = AGENT_COLORS[report.agent] || '#888'

  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <span style={{ display: 'inline-block', width: 10, fontSize: 8, color: '#444', transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>&#9654;</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.title}</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: typeConfig.color, background: `${typeConfig.color}18`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', flexShrink: 0 }}>
            {typeConfig.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <AgentInitial name={report.agent} size={16} />
            <span style={{ fontSize: 10, color: agentColor, fontWeight: 600 }}>{report.agent}</span>
          </div>
          {report.date && <span style={{ fontSize: 9, color: '#383838' }}>{report.date}</span>}
          <span style={{ fontSize: 9, color: '#2a2a2a', marginLeft: 'auto' }}>{report.path}</span>
        </div>
      </div>

      {/* Expanded content */}
      <div style={{ maxHeight: expanded ? 600 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        {expanded && (
          <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 11, color: '#999', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto', padding: '12px 0', fontFamily: '-apple-system, BlinkMacSystemFont, monospace' }}>
              {report.content.slice(0, 4000)}{report.content.length > 4000 ? '\n\n[truncated]' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReportsPanel() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_reports' }),
        })
        const data = await res.json()
        if (data.error) { setError(data.error); return }
        setReports(data.reports || [])
      } catch {
        setError('Failed to load reports.')
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const types = ['all', ...new Set(reports.map(r => r.type))]
  const filtered = filter === 'all' ? reports : reports.filter(r => r.type === filter)

  return (
    <div style={{ padding: 24, flex: 1, overflow: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Reports Feed</div>
        <div style={{ fontSize: 11, color: '#444' }}>Agent outputs, audits, briefs, and research</div>
      </div>

      {/* Type filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {types.map(t => {
          const config = t === 'all' ? { label: 'ALL', color: ORANGE } : (REPORT_TYPE_CONFIG[t] || { label: t, color: '#888' })
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '3px 10px', borderRadius: 5, fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer', border: 'none', textTransform: 'uppercase',
                background: filter === t ? `${config.color}20` : 'transparent',
                color: filter === t ? config.color : '#444',
                transition: 'all 0.1s',
              }}
            >
              {config.label}
            </button>
          )
        })}
      </div>

      {loading && <div style={{ fontSize: 11, color: '#444', padding: 20 }}>Loading reports...</div>}
      {error && <div style={{ fontSize: 11, color: RED, padding: 20 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((report, i) => <ReportCard key={report.path || i} report={report} />)}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ fontSize: 11, color: '#333', padding: 20, textAlign: 'center' }}>No reports found</div>
        )}
      </div>
    </div>
  )
}

// ─── SKILLS PANEL ────────────────────────────────────────────────────────────
function SkillsPanel() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSkill, setExpandedSkill] = useState(null)

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        // Fetch the skills directory listing from GitHub
        const res = await fetch(
          `https://api.github.com/repos/${REPO}/contents/.claude/skills?ref=${BRANCH}`,
          { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
        )
        if (!res.ok) { setLoading(false); return }
        const dirs = await res.json()
        const skillDirs = dirs.filter(d => d.type === 'dir')

        // Fetch each SKILL.md in parallel
        const skillData = await Promise.all(
          skillDirs.map(async (dir) => {
            const md = await fetchFile(`.claude/skills/${dir.name}/SKILL.md`)
            if (!md) return null
            const titleMatch = md.match(/^#\s+(.+)/m)
            const triggerMatch = md.match(/## Trigger\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
            const stepsMatch = md.match(/## Steps\n([\s\S]*?)(?=\n##|\n---|\Z)/i)
            const whatMatch = md.match(/## What This Skill Does\n([\s\S]*?)(?=\n##|\n---|\Z)/i)

            // Extract bullet points from trigger section
            const triggers = triggerMatch
              ? triggerMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('User says')).map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
              : []

            // Extract step headers
            const steps = stepsMatch
              ? stepsMatch[1].split('\n').filter(l => /^###\s/.test(l)).map(l => l.replace(/^###\s+/, '').replace(/^\d+\.\s*/, '').trim())
              : []

            return {
              name: dir.name,
              title: titleMatch ? titleMatch[1].replace(/^Skill:\s*/i, '') : dir.name,
              description: whatMatch ? whatMatch[1].trim().split('\n')[0] : '',
              triggers,
              steps,
              fullMd: md,
            }
          })
        )
        setSkills(skillData.filter(Boolean).sort((a, b) => a.title.localeCompare(b.title)))
      } catch { /* silently fail */ }
      setLoading(false)
    }
    fetchSkills()
  }, [])

  return (
    <div style={{ padding: 24, flex: 1, overflow: 'auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Skills</div>
        <div style={{ fontSize: 11, color: '#444' }}>{skills.length} skills loaded from .claude/skills/</div>
      </div>

      {loading && <div style={{ fontSize: 11, color: '#444', padding: 20 }}>Loading skills...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {skills.map(skill => {
          const isExpanded = expandedSkill === skill.name
          return (
            <div key={skill.name} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
              <div
                onClick={() => setExpandedSkill(isExpanded ? null : skill.name)}
                style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, fontSize: 8, color: '#444', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{skill.title}</span>
                  </div>
                  <span style={{ fontSize: 9, color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{skill.steps.length} steps</span>
                </div>
                {skill.description && (
                  <div style={{ fontSize: 11, color: '#555', paddingLeft: 18, lineHeight: 1.4 }}>{skill.description}</div>
                )}
              </div>

              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {/* Triggers */}
                  {skill.triggers.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: ORANGE, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Triggers</div>
                      {skill.triggers.map((t, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#888', lineHeight: 1.6, paddingLeft: 8 }}>{t}</div>
                      ))}
                    </div>
                  )}

                  {/* Steps */}
                  {skill.steps.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: BLUE, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Steps</div>
                      {skill.steps.map((s, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#888', lineHeight: 1.8, paddingLeft: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#333', fontWeight: 700, flexShrink: 0, fontSize: 10, marginTop: 2 }}>{i + 1}</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ACTION BADGE ────────────────────────────────────────────────────────────
function ActionBadge({ action }) {
  const toolLabels = { mark_task_done: 'Task Completed' }
  const label = toolLabels[action.tool] || action.tool
  const isSuccess = action.result?.success

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700,
      letterSpacing: '0.06em',
      background: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      color: isSuccess ? GREEN : RED,
      border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      <span>{isSuccess ? '\u2713' : '\u2717'}</span>
      <span>{label}</span>
      {action.result?.task && (
        <span style={{ color: '#666', fontWeight: 500 }}>: {action.result.task.slice(0, 40)}{action.result.task.length > 40 ? '...' : ''}</span>
      )}
    </div>
  )
}

// ─── COUNCIL MODAL ────────────────────────────────────────────────────────────
const COUNCIL_AGENTS = ['Bobby', 'Jacob', 'Alex', 'Cleo', 'Mom', 'Steffen', 'Paige', 'Tony', 'Elon']

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
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6 }}>Each agent weighs in from their domain. Bobby on tech, Jacob on pipeline, Alex on revenue, Cleo on content, Mom on blockers, Steffen on brand. Synthesis follows.</div>
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
const CHAT_AGENTS = ['All', 'Bobby', 'Jacob', 'Alex', 'Cleo', 'Mom', 'Steffen', 'Paige', 'Tony', 'Elon']

function CommandBar({ onRefresh, isMobile }) {
  const [input, setInput] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('All')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)
  const [addTaskMode, setAddTaskMode] = useState(true) // default to task mode
  const [barMode, setBarMode] = useState('task') // 'task' | 'chat' | 'agent' | 'home'
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

    if (barMode === 'home') {
      // HOME mode: full conversation with CC
      const newUserMsg = { role: 'user', text, type: 'home' }
      setMessages(m => [...m, newUserMsg])
      // Build conversation history for context
      const homeHistory = [...messages.filter(m => m.type === 'home' || (m.agent === 'CC' && m.role === 'assistant')), newUserMsg]
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: m.text }))
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'home_chat', message: text, history: homeHistory.slice(-10) }),
        })
        const data = await res.json()
        if (data.error) {
          setMessages(m => [...m, { role: 'system', text: data.error, type: 'error' }])
        } else {
          setMessages(m => [...m, { role: 'assistant', text: data.reply || data.message, agent: 'CC' }])
          if (data.queuedForMac) {
            setMessages(m => [...m, { role: 'system', text: 'Queued for Mac execution.', type: 'task' }])
          }
          if (data.actions_taken?.length > 0) setTimeout(onRefresh, 2000)
        }
      } catch {
        setMessages(m => [...m, { role: 'system', text: 'Network error reaching CC.', type: 'error' }])
      }
    } else if (addTaskMode) {
      const notes = taskNotes.trim()
      setMessages(m => [...m, { role: 'user', text: `+ ${text}${notes ? '\n  ' + notes.split('\n').join('\n  ') : ''}`, type: 'task' }])
      setTaskNotes('')
      setNotesOpen(false)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_task', task: text, notes: notes || undefined }),
        })
        const data = await res.json()
        if (data.ok) {
          const assignMsg = data.assignedAgent ? ` Assigned to ${data.assignedAgent}.` : ''
          setMessages(m => [...m, { role: 'system', text: `Task added.${assignMsg}`, type: 'task' }])
          if (data.agentReply) {
            setMessages(m => [...m, { role: 'assistant', text: data.agentReply, agent: data.assignedAgent }])
          }
          setTimeout(onRefresh, 2000); setAddTaskMode(false)
        } else {
          setMessages(m => [...m, { role: 'system', text: data.error || 'Failed to add task.', type: 'error' }])
        }
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
          setMessages(m => [...m, { role: 'agent', text: data.reply, agent: data.agent, actions_taken: data.actions_taken || [] }])
          // Auto-refresh if actions were taken
          if (data.actions_taken?.length > 0) setTimeout(onRefresh, 2000)
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
        <div style={{ position: 'fixed', bottom: addTaskMode && notesOpen ? 120 : 64, right: isMobile ? 0 : 24, left: isMobile ? 0 : 'auto', width: isMobile ? '100%' : 420, maxHeight: isMobile ? '70vh' : 400, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: isMobile ? '12px 12px 0 0' : 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', transition: 'bottom 0.15s ease' }}>
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
                  {m.actions_taken?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {m.actions_taken.map((a, ai) => <ActionBadge key={ai} action={a} />)}
                    </div>
                  )}
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

      {/* Task notes panel (slides up above command bar when in + TASK mode) */}
      {addTaskMode && notesOpen && (
        <div style={{ position: 'fixed', bottom: 56, left: 0, right: 0, background: '#080808', borderTop: '1px solid rgba(34,197,94,0.15)', padding: '8px 20px', zIndex: 98, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 9, color: GREEN, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6, flexShrink: 0 }}>Notes</span>
          <textarea
            value={taskNotes}
            onChange={e => setTaskNotes(e.target.value)}
            placeholder="Add bullet point context for the agent... (one note per line)"
            rows={2}
            style={{ flex: 1, background: '#111', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, color: '#ccc', fontSize: 11, padding: '6px 10px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
      )}

      {/* Bar */}
      <div style={{ position: 'fixed', bottom: isMobile ? 56 : 0, left: 0, right: 0, background: '#080808', borderTop: '1px solid rgba(255,255,255,0.08)', zIndex: 99 }}>
        {/* Mode tabs + agent selector row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: isMobile ? '0 10px' : '0 20px', height: isMobile ? 44 : 32, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { id: 'task', label: 'TASK', color: GREEN },
            { id: 'chat', label: 'CHAT', color: ORANGE },
            { id: 'agent', label: 'AGENT', color: BLUE },
            { id: 'home', label: 'HOME', color: '#F5F0EB' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => {
                setBarMode(m.id)
                setAddTaskMode(m.id === 'task')
                if (m.id === 'chat') setSelectedAgent('All')
                if (m.id === 'task') { setNotesOpen(false); setTaskNotes('') }
                if (m.id === 'home') { setNotesOpen(false); setTaskNotes('') }
              }}
              style={{
                padding: isMobile ? '10px 14px' : '4px 12px', borderRadius: 0, fontSize: 10, fontWeight: 800,
                letterSpacing: '0.1em', cursor: 'pointer', border: 'none',
                background: barMode === m.id ? `${m.color}15` : 'transparent',
                color: barMode === m.id ? m.color : '#444',
                borderBottom: barMode === m.id ? `2px solid ${m.color}` : '2px solid transparent',
                transition: 'all 0.15s', minHeight: 44,
              }}
            >
              {m.label}
            </button>
          ))}

          {/* Agent selector (only in agent mode) */}
          {barMode === 'agent' && (
            <>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 8px' }} />
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                {CHAT_AGENTS.filter(a => a !== 'All').map(a => (
                  <button
                    key={a}
                    onClick={() => setSelectedAgent(a)}
                    style={{
                      padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', cursor: 'pointer', border: 'none',
                      background: selectedAgent === a ? `${AGENT_COLORS[a] || BLUE}20` : 'transparent',
                      color: selectedAgent === a ? (AGENT_COLORS[a] || BLUE) : '#444',
                      transition: 'all 0.1s', flexShrink: 0,
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Log toggle */}
          {messages.length > 0 && (
            <button onClick={() => setOpen(!open)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, color: '#444', fontSize: 9, padding: '2px 8px', cursor: 'pointer', letterSpacing: '0.06em', marginLeft: 'auto', flexShrink: 0 }}>
              {open ? 'HIDE' : `${messages.length}`}
            </button>
          )}
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, padding: isMobile ? '8px 10px' : '8px 20px', height: 48 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={
              barMode === 'task' ? 'Add a task...'
              : barMode === 'home' ? 'Talk to CC...'
              : barMode === 'agent' ? `Message ${selectedAgent}...`
              : 'Message all agents...'
            }
            style={{
              flex: 1, background: '#111',
              border: `1px solid ${barMode === 'task' ? 'rgba(34,197,94,0.2)' : barMode === 'home' ? 'rgba(245,240,235,0.2)' : barMode === 'agent' ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 8, color: '#fff', fontSize: isMobile ? 16 : 13, padding: '8px 14px',
              outline: 'none',
            }}
          />

          {/* Notes toggle (task mode only) */}
          {barMode === 'task' && (
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              style={{
                background: notesOpen ? 'rgba(34,197,94,0.12)' : 'transparent',
                border: `1px solid ${notesOpen ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, color: notesOpen ? GREEN : '#555', fontSize: 9, fontWeight: 700,
                padding: '6px 8px', cursor: 'pointer', letterSpacing: '0.06em', whiteSpace: 'nowrap',
              }}
            >
              {notesOpen ? 'NOTES' : '+'}
            </button>
          )}

          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              background: barMode === 'task' ? GREEN : barMode === 'home' ? '#F5F0EB' : barMode === 'agent' ? BLUE : ORANGE,
              color: barMode === 'home' ? '#0A0A08' : '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.08em', cursor: input.trim() ? 'pointer' : 'default',
              opacity: input.trim() ? 1 : 0.3, textTransform: 'uppercase',
              transition: 'opacity 0.15s, background 0.15s',
            }}
          >
            {sending ? '...' : barMode === 'task' ? 'ADD' : barMode === 'home' ? 'SEND' : 'SEND'}
          </button>
        </div>
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
          style={{ background: '#111', border: `1px solid ${shake ? RED : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, color: '#fff', fontSize: 16, padding: '12px 18px', outline: 'none', width: 260, textAlign: 'center', letterSpacing: '0.12em', transition: 'border-color 0.15s' }} />
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
  { name: 'Mom', role: 'Relentless Execution', agentFile: 'projects/mom/AGENT.md' },
  { name: 'Steffen', role: 'Brand Guidelines', agentFile: null },
  { name: 'Paige', role: 'Client Success', agentFile: 'projects/paige/AGENT.md' },
  { name: 'Tony', role: 'Social Media', agentFile: 'projects/tony/AGENT.md' },
  { name: 'Elon', role: 'System Manager', agentFile: 'projects/sys/AGENT.md' },
]

const REFRESH_INTERVAL = 30000

export default function Dashboard() {
  const isMobile = useIsMobile()
  const [authed, setAuthed] = useState(() => localStorage.getItem('aom_ops_auth') === '1')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const [councilOpen, setCouncilOpen] = useState(false)
  const [activeView, setActiveView] = useState('queue') // 'queue' | 'reports' | 'skills' | 'agents' | 'activity'
  const [mobileFilter, setMobileFilter] = useState('all') // 'all' | 'unassigned' | 'assigned' | 'blocked'
  const [mobileAgentPanel, setMobileAgentPanel] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [collapsedSections, setCollapsedSections] = useState({}) // mobile collapsible sections
  const refreshTimerRef = useRef(null)
  const progressRef = useRef(null)

  const load = useCallback(async () => {
    if (!GITHUB_TOKEN) {
      setData(null)
      return
    }
    setLoading(true)
    setRefreshProgress(0)
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

  // Auto-refresh every 30 seconds with progress bar
  useEffect(() => {
    if (!authed) return
    load()

    // Progress bar animation
    let startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / REFRESH_INTERVAL, 1)
      setRefreshProgress(progress)
      if (progress >= 1) {
        load().then(() => {
          startTime = Date.now()
          setRefreshProgress(0)
        })
      }
      progressRef.current = requestAnimationFrame(tick)
    }
    progressRef.current = requestAnimationFrame(tick)

    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current)
    }
  }, [authed, load])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  const activeAgents = data?.agents?.filter(a => a.status === 'active').length || 0
  const filteredTasks = sortTasksByPriority(
    selectedAgent
      ? data?.tasks?.filter(t => t.agent === selectedAgent || t.column === 'unassigned') || []
      : data?.tasks || []
  )

  return (
    <div style={{ minHeight: '100vh', background: '#020202', display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? 116 : 56 }}>

      {/* REFRESH PROGRESS BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 300, background: 'transparent' }}>
        <div style={{ height: '100%', width: `${refreshProgress * 100}%`, background: 'rgba(255,255,255,0.12)', transition: refreshProgress === 0 ? 'none' : 'width 0.3s linear' }} />
      </div>

      {/* TOP BAR */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: isMobile ? '0 12px' : '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', color: '#fff', textTransform: 'uppercase' }}>AOM</span>
            {!isMobile && <span style={{ fontSize: 10, letterSpacing: '0.14em', color: ORANGE, fontWeight: 700, textTransform: 'uppercase' }}>Mission Control</span>}
          </div>
          {!isMobile && <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />}
          {data && (
            <div style={{ display: 'flex', gap: isMobile ? 10 : 20 }}>
              <Stat label="OPEN" value={data.openCount} compact={isMobile} />
              <Stat label="BLOCKED" value={data.blockedCount} color={data.blockedCount > 0 ? YELLOW : undefined} compact={isMobile} />
              <Stat label="DUE" value={data.deadlineCount} color={data.deadlineCount > 0 ? RED : undefined} compact={isMobile} />
              {!isMobile && <Stat label="UNASSIGNED" value={data.unassignedCount} color={data.unassignedCount > 0 ? '#777' : undefined} />}
              {!isMobile && <Stat label="DONE" value={data.doneCount} color={data.doneCount > 0 ? GREEN : undefined} />}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {loading && <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.06em' }}>syncing…</span>}
          {lastFetched && !loading && !isMobile && <span style={{ fontSize: 10, color: '#333' }}>{lastFetched.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
          <button onClick={() => setCouncilOpen(true)} style={{ background: `${ORANGE}12`, border: `1px solid ${ORANGE}30`, borderRadius: 6, color: ORANGE, fontSize: 10, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center' }}>COUNCIL</button>
          {!isMobile && <button onClick={load} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#666', fontSize: 10, padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 600 }}>REFRESH</button>}
          <button onClick={() => { localStorage.removeItem('aom_ops_auth'); setAuthed(false) }} style={{ background: 'none', border: 'none', color: '#333', fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOCK</button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR (desktop only) */}
        {!isMobile && (
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
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* View switcher */}
            <div style={{ padding: '8px 8px 0', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
              <button
                onClick={() => setActiveView('queue')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 6, width: '100%',
                  background: activeView === 'queue' ? 'rgba(255,79,0,0.08)' : 'transparent',
                  border: `1px solid ${activeView === 'queue' ? 'rgba(255,79,0,0.15)' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: activeView === 'queue' ? '#fff' : '#555',
                }}
              >
                <span style={{ fontSize: 12 }}>&#9632;</span> Queue
              </button>
              <button
                onClick={() => setActiveView('reports')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 6, width: '100%',
                  background: activeView === 'reports' ? 'rgba(96,165,250,0.08)' : 'transparent',
                  border: `1px solid ${activeView === 'reports' ? 'rgba(96,165,250,0.15)' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: activeView === 'reports' ? '#fff' : '#555',
                }}
              >
                <span style={{ fontSize: 12 }}>&#9776;</span> Reports
              </button>
              <button
                onClick={() => setActiveView('skills')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 6, width: '100%',
                  background: activeView === 'skills' ? 'rgba(167,139,250,0.08)' : 'transparent',
                  border: `1px solid ${activeView === 'skills' ? 'rgba(167,139,250,0.15)' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: activeView === 'skills' ? '#fff' : '#555',
                }}
              >
                <span style={{ fontSize: 12 }}>&#9881;</span> Skills
              </button>
            </div>
            <div style={{ padding: '4px 12px 4px' }}>
              <div style={{ fontSize: 10, color: ORANGE, fontWeight: 700, marginBottom: 2 }}>{activeAgents} active</div>
              <div style={{ fontSize: 9, color: '#333', letterSpacing: '0.06em' }}>{data?.agents?.length || 0} total agents</div>
            </div>
          </div>
        </div>
        )}

        {/* MAIN CONTENT */}
        {activeView === 'reports' ? (
          <ReportsPanel />
        ) : activeView === 'skills' ? (
          <SkillsPanel />
        ) : activeView === 'agents' && isMobile ? (
          /* Mobile agents list */
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Agents</div>
            <button onClick={() => { setSelectedAgent(null); setActiveView('queue') }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, width: '100%', background: 'rgba(255,79,0,0.06)', border: '1px solid rgba(255,79,0,0.15)', cursor: 'pointer', textAlign: 'left', marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,79,0,0.12)', border: '1.5px solid rgba(255,79,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: ORANGE }}>ALL</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>All Agents</span>
            </button>
            {data?.agents?.map(a => {
              const taskCount = data.tasks.filter(t => t.agent === a.name).length
              return (
                <div key={a.name} onClick={() => { setSelectedAgent(a.name); setMobileAgentPanel(true) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4, background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                  <AgentInitial name={a.name} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e5e5' }}>{a.name}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {taskCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: ORANGE, background: 'rgba(255,79,0,0.12)', borderRadius: 10, padding: '1px 5px' }}>{taskCount}</span>}
                        <StatusPill status={a.status} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{a.role}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : activeView === 'activity' && isMobile ? (
          /* Mobile activity feed */
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Activity</div>
            {data ? <ActivityFeed actions={data.actions} handoff={data.handoff} /> : <div style={{ fontSize: 11, color: '#333' }}>No activity</div>}
          </div>
        ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 24 }}>

          {/* No token error state */}
          {!GITHUB_TOKEN && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>VITE_GITHUB_TOKEN not set</div>
              <div style={{ fontSize: 11, color: '#444', lineHeight: 1.7, maxWidth: 340 }}>
                Add <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: 4, color: '#aaa', fontSize: 11 }}>VITE_GITHUB_TOKEN</code> to your Vercel environment variables, then redeploy.<br />
                After redeploying, reload this page.
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', marginTop: 4 }}
              >
                Reload Page
              </button>
            </div>
          )}

          {GITHUB_TOKEN && <div style={{ marginBottom: isMobile ? 12 : 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{selectedAgent ? `${selectedAgent}'s Queue` : 'Mission Queue'}</div>
            <div style={{ fontSize: 11, color: '#444' }}>{selectedAgent ? `Tasks assigned to ${selectedAgent} + unassigned gaps` : 'All active work across every agent'}</div>
          </div>}

          {/* Priorities */}
          {GITHUB_TOKEN && !selectedAgent && data?.priorities?.length > 0 && (
            isMobile ? (
              /* Mobile: horizontal scrollable priority chips with expanded info */
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Priorities</div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', marginLeft: -12, marginRight: -12, paddingLeft: 12, paddingRight: 12 }}>
                  {data.priorities.map((p, i) => {
                    const daysLeft = deadlineDaysRemaining(p.desc || p.label)
                    const isUrgent = i < 3
                    return (
                      <div key={i} style={{
                        background: '#111', border: `1px solid ${isUrgent ? 'rgba(255,79,0,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 12, padding: '14px 16px', width: 'calc(100vw - 80px)', maxWidth: 280, flexShrink: 0,
                        scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 24, height: 24, borderRadius: 6,
                              background: isUrgent ? 'rgba(255,79,0,0.12)' : 'rgba(255,255,255,0.04)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 800, color: isUrgent ? ORANGE : '#555',
                            }}>{i + 1}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#eee' }}>{p.label}</span>
                          </div>
                          {daysLeft !== null && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 7px',
                              color: daysLeft <= 7 ? '#ff2020' : daysLeft <= 14 ? YELLOW : '#555',
                              background: daysLeft <= 7 ? 'rgba(255,32,32,0.12)' : daysLeft <= 14 ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.04)',
                            }}>{daysLeft}d</span>
                          )}
                        </div>
                        {p.desc && (
                          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.desc}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Current Priorities</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {data.priorities.map((p, i) => (
                    <div key={i} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', flex: '1 1 200px', maxWidth: 300 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: ORANGE, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{p.label}</div>
                        {p.desc && <div style={{ fontSize: 10, color: '#555', marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Kanban */}
          {GITHUB_TOKEN && (
            isMobile ? (
              /* Mobile: filter tabs + stacked single-column with swipeable cards */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {[{ id: 'all', label: 'All', color: ORANGE }, ...COLUMNS].map(f => {
                    const count = f.id === 'all' ? filteredTasks.length : filteredTasks.filter(t => t.column === f.id).length
                    const active = mobileFilter === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setMobileFilter(f.id)}
                        style={{
                          background: active ? `${f.color}20` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${active ? `${f.color}40` : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, minHeight: 44,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? f.color : '#666' }}>{f.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: active ? f.color : '#444', background: active ? `${f.color}18` : 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '1px 6px' }}>{count}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Filtered columns (collapsible on mobile when showing all) */}
                {(mobileFilter === 'all' ? COLUMNS : COLUMNS.filter(c => c.id === mobileFilter)).map((col, colIdx) => {
                  const colTasks = filteredTasks.filter(t => t.column === col.id)
                  if (mobileFilter !== 'all' && colTasks.length === 0) {
                    return (
                      <div key={col.id} style={{ border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10, padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#333' }}>No {col.label.toLowerCase()} tasks</div>
                    )
                  }
                  // Default: first section expanded, rest collapsed
                  const isCollapsed = mobileFilter === 'all' && (collapsedSections[col.id] !== undefined ? collapsedSections[col.id] : colIdx > 0)
                  const toggleSection = () => {
                    setCollapsedSections(prev => ({
                      ...prev,
                      [col.id]: prev[col.id] !== undefined ? !prev[col.id] : colIdx === 0,
                    }))
                  }
                  return (
                    <div key={col.id}>
                      {mobileFilter === 'all' && (
                        <button
                          onClick={toggleSection}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: isCollapsed ? 0 : 10,
                            position: 'sticky', top: 0, background: '#020202', zIndex: 5, paddingTop: 8, paddingBottom: 8,
                            width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 44,
                          }}
                        >
                          <span style={{ fontSize: 10, color: '#444', transition: 'transform 0.15s', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', flexShrink: 0 }}>&#9654;</span>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{col.label}</span>
                          <span style={{ fontSize: 11, color: col.color, background: `${col.color}18`, borderRadius: 5, padding: '2px 8px', fontWeight: 700 }}>{colTasks.length}</span>
                        </button>
                      )}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {colTasks.map(t => <MobileTaskCard key={t.id} task={t} onRefresh={load} />)}
                          {colTasks.length === 0 && mobileFilter === 'all' && (
                            <div style={{ border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10, padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#333' }}>{col.desc}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
                {COLUMNS.map(col => <KanbanColumn key={col.id} col={col} tasks={filteredTasks} onRefresh={load} />)}
              </div>
            )
          )}
        </div>
        )}

        {/* RIGHT SIDEBAR (desktop only) */}
        {!isMobile && (
        <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selectedAgent && data?.agents && (() => {
            const agentData = data.agents.find(a => a.name === selectedAgent)
            return agentData ? <AgentProfile agent={agentData} /> : null
          })()}
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 14 }}>Activity Feed</div>
            {data ? <ActivityFeed actions={data.actions} handoff={data.handoff} /> : <div style={{ fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : 'No activity'}</div>}
          </div>
        </div>
        )}
      </div>

      {/* MOBILE AGENT PROFILE PANEL (slides up) */}
      {isMobile && mobileAgentPanel && selectedAgent && data?.agents && (() => {
        const agentData = data.agents.find(a => a.name === selectedAgent)
        if (!agentData) return null
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setMobileAgentPanel(false) }}>
            <div style={{ background: '#0a0a0a', borderRadius: '16px 16px 0 0', padding: '20px 16px 80px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button onClick={() => { setMobileAgentPanel(false); setActiveView('queue') }} style={{ background: `${AGENT_COLORS[selectedAgent] || ORANGE}12`, border: `1px solid ${AGENT_COLORS[selectedAgent] || ORANGE}30`, borderRadius: 6, color: AGENT_COLORS[selectedAgent] || ORANGE, fontSize: 10, padding: '5px 12px', cursor: 'pointer', fontWeight: 700 }}>View Queue</button>
                <button onClick={() => setMobileAgentPanel(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>x</button>
              </div>
              <AgentProfile agent={agentData} />
            </div>
          </div>
        )
      })()}

      {/* MOBILE BOTTOM TABS */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 56, background: '#080808', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'stretch', justifyContent: 'space-around', zIndex: 101 }}>
          {[
            { id: 'queue', label: 'Queue', icon: '\u25A0' },
            { id: 'agents', label: 'Agents', icon: '\u{1F464}' },
            { id: 'reports', label: 'Reports', icon: '\u2630' },
            { id: 'skills', label: 'Skills', icon: '\u2699' },
            { id: 'activity', label: 'Activity', icon: '\u26A1' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 12px', minWidth: 56, minHeight: 44,
                color: activeView === tab.id ? ORANGE : '#444',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* COMMAND BAR */}
      <CommandBar onRefresh={load} isMobile={isMobile} />

      {/* COUNCIL MODAL */}
      {councilOpen && <CouncilModal onClose={() => setCouncilOpen(false)} />}
    </div>
  )
}

function Stat({ label, value, color, compact }) {
  return (
    <div style={{ display: 'flex', alignItems: compact ? 'center' : 'baseline', gap: compact ? 3 : 5 }}>
      <span style={{ fontSize: compact ? 13 : 15, fontWeight: 800, color: color || '#fff', letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ fontSize: compact ? 10 : 9, color: '#444', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}
