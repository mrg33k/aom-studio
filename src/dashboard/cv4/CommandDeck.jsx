// CommandDeck.jsx — Panel for Elon's room that surfaces loop system at a glance
// Mission: aom:command-deck
// Displays: loop health, hard calls (needs-patrik), steering questions, room status, stuck sessions
// Data sources: open-questions.md, needs-patrik.md, room-goals.json, ~/.claude/jobs, routines table
// All data is read-only except writes to master-loop deliverables via /api/dashboard/command-deck-action

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch } from '../lib/authFetch.js'
import { C } from '../lib/cv3Colors.js'

const AMBER = 'var(--c-yellow)'
const FONT = {
  body: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', monospace",
}

// ── Helper: parse markdown checkbox lists ──────────────────────────────────

function parseMarkdownCheckboxList(markdown, sectionName) {
  // Extract section (## Open, ## Answered, etc), then parse checkbox items
  const sectionRegex = new RegExp(`## ${sectionName}\\b[\\s\\S]*?(?=## |$)`)
  const match = markdown.match(sectionRegex)
  if (!match) return []

  const lines = match[0].split('\n').slice(1) // skip header
  const items = []
  lines.forEach((line) => {
    const checkMatch = line.match(/^- \[([ x])\]\s*(.+)/)
    if (checkMatch) {
      items.push({ checked: checkMatch[1] === 'x', text: checkMatch[2] })
    }
  })
  return items
}

// ── Shared button component for CommandDeck (matches RoutineCard CardBtn style)

function CommandDeckBtn({ children, onClick, disabled = false, primary = false, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? 'rgba(234,179,8,0.10)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${primary ? 'rgba(234,179,8,0.45)' : C.border}`,
        color: primary ? AMBER : C.text2,
        fontSize: 11,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: 7,
        padding: '8px 14px',
        minHeight: 34,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: FONT.mono,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled && !primary) { e.currentTarget.style.borderColor = C.muted; e.currentTarget.style.color = C.text } }}
      onMouseLeave={e => { if (!primary) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2 } }}
    >
      {children}
    </button>
  )
}

// ── Shared: tap-one option chips ───────────────────────────────────────────
// The loop's pre-worked-out moves for any card. Tap one and the card's submit
// handler records it. Used by both hard calls and steering questions so every
// open item looks and behaves the same.

function OptionChips({ options, picked, loading, onPick }) {
  if (!Array.isArray(options) || options.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map((opt, oi) => (
        <button
          key={oi}
          onClick={() => onPick(opt, oi)}
          disabled={loading}
          style={{
            textAlign: 'left',
            background: picked === oi ? 'rgba(234,179,8,0.18)' : 'rgba(234,179,8,0.06)',
            border: `1px solid ${picked === oi ? AMBER : 'rgba(234,179,8,0.32)'}`,
            color: C.text,
            fontSize: 13,
            fontFamily: FONT.body,
            borderRadius: 8,
            padding: '10px 12px',
            cursor: loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            opacity: loading && picked !== oi ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          <span>{opt.label}</span>
          <span style={{ color: AMBER, fontWeight: 700, flexShrink: 0 }}>
            {picked === oi && loading ? '…' : '›'}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Component: Loop Health Banner ──────────────────────────────────────────

function LoopHealthBanner({ loopRunning, loopStatus, lastCheckTs, onRefresh, loading }) {
  const now = new Date()
  const lastCheck = lastCheckTs ? new Date(lastCheckTs) : null
  const secondsAgo = lastCheck ? Math.max(0, Math.floor((now - lastCheck) / 1000)) : null

  const timeLabel = secondsAgo < 90 ? 'just now' :
    secondsAgo < 3600 ? `${Math.round(secondsAgo / 60)}m ago` :
    secondsAgo < 86400 ? `${Math.round(secondsAgo / 3600)}h ago` :
    'unknown'

  const isStale = secondsAgo > 300 // > 5 min

  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: FONT.body,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: loopRunning ? AMBER : 'rgba(255,255,255,0.18)',
          boxShadow: loopRunning ? `0 0 0 3px rgba(234,179,8,0.14)` : 'none',
          flexShrink: 0,
        }} />
        {/* Layer-1 signal: this is the one thing to read instantly, so it carries
            primary weight, not caption styling. */}
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600, flexShrink: 0 }}>
          {loopRunning ? 'Loop running' : 'Loop paused'}
        </span>
        {loopRunning && lastCheck && (
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 10, fontFamily: FONT.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            checked {timeLabel}
          </span>
        )}
        {isStale && loopRunning && (
          <span style={{ fontSize: 12, color: AMBER, marginLeft: 8, fontWeight: 600, flexShrink: 0 }}>
            ⚠ may be stuck
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh data"
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          background: 'transparent',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          cursor: loading ? 'default' : 'pointer',
          color: C.text2,
          fontSize: 16,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Refresh data"
      >
        ↻
      </button>
    </div>
  )
}

// ── Component: Hard Call Card ──────────────────────────────────────────────

function HardCallCard({ item, index, options = [], onMarkDone }) {
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)
  const hasOptions = Array.isArray(options) && options.length > 0

  // One path for "Mark done" (no decision) and a tapped option (records the
  // decision inline so the loop acts on it next tick), both flip the call to
  // handled in needs-patrik.md.
  const submit = async (answer = null, chipIndex = null) => {
    setLoading(true)
    if (chipIndex !== null) setPicked(chipIndex)
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_call_done',
          lineMatch: item.text.slice(0, 60),
          ...(answer ? { answer } : {}),
        }),
      })
      onMarkDone()
    } catch (err) {
      console.error('Error marking call done:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  // Parse format: YYYY-MM-DD — title · why · where
  const parts = item.text.split(' · ')
  const dateTitle = parts[0] || ''
  const why = parts[1] || ''
  const where = parts[2] || ''

  return (
    <div style={{
      padding: '14px 16px 12px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 12,
      fontFamily: FONT.body,
      opacity: item.checked ? 0.6 : 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header with dot + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background: item.checked ? 'rgba(255,255,255,0.18)' : AMBER,
          boxShadow: !item.checked ? `0 0 0 3px rgba(234,179,8,0.14)` : 'none',
        }} />
        <span style={{
          fontFamily: FONT.display,
          fontSize: 14,
          color: item.checked ? C.muted : C.text,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {dateTitle}
        </span>
      </div>

      {/* Body + details */}
      {why && (
        <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.4 }}>
          {why}
        </p>
      )}

      {/* where it lives */}
      {where && (
        <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: FONT.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {where}
        </p>
      )}

      {/* Action footer */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: `1px solid ${C.border}`,
        paddingTop: 10,
      }}>
        {item.checked ? (
          <span style={{ fontSize: 11, color: C.muted, fontFamily: FONT.mono, padding: '8px 0' }}>✓ done</span>
        ) : (
          <>
            {hasOptions && (
              <OptionChips
                options={options}
                picked={picked}
                loading={loading}
                onPick={(opt, oi) => submit(opt.answer || opt.label, oi)}
              />
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <CommandDeckBtn onClick={() => submit(null)} disabled={loading} primary={!hasOptions}>
                {loading && picked === null ? 'Saving…' : (hasOptions ? 'Mark handled' : 'Mark done')}
              </CommandDeckBtn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Component: Steering Question Card ──────────────────────────────────────

function SteeringQuestionCard({ room, question, answered, options = [], onAnswer, onJumpToRoom }) {
  const [showInput, setShowInput] = useState(false)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus()
  }, [showInput])

  // One path for both a tapped option chip and a typed answer: record the choice
  // as this room's goal. The loop reads room-goals.json on its next tick.
  const submitAnswer = async (text, chipIndex = null) => {
    if (!text || !text.trim()) return
    setLoading(true)
    if (chipIndex !== null) setPicked(chipIndex)
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer_question',
          room,
          answer: text.trim(),
        }),
      })
      onAnswer()
      setShowInput(false)
      setAnswer('')
    } catch (err) {
      console.error('Error submitting answer:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSendAnswer = () => submitAnswer(answer)
  const hasOptions = Array.isArray(options) && options.length > 0

  return (
    <div style={{
      padding: '14px 16px 12px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 12,
      fontFamily: FONT.body,
      opacity: answered ? 0.7 : 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header with dot + room name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background: answered ? 'rgba(255,255,255,0.18)' : AMBER,
          boxShadow: !answered ? `0 0 0 3px rgba(234,179,8,0.14)` : 'none',
        }} />
        <span style={{
          fontFamily: FONT.display,
          fontSize: 14,
          color: answered ? C.muted : C.text,
          fontWeight: 500,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {room}
        </span>
      </div>

      {/* Question body */}
      <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.4 }}>
        {question}
      </p>

      {/* Meta footer with divider + actions */}
      {answered ? (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: 8,
          fontSize: 11,
          color: C.muted,
          fontFamily: FONT.mono,
        }}>
          ✓ Answered
        </div>
      ) : (
        <>
          {!showInput ? (
            <div style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {/* The loop's pre-worked-out moves: tap one and it becomes the
                  room's goal next tick. Free-text "Answer" stays as the escape
                  hatch below. */}
              <OptionChips
                options={options}
                picked={picked}
                loading={loading}
                onPick={(opt, oi) => submitAnswer(opt.answer || opt.label, oi)}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <CommandDeckBtn onClick={() => setShowInput(true)}>
                  {hasOptions ? 'Something else' : 'Answer'}
                </CommandDeckBtn>
                {room.includes(':') && (
                  <CommandDeckBtn onClick={() => onJumpToRoom(room)}>
                    Go to room
                  </CommandDeckBtn>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                style={{
                  padding: '8px 12px',
                  background: C.s1,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  borderRadius: 2,
                  boxSizing: 'border-box',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendAnswer()
                  if (e.key === 'Escape') { setShowInput(false); setAnswer('') }
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <CommandDeckBtn
                  onClick={handleSendAnswer}
                  disabled={!answer.trim() || loading}
                  style={{ opacity: loading || !answer.trim() ? 0.6 : 1 }}
                >
                  {loading ? 'Saving…' : 'Send'}
                </CommandDeckBtn>
                <CommandDeckBtn onClick={() => { setShowInput(false); setAnswer('') }}>
                  Cancel
                </CommandDeckBtn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Component: Room Status Card ────────────────────────────────────────────

function RoomStatusCard({ room, goal, status, confidence, lastReviewed, onJumpToRoom, onRefreshGoal }) {
  const now = new Date()
  const reviewed = new Date(lastReviewed)
  // Clamp to 0: a last_reviewed stamp can be a touch ahead of the browser clock
  // (loop clock skew), which would otherwise render "-32m ago".
  const secondsAgo = Math.max(0, Math.floor((now - reviewed) / 1000))
  const timeLabel = secondsAgo < 60 ? 'just now' :
    secondsAgo < 3600 ? `${Math.round(secondsAgo / 60)}m ago` :
    secondsAgo < 86400 ? `${Math.round(secondsAgo / 3600)}h ago` :
    `${Math.round(secondsAgo / 86400)}d ago`

  const isStale = secondsAgo > 14400 // > 4 hours

  return (
    <div style={{
      padding: '14px 16px 12px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 12,
      fontFamily: FONT.body,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header with dot + room name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background: isStale ? AMBER : 'rgba(255,255,255,0.18)',
          boxShadow: isStale ? `0 0 0 3px rgba(234,179,8,0.14)` : 'none',
        }} />
        <span style={{
          fontFamily: FONT.display,
          fontSize: 14,
          color: C.text,
          fontWeight: 500,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {room}
        </span>
      </div>

      {/* Goal body */}
      <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.4 }}>
        {goal.length > 100 ? goal.substring(0, 100) + '…' : goal}
      </p>

      {/* Meta footer with divider + status + actions */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: `1px solid ${C.border}`,
        paddingTop: 8,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 11,
          color: C.muted,
          fontFamily: FONT.mono,
        }}>
          <span>Status: <strong>{status}</strong></span>
          <span>
            Confidence: <strong>{confidence}</strong>
            {confidence === 'ambiguous' && ' ⚠'}
          </span>
          <span title="Last loop review time">Reviewed {timeLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <CommandDeckBtn onClick={() => onJumpToRoom(room)}>
            Go to room
          </CommandDeckBtn>
          <CommandDeckBtn onClick={onRefreshGoal}>
            Refresh
          </CommandDeckBtn>
        </div>
      </div>
    </div>
  )
}

// ── Component: Stuck Session Card ──────────────────────────────────────────

function StuckSessionCard({ session, onJumpToRoom }) {
  return (
    <div style={{
      padding: '14px 16px 12px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 12,
      fontFamily: FONT.body,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header with dot + session name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background: AMBER,
          boxShadow: `0 0 0 3px rgba(234,179,8,0.14)`,
        }} />
        <span style={{
          fontFamily: FONT.display,
          fontSize: 14,
          color: C.text,
          fontWeight: 500,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.name}
        </span>
        <span style={{
          fontSize: 10,
          background: 'transparent',
          color: AMBER,
          padding: '2px 6px',
          borderRadius: 2,
          fontFamily: FONT.mono,
          fontWeight: 500,
          flexShrink: 0,
        }}>
          {session.state === 'blocked' ? 'Blocked' : 'Stalled'}
        </span>
      </div>

      {/* Detail body */}
      {session.detail && (
        <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.4 }}>
          {session.detail}
        </p>
      )}

      {/* Suggested reply highlight */}
      {session.suggestedReply && (
        <div style={{
          fontSize: 12,
          color: C.text2,
          fontStyle: 'italic',
          padding: 0,
          margin: 0,
        }}>
          <strong>Suggested:</strong> {session.suggestedReply}
        </div>
      )}

      {/* Meta footer with divider + action */}
      <div style={{
        display: 'flex',
        gap: 6,
        borderTop: `1px solid ${C.border}`,
        paddingTop: 8,
      }}>
        <CommandDeckBtn onClick={() => onJumpToRoom(`agents/${session.name}`)}>
          Answer now
        </CommandDeckBtn>
      </div>
    </div>
  )
}

// ── Component: Keeper Card (housekeeping proposal) ─────────────────────────────

function KeeperCard({ proposal, onDecided }) {
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)

  const decide = async (opt, oi) => {
    setLoading(true)
    setPicked(oi)
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'keeper_decision',
          proposalId: proposal.id,
          answer: opt.answer || opt.label,
        }),
      })
      onDecided()
    } catch (err) {
      console.error('Error recording keeper decision:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '14px 16px 12px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 12,
      fontFamily: FONT.body,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: AMBER, boxShadow: `0 0 0 3px rgba(234,179,8,0.14)`,
        }} />
        <span style={{
          fontFamily: FONT.display, fontSize: 14, color: C.text, fontWeight: 600,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {proposal.title}
        </span>
      </div>
      {proposal.detail && (
        <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.4 }}>
          {proposal.detail}
        </p>
      )}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
        <OptionChips
          options={proposal.options}
          picked={picked}
          loading={loading}
          onPick={decide}
        />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CommandDeck({ worldId, basePath, onJumpToRoom, onClose }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data state
  const [loopRunning, setLoopRunning] = useState(false)
  const [loopStatusData, setLoopStatusData] = useState(null)
  const [hardCalls, setHardCalls] = useState([])
  const [steeringQuestions, setSteeringQuestions] = useState([])
  const [roomStatus, setRoomStatus] = useState({})
  const [stuckSessions, setStuckSessions] = useState([])
  const [keeperProposals, setKeeperProposals] = useState([])
  const [activity, setActivity] = useState([])

  const load = useCallback(async () => {
    if (!worldId) return
    try {
      // raw=1 returns the file bytes directly. Without it project-file wraps
      // the body as { content: "..." }, which broke every list (parsed the
      // envelope, not the file). Fixed 2026-06-14.
      // 1. Fetch open-questions.md
      const qRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/open-questions.md')
      const qText = qRes.ok ? await qRes.text() : ''
      const openQuestions = parseMarkdownCheckboxList(qText, 'Open')
      const answeredQuestions = parseMarkdownCheckboxList(qText, 'Answered')

      // 2. Fetch needs-patrik.md + its tap-one options sidecar.
      const nRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/needs-patrik.md')
      const nText = nRes.ok ? await nRes.text() : ''
      const rawCalls = parseMarkdownCheckboxList(nText, 'Open')
      // Hard-call options live in a sidecar keyed by the first 60 chars of the
      // line (the same handle mark_call_done matches on; 60 keeps the four
      // parent-teacher-council items distinct). The loop maintains it.
      const hcoRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/needs-patrik-options.json')
      let hardCallOptions = {}
      if (hcoRes.ok) {
        try { hardCallOptions = JSON.parse(await hcoRes.text()) } catch { hardCallOptions = {} }
      }
      const openCalls = rawCalls.map((c) => {
        const opts = hardCallOptions[c.text.slice(0, 60)]
        return { ...c, options: Array.isArray(opts) ? opts.filter((o) => o && o.label) : [] }
      })

      // 3. Fetch room-goals.json
      const gRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/room-goals.json')
      let goals = { rooms: {} }
      if (gRes.ok) {
        try { goals = JSON.parse(await gRes.text()) } catch { goals = { rooms: {} } }
      }

      // 4. Fetch stuck sessions
      const sRes = await authFetch('/api/dashboard/claude-sessions')
      const stuckData = sRes.ok ? await sRes.json() : { sessions: [] }

      // 5. Fetch routines to find the master-loop status
      const rRes = await authFetch(`/api/dashboard/routines?client_id=${encodeURIComponent(worldId)}`)
      const routines = rRes.ok ? await rRes.json() : { routines: [] }
      const masterLoop = routines.routines?.find((r) => r.name === 'com.aom-ea.master-loop')

      // 6. Fetch the Keeper's housekeeping proposals (tidy-up cards).
      const kRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/keeper-report.json')
      let keeper = { proposals: [] }
      if (kRes.ok) {
        try { keeper = JSON.parse(await kRes.text()) } catch { keeper = { proposals: [] } }
      }

      // 7. Fetch the "what changed since you last looked" activity feed.
      const aRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/activity.json')
      let activityFeed = { entries: [] }
      if (aRes.ok) {
        try { activityFeed = JSON.parse(await aRes.text()) } catch { activityFeed = { entries: [] } }
      }

      // Build steering questions from open-questions + room goals
      const steering = openQuestions
        .filter((q) => !answeredQuestions.some((a) => a.text.includes(q.text.split(' — ')[0])))
        .map((item) => {
          const [room, question] = item.text.split(' — ')
          const slug = room.trim()
          // The loop pre-computes 2-4 tap-one moves per question and stores them
          // on the room's goal entry. Each is { label, answer }.
          const g = (goals.rooms || {})[slug] || {}
          const options = Array.isArray(g.options)
            ? g.options.filter((o) => o && o.label)
            : []
          return {
            room: slug,
            question: question.trim(),
            checked: item.checked,
            options,
          }
        })

      setSteeringQuestions(steering)
      setHardCalls(openCalls)
      setRoomStatus(goals.rooms || {})
      setStuckSessions(stuckData.sessions || [])
      setKeeperProposals(Array.isArray(keeper.proposals) ? keeper.proposals : [])
      // newest first; show the most recent moves
      setActivity(Array.isArray(activityFeed.entries) ? activityFeed.entries.slice(-12).reverse() : [])
      setLoopRunning(masterLoop?.status === 'running')
      setLoopStatusData(goals)

      setLoading(false)
    } catch (err) {
      console.error('Error loading Command Deck data:', err)
      setLoading(false)
    }
  }, [worldId])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleDataChange = () => {
    // Reload data after an action
    load()
  }

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.s1,
        color: C.text2,
        fontFamily: FONT.body,
      }}>
        Loading Command Deck...
      </div>
    )
  }

  const isEmpty =
    hardCalls.every((c) => c.checked) &&
    steeringQuestions.length === 0 &&
    Object.keys(roomStatus).length === 0 &&
    stuckSessions.length === 0 &&
    keeperProposals.length === 0

  return (
    // Solid deep ground so the chat's animated background never bleeds through
    // (that bleed was the main reason the deck read as broken on mobile).
    <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: C.s1,
      width: '100%',
      color: C.text,
      fontFamily: FONT.body,
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: 'clamp(14px, 4vw, 24px) clamp(12px, 4vw, 24px) 56px',
        boxSizing: 'border-box',
      }}>
      {/* Header: title + close (the loop icon in the room header also toggles it) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{
          margin: 0, fontSize: 28, fontWeight: 800, color: C.text,
          fontFamily: FONT.display, letterSpacing: '-0.03em',
        }}>
          Command Deck<span style={{ color: AMBER }}>.</span>
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Command Deck"
            title="Back to chat"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.text2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Loop Health */}
      <LoopHealthBanner
        loopRunning={loopRunning}
        loopStatus={loopStatusData}
        lastCheckTs={loopStatusData?.last_cycle_ts}
        onRefresh={handleRefresh}
        loading={refreshing}
      />

      {/* Since you last looked — the loop's clean what-changed feed */}
      {activity.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
            letterSpacing: '0.14em', margin: '0 0 12px 0', fontFamily: FONT.mono,
          }}>
            Since you last looked ({activity.length})
          </div>
          <div style={{
            border: `1px solid ${C.border}`, borderRadius: 10,
            background: 'rgba(255,255,255,0.015)', overflow: 'hidden',
          }}>
            {activity.map((a, i) => {
              const room = (a.room || '').split(':').slice(-1)[0]
              const secs = a.ts ? Math.max(0, Math.floor((Date.now() - new Date(a.ts)) / 1000)) : null
              const ago = secs == null ? '' :
                secs < 90 ? 'just now' :
                secs < 3600 ? `${Math.round(secs / 60)}m ago` :
                secs < 86400 ? `${Math.round(secs / 3600)}h ago` :
                `${Math.round(secs / 86400)}d ago`
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: AMBER,
                    flexShrink: 0, marginTop: 6,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600 }}>{room}</span>
                      <span style={{ color: C.text2 }}>{': '}{(a.move || '').replace(/\s*[—–]\s*/g, ', ')}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: FONT.mono, flexShrink: 0, marginTop: 3 }}>
                    {ago}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {isEmpty && !hardCalls.some((c) => !c.checked) ? (
        <div style={{
          textAlign: 'center',
          color: C.muted,
          fontSize: 14,
          margin: '40px 0',
        }}>
          Everything is flowing. Your loop is working well.
        </div>
      ) : (
        <>
          {/* Hard Calls (Waiting on You) */}
          {hardCalls.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: '0 0 16px 0',
                fontFamily: FONT.mono,
              }}>
                Waiting on You ({hardCalls.filter((c) => !c.checked).length} open)
              </div>
              {hardCalls.filter((c) => !c.checked).length === 0 ? (
                <div style={{ fontSize: 13, color: C.muted }}>No urgent calls.</div>
              ) : (
                hardCalls
                  .filter((c) => !c.checked)
                  .map((item, i) => (
                    <HardCallCard
                      key={i}
                      item={item}
                      index={i}
                      options={item.options}
                      onMarkDone={handleDataChange}
                    />
                  ))
              )}
            </section>
          )}

          {/* Steering Questions */}
          {steeringQuestions.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: '0 0 16px 0',
                fontFamily: FONT.mono,
              }}>
                Steering Questions ({steeringQuestions.length} open)
              </div>
              {steeringQuestions.map((q, i) => (
                <SteeringQuestionCard
                  key={i}
                  room={q.room}
                  question={q.question}
                  answered={q.checked}
                  options={q.options}
                  onAnswer={handleDataChange}
                  onJumpToRoom={onJumpToRoom}
                />
              ))}
            </section>
          )}

          {/* Room Status */}
          {Object.keys(roomStatus).length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: '0 0 16px 0',
                fontFamily: FONT.mono,
              }}>
                Room Status ({Object.keys(roomStatus).length} rooms)
              </div>
              {Object.entries(roomStatus).map(([roomSlug, data]) => (
                <RoomStatusCard
                  key={roomSlug}
                  room={roomSlug}
                  goal={data.goal}
                  status={data.status}
                  confidence={data.confidence}
                  lastReviewed={data.last_reviewed}
                  onJumpToRoom={onJumpToRoom}
                  onRefreshGoal={() => {
                    // For now just refresh all data; full room-only refresh is post-June
                    handleRefresh()
                  }}
                />
              ))}
            </section>
          )}

          {/* Stuck Sessions */}
          {stuckSessions.length > 0 && (
            <section>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: '0 0 16px 0',
                fontFamily: FONT.mono,
              }}>
                Stuck Sessions ({stuckSessions.length})
              </div>
              {stuckSessions.map((sess, i) => (
                <StuckSessionCard
                  key={i}
                  session={sess}
                  onJumpToRoom={onJumpToRoom}
                />
              ))}
            </section>
          )}

          {/* Housekeeping — the Keeper's tidy-up proposals */}
          {keeperProposals.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: '0 0 16px 0',
                fontFamily: FONT.mono,
              }}>
                Housekeeping ({keeperProposals.length})
              </div>
              {keeperProposals.map((p) => (
                <KeeperCard
                  key={p.id}
                  proposal={p}
                  onDecided={handleDataChange}
                />
              ))}
            </section>
          )}
        </>
      )}
      </div>
    </div>
  )
}
