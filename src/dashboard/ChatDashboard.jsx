// DONE(bobby2): Chat message markdown rendering -- agent responses render markdown (bold, lists, code blocks, links) via marked library
// DONE(bobby2): Chat message search -- filter past messages by keyword
// DONE(bobby2): Typing indicator -- shows "[Agent] is thinking..." with animated dots while waiting for relay response
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, X, ArrowLeft, ChevronRight, ChevronDown,
  Activity, AlertTriangle, CheckCircle2, Clock, Loader2,
  Pause, Eye, Zap, BarChart3, GitCommit, Terminal, Radio,
  Search as SearchIcon, ChevronUp, Folder,
} from 'lucide-react'
import { marked } from 'marked'
import { supabase, mapSupabaseMsg } from './lib/supabase'

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

// ─── MESSAGE SANITIZER ──────────────────────────────────────────────────────
// Strips watchdog preamble, system XML, and other noise from relay messages.
// Returns cleaned text, or null if the entire message is system noise.
function sanitizeRelayMessage(text) {
  if (!text || typeof text !== 'string') return null

  let cleaned = text

  // 1. Filter system XML blocks
  cleaned = cleaned.replace(/<task-notification>[\s\S]*?<\/task-notification>/g, '')
  cleaned = cleaned.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
  cleaned = cleaned.replace(/<available-deferred-tools>[\s\S]*?<\/available-deferred-tools>/g, '')
  // DONE(bobby2): XML REGEX FIXED -- Only strip SPECIFIC system tags, not all lowercase XML. Users can type <b>hello</b> etc. safely now.
  // No generic catch-all. Only these three system tags get stripped (already handled above individually).

  // 2. Strip watchdog preamble patterns (all known variations)
  cleaned = cleaned.replace(/^Patrik sent this via Telegram:\s*/i, '')
  cleaned = cleaned.replace(/^Patrik sent these? messages? via Telegram:\s*/i, '')
  cleaned = cleaned.replace(/You have full project context from CLAUDE\.md\.\s*/g, '')
  cleaned = cleaned.replace(/Respond naturally with the same detail you would on the desktop\.\s*/g, '')
  cleaned = cleaned.replace(/Do not artificially shorten or condense your response\.\s*/g, '')
  cleaned = cleaned.replace(/If (?:the |any )?request(?:s)? needs? calendar,?\s*email,?\s*file changes,?\s*or tool access,?\s*do what you can and note any limitations\.\s*/gi, '')
  cleaned = cleaned.replace(/Do not use em dashes\.\s*Use bullet points over paragraphs\.\s*/g, '')
  cleaned = cleaned.replace(/Address all messages in one response\.\s*/g, '')
  cleaned = cleaned.replace(/IMPORTANT:?\s*these instructions OVERRIDE[\s\S]*?exactly as written\.?\s*/gi, '')
  cleaned = cleaned.replace(/As you answer the user's questions[\s\S]*?following context:\s*/gi, '')
  cleaned = cleaned.replace(/Contents of \/Users\/[\s\S]*?(?=\n\n|\z)/g, '')
  cleaned = cleaned.replace(/# claudeMd[\s\S]*?(?=\n#|\z)/g, '')

  // 3. Strip "Full transcript available at: /private/tmp/..." lines
  cleaned = cleaned.replace(/Full transcript available at:\s*\/\S+/g, '')

  // 4. Strip timestamped message list prefixes from watchdog batches
  cleaned = cleaned.replace(/^-\s*\[\d{4}-\d{2}-\d{2}T[^\]]*\]\s*/gm, '')

  // 5. Strip "=== TELEGRAM MESSAGES FROM PATRIK ===" headers and similar
  cleaned = cleaned.replace(/^=+\s*TELEGRAM MESSAGES?\s*(?:FROM PATRIK)?\s*=+\s*/gim, '')
  cleaned = cleaned.replace(/^=+\s*PENDING MESSAGES?\s*=+\s*/gim, '')

  // 6. Strip Claude Code system prefixes that sometimes leak
  cleaned = cleaned.replace(/^(?:Human|Assistant|System):\s*/gm, '')

  // Trim and check if anything meaningful remains
  cleaned = cleaned.trim()
  if (!cleaned || cleaned.length < 2) return null

  return cleaned
}

// ─── DEDUPLICATION ──────────────────────────────────────────────────────────
// When a message is sent from dashboard, it goes to relay-inbox as source "corner-dashboard".
// The relay hook then echoes it back to terminal as source "terminal" with watchdog preamble.
// This creates duplicate messages. We detect these by comparing cleaned content.
function deduplicateMessages(messages) {
  const seen = new Map() // cleaned content -> first message
  const result = []

  for (const msg of messages) {
    if (!msg.content) { result.push(msg); continue }

    // Normalize content for comparison (lowercase, strip whitespace/punctuation)
    const normalized = msg.content.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalized.length < 3) { result.push(msg); continue }

    const existing = seen.get(normalized)
    if (existing) {
      // Keep the earlier message (original), skip the echo
      // If timestamps are within 2 seconds, it's a duplicate (prefer corner-dashboard source)
      const existingTime = new Date(existing.time).getTime()
      const thisTime = new Date(msg.time).getTime()
      if (Math.abs(existingTime - thisTime) < 2000) {
        continue // skip duplicate
      }
    }

    seen.set(normalized, msg)
    result.push(msg)
  }

  return result
}

// Extract agent name from [AGENT] prefix in relay messages (e.g., "[ELON] ..." -> "elon")
function extractAgentSource(msg) {
  if (msg.agent) return msg.agent
  if (!msg.message) return null
  const match = msg.message.match(/^\[([A-Z]+)\]/)
  if (!match) return null
  const name = match[1].toLowerCase()
  const knownSlugs = ['bobby','steffen','cleo','elon','steve','alex','mom','jacob','paige','tony','elmo','colton','pixel']
  return knownSlugs.includes(name) ? name : null
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
// Conversation API: local Vite middleware on localhost, Vercel serverless on production
const CONV_API_BASE = IS_LOCAL ? '/api/local/conversations' : '/api/conversations'
// Relay send: local Vite middleware on localhost, Vercel serverless on production
const RELAY_SEND_URL = IS_LOCAL ? '/api/local/relay-send' : '/api/relay'

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
  const [showNewMsgIndicator, setShowNewMsgIndicator] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [streamStartTime, setStreamStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [thinkingPhrase, setThinkingPhrase] = useState(0)
  const [motivationalPhrase, setMotivationalPhrase] = useState(0)
  const [isSending, setIsSending] = useState(false)

  // Fun rotating thinking phrases
  const thinkingPhrases = useMemo(() => [
    `${agent.name}ing...`,
    'Crushing it...',
    'Flexing...',
    'Making moves...',
    'Cooking...',
    'Building...',
    'In the zone...',
    'Running it...',
  ], [agent.name])

  // Motivational phrases for the work wait
  const motivationalPhrases = useMemo(() => [
    `Give ${agent.name} a minute. He's actually doing shit.`,
    'He\'s working hard. Real work takes time.',
    `${agent.name}'s cooking. This might take a bit.`,
    'The system works, just not instantly.',
    'He\'s doing real work behind the scenes.',
    'No rush. Quality over speed.',
    `${agent.name} doesn't cut corners.`,
    'Real work happening right now.',
  ], [agent.name])

  // Elapsed timer: counts up every second while streaming
  useEffect(() => {
    if (!streaming || !streamStartTime) {
      setElapsedSeconds(0)
      return
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - streamStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [streaming, streamStartTime])

  // Rotate thinking phrases every 3 seconds while streaming
  useEffect(() => {
    if (!streaming) {
      setThinkingPhrase(0)
      return
    }
    const interval = setInterval(() => {
      setThinkingPhrase(prev => (prev + 1) % thinkingPhrases.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [streaming, thinkingPhrases.length])

  // Rotate motivational phrases every 5 seconds while streaming
  useEffect(() => {
    if (!streaming) {
      setMotivationalPhrase(0)
      return
    }
    const interval = setInterval(() => {
      setMotivationalPhrase(prev => (prev + 1) % motivationalPhrases.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [streaming, motivationalPhrases.length])
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const searchInputRef = useRef(null)
  const relayPollRef = useRef(null)
  const lastOutboxCheckRef = useRef(null)
  const lastConvTimestampRef = useRef(null)
  const chatTimeoutRef = useRef(null)
  const historyLoadedRef = useRef(false)
  const isNearBottomRef = useRef(true)
  const isUserTypingRef = useRef(false)
  const userTypingTimeoutRef = useRef(null)
  const prevMessageCountRef = useRef(0)
  const userJustSentRef = useRef(false)

  const status = statusData?.status || 'IDLE'
  const task = statusData?.currentTask || 'Standing by'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IDLE

  // Format timestamp for display (show actual time like iMessage/Telegram)
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Phoenix' })
  }

  // Format source label: tiny, muted, secondary to the actual message content
  const formatSource = (msg) => {
    if (!msg.source) return null
    const s = (msg.source || '').toLowerCase().replace(/^via\s+/, '')
    if (s === 'dashboard' || s === 'corner-dashboard' || s === 'corner-websocket') return { text: 'dashboard' }
    if (s === 'telegram') return { text: 'telegram' }
    if (s === 'terminal' || s === 'cli') return { text: 'terminal' }
    if (s === 'system') return { text: 'system' }
    const knownSlugs = ['bobby','steffen','cleo','elon','steve','alex','mom','jacob','paige','tony','elmo','colton','pixel']
    if (knownSlugs.includes(s)) return { text: s }
    if (s && s.length < 20) return { text: s }
    return null
  }

  // Get agent initial for avatar
  const agentInitial = agent.name.charAt(0).toUpperCase()

  // Load conversation history on mount from unified JSONL endpoint (primary)
  // Falls back to relay-inbox + relay-outbox if conversations endpoint fails
  useEffect(() => {
    if (historyLoadedRef.current) return
    historyLoadedRef.current = true

    const loadHistory = async () => {
      try {
        if (IS_LOCAL) {
          // Primary: unified conversation JSONL (has ALL messages from all sources)
          let loaded = false
          try {
            const convRes = await fetch(`/api/local/conversations?agent=${agent.slug}&limit=100`)
            if (convRes.ok) {
              const convData = await convRes.json()
              const convMsgs = (convData.messages || [])
              if (convMsgs.length > 0) {
                const all = []
                for (const msg of convMsgs) {
                  const cleaned = sanitizeRelayMessage(msg.text || msg.message)
                  if (!cleaned) continue
                  all.push({
                    role: msg.role || (msg.source === 'corner-dashboard' || msg.source === 'telegram' ? 'user' : 'assistant'),
                    content: cleaned,
                    time: msg.timestamp,
                    source: msg.source || 'unknown',
                    id: msg.id,
                  })
                }
                all.sort((a, b) => new Date(a.time) - new Date(b.time))
                const deduped = deduplicateMessages(all)
                const recent = deduped.slice(-100)
                if (recent.length > 0) {
                  setMessages(recent)
                  // Track last conversation timestamp for incremental polling
                  lastConvTimestampRef.current = recent[recent.length - 1].time
                  loaded = true
                }
              }
            }
          } catch (convErr) {
            console.warn('Conversations endpoint failed, falling back to relay:', convErr)
          }

          // Fallback: relay-inbox + relay-outbox (if conversations endpoint had no data)
          if (!loaded) {
            const [inboxRes, outboxRes] = await Promise.all([
              fetch('/api/local/relay-inbox'),
              fetch('/api/local/relay-outbox'),
            ])
            const inbox = inboxRes.ok ? await inboxRes.json() : { messages: [] }
            const outbox = outboxRes.ok ? await outboxRes.json() : { messages: [] }

            const all = []
            for (const msg of inbox.messages) {
              if (msg.status === 'watchdog-responded') continue
              const cleaned = sanitizeRelayMessage(msg.message)
              if (!cleaned) continue
              all.push({ role: 'user', content: cleaned, time: msg.timestamp, source: msg.source || 'unknown', id: msg.id })
            }
            for (const msg of outbox.messages) {
              if (!msg.message?.trim()) continue
              const isDashboardOrigin = msg.source === 'corner-dashboard' || msg.source === 'corner-websocket'
              if (isDashboardOrigin) {
                if (!all.some(m => m.id === msg.id)) {
                  const cleaned = sanitizeRelayMessage(msg.message)
                  if (!cleaned) continue
                  all.push({ role: 'user', content: cleaned, time: msg.timestamp, source: 'dashboard', id: msg.id })
                }
                continue
              }
              const cleaned = sanitizeRelayMessage(msg.message)
              if (!cleaned) continue
              all.push({ role: 'assistant', content: cleaned, time: msg.timestamp, source: extractAgentSource(msg) || 'system', id: msg.id })
            }
            all.sort((a, b) => new Date(a.time) - new Date(b.time))
            const deduped = deduplicateMessages(all)
            const recent = deduped.slice(-50)
            if (recent.length > 0) {
              setMessages(recent)
              const lastOutbox = outbox.messages[outbox.messages.length - 1]
              if (lastOutbox?.timestamp) lastOutboxCheckRef.current = lastOutbox.timestamp
            }
          }

          setRelayConnected(true)
        } else if (supabase) {
          // Production + Supabase available: load history from Supabase messages table
          try {
            const { data: rows, error: sbErr } = await supabase
              .from('messages')
              .select('*')
              .eq('agent', agent.slug)
              .order('timestamp', { ascending: true })
              .limit(100)

            if (sbErr) throw sbErr

            if (rows && rows.length > 0) {
              const all = []
              for (const row of rows) {
                const mapped = mapSupabaseMsg(row)
                const cleaned = sanitizeRelayMessage(mapped.content)
                if (!cleaned) continue
                all.push({ ...mapped, content: cleaned })
              }
              const deduped = deduplicateMessages(all)
              const recent = deduped.slice(-100)
              if (recent.length > 0) {
                setMessages(recent)
                lastConvTimestampRef.current = recent[recent.length - 1].time
              }
            }
            setRelayConnected(true)
          } catch (sbErr) {
            console.warn('Supabase history load failed, falling back to conversations API:', sbErr)
            // Fallback to GitHub-backed conversations API
            try {
              const convRes = await fetch(`${CONV_API_BASE}?target=${agent.slug}&type=agent&limit=50`)
              if (convRes.ok) {
                const convData = await convRes.json()
                const convMsgs = convData.messages || []
                const all = convMsgs.map(msg => {
                  const cleaned = sanitizeRelayMessage(msg.text || msg.message)
                  if (!cleaned) return null
                  return {
                    role: msg.role || (msg.sender === 'patrik' ? 'user' : 'assistant'),
                    content: cleaned,
                    time: msg.timestamp,
                    source: msg.source || 'unknown',
                    id: msg.id,
                  }
                }).filter(Boolean)
                all.sort((a, b) => new Date(a.time) - new Date(b.time))
                const deduped = deduplicateMessages(all)
                const recent = deduped.slice(-50)
                if (recent.length > 0) {
                  setMessages(recent)
                  lastConvTimestampRef.current = recent[recent.length - 1].time
                }
                setRelayConnected(true)
              }
            } catch (prodErr) {
              console.warn('Production conversations endpoint also failed:', prodErr)
            }
          }
        } else {
          // Production without Supabase: use Vercel /api/conversations (GitHub-backed JSONL)
          try {
            const convRes = await fetch(`${CONV_API_BASE}?target=${agent.slug}&type=agent&limit=50`)
            if (convRes.ok) {
              const convData = await convRes.json()
              const convMsgs = convData.messages || []
              const all = convMsgs.map(msg => {
                const cleaned = sanitizeRelayMessage(msg.text || msg.message)
                if (!cleaned) return null
                return {
                  role: msg.role || (msg.sender === 'patrik' ? 'user' : 'assistant'),
                  content: cleaned,
                  time: msg.timestamp,
                  source: msg.source || 'unknown',
                  id: msg.id,
                }
              }).filter(Boolean)
              all.sort((a, b) => new Date(a.time) - new Date(b.time))
              const deduped = deduplicateMessages(all)
              const recent = deduped.slice(-50)
              if (recent.length > 0) {
                setMessages(recent)
                lastConvTimestampRef.current = recent[recent.length - 1].time
              }
              setRelayConnected(true)
            }
          } catch (prodErr) {
            console.warn('Production conversations endpoint failed:', prodErr)
          }
        }
      } catch (err) {
        console.warn('Failed to load relay history:', err)
        setRelayConnected(false)
      }
    }

    loadHistory()
  }, [])

  // ── SUPABASE REALTIME + REST POLL FALLBACK (production only) ──
  // Realtime gives instant responses when WebSocket works.
  // REST poll every 3s catches responses when WebSocket is down.
  useEffect(() => {
    if (!supabase) return // Local dev: skip, polling handles it

    let lastSeenTs = new Date().toISOString()

    const addResponse = (row) => {
      const mapped = mapSupabaseMsg(row)
      const cleaned = sanitizeRelayMessage(mapped.content)
      if (!cleaned) return
      lastSeenTs = row.timestamp || new Date().toISOString()

      setMessages(prev => {
        if (prev.some(m => m.id === mapped.id)) return prev
        const filtered = prev.filter(m => !m.streaming)
        filtered.push({ ...mapped, content: cleaned })
        filtered.sort((a, b) => new Date(a.time) - new Date(b.time))
        return deduplicateMessages(filtered.slice(-100))
      })

      setStreaming(false)
      setStreamStartTime(null)
      clearChatTimeout()
      if (relayPollRef.current) {
        clearInterval(relayPollRef.current)
        relayPollRef.current = null
      }
    }

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${agent.slug}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `role=eq.assistant`,
      }, (payload) => {
        const row = payload.new
        if (row.agent !== agent.slug) return
        addResponse(row)
      })
      .subscribe()

    // REST poll fallback
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('agent', agent.slug)
          .eq('role', 'assistant')
          .gt('timestamp', lastSeenTs)
          .order('timestamp', { ascending: true })
          .limit(10)
        if (data?.length) {
          for (const row of data) addResponse(row)
        }
      } catch {}
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [agent.slug])

  // Track whether new messages arrived (for "new messages" indicator button only)
  const hasNewMessagesRef = useRef(false)

  // NO auto-scroll. Chat stays exactly where user scrolled.
  // Only the manual "scroll to bottom" button triggers any scroll.
  // Track new message arrivals to show the indicator button.
  useEffect(() => {
    const newCount = messages.length
    const prevCount = prevMessageCountRef.current
    const isNewMessage = newCount > prevCount
    prevMessageCountRef.current = newCount

    if (isNewMessage && !isNearBottomRef.current) {
      hasNewMessagesRef.current = true
      setShowNewMsgIndicator(true)
    }
  }, [messages])

  // Track scroll position to determine if user is near bottom
  // Show "jump to latest" whenever user scrolls away from bottom
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const threshold = 120 // Generous threshold so small scroll jitters don't break it
    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < threshold
    isNearBottomRef.current = nearBottom
    if (nearBottom) {
      setShowNewMsgIndicator(false)
      hasNewMessagesRef.current = false
    }
    // Don't set showNewMsgIndicator on every scroll event -- only on new message arrival
  }, [])

  // Scroll to bottom when "new messages" indicator is clicked
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowNewMsgIndicator(false)
    isNearBottomRef.current = true
  }, [])

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  // Clean up on unmount
  const bgPollRef = useRef(null)
  const convPollRef = useRef(null)
  useEffect(() => {
    return () => {
      if (relayPollRef.current) clearInterval(relayPollRef.current)
      if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current)
      if (bgPollRef.current) clearInterval(bgPollRef.current)
      if (convPollRef.current) clearInterval(convPollRef.current)
      if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current)
    }
  }, [])

  // Track streaming state in a ref so the poll interval callback can read it
  // without needing streaming in the useEffect dependency array (which would
  // cause interval re-creation on every streaming state change).
  const streamingRef = useRef(false)
  useEffect(() => { streamingRef.current = streaming }, [streaming])

  // PRIMARY POLL: Conversation JSONL endpoint (unified source of truth)
  // Local: 2.5s. Production without Supabase: 5s (GitHub API rate limit friendly).
  // When Supabase Realtime is active (production), skip this poll entirely.
  // Picks up ALL messages from all sources (terminal, telegram, dashboard, auto-responder).
  useEffect(() => {
    // NOTE: Supabase Realtime is broken on Safari/iOS with sb_publishable_ keys.
    // Always poll via Vercel proxy regardless. Poll is the reliable path.

    const pollInterval = IS_LOCAL ? 2500 : 5000

    convPollRef.current = setInterval(async () => {
      try {
        const sinceParam = lastConvTimestampRef.current
          ? `&since=${encodeURIComponent(lastConvTimestampRef.current)}`
          : ''
        const convRes = await fetch(`${CONV_API_BASE}?target=${agent.slug}&type=agent&limit=50${sinceParam}`)
        if (!convRes.ok) return
        const convData = await convRes.json()
        const newMsgs = convData.messages || []
        if (newMsgs.length === 0) return

        // Update the last seen timestamp
        const latestTs = newMsgs[newMsgs.length - 1].timestamp
        if (latestTs) lastConvTimestampRef.current = latestTs

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id).filter(Boolean))
          let added = 0
          const updated = [...prev]

          for (const msg of newMsgs) {
            if (existingIds.has(msg.id)) continue
            const cleaned = sanitizeRelayMessage(msg.text || msg.message)
            if (!cleaned) continue
            updated.push({
              role: msg.role || 'assistant',
              content: cleaned,
              time: msg.timestamp,
              source: msg.source || 'unknown',
              id: msg.id,
            })
            added++
          }

          if (added === 0) return prev // No changes, skip re-render
          // Remove streaming placeholders if a real response came in
          const withoutStreaming = updated.filter(m => !m.streaming || added === 0)
          withoutStreaming.sort((a, b) => new Date(a.time) - new Date(b.time))
          return deduplicateMessages(withoutStreaming.slice(-100))
        })

        // If we got a new assistant message while streaming, clear the streaming state
        const hasNewAssistant = newMsgs.some(m => m.role === 'assistant')
        if (hasNewAssistant && streamingRef.current) {
          setStreaming(false)
          setStreamStartTime(null)
          clearChatTimeout()
          if (relayPollRef.current) {
            clearInterval(relayPollRef.current)
            relayPollRef.current = null
          }
        }
      } catch {}
    }, pollInterval)

    // FAST-PATH OUTBOX POLL: 500ms poll of relay-outbox for immediate response display (local only)
    // On production, the conversation JSONL is the single source (relay-outbox is local file only)
    if (IS_LOCAL) {
    bgPollRef.current = setInterval(async () => {
      // Only poll outbox if we're NOT actively polling from a send (startRelayPoll handles that)
      if (relayPollRef.current) return

      try {
        const outRes = await fetch('/api/local/relay-outbox')
        if (!outRes.ok) return
        const data = await outRes.json()
        const outMsgs = (data.messages || []).filter(m =>
          m.message && m.source !== 'corner-dashboard' && m.source !== 'corner-websocket'
        )
        if (outMsgs.length === 0) return

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id).filter(Boolean))
          let added = 0
          const updated = [...prev]

          for (const msg of outMsgs) {
            if (existingIds.has(msg.id)) continue
            const cleaned = sanitizeRelayMessage(msg.message)
            if (!cleaned) continue
            updated.push({
              role: 'assistant',
              content: cleaned,
              time: msg.timestamp || new Date().toISOString(),
              source: extractAgentSource(msg) || 'system',
              id: msg.id,
            })
            added++
          }

          if (added === 0) return prev
          updated.sort((a, b) => new Date(a.time) - new Date(b.time))
          return deduplicateMessages(updated)
        })
      } catch {}
    }, 500) // 500ms for near-instant outbox relay display
    } // end IS_LOCAL block for fast-path outbox poll

    return () => {
      if (convPollRef.current) clearInterval(convPollRef.current)
      if (bgPollRef.current) clearInterval(bgPollRef.current)
    }
  }, [agent.slug])

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
            const cleaned = sanitizeRelayMessage(latest.message) || latest.message
            setMessages(prev => {
              // Remove streaming placeholders, add real response, re-sort
              const filtered = prev.filter(m => !m.streaming)
              filtered.push({
                role: 'assistant',
                content: cleaned,
                streaming: false,
                time: latest.timestamp || new Date().toISOString(),
                source: extractAgentSource(latest) || 'system',
                id: latest.id,
              })
              filtered.sort((a, b) => new Date(a.time) - new Date(b.time))
              return filtered
            })
            setStreaming(false)
            setStreamStartTime(null)
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
      setStreamStartTime(null)
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
    if (!text) return

    setIsSending(true)
    const sentTime = new Date().toISOString()
    setInput('')
    // Clear typing state (no auto-scroll -- user controls scroll position)
    isUserTypingRef.current = false
    if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current)
    // Add user message + streaming placeholder (only if not already streaming)
    setMessages(prev => {
      const sorted = [...prev, { role: 'user', content: text, time: sentTime, source: 'dashboard' }]
      sorted.sort((a, b) => new Date(a.time) - new Date(b.time))
      // Only add a streaming placeholder if one doesn't already exist
      const hasStreamingMsg = sorted.some(m => m.streaming)
      if (!hasStreamingMsg) {
        sorted.push({ role: 'assistant', content: '', streaming: true, time: sentTime })
      }
      return sorted
    })
    if (!streaming) {
      setStreamStartTime(Date.now())
      setThinkingPhrase(0)
    }
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
      } else if (supabase) {
        // Production + Supabase: write directly to messages table
        // The Mac listener picks this up and routes to the agent.
        // Response comes back via Realtime subscription (no polling needed).
        const { error: insertErr } = await supabase.from('messages').insert({
          id: crypto.randomUUID(),
          agent: agent.slug,
          role: 'user',
          text: text,
          source: 'corner-dashboard',
        })
        if (insertErr) throw new Error(`Supabase insert failed: ${insertErr.message}`)
        // No need to start relay poll: Realtime subscription handles incoming responses
      } else {
        // Production without Supabase: use the Vercel relay API (writes to GitHub relay-inbox + conversation JSONL)
        const res = await fetch(RELAY_SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `@${agent.slug} ${text}`, agent: agent.slug }),
        })
        if (!res.ok) throw new Error('Failed to send via relay API')
        // Production: the conversation JSONL poll will pick up responses (no fast-path outbox)
        // The convPoll runs every 5s, so response appears within ~15-20s after terminal processes it
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
      setStreamStartTime(null)
      clearChatTimeout()
    } finally {
      setIsSending(false)
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#292524] bg-[#0F0F0D] shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#292524] rounded-full transition-colors"
        >
          {isMobile ? <ArrowLeft className="w-5 h-5 text-[#A8A29E]" /> : <X className="w-4 h-4 text-[#A8A29E]" />}
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Agent avatar circle with status ring */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#C026D3]/10 border-2 border-[#C026D3]/50 flex items-center justify-center">
              <span className="text-[#C026D3] font-bold text-base">{agentInitial}</span>
            </div>
            {/* Online dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0F0F0D]" style={{ background: cfg.color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#F0ECE6] font-bold text-base tracking-tight">{agent.name}</span>
            </div>
            <p className="text-[#C026D3]/70 text-[12px] font-mono">{agent.role}</p>
          </div>
        </div>
        {/* Search toggle */}
        <button
          onClick={() => { setSearchOpen(o => !o); setTimeout(() => searchInputRef.current?.focus(), 100) }}
          className={`p-1.5 rounded-full transition-colors ${searchOpen ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'hover:bg-[#292524] text-[#78716C]'}`}
          title="Search messages"
        >
          <SearchIcon className="w-4 h-4" />
        </button>
        {/* Relay connection indicator */}
        <div className="flex items-center gap-1.5 shrink-0" title={IS_LOCAL ? 'Local relay (direct file I/O)' : supabase ? 'Supabase Realtime (live)' : 'Remote relay (GitHub API)'}>
          <Radio className={`w-3 h-3 ${relayConnected ? 'text-[#22C55E]' : 'text-[#78716C]'}`} />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#78716C]">
            {IS_LOCAL ? 'LOCAL' : supabase ? 'LIVE' : 'RELAY'}
          </span>
        </div>
      </div>

      {/* Search bar (slides in below header) */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-b border-[#292524] bg-[#0F0F0D] shrink-0"
          >
            <div className="px-4 py-2 flex items-center gap-2">
              <SearchIcon className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-[#F0ECE6] text-sm focus:outline-none placeholder:text-[#78716C]/40"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#78716C] hover:text-[#A8A29E]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scroll-smooth chat-messages-area relative">
        {messages.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#1A1A17] border-2 border-[#C026D3]/40 flex items-center justify-center mb-4">
              <span className="text-[#C026D3] font-bold text-xl">{agentInitial}</span>
            </div>
            <p className="text-[#A8A29E] text-sm mb-1">
              Chat with <span className="text-[#F0ECE6] font-bold">{agent.name}</span>
            </p>
            <p className="text-[#78716C] text-xs font-mono mb-3">{agent.role}</p>
            <p className="text-[#78716C]/40 text-[11px] font-mono">
              Same relay as Telegram + Terminal
            </p>
          </div>
        )}

        {/* TODAY divider */}
        {messages.length > 0 && !searchQuery && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#292524]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">Today</span>
            <div className="flex-1 h-px bg-[#292524]" />
          </div>
        )}

        {/* Search results count */}
        {searchQuery && (
          <div className="text-center py-2">
            <span className="text-[11px] font-mono text-[#78716C]">
              {messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase())).length} results for "{searchQuery}"
            </span>
          </div>
        )}

        {messages
          .filter(msg => !searchQuery || msg.content?.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((msg, i) => {
          const isUser = msg.role === 'user'
          const sourceLabel = formatSource(msg)
          const timeStr = msg.time && !msg.streaming ? formatTime(msg.time) : null

          // Typing indicator (streaming placeholder with no content yet)
          if (msg.streaming && !msg.content) {
            return (
              <div key={msg.id || `typing-indicator-${i}`} className="flex flex-col gap-1 flex-start">
                <div className="flex items-end gap-2.5 flex-row">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#C026D3]/50 bg-[#C026D3]/10 text-[#C026D3]">
                    {agentInitial}
                  </div>
                  <div className="bg-[#1C1C1A] border border-[#2A2A28] rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#78716C] text-xs font-mono">{thinkingPhrases[thinkingPhrase]}</span>
                      {elapsedSeconds > 0 && (
                        <span className="text-[#78716C]/50 text-xs font-mono">{elapsedSeconds}s</span>
                      )}
                      <span className="flex items-center gap-1">
                        {[0, 1, 2].map(j => (
                          <span
                            key={j}
                            className="inline-block w-1.5 h-1.5 rounded-full bg-[#C026D3]/60"
                            style={{ animation: `chatBounce 1.4s ease-in-out ${j * 0.2}s infinite` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Motivational text under the bubble */}
                <div className="ml-11 text-[#78716C]/70 text-xs font-mono leading-relaxed">
                  {motivationalPhrases[motivationalPhrase]}
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id || i} className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar: smaller, cleaner */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                isUser
                  ? 'border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]'
                  : 'border-[#C026D3]/40 bg-[#C026D3]/10 text-[#C026D3]'
              }`}>
                {isUser ? 'P' : agentInitial}
              </div>

              {/* Bubble + meta */}
              <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Message bubble */}
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#1E3A5F] text-[#F0ECE6] rounded-2xl rounded-br-sm'
                      : 'bg-[#1C1C1A] text-[#F0ECE6] border border-[#2A2A28] rounded-2xl rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && msg.content && !msg.streaming ? (
                    <div
                      className="chat-md break-words"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  )}
                  {msg.streaming && msg.content && (
                    <span className="inline-block w-1.5 h-4 bg-[#C026D3] ml-0.5 animate-pulse rounded-full" />
                  )}
                </div>

                {/* Timestamp + source: ultra-muted, content is king */}
                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {timeStr && (
                    <span className="text-[10px] font-mono text-[#78716C]/40">{timeStr}</span>
                  )}
                  {sourceLabel && (
                    <span className="text-[9px] font-mono text-[#78716C]/25">
                      {sourceLabel.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to latest / New messages indicator -- positioned relative to the chat area */}
      <AnimatePresence>
        {showNewMsgIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-10 flex justify-center"
            style={{ marginTop: -44 }}
          >
            <button
              onClick={scrollToBottom}
              className="bg-[#3B82F6] text-white text-xs font-mono font-bold px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/20 hover:bg-[#2563EB] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ChevronDown size={14} strokeWidth={2.5} />
              {hasNewMessagesRef.current ? 'New messages' : 'Jump to latest'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={sendMessage} className="shrink-0 px-4 py-2 border-t border-[#292524]/50 bg-[#0F0F0D]">
        <div className="flex items-center gap-3 bg-[#1A1A17] border border-[#292524] rounded-full px-4 py-1 focus-within:border-[#3B82F6]/40 focus-within:shadow-[0_0_0_2px_rgba(59,130,246,0.1)] transition-all" style={{ touchAction: 'auto' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // Mark user as typing -- suppresses auto-scroll
              isUserTypingRef.current = true
              if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current)
              userTypingTimeoutRef.current = setTimeout(() => {
                isUserTypingRef.current = false
              }, 2000) // Clear typing state after 2s of inactivity
            }}
            onFocus={() => { isUserTypingRef.current = true }}
            onBlur={() => {
              // Delay clearing so send doesn't race with blur
              setTimeout(() => { isUserTypingRef.current = false }, 300)
            }}
            placeholder={streaming ? `Add more for ${agent.name}...` : `Talk to ${agent.name}...`}
            className="flex-1 bg-transparent text-[#F0ECE6] py-2.5 text-sm focus:outline-none placeholder:text-[#78716C]/60"
            style={{ touchAction: 'manipulation', WebkitUserSelect: 'text' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="w-9 h-9 flex items-center justify-center bg-[#3B82F6] text-white rounded-full hover:bg-[#2563EB] disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
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

      {/* Chat styles */}
      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .chat-messages-area::-webkit-scrollbar { width: 4px; }
        .chat-messages-area::-webkit-scrollbar-track { background: transparent; }
        .chat-messages-area::-webkit-scrollbar-thumb { background: rgba(120,113,108,0.3); border-radius: 4px; }
        .chat-messages-area::-webkit-scrollbar-thumb:hover { background: rgba(120,113,108,0.5); }
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
          border-radius: 8px;
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
