// SupportChat.jsx -- Corner Support slide-in panel
// Self-contained. Opens as an overlay panel anchored to the bottom-right.
// Talks to /api/dashboard/support-chat (hardcoded support system prompt).
//
// Props:
//   isOpen     {bool}    controlled open state
//   onClose    {func}    called when user closes the panel
//   clientId   {string}  Supabase client_id namespace (from current world)
//   isNightMode {bool}   for theme matching

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, HelpCircle, ChevronDown } from 'lucide-react'
import ChatMessageRenderer from './components/ChatMessageRenderer'

const SUPPORT_URL = '/api/dashboard/support-chat'

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '4px 16px' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HelpCircle size={13} color="rgba(96,165,250,0.7)" />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px 16px 16px 4px', padding: '10px 14px',
      }}>
        <span style={{ fontSize: 10, color: '#6B7280', marginRight: 2 }}>Corner Support is thinking</span>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#4B5563' }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Message bubble ───────────────────────────────────────────────────────────
function SupportMessage({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'flex-end', padding: '3px 16px' }}
      >
        <div style={{
          maxWidth: '78%', borderRadius: '16px 16px 4px 16px',
          padding: '10px 14px', fontSize: 13, color: '#fff', lineHeight: 1.5,
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        }}>
          {msg.content}
        </div>
      </motion.div>
    )
  }

  // Support response
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '3px 16px' }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HelpCircle size={13} color="rgba(96,165,250,0.7)" />
      </div>
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px 16px 16px 4px', padding: '10px 14px',
          fontSize: 13, color: '#E5E0D8', lineHeight: 1.55,
        }}>
          <ChatMessageRenderer
            content={msg.content}
            style={{ fontSize: 13, color: '#E5E0D8', lineHeight: 1.55 }}
          />
        </div>
        <div style={{ fontSize: 10, marginTop: 3, marginLeft: 4, color: 'rgba(96,165,250,0.5)' }}>
          Corner Support
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <HelpCircle size={20} color="rgba(96,165,250,0.6)" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
        Corner Support
      </div>
      <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5, maxWidth: 200 }}>
        Ask me anything about your setup, agents, or how Corner works.
      </div>
      <div style={{
        marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 260,
      }}>
        {[
          'What can my agents do?',
          'How does message routing work?',
          'How do I set up my API key?',
        ].map((q, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#6B7280',
            cursor: 'default',
          }}>
            {q}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SupportChat({ isOpen, onClose, clientId = 'support', isNightMode = true }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const supportClientId = `${clientId}-support`

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (isAtBottom) scrollToBottom()
  }, [messages, loading, isAtBottom, scrollToBottom])

  const buildHistory = useCallback(() => {
    return messages.slice(-12).map(m => ({
      role: m.role,
      content: m.content,
    }))
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    scrollToBottom()

    try {
      const res = await fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: buildHistory(),
          clientId: supportClientId,
        }),
      })

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Something went wrong on my end. Try again in a moment.",
        }])
        return
      }

      const data = await res.json()
      setMessages(prev => [...prev, {
        id: `s-${Date.now()}`,
        role: 'assistant',
        content: data.response || "I'm here to help. Could you rephrase that?",
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Connection error: ${err.message}`,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, buildHistory, supportClientId, scrollToBottom])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape') onClose?.()
  }, [sendMessage, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="support-panel"
          initial={{ opacity: 0, x: 20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.97 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: 64,
            right: 16,
            width: 360,
            height: 520,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            background: isNightMode ? '#0D1117' : '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(96,165,250,0.08)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <HelpCircle size={14} color="rgba(96,165,250,0.8)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>Corner Support</div>
              <div style={{ fontSize: 10, color: '#4B5563' }}>Platform help & troubleshooting</div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7280', transition: 'color 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E2E8F0' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B7280' }}
              title="Close support"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column',
              scrollbarWidth: 'thin', scrollbarColor: '#1F2937 transparent',
            }}
          >
            {messages.length === 0 && !loading ? (
              <EmptyState />
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <SupportMessage key={msg.id} msg={msg} />
                  ))}
                </AnimatePresence>
                {loading && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} style={{ height: 4 }} />
          </div>

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {!isAtBottom && messages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setIsAtBottom(true); scrollToBottom() }}
                style={{
                  position: 'absolute', bottom: 68, right: 12,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#9CA3AF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <ChevronDown size={13} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input */}
          <div style={{
            flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 12px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '8px 12px',
              transition: 'border-color 120ms ease',
            }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about setup, agents, or how Corner works..."
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#E5E0D8', fontSize: 12, resize: 'none',
                  minHeight: 18, maxHeight: 90, lineHeight: 1.5,
                  fontFamily: 'inherit',
                  overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                    : 'rgba(255,255,255,0.06)',
                  opacity: !input.trim() || loading ? 0.5 : 1,
                  transition: 'all 120ms ease',
                }}
              >
                {loading
                  ? <Loader2 size={11} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={11} color="#fff" style={{ marginLeft: 1 }} />
                }
              </button>
            </div>
            <div style={{ fontSize: 9, color: '#1F2937', textAlign: 'center', marginTop: 5 }}>
              Enter to send &middot; Shift+Enter for new line &middot; Esc to close
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
