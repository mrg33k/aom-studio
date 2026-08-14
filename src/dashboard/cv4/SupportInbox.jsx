// SupportInbox.jsx — Corner Support inbox for Patrik's workspace only.
//
// Shows all Corner Support visitor conversations grouped by visitor_id.
// Only rendered when worldId === 'aom' (gated in CornerV4.jsx).
// Visitor messages have metadata.embed_id = 'emb_corner_support'.
//
// Mission: corner:support R2

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../lib/cv3Colors.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shortVisitorId(id) {
  if (!id) return 'Anonymous'
  // First 8 chars of the UUID is distinctive enough
  return id.slice(0, 8) + '…'
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function truncate(str, n = 80) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

// Count user/visitor messages in a group that have no agent reply after them.
// Messages table uses role='user' for visitors and role='agent' for replies.
function countUnread(msgs) {
  let unread = 0
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      unread++
    } else {
 break // hit an agent reply, everything before is "answered"
    }
  }
  return unread
}

// Get clean display text for a message.
// Support messages embed the system prompt in `text`; visitor_text is the
// clean version in metadata (if present).
function getDisplayText(msg) {
  if (msg.metadata?.visitor_text) return msg.metadata.visitor_text
  // Strip leading [system: ...] block if present
  const raw = msg.text || ''
  const sysEnd = raw.indexOf(']\n\n')
  if (raw.startsWith('[system:') && sysEnd !== -1) return raw.slice(sysEnd + 3).trim()
  return raw
}

// Group messages by embed_visitor_id, sorted by last message desc.
// Note: messages table uses `timestamp` (not `created_at`).
function groupByVisitor(messages) {
  const map = {}
  for (const msg of messages) {
    const vid = msg.metadata?.embed_visitor_id || 'unknown'
    if (!map[vid]) map[vid] = []
    map[vid].push(msg)
  }
  // Sort messages within each group oldest→newest
  const groups = Object.entries(map).map(([vid, msgs]) => {
    const sorted = [...msgs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const last = sorted[sorted.length - 1]
    return {
      visitorId: vid,
      messages: sorted,
      lastMessage: last,
      unread: countUnread(sorted),
    }
  })
  // Sort groups newest-last-message first
  groups.sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0))
  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread View
// ─────────────────────────────────────────────────────────────────────────────

function ThreadView({ group, onBack }) {
  const { messages } = group
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to inbox"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${C.border}`,
            color: C.muted, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {shortVisitorId(group.visitorId)}
          </div>
          <div style={{
            fontSize: 11, color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: 1,
          }}>
            {group.messages.length} message{group.messages.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '82%',
                background: isUser
                  ? 'rgba(16,185,129,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isUser ? 'rgba(16,185,129,0.25)' : C.border}`,
                borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                padding: '8px 12px',
              }}>
                <div style={{
                  fontSize: 13, color: C.text, lineHeight: 1.5,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {getDisplayText(msg)}
                </div>
              </div>
              <div style={{
                fontSize: 10, color: C.muted,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 3,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ color: isUser ? C.accent : C.muted }}>
                  {isUser ? 'visitor' : 'agent'}
                </span>
                <span>·</span>
                <span>{timeAgo(msg.timestamp)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbox List
// ─────────────────────────────────────────────────────────────────────────────

function InboxList({ groups, selectedVisitorId, onSelectVisitor }) {
  if (groups.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', gap: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.dim,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: C.text2,
          fontFamily: "'Hanken Grotesk', -apple-system, sans-serif",
        }}>No support conversations yet</div>
        <div style={{
          fontSize: 12, color: C.muted, textAlign: 'center', maxWidth: 260,
          fontFamily: "'Hanken Grotesk', sans-serif", lineHeight: 1.5,
        }}>
          When visitors send messages through the Corner Support widget, their conversations will appear here.
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {groups.map((group) => {
        const isSelected = group.visitorId === selectedVisitorId
        const lastMsg = group.lastMessage
        const preview = truncate(lastMsg ? getDisplayText(lastMsg) : '', 80)
        return (
          <button
            key={group.visitorId}
            type="button"
            onClick={() => onSelectVisitor(group.visitorId)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              width: '100%', padding: '12px 16px',
              textAlign: 'left', cursor: 'pointer',
              background: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent',
              borderLeft: `2px solid ${isSelected ? C.accent : 'transparent'}`,
              borderBottom: `1px solid ${C.border}`,
              borderTop: 'none', borderRight: 'none',
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.background = 'transparent'
            }}
          >
            {/* Row 1: Visitor ID + timestamp + unread badge */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(16,185,129,0.15)',
                  border: `1px solid rgba(16,185,129,0.25)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.accent,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: C.text,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.02em',
                }}>
                  {shortVisitorId(group.visitorId)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {group.unread > 0 && (
                  <span style={{
                    background: C.accent, color: '#000',
                    fontSize: 9, fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '1px 5px', borderRadius: 10,
                    flexShrink: 0,
                  }}>
                    {group.unread}
                  </span>
                )}
                <span style={{
                  fontSize: 10, color: C.muted,
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}>
                  {timeAgo(lastMsg?.timestamp)}
                </span>
              </div>
            </div>
            {/* Row 2: Last message preview */}
            <div style={{
              fontSize: 12, color: group.unread > 0 ? C.text2 : C.muted,
              fontFamily: "'Hanken Grotesk', sans-serif",
              lineHeight: 1.4,
              fontWeight: group.unread > 0 ? 500 : 400,
              paddingLeft: 28, // align under visitor id text
            }}>
              {preview || <em style={{ color: C.dim }}>No messages yet</em>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SupportInbox
// ─────────────────────────────────────────────────────────────────────────────

export default function SupportInbox({ isDesktop = false }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVisitorId, setSelectedVisitorId] = useState(null)

  // Fetch support messages.
  // Filter: metadata->>embed_id = 'emb_corner_support'
  // Schema note: column is `text` (not `content`), `timestamp` (not `created_at`).
  const fetchMessages = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: err } = await supabase
        .from('messages')
        .select('id, text, role, timestamp, metadata')
        .eq('metadata->>embed_id', 'emb_corner_support')
        .eq('client_id', 'aom')
        .not('metadata->>embed_visitor_id', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(500)

      if (err) throw new Error(err.message)
      setMessages(data || [])
    } catch (e) {
      setError(e.message || 'Failed to load support messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Real-time subscription — Postgres changes on the messages table.
  // We can't filter on JSONB in the Realtime filter string, so we subscribe
  // to all inserts and refetch (the fetch is cheap, 500 rows max).
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('support-inbox-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Only refetch if the new row is a support message
        if (payload?.new?.metadata?.embed_id === 'emb_corner_support') {
          fetchMessages()
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMessages])

  const groups = groupByVisitor(messages)
  const selectedGroup = selectedVisitorId
    ? groups.find(g => g.visitorId === selectedVisitorId)
    : null

  // Desktop: two-pane split. Mobile: single pane that drills in.
  const showThread = !!selectedGroup
  const showList = isDesktop || !showThread

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: '100%',
      background: C.bg,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {/* Headphone icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <span style={{
              fontSize: 15, fontWeight: 800,
              color: C.text,
              fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: '-0.015em',
              textTransform: 'uppercase',
            }}>
              Support Inbox
            </span>
          </div>
          <div style={{
            fontSize: 11, color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: 2,
          }}>
            {loading ? 'Loading…' : `${groups.length} conversation${groups.length !== 1 ? 's' : ''}`}
            {' · '}
            <span style={{ color: C.dim }}>Corner Support widget</span>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchMessages}
          title="Refresh"
          aria-label="Refresh support inbox"
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${C.border}`,
            color: C.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 12, color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Loading…</span>
        </div>
      ) : error ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8, padding: 24,
        }}>
          <div style={{ fontSize: 12, color: '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>
            {error}
          </div>
          <button
            type="button"
            onClick={fetchMessages}
            style={{
              padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.text2,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Retry
          </button>
        </div>
      ) : isDesktop ? (
        // Desktop: two-pane layout
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'row',
          overflow: 'hidden',
        }}>
          {/* Left: visitor list */}
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <InboxList
              groups={groups}
              selectedVisitorId={selectedVisitorId}
              onSelectVisitor={setSelectedVisitorId}
            />
          </div>
          {/* Right: thread or empty state */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {selectedGroup ? (
              <ThreadView group={selectedGroup} onBack={() => setSelectedVisitorId(null)} />
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 10,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke={C.dim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{
                  fontSize: 12, color: C.muted,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>Select a conversation</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Mobile: single pane
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showThread && selectedGroup ? (
            <ThreadView group={selectedGroup} onBack={() => setSelectedVisitorId(null)} />
          ) : (
            <InboxList
              groups={groups}
              selectedVisitorId={selectedVisitorId}
              onSelectVisitor={setSelectedVisitorId}
            />
          )}
        </div>
      )}
    </div>
  )
}