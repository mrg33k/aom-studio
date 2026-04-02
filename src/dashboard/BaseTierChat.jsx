// BaseTierChat.jsx -- Single-thread chat for Corner Base tier
// Messages route through route-message.py to the right agent in a workspace.
// Responses show "via [Agent]" attribution. No agent selector -- that's Pro.
//
// Props:
//   workspace  {string}  relative path, e.g. "workspaces/test-sarah"
//   clientId   {string}  Supabase client_id for message persistence (defaults to workspace leaf)
//   title      {string}  optional display title (defaults to "Your Team")

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Users, ChevronDown } from 'lucide-react'
import { marked } from 'marked'
import { supabase } from './lib/supabase'

marked.setOptions({ breaks: true, gfm: true })

const IS_LOCAL = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const BASE_CHAT_URL = '/api/dashboard/base-chat'
const MESSAGES_URL = IS_LOCAL ? '/api/local/supabase-messages' : '/api/dashboard/supabase-messages'

// ── Colors for agent attribution labels ─────────────────────────────────────
const AGENT_COLORS = {
  recruiter:  '#22C55E',
  compliance: '#F97316',
  trader:     '#8B5CF6',
  router:     '#78716C',
}

function getAgentColor(agentSlug) {
  if (!agentSlug) return '#78716C'
  const slug = agentSlug.toLowerCase()
  return AGENT_COLORS[slug] || '#60A5FA'
}

// ── Render markdown safely ───────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  try {
    let html = marked.parse(text)
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    return html
  } catch {
    return text
  }
}

// ── Message types ────────────────────────────────────────────────────────────
// user:   { role: 'user', content, id, time }
// agent:  { role: 'assistant', content, via, id, time }
// system: { role: 'system', content, id, time }  -- clarification prompts, errors

// ── Load history from Supabase ───────────────────────────────────────────────
async function loadHistory(clientId) {
  try {
    // Use supabase JS client if available, else REST API proxy
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', clientId)
        .eq('source', 'base-chat')
        .order('timestamp', { ascending: true })
        .limit(100)
      if (error || !data) return []
      return data.map(m => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || '',
        via: m.role === 'assistant' ? m.agent : null,
        time: m.timestamp,
      }))
    }

    // Fallback: REST proxy
    const res = await fetch(`/api/dashboard/supabase-messages?agent=base-chat&client=${encodeURIComponent(clientId)}&limit=100`)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map(m => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text || '',
      via: m.role === 'assistant' ? m.agent : null,
      time: m.timestamp,
    })).reverse()
  } catch {
    return []
  }
}

// ── TypingIndicator ──────────────────────────────────────────────────────────
function TypingIndicator({ label = 'Your team' }) {
  return (
    <div className="flex items-end gap-2 px-4 py-1">
      <div className="w-7 h-7 rounded-full bg-[#1E2A1A] border border-[#22C55E]/30 flex items-center justify-center flex-shrink-0">
        <Users size={13} className="text-[#22C55E]/60" />
      </div>
      <div className="flex items-center gap-1.5 bg-[#161A12] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
        <span className="text-[10px] text-[#6B7280] mr-1">{label} is thinking</span>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#4B5563]"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1">
        <div className="bg-[#1C1C1C] border border-white/8 text-[#9CA3AF] text-xs rounded-xl px-4 py-2 max-w-[85%] text-center italic">
          {msg.content}
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end px-4 py-1"
      >
        <div
          className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-3 text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #E85D26 0%, #D44E1B 100%)' }}
        >
          {msg.content}
        </div>
      </motion.div>
    )
  }

  // Assistant message
  const viaLabel = msg.via ? msg.via.charAt(0).toUpperCase() + msg.via.slice(1) : 'Router'
  const agentColor = getAgentColor(msg.via)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2 px-4 py-1"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
        style={{ background: agentColor, opacity: 0.85 }}
      >
        {viaLabel.charAt(0)}
      </div>
      <div className="max-w-[75%]">
        <div className="bg-[#161A12] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-[#E5E0D8]">
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        </div>
        <div
          className="text-[10px] mt-1 ml-1 font-medium"
          style={{ color: agentColor, opacity: 0.7 }}
        >
          via {viaLabel}
        </div>
      </div>
    </motion.div>
  )
}

// ── Multi-agent response group ───────────────────────────────────────────────
function MultiResponseGroup({ responses }) {
  return (
    <div className="flex flex-col gap-1">
      {responses.map((r, i) => (
        <MessageBubble
          key={i}
          msg={{ role: 'assistant', content: r.response, via: r.agent.toLowerCase(), id: `multi-${i}` }}
        />
      ))}
    </div>
  )
}

// ── ScrollToBottom button ────────────────────────────────────────────────────
function ScrollToBottomButton({ onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={onClick}
      className="absolute bottom-20 right-4 w-8 h-8 rounded-full bg-[#1C1C1C] border border-white/15 flex items-center justify-center text-[#9CA3AF] hover:text-white hover:border-white/30 transition-colors shadow-lg"
    >
      <ChevronDown size={14} />
    </motion.button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function BaseTierChat({ workspace = 'workspaces/test-sarah', clientId, title = 'Your Team' }) {
  const effectiveClientId = clientId || workspace.split('/').pop()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [pendingVia, setPendingVia] = useState(null) // agent name being typed by

  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const inputRef = useRef(null)

  // Build history array for API (last 20 for context)
  const buildHistoryForApi = useCallback(() => {
    return messages.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
      via: m.via || null,
      routed_to: m.via ? m.via.toLowerCase() : null,
    }))
  }, [messages])

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const threshold = 80
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold)
  }, [])

  // Load history on mount
  useEffect(() => {
    let mounted = true
    setHistoryLoading(true)
    loadHistory(effectiveClientId).then(msgs => {
      if (!mounted) return
      setMessages(msgs)
      setHistoryLoading(false)
    })
    return () => { mounted = false }
  }, [effectiveClientId])

  // Auto-scroll when new messages arrive (if at bottom)
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(messages.length === 0 ? 'instant' : 'smooth')
    }
  }, [messages, loading, isAtBottom, scrollToBottom])

  // Send message
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      time: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setPendingVia(null)
    scrollToBottom()

    try {
      const res = await fetch(BASE_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace,
          message: text,
          history: buildHistoryForApi(),
          clientId: effectiveClientId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `Something went wrong: ${err.error || 'Unknown error'}`,
          time: new Date().toISOString(),
        }])
        return
      }

      const data = await res.json()

      if (data.clarification) {
        // Ambiguous -- router is asking a clarifying question
        setMessages(prev => [...prev, {
          id: `clarify-${Date.now()}`,
          role: 'system',
          content: data.clarification,
          time: new Date().toISOString(),
        }])
        return
      }

      if (data.responses && Array.isArray(data.responses)) {
        // Multi-agent response
        const newMsgs = data.responses.map((r, i) => ({
          id: `multi-${Date.now()}-${i}`,
          role: 'assistant',
          content: r.response,
          via: (r.agent || 'Router').toLowerCase(),
          time: new Date().toISOString(),
        }))
        setMessages(prev => [...prev, ...newMsgs])
        return
      }

      // Single or direct
      if (data.response) {
        setMessages(prev => [...prev, {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          via: (data.via || 'Router').toLowerCase(),
          time: new Date().toISOString(),
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Connection error: ${err.message}`,
        time: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setPendingVia(null)
      inputRef.current?.focus()
    }
  }, [input, loading, workspace, effectiveClientId, buildHistoryForApi, scrollToBottom])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const isEmpty = !historyLoading && messages.length === 0

  return (
    <div
      className="flex flex-col h-full bg-[#0D110B] relative"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-[#1E2A1A] border border-[#22C55E]/30 flex items-center justify-center">
          <Users size={13} className="text-[#22C55E]" />
        </div>
        <div>
          <div className="text-[#E5E0D8] text-sm font-semibold">{title}</div>
          <div className="text-[10px] text-[#4B5563]">Your agents are ready</div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 flex flex-col gap-0.5 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1F2937 transparent' }}
      >
        {historyLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="text-[#4B5563] animate-spin" />
          </div>
        )}

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 py-12 px-6 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#1E2A1A] border border-[#22C55E]/20 flex items-center justify-center mb-4">
              <Users size={20} className="text-[#22C55E]/60" />
            </div>
            <div className="text-[#9CA3AF] text-sm font-medium mb-1">Your team is ready</div>
            <div className="text-[#4B5563] text-xs max-w-[200px]">
              Ask about anything. Your agents will handle it.
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <TypingIndicator label={pendingVia || title} />
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {!isAtBottom && (
          <ScrollToBottomButton onClick={() => { setIsAtBottom(true); scrollToBottom() }} />
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-white/8 px-3 py-3">
        <div className="flex items-end gap-2 bg-[#161A12] border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-white/20 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell your team what to do..."
            rows={1}
            className="flex-1 bg-transparent text-[#E5E0D8] text-sm placeholder-[#4B5563] resize-none outline-none min-h-[20px] max-h-[120px] leading-5"
            style={{ overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg, #E85D26 0%, #D44E1B 100%)' : '#1C1C1C',
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}
          >
            {loading
              ? <Loader2 size={12} className="text-white animate-spin" />
              : <Send size={12} className="text-white" style={{ marginLeft: '1px' }} />
            }
          </button>
        </div>
        <div className="text-[9px] text-[#2D3748] text-center mt-1.5">
          Enter to send &middot; Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
