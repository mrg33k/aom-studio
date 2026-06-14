// CommandDeck.jsx — Panel for Elon's room that surfaces loop system at a glance
// Mission: aom:command-deck
// Displays: loop health, hard calls (needs-patrik), steering questions, room status, stuck sessions
// Data sources: open-questions.md, needs-patrik.md, room-goals.json, ~/.claude/jobs, routines table
// All data is read-only except writes to master-loop deliverables via /api/dashboard/command-deck-action

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch } from '../lib/authFetch.js'
import { C } from '../lib/cv3Colors.js'

const AMBER = '#FBBF24'
const FONT = {
  body: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
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

// ── Component: Loop Health Banner ──────────────────────────────────────────

function LoopHealthBanner({ loopRunning, loopStatus, lastCheckTs, onRefresh, loading }) {
  const now = new Date()
  const lastCheck = lastCheckTs ? new Date(lastCheckTs) : null
  const secondsAgo = lastCheck ? Math.floor((now - lastCheck) / 1000) : null

  const timeLabel = secondsAgo < 90 ? 'just now' :
    secondsAgo < 3600 ? `${Math.round(secondsAgo / 60)}m ago` :
    secondsAgo < 86400 ? `${Math.round(secondsAgo / 3600)}h ago` :
    'unknown'

  const isStale = secondsAgo > 300 // > 5 min

  return (
    <div style={{
      padding: '12px 16px',
      background: C.dim,
      border: `1px solid ${C.border}`,
      borderRadius: 2,
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: FONT.body,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isStale ? AMBER : (loopRunning ? '#22C55E' : '#EF4444'),
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>
          {loopRunning ? 'Loop running' : 'Loop paused'}
        </span>
        {loopRunning && lastCheck && (
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 12 }}>
            Last tick: {timeLabel}
          </span>
        )}
        {isStale && loopRunning && (
          <span style={{ fontSize: 11, color: AMBER, marginLeft: 8, fontWeight: 500 }}>
            ⚠ May be stuck
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: loading ? 'default' : 'pointer',
          color: C.text2,
          fontSize: 14,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
        title="Refresh data"
      >
        ↻
      </button>
    </div>
  )
}

// ── Component: Hard Call Card ──────────────────────────────────────────────

function HardCallCard({ item, index, onMarkDone }) {
  const [loading, setLoading] = useState(false)

  const handleMarkDone = async () => {
    setLoading(true)
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_call_done', lineMatch: item.text.slice(0, 40) }),
      })
      onMarkDone()
    } catch (err) {
      console.error('Error marking call done:', err)
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
      padding: 16,
      background: C.dim,
      border: `1px solid ${C.border}`,
      borderRadius: 2,
      marginBottom: 12,
      fontFamily: FONT.body,
      opacity: item.checked ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={item.checked}
          onChange={handleMarkDone}
          disabled={loading || item.checked}
          style={{ marginTop: 2, cursor: item.checked ? 'default' : 'pointer', accentColor: AMBER }}
        />
        <span style={{ fontSize: 14, color: item.checked ? C.muted : C.text, fontWeight: 500, flex: 1 }}>
          {dateTitle}
        </span>
      </div>
      {why && (
        <p style={{ fontSize: 14, color: C.text2, margin: '8px 0 0 24px', lineHeight: 1.4 }}>
          {why}
        </p>
      )}
      {where && (
        <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0 24px', fontFamily: FONT.mono }}>
          {where}
        </p>
      )}
    </div>
  )
}

// ── Component: Steering Question Card ──────────────────────────────────────

function SteeringQuestionCard({ room, question, answered, onAnswer, onJumpToRoom }) {
  const [showInput, setShowInput] = useState(false)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus()
  }, [showInput])

  const handleSendAnswer = async () => {
    if (!answer.trim()) return
    setLoading(true)
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer_question',
          room,
          answer: answer.trim(),
        }),
      })
      onAnswer()
      setShowInput(false)
      setAnswer('')
    } catch (err) {
      console.error('Error submitting answer:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: 16,
      background: C.dim,
      border: `1px solid ${C.border}`,
      borderLeft: `2px solid ${answered ? C.border : AMBER}`,
      borderRadius: 2,
      marginBottom: 12,
      fontFamily: FONT.body,
      opacity: answered ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={answered}
          disabled
          style={{ marginTop: 2, accentColor: AMBER, cursor: 'default' }}
        />
        <span style={{ fontSize: 14, color: answered ? C.muted : C.text, fontWeight: 500, flex: 1 }}>
          {room}
        </span>
      </div>
      <p style={{ fontSize: 14, color: C.text2, margin: '0 0 12px 24px', lineHeight: 1.4 }}>
        {question}
      </p>
      {answered && (
        <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0 24px', fontStyle: 'italic' }}>
          ✓ Answered
        </p>
      )}
      {!answered && (
        <>
          {!showInput ? (
            <div style={{ display: 'flex', gap: 8, marginLeft: 24 }}>
              <button
                onClick={() => setShowInput(true)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: `1px solid ${AMBER}`,
                  color: AMBER,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                }}
              >
                Answer ↦
              </button>
              {room.includes(':') && (
                <button
                  onClick={() => onJumpToRoom(room)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: C.text2,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                  }}
                >
                  Go to room
                </button>
              )}
            </div>
          ) : (
            <div style={{ marginLeft: 24 }}>
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: C.s1,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  borderRadius: 2,
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendAnswer()
                  if (e.key === 'Escape') { setShowInput(false); setAnswer('') }
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleSendAnswer}
                  disabled={!answer.trim() || loading}
                  style={{
                    padding: '6px 12px',
                    background: AMBER,
                    color: '#000',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: loading ? 'default' : 'pointer',
                    borderRadius: 2,
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? 'Saving...' : 'Send'}
                </button>
                <button
                  onClick={() => { setShowInput(false); setAnswer('') }}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: C.text2,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: 2,
                  }}
                >
                  Cancel
                </button>
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
  const secondsAgo = Math.floor((now - reviewed) / 1000)
  const timeLabel = secondsAgo < 3600 ? `${Math.round(secondsAgo / 60)}m ago` :
    secondsAgo < 86400 ? `${Math.round(secondsAgo / 3600)}h ago` :
    `${Math.round(secondsAgo / 86400)}d ago`

  const isStale = secondsAgo > 14400 // > 4 hours

  return (
    <div style={{
      padding: 16,
      background: C.dim,
      border: `1px solid ${C.border}`,
      borderRadius: 2,
      marginBottom: 12,
      fontFamily: FONT.body,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
          {room}
        </span>
        {isStale && (
          <span style={{ fontSize: 11, color: AMBER, fontWeight: 500 }}>
            🟡 Stale
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: C.text2, margin: '0 0 12px 0', lineHeight: 1.4 }}>
        {goal.length > 100 ? goal.substring(0, 100) + '…' : goal}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: C.text2, marginBottom: 12 }}>
        <span>Status: <strong>{status}</strong></span>
        <span>
          Confidence: <strong>{confidence}</strong>
          {confidence === 'ambiguous' && ' ⚠'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, fontFamily: FONT.mono }}>
        Last reviewed: {timeLabel}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onJumpToRoom(room)}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.text2,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s',
          }}
        >
          Go to room
        </button>
        <button
          onClick={onRefreshGoal}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            color: C.text2,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: 2,
            opacity: 0.6,
            transition: 'all 0.2s',
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

// ── Component: Stuck Session Card ──────────────────────────────────────────

function StuckSessionCard({ session, onJumpToRoom }) {
  return (
    <div style={{
      padding: 16,
      background: C.dim,
      border: `1px solid ${C.border}`,
      borderColor: `rgba(251, 191, 36, 0.3)`,
      borderRadius: 2,
      marginBottom: 12,
      fontFamily: FONT.body,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
          {session.name}
        </span>
        <span style={{ fontSize: 11, background: C.s1, color: C.text2, padding: '2px 6px', borderRadius: 2 }}>
          ⏸ {session.state === 'blocked' ? 'Waiting on input' : 'Stalled'}
        </span>
      </div>
      {session.detail && (
        <p style={{ fontSize: 13, color: C.text2, margin: '0 0 12px 0', lineHeight: 1.4 }}>
          {session.detail}
        </p>
      )}
      {session.suggestedReply && (
        <div style={{
          borderLeft: `2px solid ${AMBER}`,
          paddingLeft: 12,
          marginBottom: 12,
          fontSize: 12,
          color: C.text2,
          fontStyle: 'italic',
        }}>
          <strong>Suggested:</strong> {session.suggestedReply}
        </div>
      )}
      <button
        onClick={() => onJumpToRoom(`agents/${session.name}`)}
        style={{
          padding: '6px 12px',
          background: AMBER,
          color: '#000',
          border: 'none',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          borderRadius: 2,
          transition: 'all 0.2s',
        }}
      >
        Answer now →
      </button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CommandDeck({ worldId, basePath, onJumpToRoom }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data state
  const [loopRunning, setLoopRunning] = useState(false)
  const [loopStatusData, setLoopStatusData] = useState(null)
  const [hardCalls, setHardCalls] = useState([])
  const [steeringQuestions, setSteeringQuestions] = useState([])
  const [roomStatus, setRoomStatus] = useState({})
  const [stuckSessions, setStuckSessions] = useState([])

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

      // 2. Fetch needs-patrik.md
      const nRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/needs-patrik.md')
      const nText = nRes.ok ? await nRes.text() : ''
      const openCalls = parseMarkdownCheckboxList(nText, 'Open')

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

      // Build steering questions from open-questions + room goals
      const steering = openQuestions
        .filter((q) => !answeredQuestions.some((a) => a.text.includes(q.text.split(' — ')[0])))
        .map((item) => {
          const [room, question] = item.text.split(' — ')
          return {
            room: room.trim(),
            question: question.trim(),
            checked: item.checked,
          }
        })

      setSteeringQuestions(steering)
      setHardCalls(openCalls)
      setRoomStatus(goals.rooms || {})
      setStuckSessions(stuckData.sessions || [])
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
    stuckSessions.length === 0

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      padding: '20px',
      maxWidth: 800,
      margin: '0 auto',
      width: '100%',
      color: C.text,
      fontFamily: FONT.body,
    }}>
      {/* Loop Health */}
      <LoopHealthBanner
        loopRunning={loopRunning}
        loopStatus={loopStatusData}
        lastCheckTs={loopStatusData?.last_cycle_ts}
        onRefresh={handleRefresh}
        loading={refreshing}
      />

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
              <h3 style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text2,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 16px 0',
                fontFamily: FONT.body,
              }}>
                Waiting on You ({hardCalls.filter((c) => !c.checked).length} open)
              </h3>
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
                      onMarkDone={handleDataChange}
                    />
                  ))
              )}
            </section>
          )}

          {/* Steering Questions */}
          {steeringQuestions.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text2,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 16px 0',
                fontFamily: FONT.body,
              }}>
                Steering Questions ({steeringQuestions.length} open)
              </h3>
              {steeringQuestions.map((q, i) => (
                <SteeringQuestionCard
                  key={i}
                  room={q.room}
                  question={q.question}
                  answered={q.checked}
                  onAnswer={handleDataChange}
                  onJumpToRoom={onJumpToRoom}
                />
              ))}
            </section>
          )}

          {/* Room Status */}
          {Object.keys(roomStatus).length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text2,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 16px 0',
                fontFamily: FONT.body,
              }}>
                Room Status ({Object.keys(roomStatus).length} rooms)
              </h3>
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
              <h3 style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text2,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 16px 0',
                fontFamily: FONT.body,
              }}>
                Stuck Sessions ({stuckSessions.length})
              </h3>
              {stuckSessions.map((sess, i) => (
                <StuckSessionCard
                  key={i}
                  session={sess}
                  onJumpToRoom={onJumpToRoom}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
