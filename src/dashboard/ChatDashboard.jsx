// DONE(bobby2): Chat message markdown rendering -- agent responses render markdown (bold, lists, code blocks, links) via marked library
// TODO(patrik): Chat message search -- filter past messages by keyword
// TODO(patrik): Typing indicator from relay -- show real "agent is typing" state from relay pipeline
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, X, ArrowLeft, ChevronRight,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, BarChart3, GitCommit, Terminal, Radio,
} from 'lucide-react'
import { marked } from 'marked'

// Configure marked for safe, minimal rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Render markdown to sanitized HTML (strips script tags)
function renderMarkdown(text) {
  if (!text) return ''
  try {
    let html = marked.parse(text)
    // Strip script tags for safety
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    return html
  } catch {
    return text
  }
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

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
  const endpoint = IS_LOCAL ? '/api/local/status' : '/api/dashboard/status'
  const pollInterval = IS_LOCAL ? 5000 : interval

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(endpoint)
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
  }, [endpoint])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, pollInterval)
    return () => clearInterval(timer)
  }, [fetchData, pollInterval])

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
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-mono font-bold uppercase tracking-[0.12em] rounded-sm"
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
        <div className="text-[#78716C] text-[12px] font-mono uppercase tracking-wider mb-1.5">{agent.role}</div>
        <p className="text-[#A8A29E] text-xs leading-relaxed line-clamp-2">{task}</p>
      </div>

      {/* Left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: cfg.color }} />
    </motion.button>
  )
}

// ─── RELAY CHAT PANEL ────────────────────────────────────────────────────────
// Connects to the REAL relay pipeline. Messages go to relay-inbox.jsonl,
// responses come from relay-outbox.jsonl. Same system as Telegram.
function ChatPanel({ agent, statusData, onClose, isMobile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [relayConnected, setRelayConnected] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const relayPollRef = useRef(null)
  const lastOutboxCheckRef = useRef(null)
  const chatTimeoutRef = useRef(null)
  const historyLoadedRef = useRef(false)

  const status = statusData?.status || 'IDLE'
  const task = statusData?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE

  // Format timestamp for display
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return ''
    const now = new Date()
    const diffMs = now - d
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  // Load recent relay history on mount (both inbox + outbox, last 30 messages)
  useEffect(() => {
    if (historyLoadedRef.current) return
    historyLoadedRef.current = true

    const loadHistory = async () => {
      try {
        if (IS_LOCAL) {
          const [inboxRes, outboxRes] = await Promise.all([
            fetch('/api/local/relay-inbox'),
            fetch('/api/local/relay-outbox'),
          ])
          const inbox = inboxRes.ok ? await inboxRes.json() : { messages: [] }
          const outbox = outboxRes.ok ? await outboxRes.json() : { messages: [] }

          // Merge inbox (user messages) and outbox (agent responses) by timestamp
          const all = []

          // Inbox: messages from dashboard or telegram are "user" messages
          for (const msg of inbox.messages) {
            if (!msg.message?.trim()) continue
            all.push({
              role: 'user',
              content: msg.message,
              time: msg.timestamp,
              source: msg.source || 'unknown',
              id: msg.id,
            })
          }

          // Outbox: agent responses
          for (const msg of outbox.messages) {
            if (!msg.message?.trim()) continue
            all.push({
              role: 'assistant',
              content: msg.message,
              time: msg.timestamp,
              source: msg.agent || 'system',
              id: msg.id,
            })
          }

          // Sort by timestamp and take last 30
          all.sort((a, b) => new Date(a.time) - new Date(b.time))
          const recent = all.slice(-30)

          if (recent.length > 0) {
            setMessages(recent)
            // Set last outbox check to the latest outbox timestamp
            const lastOutbox = outbox.messages[outbox.messages.length - 1]
            if (lastOutbox?.timestamp) {
              lastOutboxCheckRef.current = lastOutbox.timestamp
            }
          }

          setRelayConnected(true)
        } else {
          // Production: use the Vercel relay API
          const res = await fetch('/api/relay')
          if (res.ok) {
            const data = await res.json()
            const all = (data.messages || []).map(msg => ({
              role: msg.type === 'response' ? 'assistant' : 'user',
              content: msg.message,
              time: msg.timestamp,
              source: msg.source || msg.agent || 'unknown',
              id: msg.id,
            })).slice(-30)
            setMessages(all)
            setRelayConnected(true)
          }
        }
      } catch (err) {
        console.warn('Failed to load relay history:', err)
        setRelayConnected(false)
      }
    }

    loadHistory()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  // Clean up on unmount
  const bgPollRef = useRef(null)
  useEffect(() => {
    return () => {
      if (relayPollRef.current) clearInterval(relayPollRef.current)
      if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current)
      if (bgPollRef.current) clearInterval(bgPollRef.current)
    }
  }, [])

  // Continuous background poll: picks up ALL new messages from any source
  // (terminal, telegram, dashboard) even when not actively waiting for a response.
  // This ensures the dashboard shows the same conversation as the terminal.
  const bgLastInboxCheck = useRef(null)
  const bgLastOutboxCheck = useRef(null)
  useEffect(() => {
    if (!IS_LOCAL) return

    // Initialize timestamps
    const init = async () => {
      try {
        const [inRes, outRes] = await Promise.all([
          fetch('/api/local/relay-inbox'),
          fetch('/api/local/relay-outbox'),
        ])
        if (inRes.ok) {
          const d = await inRes.json()
          const msgs = d.messages || []
          bgLastInboxCheck.current = msgs.length > 0 ? msgs[msgs.length - 1].timestamp : new Date().toISOString()
        }
        if (outRes.ok) {
          const d = await outRes.json()
          const msgs = (d.messages || []).filter(m => m.source !== 'corner-dashboard' && m.source !== 'corner-websocket')
          bgLastOutboxCheck.current = msgs.length > 0 ? msgs[msgs.length - 1].timestamp : new Date().toISOString()
        }
      } catch {}
    }
    init()

    bgPollRef.current = setInterval(async () => {
      // Don't poll if we're already polling from a send
      if (relayPollRef.current) return

      try {
        // Poll inbox for new messages from terminal/telegram
        if (bgLastInboxCheck.current) {
          const inRes = await fetch('/api/local/relay-inbox')
          if (inRes.ok) {
            const data = await inRes.json()
            const allMsgs = data.messages || []
            const newInbox = allMsgs.filter(m =>
              m.timestamp && new Date(m.timestamp) > new Date(bgLastInboxCheck.current) &&
              m.source !== 'corner-dashboard' && m.source !== 'corner-websocket' &&
              m.message?.trim()
            )
            if (newInbox.length > 0) {
              bgLastInboxCheck.current = allMsgs[allMsgs.length - 1].timestamp
              setMessages(prev => {
                const updated = [...prev]
                for (const msg of newInbox) {
                  if (updated.some(m => m.id === msg.id)) continue
                  let sourceLabel = msg.source || 'unknown'
                  if (sourceLabel === 'telegram') sourceLabel = 'via telegram'
                  else if (sourceLabel === 'terminal' || sourceLabel === 'cli') sourceLabel = 'via terminal'
                  else sourceLabel = `via ${sourceLabel}`
                  updated.push({
                    role: 'user',
                    content: msg.message,
                    time: msg.timestamp,
                    source: sourceLabel,
                    id: msg.id,
                  })
                }
                updated.sort((a, b) => new Date(a.time) - new Date(b.time))
                return updated
              })
            }
          }
        }

        // Poll outbox for new responses
        if (bgLastOutboxCheck.current) {
          const since = encodeURIComponent(bgLastOutboxCheck.current)
          const outRes = await fetch(`/api/local/relay-outbox?since=${since}`)
          if (outRes.ok) {
            const data = await outRes.json()
            const newOutbox = (data.messages || []).filter(m =>
              m.message && m.source !== 'corner-dashboard' && m.source !== 'corner-websocket'
            )
            if (newOutbox.length > 0) {
              const latest = newOutbox[newOutbox.length - 1]
              bgLastOutboxCheck.current = latest.timestamp
              setMessages(prev => {
                const updated = [...prev]
                for (const msg of newOutbox) {
                  if (updated.some(m => m.id === msg.id)) continue
                  updated.push({
                    role: 'assistant',
                    content: msg.message,
                    time: msg.timestamp || new Date().toISOString(),
                    source: msg.agent || 'system',
                    id: msg.id,
                  })
                }
                updated.sort((a, b) => new Date(a.time) - new Date(b.time))
                return updated
              })
            }
          }
        }
      } catch {}
    }, 500) // Local: 500ms for near-instant relay display

    return () => {
      if (bgPollRef.current) clearInterval(bgPollRef.current)
    }
  }, [])

  // Poll relay-outbox for new responses after sending a message
  const startRelayPoll = (sentTimestamp) => {
    if (relayPollRef.current) clearInterval(relayPollRef.current)
    lastOutboxCheckRef.current = sentTimestamp

    relayPollRef.current = setInterval(async () => {
      try {
        const since = encodeURIComponent(lastOutboxCheckRef.current)
        const endpoint = IS_LOCAL
          ? `/api/local/relay-outbox?since=${since}`
          : `/api/relay?since=${since}`
        const res = await fetch(endpoint)
        if (!res.ok) return
        const data = await res.json()
        const msgList = data.messages || []

        if (msgList.length > 0) {
          // Filter to actual responses (not our own sends)
          const responses = msgList.filter(m =>
            m.message && m.source !== 'corner-dashboard' && m.source !== 'corner-websocket'
          )
          if (responses.length > 0) {
            const latest = responses[responses.length - 1]
            setMessages(prev => {
              // Remove streaming placeholders, add real response, re-sort
              const filtered = prev.filter(m => !m.streaming)
              filtered.push({
                role: 'assistant',
                content: latest.message,
                streaming: false,
                time: latest.timestamp || new Date().toISOString(),
                source: latest.agent || 'system',
                id: latest.id,
              })
              filtered.sort((a, b) => new Date(a.time) - new Date(b.time))
              return filtered
            })
            setStreaming(false)
            clearChatTimeout()
            lastOutboxCheckRef.current = latest.timestamp
            if (relayPollRef.current) {
              clearInterval(relayPollRef.current)
              relayPollRef.current = null
            }
          }
        }
      } catch {}
    }, 500) // 500ms for real-time relay feel
  }

  // 60-second timeout: if no response arrives, show offline message
  const startChatTimeout = () => {
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current)
    chatTimeoutRef.current = setTimeout(() => {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: 'Agent is offline or processing. Message saved to relay.',
            streaming: false,
            time: new Date().toISOString(),
          }
        }
        return updated
      })
      setStreaming(false)
      if (relayPollRef.current) {
        clearInterval(relayPollRef.current)
        relayPollRef.current = null
      }
    }, 60000)
  }

  const clearChatTimeout = () => {
    if (chatTimeoutRef.current) {
      clearTimeout(chatTimeoutRef.current)
      chatTimeoutRef.current = null
    }
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    const sentTime = new Date().toISOString()
    setInput('')
    // Single state update: user message sorted + streaming placeholder at end
    // Prevents React batching race that groups messages by sender
    setMessages(prev => {
      const sorted = [...prev, { role: 'user', content: text, time: sentTime, source: 'dashboard' }]
      sorted.sort((a, b) => new Date(a.time) - new Date(b.time))
      sorted.push({ role: 'assistant', content: '', streaming: true, time: sentTime })
      return sorted
    })
    setStreaming(true)
    startChatTimeout()

    try {
      if (IS_LOCAL) {
        // Local: write directly to relay-inbox.jsonl via the Vite dev server API
        const res = await fetch('/api/local/relay-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: agent.slug,
            message: text,
            source: 'corner-dashboard',
          }),
        })
        if (!res.ok) throw new Error('Failed to write to relay')
        startRelayPoll(sentTime)
      } else {
        // Production: use the Vercel relay API
        const res = await fetch('/api/relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        })
        if (!res.ok) throw new Error('Failed to send via relay API')
        startRelayPoll(sentTime)
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: `Failed to send: ${err.message}`,
            streaming: false,
          }
        }
        return updated
      })
      setStreaming(false)
      clearChatTimeout()
    }
  }

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
            <p className="text-[#78716C] text-[12px] font-mono truncate">{task}</p>
          </div>
        </div>
        {/* Relay connection indicator */}
        <div className="flex items-center gap-1.5 shrink-0" title={IS_LOCAL ? 'Local relay (direct file I/O)' : 'Remote relay (GitHub API)'}>
          <Radio className={`w-3 h-3 ${relayConnected ? 'text-[#22C55E]' : 'text-[#78716C]'}`} />
          <span className="text-[12px] font-mono uppercase tracking-wider text-[#78716C]">
            {IS_LOCAL ? 'LOCAL' : 'RELAY'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {agent.img && (
              <img src={agent.img} alt="" className="w-20 h-20 rounded-sm object-cover mb-4 opacity-60" />
            )}
            <p className="text-[#78716C] text-sm mb-1">
              Real relay chat with <span className="text-[#F0ECE6] font-bold">{agent.name}</span>
            </p>
            <p className="text-[#78716C] text-xs font-mono mb-3">{agent.role}</p>
            <p className="text-[#78716C]/60 text-[12px] font-mono">
              Messages go through the same relay as Telegram
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-sm text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#E85D26]/15 text-[#F0ECE6] border border-[#E85D26]/20'
                  : 'bg-[#1A1A17] text-[#F0ECE6] border border-[#292524]'
              }`}
            >
              {/* Source label -- shows for ALL messages so you know where they came from */}
              {msg.role === 'assistant' && (
                <div className="text-[12px] font-mono uppercase tracking-wider mb-1.5" style={{ color: cfg.color }}>
                  {msg.source === 'system' ? 'System' : msg.source || agent.name}
                </div>
              )}
              {msg.role === 'user' && msg.source && (
                <div className="text-[12px] font-mono uppercase tracking-wider mb-1.5 text-[#E85D26]/60">
                  {msg.source === 'dashboard' || msg.source === 'corner-dashboard' ? 'via dashboard'
                    : msg.source === 'telegram' ? 'via telegram'
                    : msg.source === 'terminal' || msg.source === 'cli' ? 'via terminal'
                    : `via ${msg.source}`}
                </div>
              )}
              {msg.role === 'assistant' && msg.content && !msg.streaming ? (
                <div
                  className="chat-md break-words"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
              {msg.streaming && !msg.content && (
                <div className="flex items-center gap-1 py-1">
                  {[0, 1, 2].map(j => (
                    <span
                      key={j}
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[#E85D26]"
                      style={{ animation: `pulse 1.2s ease-in-out ${j * 0.15}s infinite` }}
                    />
                  ))}
                </div>
              )}
              {msg.streaming && msg.content && (
                <span className="inline-block w-1.5 h-4 bg-[#E85D26] ml-0.5 animate-pulse" />
              )}
              {/* Timestamp */}
              {msg.time && !msg.streaming && (
                <div className="text-[12px] font-mono text-[#78716C]/50 mt-1.5 text-right">
                  {formatTime(msg.time)}
                </div>
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
            placeholder={streaming ? 'Waiting for response...' : `Message ${agent.name}...`}
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
          <span className="text-[12px] font-mono font-bold uppercase tracking-[0.15em] text-[#78716C]">
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
        <span className="text-[12px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">Recent Activity</span>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {feed.slice(0, 15).map((entry, i) => (
          <div key={i} className="px-3 py-2 border-b border-[#292524]/50 last:border-0 hover:bg-[#1A1A17]/50 transition-colors">
            <div className="flex items-start gap-2">
              <span className="text-[12px] font-mono text-[#78716C] shrink-0 mt-0.5">{timeAgo(entry.time)}</span>
              <div className="min-w-0">
                {entry.agent && (
                  <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#E85D26] mr-1.5">{entry.agent}</span>
                )}
                <span className="text-[#A8A29E] text-xs break-words">{entry.description}</span>
                {entry.commitHash && (
                  <a
                    href={entry.commitUrl}
                    target="_blank"
                    rel="noopener"
                    className="ml-1.5 text-[12px] font-mono text-[#78716C] hover:text-[#E85D26] transition-colors"
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
        <span className="text-[12px] font-mono font-bold uppercase tracking-[0.2em] text-[#EF4444]">Blockers</span>
      </div>
      <div className="divide-y divide-[#292524]/50">
        {blockers.slice(0, 5).map((b, i) => (
          <div key={i} className="px-3 py-2">
            {b.agent && (
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[#F97316] mr-1.5">{b.agent}</span>
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

  // Check URL for agent slug on mount (supports both /dashboard/agent/X and /dashboard/chat/agent/X)
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/dashboard\/(?:chat\/)?agent\/(.+)/)
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
      window.history.replaceState(null, '', `/dashboard/chat/agent/${activeAgent.slug}`)
    } else {
      window.history.replaceState(null, '', '/dashboard/chat')
    }
  }, [activeAgent])

  // Build agent status lookup (must be above early return to keep hooks order stable)
  const agentStatus = useMemo(() => {
    if (!data?.agents) return {}
    const map = {}
    for (const a of data.agents) {
      map[a.slug] = a
    }
    return map
  }, [data])

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />
  }

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
          <div className="text-[#E85D26] font-mono text-[12px] tracking-[0.3em] uppercase font-bold">Corner</div>
          <h1 className="text-[#F0ECE6] text-lg font-black italic uppercase tracking-tight" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            Relay Chat
          </h1>
          <a
            href="/dashboard"
            className="text-[12px] font-mono text-[#78716C] hover:text-[#E85D26] transition-colors uppercase tracking-wider ml-2"
          >
            Game View
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Radio className={`w-3 h-3 ${IS_LOCAL ? 'text-[#22C55E]' : 'text-[#78716C]'}`} />
            <span className="text-[12px] font-mono text-[#78716C] uppercase tracking-wider">
              {IS_LOCAL ? 'Local Relay' : 'Remote'}
            </span>
          </div>
          <div className="text-[#78716C] text-xs font-mono">{clock}</div>
        </div>
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
              <span className="text-[12px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">
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

      {/* Chat markdown styles */}
      <style>{`
        .chat-md p { margin: 0 0 0.4em 0; }
        .chat-md p:last-child { margin-bottom: 0; }
        .chat-md ul, .chat-md ol { margin: 0.3em 0; padding-left: 1.4em; }
        .chat-md li { margin: 0.15em 0; }
        .chat-md code {
          background: rgba(255,255,255,0.08);
          padding: 0.15em 0.4em;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.88em;
        }
        .chat-md pre {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 0.6em 0.8em;
          margin: 0.4em 0;
          overflow-x: auto;
          font-size: 0.85em;
        }
        .chat-md pre code {
          background: none;
          padding: 0;
          font-size: 1em;
        }
        .chat-md strong { font-weight: 700; }
        .chat-md a { color: #3B9EFF; text-decoration: underline; }
        .chat-md a:hover { color: #5BB8FF; }
        .chat-md h1, .chat-md h2, .chat-md h3 {
          font-weight: 800;
          margin: 0.5em 0 0.25em;
          line-height: 1.3;
        }
        .chat-md h1 { font-size: 1.15em; }
        .chat-md h2 { font-size: 1.08em; }
        .chat-md h3 { font-size: 1em; }
        .chat-md blockquote {
          border-left: 3px solid rgba(255,255,255,0.15);
          margin: 0.3em 0;
          padding: 0.2em 0.8em;
          color: rgba(240,236,230,0.7);
        }
        .chat-md hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 0.5em 0; }
      `}</style>
    </div>
  )
}
