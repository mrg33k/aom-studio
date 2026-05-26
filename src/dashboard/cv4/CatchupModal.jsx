// CatchupModal.jsx — Notifications Catch-Up Modal
// Mission: corner:notifications-catchup R2
// Author: Bobby (dev build pass)
// Date: 2026-05-26
//
// React implementation of the catchup-modal design from
// cv4-explore-v2/components/catchup-modal.html (R1 design by Steffen).
//
// Props:
//   isOpen       — boolean, controls visibility
//   notifications — CatchupNotification[] — see shape below
//   onClose      — fn(), close without action
//   onReply      — fn(notification, replyText) — user sent a reply
//   onSkip       — fn(notification) — user skipped
//
// CatchupNotification shape:
//   {
//     id: string,          message id (for routing replies)
//     senderName: string,
//     senderInitials: string,
//     senderType: 'agent' | 'human',
//     roomName: string,
//     timeAgo: string,
//     badgeType: 'mention' | 'task' | 'message',
//     messagePreview: string,
//     suggestedReplies: string[],  // exactly 3
//     // Internal routing data (passed through from notifItems)
//     _agent: string,
//     _project: string | null,
//     _missionSlug: string | null,
//     _roomKey: string,
//   }

import { useState, useEffect, useRef, useCallback } from 'react'
import { C } from '../lib/cv3Colors.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const BADGE_LABELS = {
  mention: '@mention',
  task: 'Task done',
  message: 'Message',
}

const BADGE_COLORS = {
  mention: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  task: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'rgba(16,185,129,0.25)' },
  message: { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: 'rgba(59,130,246,0.2)' },
}

// ── Utility ───────────────────────────────────────────────────────────────────

function ConfettiPiece({ index }) {
  const colors = ['#10B981', '#F59E0B', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C']
  const angle = (index * 37.5) % 360
  const dist = 60 + (index % 7) * 20
  const tx = Math.cos(angle * Math.PI / 180) * dist
  const ty = Math.sin(angle * Math.PI / 180) * dist + 50
  const rot = ((index % 5) - 2) * 144
  const dur = 0.8 + (index % 5) * 0.14
  const delay = (index % 8) * 0.03
  const isCircle = index % 2 === 0
  const size = 5 + (index % 3) * 2

  return (
    <div style={{
      position: 'absolute',
      left: `calc(50% + ${((index % 11) - 5) * 5}px)`,
      top: '45%',
      width: size,
      height: size,
      background: colors[index % colors.length],
      borderRadius: isCircle ? '50%' : 2,
      opacity: 0.9,
      animation: `cnConfettiFall ${dur}s ease-out ${delay}s forwards`,
      '--tx': `${tx}px`,
      '--ty': `${ty}px`,
      '--rot': `${rot}deg`,
    }} />
  )
}

// ── Notification Card ─────────────────────────────────────────────────────────

function NotifCard({ notif, state, onChipReply, onTextReply }) {
  const [expanded, setExpanded] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedChip, setSelectedChip] = useState(null)
  const inputRef = useRef(null)

  const badgeStyle = BADGE_COLORS[notif.badgeType] || BADGE_COLORS.message

  const handleChipClick = useCallback((reply) => {
    if (submitting) return
    setSelectedChip(reply)
    setTimeout(() => {
      setSubmitting(true)
      onChipReply(notif, reply)
    }, 450)
  }, [submitting, notif, onChipReply])

  const handleSend = useCallback(() => {
    const txt = inputVal.trim()
    if (!txt || submitting) return
    setSubmitting(true)
    onTextReply(notif, txt)
  }, [inputVal, submitting, notif, onTextReply])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // State-driven position/opacity for slide animation
  const stateStyles = {
    visible:     { transform: 'translateX(0)',       opacity: 1 },
    'enter-right': { transform: 'translateX(100%)',  opacity: 0 },
    'enter-left':  { transform: 'translateX(-100%)', opacity: 0 },
    'exit-left':   { transform: 'translateX(-60%) scale(0.94)', opacity: 0 },
    'exit-right':  { transform: 'translateX(60%) scale(0.94)',  opacity: 0 },
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: 20,
      gap: 16,
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
      willChange: 'transform',
      ...(stateStyles[state] || stateStyles.visible),
    }}>

      {/* Sender row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
          fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
          ...(notif.senderType === 'human'
            ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60A5FA' }
            : { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#10B981' }
          ),
        }}>
          {notif.senderInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Hanken Grotesk', 'Inter', sans-serif" }}>
            {notif.senderName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{
              fontSize: 11, color: C.muted,
              fontFamily: "'JetBrains Mono', monospace",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {notif.roomName}
            </span>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: C.muted, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
              {notif.timeAgo}
            </span>
          </div>
        </div>
        <span style={{
          padding: '2px 7px', borderRadius: 3,
          fontSize: 10, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.06em',
          flexShrink: 0,
          background: badgeStyle.bg, color: badgeStyle.color,
          border: `1px solid ${badgeStyle.border}`,
        }}>
          {BADGE_LABELS[notif.badgeType] || 'Message'}
        </span>
      </div>

      {/* Message preview */}
      <div style={{
        background: C.s1,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '14px 16px',
      }}>
        <p style={{
          fontSize: 14, color: C.text, lineHeight: 1.55, margin: 0,
          fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: expanded ? 'unset' : 2,
          overflow: expanded ? 'visible' : 'hidden',
        }}>
          {notif.messagePreview}
        </p>
        {notif.messagePreview.length > 160 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              marginTop: 6, fontSize: 12, color: C.accent,
              cursor: 'pointer', background: 'none', border: 'none',
              padding: 0, fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            {expanded ? 'Show less ↑' : 'Show full message ↓'}
          </button>
        )}
      </div>

      {/* Suggested reply chips */}
      {notif.suggestedReplies && notif.suggestedReplies.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Suggested replies
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {notif.suggestedReplies.slice(0, 3).map((reply, i) => {
              const isLast = i === notif.suggestedReplies.slice(0, 3).length - 1
              const isSelected = selectedChip === reply
              return (
                <button
                  key={reply}
                  onClick={() => handleChipClick(reply)}
                  disabled={submitting}
                  style={{
                    padding: '7px 14px', borderRadius: 20,
                    border: isSelected
                      ? '1px solid #10B981'
                      : isLast
                        ? `1px solid ${C.border}`
                        : '1px solid rgba(16,185,129,0.3)',
                    background: isSelected ? '#10B981' : 'transparent',
                    color: isSelected
                      ? '#08141C'
                      : isLast
                        ? C.text2
                        : '#10B981',
                    fontSize: 13, fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting && !isSelected ? 0.5 : 1,
                    whiteSpace: 'nowrap', minHeight: 36,
                    display: 'flex', alignItems: 'center',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  {reply}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom reply */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={inputVal}
          onChange={e => {
            setInputVal(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Write a reply… (sent to ${notif.senderName} in ${notif.roomName})`}
          disabled={submitting}
          style={{
            flex: 1, background: C.s1,
            border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '10px 12px',
            color: C.text, fontSize: 14,
            fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
            resize: 'none', minHeight: 40, maxHeight: 120,
            lineHeight: 1.5,
            outline: 'none',
          }}
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!inputVal.trim() || submitting}
          style={{
            width: 40, height: 40, background: '#10B981',
            border: 'none', borderRadius: 8,
            cursor: !inputVal.trim() || submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            opacity: !inputVal.trim() || submitting ? 0.4 : 1,
            transition: 'background 0.15s ease, opacity 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#08141C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Completion Screen ─────────────────────────────────────────────────────────

function CompletionScreen({ replied, skipped, senderNames, onClose }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      gap: 16,
      textAlign: 'center',
      animation: 'cnCompletionIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Confetti */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 30 }, (_, i) => <ConfettiPiece key={i} index={i} />)}
      </div>

      {/* Check icon */}
      <div style={{
        width: 56, height: 56,
        background: 'rgba(16,185,129,0.1)',
        border: '2px solid rgba(16,185,129,0.3)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#10B981',
        animation: 'cnCheckPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div style={{
        fontSize: 22, fontWeight: 800, color: C.text,
        letterSpacing: '-0.025em',
        fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
      }}>
        All caught up
      </div>

      <div style={{ display: 'flex', gap: 28 }}>
        {[
          { num: replied, label: 'Replied', color: '#10B981' },
          { num: skipped, label: 'Skipped', color: C.text2 },
        ].map(({ num, label, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color }}>
              {num}
            </div>
            <div style={{
              fontSize: 10, color: C.muted,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        fontSize: 13, color: C.text2, lineHeight: 1.55,
        maxWidth: 300,
        fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
      }}>
        {replied > 0
          ? `Replies sent to ${senderNames}.`
          : 'All notifications reviewed.'}
      </div>

      <button
        onClick={onClose}
        style={{
          marginTop: 8, padding: '10px 28px',
          background: '#10B981', color: '#08141C',
          fontSize: 13, fontWeight: 600,
          border: 'none', borderRadius: 6,
          cursor: 'pointer',
          fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
          minHeight: 44,
        }}
      >
        Back to dashboard
      </button>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function CatchupModal({ isOpen, notifications, onClose, onReply, onSkip }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardStates, setCardStates] = useState([]) // ['visible', 'enter-right', ...]
  const [replied, setReplied] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const touchStartX = useRef(0)
  const backdropRef = useRef(null)
  const modalRef = useRef(null)

  // Reset state when modal opens with new notifications
  useEffect(() => {
    if (!isOpen || !notifications || notifications.length === 0) return
    setCurrentIndex(0)
    setReplied(0)
    setSkipped(0)
    setIsComplete(false)
    setCardStates(notifications.map((_, i) => i === 0 ? 'visible' : 'enter-right'))
  }, [isOpen, notifications])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight') goForward()
      if (e.key === 'ArrowLeft') goBack()
      if (e.key === 's') handleSkip()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, currentIndex, notifications, replied, skipped, isComplete]) // eslint-disable-line

  const total = notifications ? notifications.length : 0

  const goToCard = useCallback((targetIndex, direction) => {
    setCardStates(prev => {
      const next = [...prev]
      if (direction === 'forward') {
        next[currentIndex] = 'exit-left'
        next[targetIndex] = 'enter-right'
        // One frame later, snap to visible
        requestAnimationFrame(() => {
          setCardStates(s => {
            const ss = [...s]
            ss[targetIndex] = 'visible'
            return ss
          })
        })
      } else {
        next[currentIndex] = 'exit-right'
        next[targetIndex] = 'enter-left'
        requestAnimationFrame(() => {
          setCardStates(s => {
            const ss = [...s]
            ss[targetIndex] = 'visible'
            return ss
          })
        })
      }
      return next
    })
    setCurrentIndex(targetIndex)
  }, [currentIndex])

  const advanceOrComplete = useCallback((repliedCount, skippedCount) => {
    if (currentIndex >= total - 1) {
      setIsComplete(true)
    } else {
      goToCard(currentIndex + 1, 'forward')
    }
  }, [currentIndex, total, goToCard])

  const handleChipReply = useCallback((notif, replyText) => {
    onReply && onReply(notif, replyText)
    const nextReplied = replied + 1
    setReplied(nextReplied)
    if (currentIndex >= total - 1) {
      setIsComplete(true)
    } else {
      goToCard(currentIndex + 1, 'forward')
    }
  }, [onReply, replied, currentIndex, total, goToCard])

  const handleTextReply = useCallback((notif, replyText) => {
    onReply && onReply(notif, replyText)
    const nextReplied = replied + 1
    setReplied(nextReplied)
    if (currentIndex >= total - 1) {
      setIsComplete(true)
    } else {
      goToCard(currentIndex + 1, 'forward')
    }
  }, [onReply, replied, currentIndex, total, goToCard])

  const handleSkip = useCallback(() => {
    if (!notifications || notifications.length === 0) return
    onSkip && onSkip(notifications[currentIndex])
    const nextSkipped = skipped + 1
    setSkipped(nextSkipped)
    if (currentIndex >= total - 1) {
      setIsComplete(true)
    } else {
      goToCard(currentIndex + 1, 'forward')
    }
  }, [notifications, currentIndex, onSkip, skipped, total, goToCard])

  const goForward = useCallback(() => {
    if (isComplete || currentIndex >= total - 1) return
    goToCard(currentIndex + 1, 'forward')
  }, [isComplete, currentIndex, total, goToCard])

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return
    goToCard(currentIndex - 1, 'back')
  }, [currentIndex, goToCard])

  // Touch swipe
  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 60) return
    if (dx < 0 && currentIndex < total - 1) goToCard(currentIndex + 1, 'forward')
    else if (dx > 0 && currentIndex > 0) goToCard(currentIndex - 1, 'back')
  }, [currentIndex, total, goToCard])

  if (!isOpen || !notifications || notifications.length === 0) return null

  const senderNames = notifications.slice(0, 3).map(n => n.senderName).join(', ')

  return (
    <>
      {/* Keyframe CSS for animations */}
      <style>{`
        @keyframes cnBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cnModalIn {
          from { transform: translateY(24px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes cnCompletionIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cnCheckPop {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes cnConfettiFall {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.9; }
          80% { opacity: 0.7; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot, 360deg)) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'cnBackdropIn 0.25s ease',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Notification catch-up"
      >
        {/* Modal */}
        <div
          ref={modalRef}
          style={{
            background: C.dim,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            width: 'min(640px, 92vw)',
            maxHeight: '90dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
            position: 'relative',
            animation: 'cnModalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0, gap: 12,
          }}>
            {/* Title */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600, color: C.text,
              whiteSpace: 'nowrap',
              fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
            }}>
              <div style={{
                width: 22, height: 22,
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#10B981', flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              Catch up
            </div>

            {/* Progress */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              flex: 1, justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: C.text2, whiteSpace: 'nowrap',
              }}>
                {isComplete ? 'All done' : `${currentIndex + 1} of ${total}`}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: total }, (_, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i < currentIndex || isComplete
                      ? '#10B981'
                      : i === currentIndex
                        ? '#10B981'
                        : C.border,
                    boxShadow: i === currentIndex && !isComplete
                      ? '0 0 0 2.5px rgba(16,185,129,0.2)' : 'none',
                    transition: 'background 0.2s ease',
                  }} />
                ))}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close catch-up"
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 5, cursor: 'pointer',
                color: C.text2, flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Card viewport (or completion screen) */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            {!isComplete ? (
              notifications.map((notif, i) => (
                <NotifCard
                  key={notif.id || i}
                  notif={notif}
                  state={cardStates[i] || 'enter-right'}
                  onChipReply={handleChipReply}
                  onTextReply={handleTextReply}
                />
              ))
            ) : (
              <CompletionScreen
                replied={replied}
                skipped={skipped}
                senderNames={senderNames}
                onClose={onClose}
              />
            )}
          </div>

          {/* Footer (hidden on completion) */}
          {!isComplete && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: `1px solid ${C.border}`,
              flexShrink: 0,
            }}>
              <button
                onClick={goBack}
                disabled={currentIndex === 0}
                aria-label="Previous notification"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.text2, fontSize: 13,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentIndex === 0 ? 0.3 : 1,
                  fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
                  minHeight: 36, transition: 'all 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>

              <button
                onClick={handleSkip}
                style={{
                  fontSize: 12, color: C.muted,
                  background: 'none', border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
                  padding: '6px 10px', borderRadius: 4,
                  minHeight: 36,
                }}
              >
                Skip →
              </button>

              <button
                onClick={goForward}
                disabled={currentIndex >= total - 1}
                aria-label="Next notification"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.text2, fontSize: 13,
                  cursor: currentIndex >= total - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentIndex >= total - 1 ? 0.3 : 1,
                  fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
                  minHeight: 36, transition: 'all 0.15s ease',
                }}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
