import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, X, ArrowLeft, ChevronRight,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, BarChart3, GitCommit, Terminal,
} from 'lucide-react'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'

const AGENTS = [
  { slug: 'bobby',   name: 'Bobby',   role: 'Web Dev',           img: '/corner/bobby-room.png' },
  { slug: 'steffen', name: 'Steffen', role: 'Creative Director', img: '/corner/steffen-room.png' },
  { slug: 'cleo',    name: 'Cleo',    role: 'Content Creator',   img: '/corner/cleo-room.png' },
  { slug: 'elon',    name: 'Elon',    role: 'Systems Engineer',  img: '/corner/elon-room.png' },
  { slug: 'steve',   name: 'Steve',   role: 'AI Advisory Lead',  img: '/corner/steve-room.png' },
  { slug: 'alex',    name: 'Alex',    role: 'Strategist',        img: '/corner/alex-room.png' },
  { slug: 'mom',     name: 'Mom',     role: 'Orchestrator',      img: '/corner/mom-room.png' },
  { slug: 'jacob',   name: 'Jacob',   role: 'Outreach',          img: '/corner/jacob-room.png' },
  { slug: 'paige',   name: 'Paige',   role: 'Client Success',    img: '/corner/paige-room.png' },
  { slug: 'tony',    name: 'Tony',    role: 'Social Media',      img: '/corner/tony-room.png' },
  { slug: 'elmo',    name: 'Elmo',    role: 'QA Gate',           img: '/corner/elmo-room.png' },
  { slug: 'colton',  name: 'Colton',  role: 'Backup Builder',    img: null },
  { slug: 'pixel',   name: 'Pixel',   role: 'Extension',         img: null },
]

const STATUS_CONFIG = {
  WORKING:  { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  label: 'Working',  icon: Zap },
  IDLE:     { color: '#78716C', bg: 'rgba(120,113,108,0.12)', label: 'Idle',     icon: Clock },
  BLOCKED:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Blocked',  icon: AlertTriangle },
  DONE:     { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'Done',     icon: CheckCircle2 },
  WAITING:  { color: '#EAB308', bg: 'rgba(234,179,8,0.12)',  label: 'Waiting',  icon: Eye },
  PAUSED:   { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'Paused',   icon: Pause },
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

function useDashboardData(interval = 30000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastRaw = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/status')
      if (!res.ok) throw new Error(`${res.status}`)
      const text = await res.text()
      if (text !== lastRaw.current) {
        lastRaw.current = text
        setData(JSON.parse(text))
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [fetchData, interval])

  return { data, error, loading }
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function azTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ─── PASSWORD GATE ───────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [shake, setShake] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (pw === DASHBOARD_PASSWORD) {
      sessionStorage.setItem('dash-auth', '1')
      onAuth()
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center px-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-sm ${shake ? 'animate-shake' : ''}`}
      >
        <div className="text-center mb-8">
          <div className="text-[#E85D26] font-mono text-xs tracking-[0.3em] uppercase mb-2">CORNER</div>
          <h1 className="text-[#F0ECE6] text-2xl font-bold tracking-tight">Mission Control</h1>
        </div>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Password"
          className="w-full bg-[#141412] border border-[#292524] text-[#F0ECE6] px-4 py-3 text-base rounded-sm focus:outline-none focus:border-[#E85D26]/50 placeholder:text-[#78716C] font-mono"
          autoFocus
        />
        <button type="submit" className="w-full mt-3 bg-[#E85D26] text-white font-bold uppercase tracking-wider text-sm py-3 rounded-sm hover:bg-[#D14E1C] transition-colors">
          Enter
        </button>
      </motion.form>
      <style>{`.animate-shake { animation: shake 0.5s ease-in-out; }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }`}</style>
    </div>
  )
}

// ─── STATUS PILL ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.12em] rounded-sm"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

// ─── AGENT CARD (isometric room) ─────────────────────────────────────────────
function AgentCard({ agent, statusData, onClick, isActive }) {
  const status = statusData?.status || 'IDLE'
  const task = statusData?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full text-left rounded-sm overflow-hidden transition-all duration-300 group ${
        isActive
          ? 'ring-2 ring-[#E85D26]/60 bg-[#1A1A17]'
          : 'bg-[#141412] hover:bg-[#1A1A17]'
      }`}
      style={{ border: `1px solid ${isActive ? 'rgba(232,93,38,0.4)' : '#292524'}` }}
    >
      {/* Room image */}
      {agent.img ? (
        <div className="relative w-full aspect-[16/10] overflow-hidden">
          <img
            src={agent.img}
            alt={agent.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141412] via-transparent to-transparent" />
          {/* Status indicator */}
          <div className="absolute top-2 right-2">
            <StatusPill status={status} />
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[16/10] bg-[#1A1A17] flex items-center justify-center">
          <Terminal className="w-8 h-8 text-[#78716C]" />
          <div className="absolute top-2 right-2">
            <StatusPill status={status} />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-3 pt-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[#F0ECE6] font-bold text-base tracking-tight">{agent.name}</h3>
          <MessageSquare className="w-3.5 h-3.5 text-[#78716C] group-hover:text-[#E85D26] transition-colors" />
        </div>
        <div className="text-[#78716C] text-[11px] font-mono uppercase tracking-wider mb-1.5">{agent.role}</div>
        <p className="text-[#A8A29E] text-xs leading-relaxed line-clamp-2">{task}</p>
      </div>

      {/* Left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: cfg.color }} />
    </motion.button>
  )
}

// ─── CHAT PANEL ──────────────────────────────────────────────────────────────
function ChatPanel({ agent, statusData, onClose, isMobile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const status = statusData?.status || 'IDLE'
  const task = statusData?.currentTask || 'Standing by'

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setStreaming(true)

    // Add empty assistant message that we'll stream into
    const assistantIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: agent.slug,
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      // Check if it's SSE (streaming) or JSON (placeholder/error)
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        // SSE streaming
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + data.text }
                  }
                  return updated
                })
              } else if (data.type === 'done') {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last) updated[updated.length - 1] = { ...last, streaming: false }
                  return updated
                })
              } else if (data.type === 'error') {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last) updated[updated.length - 1] = { ...last, content: `Error: ${data.error}`, streaming: false }
                  return updated
                })
              }
            } catch {}
          }
        }
      } else {
        // JSON response (placeholder or error)
        const data = await res.json()
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) {
            updated[updated.length - 1] = {
              ...last,
              content: data.reply || data.error || 'No response',
              streaming: false,
            }
          }
          return updated
        })
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last) {
          updated[updated.length - 1] = {
            ...last,
            content: `Connection error: ${err.message}`,
            streaming: false,
          }
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE

  return (
    <motion.div
      initial={isMobile ? { x: '100%' } : { opacity: 0, x: 20 }}
      animate={isMobile ? { x: 0 } : { opacity: 1, x: 0 }}
      exit={isMobile ? { x: '100%' } : { opacity: 0, x: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`flex flex-col bg-[#0A0A08] ${
        isMobile
          ? 'fixed inset-0 z-50'
          : 'h-full border-l border-[#292524]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#292524] bg-[#141412] shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#292524] rounded-sm transition-colors"
        >
          {isMobile ? <ArrowLeft className="w-5 h-5 text-[#A8A29E]" /> : <X className="w-4 h-4 text-[#A8A29E]" />}
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {agent.img && (
            <img src={agent.img} alt="" className="w-8 h-8 rounded-sm object-cover" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#F0ECE6] font-bold text-sm">{agent.name}</span>
              <StatusPill status={status} />
            </div>
            <p className="text-[#78716C] text-[11px] font-mono truncate">{task}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {agent.img && (
              <img src={agent.img} alt="" className="w-20 h-20 rounded-sm object-cover mb-4 opacity-60" />
            )}
            <p className="text-[#78716C] text-sm mb-1">Start a conversation with <span className="text-[#F0ECE6] font-bold">{agent.name}</span></p>
            <p className="text-[#78716C] text-xs font-mono">{agent.role}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-sm text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#E85D26]/15 text-[#F0ECE6] border border-[#E85D26]/20'
                  : 'bg-[#1A1A17] text-[#F0ECE6] border border-[#292524]'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: cfg.color }}>
                  {agent.name}
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.streaming && (
                <span className="inline-block w-1.5 h-4 bg-[#E85D26] ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="shrink-0 px-4 py-3 border-t border-[#292524] bg-[#141412]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            disabled={streaming}
            className="flex-1 bg-[#1A1A17] border border-[#292524] text-[#F0ECE6] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:border-[#E85D26]/50 placeholder:text-[#78716C] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="p-2.5 bg-[#E85D26] text-white rounded-sm hover:bg-[#D14E1C] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── THROUGHPUT BAR ──────────────────────────────────────────────────────────
function ThroughputBar({ throughput }) {
  if (!throughput) return null

  const metrics = [
    { label: 'Working', value: throughput.working || 0, color: '#22C55E' },
    { label: 'Done', value: throughput.doneToday || 0, color: '#3B82F6' },
    { label: 'Blocked', value: throughput.blocked || 0, color: '#EF4444' },
    { label: 'Idle', value: throughput.idle || 0, color: '#78716C' },
    { label: 'Commits', value: throughput.commitsToday || 0, color: '#F0ECE6' },
  ]

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#141412] border-b border-[#292524] gap-2 overflow-x-auto">
      {metrics.map(m => (
        <div key={m.label} className="flex items-center gap-1.5 shrink-0">
          <span className="text-lg font-black italic tracking-tight" style={{ color: m.color, fontFamily: "'Inter Tight', sans-serif" }}>
            {m.value}
          </span>
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-[#78716C]">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── PIPELINE FEED ───────────────────────────────────────────────────────────
function PipelineFeed({ feed }) {
  if (!feed || feed.length === 0) return null

  return (
    <div className="bg-[#141412] border border-[#292524] rounded-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-[#292524] flex items-center gap-2">
        <GitCommit className="w-3.5 h-3.5 text-[#78716C]" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">Recent Activity</span>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {feed.slice(0, 15).map((entry, i) => (
          <div key={i} className="px-3 py-2 border-b border-[#292524]/50 last:border-0 hover:bg-[#1A1A17]/50 transition-colors">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-[#78716C] shrink-0 mt-0.5">{timeAgo(entry.time)}</span>
              <div className="min-w-0">
                {entry.agent && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E85D26] mr-1.5">{entry.agent}</span>
                )}
                <span className="text-[#A8A29E] text-xs break-words">{entry.description}</span>
                {entry.commitHash && (
                  <a
                    href={entry.commitUrl}
                    target="_blank"
                    rel="noopener"
                    className="ml-1.5 text-[10px] font-mono text-[#78716C] hover:text-[#E85D26] transition-colors"
                  >
                    {entry.commitHash}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── BLOCKERS SECTION ────────────────────────────────────────────────────────
function BlockersSection({ blockers }) {
  if (!blockers || blockers.length === 0) return null

  return (
    <div className="bg-[#141412] border border-[#292524] rounded-sm overflow-hidden border-l-[3px] border-l-[#EF4444]">
      <div className="px-3 py-2 border-b border-[#292524] flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#EF4444]">Blockers</span>
      </div>
      <div className="divide-y divide-[#292524]/50">
        {blockers.slice(0, 5).map((b, i) => (
          <div key={i} className="px-3 py-2">
            {b.agent && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F97316] mr-1.5">{b.agent}</span>
            )}
            <span className="text-[#A8A29E] text-xs">{b.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function ChatDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('dash-auth') === '1')
  const [activeAgent, setActiveAgent] = useState(null)
  const [clock, setClock] = useState(azTime())
  const { data, error, loading } = useDashboardData(30000)
  const isMobile = useIsMobile()

  // Check URL for agent slug on mount
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/dashboard\/agent\/(.+)/)
    if (match) {
      const slug = match[1]
      const found = AGENTS.find(a => a.slug === slug)
      if (found) setActiveAgent(found)
    }
  }, [])

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setClock(azTime()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Update URL when agent changes
  useEffect(() => {
    if (activeAgent) {
      window.history.replaceState(null, '', `/dashboard/agent/${activeAgent.slug}`)
    } else {
      window.history.replaceState(null, '', '/dashboard')
    }
  }, [activeAgent])

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />
  }

  // Build agent status lookup
  const agentStatus = useMemo(() => {
    if (!data?.agents) return {}
    const map = {}
    for (const a of data.agents) {
      map[a.slug] = a
    }
    return map
  }, [data])

  const openChat = (agent) => {
    setActiveAgent(agent)
  }

  const closeChat = () => {
    setActiveAgent(null)
  }

  return (
    <div className="min-h-screen bg-[#0A0A08] text-[#F0ECE6] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#292524] bg-[#0A0A08] shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[#E85D26] font-mono text-[10px] tracking-[0.3em] uppercase font-bold">Corner</div>
          <h1 className="text-[#F0ECE6] text-lg font-black italic uppercase tracking-tight" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            Mission Control
          </h1>
        </div>
        <div className="text-[#78716C] text-xs font-mono">{clock}</div>
      </header>

      {/* Throughput Bar */}
      <ThroughputBar throughput={data?.throughput} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent roster (left side or full width on mobile when no chat open) */}
        <div className={`overflow-y-auto ${
          activeAgent && !isMobile ? 'w-1/2 xl:w-[55%]' : 'w-full'
        } ${activeAgent && isMobile ? 'hidden' : ''}`}>
          <div className="p-4">
            {/* Section label */}
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-3.5 h-3.5 text-[#E85D26]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">
                Agent Roster - Click to chat
              </span>
            </div>

            {/* Agent grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
              {AGENTS.map((agent, i) => (
                <motion.div
                  key={agent.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <AgentCard
                    agent={agent}
                    statusData={agentStatus[agent.slug]}
                    onClick={() => openChat(agent)}
                    isActive={activeAgent?.slug === agent.slug}
                  />
                </motion.div>
              ))}
            </div>

            {/* Metrics sidebar content (shows below grid on mobile/narrow, or when no chat is open) */}
            <div className={`space-y-4 ${activeAgent && !isMobile ? 'hidden' : ''}`}>
              <PipelineFeed feed={data?.pipelineFeed} />
              <BlockersSection blockers={data?.blockers} />
            </div>
          </div>
        </div>

        {/* Chat panel (right side or fullscreen on mobile) */}
        <AnimatePresence>
          {activeAgent && (
            <div className={`${isMobile ? '' : 'w-1/2 xl:w-[45%]'}`}>
              <ChatPanel
                key={activeAgent.slug}
                agent={activeAgent}
                statusData={agentStatus[activeAgent.slug]}
                onClose={closeChat}
                isMobile={isMobile}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Error indicator */}
      {error && (
        <div className="fixed bottom-4 left-4 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono px-3 py-2 rounded-sm">
          Status update failed. Showing cached data.
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="fixed inset-0 bg-[#0A0A08] flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-[#E85D26] animate-spin" />
            <span className="text-[#78716C] text-xs font-mono">Loading agents...</span>
          </div>
        </div>
      )}
    </div>
  )
}
