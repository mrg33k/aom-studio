// BoardView.jsx -- Multi-Terminal Command Center v3
// Discord-style rail + fluid column toggle + tabs per column
// Data: pipeData from useDataPipe, messages from Supabase
// Same right-click context menu as sidebar (TaskContextMenu)

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import { AGENTS, PROJECTS } from './gridSpec.js'
import { getClientId } from './lib/clientConfig.js'
import { supabase } from './lib/supabase.js'
import TaskContextMenu, { handleTaskContextAction } from './components/TaskContextMenu.jsx'
import VoiceToggle from './components/VoiceToggle.jsx'
import VoiceChat from './components/VoiceChat.jsx'
import { getAgentKnowledge } from './agentKnowledge.js'
import agentProfiles from '../data/agent-profiles.js'
import { TypingIndicatorV2 } from './components/TypingIndicatorV2.jsx'
import FilesTab from './FilesTab.jsx'
import { useSkillAutocomplete } from './components/SkillAutocomplete.jsx'
import { useTasks } from './hooks/useTasks'

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
    // V5 depth system -- Steffen 2026-03-28
    '--bv-bg': '#060A12',
    '--bv-rail': '#0A1020',
    '--bv-bar': 'rgba(14,22,40,0.98)',
    '--bv-bar2': 'rgba(10,16,32,0.3)',
    '--bv-col': '#0E1628',
    '--bv-col-exp': '#121E34',
    '--bv-col-border': 'rgba(96,165,250,0.15)',
    '--bv-col-border-exp': 'rgba(96,165,250,0.35)',
    '--bv-card': '#121E34',
    '--bv-card-border': 'rgba(255,255,255,0.05)',
    '--bv-card-hover': '#162844',
    '--bv-divider': 'rgba(255,255,255,0.03)',
    '--bv-input-bg': '#0E1628',
    '--bv-input-border': 'rgba(255,255,255,0.06)',
    '--bv-chat-agent': '#121E34',
    '--bv-chat-user': 'rgba(59,130,246,0.15)',
    '--bv-text': '#F0F4FF',
    '--bv-text2': '#94A8C8',
    '--bv-muted': '#506480',
    '--bv-dim': '#2E4260',
    '--bv-accent': 'rgba(59,130,246,0.10)',
    '--bv-accent-border': 'rgba(96,165,250,0.35)',
    '--bv-accent-text': '#60A5FA',
    '--bv-badge': 'rgba(59,130,246,0.10)',
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

// ── READ RECEIPT PERSISTENCE ─────────────────────────────────────────────────
// Fire-and-forget PATCH to mark a message as read in Supabase.
// Only called when status reaches 'read' -- sent/delivered are transient.
function persistReadReceipt(msgId) {
  if (!msgId || IS_LOCAL) return
  fetch('/api/dashboard/supabase-messages', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: msgId, status: 'read' }),
  }).catch(() => {}) // fire and forget -- UI state is source of truth
}

// ── COLUMN CHAT HOOK ─────────────────────────────────────────────────────────

function useColumnChat(agentSlug, isActive) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const pollRef = useRef(null)
  const loadedRef = useRef(false)

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
          .filter(m => m.agent === agentSlug)
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
            if (src === 'poke_agent') return false
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
          .map(m => ({ id: m.id, role: m.role || 'assistant', content: m.text || '', time: m.timestamp || '', source: m.source, status: m.status || null }))
          .filter(m => m.content)
        // Infer 'read' for user messages that have a following assistant reply.
        // Fills the gap for messages saved before the status column was added.
        for (let i = 0; i < msgs.length; i++) {
          if (msgs[i].role === 'user' && !msgs[i].status) {
            const hasReply = msgs.slice(i + 1).some(m => m.role === 'assistant')
            if (hasReply) msgs[i] = { ...msgs[i], status: 'read' }
          }
        }
        setMessages(msgs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentSlug, isActive])

  // Continuous background poll: fetch new messages every 3s for live updates
  const bgPollRef = useRef(null)
  const lastBgTsRef = useRef(new Date().toISOString())
  useEffect(() => {
    if (!agentSlug || !isActive) return
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
          .filter(m => m.agent === agentSlug)
          .filter(m => {
            const src = (m.source || '').toLowerCase()
            if (src === 'terminal') return false
            if (src.startsWith('agent-')) return false
            if (src === 'corner-dashboard-task') return false
            if (src === 'task-creation') return false
            if (src === 'completion-hook') return false
            if (src === 'agent-status') return false
            if (src === 'poke_agent') return false
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
              updated = updated.map(m => {
                if (m.role === 'user' && m.status !== 'read') {
                  persistReadReceipt(m.id)
                  return { ...m, status: 'read' }
                }
                return m
              })
            }
            for (const row of newMsgs) {
              const msg = { id: row.id, role: row.role || 'assistant', content: row.text, time: row.timestamp, source: row.source }
              if (updated.some(m => m.id && m.id === msg.id)) continue
              if (updated.some(m => m.content === msg.content && Math.abs(new Date(m.time).getTime() - new Date(msg.time).getTime()) < 5000)) continue
              if (row.role !== 'user') updated = updated.filter(m => !m.streaming)
              updated.push(msg)
            }
            updated.sort((a, b) => new Date(a.time) - new Date(b.time))
            return updated
          })
          if (newMsgs.some(m => m.role === 'assistant')) setSending(false)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(bgPollRef.current)
  }, [agentSlug, isActive])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || sending) return
    const trimmed = text.trim()
    const sentTime = new Date().toISOString()
    const msgId = `usr-${Date.now()}`
    setInput('')
    // Step 1: single gray check (sent)
    setMessages(prev => {
      const cleaned = prev.filter(m => !m.streaming || m.content)
      return [...cleaned,
        { role: 'user', content: trimmed, time: sentTime, id: msgId, status: 'sent' },
      ]
    })
    setSending(true)

    const clientId = getClientId()
    const geminiHistory = messages
      .filter(m => m.content)
      .slice(-20)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    let geminiReply = null
    const geminiStart = Date.now()
    try {
      const geminiRes = await fetch('/api/dashboard/v2-gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          agent: agentSlug,
          history: geminiHistory,
          client_id: clientId || 'aom',
        }),
      })
      if (!geminiRes.ok) {
        const errText = await geminiRes.text().catch(() => '')
        throw new Error(`Gemini ${geminiRes.status}: ${errText}`)
      }
      const data = await geminiRes.json()
      const reply = typeof data?.reply === 'string' ? data.reply : ''
      geminiReply = reply || null
      // If a delete_messages function was called, reset local messages from Supabase
      const hadDelete = (data.functionCalls || []).some(c => c.name === 'delete_messages')
      if (hadDelete) {
        try {
          const cid = getClientId()
          const refetchUrl = IS_LOCAL
            ? `/api/local/conversations?agent=${encodeURIComponent(agentSlug)}&limit=50`
            : `/api/dashboard/supabase-messages?agent=${encodeURIComponent(agentSlug)}&limit=50&client=${encodeURIComponent(cid)}`
          const refetchRes = await fetch(refetchUrl)
          if (refetchRes.ok) {
            const refetchData = await refetchRes.json()
            const freshMsgs = (refetchData.messages || []).map(m => ({
              id: m.id, role: m.role || 'assistant', content: m.text, time: m.timestamp, source: m.source,
            }))
            setMessages(freshMsgs)
          }
        } catch (e) { /* silent */ }
      }
    } catch (err) {
      console.error('[v2-gemini-chat] Error:', err)
    }

    if (geminiReply) {
      const replyText = geminiReply
      const replyTime = new Date().toISOString()
      const elapsed = Date.now() - geminiStart
      const delay = Math.max(0, 800 - elapsed)

      // Pause background poll while showing Gemini response to prevent duplicates
      if (bgPollRef.current) { clearInterval(bgPollRef.current); bgPollRef.current = null }

      // Step 2: double gray check (delivered) -- min 800ms after send so the single check is visible
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'delivered' } : m))
      }, delay)

      // Step 3a: double blue check (read) -- show before response appears
      setTimeout(() => {
        setMessages(prev => prev.map(m => {
          if (m.role === 'user' && m.status !== 'read') {
            persistReadReceipt(m.id)
            return { ...m, status: 'read' }
          }
          return m
        }))
      }, delay)

      // Step 3b: after 600ms, show the actual response
      setTimeout(() => {
        setMessages(prev => {
          let u = prev.filter(m => !m.streaming)
          u.push({ role: 'assistant', content: replyText, time: replyTime, source: 'gemini' })
          return u
        })
        setSending(false)
        // Update background poll timestamp so it doesn't re-fetch this message
        lastBgTsRef.current = replyTime
        // Resume background poll after a short delay for Supabase write to settle
        setTimeout(() => {
          if (!bgPollRef.current) {
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
                  .filter(m => m.agent === agentSlug)
                  .filter(m => !['terminal','corner-dashboard-task','task-creation','completion-hook','agent-status','poke_agent'].includes((m.source||'').toLowerCase()) && !(m.source||'').toLowerCase().startsWith('agent-'))
                if (newMsgs.length > 0) {
                  lastBgTsRef.current = newMsgs[newMsgs.length - 1].timestamp
                  setMessages(prev => {
                    let updated = [...prev]
                    for (const row of newMsgs) {
                      const msg = { id: row.id, role: row.role || 'assistant', content: row.text, time: row.timestamp, source: row.source }
                      if (updated.some(m => m.id && m.id === msg.id)) continue
                      if (updated.some(m => m.content === msg.content && Math.abs(new Date(m.time).getTime() - new Date(msg.time).getTime()) < 5000)) continue
                      updated.push(msg)
                    }
                    updated.sort((a, b) => new Date(a.time) - new Date(b.time))
                    return updated
                  })
                }
              } catch {}
            }, 3000)
          }
        }, 5000)
      }, delay + 600)

      // Persist user + Gemini reply to Supabase (fire and forget)
      fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, text: trimmed, role: 'user', source: 'corner-dashboard', client_id: clientId }),
      }).catch(() => {})
      fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, text: replyText, role: 'assistant', source: 'gemini', client_id: clientId }),
      }).catch(() => {})

      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    try {
      const sendUrl = IS_LOCAL ? '/api/local/relay-send' : '/api/dashboard/supabase-messages'
      const sendStart = Date.now()
      await fetch(sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentSlug, text: trimmed, message: trimmed, source: 'corner-dashboard', client_id: clientId }),
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
          const newResp = (data.messages || []).filter(m => m.role === 'assistant' && m.timestamp > sentTime && m.agent === agentSlug)
          if (newResp.length > 0) {
            const latest = newResp[newResp.length - 1]
            // Step 3a: double blue check (read) -- show before response appears
            setMessages(prev => prev.map(m => {
              if (m.role === 'user' && m.status !== 'read') {
                persistReadReceipt(m.id)
                return { ...m, status: 'read' }
              }
              return m
            }))
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
          setSending(false)
          // Show timeout message so user isn't left hanging
          setMessages(prev => [...prev, { role: 'assistant', content: 'Agent is offline. Message saved and will be delivered when they reconnect.', time: new Date().toISOString(), source: 'system' }])
        }
      }, 30000)
    } catch {
      setMessages(prev => {
        const u = [...prev]
        const last = u[u.length - 1]
        if (last?.streaming) u[u.length - 1] = { ...last, content: 'Failed to send.', streaming: false }
        return u
      })
      setSending(false)
    }
  }, [agentSlug, messages, sending])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])
  return { messages, input, setInput, loading, sending, sendMessage }
}

// ── COLUMN TAB BAR ───────────────────────────────────────────────────────────

function ColTabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', borderBottom: '1px solid var(--bv-divider)', flexShrink: 0,
      padding: '5px 10px',
    }}>
      {tabs.map(t => (
        <div
          key={t}
          onClick={() => onChange(t)}
          style={{
            flex: 1, padding: '6px 0', textAlign: 'center',
            fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: active === t ? 'var(--bv-accent-text)' : 'var(--bv-dim)',
            borderRadius: 7, margin: '0 2px',
            background: active === t ? 'var(--bv-accent)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.18s',
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

// ── MESSAGE CONTENT RENDERER ─────────────────────────────────────────────────
// Renders plain text, [file](url) links, and inline images from agents/users

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|heic|heif)(\?.*)?$/i

function renderMessageContent(content) {
  if (!content) return null
  // Split on [file](url) or ![alt](url) patterns, render images inline
  const parts = []
  const pattern = /(!?\[([^\]]*)\]\((https?:\/\/[^)]+)\))/g
  let last = 0
  let match
  while ((match = pattern.exec(content)) !== null) {
    // Text before this match
    if (match.index > last) {
      const txt = content.slice(last, match.index).trim()
      if (txt) {
        // Linkify bare URLs in pre-match text too
        const urlRe = /(https?:\/\/[^\s<>"')\]]+)/g
        const tParts = txt.split(urlRe)
        if (tParts.length > 1) {
          tParts.forEach((p, j) => {
            if (urlRe.test(p)) {
              urlRe.lastIndex = 0
              parts.push(<a key={`tu-${last}-${j}`} href={p} target="_blank" rel="noopener noreferrer"
                style={{ color: '#60A5FA', textDecoration: 'underline', textUnderlineOffset: 2, wordBreak: 'break-all' }}
                onClick={e => e.stopPropagation()}>{p}</a>)
            } else if (p) {
              parts.push(<span key={`t-${last}-${j}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p}</span>)
            }
          })
        } else {
          parts.push(<span key={`t-${last}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{txt}</span>)
        }
      }
    }
    const isImage = match[1].startsWith('!') || IMAGE_EXTS.test(match[3])
    if (isImage) {
      parts.push(
        <img key={`img-${match.index}`} src={match[3]} alt={match[2] || 'image'}
          style={{ maxWidth: '100%', borderRadius: 8, marginTop: 6, display: 'block', cursor: 'pointer' }}
          onClick={() => window.open(match[3], '_blank')}
          onError={e => { e.target.style.display = 'none' }}
        />
      )
    } else {
      parts.push(<a key={`a-${match.index}`} href={match[3]} target="_blank" rel="noopener noreferrer"
        style={{ color: '#60A5FA', textDecoration: 'underline' }}>{match[2] || match[3]}</a>)
    }
    last = match.index + match[0].length
  }
  // Remaining text — also scan for bare image URLs
  const tail = content.slice(last)
  if (tail) {
    const urlPattern = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S*)?)/gi
    const tailParts = tail.split(urlPattern)
    tailParts.forEach((seg, i) => {
      if (IMAGE_EXTS.test(seg) && seg.startsWith('http')) {
        parts.push(<img key={`bi-${i}`} src={seg} alt="image"
          style={{ maxWidth: '100%', borderRadius: 8, marginTop: 6, display: 'block', cursor: 'pointer' }}
          onClick={() => window.open(seg, '_blank')}
          onError={e => { e.target.style.display = 'none' }}
        />)
      } else if (seg.trim()) {
        // Linkify bare URLs in remaining text
        const urlRe = /(https?:\/\/[^\s<>"')\]]+)/g
        const urlParts = seg.split(urlRe)
        urlParts.forEach((p, j) => {
          if (urlRe.test(p)) {
            urlRe.lastIndex = 0
            parts.push(<a key={`u-${i}-${j}`} href={p} target="_blank" rel="noopener noreferrer"
              style={{ color: '#60A5FA', textDecoration: 'underline', textUnderlineOffset: 2, wordBreak: 'break-all' }}
              onClick={e => e.stopPropagation()}>{p}</a>)
          } else if (p) {
            parts.push(<span key={`ts-${i}-${j}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p}</span>)
          }
        })
      }
    })
  }
  // Also linkify bare URLs in the fallback path
  if (parts.length === 0) {
    const urlRe = /(https?:\/\/[^\s<>"')\]]+)/g
    const fallbackParts = content.split(urlRe)
    if (fallbackParts.length > 1) {
      return fallbackParts.map((p, i) => {
        if (urlRe.test(p)) {
          urlRe.lastIndex = 0
          return <a key={`fu-${i}`} href={p} target="_blank" rel="noopener noreferrer"
            style={{ color: '#60A5FA', textDecoration: 'underline', textUnderlineOffset: 2, wordBreak: 'break-all' }}
            onClick={e => e.stopPropagation()}>{p}</a>
        }
        return p ? <span key={`ft-${i}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p}</span> : null
      })
    }
  }
  return parts.length > 0 ? parts : <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</span>
}

// ── CHAT PANEL (reused in agent columns) ─────────────────────────────────────

function ChatPanel({ chat, agentName, agentSlug, agentColor, allAgents, onSendToAgent }) {
  const ref = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const isUserScrolledUp = useRef(false)
  const color = agentColor || getAgentColor(agentSlug)
  const [msgCtx, setMsgCtx] = useState(null) // { x, y, content, role }
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  // Skill autocomplete
  const skillAC = useSkillAutocomplete(chat.input || '', chat.setInput)

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

  const doSend = async () => {
    const hasText = chat.input.trim()
    const hasFiles = pendingFiles.length > 0
    if (!hasText && !hasFiles) return

    let messageText = chat.input.trim()

    // Upload files if any
    if (hasFiles) {
      setUploading(true)
      const urls = []
      for (const file of pendingFiles) {
        try {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const ext = file.name.split('.').pop()
          // Use same path as FilesTab so uploads appear in Files tab immediately
          const storagePath = `${agentSlug}/${getClientId()}/chat-${id}.${ext}`
          const signRes = await fetch('/api/dashboard/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sign-upload', path: storagePath, contentType: file.type }),
          })
          if (signRes.ok) {
            const { uploadUrl } = await signRes.json()
            const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
            if (putRes.ok) {
              const supaUrl = import.meta.env.VITE_SUPABASE_URL || ''
              urls.push(`${supaUrl}/storage/v1/object/public/corner-files/${storagePath}`)
            }
          }
        } catch (err) {
          console.warn('[ChatPanel] Upload failed:', file.name, err)
        }
      }
      setPendingFiles([])
      setUploading(false)
      if (urls.length > 0) {
        const fileBlock = urls.map(u => `[file](${u})`).join('\n')
        messageText = messageText ? `${messageText}\n\n${fileBlock}` : fileBlock
      }
    }

    if (messageText) {
      chat.sendMessage(messageText)
      chat.setInput('')
      isUserScrolledUp.current = false
      setTimeout(scrollToBottom, 50)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}
      onClick={e => e.stopPropagation()}
    >
      <div ref={ref} onScroll={handleScroll} className="bv-col-scroll"
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
        onTouchStart={e => {
          const bubble = e.target.closest('[data-msg-idx]')
          if (bubble) {
            const touch = e.touches[0]
            const cx = touch?.clientX || 0, cy = touch?.clientY || 0
            ref.current._msgLp = setTimeout(() => {
              const idx = parseInt(bubble.dataset.msgIdx, 10)
              const m = chat.messages[idx]
              if (m && !m.streaming) {
                setMsgCtx({ x: cx, y: cy, content: m.content, role: m.role })
              }
            }, 500)
          }
        }}
        onTouchEnd={() => clearTimeout(ref.current?._msgLp)}
        onTouchMove={() => clearTimeout(ref.current?._msgLp)}
        style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0,
      }}>
        {chat.loading && <div style={{ textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, padding: 20 }}>Loading...</div>}
        {chat.messages.map((m, i) => (
          m.source === 'task-runner' ? (
            /* Task notification card -- centered, distinct from chat bubbles */
            <div key={m.id || i} style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
              {(() => { const isFail = m.content?.toLowerCase().includes('fail'); const c = isFail ? '239,68,68' : '34,197,94'; return (
              <div
                data-msg-idx={i}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                  maxWidth: '92%', width: '100%',
                  wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap',
                  background: `rgba(${c},0.06)`,
                  border: `1px solid rgba(${c},0.15)`,
                  borderLeft: `3px solid rgba(${c},0.5)`,
                  color: 'var(--bv-text2)',
                  cursor: 'context-menu',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isFail ? '#EF4444' : '#22C55E'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {isFail
                      ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                      : <polyline points="20 6 9 17 4 12"/>}
                  </svg>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', color: isFail ? '#EF4444' : '#22C55E' }}>
                    {isFail ? 'Task Failed' : 'Task Complete'}
                  </span>
                </div>
                <div>{renderMessageContent(m.content)}</div>
              </div>
              ); })()}
            </div>
          ) : (
            <div key={m.id || i} style={{
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
                  <div>{renderMessageContent(m.content)}</div>
                )}
                {/* WhatsApp-style read receipts on user messages */}
                {m.role === 'user' && m.status && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <ReadReceipt status={m.status} />
                  </div>
                )}
              </div>
            </div>
          )
        ))}
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


      {/* File preview strip */}
      {pendingFiles.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, padding: '6px 12px', borderTop: '1px solid var(--bv-divider)',
          background: 'var(--bv-bar)', overflowX: 'auto', flexShrink: 0,
        }}>
          {pendingFiles.map((file, i) => {
            const isImage = file.type.startsWith('image/')
            return (
              <div key={i} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 8, background: 'var(--bv-card)',
                border: '1px solid var(--bv-card-border)', fontSize: 11, color: 'var(--bv-text2)',
                maxWidth: 160, flexShrink: 0,
              }}>
                {isImage ? (
                  <img src={URL.createObjectURL(file)} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} style={{
                  position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%',
                  background: '#EF4444', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>x</button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 6, padding: '10px 12px', alignItems: 'center',
        borderTop: '1px solid rgba(59,130,246,0.15)', flexShrink: 0, background: 'var(--bv-bar)',
        minHeight: 52, position: 'relative',
      }}>
        {skillAC.dropdown}
        {/* + button: attach images/files */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md"
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files?.length) {
              setPendingFiles(prev => [...prev, ...Array.from(e.target.files)])
              e.target.value = ''
            }
          }}
        />
        <button
          type="button"
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
          style={{
            width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--bv-input-border)',
            background: 'var(--bv-input-bg)', color: 'var(--bv-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--bv-text)'; e.currentTarget.style.borderColor = 'var(--bv-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--bv-muted)'; e.currentTarget.style.borderColor = 'var(--bv-input-border)' }}
          title="Attach images or files"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <input
          ref={inputRef}
          value={chat.input}
          onChange={e => chat.setInput(e.target.value)}
          onKeyDown={e => { if (skillAC.onKeyDown(e)) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() } }}
          placeholder={`Message ${agentName}...`}
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
          disabled={uploading}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: chat.input?.trim() ? '#3B82F6' : 'rgba(59,130,246,0.12)',
            color: '#fff',
            cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            opacity: uploading ? 0.5 : 1,
            boxShadow: chat.input?.trim() ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {uploading ? (
            <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ── INFO PANEL ───────────────────────────────────────────────────────────────

const AGENT_TAGLINES = {
  bobby: "Ship it or it didn't happen",
  gary: "If it's not tracked, it didn't happen",
  elon: 'The machine runs because I run the machine',
  steffen: 'Every pixel is a decision',
  steve: 'Turn what we built into what they buy',
  cleo: 'Raw footage in, scroll-stoppers out',
  jacob: 'No means not yet',
  tony: "If it exists but isn't posted, it doesn't exist",
  alex: "Design the deal, don't just close it",
  elmo: "Ship nothing I haven't seen",
  pixel: 'Every frame, searchable',
  rex: 'I run the room',
}

const RECIPE_EMOJIS = ['⚡', '🔧', '🎯', '📦', '🚀', '🔍', '📊', '✂️']

function InfoPanel({ slug, isAgent }) {
  const knowledge = isAgent ? getAgentKnowledge(slug) : null
  const profile = isAgent ? agentProfiles.find(p => p.slug === slug) : null
  const tagline = AGENT_TAGLINES[slug] || null
  const agentColor = profile?.color || getAgentColor(slug)

  // Merge skills: union of profile + knowledge, deduped
  const profileSkills = profile?.skills || []
  const knowledgeSkills = knowledge?.skills || []
  const allSkills = [...new Set([...profileSkills, ...knowledgeSkills])]

  const recipes = profile?.recipes || []
  const personality = profile?.personality || null

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 14px' }}>

      {/* Tagline */}
      {tagline && (
        <div style={{ marginBottom: 14, textAlign: 'center', padding: '10px 12px', borderRadius: 8, background: `${agentColor}10`, border: `1px solid ${agentColor}30` }}>
          <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: agentColor, letterSpacing: '0.03em', fontStyle: 'italic' }}>
            "{tagline}"
          </div>
        </div>
      )}

      {/* Personality speech bubble */}
      {personality && (
        <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'var(--bv-card)', border: '1px solid var(--bv-card-border)', borderLeft: `3px solid ${agentColor}`, fontSize: 12, color: 'var(--bv-text2)', lineHeight: 1.5 }}>
          {personality}
        </div>
      )}

      {/* Skills */}
      {allSkills.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 6 }}>Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allSkills.map(s => (
              <span
                key={s}
                style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", padding: '3px 8px', borderRadius: 12, background: 'var(--bv-badge)', border: `1px solid ${agentColor}40`, color: 'var(--bv-accent-text)', cursor: 'default', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = agentColor + '22'; e.currentTarget.style.boxShadow = `0 0 8px ${agentColor}50` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bv-badge)'; e.currentTarget.style.boxShadow = 'none' }}
              >/{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recipes */}
      {recipes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 6 }}>Recipes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recipes.map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bv-card)', border: '1px solid var(--bv-card-border)', cursor: 'default', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = agentColor + '60' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bv-card-border)' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bv-text)', marginBottom: 3 }}>{RECIPE_EMOJIS[i % RECIPE_EMOJIS.length]} {r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--bv-text2)', lineHeight: 1.4 }}>{r.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Superpower */}
      {knowledge?.superpower && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Superpower</div>
          <div style={{ fontSize: 12, color: 'var(--bv-text2)', lineHeight: 1.5, fontStyle: 'italic', padding: '7px 10px', borderRadius: 6, borderLeft: '2px solid var(--bv-accent-border)', background: 'var(--bv-card)' }}>
            {knowledge.superpower}
          </div>
        </div>
      )}

      {/* Owns */}
      {knowledge?.owns && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Owns</div>
          <div style={{ fontSize: 12, color: 'var(--bv-text2)' }}>{knowledge.owns}</div>
        </div>
      )}

      {/* Strengths */}
      {knowledge?.strengths?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Strengths</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {knowledge.strengths.map((s, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--bv-text2)', lineHeight: 1.4, paddingLeft: 8, borderLeft: '2px solid var(--bv-col-border)' }}>{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {knowledge?.gaps?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--bv-muted)', marginBottom: 5 }}>Watch Out For</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {knowledge.gaps.map((g, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--bv-text2)', lineHeight: 1.4, paddingLeft: 8, borderLeft: '2px solid var(--bv-col-border)' }}>{g}</div>
            ))}
          </div>
        </div>
      )}

      {!knowledge && !profile && (
        <div style={{ color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
          {isAgent ? 'Knowledge base coming soon.' : 'Project details coming soon.'}
        </div>
      )}
    </div>
  )
}

// ── TASK LIST (reused in both agent Tasks tab and project columns) ───────────

function TaskList({ tasks, onContextMenu, showAgent = false }) {
  const [expanded, setExpanded] = useState({ rightNow: true, completed: false, projects: {} })
  const [detailId, setDetailId] = useState(null)

  const TaskItem = ({ t }) => {
    const key = t.taskId || t.id || t.text
    const isDone = t.done || t.status === 'completed'
    const isOpen = detailId === key
    return (
      <div
        key={key}
        onClick={() => setDetailId(isOpen ? null : key)}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(e, t) }}
        onTouchStart={e => {
          const touch = e.touches[0]
          const cx = touch?.clientX || 0, cy = touch?.clientY || 0
          e.currentTarget._lp = setTimeout(() => {
            onContextMenu?.({ clientX: cx, clientY: cy, preventDefault: () => {} }, t)
          }, 500)
        }}
        onTouchEnd={e => clearTimeout(e.currentTarget._lp)}
        onTouchMove={e => clearTimeout(e.currentTarget._lp)}
        style={{
          padding: '10px 12px', borderRadius: 10, background: isOpen ? 'var(--bv-card-hover)' : 'var(--bv-card)', border: `1px solid ${isOpen ? 'var(--bv-col-border)' : 'var(--bv-card-border)'}`,
          marginBottom: 5, cursor: 'pointer', transition: 'all 0.2s',
          opacity: isDone ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bv-card-hover)'; e.currentTarget.style.transform = 'translateX(2px)' }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bv-card)'; e.currentTarget.style.transform = 'translateX(0)' }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3, marginTop: 1, flexShrink: 0,
            border: `1.5px solid ${isDone ? '#22C55E' : 'var(--bv-col-border)'}`,
            background: isDone ? 'rgba(34,197,94,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isDone && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, color: 'var(--bv-text2)', lineHeight: 1.4,
              textDecoration: isDone ? 'line-through' : 'none',
            }}>{t.text || 'Task'}</div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--bv-muted)', flexShrink: 0, marginTop: 2 }}>{isOpen ? '▾' : '▸'}</span>
        </div>
        {isOpen && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--bv-card-border)', fontSize: 12, color: 'var(--bv-text2)', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {t.agent && (
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                  background: `${getAgentColor(t.agent)}18`, color: getAgentColor(t.agent),
                }}>{getAgentName(t.agent)}</span>
              )}
              {(t.project || t.projectSource) && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                  background: `${t.projectColor || '#888'}18`, color: t.projectColor || '#888',
                }}>{t.project || t.projectSource}</span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                background: isDone ? 'rgba(34,197,94,0.12)' : t.isLive ? 'rgba(255,107,61,0.12)' : 'rgba(255,255,255,0.06)',
                color: isDone ? '#22C55E' : t.isLive ? '#FF6B3D' : 'var(--bv-muted)',
              }}>{isDone ? 'Completed' : t.isLive ? 'Live' : 'To Do'}</span>
            </div>
            {t.text && t.text.length > 52 && (
              <div style={{ color: 'var(--bv-dim)', fontSize: 11, marginTop: 4 }}>{t.text}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const AccordionSection = ({ title, isOpen, onToggle, tasks: sectionTasks, alwaysExpanded = false }) => (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => !alwaysExpanded && onToggle()}
        style={{
          padding: '10px 12px', borderRadius: 8, background: 'var(--bv-card)', border: '1px solid var(--bv-card-border)',
          cursor: alwaysExpanded ? 'default' : 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none',
        }}
        onMouseEnter={e => { if (!alwaysExpanded) e.currentTarget.style.background = 'var(--bv-card-hover)' }}
        onMouseLeave={e => { if (!alwaysExpanded) e.currentTarget.style.background = 'var(--bv-card)' }}
      >
        {!alwaysExpanded && (
          <span style={{ fontSize: 12, color: 'var(--bv-text2)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bv-text2)', flex: 1 }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--bv-muted)', background: 'var(--bv-badge)', padding: '2px 6px', borderRadius: 4 }}>{sectionTasks.length}</span>
      </div>
      {(isOpen || alwaysExpanded) && (
        <div style={{ paddingTop: 6 }}>
          {sectionTasks.length === 0 ? (
            <div style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--bv-dim)', fontSize: 11, fontStyle: 'italic' }}>No tasks</div>
          ) : (
            sectionTasks.map(t => <TaskItem t={t} key={t.taskId || t.id || t.text} />)
          )}
        </div>
      )}
    </div>
  )

  // Right Now: live tasks + last 5 completed inline
  const liveTasks = tasks.filter(t => t._source === 'rightNow')
  const allCompleted = tasks.filter(t => t._source === 'completed')
  // Dedupe completed (recentCompleted items are duplicated in the full list)
  const seenIds = new Set()
  const uniqueCompleted = allCompleted.filter(t => {
    const key = t.id || t.text
    if (seenIds.has(key)) return false
    seenIds.add(key)
    return true
  })
  const recentCompleted = uniqueCompleted.slice(0, 5)
  const rightNowSection = [...liveTasks, ...recentCompleted]

  // Projects: todo tasks grouped by project name
  const todoTasks = tasks.filter(t => t._source === 'todo')
  const projectMap = {}
  todoTasks.forEach(t => {
    const proj = t.project || t.projectSection || 'General'
    if (!projectMap[proj]) projectMap[proj] = []
    projectMap[proj].push(t)
  })
  const projectNames = Object.keys(projectMap).sort((a, b) => {
    const aLen = projectMap[a]?.length || 0
    const bLen = projectMap[b]?.length || 0
    return bLen - aLen
  })

  if (tasks.length === 0) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '16px 4px', textAlign: 'center', color: 'var(--bv-dim)', fontSize: 12, fontStyle: 'italic' }}>No tasks yet</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 12px' }}>
      <AccordionSection
        title="Right Now"
        isOpen={expanded.rightNow}
        onToggle={() => setExpanded(prev => ({ ...prev, rightNow: !prev.rightNow }))}
        tasks={rightNowSection}
        alwaysExpanded={true}
      />
      {uniqueCompleted.length > 0 && (
        <AccordionSection
          title="Completed"
          isOpen={expanded.completed}
          onToggle={() => setExpanded(prev => ({ ...prev, completed: !prev.completed }))}
          tasks={uniqueCompleted}
        />
      )}
      {projectNames.map(proj => (
        <AccordionSection
          key={proj}
          title={proj}
          isOpen={expanded.projects[proj] || false}
          onToggle={() => setExpanded(prev => ({
            ...prev,
            projects: { ...prev.projects, [proj]: !prev.projects[proj] }
          }))}
          tasks={projectMap[proj]}
        />
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
  const navigate = useNavigate()
  const color = agent.color || getAgentColor(agent.slug)
  const status = agent.status || 'IDLE'
  const statusCfg = status === 'WORKING' ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#22C55E', glow: true }
    : status === 'DONE' ? { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', color: '#3B82F6', glow: false }
    : { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', color: '#6B7280', glow: false }
  const [tab, setTab] = useState('chat')
  const [pokeState, setPokeState] = useState(null) // null | 'poking' | 'poked'

  const handlePoke = async (e) => {
    e.stopPropagation()
    if (pokeState) return
    setPokeState('poking')
    try {
      await fetch(`/api/dashboard/poke-agent?agent=${encodeURIComponent(agent.slug)}`)
    } catch {}
    setPokeState('poked')
    setTimeout(() => setPokeState(null), 2500)
  }

  const pokeCfg = pokeState === 'poked'
    ? { bg: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.45)', color: '#A78BFA', label: 'POKED', glow: true }
    : pokeState === 'poking'
    ? { ...statusCfg, label: '...' }
    : { ...statusCfg, label: status }

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
          border: `1px solid ${isDragTarget ? 'var(--bv-accent-border)' : 'rgba(255,255,255,0.04)'}`,
          background: isDragTarget ? 'var(--bv-accent)' : `color-mix(in srgb, ${color} 5%, var(--bv-col))`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        }),
        transition: 'all 0.25s', overflow: 'hidden',
        animation: 'bvSlideIn 0.25s ease',
      }}
    >
      {/* Header -- right-click for context menu */}
      <div
        onContextMenu={handleHeaderCtx}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, position: 'relative',
          cursor: isMobile ? 'default' : 'grab',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '0 2px 2px 0', boxShadow: `0 0 10px ${color}50` }} />
        {/* V5: 36px rounded-square avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}18`, border: `1.5px solid ${color}45`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, fontFamily: "'Inter Tight', 'Inter', sans-serif",
          flexShrink: 0,
        }}>
          {agent.name?.charAt(0) || agent.slug?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* V5: name in Inter Tight */}
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bv-text)', fontFamily: "'Inter Tight', 'Inter', sans-serif", letterSpacing: '0.01em', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
            {agent.name || agent.slug}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/dashboard/agent/${agent.slug}/info`) }}
              title="Agent Info"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--bv-dim)', opacity: 0.5, transition: 'opacity 120ms, color 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = color }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--bv-dim)' }}
            >
              <Info size={13} />
            </button>
          </div>
          {/* V5: role in JetBrains Mono */}
          {agent.role && <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--bv-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{agent.role}</div>}
        </div>
        {/* V5: status pill -- tappable poke button */}
        <button
          onClick={handlePoke}
          title={`Poke ${agent.name || agent.slug}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20,
            background: pokeCfg.bg, border: `1px solid ${pokeCfg.border}`,
            fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.06em', color: pokeCfg.color,
            flexShrink: 0, cursor: pokeState ? 'default' : 'pointer',
            outline: 'none', transition: 'all 0.2s ease',
            animation: pokeState === 'poked' ? 'bvPokeFlash 0.45s ease' : 'none',
          }}
        >
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: pokeCfg.color,
            boxShadow: pokeCfg.glow ? `0 0 6px ${pokeCfg.color}` : 'none',
            flexShrink: 0,
            animation: pokeState === 'poked' ? 'bvPulse 0.4s ease 2' : 'none',
          }} />
          {pokeCfg.label}
        </button>
        {!isMobile && (
          <button onClick={e => { e.stopPropagation(); onClose?.() }} style={{
            width: 20, height: 20, borderRadius: 5, border: '1px solid var(--bv-col-border)',
            background: 'transparent', color: 'var(--bv-dim)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Close column">&times;</button>
        )}
      </div>

      {/* Tabs */}
      <ColTabBar tabs={['chat', 'files', 'tasks', 'info']} active={tab} onChange={setTab} />

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
          border: `1px solid ${isDragTarget ? 'var(--bv-accent-border)' : 'rgba(255,255,255,0.04)'}`,
          background: isDragTarget ? 'var(--bv-accent)' : `color-mix(in srgb, ${color} 5%, var(--bv-col))`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.03)`,
        }),
        transition: 'all 0.25s', overflow: 'hidden',
        animation: 'bvSlideIn 0.25s ease',
      }}
    >
      {/* Header -- right-click for context menu */}
      <div
        onContextMenu={handleHeaderCtx}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0, position: 'relative',
          cursor: isMobile ? 'default' : 'grab',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '0 2px 2px 0', boxShadow: `0 0 10px ${color}50` }} />
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}18`, border: `1.5px solid ${color}45`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, fontFamily: "'Inter Tight', 'Inter', sans-serif",
          flexShrink: 0,
        }}>
          {project.name?.charAt(0) || 'P'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--bv-text)', fontFamily: "'Inter Tight', 'Inter', sans-serif", letterSpacing: '0.01em', lineHeight: 1.2 }}>{project.name}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--bv-muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>Project</div>
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
        borderRadius: 10,
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

export default function BoardView({ pipeData, isMobile, isNightMode = true, hudHeight = 60, hasRightNow = false, unreadAgents = {}, onTaskTap, onViewDetail, onAgentSelect, currentUser }) {
  const { rightNow: v2RightNow, queued: v2Queued, done: v2Done } = useTasks()
  const rightNow = (v2RightNow.length > 0 ? v2RightNow : (pipeData?.rightNow || [])).map(t => ({
    ...t,
    agent: t.agent || t.agentIdentity || t.agent_identity || null,
    text: t.text || t.title || t.description || '',
  }))
  const agents = pipeData?.agents || []
  const punchData = pipeData?.punchData || null
  const inboxItems = pipeData?.inboxItems || []
  const personalTodos = pipeData?.personalTodos || []
  const completedFeed = pipeData?.completedFeed || []

  // Build per-agent task index from punchData (Supabase tasks table)
  const agentTasks = useMemo(() => {
    const map = {}
    if (!punchData?.projects) return map
    for (const proj of punchData.projects) {
      for (const t of (proj.tasks || [])) {
        if (!t.agent) continue
        if (!map[t.agent]) map[t.agent] = { completed: [], todo: [], projects: {} }
        if (t.done || t.status === 'completed') {
          map[t.agent].completed.push({ ...t, _source: 'completed', project: proj.name })
        } else {
          map[t.agent].todo.push({ ...t, _source: 'todo', project: proj.name })
          const pName = proj.name || proj.section || 'General'
          if (!map[t.agent].projects[pName]) map[t.agent].projects[pName] = []
          map[t.agent].projects[pName].push({ ...t, _source: 'todo', project: pName })
        }
      }
    }
    // Sort completed by most recent
    for (const slug of Object.keys(map)) {
      map[slug].completed.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
    }
    return map
  }, [punchData])
  const vars = cssVars(isNightMode)

  // Visible columns: set of slugs. Persisted to Supabase + localStorage fallback.
  // Default: AOM shows bobby/gary/elon, non-AOM shows all agents from pipeData
  const [visibleSlugs, setVisibleSlugs] = useState(() => {
    try { const s = localStorage.getItem('corner-board-visible'); if (s) return new Set(JSON.parse(s)) }
    catch {}
    // Check user metadata for default_visible (set during account creation)
    const userDefaults = currentUser?.user_metadata?.default_visible
    if (userDefaults && Array.isArray(userDefaults) && userDefaults.length > 0) return new Set(userDefaults)
    // No saved prefs: show all agents from pipeData (scoped by client_id)
    if (agents.length > 0) return new Set(agents.map(a => a.slug))
    return new Set(['rex', 'bobby', 'gary', 'elon']) // AOM fallback
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

  // Voice chat panel visibility
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)
  const handleVoiceChatToggle = () => setIsVoiceChatActive(prev => !prev)

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
      tasks: (() => {
        const at = agentTasks[a.slug] || { completed: [], todo: [], projects: {} }
        const live = rightNow.filter(t => t.agent === a.slug).map(t => ({ ...t, _source: 'rightNow' }))
        // Last 5 completed inline with Right Now
        const recentCompleted = at.completed.slice(0, 5).map(t => ({ ...t, _source: 'completed', done: true }))
        // All completed for the Completed section
        const allCompleted = at.completed.map(t => ({ ...t, _source: 'completed', done: true }))
        // Todo tasks tagged by project
        const todoTasks = at.todo.map(t => ({ ...t, _source: 'todo' }))
        if (a.slug === 'patrik') {
          return [
            ...live,
            ...personalTodos.map(t => ({ ...t, _source: 'todo' })),
            ...allCompleted,
          ]
        }
        return [...live, ...recentCompleted, ...allCompleted, ...todoTasks]
      })(),
    }))
    const projectItems = (punchData?.projects || []).map(p => ({
      slug: p.section, name: p.name, color: p.color || getAgentColor(p.section),
      status: null, role: 'Project', isAgent: false,
      tasks: (p.tasks || []).map(t => ({ ...t, project: p.section })),
    }))
    return [...agentItems, ...projectItems]
  }, [agents, rightNow, punchData, personalTodos, completedFeed, agentTasks])

  // Apply saved column order
  const orderedVisibleItems = useMemo(() => {
    const visItems = allItems.filter(it => visibleSlugs.has(it.slug))
    if (!colOrder) return visItems
    const map = Object.fromEntries(visItems.map(it => [it.slug, it]))
    const ordered = colOrder.filter(s => map[s]).map(s => map[s])
    const missing = visItems.filter(it => !colOrder.includes(it.slug))
    return [...ordered, ...missing]
  }, [allItems, visibleSlugs, colOrder])

  // Unread counts per agent (merge poll-based inboxItems + Realtime unreadAgents)
  const unreadMap = useMemo(() => {
    const m = {}
    for (const item of inboxItems) {
      if (item.agent) m[item.agent] = (m[item.agent] || 0) + 1
    }
    // Merge Realtime counts (take max of either source)
    for (const [slug, count] of Object.entries(unreadAgents)) {
      m[slug] = Math.max(m[slug] || 0, count)
    }
    return m
  }, [inboxItems, unreadAgents])

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

  // Reset agents
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const handleResetAgents = async () => {
    if (resetting) return
    setResetting(true)
    setResetResult(null)
    try {
      const clientId = typeof getClientId === 'function' ? getClientId() : 'aom'
      await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'system',
          text: 'restart_agents agents: ["elon", "bobby", "gary", "rex"]',
          role: 'user',
          source: 'restart_agents',
          client_id: clientId,
        }),
      })
      setResetResult('sent')
      setTimeout(() => setResetResult(null), 4000)
    } catch (e) {
      setResetResult('error')
      setTimeout(() => setResetResult(null), 4000)
    } finally {
      setTimeout(() => setResetting(false), 3000)
    }
  }

  // Sleep/Wake agents
  const [agentsSleeping, setAgentsSleeping] = useState(false)
  const handleSleepWake = async () => {
    const newState = !agentsSleeping
    try {
      const clientId = typeof getClientId === 'function' ? getClientId() : 'aom'
      await fetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'system',
          text: newState ? 'sleep_agents' : 'wake_agents',
          role: 'user',
          source: newState ? 'sleep_agents' : 'wake_agents',
          client_id: clientId,
        }),
      })
      setAgentsSleeping(newState)
    } catch (e) {
      console.error('Sleep/wake failed:', e)
    }
  }

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
      paddingTop: isMobile ? `calc(${hudHeight}px + env(safe-area-inset-top, 0px))` : hudHeight,
      // Bottom: no fixed bar below BoardView (GameHUD disabled, Now Bar is a flex child in GameDashboard).
      // When Now Bar is present it owns its own space as flex child -- no padding needed.
      // When no Now Bar: add SAI-bottom on mobile to cover home indicator.
      paddingBottom: (isMobile && !hasRightNow) ? 'env(safe-area-inset-bottom, 0px)' : 0,
    }}>
      <style>{`
        @keyframes bvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes bvSlideIn { from { opacity: 0; transform: translateX(20px) scale(0.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes bvPokeFlash { 0% { transform: scale(1); } 40% { transform: scale(1.15); } 100% { transform: scale(1); } }
        .bv-rail-scroll::-webkit-scrollbar { display: none; }
        .bv-col-scroll::-webkit-scrollbar { width: 4px; }
        .bv-col-scroll::-webkit-scrollbar-track { background: transparent; }
        .bv-col-scroll::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.15); border-radius: 3px; }
        .bv-col-scroll::-webkit-scrollbar-thumb:hover { background: rgba(96,165,250,0.25); }
        .bv-columns-area::-webkit-scrollbar { height: 4px; }
        .bv-columns-area::-webkit-scrollbar-track { background: transparent; }
        .bv-columns-area::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.12); border-radius: 3px; }
      `}</style>

      {/* V5 board background: radial gradients over void */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 15% 50%, rgba(59,130,246,0.03) 0%, transparent 50%), radial-gradient(ellipse at 85% 30%, rgba(168,85,247,0.02) 0%, transparent 50%)',
      }}>

        {/* LEFT RAIL -- collapsible. V5: 56px collapsed, 280px expanded */}
        <div style={{
          width: railOpen ? 280 : 56, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bv-rail)', borderRight: '1px solid var(--bv-divider)',
          transition: 'width 0.28s cubic-bezier(0.34,1.56,0.64,1)', overflow: 'hidden', position: 'relative',
        }}>

          {/* Collapsed: V5 avatar initials with status dots */}
          {!railOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 0 8px', flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', paddingBottom: 54 }}>
              {allItems.map(it => (
                <div key={it.slug}
                  onClick={() => { toggleSlug(it.slug); if (isMobile) setMobileIdx(0) }}
                  title={it.name || it.slug}
                  style={{
                    width: 36, height: 36, borderRadius: it.isAgent ? 10 : 8,
                    background: visibleSlugs.has(it.slug) ? `${it.color}20` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${visibleSlugs.has(it.slug) ? `${it.color}50` : 'rgba(255,255,255,0.06)'}`,
                    color: visibleSlugs.has(it.slug) ? it.color : 'var(--bv-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, fontFamily: "'Inter Tight', 'Inter', sans-serif",
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'all 0.15s',
                    boxShadow: it.status === 'WORKING' && visibleSlugs.has(it.slug) ? `0 0 8px ${it.color}40` : 'none',
                  }}
                >
                  {(it.name || it.slug)?.charAt(0)?.toUpperCase()}
                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 9, height: 9, borderRadius: '50%',
                    border: '2px solid var(--bv-rail)',
                    background: it.status === 'WORKING' ? '#22C55E' : it.status === 'DONE' ? '#3B82F6' : '#4B5563',
                    boxShadow: it.status === 'WORKING' ? '0 0 5px #22C55E' : 'none',
                  }} />
                  {/* Unread badge */}
                  {!visibleSlugs.has(it.slug) && (unreadMap[it.slug] || 0) > 0 && (
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: '#E85D26', color: '#fff',
                      fontSize: 8, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                    }}>{unreadMap[it.slug]}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Expanded content */}
          {railOpen && (
            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1,
              overflowY: 'auto', overflowX: 'hidden',
              scrollbarWidth: 'none', msOverflowStyle: 'none',
              padding: '6px 0', paddingBottom: 54,
            }} className="bv-rail-scroll">
              {/* Search */}
              <div style={{ padding: '4px 8px 8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7, height: 34,
                  background: 'var(--bv-input-bg)', border: '1px solid var(--bv-col-border)',
                  borderRadius: 9, padding: '0 10px', transition: 'border-color 0.15s',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: 'var(--bv-muted)', flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    value={railSearch} onChange={e => setRailSearch(e.target.value)}
                    placeholder="Search..."
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      color: 'var(--bv-text)', fontSize: 12,
                      fontFamily: "'Inter', sans-serif", outline: 'none', minWidth: 0,
                    }}
                  />
                  {railSearch && (
                    <button onClick={() => setRailSearch('')} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--bv-muted)', fontSize: 11, padding: 0, lineHeight: 1,
                    }}>×</button>
                  )}
                </div>
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

          {/* V5: Bottom rail controls -- collapse + reset */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
            padding: '8px', borderTop: '1px solid var(--bv-divider)',
            background: 'var(--bv-rail)', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {/* Reset Agents button */}
            <button
              onClick={handleResetAgents}
              disabled={resetting}
              title="Restart all agents"
              style={{
                width: '100%', height: railOpen ? 30 : 30, borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.25)',
                background: resetting ? 'rgba(239,68,68,0.15)' : resetResult === 'sent' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.08)',
                color: resetting ? '#F87171' : resetResult === 'sent' ? '#22C55E' : '#EF4444',
                cursor: resetting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.2s',
                opacity: resetting ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!resetting) { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}}
              onMouseLeave={e => { if (!resetting) { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}}
            >
              {resetting ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'bvPulse 1s infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  <path d="M21 3v9h-9"/>
                </svg>
              )}
              {railOpen && <span>{resetting ? 'Resetting...' : resetResult === 'sent' ? 'Sent' : 'Reset Agents'}</span>}
            </button>
            {/* Sleep/Wake toggle */}
            <button
              onClick={handleSleepWake}
              title={agentsSleeping ? 'Wake agents' : 'Put agents to sleep'}
              style={{
                width: '100%', height: 30, borderRadius: 8,
                border: `1px solid ${agentsSleeping ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.25)'}`,
                background: agentsSleeping ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.08)',
                color: agentsSleeping ? '#EAB308' : '#22C55E',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {agentsSleeping ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
              {railOpen && <span>{agentsSleeping ? 'Wake' : 'Sleep'}</span>}
            </button>
            {/* Voice chat toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 0' }}>
              <VoiceToggle isActive={isVoiceChatActive} onToggle={handleVoiceChatToggle} />
              {railOpen && (
                <span style={{
                  color: isVoiceChatActive ? '#60A5FA' : 'var(--bv-muted)',
                  fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  {isVoiceChatActive ? 'Voice On' : 'Voice'}
                </span>
              )}
            </div>
            {/* Collapse/expand toggle */}
            <button
              onClick={() => setRailOpen(!railOpen)}
              title={railOpen ? 'Collapse rail' : 'Expand rail'}
              style={{
                width: '100%', height: 30, borderRadius: 8,
                border: railOpen ? '1px solid var(--bv-col-border)' : '1px solid rgba(59,130,246,0.3)',
                background: railOpen ? 'var(--bv-card)' : 'rgba(59,130,246,0.1)',
                color: railOpen ? 'var(--bv-muted)' : '#60A5FA',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = railOpen ? 'var(--bv-col-exp)' : 'rgba(59,130,246,0.2)'; e.currentTarget.style.color = railOpen ? 'var(--bv-text2)' : '#93C5FD' }}
              onMouseLeave={e => { e.currentTarget.style.background = railOpen ? 'var(--bv-card)' : 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = railOpen ? 'var(--bv-muted)' : '#60A5FA' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: railOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s' }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {railOpen && <span>Collapse</span>}
            </button>
          </div>

        </div>

        {/* COLUMNS AREA */}
        {!isMobile ? (
          <div className="bv-columns-area" style={{ flex: 1, display: 'flex', gap: 10, padding: '4px 14px 4px', overflowX: 'auto', overflowY: 'hidden', scrollBehavior: 'smooth' }}>
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
              {mobileItems.map((item, idx) => {
                const unread = idx !== mobileIdx ? (unreadMap[item.slug] || 0) : 0
                return (
                <div
                  key={item.slug}
                  onClick={() => { setMobileIdx(idx); if (item.isAgent) onAgentSelect?.(item.slug) }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '3px 8px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                    border: `1.5px solid ${idx === mobileIdx ? 'var(--bv-accent-border)' : 'transparent'}`,
                    background: idx === mobileIdx ? 'var(--bv-accent)' : 'transparent',
                    position: 'relative',
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
                  {unread > 0 && (
                    <div style={{
                      position: 'absolute', top: 0, right: 2, zIndex: 2,
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: '#EF4444', color: '#fff',
                      fontSize: 9, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      border: '1.5px solid var(--bv-bar2)',
                      boxShadow: '0 0 8px rgba(239,68,68,0.5)',
                      padding: '0 3px',
                    }}>
                      {unread > 9 ? '9+' : unread}
                    </div>
                  )}
                  <span style={{ fontSize: 8, fontWeight: 700, color: idx === mobileIdx ? 'var(--bv-accent-text)' : 'var(--bv-muted)' }}>{item.name}</span>
                </div>
                )
              })}
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

      {/* Voice Chat Panel */}
      {isVoiceChatActive && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          width: 320,
          maxHeight: 400,
          background: 'rgba(10,16,32,0.97)',
          border: '1px solid rgba(59,130,246,0.35)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(59,130,246,0.12)',
            background: 'rgba(14,22,40,0.8)',
          }}>
            <span style={{
              color: '#60A5FA',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Voice Chat
            </span>
            <button
              onClick={() => setIsVoiceChatActive(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(148,168,200,0.6)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ×
            </button>
          </div>
          <VoiceChat
            agentSlug={orderedVisibleItems.find(it => it.isAgent)?.slug || 'elon'}
            agentColor={orderedVisibleItems.find(it => it.isAgent)?.color || '#3B82F6'}
            clientId={getClientId()}
          />
        </div>
      )}
    </div>
  )
}
