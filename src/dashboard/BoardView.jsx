// BoardView.jsx -- Multi-Terminal Command Center v3
// Discord-style rail + fluid column toggle + tabs per column
// Data: pipeData from useDataPipe, messages from Supabase
// Same right-click context menu as sidebar (TaskContextMenu)

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AGENTS, PROJECTS } from './gridSpec.js'
import { getClientId } from './lib/clientConfig.js'
import { supabase } from './lib/supabase.js'
import TaskContextMenu, { handleTaskContextAction } from './components/TaskContextMenu.jsx'
import { getAgentKnowledge } from './agentKnowledge.js'
import { TypingIndicatorV2 } from './components/TypingIndicatorV2.jsx'
import FilesTab from './FilesTab.jsx'
import { useBridge, isBridgeAgent } from './hooks/useBridge.js'

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
    '--bv-rail': 'rgba(8,16,40,0.7)',
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
    '--bv-rail': 'rgba(15,35,80,0.7)',
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

function useColumnChat(agentSlug, isActive) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const pollRef = useRef(null)
  const loadedRef = useRef(false)

  // Terminal Bridge for super agents -- bridge is the ONLY path for these agents
  const isBridgeSlug = isBridgeAgent(agentSlug)
  const bridge = useBridge(agentSlug, { enabled: isBridgeSlug && isActive })
  const useBridgeForAgent = isBridgeSlug // true for bridge agents regardless of connection state

  // Bridge: stream text into streaming placeholder (deltas only)
  useEffect(() => {
    if (!useBridgeForAgent || !bridge.streaming || !bridge.streamText) return
    setMessages(prev => {
      const idx = prev.findIndex(m => m.streaming)
      if (idx === -1) return prev
      // Only update if content actually changed
      if (prev[idx].content === bridge.streamText) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], content: bridge.streamText }
      return updated
    })
  }, [useBridgeForAgent, bridge.streaming, bridge.streamText])

  // Bridge: map check events to per-message status (single/double/blue)
  useEffect(() => {
    if (!useBridgeForAgent || !bridge.check) return
    const statusMap = { single: 'sent', double: 'delivered', blue: 'read' }
    const newStatus = statusMap[bridge.check]
    if (!newStatus) return
    setMessages(prev => {
      // Find last user message, update its status
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === 'user') {
          const updated = [...prev]
          updated[i] = { ...updated[i], status: newStatus }
          return updated
        }
      }
      return prev
    })
  }, [useBridgeForAgent, bridge.check])

  // Bridge: handle completed responses
  useEffect(() => {
    if (!bridge.lastResponse) return
    const resp = bridge.lastResponse
    setMessages(prev => {
      // Remove streaming placeholder
      const filtered = prev.filter(m => !m.streaming)
      // Check if this response is already in the list (dedup)
      const respNorm = (resp.text || '').trim().slice(0, 100)
      if (respNorm && filtered.some(m => m.role === 'assistant' && m.source === 'bridge' && (m.content || '').trim().slice(0, 100) === respNorm)) {
        return filtered
      }
      // Mark all user messages as read
      const updated = filtered.map(m => m.role === 'user' && m.status !== 'read' ? { ...m, status: 'read' } : m)
      updated.push({ role: 'assistant', content: resp.text, time: resp.time, source: 'bridge' })
      return updated.slice(-100)
    })
    setSending(false)
  }, [bridge.lastResponse])

  // Bridge: reset sending state on disconnect (catches pre-stream disconnects)
  useEffect(() => {
    if (!useBridgeForAgent) return
    if (bridge.status === 'disconnected') {
      setSending(false)
    }
  }, [useBridgeForAgent, bridge.status])

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
          .filter(m => {
            // Only show dashboard user messages + relay/assistant responses
            // Filter out: terminal, inter-agent, task lifecycle, session logs
            const src = (m.source || '').toLowerCase()
            if (src === 'terminal') return false
            if (src.startsWith('agent-')) return false
            if (src === 'corner-dashboard-task') return false
            if (src === 'task-creation') return false
            if (src === 'completion-hook') return false
            if (src === 'agent-status') return false
            if (m.is_task) return false
            const txt = (m.text || '')
            if (txt.startsWith('[SESSION LOG]')) return false
            if (txt.startsWith('[From ')) return false
            if (txt.startsWith('[Dashboard]')) return false
            if (txt.startsWith('You are ') && txt.includes('Working directory:')) return false
            if (txt.startsWith('MANDATORY FIRST STEP:')) return false
            if (txt.startsWith('PRIORITY:') || txt.startsWith('CRITICAL:') || txt.startsWith('NEW MANDATORY')) return false
            if (/^(Task completed|Task started|task_completed|task_started):/i.test(txt)) return false
            if (/^Task auto-confirmed:/i.test(txt)) return false
            if (/\bsession (ended|started)\b/i.test(txt)) return false
            if (/^\[?(BOBBY|ELON|GARY|STEVE|CLEO|STEFFEN)\]?\s*(session started|sub-agent completed|Shipped|shipped)/i.test(txt)) return false
            if (/^(confirmed|task complete|done|completed)\s*[.!]?\s*$/i.test(txt)) return false
            // Filter spawn-agent task prompts (system routing, not conversation)
            if (txt.includes('Working directory:') && txt.includes('Read your context')) return false
            if (txt.includes('Task ID:') && txt.includes('YOUR TASK:')) return false
            if (txt.includes('REMINDER: Write your result summary')) return false
            // Filter relay system messages
            if (txt.includes('Read the output file to retrieve the result:')) return false
            if (txt.startsWith('export CORNER_AGENT=')) return false
            if (/^Fix Terminal Bridge/.test(txt) && txt.includes('server.js')) return false
            return true
          })
          .map(m => ({ role: m.role || 'assistant', content: m.text || '', time: m.timestamp || '', source: m.source }))
          .filter(m => m.content)
        setMessages(msgs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentSlug, isActive])

  // Continuous background poll: fetch new messages every 3s for live updates
  // SKIP when bridge is connected -- bridge handles responses via WebSocket
  const bgPollRef = useRef(null)
  const lastBgTsRef = useRef(new Date().toISOString())
  useEffect(() => {
    if (!agentSlug || !isActive || useBridgeForAgent) return
    bgPollRef.current = setInterval(async () => {
      if (document.hidden) return
      try {
        const cid = getClientId()
        const url = IS_LOCAL
          ? `/api/local/conversations?agent=${encodeURIComponent(agentSlug)}&limit=10`
          : `/api/dashboard/supabase-messages?agent=${encodeURIComponent(agentSlug)}&limit=10&client=${encodeURIComponent(cid)}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const newMsgs = (data.messages || [])
          .filter(m => m.timestamp > lastBgTsRef.current && m.text)
          .filter(m => !m.agent || m.agent === agentSlug)
          .filter(m => {
            const src = (m.source || '').toLowerCase()
            if (src === 'terminal') return false
            if (src.startsWith('agent-')) return false
            if (src === 'corner-dashboard-task') return false
            if (src === 'task-creation') return false
            if (src === 'completion-hook') return false
            if (src === 'agent-status') return false
            if (m.is_task) return false
            const txt = (m.text || '')
            if (txt.startsWith('[SESSION LOG]')) return false
            if (txt.startsWith('[From ')) return false
            if (txt.startsWith('[Dashboard]')) return false
            if (txt.startsWith('You are ') && txt.includes('Working directory:')) return false
            if (txt.startsWith('MANDATORY FIRST STEP:')) return false
            if (txt.startsWith('PRIORITY:') || txt.startsWith('CRITICAL:') || txt.startsWith('NEW MANDATORY')) return false
            if (/^(Task completed|Task started|task_completed|task_started):/i.test(txt)) return false
            if (/^Task auto-confirmed:/i.test(txt)) return false
            if (/\bsession (ended|started)\b/i.test(txt)) return false
            if (/^\[?(BOBBY|ELON|GARY|STEVE|CLEO|STEFFEN)\]?\s*(session started|sub-agent completed|Shipped|shipped)/i.test(txt)) return false
            if (/^(confirmed|task complete|done|completed)\s*[.!]?\s*$/i.test(txt)) return false
            if (txt.includes('Working directory:') && txt.includes('Read your context')) return false
            if (txt.includes('Task ID:') && txt.includes('YOUR TASK:')) return false
            if (txt.includes('REMINDER: Write your result summary')) return false
            if (txt.includes('Read the output file to retrieve the result:')) return false
            if (txt.startsWith('export CORNER_AGENT=')) return false
            if (/^Fix Terminal Bridge/.test(txt) && txt.includes('server.js')) return false
            return true
          })
        if (newMsgs.length > 0) {
          lastBgTsRef.current = newMsgs[newMsgs.length - 1].timestamp
          setMessages(prev => {
            let updated = [...prev]
            const hasAssistant = newMsgs.some(m => m.role === 'assistant')
            if (hasAssistant) {
              updated = updated.map(m => m.role === 'user' && m.status !== 'read' ? { ...m, status: 'read' } : m)
            }
            for (const row of newMsgs) {
              const msg = { role: row.role || 'assistant', content: row.text, time: row.timestamp, source: row.source }
              if (updated.some(m => m.content === msg.content && Math.abs(new Date(m.time).getTime() - new Date(msg.time).getTime()) < 5000)) continue
              if (row.role !== 'user') updated = updated.filter(m => !m.streaming)
              updated.push(msg)
            }
            return updated
          })
          if (newMsgs.some(m => m.role === 'assistant')) setSending(false)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(bgPollRef.current)
  }, [agentSlug, isActive])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return
    const sentTime = new Date().toISOString()
    const msgId = `usr-${Date.now()}`
    setInput('')
    // Reset stale check state BEFORE adding the new message so the bridge.check
    // useEffect cannot fire with a leftover 'blue' value and instantly mark the
    // new message as read.
    if (useBridgeForAgent) bridge.resetCheck()
    // Step 1: single gray check (sent)
    setMessages(prev => {
      const cleaned = prev.filter(m => !m.streaming || m.content)
      return [...cleaned,
        { role: 'user', content: text.trim(), time: sentTime, id: msgId, status: 'sent' },
      ]
    })
    setSending(true)

    // Terminal Bridge: direct WebSocket for super agents
    if (useBridgeForAgent) {
      // Persist user message to Supabase immediately (belt and suspenders -- bridge server is the backup)
      const clientId = getClientId()
      const sendUrl = IS_LOCAL ? '/api/local/relay-send' : '/api/dashboard/supabase-messages'
      fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, text: text.trim(), message: text.trim(), source: 'corner-dashboard', client_id: clientId, role: 'user' }),
      }).catch(() => {}) // fire and forget

      const sent = bridge.send(text.trim())
      if (sent) {
        // Add streaming placeholder for bridge response
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, time: sentTime }])
        // Checks come through bridge.check -> handled by useBridge hook
        return
      }
      // Bridge send failed -- queue and retry when reconnected (no relay fallback)
      const retryInterval = setInterval(() => {
        if (bridge.send(text.trim())) {
          clearInterval(retryInterval)
          setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, time: new Date().toISOString() }])
        }
      }, 1000)
      // Give up after 30s
      setTimeout(() => {
        clearInterval(retryInterval)
        if (sending) setSending(false)
      }, 30000)
      return
    }

    try {
      const clientId = getClientId()
      const sendUrl = IS_LOCAL ? '/api/local/relay-send' : '/api/dashboard/supabase-messages'
      const sendStart = Date.now()
      await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, text: text.trim(), message: text.trim(), source: 'corner-dashboard', client_id: clientId }),
      })
      // Step 2: double gray check (delivered) -- min 800ms after send so the single check is visible
      const elapsed = Date.now() - sendStart
      const delay = Math.max(0, 800 - elapsed)
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'delivered' } : m))
      }, delay)
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const cid = getClientId()
          const pollUrl = IS_LOCAL
            ? `/api/local/conversations?agent=${encodeURIComponent(agentSlug)}&limit=5`
            : `/api/dashboard/supabase-messages?agent=${encodeURIComponent(agentSlug)}&limit=5&client=${encodeURIComponent(cid)}`
          const res = await fetch(pollUrl)
          if (!res.ok) return
          const data = await res.json()
          const newResp = (data.messages || []).filter(m => m.role === 'assistant' && m.timestamp > sentTime)
          if (newResp.length > 0) {
            const latest = newResp[newResp.length - 1]
            // Step 3a: double blue check (read) -- show before response appears
            setMessages(prev => prev.map(m => m.role === 'user' && m.status !== 'read' ? { ...m, status: 'read' } : m))
            // Step 3b: after 600ms, show the actual response
            setTimeout(() => {
              setMessages(prev => {
                let u = prev.filter(m => !m.streaming)
                u.push({ role: 'assistant', content: latest.text, time: latest.timestamp })
                return u
              })
              setSending(false)
            }, 600)
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        } catch {}
      }, 1500)
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
          // Keep delivered checks -- agent will process when back online
          setSending(false)
        }
      }, 60000)
    } catch {
      setMessages(prev => {
        const u = [...prev]
        const last = u[u.length - 1]
        if (last?.streaming) u[u.length - 1] = { ...last, content: 'Failed to send.', streaming: false }
        return u
      })
      setSending(false)
    }
  }, [agentSlug, sending])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])
  // Expose bridge for all bridge-eligible agents (show indicator even when disconnected)
  return { messages, input, setInput, loading, sending, sendMessage, bridge: isBridgeAgent(agentSlug) ? bridge : null }
}

// ── COLUMN TAB BAR ───────────────────────────────────────────────────────────

function ColTabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', borderBottom: '1px solid var(--bv-divider)', flexShrink: 0,
    }}>
      {tabs.map(t => (
        <div
          key={t}
          onClick={() => onChange(t)}
          style={{
            flex: 1, padding: '7px 0', textAlign: 'center',
            fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: active === t ? 'var(--bv-accent-text)' : 'var(--bv-dim)',
            borderBottom: `2px solid ${active === t ? 'var(--bv-accent-text)' : 'transparent'}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {t}
        </div>
      ))}
    </div>
  )
}

// ── READ RECEIPTS (WhatsApp-style checks) ────────────────────────────────────
function ReadReceipt({ status }) {
  if (!status || status === 'read-old') return null
  const isDouble = status === 'delivered' || status === 'read'
  const isBlue = status === 'read'
  // sent = gray, delivered = white, read = blue (WhatsApp exact)
  const color = isBlue ? '#3B82F6' : status === 'delivered' ? '#E2E8F0' : '#6B7280'
  // Single check SVG for 'sent', double check for 'delivered'/'read'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, flexShrink: 0 }}>
      <svg width={isDouble ? 18 : 12} height="10" viewBox={isDouble ? '0 0 18 10' : '0 0 12 10'} fill="none">
        <path d={isDouble ? 'M1 5.5L4 8.5L11 1.5' : 'M1 5.5L4 8.5L11 1.5'} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {isDouble && <path d="M6 5.5L9 8.5L16 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </span>
  )
}

// ── CHAT PANEL (reused in agent columns) ─────────────────────────────────────

function ChatPanel({ chat, agentName, agentSlug, agentColor, allAgents, onSendToAgent }) {
  const ref = useRef(null)
  const inputRef = useRef(null)
  const isUserScrolledUp = useRef(false)
  const color = agentColor || getAgentColor(agentSlug)
  const [msgCtx, setMsgCtx] = useState(null) // { x, y, content, role }

  // Check if any message is currently streaming
  const isStreaming = chat.messages.some(m => m.streaming)

  // Smart scroll: auto-scroll unless user scrolled up
  const scrollToBottom = useCallback(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [])

  useEffect(() => {
    if (!isUserScrolledUp.current) scrollToBottom()
  }, [chat.messages.length, scrollToBottom])

  const handleScroll = useCallback(() => {
    if (!ref.current) return
    const { scrollTop, scrollHeight, clientHeight } = ref.current
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 80
  }, [])

  const doSend = () => {
    if (chat.input.trim()) {
      chat.sendMessage(chat.input)
      isUserScrolledUp.current = false
      setTimeout(scrollToBottom, 50)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}
      onClick={e => e.stopPropagation()}
    >
      <div ref={ref} onScroll={handleScroll}
        onContextMenu={e => {
          // Delegate: find closest message bubble and show context menu
          const bubble = e.target.closest('[data-msg-idx]')
          if (bubble) {
            e.preventDefault()
            const idx = parseInt(bubble.dataset.msgIdx, 10)
            const m = chat.messages[idx]
            if (m && !m.streaming) {
              setMsgCtx({ x: e.clientX, y: e.clientY, content: m.content, role: m.role })
            }
          }
        }}
        style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0,
      }}>
        {chat.loading && <div style={{ textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, padding: 20 }}>Loading...</div>}
        {chat.messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div
                data-msg-idx={i}
                style={{
                padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.6,
                maxWidth: '88%',
                wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? 'var(--bv-chat-user)' : 'var(--bv-chat-agent)',
                border: `1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.25)' : 'var(--bv-card-border)'}`,
                color: m.role === 'user' ? 'var(--bv-text)' : 'var(--bv-text2)',
                borderBottomLeftRadius: m.role !== 'user' ? 4 : 12,
                borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                cursor: 'context-menu',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.6 }}>
                  {m.role === 'user' ? 'You' : agentName}
                </div>
                {/* Streaming placeholder: show TypingIndicatorV2 if no content yet, else show live text */}
                {m.streaming && !m.content ? (
                  <TypingIndicatorV2
                    streaming={true}
                    agentSlug={agentSlug}
                    agentColor={color}
                    agentName={agentName}
                    onPoke={(text) => chat.sendMessage(text)}
                    compact={true}
                  />
                ) : (
                  <div>{m.content}</div>
                )}
                {/* WhatsApp-style read receipts on user messages */}
                {m.role === 'user' && m.status && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <ReadReceipt status={m.status} />
                  </div>
                )}
              </div>
            </div>
        ))}
        {/* Bridge typing indicator: shown when bridge is streaming but no streaming message exists yet */}
        {chat.bridge?.streaming && !chat.messages.some(m => m.streaming) && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 12,
              maxWidth: '88%',
              background: 'var(--bv-chat-agent)',
              border: '1px solid var(--bv-card-border)',
              borderBottomLeftRadius: 4,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.6 }}>{agentName}</div>
              <TypingIndicatorV2
                streaming={true}
                agentSlug={agentSlug}
                agentColor={color}
                agentName={agentName}
                onPoke={(text) => chat.sendMessage(text)}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Message context menu: portal to body to escape transform containers */}
      {msgCtx && createPortal(
        <div
          onClick={() => setMsgCtx(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(msgCtx.x, window.innerWidth - 220),
              top: Math.min(msgCtx.y, window.innerHeight - 300),
              width: 200,
              background: '#1A2744', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10, padding: 4, zIndex: 100000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Copy */}
            <button
              onClick={() => { navigator.clipboard?.writeText(msgCtx.content); setMsgCtx(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
                background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
                color: '#E2E8F0', fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Copy
            </button>
            {/* Send to agent submenu */}
            <div style={{ padding: '4px 10px 2px', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Send to
            </div>
            {(allAgents || []).filter(a => a.slug !== agentSlug).slice(0, 8).map(a => (
              <button
                key={a.slug}
                onClick={() => {
                  onSendToAgent?.(a.slug, msgCtx.content, agentSlug)
                  setMsgCtx(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
                  background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
                  color: '#E2E8F0', fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: `${a.color || '#60A5FA'}30`, border: `1px solid ${a.color || '#60A5FA'}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: a.color || '#60A5FA',
                }}>
                  {(a.name || a.slug).charAt(0).toUpperCase()}
                </span>
                {a.name || a.slug}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Scroll to bottom button -- appears when user scrolls up */}
      {isUserScrolledUp.current && (
        <button
          onClick={() => { isUserScrolledUp.current = false; scrollToBottom() }}
          style={{
            position: 'absolute', bottom: 56, right: 16, zIndex: 5,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--bv-accent)', color: 'var(--bv-accent-text)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      )}

      {/* Bridge indicator: always visible for bridge agents, grey when disconnected, blue when connected */}
      {chat.bridge && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '3px 0', borderTop: '1px solid var(--bv-divider)',
          background: chat.bridge.connected ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)', flexShrink: 0,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: chat.bridge.connected ? '#3B82F6' : '#4B5563' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: chat.bridge.connected ? '#3B82F6' : '#4B5563', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>BRIDGE</span>
        </div>
      )}

      <div style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        borderTop: '1px solid var(--bv-divider)', flexShrink: 0, background: 'var(--bv-bar)',
      }}>
        <input
          ref={inputRef}
          value={chat.input}
          onChange={e => chat.setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() } }}
          placeholder={chat.bridge ? `${agentName} (bridge)...` : `Message ${agentName}...`}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, background: 'var(--bv-input-bg)', border: '1.5px solid var(--bv-input-border)',
            borderRadius: 10, padding: '9px 12px', color: 'var(--bv-text)', fontSize: 13,
            fontFamily: "'Inter', sans-serif", outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={e => { e.stopPropagation(); doSend() }}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'var(--bv-accent)', color: 'var(--bv-accent-text)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  )
}

// ── INFO PANEL ───────────────────────────────────────────────────────────────

function InfoPanel({ slug, isAgent }) {
  const knowledge = isAgent ? getAgentKnowledge(slug) : null
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
      {knowledge?.superpower && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Superpower</div>
          <div style={{ fontSize: 12, color: 'var(--bv-text2)', lineHeight: 1.5, fontStyle: 'italic', padding: '7px 10px', borderRadius: 6, borderLeft: '2px solid var(--bv-accent-border)', background: 'var(--bv-card)' }}>
            {knowledge.superpower}
          </div>
        </div>
      )}
      {knowledge?.skills?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {knowledge.skills.map(s => (
              <span key={s} style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", padding: '2px 8px', borderRadius: 12, background: 'var(--bv-badge)', border: '1px solid var(--bv-col-border)', color: 'var(--bv-accent-text)' }}>/{s}</span>
            ))}
          </div>
        </div>
      )}
      {knowledge?.owns && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Owns</div>
          <div style={{ fontSize: 12, color: 'var(--bv-text2)' }}>{knowledge.owns}</div>
        </div>
      )}
      {!knowledge && (
        <div style={{ color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
          {isAgent ? 'Knowledge base coming soon.' : 'Project details coming soon.'}
        </div>
      )}
    </div>
  )
}

// ── TASK LIST (reused in both agent Tasks tab and project columns) ───────────

function TaskList({ tasks, onContextMenu, showAgent = false }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
      {tasks.length === 0 && (
        <div style={{ padding: '16px 4px', textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic' }}>No tasks</div>
      )}
      {tasks.map((t, i) => (
        <div
          key={t.taskId || t.id || t.text || i}
          onContextMenu={e => { e.preventDefault(); onContextMenu?.(e, t) }}
          style={{
            padding: '7px 10px', borderRadius: 8, background: 'var(--bv-card)', border: '1px solid var(--bv-card-border)',
            marginBottom: 4, cursor: 'context-menu', transition: 'background 0.15s',
            display: 'flex', gap: 8, alignItems: 'flex-start',
            opacity: t.done || t.status === 'completed' ? 0.5 : 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bv-card-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bv-card)'}
        >
          <div style={{
            width: 14, height: 14, borderRadius: 3, marginTop: 1, flexShrink: 0,
            border: `1.5px solid ${t.done || t.status === 'completed' ? '#22C55E' : 'var(--bv-col-border)'}`,
            background: t.done || t.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(t.done || t.status === 'completed') && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, color: 'var(--bv-text2)', lineHeight: 1.4,
              textDecoration: t.done || t.status === 'completed' ? 'line-through' : 'none',
            }}>{t.text || 'Task'}</div>
            {showAgent && t.agent && (
              <div style={{ marginTop: 2 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase',
                  background: `${getAgentColor(t.agent)}18`, color: getAgentColor(t.agent),
                }}>{getAgentName(t.agent)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── COLUMN HEADER CONTEXT MENU ───────────────────────────────────────────────

function ColumnContextMenu({ position, slug, name, isAgent, onClose, onAction }) {
  const menuRef = useRef(null)
  const [adjusted, setAdjusted] = useState(position)

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose() }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick, { passive: true })
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const newPos = { ...position }
      if (rect.right > window.innerWidth - 8) newPos.x = window.innerWidth - rect.width - 8
      if (rect.bottom > window.innerHeight - 8) newPos.y = window.innerHeight - rect.height - 8
      if (newPos.x < 8) newPos.x = 8
      if (newPos.y < 8) newPos.y = 8
      setAdjusted(newPos)
    }
  }, [position])

  const items = isAgent ? [
    { id: 'open-chat', label: 'Open Chat' },
    { id: 'view-tasks', label: 'View Tasks' },
    { id: 'view-info', label: 'View Info' },
    { id: 'view-files', label: 'View Files' },
    { divider: true },
    { id: 'send-message', label: 'Send Message' },
    { divider: true },
    { id: 'restart-agent', label: 'Restart Agent', accent: true },
    { id: 'close-column', label: 'Close Column', danger: true },
  ] : [
    { id: 'view-tasks', label: 'View Tasks' },
    { id: 'add-task', label: 'Add Task' },
    { id: 'view-files', label: 'View Files' },
    { divider: true },
    { id: 'close-column', label: 'Close Column', danger: true },
  ]

  return (
    <div ref={menuRef} style={{
      position: 'fixed', left: adjusted.x, top: adjusted.y, zIndex: 9999,
      minWidth: 160, background: 'rgba(15,20,35,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(60,120,255,0.2)', borderRadius: 10, padding: '4px 0',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ padding: '6px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--bv-muted)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {name || slug}
      </div>
      {items.map((item, i) => item.divider ? (
        <div key={i} style={{ height: 1, background: 'rgba(60,120,255,0.1)', margin: '3px 8px' }} />
      ) : (
        <div
          key={item.id}
          onClick={() => { onAction(item.id); onClose() }}
          style={{
            padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: item.danger ? '#EF4444' : 'var(--bv-text2)', transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}

// ── ADD COLUMN BUTTON + SEARCH POPUP ─────────────────────────────────────────

function AddColumnButton({ allItems, visibleSlugs, onToggle }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [open])

  const filtered = allItems.filter(it =>
    !search || it.name?.toLowerCase().includes(search.toLowerCase()) || it.slug?.includes(search.toLowerCase())
  )
  const agents = filtered.filter(it => it.isAgent)
  const projects = filtered.filter(it => !it.isAgent)

  return (
    <div style={{ position: 'relative', alignSelf: 'flex-start', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 44, height: 44, borderRadius: 12,
          border: '2px dashed var(--bv-col-border)',
          background: 'transparent', color: 'var(--bv-dim)',
          fontSize: 22, fontWeight: 300, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', marginTop: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bv-accent-border)'; e.currentTarget.style.color = 'var(--bv-accent-text)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bv-col-border)'; e.currentTarget.style.color = 'var(--bv-dim)' }}
        title="Add agent or project"
      >+</button>

      {open && (
        <div ref={menuRef} style={{
          position: 'absolute', top: 0, left: 52, zIndex: 9999,
          width: 220, maxHeight: 360, background: 'rgba(15,20,35,0.95)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(60,120,255,0.2)', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(60,120,255,0.1)' }}>
            <input
              ref={inputRef}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search agents & projects..."
              style={{
                width: '100%', background: 'rgba(15,35,80,0.5)', border: '1px solid rgba(60,120,255,0.15)',
                borderRadius: 8, padding: '7px 10px', color: 'var(--bv-text)', fontSize: 12,
                fontFamily: "'Inter', sans-serif", outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {agents.length > 0 && (
              <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--bv-muted)', padding: '6px 12px 3px' }}>Agents</div>
            )}
            {agents.map(it => (
              <div
                key={it.slug}
                onClick={() => { onToggle(it.slug); setOpen(false); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `${it.color}22`, border: `1.5px solid ${it.color}60`, color: it.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                }}>{it.name?.charAt(0)}</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--bv-text2)' }}>{it.name}</div>
                {visibleSlugs.has(it.slug) && (
                  <span style={{ fontSize: 10, color: '#22C55E' }}>&#10003;</span>
                )}
              </div>
            ))}
            {projects.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(60,120,255,0.08)', margin: '4px 8px' }} />
                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--bv-muted)', padding: '6px 12px 3px' }}>Projects</div>
              </>
            )}
            {projects.map(it => (
              <div
                key={it.slug}
                onClick={() => { onToggle(it.slug); setOpen(false); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: `${it.color}22`, border: `1.5px solid ${it.color}60`, color: it.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                }}>{it.name?.charAt(0)}</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--bv-text2)' }}>{it.name}</div>
                {visibleSlugs.has(it.slug) && (
                  <span style={{ fontSize: 10, color: '#22C55E' }}>&#10003;</span>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12 }}>
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── AGENT COLUMN ─────────────────────────────────────────────────────────────

function AgentColumn({ agent, tasks, isMobile, onContextMenu, onClose, onDragStart, onDragOver, onDrop, isDragTarget, onHeaderContextMenu, allAgents, onSendToAgent }) {
  const chat = useColumnChat(agent.slug, true)
  const color = agent.color || getAgentColor(agent.slug)
  const status = agent.status || 'IDLE'
  const statusCfg = status === 'WORKING' ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22C55E', glow: true }
    : status === 'DONE' ? { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', color: '#3B82F6', glow: false }
    : { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', color: '#6B7280', glow: false }
  const [tab, setTab] = useState('chat')

  const handleHeaderCtx = (e) => {
    e.preventDefault()
    onHeaderContextMenu?.({ position: { x: e.clientX, y: e.clientY }, slug: agent.slug, name: agent.name || agent.slug, isAgent: true, setTab })
  }

  return (
    <div
      draggable={!isMobile}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(agent.slug) }}
      onDragOver={e => { e.preventDefault(); onDragOver?.(agent.slug) }}
      onDrop={e => { e.preventDefault(); onDrop?.(agent.slug) }}
      style={{
        display: 'flex', flexDirection: 'column',
        ...(isMobile ? { position: 'absolute', inset: 0 } : {
          minWidth: 320, maxWidth: 380, flex: '0 0 auto', borderRadius: 14,
          border: `1.5px solid ${isDragTarget ? 'var(--bv-accent-border)' : `${color}35`}`,
          background: isDragTarget ? 'var(--bv-accent)' : `color-mix(in srgb, ${color} 6%, var(--bv-col))`,
          backdropFilter: 'blur(8px)',
        }),
        transition: 'all 0.25s', overflow: 'hidden',
        animation: 'bvSlideIn 0.25s ease',
      }}
    >
      {/* Header -- right-click for context menu */}
      <div
        onContextMenu={handleHeaderCtx}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderBottom: '1px solid var(--bv-divider)', flexShrink: 0, position: 'relative',
          cursor: isMobile ? 'default' : 'grab',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '0 2px 2px 0', boxShadow: `0 0 8px ${color}40` }} />
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `${color}22`, border: `1.5px solid ${color}60`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {agent.name?.charAt(0) || agent.slug?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bv-text)' }}>{agent.name || agent.slug}</div>
          <div style={{ fontSize: 10, color: 'var(--bv-muted)' }}>{agent.role || ''}</div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 7px', borderRadius: 20,
          background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
          fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.1em', color: statusCfg.color,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: statusCfg.color, boxShadow: statusCfg.glow ? `0 0 5px ${statusCfg.color}` : 'none' }} />
          {status}
        </div>
        {!isMobile && (
          <button onClick={e => { e.stopPropagation(); onClose?.() }} style={{
            width: 20, height: 20, borderRadius: 5, border: '1px solid var(--bv-col-border)',
            background: 'transparent', color: 'var(--bv-dim)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Close column">&times;</button>
        )}
      </div>

      {/* Tabs */}
      <ColTabBar tabs={['chat', 'tasks', 'info', 'files']} active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === 'chat' && <ChatPanel chat={chat} agentName={agent.name || agent.slug} agentSlug={agent.slug} agentColor={color} allAgents={allAgents} onSendToAgent={onSendToAgent} />}
      {tab === 'tasks' && <TaskList tasks={tasks} onContextMenu={onContextMenu} />}
      {tab === 'info' && <InfoPanel slug={agent.slug} isAgent />}
      {tab === 'files' && <FilesTab agentSlug={agent.slug} clientId={getClientId()} />}
    </div>
  )
}

// ── PROJECT COLUMN ───────────────────────────────────────────────────────────

function ProjectColumn({ project, tasks, isMobile, onContextMenu, onAddTask, onClose, onDragStart, onDragOver, onDrop, isDragTarget, onHeaderContextMenu }) {
  const color = project.color || '#60A5FA'
  const [tab, setTab] = useState('tasks')
  const [newTaskText, setNewTaskText] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async e => {
    e?.preventDefault()
    if (!newTaskText.trim()) return
    setAdding(true)
    await onAddTask?.(newTaskText.trim(), project.slug)
    setNewTaskText('')
    setAdding(false)
  }

  const handleHeaderCtx = (e) => {
    e.preventDefault()
    onHeaderContextMenu?.({ position: { x: e.clientX, y: e.clientY }, slug: project.slug, name: project.name, isAgent: false, setTab })
  }

  return (
    <div
      draggable={!isMobile}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(project.slug) }}
      onDragOver={e => { e.preventDefault(); onDragOver?.(project.slug) }}
      onDrop={e => { e.preventDefault(); onDrop?.(project.slug) }}
      style={{
        display: 'flex', flexDirection: 'column',
        ...(isMobile ? { position: 'absolute', inset: 0 } : {
          minWidth: 320, maxWidth: 380, flex: '0 0 auto', borderRadius: 14,
          border: `1.5px solid ${isDragTarget ? 'var(--bv-accent-border)' : `${color}35`}`,
          background: isDragTarget ? 'var(--bv-accent)' : `color-mix(in srgb, ${color} 6%, var(--bv-col))`,
          backdropFilter: 'blur(8px)',
        }),
        transition: 'all 0.25s', overflow: 'hidden',
        animation: 'bvSlideIn 0.25s ease',
      }}
    >
      {/* Header -- right-click for context menu */}
      <div
        onContextMenu={handleHeaderCtx}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderBottom: '1px solid var(--bv-divider)', flexShrink: 0, position: 'relative',
          cursor: isMobile ? 'default' : 'grab',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '0 2px 2px 0', boxShadow: `0 0 8px ${color}40` }} />
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: `${color}22`, border: `1.5px solid ${color}60`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {project.name?.charAt(0) || 'P'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bv-text)' }}>{project.name}</div>
          <div style={{ fontSize: 10, color: 'var(--bv-muted)' }}>Project</div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--bv-dim)', background: 'var(--bv-badge)', padding: '2px 7px', borderRadius: 10,
        }}>{tasks.length}</span>
        {!isMobile && (
          <button onClick={e => { e.stopPropagation(); onClose?.() }} style={{
            width: 20, height: 20, borderRadius: 5, border: '1px solid var(--bv-col-border)',
            background: 'transparent', color: 'var(--bv-dim)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&times;</button>
        )}
      </div>

      {/* Tabs */}
      <ColTabBar tabs={['tasks', 'activity', 'info', 'files']} active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === 'tasks' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <form onSubmit={handleAdd} style={{
            display: 'flex', gap: 6, padding: '6px 12px', borderBottom: '1px solid var(--bv-divider)', flexShrink: 0,
          }}>
            <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Add task..." disabled={adding}
              style={{ flex: 1, background: 'var(--bv-input-bg)', border: '1.5px solid var(--bv-input-border)', borderRadius: 8, padding: '6px 10px', color: 'var(--bv-text)', fontSize: 12, fontFamily: "'Inter', sans-serif", outline: 'none' }}
            />
            <button type="submit" disabled={adding} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--bv-col-border)', background: 'transparent', color: 'var(--bv-accent-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+</button>
          </form>
          <TaskList tasks={tasks} onContextMenu={onContextMenu} showAgent />
        </div>
      )}
      {tab === 'activity' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic' }}>Activity feed coming soon</div>
      )}
      {tab === 'info' && <InfoPanel slug={project.slug} isAgent={false} />}
      {tab === 'files' && <FilesTab agentSlug={project.slug} clientId={getClientId()} />}
    </div>
  )
}

// ── RAIL AVATAR ──────────────────────────────────────────────────────────────

function RailAvatar({ slug, name, color, status, isAgent, isActive, unreadCount, taskCount, role, onClick, expanded }) {
  const statusRing = status === 'WORKING' ? '0 0 0 2px #22C55E, 0 0 8px rgba(34,197,94,0.25)'
    : status === 'DONE' ? '0 0 0 2px rgba(59,130,246,0.4)'
    : '0 0 0 2px rgba(107,114,128,0.3)'
  const statusColor = status === 'WORKING' ? '#22C55E' : status === 'DONE' ? '#3B82F6' : '#6B7280'
  const statusLabel = status === 'WORKING' ? 'Working' : status === 'DONE' ? 'Done' : 'Idle'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: expanded ? 'center' : 'center',
        flexDirection: expanded ? 'row' : 'column',
        gap: expanded ? 10 : 0,
        padding: expanded ? '6px 12px' : '4px 0',
        cursor: 'pointer', position: 'relative',
        borderRadius: expanded ? 8 : 0,
        transition: 'background 0.15s',
        ...(expanded ? {} : { justifyContent: 'center' }),
      }}
      onMouseEnter={e => { if (expanded) e.currentTarget.style.background = 'var(--bv-card)' }}
      onMouseLeave={e => { if (expanded) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: expanded ? 32 : 24, borderRadius: '0 3px 3px 0', background: 'var(--bv-accent-text)',
        }} />
      )}
      <div style={{
        width: expanded ? 36 : (isActive ? 36 : 32),
        height: expanded ? 36 : (isActive ? 36 : 32),
        borderRadius: isAgent ? '50%' : 10,
        background: `${color}${isActive ? '22' : '10'}`,
        border: `1.5px solid ${color}${isActive ? '60' : '30'}`,
        color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: expanded ? 15 : (isActive ? 14 : 12), fontWeight: 800,
        fontFamily: "'JetBrains Mono', monospace",
        opacity: isActive ? 1 : 0.45,
        boxShadow: isActive ? statusRing : 'none',
        transition: 'all 0.2s', position: 'relative', flexShrink: 0,
      }}>
        {name?.charAt(0) || slug?.charAt(0)?.toUpperCase() || '?'}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -4,
            minWidth: 15, height: 15, borderRadius: 8,
            background: '#F97316', border: '2px solid var(--bv-bg)',
            color: '#fff', fontSize: 8, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{unreadCount}</span>
        )}
      </div>
      {expanded ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: isActive ? 'var(--bv-text)' : 'var(--bv-dim)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{name || slug}</span>
            {taskCount > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: '#22C55E', background: 'rgba(34,197,94,0.12)',
                padding: '1px 5px', borderRadius: 8, flexShrink: 0,
              }}>{taskCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0,
              boxShadow: status === 'WORKING' ? `0 0 4px ${statusColor}` : 'none',
            }} />
            <span style={{
              fontSize: 10, color: statusColor, fontWeight: 600,
            }}>{statusLabel}</span>
            {role && (
              <span style={{ fontSize: 10, color: 'var(--bv-dim)', marginLeft: 2 }}>{role}</span>
            )}
          </div>
        </div>
      ) : (
        <span style={{
          fontSize: 7, fontWeight: 600, marginTop: 2,
          color: isActive ? 'var(--bv-accent-text)' : 'rgba(100,140,200,0.4)',
          maxWidth: 48, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name || slug}</span>
      )}
    </div>
  )
}

// ── MAIN BOARD VIEW ──────────────────────────────────────────────────────────

export default function BoardView({ pipeData, isMobile, isNightMode = true, hudHeight = 60, hasRightNow = false, onTaskTap, onViewDetail, onAgentSelect }) {
  const rightNow = pipeData?.rightNow || []
  const agents = pipeData?.agents || []
  const punchData = pipeData?.punchData || null
  const inboxItems = pipeData?.inboxItems || []
  const vars = cssVars(isNightMode)

  // Visible columns: set of slugs. Persisted to Supabase + localStorage fallback.
  // Default: AOM shows bobby/gary/elon, non-AOM shows all agents from pipeData
  const [visibleSlugs, setVisibleSlugs] = useState(() => {
    try { const s = localStorage.getItem('corner-board-visible'); if (s) return new Set(JSON.parse(s)) }
    catch {}
    // No saved prefs: show all agents from pipeData (scoped by client_id)
    if (agents.length > 0) return new Set(agents.map(a => a.slug))
    return new Set(['bobby', 'gary', 'elon']) // AOM fallback
  })

  // Column order: array of slugs. Persisted to Supabase + localStorage fallback.
  const [colOrder, setColOrder] = useState(() => {
    try { const s = localStorage.getItem('corner-board-order'); return s ? JSON.parse(s) : null }
    catch { return null }
  })

  // Load from Supabase on mount (overrides localStorage if found)
  useEffect(() => {
    const cid = getClientId()
    fetch(`/api/dashboard/preferences?key=board_visible&client=${encodeURIComponent(cid)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && Array.isArray(data.value)) {
          setVisibleSlugs(new Set(data.value))
          try { localStorage.setItem('corner-board-visible', JSON.stringify(data.value)) } catch {}
        }
      })
      .catch(() => {})
    fetch(`/api/dashboard/preferences?key=board_order&client=${encodeURIComponent(cid)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value && Array.isArray(data.value)) {
          setColOrder(data.value)
          try { localStorage.setItem('corner-board-order', JSON.stringify(data.value)) } catch {}
        }
      })
      .catch(() => {})
  }, [])

  // Persist visible + order to localStorage + Supabase (debounced)
  const saveTimerRef = useRef(null)
  useEffect(() => {
    try { localStorage.setItem('corner-board-visible', JSON.stringify([...visibleSlugs])) } catch {}
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const cid = getClientId()
      fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'board_visible', client_id: cid, value: [...visibleSlugs] }),
      }).catch(() => {})
    }, 1000)
  }, [visibleSlugs])
  const orderTimerRef = useRef(null)
  useEffect(() => {
    if (colOrder) try { localStorage.setItem('corner-board-order', JSON.stringify(colOrder)) } catch {}
    if (!colOrder) return
    clearTimeout(orderTimerRef.current)
    orderTimerRef.current = setTimeout(() => {
      const cid = getClientId()
      fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'board_order', client_id: cid, value: colOrder }),
      }).catch(() => {})
    }, 1000)
  }, [colOrder])

  // Send message to another agent (from right-click menu)
  const handleSendToAgent = useCallback(async (targetSlug, content, fromSlug) => {
    const cid = getClientId()
    const text = `[Forwarded from ${fromSlug}]: ${content}`
    try {
      const url = IS_LOCAL ? '/api/local/relay-send' : '/api/dashboard/supabase-messages'
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: targetSlug, text, message: text, source: 'corner-dashboard', client_id: cid }),
      })
    } catch {}
  }, [])

  // Context menu (tasks)
  const [ctxMenu, setCtxMenu] = useState(null)

  // Column header context menu
  const [headerCtx, setHeaderCtx] = useState(null) // { position, slug, name, isAgent, setTab }

  // Drag state
  const [dragSource, setDragSource] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)

  // Mobile active column index
  const [mobileIdx, setMobileIdx] = useState(0)

  // Build all rail items (agents + projects)
  const allItems = useMemo(() => {
    const agentItems = agents.map(a => ({
      slug: a.slug, name: a.name || getAgentName(a.slug), color: a.color || getAgentColor(a.slug),
      status: a.status || 'IDLE', role: a.role || '', isAgent: true,
      tasks: rightNow.filter(t => t.agent === a.slug),
    }))
    const projectItems = (punchData?.projects || []).map(p => ({
      slug: p.section, name: p.name, color: p.color || getAgentColor(p.section),
      status: null, role: 'Project', isAgent: false,
      tasks: (p.tasks || []).map(t => ({ ...t, project: p.section })),
    }))
    return [...agentItems, ...projectItems]
  }, [agents, rightNow, punchData])

  // Apply saved column order
  const orderedVisibleItems = useMemo(() => {
    const visItems = allItems.filter(it => visibleSlugs.has(it.slug))
    if (!colOrder) return visItems
    const map = Object.fromEntries(visItems.map(it => [it.slug, it]))
    const ordered = colOrder.filter(s => map[s]).map(s => map[s])
    const missing = visItems.filter(it => !colOrder.includes(it.slug))
    return [...ordered, ...missing]
  }, [allItems, visibleSlugs, colOrder])

  // Unread counts per agent
  const unreadMap = useMemo(() => {
    const m = {}
    for (const item of inboxItems) {
      if (item.agent) m[item.agent] = (m[item.agent] || 0) + 1
    }
    return m
  }, [inboxItems])

  // Rail search
  const [railSearch, setRailSearch] = useState('')

  // Rail expanded/collapsed state. Persisted. Mobile: collapsed by default.
  const [railOpen, setRailOpen] = useState(() => {
    if (isMobile) return false
    try { return localStorage.getItem('corner-board-rail') !== 'closed' } catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem('corner-board-rail', railOpen ? 'open' : 'closed') } catch {}
  }, [railOpen])

  // Toggle column visibility
  const toggleSlug = (slug) => {
    setVisibleSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  // Drag reorder
  const handleDragDrop = useCallback((targetSlug) => {
    if (!dragSource || dragSource === targetSlug) { setDragSource(null); setDragTarget(null); return }
    const slugs = orderedVisibleItems.map(it => it.slug)
    const srcIdx = slugs.indexOf(dragSource)
    const tgtIdx = slugs.indexOf(targetSlug)
    if (srcIdx < 0 || tgtIdx < 0) { setDragSource(null); setDragTarget(null); return }
    const newOrder = [...slugs]
    newOrder.splice(srcIdx, 1)
    newOrder.splice(tgtIdx, 0, dragSource)
    setColOrder(newOrder)
    setDragSource(null)
    setDragTarget(null)
  }, [dragSource, orderedVisibleItems])

  // Add task to project
  const handleAddTask = async (text, projectSlug) => {
    try {
      await fetch('/api/dashboard/agent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, project: projectSlug, agent: null, status: 'todo', client_id: getClientId() }),
      })
      pipeData?.refetch?.()
    } catch {}
  }

  const handleHeaderContextAction = (actionId) => {
    if (!headerCtx) return
    const { slug, setTab: columnSetTab } = headerCtx
    switch (actionId) {
      case 'open-chat': columnSetTab?.('chat'); break
      case 'view-tasks': columnSetTab?.('tasks'); break
      case 'view-info': columnSetTab?.('info'); break
      case 'view-files': columnSetTab?.('files'); break
      case 'add-task': columnSetTab?.('tasks'); break
      case 'send-message': columnSetTab?.('chat'); break
      case 'close-column': toggleSlug(slug); break
      case 'restart-agent': {
        // Write restart signal to Supabase events table
        const cid = getClientId()
        fetch('/api/dashboard/unstuck', { method: 'POST' }).catch(() => {})
        // Also try local restart if Vite is running
        fetch('/api/local/unstuck', { method: 'POST' }).catch(() => {})
        break
      }
    }
  }

  const handleContextMenu = (e, task) => {
    setCtxMenu({
      position: { x: e.clientX, y: e.clientY },
      task: {
        text: task.text || '', id: task.taskId || task.id || null,
        agent: task.agent || null, projectSection: task.project || task.projectSection || null,
        done: task.done === true || task.status === 'completed', status: task.status,
      },
    })
  }

  // Separate agents and projects for rail sections
  const railAgents = allItems.filter(it => it.isAgent)
  const railProjects = allItems.filter(it => !it.isAgent)

  // Mobile: visible items as array for tab switching
  const mobileItems = orderedVisibleItems
  const activeMobileItem = mobileItems[mobileIdx] || mobileItems[0]

  return (
    <div style={{
      ...vars, display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', background: 'var(--bv-bg)',
      overflow: 'hidden', transition: 'background 0.4s',
      paddingTop: isMobile ? `calc(${hudHeight + (hasRightNow ? 34 : 0)}px + env(safe-area-inset-top, 0px))` : hudHeight + (hasRightNow ? 34 : 0),
    }}>
      <style>{`
        @keyframes bvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes bvSlideIn { from { opacity: 0; transform: translateX(20px) scale(0.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        .bv-rail-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT RAIL -- collapsible */}
        {/* Collapsed: thin 20px strip with pull tab */}
        {/* Expanded: 200px with names, status, search */}
        <div style={{
          width: railOpen ? 200 : 20, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bv-rail)', borderRight: '1px solid var(--bv-divider)',
          transition: 'width 0.2s ease', overflow: 'hidden', position: 'relative',
        }}>
          {/* Toggle button */}
          <button
            onClick={() => setRailOpen(!railOpen)}
            style={{
              position: railOpen ? 'absolute' : 'relative',
              top: railOpen ? 6 : 6,
              right: railOpen ? 6 : 'auto',
              left: railOpen ? 'auto' : '50%',
              transform: railOpen ? 'none' : 'translateX(-50%)',
              width: 18, height: 18, borderRadius: 5,
              border: '1px solid var(--bv-col-border)',
              background: 'var(--bv-card)', color: 'var(--bv-dim)',
              fontSize: 10, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 2, flexShrink: 0, transition: 'all 0.15s',
            }}
            title={railOpen ? 'Collapse rail' : 'Expand rail'}
          >
            {railOpen ? '\u2039' : '\u203A'}
          </button>

          {/* Collapsed: just colored dots */}
          {!railOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '30px 0 6px' }}>
              {allItems.filter(it => visibleSlugs.has(it.slug)).map(it => (
                <div key={it.slug} style={{
                  width: 8, height: 8, borderRadius: it.isAgent ? '50%' : 2,
                  background: it.color || '#60A5FA', opacity: 0.7,
                  boxShadow: it.status === 'WORKING' ? `0 0 4px ${it.color}` : 'none',
                }} />
              ))}
              {/* Show notification pulse if any hidden agent has unread */}
              {allItems.some(it => !visibleSlugs.has(it.slug) && (unreadMap[it.slug] || 0) > 0) && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#F97316', marginTop: 4,
                  animation: 'bvPulse 1.5s infinite',
                }} />
              )}
            </div>
          )}

          {/* Expanded content */}
          {railOpen && (
            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1,
              overflowY: 'auto', overflowX: 'hidden',
              scrollbarWidth: 'none', msOverflowStyle: 'none',
              padding: '6px 0',
            }} className="bv-rail-scroll">
              {/* Search */}
              <div style={{ padding: '4px 8px 8px' }}>
                <input
                  value={railSearch} onChange={e => setRailSearch(e.target.value)}
                  placeholder="Search..."
                  style={{
                    width: '100%', background: 'var(--bv-input-bg)', border: '1px solid var(--bv-col-border)',
                    borderRadius: 8, padding: '6px 10px', color: 'var(--bv-text)', fontSize: 12,
                    fontFamily: "'Inter', sans-serif", outline: 'none',
                  }}
                />
              </div>

              {/* Agents section */}
              <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--bv-muted)', padding: '4px 12px 4px' }}>Team</div>
              {railAgents
                .filter(a => !railSearch || a.name?.toLowerCase().includes(railSearch.toLowerCase()) || a.slug?.includes(railSearch.toLowerCase()))
                .map(a => (
                <RailAvatar
                  key={a.slug} slug={a.slug} name={a.name} color={a.color}
                  status={a.status} isAgent isActive={visibleSlugs.has(a.slug)}
                  unreadCount={!visibleSlugs.has(a.slug) ? (unreadMap[a.slug] || 0) : 0}
                  taskCount={a.tasks?.length || 0}
                  role={a.role}
                  onClick={() => { toggleSlug(a.slug); if (isMobile) setMobileIdx(0) }}
                  expanded
                />
              ))}

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--bv-divider)', margin: '8px 12px' }} />

              {/* Projects section */}
              <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--bv-muted)', padding: '4px 12px 4px' }}>Projects</div>
              {railProjects
                .filter(p => !railSearch || p.name?.toLowerCase().includes(railSearch.toLowerCase()) || p.slug?.includes(railSearch.toLowerCase()))
                .map(p => (
                <RailAvatar
                  key={p.slug} slug={p.slug} name={p.name} color={p.color}
                  status={null} isAgent={false} isActive={visibleSlugs.has(p.slug)}
                  unreadCount={0} taskCount={p.tasks?.length || 0} role="Project"
                  onClick={() => { toggleSlug(p.slug); if (isMobile) setMobileIdx(0) }}
                  expanded
                />
              ))}
            </div>
          )}
        </div>

        {/* COLUMNS AREA */}
        {!isMobile ? (
          <div style={{ flex: 1, display: 'flex', gap: 10, padding: '12px 16px', overflowX: 'auto', overflowY: 'hidden' }}>
            {orderedVisibleItems.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--bv-dim)' }}>
                <div style={{ fontSize: 36, opacity: 0.2 }}>&#9776;</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Click agents or projects in the rail</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>Your view saves automatically</div>
              </div>
            )}
            {orderedVisibleItems.map(item => (
              item.isAgent ? (
                <AgentColumn
                  key={item.slug} agent={item} tasks={item.tasks} isMobile={false}
                  onContextMenu={handleContextMenu}
                  onClose={() => toggleSlug(item.slug)}
                  onDragStart={s => setDragSource(s)} onDragOver={s => setDragTarget(s)} onDrop={s => handleDragDrop(s)}
                  isDragTarget={dragTarget === item.slug && dragSource !== item.slug}
                  onHeaderContextMenu={setHeaderCtx}
                  allAgents={allItems.filter(it => it.isAgent)}
                  onSendToAgent={handleSendToAgent}
                />
              ) : (
                <ProjectColumn
                  key={item.slug} project={item} tasks={item.tasks} isMobile={false}
                  onContextMenu={handleContextMenu} onAddTask={handleAddTask}
                  onClose={() => toggleSlug(item.slug)}
                  onDragStart={s => setDragSource(s)} onDragOver={s => setDragTarget(s)} onDrop={s => handleDragDrop(s)}
                  isDragTarget={dragTarget === item.slug && dragSource !== item.slug}
                  onHeaderContextMenu={setHeaderCtx}
                />
              )
            ))}
            {/* Add column button */}
            <AddColumnButton allItems={allItems} visibleSlugs={visibleSlugs} onToggle={toggleSlug} />
          </div>
        ) : (
          /* Mobile: full-frame with tab bar */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Mobile tab bar */}
            <div style={{
              display: 'flex', gap: 2, padding: '6px 8px', overflowX: 'auto', flexShrink: 0,
              borderBottom: '1px solid var(--bv-divider)', background: 'var(--bv-bar2)',
              WebkitOverflowScrolling: 'touch',
            }}>
              {mobileItems.map((item, idx) => (
                <div
                  key={item.slug}
                  onClick={() => { setMobileIdx(idx); if (item.isAgent) onAgentSelect?.(item.slug) }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '3px 8px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                    border: `1.5px solid ${idx === mobileIdx ? 'var(--bv-accent-border)' : 'transparent'}`,
                    background: idx === mobileIdx ? 'var(--bv-accent)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: item.isAgent ? '50%' : 8,
                    background: `${item.color}22`, border: `1.5px solid ${item.color}60`, color: item.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {item.name?.charAt(0) || '?'}
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: idx === mobileIdx ? 'var(--bv-accent-text)' : 'var(--bv-muted)' }}>{item.name}</span>
                </div>
              ))}
              {/* Mobile + button */}
              <div
                onClick={() => setRailOpen(true)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '3px 8px', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '2px dashed var(--bv-col-border)', color: 'var(--bv-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 300,
                }}>+</div>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--bv-muted)' }}>Add</span>
              </div>
            </div>
            {/* Active column */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {activeMobileItem?.isAgent ? (
                <AgentColumn key={activeMobileItem.slug} agent={activeMobileItem} tasks={activeMobileItem.tasks} isMobile onContextMenu={handleContextMenu} onHeaderContextMenu={setHeaderCtx} allAgents={allItems.filter(it => it.isAgent)} onSendToAgent={handleSendToAgent} />
              ) : activeMobileItem ? (
                <ProjectColumn key={activeMobileItem.slug} project={activeMobileItem} tasks={activeMobileItem.tasks} isMobile onContextMenu={handleContextMenu} onAddTask={handleAddTask} onHeaderContextMenu={setHeaderCtx} />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bv-dim)', fontSize: 13 }}>
                  Tap an agent or project in the rail
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Context Menu */}
      {ctxMenu && (
        <TaskContextMenu
          task={ctxMenu.task} position={ctxMenu.position}
          onClose={() => setCtxMenu(null)}
          onAction={(action, payload) => { handleTaskContextAction(action, ctxMenu.task, payload); setCtxMenu(null); pipeData?.refetch?.() }}
          isNightMode={isNightMode}
        />
      )}

      {/* Column Header Context Menu */}
      {headerCtx && (
        <ColumnContextMenu
          position={headerCtx.position}
          slug={headerCtx.slug}
          name={headerCtx.name}
          isAgent={headerCtx.isAgent}
          onClose={() => setHeaderCtx(null)}
          onAction={handleHeaderContextAction}
        />
      )}
    </div>
  )
}
