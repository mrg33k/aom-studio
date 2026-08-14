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
import { OVERLAY } from './lib/uiKit.jsx'

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

function NotifCard({ notif, direction, onChipReply, onTextReply, onLoadContext, onOpenRoom }) {
  const [inputVal, setInputVal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedChip, setSelectedChip] = useState(null)
  // R3 — context messages from the same room that landed BEFORE this unread
  // notification, so the user reads it as a thread instead of a cold one-liner.
  const [contextMsgs, setContextMsgs] = useState(null)  // null=loading, []=none, [..]=loaded
  // R7 — lightbox for full-screen image preview
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const inputRef = useRef(null)
  // R7 — ref for the outer card div so we can scroll it to the bottom after
  // context loads, ensuring the last (unread) message is always fully visible.
  // Moved from the inner threadRef so the scroll covers ALL card content,
  // not just the 300px-capped sub-container.
  const cardRef = useRef(null)

  // Fetch context whenever a new notification mounts.
  useEffect(() => {
    let cancelled = false
    setContextMsgs(null)
    if (!onLoadContext || !notif) { setContextMsgs([]); return }
    Promise.resolve(onLoadContext(notif))
      .then(msgs => { if (!cancelled) setContextMsgs(Array.isArray(msgs) ? msgs : []) })
      .catch(() => { if (!cancelled) setContextMsgs([]) })
    return () => { cancelled = true }
  }, [notif?.id, onLoadContext])

  // R7 (was R6) — auto-scroll the card to the bottom so the unread notification
  // is fully visible. Using cardRef (the outer card container) instead of the
  // inner thread sub-container so long messages are never clipped by a
  // secondary scroll area.
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollTop = cardRef.current.scrollHeight
    }
  }, [contextMsgs])

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
    // R3 — stop space key from bubbling to parent keyboard handlers
    // that might route rooms. Space is a normal char and the parent
    // shouldn't intercept it. stopPropagation allows typing but blocks bubbling.
    if (e.key === ' ') {
      e.stopPropagation()
    }
  }, [handleSend])

  // R21b — One card on screen at a time. Parent passes a fresh key each time
  // currentIndex changes so React remounts the card and the CSS keyframe
  // animation fires cleanly with no stacking artifacts on rapid Skip/Next.
  const animationName = direction === 'back' ? 'cnCardInLeft' : 'cnCardInRight'

  return (
    <div
      ref={cardRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 20px 20px',
        gap: 14,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        animation: `${animationName} 0.28s cubic-bezier(0.16, 1, 0.3, 1)`,
        maxHeight: '100%',
      }}
    >

      {/* Sender row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
          fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
          ...(notif.senderType === 'human'
            ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60A5FA' }
            : { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#10B981' }
          ),
        }}>
          {notif.senderInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif" }}>
            {notif.senderName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <button
              onClick={() => onOpenRoom && onOpenRoom(notif)}
              style={{
                fontSize: 11, color: onOpenRoom ? C.accent : C.muted,
                fontFamily: "'JetBrains Mono', monospace",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                background: 'none', border: 'none', padding: 0,
                cursor: onOpenRoom ? 'pointer' : 'default',
                textDecoration: onOpenRoom ? 'underline' : 'none',
                textDecorationColor: 'rgba(16,185,129,0.4)',
                textUnderlineOffset: 2,
              }}
            >
              {notif.roomName}
            </button>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: C.muted, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
              {notif.timeAgo}
            </span>
          </div>
        </div>
      </div>

      {/* R6 — Unified thread: earlier context + unread notification as the
          final bubble. One scrollable container so the user reads the full
          conversation in flow. The unread message is always last and
          highlighted with an accent border so it stands out without being
          separated from its context. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {contextMsgs && contextMsgs.length > 0 && (
          <div style={{
            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
            color: C.muted, textTransform: 'uppercase', letterSpacing: '0.10em',
            marginBottom: 2,
          }}>
            Earlier in this thread
          </div>
        )}
        {/* R7 — thread container no longer has its own maxHeight / scroll.
            The outer cardRef container handles scrolling, so messages
            (including the last unread one) are never clipped by a
            secondary fixed-height scroll area. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingRight: 2,
          }}
        >
          {/* Earlier context messages */}
          {contextMsgs && contextMsgs.map((m) => {
            const fromUser = m.role === 'user'
            const imgUrl = m.attachment?.url || (m.attachments?.[0]?.url) || null
            return (
              <div key={m.id} style={{
                display: 'flex',
                justifyContent: fromUser ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%',
                  background: fromUser ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${fromUser ? 'rgba(59,130,246,0.14)' : C.border}`,
                  borderRadius: 8,
                  padding: '8px 11px',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: C.muted,
                  fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  <span style={{
                    display: 'block',
                    fontSize: 10,
                    color: C.dim || C.muted,
                    marginBottom: 2,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.02em',
                  }}>
                    {m.senderName}
                  </span>
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt="attachment"
                      onClick={() => setLightboxUrl(imgUrl)}
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: 180,
                        borderRadius: 6,
                        marginBottom: m.text ? 6 : 0,
                        objectFit: 'contain',
                        cursor: 'zoom-in',
                      }}
                    />
                  )}
                  {m.text}
                </div>
              </div>
            )
          })}

        </div>
      </div>

      {/* Open room link — navigate into the full conversation */}
      {onOpenRoom && (
        <button
          onClick={() => onOpenRoom(notif)}
          style={{
            alignSelf: 'flex-start',
            fontSize: 12,
            color: C.text2,
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 0,
            fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: -4,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Open room
        </button>
      )}

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
                    fontSize: 13, fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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
            fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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

      {/* R7 — Image lightbox overlay. Rendered inside the card so it escapes
          any parent stacking context issues. position:fixed ensures it covers
          the full viewport including the catch-up modal itself. */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'cnLightboxIn 0.18s ease',
          }}
          role="dialog"
          aria-label="Image preview"
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null) }}
            aria-label="Close preview"
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#fff',
              zIndex: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
 {/* Image, stop propagation so clicking on the image doesn't close */}
          <img
            src={lightboxUrl}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(90vw, 1200px)',
              maxHeight: '85dvh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Completion Screen ─────────────────────────────────────────────────────────

function CompletionScreen({ replied, skipped, senderNames, onClose }) {
  return (
    <div style={{
      position: 'relative',
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
        fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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
        fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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
          fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
          minHeight: 44,
        }}
      >
        Back to dashboard
      </button>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function CatchupModal({ isOpen, notifications, onClose, onReply, onSkip, onLoadContext, onOpenRoom }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // R21b — direction is purely a CSS-animation hint passed to the current
  // card. We render ONE card at a time and remount on index change, so
  // there's nothing to orchestrate across siblings.
  const [direction, setDirection] = useState('forward')
  const [replied, setReplied] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const touchStartX = useRef(0)
  const backdropRef = useRef(null)
  const modalRef = useRef(null)

  // Reset state only when the modal transitions closed → open.
  // Bug fix (R3b): previously depended on `notifCount` so any new
  // notification arriving while the modal was open re-ran this effect,
  // snapped currentIndex back to 0, remounted the card, and wiped
  // whatever the user was typing. Now we track the previous isOpen value
  // and only reset on the false→true edge.
  const prevOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current
    prevOpenRef.current = isOpen
    if (!justOpened) return
    setCurrentIndex(0)
    setDirection('forward')
    setReplied(0)
    setSkipped(0)
    setIsComplete(false)
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      // Bug fix (R3b): never intercept shortcuts while the user is typing
      // in an input or textarea. Without this guard, typing any letter 's'
      // (extremely common — "let's", "is", "yes") fired handleSkip() and
      // advanced to the next card mid-composition.
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight') goForward()
      if (e.key === 'ArrowLeft') goBack()
      if (e.key === 's') handleSkip()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, currentIndex, notifications, replied, skipped, isComplete]) // eslint-disable-line

  const total = notifications ? notifications.length : 0

  const goToCard = useCallback((targetIndex, dir) => {
    setDirection(dir === 'back' ? 'back' : 'forward')
    setCurrentIndex(targetIndex)
  }, [])

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
        @keyframes cnCardInRight {
          from { transform: translateX(28px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes cnCardInLeft {
          from { transform: translateX(-28px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
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
        @keyframes cnLightboxIn {
          from { opacity: 0; }
          to   { opacity: 1; }
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
          background: OVERLAY.backdrop,
          backdropFilter: OVERLAY.backdropBlur,
          WebkitBackdropFilter: OVERLAY.backdropBlur,
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
        {/* Modal — sizes to content (header + current card + footer), capped
            at 90dvh so a long expanded message doesn't push it offscreen. */}
        <div
          ref={modalRef}
          style={{
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: OVERLAY.panelRadius,
            width: 'min(560px, 92vw)',
            maxHeight: '90dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: OVERLAY.panelShadow,
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
              fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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

          {/* Card viewport — renders ONE card at a time. Remounting on
              currentIndex change is what triggers the slide-in animation
              cleanly (no DOM-stacked siblings, no rapid-click overlap).
              flex:1 + minHeight:0 lets the card scroll internally when an
              expanded message would otherwise push past the 90dvh cap. */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {!isComplete && notifications[currentIndex] ? (
              <NotifCard
                key={notifications[currentIndex]?.id}
                notif={notifications[currentIndex]}
                direction={direction}
                onChipReply={handleChipReply}
                onTextReply={handleTextReply}
                onLoadContext={onLoadContext}
                onOpenRoom={onOpenRoom}
              />
            ) : isComplete ? (
              <CompletionScreen
                replied={replied}
                skipped={skipped}
                senderNames={senderNames}
                onClose={onClose}
              />
            ) : null}
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
                  fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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
                  fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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
                  fontFamily: "'Hanken Grotesk', 'Hanken Grotesk', sans-serif",
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