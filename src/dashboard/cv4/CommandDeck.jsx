// CommandDeck.jsx — Panel for Elon's room that surfaces loop system at a glance
// Mission: aom:command-deck
// Displays: loop health, hard calls (needs-patrik), steering questions, room status, stuck sessions
// Data sources: open-questions.md, needs-patrik.md, room-goals.json, ~/.claude/jobs, routines table
// All data is read-only except writes to master-loop deliverables via /api/dashboard/command-deck-action
//
// M10 (2026-06-15): every card is built on ONE shared shell (DeckCard) with ONE
// uniform action bar — decide chips, Reply, Open room, Dismiss — so no card is
// ever a dead end. Actions that genuinely don't apply are absent cleanly.

import { useState, useEffect, useCallback, useRef } from 'react'
import { authFetch } from '../lib/authFetch.js'
import { C } from '../lib/cv3Colors.js'

const AMBER = 'var(--c-yellow)'
const FONT = {
  body: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', monospace",
}

// ── Helper: human room names (no techie slugs in the UI) ───────────────────
// Patrik: "the naming of the chats is very computer techie it's not very
// intuitive." A loop room slug like "corner:gemini-workers" or the 3-part
// "aom:agent-hooks:design-hook" must never show as-is. We turn it into a
// readable name plus a small context tag (the project it lives under).

function titleCaseSlug(s) {
  return (s || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

// nameMap is { slug: "Human Title" } built from structure-map.json. Returns
// { name, tag }: name is what to show, tag is the parent context ("" if none).
function roomDisplay(slug, nameMap = {}) {
  if (!slug) return { name: '', tag: '' }
  // Agent rooms (no colon) are just the agent's name.
  if (!slug.includes(':')) return { name: titleCaseSlug(slug), tag: '' }
  const parts = slug.split(':')
  const mission = parts[parts.length - 1]
  const project = parts[parts.length - 2] || ''
  // Prefer the room's real title from its CONTEXT.md (via the structure map).
  // Fall back to a tidied mission segment. Never let a raw slug through.
  let name = nameMap[slug]
  if (!name || name.includes(':')) name = titleCaseSlug(mission)
  return { name, tag: project ? titleCaseSlug(project) : '' }
}

// Swap any techie slug token inside free-text (hard-call titles, steering
// questions, keeper details) for its human name. A slug token is 2+ colon-
// joined lowercase segments starting with a letter (corner:drive-mirror,
// aom:aheadofmarket.com:brand). Times ("9:45") and "Re:" are excluded by the
// lowercase-letter start + no-space-after-colon rule.
const SLUG_TOKEN_RE = /\b[a-z][a-z0-9-]*(?::[a-z0-9][a-z0-9.-]*)+\b/g
// Slash-style room paths leak the same plumbing a slug does
// ("corner/missions/support-desk/", "sourcing-directory/space-rising-v2/discovery").
// Match only multi-segment lowercase paths NOT preceded by "/" or ":" (so URLs
// like https://x.com/a/b are left alone), then show the human room name.
const PATH_GENERIC = new Set(['corner', 'users', 'aom', 'projects', 'missions', 'deliverables', 'src', 'dashboard', 'api', 'public', 'data', 'directory'])
const PATH_ROOTS = new Set(['corner', 'users', 'aom', 'projects'])
const PATH_TOKEN_RE = /(^|[^/:.\w])((?:[a-z0-9][a-z0-9-]*\/){1,}[a-z0-9][a-z0-9-]*\/?)/g
function humanizePaths(text, nameMap = {}) {
  return text.replace(PATH_TOKEN_RE, (full, pre, path) => {
    const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)
    if (parts.length < 2) return full
    const meaningful = parts.filter((p) => !PATH_GENERIC.has(p))
    const guess = meaningful.length >= 2
      ? `${meaningful[meaningful.length - 2]}:${meaningful[meaningful.length - 1]}`
      : null
    // Only rewrite REAL room paths: a known filesystem root, a hyphenated room
    // slug (support-desk, space-rising-v2), or a path whose room is in the
    // structure map. Leaves "yes/no", "16/9", "his/her", URLs untouched.
    const isRoomPath = PATH_ROOTS.has(parts[0]) || parts.some((p) => p.includes('-')) || (guess && nameMap[guess])
    if (!isRoomPath) return full
    if (guess && nameMap[guess]) return pre + nameMap[guess]
    const last = meaningful[meaningful.length - 1] || parts[parts.length - 1]
    return pre + titleCaseSlug(last)
  })
}
function humanizeSlugs(text, nameMap = {}) {
  if (!text || typeof text !== 'string') return text
  const colons = text.replace(SLUG_TOKEN_RE, (m) => {
    const d = roomDisplay(m, nameMap)
    return d.tag ? `${d.name} (${d.tag})` : d.name
  })
  return humanizePaths(colons, nameMap)
}

// Small muted chip rendered next to a room name to show where it lives.
function ContextTag({ tag }) {
  if (!tag) return null
  return (
    <span style={{
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      color: 'var(--c-muted, #8a8a8a)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 5,
      padding: '1px 6px',
      flexShrink: 0,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {tag}
    </span>
  )
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

function CommandDeckBtn({ children, onClick, disabled = false, primary = false, danger = false, style = {} }) {
  const baseColor = danger ? 'rgba(255,255,255,0.55)' : C.text2
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? 'rgba(234,179,8,0.10)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${primary ? 'rgba(234,179,8,0.45)' : C.border}`,
        color: primary ? AMBER : baseColor,
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
      onMouseLeave={e => { if (!primary) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = baseColor } }}
    >
      {children}
    </button>
  )
}

// ── Shared: tap-one option chips ───────────────────────────────────────────
// The loop's (or a sensible default) pre-worked-out moves for any card. Tap one
// and the card's submit handler records it. Used by hard calls, steering
// questions, room status, and keeper cards so every open item decides the same.

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
            padding: '12px 12px',
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

// ── Shared: inline reply box ───────────────────────────────────────────────
// Patrik: "I should have a chat box option for each where I can type in what I
// do want to reply." Reply button reveals an input; sending posts the message
// straight into that room's chat (and the room's assistant picks it up), so he
// never has to leave the deck. onReply(room, text) returns { ok }.

function ReplyBox({ room, onReply, label = 'Reply' }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  if (!room || !onReply) return null

  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    const res = await onReply(room, t)
    setSending(false)
    if (res && res.ok) {
      setText('')
      setOpen(false)
      setSent(true)
      setTimeout(() => setSent(false), 4000)
    }
  }

  if (sent) {
    return (
      <span style={{ fontSize: 11, color: AMBER, fontFamily: FONT.mono, fontWeight: 600 }}>
        ✓ Sent to room
      </span>
    )
  }

  if (!open) {
    return <CommandDeckBtn onClick={() => setOpen(true)}>{label}</CommandDeckBtn>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your reply to this room…"
        rows={2}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: C.s1,
          border: `1px solid ${C.border}`,
          color: C.text,
          fontSize: 13,
          fontFamily: FONT.body,
          borderRadius: 8,
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          if (e.key === 'Escape') { setOpen(false); setText('') }
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <CommandDeckBtn onClick={send} disabled={!text.trim() || sending} primary
          style={{ opacity: !text.trim() || sending ? 0.6 : 1 }}>
          {sending ? 'Sending…' : 'Send to room'}
        </CommandDeckBtn>
        <CommandDeckBtn onClick={() => { setOpen(false); setText('') }}>
          Cancel
        </CommandDeckBtn>
      </div>
    </div>
  )
}

// ── Shared: free-text answer (steering questions' "Something else") ─────────
// Records a typed answer through whatever submit the card supplies (for
// questions that's answer_question, which closes the question + sets the goal).

function FreeTextAnswer({ label = 'Something else', placeholder = 'Type your answer…', onSubmit }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

  if (!onSubmit) return null
  if (!open) return <CommandDeckBtn onClick={() => setOpen(true)}>{label}</CommandDeckBtn>

  const submit = async () => {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    await onSubmit(t)
    setBusy(false)
    setText('')
    setOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '8px 12px',
          background: C.s1,
          border: `1px solid ${C.border}`,
          color: C.text,
          fontSize: 13,
          fontFamily: FONT.body,
          borderRadius: 8,
          boxSizing: 'border-box',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setOpen(false); setText('') }
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <CommandDeckBtn onClick={submit} disabled={!text.trim() || busy} primary
          style={{ opacity: !text.trim() || busy ? 0.6 : 1 }}>
          {busy ? 'Saving…' : 'Send'}
        </CommandDeckBtn>
        <CommandDeckBtn onClick={() => { setOpen(false); setText('') }}>Cancel</CommandDeckBtn>
      </div>
    </div>
  )
}

// ── Shared: preloaded message that fires on a timer (Command Center Round 4) ─
// The everyday flow (command-center-vision): the EA loads the single best-guess
// answer it thinks Patrik would give, shows a countdown, and lets him EDIT before
// it fires. Do nothing → it sends on the timer and the EA keeps pushing the goal
// toward finished. Touching the box takes control (pauses the timer); "Send now"
// fires immediately; "Hold" parks it. The deck-level Auto-send toggle is the
// master switch — off means nothing fires on its own, every best-guess still sits
// here pre-written for one-tap send. NOTE: this browser timer is the visible
// intervention window; the EA's own push when Patrik is away is the loop's job.
const DEFAULT_FIRE_SECONDS = 120

function PreloadedMessage({ message, seconds = DEFAULT_FIRE_SECONDS, autoSend = true, onFire }) {
  const [text, setText] = useState(message || '')
  const [remaining, setRemaining] = useState(seconds)
  const [held, setHeld] = useState(!autoSend)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const firedRef = useRef(false)
  // Always send the LATEST edited text, never a value captured when the timer
  // started — the auto-fire reads this ref, not a closure.
  const textRef = useRef(text)
  useEffect(() => { textRef.current = text }, [text])
  // Never fire while the user can't see the countdown. If the tab is hidden the
  // timer freezes and resumes when they come back, so a best-guess never sends
  // unseen behind their back (the browser timer is the visible window only).
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)

  useEffect(() => { setText(message || '') }, [message])
  useEffect(() => { setHeld(!autoSend) }, [autoSend])

  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const fire = useCallback(async (override) => {
    if (firedRef.current || sending) return
    const t = (override !== undefined ? override : textRef.current).trim()
    if (!t) return
    firedRef.current = true
    setSending(true)
    try {
      await onFire(t)
      setSent(true)
    } catch (err) {
      console.error('Preloaded send failed:', err)
      firedRef.current = false
    } finally {
      setSending(false)
    }
  }, [onFire, sending])

  useEffect(() => {
    if (held || sent || sending || hidden) return
    if (remaining <= 0) { fire(); return }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => clearInterval(id)
  }, [held, sent, sending, hidden, remaining, fire])

  if (sent) {
    return (
      <div style={{ fontSize: 12, color: AMBER, fontFamily: FONT.mono, fontWeight: 600 }}>
        ✓ Sent — the EA is pushing this forward.
      </div>
    )
  }

  const safeRem = Math.max(0, remaining)
  const mmss = `${Math.floor(safeRem / 60)}:${String(safeRem % 60).padStart(2, '0')}`
  const urgent = !held && safeRem <= 15

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 7,
      padding: '9px 11px', borderRadius: 9,
      background: 'rgba(234,179,8,0.05)',
      border: `1px solid ${held ? C.border : 'rgba(234,179,8,0.30)'}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10.5, fontFamily: FONT.mono, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: C.muted,
      }}>
 <span>EA's answer{held ? '' : ', sending'}</span>
        <span style={{
          color: held ? C.muted : (urgent ? C.s1 : AMBER), fontWeight: 700,
          animation: urgent ? 'cmddeck-pulse 1s ease-in-out infinite' : 'none',
        }}>
          {held ? 'Held' : `sends in ${mmss}`}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setHeld(true)}
        rows={2}
        style={{
          width: '100%', padding: '7px 10px', background: C.s1,
          border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
          fontFamily: FONT.body, borderRadius: 7, boxSizing: 'border-box', resize: 'vertical',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) fire()
        }}
      />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <CommandDeckBtn onClick={() => fire()} disabled={!text.trim() || sending} primary
          style={{ opacity: !text.trim() || sending ? 0.6 : 1 }}>
          {sending ? 'Sending…' : 'Send now'}
        </CommandDeckBtn>
        <CommandDeckBtn onClick={() => setHeld((h) => !h)}>
          {held ? 'Resume auto-send' : 'Hold'}
        </CommandDeckBtn>
      </div>
    </div>
  )
}

// ── Shared shell: ONE card, ONE action model for every item ────────────────
// Patrik (2026-06-15): "I was expecting all cards to have the same actions and
// be robust." So every card type renders through this shell, and the action bar
// is always the same shape + order:
//   [decide chips]   then   Reply · Open room · Dismiss
// Anything that doesn't apply to a given card is omitted cleanly — never a dead
// button. `tier` controls visual weight (1 = dominant "waiting on you", 2 =
// quiet secondary) for the design pass.

function DeckCard({
  title,
  tag,
  badge,
  body,
  metaLine,
  dotActive = true,
  dimmed = false,
  doneLabel,
  // decide
  preload,             // { message, autoSend, onFire } | undefined — the live best-guess
  options = [],
  picked = null,
  loading = false,
  onPickOption,
  freeText,            // { label, placeholder, onSubmit } | undefined
  // act
  room,
  onReply,
  onJumpToRoom,
  onDismiss,           // async () => void
  dismissLabel = 'Dismiss',
  tier = 1,
}) {
  const [dismissing, setDismissing] = useState(false)
  const hasOptions = Array.isArray(options) && options.length > 0
  const hasRoom = !!room
  const showAct = !!(hasRoom || onDismiss || freeText || preload)

  const doDismiss = async () => {
    if (dismissing || !onDismiss) return
    setDismissing(true)
    try { await onDismiss() } finally { setDismissing(false) }
  }

  return (
    <div style={{
      padding: tier === 1 ? '15px 17px 13px' : '12px 15px 11px',
      background: tier === 1 ? 'rgba(255,255,255,0.022)' : 'rgba(255,255,255,0.012)',
      border: `1px solid ${tier === 1 ? C.border : 'rgba(255,255,255,0.05)'}`,
      // Tier-1 decisions carry a left amber keystone so the eye lands on them
      // first (Bloomberg-style severity band). Dim it once handled.
      borderLeft: tier === 1 ? `3px solid ${dimmed ? 'rgba(234,179,8,0.25)' : AMBER}` : undefined,
      borderRadius: 11,
      marginBottom: tier === 1 ? 12 : 9,
      fontFamily: FONT.body,
      opacity: dimmed ? 0.6 : 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header: status dot + title + (badge or context tag) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: dotActive && !dimmed ? AMBER : 'rgba(255,255,255,0.18)',
          boxShadow: dotActive && !dimmed ? `0 0 0 3px rgba(234,179,8,0.14)` : 'none',
        }} />
        <span style={{
          fontFamily: FONT.display,
          fontSize: tier === 1 ? 15 : 13.5,
          color: dimmed ? C.muted : C.text,
          fontWeight: tier === 1 ? 800 : 700,
          letterSpacing: '-0.02em',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        {badge ? (
          <span style={{
            fontSize: 10, color: AMBER, fontFamily: FONT.mono, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
          }}>
            {badge}
          </span>
        ) : <ContextTag tag={tag} />}
      </div>

      {/* Body */}
      {body && (
        <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.45 }}>
          {body}
        </p>
      )}

      {/* Optional meta line (status / confidence / time) */}
      {metaLine}

      {/* Action footer — uniform across every card */}
      {doneLabel ? (
        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 8,
          fontSize: 11, color: C.muted, fontFamily: FONT.mono,
        }}>
          {doneLabel}
        </div>
      ) : showAct ? (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          borderTop: `1px solid ${C.border}`, paddingTop: 10,
        }}>
          {preload && (
            <PreloadedMessage
              message={preload.message}
              autoSend={preload.autoSend}
              onFire={preload.onFire}
            />
          )}
          {hasOptions && (
            <OptionChips options={options} picked={picked} loading={loading} onPick={onPickOption} />
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {freeText && (
              <FreeTextAnswer
                label={freeText.label}
                placeholder={freeText.placeholder}
                onSubmit={freeText.onSubmit}
              />
            )}
            {hasRoom && onReply && <ReplyBox room={room} onReply={onReply} />}
            {hasRoom && onJumpToRoom && (
              <CommandDeckBtn onClick={() => onJumpToRoom(room)}>Open room</CommandDeckBtn>
            )}
            {onDismiss && (
              <CommandDeckBtn onClick={doDismiss} disabled={dismissing} danger>
                {dismissing ? '…' : dismissLabel}
              </CommandDeckBtn>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}


// ── Card adapters: each maps its data onto the shared DeckCard shell ────────

function HardCallCard({ item, options = [], onChanged, onDismiss, onReplyToRoom, onJumpToRoom, nameMap = {} }) {
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)

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
      onChanged()
    } catch (err) {
      console.error('Error marking call done:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  // Hard calls don't carry a room slug in their line, so Reply/Open are absent
  // (cleanly). The decide chips are the primary move; "Mark handled" is the
  // no-decision escape.
  const parts = item.text.split(' · ')
  const dateTitle = humanizeSlugs(parts[0] || '', nameMap)
  const why = humanizeSlugs(parts.slice(1).join(' · ') || '', nameMap)
  const hasOptions = options.length > 0

  return (
    <DeckCard
      tier={1}
      title={dateTitle}
      body={why || null}
      options={options}
      picked={picked}
      loading={loading}
      onPickOption={(opt, oi) => submit(opt.answer || opt.label, oi)}
      freeText={{
        // Every hard call can be decided inline by typing, even when the loop
        // hasn't pre-worked option chips yet — so no card is just "Mark done".
        label: hasOptions ? 'Other decision' : 'Decide',
        placeholder: 'Type your decision…',
        onSubmit: (t) => submit(t),
      }}
      onDismiss={onDismiss}
      dismissLabel={hasOptions ? 'Mark handled' : 'Mark done'}
    />
  )
}

function SteeringQuestionCard({ room, question, options = [], onChanged, onDismiss, onJumpToRoom, onReplyToRoom, nameMap = {}, autoSend = true }) {
  const display = roomDisplay(room, nameMap)
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)

  const submitAnswer = async (text, chipIndex = null) => {
    if (!text || !text.trim()) return
    setLoading(true)
    if (chipIndex !== null) setPicked(chipIndex)
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'answer_question', room, answer: text.trim() }),
      })
      onChanged()
    } catch (err) {
      console.error('Error submitting answer:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  const hasOptions = options.length > 0
  // R4: the top option is the EA's single best-guess — it becomes the preloaded,
  // editable, timer-fired message. The rest stay as alternate one-tap chips.
  const top = hasOptions ? options[0] : null
  const preload = top ? {
    message: top.answer || top.label,
    autoSend,
    onFire: (t) => submitAnswer(t),
  } : null
  const altOptions = top ? options.slice(1) : options
  return (
    <DeckCard
      tier={1}
      title={display.name}
      tag={display.tag}
      body={humanizeSlugs(question, nameMap)}
      preload={preload}
      options={altOptions}
      picked={picked}
      loading={loading}
      onPickOption={(opt, oi) => submitAnswer(opt.answer || opt.label, oi)}
      freeText={{
        label: hasOptions ? 'Something else' : 'Answer',
        placeholder: 'Type your answer…',
        onSubmit: (t) => submitAnswer(t),
      }}
      room={room}
      onReply={onReplyToRoom}
      onJumpToRoom={onJumpToRoom}
      onDismiss={onDismiss}
    />
  )
}

// Default decide-moves for a room status card until the loop computes per-room
// moves. Carry `.status` so the chip handler routes to set_room_status.
const ROOM_STATUS_DEFAULT_CHIPS = [
 { label: 'Looks good, keep going', status: 'active', note: 'Looks good, keep going' },
  { label: 'Pause this room for now', status: 'parked', note: 'Paused from the deck' },
]

function RoomStatusCard({ room, data, onChanged, onDismiss, onJumpToRoom, onReplyToRoom, nameMap = {} }) {
  const display = roomDisplay(room, nameMap)
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState(null)

  const {
    goal = '', status, confidence, last_reviewed: lastReviewed,
    last_touched: lastTouched, last_touched_by: touchedBy, sessions = [],
  } = data || {}
  // Freshness truth comes from the ledger's last_touched (the newest REAL activity
  // by literal timecode); fall back to the loop's last_reviewed when the ledger has
  // nothing. This is the staleness fix made visible — the card shows when work
  // actually moved, not just when the loop last looked.
  const freshTs = lastTouched || lastReviewed
  const now = new Date()
  const moved = new Date(freshTs)
  const secondsAgo = Math.max(0, Math.floor((now - moved) / 1000))
  const timeLabel = !freshTs || isNaN(moved) ? '' :
    secondsAgo < 60 ? 'just now' :
    secondsAgo < 3600 ? `${Math.round(secondsAgo / 60)}m ago` :
    secondsAgo < 86400 ? `${Math.round(secondsAgo / 3600)}h ago` :
    `${Math.round(secondsAgo / 86400)}d ago`
  const isStale = secondsAgo > 14400 // > 4 hours
  // What moved it last — the ledger's stream winner, in plain words.
  const movedByLabel = {
    session: 'a terminal session', commit: 'a commit',
    git: 'a code change', file: 'a file update', loop: 'the loop',
  }[touchedBy] || (lastTouched ? '' : 'the loop')
  const liveSessions = (Array.isArray(sessions) ? sessions : []).filter((s) => s && !s.terminal)

  // The loop may attach per-room decide moves ({label, answer}); else fall back
  // to the sensible defaults ({label, status}). The handler routes by shape.
  const loopOptions = Array.isArray(data?.options) ? data.options.filter((o) => o && o.label) : []
  const options = loopOptions.length > 0 ? loopOptions : ROOM_STATUS_DEFAULT_CHIPS

  const pick = async (opt, oi) => {
    setLoading(true)
    setPicked(oi)
    try {
      const body = opt.status
        ? { action: 'set_room_status', room, status: opt.status, answer: opt.note || opt.label }
        : { action: 'answer_question', room, answer: opt.answer || opt.label }
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      onChanged()
    } catch (err) {
      console.error('Error on room-status action:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  const metaLine = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      fontSize: 11, color: C.muted, fontFamily: FONT.mono,
    }}>
      <span>Status: <strong>{status}</strong></span>
      <span>Confidence: <strong>{confidence}</strong>{confidence === 'ambiguous' && ' ⚠'}</span>
      {timeLabel && (
        <span title={lastTouched ? 'Newest real activity on this goal' : 'Last loop review time'}>
          Moved {timeLabel}{movedByLabel && <> · by {movedByLabel}</>}
        </span>
      )}
      {liveSessions.length > 0 && (
        <span title="Live terminal session(s) attached to this goal" style={{ color: AMBER }}>
          ● {liveSessions.length} live session{liveSessions.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )

  return (
    <DeckCard
      tier={2}
      dotActive={isStale}
      title={display.name}
      tag={display.tag}
      body={humanizeSlugs(goal.length > 120 ? goal.substring(0, 120) + '…' : goal, nameMap)}
      metaLine={metaLine}
      options={options}
      picked={picked}
      loading={loading}
      onPickOption={pick}
      room={room}
      onReply={onReplyToRoom}
      onJumpToRoom={onJumpToRoom}
      onDismiss={onDismiss}
    />
  )
}

function StuckSessionCard({ session, onDismiss, onJumpToRoom, nameMap = {} }) {
  // Stuck Claude Code sessions have no deck→session reply pipe yet (needs the
  // session-reply mechanism), so decide chips + Reply are absent cleanly. The
  // suggested answer is shown; Open jumps to it; Dismiss clears it from view.
  const body = (
    <>
      {session.detail && (
        <span style={{ display: 'block' }}>{humanizeSlugs(session.detail, nameMap)}</span>
      )}
      {session.suggestedReply && (
        <span style={{ display: 'block', marginTop: 6, fontStyle: 'italic', color: C.text2 }}>
          <strong style={{ fontStyle: 'normal' }}>Suggested:</strong> {humanizeSlugs(session.suggestedReply, nameMap)}
        </span>
      )}
    </>
  )
  return (
    <DeckCard
      tier={2}
      title={session.name}
      badge={session.state === 'blocked' ? 'Blocked' : 'Stalled'}
      body={body}
      room={`agents/${session.name}`}
      onJumpToRoom={onJumpToRoom}
      onDismiss={onDismiss}
    />
  )
}

function KeeperCard({ proposal, onChanged, onDismiss, nameMap = {} }) {
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
      onChanged()
    } catch (err) {
      console.error('Error recording keeper decision:', err)
      setPicked(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DeckCard
      tier={2}
      title={humanizeSlugs(proposal.title, nameMap)}
      body={proposal.detail ? humanizeSlugs(proposal.detail, nameMap) : null}
      options={Array.isArray(proposal.options) ? proposal.options : []}
      picked={picked}
      loading={loading}
      onPickOption={decide}
      onDismiss={onDismiss}
    />
  )
}

// ── Section header (eyebrow) ───────────────────────────────────────────────

function SectionLabel({ children, marginTop = 0 }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
      letterSpacing: '0.14em', margin: `${marginTop}px 0 14px 0`, fontFamily: FONT.mono,
    }}>
      {children}
    </div>
  )
}

// ── Segmented view switcher ────────────────────────────────────────────────
// Patrik: "this does not feel organized... it needs way better organizational
// flow." Instead of one long wall (17 decisions + 14 rooms + system stuff), the
// deck splits into three focused views. He lands on Decisions (what needs him),
// and flips to Rooms or System on demand. Counts live on each tab.

function SegmentedNav({ view, onView, counts }) {
  const tabs = [
    { key: 'decisions', label: 'Decisions', n: counts.decisions, alarm: counts.decisions > 0 },
    { key: 'rooms', label: 'Rooms', n: counts.rooms },
    { key: 'system', label: 'System', n: counts.system },
  ]
  return (
    <div style={{
      display: 'flex', gap: 5, marginBottom: 26, padding: 5,
      background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`,
      borderRadius: 12,
    }}>
      {tabs.map((t) => {
        const active = view === t.key
        return (
          <button
            key={t.key}
            onClick={() => onView(t.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 12px', borderRadius: 9, cursor: 'pointer',
              background: active ? 'rgba(234,179,8,0.13)' : 'transparent',
              border: `1px solid ${active ? 'rgba(234,179,8,0.45)' : 'transparent'}`,
              color: active ? AMBER : C.text2,
              fontFamily: FONT.mono, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.09em', textTransform: 'uppercase', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = C.text }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.text2 }}
          >
            {t.label}
            <span style={{
              minWidth: 20, padding: '2px 7px', borderRadius: 10, fontSize: 10.5,
              background: t.alarm ? AMBER : 'rgba(255,255,255,0.08)',
              color: t.alarm ? C.s1 : (active ? AMBER : C.muted), fontWeight: 800,
            }}>
              {t.n}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Hero card: the thing that earns the daily open ─────────────────────────
// Council (Steffen + Alex): one dominant card at the very top — a big amber
// count of decisions waiting + a promoted plain-English line + the loop
// heartbeat. No revenue hook here: a blank slot for data that doesn't exist is
// design debt; when a real revenue source exists it becomes its own section.

function HeroCard({ decisionsWaiting, roomsMoving, heartbeat, loopRunning, stale, onRefresh, refreshing, onJumpToDecisions }) {
  const clickable = decisionsWaiting > 0 && onJumpToDecisions
  const sentence = decisionsWaiting > 0
    ? `${decisionsWaiting} ${decisionsWaiting === 1 ? 'decision needs' : 'decisions need'} you. ${roomsMoving} ${roomsMoving === 1 ? 'room is' : 'rooms are'} moving on their own.`
    : `Nothing needs you right now. ${roomsMoving} ${roomsMoving === 1 ? 'room is' : 'rooms are'} moving on their own.`

  return (
    <div
      onClick={clickable ? onJumpToDecisions : undefined}
      role={clickable ? 'button' : undefined}
      title={clickable ? 'Jump to your decisions' : undefined}
      style={{
        position: 'relative',
        padding: '20px 22px',
        marginBottom: 20,
        borderRadius: 14,
        background: 'linear-gradient(160deg, rgba(234,179,8,0.08) 0%, rgba(255,255,255,0.02) 46%, rgba(255,255,255,0.015) 100%)',
        border: `1px solid ${decisionsWaiting > 0 ? 'rgba(234,179,8,0.32)' : C.border}`,
        cursor: clickable ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
    >
      {/* Top row: the big urgency measure + refresh/jump affordances */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 52, fontWeight: 800, lineHeight: 1,
          color: decisionsWaiting > 0 ? AMBER : C.text2, letterSpacing: '-0.03em', flexShrink: 0,
        }}>
          {decisionsWaiting}
        </span>
        <span style={{
          fontSize: 11, color: C.muted, fontFamily: FONT.mono, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1.3,
        }}>
          {decisionsWaiting === 1 ? 'decision' : 'decisions'}<br />waiting
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh && onRefresh() }}
          disabled={refreshing}
          aria-label="Refresh data"
          title="Refresh"
          style={{
            width: 32, height: 32, flexShrink: 0,
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text2, fontSize: 15, cursor: refreshing ? 'default' : 'pointer',
            opacity: refreshing ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↻</button>
        {clickable && (
          <span style={{ color: AMBER, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>›</span>
        )}
      </div>

 {/* The plain-English read, the main line, promoted above the count's label */}
      <p style={{
        margin: '14px 0 0', fontFamily: FONT.display, fontSize: 16, fontWeight: 700,
        color: C.text, lineHeight: 1.4, letterSpacing: '-0.01em',
      }}>
        {sentence}
      </p>

      {/* Heartbeat footer: proof the system is alive at a glance. */}
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 10, color: C.muted, fontFamily: FONT.mono,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
          background: loopRunning ? AMBER : 'rgba(255,255,255,0.18)',
          animation: loopRunning && !stale ? 'cmddeck-pulse 2.4s ease-in-out infinite' : 'none',
        }} />
        {!loopRunning ? 'Loop paused' :
          stale ? <span style={{ color: AMBER, fontWeight: 600 }}>{`Loop may be stuck · last checked ${heartbeat}`}</span> :
          `Loop alive · checked ${heartbeat}`}
      </div>
    </div>
  )
}

// ── Worker pane: what each agent is doing right now (trust layer) ──────────
// Steve: a stuck or silently-failed worker is invisible until a room goes quiet.
// This shows the live workers; blocked/stalled ones read as a loud signal. When
// the loop is running but nothing is working, we say so plainly (honest calm).

function WorkerPane({ workers, loopRunning, alarm = false }) {
  const fmtAge = (s) => s == null ? '' :
    s < 90 ? 'just now' :
    s < 3600 ? `${Math.round(s / 60)}m ago` :
    s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`

  if (!workers || workers.length === 0) {
    // False-calm guardrail: if the loop is running and decisions are stacking
    // up but nothing is executing, that silence is a signal — show it loud.
    return (
      <div style={{
        border: `1px solid ${alarm ? 'rgba(234,179,8,0.32)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 10,
        background: alarm ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.012)',
        padding: '12px 14px',
        fontSize: 12, fontFamily: FONT.mono,
        color: alarm ? AMBER : C.muted, fontWeight: alarm ? 600 : 400,
      }}>
        {alarm ? 'Loop is running but no agents are working. Check for stuck tasks.' :
 loopRunning ? 'No agents working right now, loop is watching.' : 'Loop is paused.'}
      </div>
    )
  }

  return (
    <div style={{
      border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 10,
      background: 'rgba(255,255,255,0.012)', overflow: 'hidden',
    }}>
      {workers.map((w, i) => {
        const stuck = w.state === 'blocked' || w.state === 'stalled'
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            borderTop: i === 0 ? 'none' : `1px solid rgba(255,255,255,0.05)`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
              background: AMBER,
              animation: w.state === 'working' ? 'cmddeck-pulse 2.4s ease-in-out infinite' : 'none',
              boxShadow: stuck ? `0 0 0 3px rgba(234,179,8,0.14)` : 'none',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {w.name}
              </div>
              {w.intent && (
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.intent}
                </div>
              )}
            </div>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 2 }}>
              <span style={{
                fontSize: 9.5, color: stuck ? AMBER : C.muted, fontFamily: FONT.mono,
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {stuck ? w.state : 'working'}
              </span>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: FONT.mono }}>
                {fmtAge(w.ageSeconds)}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CommandDeck({ worldId, basePath, onJumpToRoom, onClose, onReplyToRoom }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data state
  const [loopRunning, setLoopRunning] = useState(false)
  const [loopStatusData, setLoopStatusData] = useState(null)
  const [hardCalls, setHardCalls] = useState([])
  const [steeringQuestions, setSteeringQuestions] = useState([])
  const [roomStatus, setRoomStatus] = useState({})
  const [stuckSessions, setStuckSessions] = useState([])
  const [workers, setWorkers] = useState([])
  const [keeperProposals, setKeeperProposals] = useState([])
  const [activity, setActivity] = useState([])
  const [loopState, setLoopState] = useState(null)
  // Scroll target so the hero card can jump straight to the decisions.
  const decisionsRef = useRef(null)
  // slug -> human title, built from the structure map so cards show real names.
  const [nameMap, setNameMap] = useState({})
  // Session-only "cleared from the deck" set. Server-backed kinds also persist
  // their dismissal so the loop drops them; client-only kinds (room/stuck) just
  // hide for this view and return on a full reload (they're live status).
  const [dismissed, setDismissed] = useState(() => new Set())
  // Which focused view is showing (Decisions / Rooms / System).
  const [view, setView] = useState('decisions')
  // R4 master switch: when on (default), each steering card's best-guess answer
  // fires on its countdown unless held; off means nothing sends on its own and
  // every best-guess still sits pre-written for one-tap send. Persisted per device.
  const [autoSend, setAutoSend] = useState(() => {
    try { return localStorage.getItem('cmddeck.autosend') !== 'off' } catch { return true }
  })
  const toggleAutoSend = useCallback(() => {
    setAutoSend((v) => {
      const nv = !v
      try { localStorage.setItem('cmddeck.autosend', nv ? 'on' : 'off') } catch { /* private mode */ }
      return nv
    })
  }, [])

  const load = useCallback(async () => {
    if (!worldId) return
    try {
      // raw=1 returns the file bytes directly. Without it project-file wraps
      // the body as { content: "..." }, which broke every list (parsed the
      // envelope, not the file). Fixed 2026-06-14.
      const qRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/open-questions.md')
      const qText = qRes.ok ? await qRes.text() : ''
      const openQuestions = parseMarkdownCheckboxList(qText, 'Open')
      const answeredQuestions = parseMarkdownCheckboxList(qText, 'Answered')

      const nRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/needs-patrik.md')
      const nText = nRes.ok ? await nRes.text() : ''
      const rawCalls = parseMarkdownCheckboxList(nText, 'Open')
      const hcoRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/needs-patrik-options.json')
      let hardCallOptions = {}
      if (hcoRes.ok) {
        try { hardCallOptions = JSON.parse(await hcoRes.text()) } catch { hardCallOptions = {} }
      }
      const openCalls = rawCalls.map((c) => {
        const opts = hardCallOptions[c.text.slice(0, 60)]
        return { ...c, options: Array.isArray(opts) ? opts.filter((o) => o && o.label) : [] }
      })

      const gRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/room-goals.json')
      let goals = { rooms: {} }
      if (gRes.ok) {
        try { goals = JSON.parse(await gRes.text()) } catch { goals = { rooms: {} } }
      }

      // The goal LEDGER is the source of truth under the deck (Command Center
      // Round 3). room-goals.json holds the editable goal + options + the loop's
      // last-review time; the ledger adds the FRESHNESS TRUTH — last_touched (the
      // newest real activity by literal timecode) and last_touched_by (what moved
      // it: a terminal session, a commit, a file, or just the loop). Merge the
      // ledger fields onto each room so a card shows what ACTUALLY moved and when,
      // not just when the loop last looked (the staleness symptom). room-goals.json
      // stays the write target; the ledger is read-only.
      const lgRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/goal-ledger.json')
      if (lgRes.ok) {
        try {
          const ledger = JSON.parse(await lgRes.text())
          const ledgerGoals = {}
          Object.values(ledger.users || {}).forEach((u) => {
            Object.entries(u.goals || {}).forEach(([slug, g]) => { ledgerGoals[slug] = g })
          })
          goals.rooms = goals.rooms || {}
          Object.entries(ledgerGoals).forEach(([slug, lg]) => {
            const base = goals.rooms[slug] || {}
            goals.rooms[slug] = {
              ...base,
              last_touched: lg.last_touched || base.last_touched || null,
              last_touched_by: lg.last_touched_by || null,
              last_touched_label: lg.last_touched_label || null,
              sessions: Array.isArray(lg.sessions) ? lg.sessions : [],
            }
          })
        } catch { /* ledger optional; cards fall back to last_reviewed */ }
      }

      const sRes = await authFetch('/api/dashboard/claude-sessions')
      const stuckData = sRes.ok ? await sRes.json() : { sessions: [] }

      const rRes = await authFetch(`/api/dashboard/routines?client_id=${encodeURIComponent(worldId)}`)
      const routines = rRes.ok ? await rRes.json() : { routines: [] }
      const masterLoop = routines.routines?.find((r) => r.name === 'com.aom-ea.master-loop')

      const kRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/keeper-report.json')
      let keeper = { proposals: [] }
      if (kRes.ok) {
        try { keeper = JSON.parse(await kRes.text()) } catch { keeper = { proposals: [] } }
      }

      const aRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/activity.json')
      let activityFeed = { entries: [] }
      if (aRes.ok) {
        try { activityFeed = JSON.parse(await aRes.text()) } catch { activityFeed = { entries: [] } }
      }

      // loop-state.json carries the real last-tick time (cycle_n + last_cycle_ts);
      // room-goals.json does NOT, so the heartbeat must read it from here.
      const lsRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/loop-state.json')
      let ls = null
      if (lsRes.ok) {
        try { ls = JSON.parse(await lsRes.text()) } catch { ls = null }
      }

      const smRes = await authFetch('/api/dashboard/project-file?raw=1&path=corner/users/aom/missions/master-loop/deliverables/structure-map.json')
      const map = {}
      if (smRes.ok) {
        try {
          const sm = JSON.parse(await smRes.text())
          ;(sm.rooms || []).forEach((r) => {
            if (r && r.slug && r.title) map[r.slug] = r.title
          })
        } catch { /* keep empty; cards fall back to tidied slugs */ }
      }
      setNameMap(map)

      const steering = openQuestions
 .filter((q) => !answeredQuestions.some((a) => a.text.includes(q.text.split('·')[0])))
        .map((item) => {
 const [room, question] = item.text.split('·')
          const slug = room.trim()
          const g = (goals.rooms || {})[slug] || {}
          const options = Array.isArray(g.options) ? g.options.filter((o) => o && o.label) : []
          return { room: slug, question: (question || '').trim(), checked: item.checked, options }
        })

      setSteeringQuestions(steering)
      setHardCalls(openCalls)
      setRoomStatus(goals.rooms || {})
      setStuckSessions(stuckData.sessions || [])
      setWorkers(stuckData.workers || [])
      setKeeperProposals(Array.isArray(keeper.proposals) ? keeper.proposals : [])
      setActivity(Array.isArray(activityFeed.entries) ? activityFeed.entries.slice(-12).reverse() : [])
      setLoopRunning(masterLoop?.status === 'running')
      setLoopStatusData(goals)
      setLoopState(ls)

      setLoading(false)
    } catch (err) {
      console.error('Error loading Command Deck data:', err)
      setLoading(false)
    }
  }, [worldId])

  useEffect(() => { load() }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleDataChange = () => { load() }

  // Generalized "clear it from the deck". Optimistically hides the card, then
  // tells the backend (server-backed kinds persist; client-only kinds no-op).
  const dismissCard = useCallback(async (key, payload) => {
    setDismissed((prev) => { const next = new Set(prev); next.add(key); return next })
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', ...payload }),
      })
    } catch (err) {
      console.error('Error dismissing card:', err)
    }
  }, [])

  if (loading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.s1, color: C.text2, fontFamily: FONT.body,
      }}>
        Loading Command Deck...
      </div>
    )
  }

  // Visible (non-dismissed) lists
  const openHardCalls = hardCalls.filter((c) => !c.checked && !dismissed.has(`hc:${c.text.slice(0, 60)}`))
  const openQuestions = steeringQuestions.filter((q) => !dismissed.has(`q:${q.room}`))
  const roomEntries = Object.entries(roomStatus).filter(([slug]) => !dismissed.has(`rs:${slug}`))
  const visibleStuck = stuckSessions.filter((s) => !dismissed.has(`ss:${s.name}`))
  const visibleKeeper = keeperProposals.filter((p) => !dismissed.has(`kp:${p.id}`))

  const decisionsWaiting = openHardCalls.length + openQuestions.length
  const isEmpty = decisionsWaiting === 0 && roomEntries.length === 0 &&
    visibleStuck.length === 0 && visibleKeeper.length === 0

  // Hero + heartbeat figures. The real tick time lives in loop-state.json
  // (loopStatusData/room-goals.json has no last_cycle_ts).
  const lastTs = loopState?.last_cycle_ts || loopStatusData?.last_cycle_ts
  const hbSecs = lastTs ? Math.max(0, Math.floor((Date.now() - new Date(lastTs)) / 1000)) : null
  const heartbeat = hbSecs == null ? 'unknown' :
    hbSecs < 90 ? 'just now' :
    hbSecs < 3600 ? `${Math.round(hbSecs / 60)}m ago` :
    hbSecs < 86400 ? `${Math.round(hbSecs / 3600)}h ago` : 'a while ago'
  const loopStale = hbSecs != null && hbSecs > 300
  const roomsMoving = Object.values(roomStatus).filter((r) => r && r.status === 'active').length
  const scrollToDecisions = () => {
    setView('decisions')
    requestAnimationFrame(() => {
      if (decisionsRef.current) decisionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    // Solid deep ground so the chat's animated background never bleeds through.
    <div style={{
      flex: 1, overflowY: 'auto', overflowX: 'hidden', background: C.s1,
      width: '100%', color: C.text, fontFamily: FONT.body, WebkitOverflowScrolling: 'touch',
    }}>
      <style>{`@keyframes cmddeck-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{
        maxWidth: 760, margin: '0 auto',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 {/* R4 master switch, "do nothing and it sends" on/off, in plain words. */}
            <button
              onClick={toggleAutoSend}
              title={autoSend
                ? 'Auto-send is on: each answer sends on its timer unless you hold or edit it'
 : 'Auto-send is off: nothing sends on its own, answers wait for your tap'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px',
                borderRadius: 8, cursor: 'pointer', fontFamily: FONT.mono, fontSize: 11,
                fontWeight: 700, letterSpacing: '0.03em',
                background: autoSend ? 'rgba(234,179,8,0.12)' : 'transparent',
                border: `1px solid ${autoSend ? AMBER : C.border}`,
                color: autoSend ? AMBER : C.muted,
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: autoSend ? AMBER : C.muted,
                boxShadow: autoSend ? '0 0 0 3px rgba(234,179,8,0.16)' : 'none',
              }} />
              Auto-send {autoSend ? 'on' : 'off'}
            </button>
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
        </div>

        {/* Hero — the dominant top card that earns the daily open */}
        <HeroCard
          decisionsWaiting={decisionsWaiting}
          roomsMoving={roomsMoving}
          heartbeat={heartbeat}
          loopRunning={loopRunning}
          stale={loopStale}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onJumpToDecisions={scrollToDecisions}
        />

        {isEmpty ? (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, margin: '40px 0' }}>
            Everything is flowing. Your loop is working well.
          </div>
        ) : (
          <>
            <SegmentedNav
              view={view}
              onView={setView}
              counts={{
                decisions: decisionsWaiting,
                rooms: roomEntries.length,
                system: workers.length + activity.length + visibleStuck.length + visibleKeeper.length,
              }}
            />

            {/* ── DECISIONS VIEW — what needs Patrik ── */}
            {view === 'decisions' && (
              openHardCalls.length > 0 || openQuestions.length > 0 ? (
                <section ref={decisionsRef} style={{ marginBottom: 16 }}>
                  {openHardCalls.length > 0 && <SectionLabel>Only You Can Decide ({openHardCalls.length})</SectionLabel>}
                  {openHardCalls.map((item, i) => (
                    <HardCallCard
                      key={`hc-${i}`}
                      item={item}
                      options={item.options}
                      onChanged={handleDataChange}
                      onDismiss={() => dismissCard(`hc:${item.text.slice(0, 60)}`, { kind: 'hard_call', callId: item.text.slice(0, 60) })}
                      onReplyToRoom={onReplyToRoom}
                      onJumpToRoom={onJumpToRoom}
                      nameMap={nameMap}
                    />
                  ))}
                  {openQuestions.length > 0 && (
                    <div style={openHardCalls.length > 0 ? { marginTop: 30, paddingTop: 22, borderTop: `1px solid ${C.border}` } : undefined}>
                      <SectionLabel>Steering Questions ({openQuestions.length})</SectionLabel>
                    </div>
                  )}
                  {openQuestions.map((q, i) => (
                    <SteeringQuestionCard
                      key={`q-${i}`}
                      room={q.room}
                      question={q.question}
                      options={q.options}
                      onChanged={handleDataChange}
                      onDismiss={() => dismissCard(`q:${q.room}`, { kind: 'question', room: q.room })}
                      onJumpToRoom={onJumpToRoom}
                      onReplyToRoom={onReplyToRoom}
                      nameMap={nameMap}
                      autoSend={autoSend}
                    />
                  ))}
                </section>
              ) : (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, margin: '36px 0' }}>
                  Nothing needs your call right now.
                </div>
              )
            )}

 {/* ── ROOMS VIEW, every room's goal + status, all actionable ── */}
            {view === 'rooms' && (
              roomEntries.length > 0 ? (
                <section style={{ marginBottom: 16 }}>
                  {roomEntries.map(([roomSlug, data]) => (
                    <RoomStatusCard
                      key={roomSlug}
                      room={roomSlug}
                      data={data}
                      onChanged={handleDataChange}
                      onDismiss={() => dismissCard(`rs:${roomSlug}`, { kind: 'room', room: roomSlug })}
                      onJumpToRoom={onJumpToRoom}
                      onReplyToRoom={onReplyToRoom}
                      nameMap={nameMap}
                    />
                  ))}
                </section>
              ) : (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, margin: '36px 0' }}>
                  No rooms to show.
                </div>
              )
            )}

            {/* ── SYSTEM VIEW — workers, what changed, stuck, housekeeping ── */}
            {view === 'system' && (
              <>
                {/* Working now — live worker pane + false-calm guardrail */}
                <section style={{ marginBottom: 28 }}>
                  <SectionLabel>Working Now ({workers.length})</SectionLabel>
                  <WorkerPane
                    workers={workers}
                    loopRunning={loopRunning}
                    alarm={loopRunning && workers.length === 0 && decisionsWaiting > 0}
                  />
                </section>

                {/* Stuck Sessions (a false-calm signal: surfaced loudly when present) */}
                {visibleStuck.length > 0 && (
                  <section style={{ marginBottom: 28 }}>
                    <SectionLabel>Stuck Sessions ({visibleStuck.length})</SectionLabel>
                    {visibleStuck.map((sess, i) => (
                      <StuckSessionCard
                        key={`ss-${i}`}
                        session={sess}
                        onDismiss={() => dismissCard(`ss:${sess.name}`, { kind: 'stuck' })}
                        onJumpToRoom={onJumpToRoom}
                        nameMap={nameMap}
                      />
                    ))}
                  </section>
                )}

 {/* Since you last looked, the loop's clean what-changed feed */}
                {activity.length > 0 && (
                  <section style={{ marginBottom: 28 }}>
                    <SectionLabel>Since you last looked ({activity.length})</SectionLabel>
                    <div style={{
                      border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 10,
                      background: 'rgba(255,255,255,0.012)', overflow: 'hidden',
                    }}>
                      {activity.map((a, i) => {
                    const { name, tag } = roomDisplay(a.room || '', nameMap)
                    const canJump = !!(a.room && onJumpToRoom)
                    const secs = a.ts ? Math.max(0, Math.floor((Date.now() - new Date(a.ts)) / 1000)) : null
                    const ago = secs == null ? '' :
                      secs < 90 ? 'just now' :
                      secs < 3600 ? `${Math.round(secs / 60)}m ago` :
                      secs < 86400 ? `${Math.round(secs / 3600)}h ago` :
                      `${Math.round(secs / 86400)}d ago`
                    return (
                      <div
                        key={i}
                        onClick={canJump ? () => onJumpToRoom(a.room) : undefined}
                        role={canJump ? 'button' : undefined}
                        title={canJump ? 'Open this room' : undefined}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                          borderTop: i === 0 ? 'none' : `1px solid rgba(255,255,255,0.05)`,
                          cursor: canJump ? 'pointer' : 'default', transition: 'background 0.15s',
                        }}
                        onMouseEnter={canJump ? (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } : undefined}
                        onMouseLeave={canJump ? (e) => { e.currentTarget.style.background = 'transparent' } : undefined}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER, flexShrink: 0, marginTop: 6 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                            {tag && <span style={{ marginLeft: 6 }}><ContextTag tag={tag} /></span>}
                            <span style={{ color: C.text2 }}>{'  ·  '}{humanizeSlugs(a.move, nameMap)}</span>
                          </div>
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: C.muted, fontFamily: FONT.mono }}>{ago}</span>
                          {canJump && <span style={{ color: AMBER, fontWeight: 700, fontSize: 13 }}>›</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

 {/* Housekeeping, the Keeper's tidy-up proposals */}
                {visibleKeeper.length > 0 && (
                  <section>
                    <SectionLabel>Housekeeping ({visibleKeeper.length})</SectionLabel>
                    {visibleKeeper.map((p) => (
                      <KeeperCard
                        key={p.id}
                        proposal={p}
                        onChanged={handleDataChange}
                        onDismiss={() => dismissCard(`kp:${p.id}`, { kind: 'keeper', proposalId: p.id })}
                        nameMap={nameMap}
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}