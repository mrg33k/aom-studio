// HomeView — CV4 home screen. First-paint default unless the user has set
// a different default via the "Make default room" command in the composer menu.
//
// Design source of truth: cv4-explore-v2/views/home.html (Patrik-approved 2026-05-25).
//
// Mission: corner:home-screen R1.
//
// Layout (top → bottom):
//   1. Top-right cluster: Home + Theme toggle (theme owned by parent; Home is decorative on home view)
//   2. Welcome (brutalist Hanken Grotesk 800, two lines, time-aware)
//   3. Search bar (messages, tasks, agents)
//   4. AGENTS section: pinned agents (defaults to the world's EA)
//   5. PROJECTS section: pinned + recent projects (max 5), each with chat / expand / pin
//
// Click handlers:
//   - Agent row → selects that agent (parent decides routing)
//   - Project row chat-icon → opens project chat
//   - Project row dropdown → expands inline mission list
//   - Pin toggle → updates localStorage and resorts list

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authFetch } from '../lib/authFetch.js'
import { supabase } from '../lib/supabase.js'
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx'
import { FolderIcon, MissionIcon, StatusDot } from './lib/uiKit.jsx'
import { useSupportData, buildItems } from './SupportDashboard.jsx'
import LiveScribe from '../../pages/LiveScribe.jsx'

const PIN_AGENTS_KEY = 'cv4_pinned_agents'
const PIN_PROJECTS_KEY = 'cv4_pinned_projects'
const EXPANDED_PROJECTS_KEY = 'cv4_expanded_projects'
// Tracks when user last visited each project room (keyed by slug, value = timestamp ms)
const RECENT_VISITS_KEY = 'cv4_recent_visits'
// Tracks which home sections are collapsed (keys: 'recents', 'agents', 'allProjects')
const SECTION_COLLAPSED_KEY = 'cv4_section_collapsed'

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (_) { return fallback }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (_) {}
}

// Rotating greeting variants — picks one at random per page load so the
// welcome feels human, not boilerplate. Patrik 2026-05-25: "it should swap
// each reload or new time they come to home". Each variant ends in a period
// (or question mark when phrased as one) so the welcome reads as a complete
// sentence under the brutalist treatment.
const GREETINGS = {
  morning: [
    'Good morning,',
    'Morning,',
    "Coffee's on,",
    "What's the play,",
    'Up early,',
    'Fresh start,',
  ],
  afternoon: [
    'Good afternoon,',
    'Afternoon,',
    'Back at it,',
    'Mid-day check,',
    'Still rolling,',
    'Long lunch,',
  ],
  evening: [
    'Good evening,',
    'Evening,',
    'Welcome back,',
    'Last stretch,',
    'Final push,',
    'Almost there,',
  ],
  late: [
    'Burning the midnight oil,',
    'Late night,',
    'Workshop hours,',
    'Still going,',
    "Couldn't sleep,",
    "It's that hour,",
  ],
}

function pickGreeting(date = new Date()) {
  const h = date.getHours()
  let slot = 'evening'
  if (h < 5) slot = 'late'
  else if (h < 12) slot = 'morning'
  else if (h < 17) slot = 'afternoon'
  else if (h < 21) slot = 'evening'
  else slot = 'late'
  const pool = GREETINGS[slot]
  return pool[Math.floor(Math.random() * pool.length)]
}

function displayName(user) {
  return user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'there'
}

function relativeTime(iso) {
  if (!iso) return ''
  try {
    const then = new Date(iso).getTime()
    const diff = Math.max(0, Date.now() - then)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'now'
    if (m < 60) return m + 'm ago'
    const h = Math.floor(m / 60)
    if (h < 24) return h + 'h ago'
    const d = Math.floor(h / 24)
    if (d < 7) return d + 'd ago'
    const w = Math.floor(d / 7)
    return w + 'w ago'
  } catch (_) { return '' }
}

// Icon set for missions — stable assignment via slug hash
// Reuses the top-nav icon vocabulary (compass, folder, etc.)
const MISSION_ICON_SET = [
  // Compass
  { name: 'compass', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  // Folder
  { name: 'folder', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg> },
  // Star
  { name: 'star', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  // Zap (lightning)
  { name: 'zap', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  // Trello-like square grid
  { name: 'grid', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  // Briefcase
  { name: 'briefcase', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7v-2a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
  // Code
  { name: 'code', svg: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
]

// Stable icon assignment: hash the slug to pick an icon
function getMissionIcon(slug) {
  if (!slug) return MISSION_ICON_SET[0]
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit int
  }
  const idx = Math.abs(hash) % MISSION_ICON_SET.length
  return MISSION_ICON_SET[idx]
}

// R26: What-Needs-You type icon — a distinct icon per recurring task type
// (deploy / review / approval / request), rendered in the room's color by the caller.
function getNeedsTypeIcon(item) {
  const hay = `${item?.label || ''} ${item?.key || ''} ${item?.detail || ''}`.toLowerCase()
  const p = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (hay.includes('deploy')) {
    return <svg {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
  }
  if (hay.includes('review')) {
    return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  }
  if (hay.includes('approv')) {
    return <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  }
  if (hay.includes('request') || hay.includes('support')) {
    return <svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
  }
  return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}

// Chevron SVG — rotates 90° when section is collapsed
function Chevron({ collapsed }) {
  return (
    <svg
      width="12" height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 180ms ease',
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ── CV6 Support Tool Overlay ─ 3-column clean layout with real data ──────────────
// R88: staged-draft tag the agent embeds when it has a reply ready to send.
const SUPPORT_STAGED_RE = /\[staged_draft:([^|\]\s]+)\|conn:([^\]\s]+)\]/
function parseSupportStaged(msg) {
  const m = SUPPORT_STAGED_RE.exec(msg || '')
  return m ? { draftId: m[1], connectionId: m[2] } : null
}

function SupportToolOverlay({ worldId }) {
  const { wishes, mailboxes } = useSupportData(worldId)
  const items = buildItems(wishes, mailboxes)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // R88 (Patrik's chosen model): Send / Decide / Done. The agent answers most,
  // so the board leads with replies it already drafted (one tap to send), then
  // the few that need Patrik's judgment, then what's finished. Spam is already
  // filtered out in buildItems.
  const readyToSend = items.filter(it => it.ready)
  const needsDecision = items.filter(it => !it.ready && it.status !== 'resolved' && it.status !== 'responded')
  const done = items.filter(it => it.status === 'resolved' || it.status === 'responded')

  return (
    <div style={{ display: isNarrow ? 'flex' : 'grid', flexDirection: isNarrow ? 'column' : undefined, gridTemplateColumns: isNarrow ? undefined : '1fr 1fr 1fr', gap: '16px', height: isNarrow ? 'auto' : '100%', flex: 1 }}>
      <SupportColumn title="Ready to send" column="ready" items={readyToSend} accentColor="#10B981" />
      <SupportColumn title="Needs a decision" column="decision" items={needsDecision} accentColor="#F59E0B" />
      <SupportColumn title="Done" column="done" items={done} accentColor="#5A6F8C" />
    </div>
  )
}

// ── Support Column Component ────────────────────────────────────────────────────
function SupportColumn({ title, column, items, accentColor }) {
  return (
    // R32: minWidth:0 stops a long email/word from stretching this column past its 1fr share
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      {/* Column Header with count badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--cv6-text-secondary)', marginBottom: '12px', paddingBottom: '12px',
        borderBottom: `2px solid ${accentColor}`,
      }}>
        <span>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: accentColor, background: `${accentColor}1f`, borderRadius: '10px', padding: '1px 8px', letterSpacing: 0 }}>{items.length}</span>
      </div>

      {/* Cards List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', textAlign: 'center', padding: '20px 12px', marginTop: '8px', lineHeight: 1.5 }}>
            {column === 'ready' ? 'Nothing staged to send right now.'
              : column === 'decision' ? 'Nothing waiting on you. Inbox is clear.'
              : 'Nothing here yet.'}
          </div>
        ) : (
          items.map(item => (
            <SupportCard key={item.key} item={item} accentColor={accentColor} column={column} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Support Card Component ──────────────────────────────────────────────────────
function SupportCard({ item, accentColor, column }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const staged = item.wish ? parseSupportStaged(item.wish.message) : null

  const handleResolve = async (e) => {
    e.stopPropagation()
    if (!item.wish) return
    setResolving(true)
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', wish_id: item.wish.id }),
      })
      const d = await r.json()
      if (r.ok && d.ok) {
        // Item resolved; parent component will re-fetch
      }
    } catch (e) {
      console.error('Resolve failed:', e)
    } finally {
      setResolving(false)
    }
  }

  // Send the agent's staged reply. This sends a real email, so it only fires on
  // Patrik's explicit click (never automatically).
  const handleSend = async (e) => {
    e.stopPropagation()
    if (!item.wish || !staged) return
    setSending(true)
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', wish_id: item.wish.id, draft_id: staged.draftId, connection_id: staged.connectionId }),
      })
      const d = await r.json()
      if (r.ok && d.ok) setSent(true)
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setSending(false)
    }
  }

  const handleOpenMail = () => {
    if (item.link) {
      window.open(item.link, '_blank')
    }
  }

  // Plain-words "how long they've waited" for the decision column.
  const waitedLabel = (() => {
    if (!item.date) return null
    const mins = Math.floor((Date.now() - item.date) / 60000)
    if (mins < 60) return `${Math.max(1, mins)}m waiting`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h waiting`
    return `${Math.floor(hrs / 24)}d waiting`
  })()
  const overdue = item.date && (Date.now() - item.date) > 10 * 60 * 1000

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%', textAlign: 'left',
        // R53: THE CARD paradigm — surface bg, 1px border, 8px radius, 14px pad, no shadow (see cv6.css)
        background: 'var(--cv6-surface)', border: `1px solid ${isExpanded ? accentColor : 'var(--cv6-divider)'}`,
        borderRadius: 'var(--cv6-card-radius)', padding: 'var(--cv6-card-pad)', minHeight: '56px', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.background = 'var(--cv6-surface-hover)'
          e.currentTarget.style.borderColor = accentColor
        }
      }}
      onMouseLeave={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.background = 'var(--cv6-surface)'
          e.currentTarget.style.borderColor = 'var(--cv6-divider)'
        }
      }}
    >
      {/* Card Header: Who + Status Badge. R50: dropped the per-card mail icon — it just
          re-encoded the column color (Patrik); removing it buys back a lot of visual calm. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.who}
            </span>
            {item.ready && (
              <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: accentColor, flexShrink: 0 }}>
                Ready
              </span>
            )}
          </div>
          {item.subject && (
            <div style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.subject}
            </div>
          )}
        </div>
        {column === 'decision' && waitedLabel && (
          <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap', color: overdue ? '#ef4444' : 'var(--cv6-text-tertiary)' }}>{overdue ? '! ' : ''}{waitedLabel}</span>
        )}
      </div>

      {/* Preview Text (collapsed to 2 lines, expanded to many) */}
      {item.text && (
        <p style={{
          margin: '0', fontSize: '12px', color: 'var(--cv6-text-secondary)', lineHeight: '1.4', width: '100%',
          display: '-webkit-box', WebkitLineClamp: isExpanded ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>
          {item.text}
        </p>
      )}

      {/* Expanded: the thread (what they wrote + what we replied) and actions. */}
      {isExpanded && (
        <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--cv6-divider)', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {item.original && (
            <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{item.original}</div>
          )}
          {item.reply && (
            <div style={{ padding: '8px 10px', background: 'rgba(16,185,129,0.10)', borderLeft: '2px solid #10B981', borderRadius: '4px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10B981' }}>We replied</div>
              <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', lineHeight: '1.4', marginTop: '3px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.reply}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {column === 'ready' && staged && (
              <button onClick={handleSend} disabled={sending || sent} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 14px', borderRadius: '4px', background: sent ? 'transparent' : '#10B981', color: sent ? '#10B981' : '#ffffff', border: sent ? '1px solid #10B981' : 'none', cursor: (sending || sent) ? 'default' : 'pointer', opacity: sending ? 0.6 : 1 }}>
                {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send reply'}
              </button>
            )}
            {column === 'ready' && item.link && (
              <button onClick={handleOpenMail} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 12px', borderRadius: '4px', background: 'transparent', color: 'var(--cv6-text-secondary)', border: '1px solid var(--cv6-divider)', cursor: 'pointer' }}>Edit in Gmail</button>
            )}
            {column === 'decision' && item.link && (
              <button onClick={handleOpenMail} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 12px', borderRadius: '4px', background: accentColor, color: '#ffffff', border: 'none', cursor: 'pointer' }}>Open in Gmail</button>
            )}
            {column === 'decision' && item.wish && (
              <button onClick={handleResolve} disabled={resolving} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 12px', borderRadius: '4px', background: 'transparent', color: 'var(--cv6-text-secondary)', border: '1px solid var(--cv6-divider)', cursor: resolving ? 'default' : 'pointer', opacity: resolving ? 0.6 : 1 }}>{resolving ? '…' : 'Mark done'}</button>
            )}
            {column === 'done' && item.link && (
              <button onClick={handleOpenMail} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 12px', borderRadius: '4px', background: 'transparent', color: 'var(--cv6-text-secondary)', border: '1px solid var(--cv6-divider)', cursor: 'pointer' }}>Open in Gmail</button>
            )}
          </div>
        </div>
      )}
    </button>
  )
}

// Export SupportToolOverlay for use in CV6Gallery
export { SupportToolOverlay }

// ── Projects Tool — Finder/Dropbox 3-column browser, drag-to-move + confirm + live create + mobile (R38 r2) ──
function ProjectsToolOverlay({ projects: projectsProp, missionsByProject, onOpen, onCreateProject, onCreateMission, onMoveFile }) {
  const [projects, setProjects] = useState(projectsProp || [])
  const [missionsMap, setMissionsMap] = useState(missionsByProject || {})
  const [selProj, setSelProj] = useState(null)
  const [selMission, setSelMission] = useState(null)
  const [dragMission, setDragMission] = useState(null)   // { mission, fromSlug }
  const [dropProj, setDropProj] = useState(null)         // slug hovered as drop target
  const [confirmMove, setConfirmMove] = useState(null)   // { mission, fromProj, toProj }
  const [creating, setCreating] = useState(null)         // 'project' | 'mission'
  const [draftName, setDraftName] = useState('')
  const [mobileCol, setMobileCol] = useState(0)          // 0 projects → 1 missions → 2 preview
  const [isNarrow, setIsNarrow] = useState(false)
  const [movePick, setMovePick] = useState(false)        // R48: Move Room → choose destination project

  // Merge new prop data in WITHOUT wiping local creates/moves (prop array is a fresh
  // reference every parent render, so a plain reset would erase optimistic changes).
  useEffect(() => {
    setProjects(prev => {
      const have = new Set(prev.map(p => p.slug))
      const additions = (projectsProp || []).filter(p => !have.has(p.slug))
      return additions.length ? [...prev, ...additions] : prev
    })
  }, [projectsProp])
  useEffect(() => {
    setMissionsMap(prev => {
      const next = { ...prev }
      for (const k of Object.keys(missionsByProject || {})) {
        if (!next[k]) next[k] = missionsByProject[k]
      }
      return next
    })
  }, [missionsByProject])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const hue = (slug) => ((slug ? slug.charCodeAt(0) : 0) * 137) % 360
  const missions = selProj ? (missionsMap[selProj.slug] || []) : []
  const slugify = (name, n) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + n

  function doMove(mission, fromSlug, toSlug) {
    setMissionsMap(prev => {
      const next = { ...prev }
      next[fromSlug] = (next[fromSlug] || []).filter(m => m.slug !== mission.slug)
      next[toSlug] = [...(next[toSlug] || []).filter(m => m.slug !== mission.slug), mission]
      return next
    })
    // Mission reparent is optimistic-only: there is no mission-move backend endpoint
    // yet (project-file-move handles files, not mission rows). Gap noted in BUILD.md.
  }
  function commitCreate() {
    const name = draftName.trim(); if (!name) { setCreating(null); return }
    if (creating === 'project') {
      const slug = slugify(name, projects.length + 1)
      const p = { slug, name }
      setProjects(prev => [p, ...prev]); setMissionsMap(prev => ({ ...prev, [slug]: [] }))
      setSelProj(p); setSelMission(null); if (isNarrow) setMobileCol(1)
      onCreateProject && onCreateProject(slug, name)
    } else if (creating === 'mission' && selProj) {
      const slug = slugify(name, (missionsMap[selProj.slug] || []).length + 1)
      const m = { slug, name, status: 'idle' }
      setMissionsMap(prev => ({ ...prev, [selProj.slug]: [m, ...(prev[selProj.slug] || [])] }))
      setSelMission(m); if (isNarrow) setMobileCol(2)
      onCreateMission && onCreateMission(selProj.slug, slug, name)
    }
    setCreating(null); setDraftName('')
  }

  const colStyle = { display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--cv6-divider)', overflowY: 'auto' }
  const headStyle = { flexShrink: 0, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)', padding: '10px 14px', position: 'sticky', top: 0, background: 'var(--cv6-surface)', borderBottom: '1px solid var(--cv6-divider)', zIndex: 1 }
  const emptyHint = (t) => <div style={{ padding: '14px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>{t}</div>

  const Row = ({ label, sub, slug, active, onClick, chevron, dnd, dropActive }) => (
    <button
      onClick={onClick}
      {...(dnd || {})}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left',
        padding: '9px 12px', borderRadius: '6px', margin: '2px 6px', cursor: 'pointer', fontFamily: 'inherit',
        border: dropActive ? '2px dashed var(--cv6-accent-primary)' : '2px solid transparent',
        background: dropActive ? 'hsla(220,90%,55%,0.10)' : active ? `hsla(${hue(slug)}, 60%, 48%, 0.12)` : 'transparent',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => { if (!active && !dropActive) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
      onMouseLeave={(e) => { if (!active && !dropActive) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ flexShrink: 0, color: `hsl(${hue(slug)}, 60%, 52%)`, display: 'inline-flex' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: '11px', color: 'var(--cv6-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {chevron && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>}
    </button>
  )

  const missionDnd = (m) => ({
    draggable: true,
    onDragStart: (e) => { setDragMission({ mission: m, fromSlug: selProj.slug }); e.dataTransfer.effectAllowed = 'move' },
    onDragEnd: () => { setDragMission(null); setDropProj(null) },
  })
  const projectDrop = (p) => ({
    onDragOver: (e) => { if (dragMission && dragMission.fromSlug !== p.slug) { e.preventDefault(); setDropProj(p.slug) } },
    onDragLeave: () => setDropProj(d => (d === p.slug ? null : d)),
    onDrop: (e) => { e.preventDefault(); if (dragMission && dragMission.fromSlug !== p.slug) { const fromProj = projects.find(x => x.slug === dragMission.fromSlug); setConfirmMove({ mission: dragMission.mission, fromProj, toProj: p }) } setDragMission(null); setDropProj(null) },
  })

  const ProjectsCol = () => (
    <div style={colStyle}>
      <div style={headStyle}>Projects</div>
      {creating === 'project' && (
        <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitCreate(); if (e.key === 'Escape') { setCreating(null); setDraftName('') } }} onBlur={commitCreate} placeholder="Project name…" style={{ margin: '4px 8px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
      )}
      {projects.length ? projects.map(p => (
        <Row key={p.slug} label={p.name || p.slug} sub={`${(missionsMap[p.slug] || []).length} missions`} slug={p.slug} active={selProj?.slug === p.slug} chevron dropActive={dropProj === p.slug} dnd={projectDrop(p)} onClick={() => { setSelProj(p); setSelMission(null); if (isNarrow) setMobileCol(1) }} />
      )) : emptyHint('No projects')}
    </div>
  )
  const MissionsCol = () => (
    <div style={colStyle}>
      <div style={headStyle}>Missions</div>
      {creating === 'mission' && selProj && (
        <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitCreate(); if (e.key === 'Escape') { setCreating(null); setDraftName('') } }} onBlur={commitCreate} placeholder="Mission name…" style={{ margin: '4px 8px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
      )}
      {!selProj ? emptyHint('Select a project') : (missions.length ? missions.map(m => (
        <Row key={m.slug} label={m.name || m.slug} sub={m.status === 'running' ? 'working' : (m.last_message_at ? relativeTime(m.last_message_at) : 'recently')} slug={selProj.slug} active={selMission?.slug === m.slug} chevron dnd={missionDnd(m)} onClick={() => { setSelMission(m); if (isNarrow) setMobileCol(2) }} />
      )) : emptyHint('No missions yet'))}
    </div>
  )
  const PreviewCol = () => (
    <div style={{ ...colStyle, borderRight: 'none' }}>
      <div style={headStyle}>Preview</div>
      {selMission && selProj ? (
        <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* R48: bigger, centered icon */}
          <div style={{ width: '76px', height: '76px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `hsla(${hue(selProj.slug)}, 60%, 50%, 0.14)`, color: `hsl(${hue(selProj.slug)}, 60%, 50%)`, marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--cv6-text-primary)', letterSpacing: '-0.01em' }}>{selMission.name || selMission.slug}</div>
          {/* R48: never "Idle" — show last visited instead */}
          <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', marginTop: '5px' }}>
            in {selProj.name || selProj.slug} · last visited {selMission.last_message_at ? relativeTime(selMission.last_message_at) : 'recently'}
          </div>
          <p style={{ marginTop: '14px', fontSize: '13px', lineHeight: 1.5, color: 'var(--cv6-text-secondary)' }}>
            {selMission.description || selMission.summary || `Part of ${selProj.name || selProj.slug}. Open it to pick up where it left off.`}
          </p>
          {/* R48: Open Room / Move Room / Invite */}
          <div style={{ marginTop: '18px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => onOpen && onOpen(selProj, selMission)} style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>Open Room</button>
            {movePick ? (
              <select autoFocus value="" onChange={e => { const to = projects.find(p => p.slug === e.target.value); if (to) setConfirmMove({ mission: selMission, fromProj: selProj, toProj: to }); setMovePick(false) }} onBlur={() => setMovePick(false)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px' }}>
                <option value="">Move to which project…</option>
                {projects.filter(p => p.slug !== selProj.slug).map(p => <option key={p.slug} value={p.slug}>{p.name || p.slug}</option>)}
              </select>
            ) : (
              <button onClick={() => setMovePick(true)} style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Move Room</button>
            )}
            <button onClick={() => onOpen && onOpen(selProj, selMission)} style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Invite</button>
          </div>
        </div>
      ) : selProj ? (
        <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '76px', height: '76px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `hsla(${hue(selProj.slug)}, 60%, 50%, 0.14)`, color: `hsl(${hue(selProj.slug)}, 60%, 50%)`, marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--cv6-text-primary)' }}>{selProj.name || selProj.slug}</div>
          <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', marginTop: '5px' }}>{(missionsMap[selProj.slug] || []).length} missions</div>
          <p style={{ marginTop: '14px', fontSize: '13px', lineHeight: 1.5, color: 'var(--cv6-text-secondary)' }}>{selProj.description || `A project room holding ${(missionsMap[selProj.slug] || []).length} missions. Pick a mission to see its details, or drag missions between projects to reorganize.`}</p>
        </div>
      ) : emptyHint('Select a project, then a mission')}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Toolbar — New project / New mission (live create) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => { setCreating('project'); setDraftName('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New project
        </button>
        <button onClick={() => { if (selProj) { setCreating('mission'); setDraftName('') } }} disabled={!selProj} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: selProj ? 'var(--cv6-text-primary)' : 'var(--cv6-text-tertiary)', cursor: selProj ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', opacity: selProj ? 1 : 0.6 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New mission
        </button>
        {!isNarrow && <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>Drag a mission onto a project to move it</span>}
      </div>

      {isNarrow ? (
        /* Mobile: single-column drill with a back bar (Finder/Dropbox mobile pattern) */
        <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', minHeight: '360px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
          {mobileCol > 0 && (
            <button onClick={() => setMobileCol(mobileCol - 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {mobileCol === 1 ? (selProj?.name || 'Projects') : (selMission?.name || 'Missions')}
            </button>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {mobileCol === 0 && <ProjectsCol />}
            {mobileCol === 1 && <MissionsCol />}
            {mobileCol === 2 && <PreviewCol />}
          </div>
        </div>
      ) : (
        /* Desktop: three Finder/Dropbox columns */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '420px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
          <ProjectsCol />
          <MissionsCol />
          <PreviewCol />
        </div>
      )}

      {/* macOS-style move confirmation: source mission → arrow → destination project */}
      {confirmMove && (
        <div onClick={() => setConfirmMove(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'inherit' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--cv6-text-primary)', marginBottom: '4px' }}>Move this mission?</div>
            <div style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)', marginBottom: '20px' }}>“{confirmMove.mission.name || confirmMove.mission.slug}” will move from {confirmMove.fromProj?.name || 'its project'} to {confirmMove.toProj.name || confirmMove.toProj.slug}.</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '110px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `hsla(${hue(confirmMove.fromProj?.slug)}, 60%, 50%, 0.16)`, color: `hsl(${hue(confirmMove.fromProj?.slug)}, 60%, 50%)` }}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{confirmMove.mission.name || confirmMove.mission.slug}</span>
              </div>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '110px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `hsla(${hue(confirmMove.toProj.slug)}, 60%, 50%, 0.16)`, color: `hsl(${hue(confirmMove.toProj.slug)}, 60%, 50%)` }}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{confirmMove.toProj.name || confirmMove.toProj.slug}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setConfirmMove(null)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
              <button onClick={() => { doMove(confirmMove.mission, confirmMove.fromProj.slug, confirmMove.toProj.slug); setConfirmMove(null) }} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>Move</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Review Tool — excel/inventory list + full review modal (R38 r3) ───────────────
function ReviewToolOverlay({ projects, missionsByProject, onReplyToRoom, worldId }) {
  const [openItem, setOpenItem] = useState(null)
  const [reviewText, setReviewText] = useState('')
  const [done, setDone] = useState({})       // id -> true (reviewed + pushed)
  const [isNarrow, setIsNarrow] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  // Per-deliverable "what's next" checklist (Patrik: this list is how you review).
  const [checklist, setChecklist] = useState([])
  const [newStep, setNewStep] = useState('')
  const [savingStep, setSavingStep] = useState(false)
  const loadChecklist = useCallback(async (deliverable) => {
    if (!deliverable) { setChecklist([]); return }
    try {
      const r = await authFetch(`/api/dashboard/review-checklist?world=${encodeURIComponent(worldId || 'aom')}&deliverable=${encodeURIComponent(deliverable)}`)
      if (r?.ok) { const d = await r.json(); setChecklist(Array.isArray(d.list) ? d.list : []) }
    } catch (_) { /* keep last */ }
  }, [worldId])
  useEffect(() => { loadChecklist(openItem?.id) }, [openItem?.id, loadChecklist])
  const addStep = useCallback(async () => {
    const text = (newStep || '').trim()
    if (!text || !openItem) return
    setSavingStep(true)
    // optimistic
    const tmp = { id: 'tmp-' + Date.now(), text, done: false }
    setChecklist(prev => [...prev, tmp]); setNewStep('')
    try {
      const r = await authFetch('/api/dashboard/review-checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', world: worldId || 'aom', deliverable: openItem.id, text }),
      })
      if (r?.ok) await loadChecklist(openItem.id)
    } finally { setSavingStep(false) }
  }, [newStep, openItem, worldId, loadChecklist])
  const toggleStep = useCallback(async (id) => {
    if (!openItem) return
    setChecklist(prev => prev.map(it => it.id === id ? { ...it, done: !it.done } : it))
    try {
      await authFetch('/api/dashboard/review-checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', world: worldId || 'aom', deliverable: openItem.id, id }),
      })
    } catch (_) { /* optimistic */ }
  }, [openItem, worldId])
  const deleteStep = useCallback(async (id) => {
    if (!openItem) return
    setChecklist(prev => prev.filter(it => it.id !== id))
    try {
      await authFetch('/api/dashboard/review-checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', world: worldId || 'aom', deliverable: openItem.id, id }),
      })
    } catch (_) { /* optimistic */ }
  }, [openItem, worldId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Fetch real deliverables from review-queue endpoint
  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId || 'aom')}`)
        if (res?.ok) {
          const data = await res.json()
          const deliverables = (data.items || []).map((item, idx) => ({
            id: item.path,
            project: item.project,
            mission: item.mission || '(root)',
            type: item.type,
            item: item.name,
            ready: true,
            notes: '',
            path: item.path,
            last_modified: item.last_modified,
          }))
          setItems(deliverables)
        }
      } catch (err) {
        console.error('[review-queue]', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [worldId])

  const headCell = { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cv6-text-secondary)', padding: '10px 14px', textAlign: 'left' }
  const cell = { fontSize: '13px', color: 'var(--cv6-text-primary)', padding: '11px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const cols = '1.1fr 1.1fr 1.2fr 80px 76px'

  async function pushReview() {
    if (!openItem || !onReplyToRoom) return
    const roomSlug = openItem.mission && openItem.mission !== '(root)'
      ? `${openItem.project}:${openItem.mission}`
      : openItem.project
    const res = await onReplyToRoom(roomSlug, reviewText)
    if (res?.ok) {
      setDone(prev => ({ ...prev, [openItem.id]: true }))
      setOpenItem(null)
      setReviewText('')
    } else {
      console.error('[review-push] failed:', res)
    }
  }

  return (
    // R48: position:relative so the review modal can sit ABSOLUTELY inside the tool area
    // (covering only the review tools, never extending past the screen).
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', minHeight: '100%', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)' }}>{items.filter(it => it.ready && !done[it.id]).length} ready for review · {items.length} in the pipeline</div>
        {/* R50: legend so the eye states read clearly */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-flex', width: '18px', height: '18px', borderRadius: '5px', background: 'var(--cv6-text-primary)', color: 'var(--cv6-surface)', alignItems: 'center', justifyContent: 'center' }}><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></span>ready to open</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ display: 'inline-flex', width: '18px', height: '18px', borderRadius: '5px', color: 'var(--cv6-text-tertiary)', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></span>not ready yet</span>
        </div>
      </div>
      {/* Mobile: card per item so the review action (eye) is always visible — no horizontal scroll. */}
      {isNarrow ? (
        <div style={{ border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
          <div style={{ maxHeight: '64vh', overflowY: 'auto' }}>
            {items.map(it => {
              const isDone = done[it.id]
              const clickable = it.ready && !isDone
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--cv6-divider)', background: isDone ? 'var(--cv6-surface-hover)' : 'transparent' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.item}</div>
                    <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{it.project} · {it.mission}</div>
                    <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: '700', color: it.type.color, background: `${it.type.color}1f`, padding: '3px 8px', borderRadius: '5px' }}>{it.type.label}</span>
                  </div>
                  <button
                    onClick={() => { if (clickable) { setOpenItem(it); setReviewText('') } }}
                    disabled={!clickable}
                    title={isDone ? 'Reviewed' : it.ready ? 'Review' : 'Not ready yet'}
                    style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '9px', border: 'none', cursor: clickable ? 'pointer' : 'default',
                      background: isDone ? 'rgba(16,185,129,0.14)' : clickable ? 'var(--cv6-text-primary)' : 'transparent',
                      color: isDone ? '#10B981' : clickable ? 'var(--cv6-surface)' : 'var(--cv6-text-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: it.ready ? 1 : 0.45 }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              )
            })}
            {items.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>Nothing in the review pipeline yet</div>}
          </div>
        </div>
      ) : (
      /* Desktop: inventory table */
      <div style={{ border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '580px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)' }}>
              <div style={headCell}>Project</div><div style={headCell}>Mission</div><div style={headCell}>Item</div><div style={headCell}>Type</div><div style={{ ...headCell, textAlign: 'center' }}>Review</div>
            </div>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {items.map(it => {
                const isDone = done[it.id]
                const clickable = it.ready && !isDone
                return (
                  <div key={it.id} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', borderBottom: '1px solid var(--cv6-divider)', background: isDone ? 'var(--cv6-surface-hover)' : 'transparent', transition: 'background 120ms ease' }}
                    onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                    onMouseLeave={(e) => { if (!isDone) e.currentTarget.style.background = 'transparent' }}>
                    <div style={cell}>{it.project}</div>
                    <div style={{ ...cell, color: 'var(--cv6-text-secondary)' }}>{it.mission}</div>
                    <div style={cell}>{it.item}</div>
                    <div style={{ padding: '11px 14px' }}><span style={{ fontSize: '11px', fontWeight: '700', color: it.type.color, background: `${it.type.color}1f`, padding: '3px 8px', borderRadius: '5px' }}>{it.type.label}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
                      <button
                        onClick={() => { if (clickable) { setOpenItem(it); setReviewText('') } }}
                        disabled={!clickable}
                        title={isDone ? 'Reviewed' : it.ready ? 'Review' : 'Not ready yet'}
                        style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', cursor: clickable ? 'pointer' : 'default',
                          background: isDone ? 'rgba(16,185,129,0.14)' : clickable ? 'var(--cv6-text-primary)' : 'transparent',
                          color: isDone ? '#10B981' : clickable ? 'var(--cv6-surface)' : 'var(--cv6-text-tertiary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms ease', opacity: it.ready ? 1 : 0.45 }}>
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>Nothing in the review pipeline yet</div>}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Full review modal — covers ONLY the review tool area (absolute inside it), never the whole screen. */}
      {openItem && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openItem.item}</div>
              <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)' }}>{openItem.project} · {openItem.mission} · {openItem.type.label}</div>
            </div>
            <button onClick={() => { setOpenItem(null); setReviewText('') }} title="Close" style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, display: isNarrow ? 'block' : 'grid', gridTemplateColumns: '1.6fr 1fr', overflow: 'auto', minHeight: 0 }}>
            {/* Item in full — show real preview via FilePreviewPanel */}
            <div style={{ padding: '24px', borderRight: isNarrow ? 'none' : '1px solid var(--cv6-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isNarrow ? '240px' : 'auto', overflow: 'auto' }}>
              <FilePreviewPanel node={{ name: openItem.item, path: openItem.path, isFile: true }} style={{ width: '100%', maxWidth: '520px' }} />
            </div>
            {/* What's next — a clean checklist for THIS deliverable (Uber-style). */}
            <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--cv6-surface)', minHeight: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)' }}>What's next</div>
              {/* Add a step — big calm input, Enter to add */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--cv6-divider)', borderRadius: '12px', padding: '4px 6px 4px 14px', background: 'var(--cv6-ground)' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <input
                  value={newStep}
                  onChange={e => setNewStep(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }}
                  placeholder="Add a next step…"
                  style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '15px', outline: 'none' }}
                />
                <button onClick={addStep} disabled={savingStep || !newStep.trim()} title="Add" style={{ flexShrink: 0, padding: '9px 16px', borderRadius: '9px', border: 'none', background: newStep.trim() ? 'var(--cv6-text-primary)' : 'var(--cv6-surface-hover)', color: newStep.trim() ? 'var(--cv6-surface)' : 'var(--cv6-text-tertiary)', cursor: newStep.trim() ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700' }}>Add</button>
              </div>
              {/* The list */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '120px' }}>
                {checklist.length === 0 ? (
                  <div style={{ fontSize: '13.5px', color: 'var(--cv6-text-tertiary)', textAlign: 'center', padding: '28px 12px', lineHeight: 1.5 }}>No steps yet. Add the first thing the agent should do on this.</div>
                ) : (
                  checklist.map(step => (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '13px 4px', borderBottom: '1px solid var(--cv6-divider)' }}>
                      <button onClick={() => toggleStep(step.id)} title={step.done ? 'Mark not done' : 'Mark done'} style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '50%', border: step.done ? 'none' : '2px solid var(--cv6-text-tertiary)', background: step.done ? '#10B981' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        {step.done && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                      <span style={{ flex: 1, fontSize: '14.5px', lineHeight: 1.45, color: step.done ? 'var(--cv6-text-tertiary)' : 'var(--cv6-text-primary)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.text}</span>
                      <button onClick={() => deleteStep(step.id)} title="Remove" style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--cv6-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--cv6-text-tertiary)' }}>{checklist.filter(s => s.done).length} of {checklist.length} done</span>
                <button onClick={() => { setOpenItem(null); setNewStep('') }} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tracker Tool — per-room custom spreadsheets the agent can work (R38 r4) ────────
const TRACKER_TEMPLATES = {
  bugs: { label: 'Bug tracker', columns: ['Item', 'Severity', 'Status', 'Owner'], statusCol: 'Status', seed: [
    { Item: 'Login button misaligned on mobile', Severity: 'High', Status: 'Open', Owner: 'Bobby' },
    { Item: 'Slow image load on gallery', Severity: 'Medium', Status: 'In progress', Owner: 'Bobby' },
    { Item: 'Typo in onboarding copy', Severity: 'Low', Status: 'Open', Owner: 'Cleo' },
  ] },
  storyboard: { label: 'Storyboard', columns: ['Scene', 'Shot', 'Notes', 'Status'], statusCol: 'Status', seed: [
    { Scene: '1 · Hook', Shot: 'Close-up product', Notes: 'Punchy, 2s max', Status: 'Open' },
    { Scene: '2 · Problem', Shot: 'User frustrated', Notes: 'Handheld feel', Status: 'In progress' },
  ] },
  blank: { label: 'Blank sheet', columns: ['Column 1', 'Column 2', 'Column 3'], statusCol: null, seed: [{ 'Column 1': '', 'Column 2': '', 'Column 3': '' }] },
}
const STATUS_COLORS = { 'Open': '#F59E0B', 'In progress': '#0066FF', 'Done': '#10B981' }

// R88: weighted column tracks so dense trackers stay readable. Short fields
// (status/severity/owner) stay narrow; long text fields (bug/expected/notes)
// get the room they need. Long cells clamp to 2 lines and a row expands on tap.
function trackerColTrack(name) {
  const n = String(name).toLowerCase()
  if (['status', 'severity', 'priority', 'done'].includes(n)) return 'minmax(96px, 0.55fr)'
  if (['owner', 'area', 'type', 'date'].includes(n)) return 'minmax(88px, 0.55fr)'
  if (['page', 'scope', 'scene', 'shot'].includes(n)) return 'minmax(96px, 0.7fr)'
  if (['bug', 'expected', 'item', 'title', 'notes', 'description', 'review'].includes(n)) return 'minmax(180px, 2.4fr)'
  return 'minmax(120px, 1fr)'
}

function TrackerToolOverlay({ projects, missionsByProject }) {
  const firstProj = (projects || [])[0]
  const [trackers, setTrackers] = useState(() => [
    { id: 't1', name: 'Launch bugs', scope: firstProj ? (firstProj.name || firstProj.slug) : 'Corner', template: 'bugs', columns: TRACKER_TEMPLATES.bugs.columns, rows: TRACKER_TEMPLATES.bugs.seed.map(r => ({ ...r })), on: false },
  ])
  const [selId, setSelId] = useState('t1')
  const [creating, setCreating] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftScope, setDraftScope] = useState(firstProj ? (firstProj.slug) : '')
  const [draftTemplate, setDraftTemplate] = useState('bugs')
  const [isNarrow, setIsNarrow] = useState(false)
  const [mobilePane, setMobilePane] = useState('list')
  const [expandedRow, setExpandedRow] = useState(null) // R88: click a row to read every cell in full
  const [tall, setTall] = useState(false) // R88: expand the tracker box vertically
  const [sortCol, setSortCol] = useState(null) // R88: click a header to sort by that column
  const [sortDir, setSortDir] = useState(1)
  // Space Rising real tracker (admin_tickets) — live via /api/dashboard/admin-tickets.
  const [srStatus, setSrStatus] = useState(null) // null|loading|connected|needs_key|error
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Pull the live Space Rising ticket tracker. Renders in OUR CV6 design (data only).
  // Refreshes every 30s so Patrik sees new tickets in near real time.
  useEffect(() => {
    let active = true
    const statusMap = { needs_fix: 'Open', working: 'In progress', in_review: 'In progress', done: 'Done' }
    const pull = async () => {
      try {
        const r = await authFetch('/api/dashboard/admin-tickets?status=needs_fix,working,in_review')
        if (!active) return
        if (r.status === 503) { setSrStatus('needs_key'); return }
        if (!r.ok) { setSrStatus('error'); return }
        const d = await r.json()
        const tickets = Array.isArray(d.tickets) ? d.tickets : []
        setSrStatus('connected')
        const rows = tickets.map(t => ({
          Item: t.title || '(untitled)',
          Priority: (t.priority || '').replace(/^\w/, c => c.toUpperCase()),
          Status: statusMap[t.status] || 'Open',
          Area: t.area || '',
          Owner: t.owner || '',
        }))
        const srTracker = { id: 'sr-tickets', name: 'Space Rising — Tickets', scope: 'Space Rising', template: 'bugs', columns: ['Item', 'Priority', 'Status', 'Area', 'Owner'], rows, on: false, live: true }
        setTrackers(prev => [srTracker, ...prev.filter(t => t.id !== 'sr-tickets')])
        setSelId(prev => (prev === 't1' || prev === 'sr-tickets') ? 'sr-tickets' : prev)
      } catch { if (active) setSrStatus('error') }
    }
    pull()
    const t = setInterval(pull, 30000)
    return () => { active = false; clearInterval(t) }
  }, [])

  // R88: live CV6 / cvg bug tracker. Source of truth is a JSON on the studio disk
  // (corner/missions/corner-ui-cv6/deliverables/cv6-bug-tracker.json), read through
  // the tunnel so edits show up here with no redeploy. This is the page-by-page
  // expected-vs-actual list the EA and Patrik both work from.
  const pullBugs = useCallback(async () => {
    try {
      const r = await authFetch('/api/dashboard/cv6-bugs')
      if (!r.ok) return
      const d = await r.json()
      const bugs = Array.isArray(d.bugs) ? d.bugs : []
      if (!bugs.length) return
      const rows = bugs.map(b => ({
        __id: b.id,
        Page: b.page || '',
        Bug: b.title || '(untitled)',
        Expected: b.expected || '',
        Severity: (b.severity || '').replace(/^\w/, c => c.toUpperCase()),
        Status: b.status || 'Open',
        Owner: b.owner || '',
      }))
      const cv6Tracker = { id: 'cv6-bugs', name: 'CV6 Bugs', scope: 'Corner CV6', template: 'bugs', columns: ['Page', 'Bug', 'Expected', 'Severity', 'Status', 'Owner'], rows, on: true, live: true }
      setTrackers(prev => [cv6Tracker, ...prev.filter(t => t.id !== 'cv6-bugs')])
      setSelId(prev => (prev === 't1' || prev === 'sr-tickets') ? 'cv6-bugs' : prev)
    } catch { /* best-effort */ }
  }, [])
  useEffect(() => {
    pullBugs()
    const t = setInterval(pullBugs, 30000)
    return () => clearInterval(t)
  }, [pullBugs])

  // R88 (Patrik): add a bug from the UI. Persists via /api/dashboard/cv6-bugs so
  // the agents see it too, then refreshes the live list.
  const [addingBug, setAddingBug] = useState(false)
  const [bugDraft, setBugDraft] = useState({ page: 'Homepage', title: '', expected: '', severity: 'Medium' })
  const [savingBug, setSavingBug] = useState(false)
  const submitBug = useCallback(async () => {
    const title = (bugDraft.title || '').trim()
    if (!title) { setAddingBug(false); return }
    setSavingBug(true)
    try {
      const r = await authFetch('/api/dashboard/cv6-bugs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', world: 'aom', ...bugDraft, title }),
      })
      if (r.ok) {
        setAddingBug(false)
        setBugDraft({ page: 'Homepage', title: '', expected: '', severity: 'Medium' })
        await pullBugs()
      }
    } finally { setSavingBug(false) }
  }, [bugDraft, pullBugs])
  const updateBugStatus = useCallback(async (id, status) => {
    if (!id) return
    setTrackers(prev => prev.map(t => t.id !== 'cv6-bugs' ? t : { ...t, rows: t.rows.map(r => r.__id === id ? { ...r, Status: status } : r) }))
    try {
      await authFetch('/api/dashboard/cv6-bugs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', world: 'aom', id, status }),
      })
    } catch { /* optimistic; next poll reconciles */ }
  }, [])

  const sel = trackers.find(t => t.id === selId)
  const scopeName = (slug) => { const p = (projects || []).find(x => x.slug === slug); return p ? (p.name || p.slug) : slug }

  function createTracker() {
    const name = draftName.trim(); if (!name) { setCreating(false); return }
    const tpl = TRACKER_TEMPLATES[draftTemplate]
    const id = 't' + (trackers.length + 1) + '-' + Math.abs(name.length * 7 % 999)
    const t = { id, name, scope: scopeName(draftScope) || 'Unassigned', template: draftTemplate, columns: tpl.columns, rows: tpl.seed.map(r => ({ ...r })), on: false }
    setTrackers(prev => [...prev, t]); setSelId(id); setCreating(false); setDraftName(''); if (isNarrow) setMobilePane('sheet')
    console.log('[tracker-create]', id, name, draftTemplate)
  }
  function setCell(rowIdx, col, val) {
    setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, rows: t.rows.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r) }))
  }
  function addRow() {
    setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, rows: [...t.rows, Object.fromEntries(t.columns.map(c => [c, c === TRACKER_TEMPLATES[t.template].statusCol ? 'Open' : '']))] }))
  }
  function toggleOn() {
    setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, on: !t.on }))
    console.log('[tracker-toggle]', selId)
  }

  const statusCol = sel ? TRACKER_TEMPLATES[sel.template].statusCol : null

  const Selector = () => (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: isNarrow ? 'none' : '1px solid var(--cv6-divider)', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--cv6-divider)', position: 'sticky', top: 0, background: 'var(--cv6-surface)' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)' }}>Trackers</span>
        <button onClick={() => { setCreating(true); setDraftName('') }} title="New tracker" style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      {creating && (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--cv6-divider)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createTracker(); if (e.key === 'Escape') setCreating(false) }} placeholder="Tracker name…" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
          <select value={draftScope} onChange={e => setDraftScope(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px' }}>
            <option value="">Pick a project…</option>
            {(projects || []).map(p => <option key={p.slug} value={p.slug}>{p.name || p.slug}</option>)}
          </select>
          <select value={draftTemplate} onChange={e => setDraftTemplate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px' }}>
            {Object.entries(TRACKER_TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>Cancel</button>
            <button onClick={createTracker} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700' }}>Create</button>
          </div>
        </div>
      )}
      {trackers.map(t => (
        <button key={t.id} onClick={() => { setSelId(t.id); if (isNarrow) setMobilePane('sheet') }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '11px 14px', margin: '2px 6px', borderRadius: '6px', border: '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', background: selId === t.id ? 'hsla(220,90%,55%,0.10)' : 'transparent' }}
          onMouseEnter={(e) => { if (selId !== t.id) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={(e) => { if (selId !== t.id) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.on ? '#10B981' : 'var(--cv6-text-tertiary)', flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--cv6-text-secondary)' }}>{t.scope} · {TRACKER_TEMPLATES[t.template].label}</span>
        </span>
        </button>
      ))}
    </div>
  )

  const Sheet = () => {
   if (!sel) return (
    <div style={{ padding: '20px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>Select or create a tracker</div>
   )
   const gridTemplate = sel.columns.map(trackerColTrack).join(' ')
   return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px', borderBottom: '1px solid var(--cv6-divider)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--cv6-text-primary)' }}>{sel.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)' }}>{sel.scope} · {sel.rows.length} rows{sel.live ? ' · tap a row to read it in full' : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setTall(v => !v)} title={tall ? 'Shrink the box' : 'Expand the box taller'} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{tall ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/></> : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>}</svg>{tall ? 'Shrink' : 'Expand'}
          </button>
          <button onClick={() => { if (sel.id === 'cv6-bugs') setAddingBug(v => !v); else addRow() }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 11px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{sel.id === 'cv6-bugs' ? 'Add bug' : 'Add row'}
          </button>
          <button onClick={toggleOn} title="Turn the tracker on so the agent works it" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px 6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', background: sel.on ? 'rgba(16,185,129,0.15)' : 'var(--cv6-surface-hover)', color: sel.on ? '#10B981' : 'var(--cv6-text-secondary)' }}>
            {sel.on ? 'Agent ON' : 'Agent off'}
            <span style={{ width: '34px', height: '20px', borderRadius: '11px', background: sel.on ? '#10B981' : 'var(--cv6-text-tertiary)', position: 'relative', transition: 'background 150ms ease', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: '2px', left: sel.on ? '16px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 150ms ease' }} />
            </span>
          </button>
        </div>
      </div>
      {sel.on && <div style={{ padding: '8px 14px', fontSize: '12px', color: '#10B981', background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid var(--cv6-divider)' }}>Agent is watching this tracker and working items toward done.</div>}
      {sel.id === 'cv6-bugs' && addingBug && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)' }}>
          <input value={bugDraft.page} onChange={e => setBugDraft(d => ({ ...d, page: e.target.value }))} placeholder="Page" style={{ width: '110px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
          <input autoFocus value={bugDraft.title} onChange={e => setBugDraft(d => ({ ...d, title: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submitBug(); if (e.key === 'Escape') setAddingBug(false) }} placeholder="What is wrong?" style={{ flex: 2, minWidth: '180px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
          <input value={bugDraft.expected} onChange={e => setBugDraft(d => ({ ...d, expected: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submitBug(); if (e.key === 'Escape') setAddingBug(false) }} placeholder="What should happen?" style={{ flex: 2, minWidth: '180px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
          <select value={bugDraft.severity} onChange={e => setBugDraft(d => ({ ...d, severity: e.target.value }))} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px' }}>
            {['Low', 'Medium', 'High'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={submitBug} disabled={savingBug || !bugDraft.title.trim()} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: savingBug ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', opacity: (savingBug || !bugDraft.title.trim()) ? 0.6 : 1 }}>{savingBug ? 'Saving…' : 'Save bug'}</button>
          <button onClick={() => setAddingBug(false)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Cancel</button>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, borderBottom: '1px solid var(--cv6-divider)', position: 'sticky', top: 0, background: 'var(--cv6-surface)', zIndex: 1 }}>
            {sel.columns.map(c => (
              <div key={c} onClick={() => { setSortDir(d => sortCol === c ? -d : 1); setSortCol(c); setExpandedRow(null) }} title={`Sort by ${c}`} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: sortCol === c ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)', padding: '10px 12px', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {c}{sortCol === c ? <span style={{ fontSize: '9px' }}>{sortDir === 1 ? '▲' : '▼'}</span> : null}
              </div>
            ))}
          </div>
          {(() => {
            // Sort a decorated copy so inline edit + expand still reference the
            // original row index. Severity/Status sort by rank, others A-Z.
            const RANK = { Severity: { High: 0, Medium: 1, Low: 2 }, Status: { Open: 0, 'In progress': 1, Done: 2 } }
            const decorated = sel.rows.map((row, origIndex) => ({ row, origIndex }))
            const displayRows = sortCol ? [...decorated].sort((a, b) => {
              const av = a.row[sortCol] == null ? '' : a.row[sortCol]
              const bv = b.row[sortCol] == null ? '' : b.row[sortCol]
              const rmap = RANK[sortCol]
              const c = rmap ? ((rmap[av] ?? 99) - (rmap[bv] ?? 99)) : String(av).localeCompare(String(bv))
              return c * sortDir
            }) : decorated
            return displayRows.map(({ row, origIndex }) => {
            const ri = origIndex
            const isExp = expandedRow === ri
            return (
            <div key={ri} onClick={sel.live ? () => setExpandedRow(isExp ? null : ri) : undefined} style={{ display: 'grid', gridTemplateColumns: gridTemplate, borderBottom: '1px solid var(--cv6-divider)', cursor: sel.live ? 'pointer' : 'default', background: isExp ? 'var(--cv6-surface-hover)' : 'transparent' }}>
              {sel.columns.map(c => (
                <div key={c} style={{ borderRight: '1px solid var(--cv6-divider)', padding: '0', minWidth: 0 }}>
                  {c === statusCol ? (
                    sel.id === 'cv6-bugs' ? (
                      // CV6 bug status persists to the tracker file so the agents see it.
                      <select value={row[c] || 'Open'} onChange={e => updateBugStatus(row.__id, e.target.value)} onClick={e => e.stopPropagation()} style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', padding: '0 12px', cursor: 'pointer', color: STATUS_COLORS[row[c]] || 'var(--cv6-text-primary)', fontWeight: '600', outline: 'none' }}>
                        {['Open', 'In progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : sel.live ? (
                      <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', fontWeight: '600', color: STATUS_COLORS[row[c]] || 'var(--cv6-text-primary)' }}>{row[c] || 'Open'}</div>
                    ) : (
                      <select value={row[c] || 'Open'} onChange={e => setCell(ri, c, e.target.value)} onClick={e => e.stopPropagation()} style={{ width: '100%', height: '100%', minHeight: '40px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', padding: '0 12px', cursor: 'pointer', color: STATUS_COLORS[row[c]] || 'var(--cv6-text-primary)', fontWeight: '600', outline: 'none' }}>
                        {['Open', 'In progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )
                  ) : (
                    sel.live ? (
                      <div title={row[c] || ''} style={{ minHeight: '40px', padding: '10px 12px', fontSize: '13px', color: 'var(--cv6-text-primary)', lineHeight: 1.4, wordBreak: 'break-word', overflow: 'hidden', ...(isExp ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }) }}>{row[c] || '—'}</div>
                    ) : (
                      <input value={row[c] || ''} onChange={e => setCell(ri, c, e.target.value)} onClick={e => e.stopPropagation()} placeholder="—" title={row[c] || ''} style={{ width: '100%', minHeight: '40px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', padding: '0 12px', color: 'var(--cv6-text-primary)', outline: 'none' }} />
                    )
                  )}
                </div>
              ))}
            </div>
          )})
          })()}
        </div>
      </div>
    </div>
   )
  }

  return (
   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {srStatus === 'needs_key' && (
      <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '8px', padding: '10px 14px' }}>
        Space Rising live tracker is wired and ready. It needs its data key added to the dashboard settings to switch on.
      </div>
    )}
    <div style={{ height: isNarrow ? '64vh' : (tall ? '82vh' : '440px'), minHeight: '360px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)', display: isNarrow ? 'block' : 'grid', gridTemplateColumns: isNarrow ? undefined : '230px 1fr', transition: 'height 160ms ease' }}>
      {isNarrow ? (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {mobilePane === 'sheet' && (
            <button onClick={() => setMobilePane('list')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Trackers
            </button>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'list' ? Selector() : Sheet()}</div>
        </div>
      ) : (<>{Selector()}{Sheet()}</>)}
    </div>
   </div>
  )
}

// ── Files Tool — Finder/Dropbox 3-column file browser for a project (R38 r5) ───────
const FILE_TYPE_COLOR = { image: '#8B5CF6', video: '#EC4899', doc: '#0066FF', code: '#10B981', audio: '#F59E0B' }

// Room accent color, hue derived from the slug. Yellow/green/cyan hues (50-190) look
// much lighter than blue/red/purple at the same lightness, so white text on them fails.
// roomSolid darkens just those bright hues so white text always reads on a filled surface.
const roomHueOf = (slug) => ((slug ? slug.charCodeAt(0) : 0) * 137) % 360
const roomSolid = (slug) => {
  const h = roomHueOf(slug)
  const bright = h >= 50 && h <= 190
  return `hsl(${h}, ${bright ? 50 : 62}%, ${bright ? 34 : 47}%)`
}
function buildFileTree(proj) {
  if (!proj) return []
  return [
    { name: 'Brand', type: 'folder', children: [
      { name: 'Logos', type: 'folder', children: [
        { name: 'logo-primary.svg', type: 'file', fileType: 'image' },
        { name: 'logo-mark.svg', type: 'file', fileType: 'image' },
      ] },
      { name: 'guidelines.pdf', type: 'file', fileType: 'doc' },
      { name: 'palette.png', type: 'file', fileType: 'image' },
    ] },
    { name: 'Deliverables', type: 'folder', children: [
      { name: 'hero-v2.png', type: 'file', fileType: 'image' },
      { name: 'launch-teaser.mp4', type: 'file', fileType: 'video' },
      { name: 'one-pager.pdf', type: 'file', fileType: 'doc' },
    ] },
    { name: 'Research', type: 'folder', children: [
      { name: 'competitors.md', type: 'file', fileType: 'doc' },
      { name: 'interview-notes.md', type: 'file', fileType: 'doc' },
    ] },
    { name: 'voiceover.mp3', type: 'file', fileType: 'audio' },
    { name: 'README.md', type: 'file', fileType: 'doc' },
  ]
}

// R88: real file data. /api/dashboard/project-files?slug= returns canon files +
// per-mission files for a project; map it to the miller-column node shape.
function fileTypeFromName(name) {
  const ext = String(name).toLowerCase().split('.').pop()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio'
  return 'doc'
}
function realFileTree(d) {
  if (!d) return []
  const fileNode = (f) => ({ name: f.name, type: 'file', fileType: fileTypeFromName(f.name), path: f.path })
  const top = (Array.isArray(d.files) ? d.files : []).map(fileNode)
  const missions = (Array.isArray(d.missions) ? d.missions : [])
    .filter(m => m && (m.files || []).length)
    .map(m => ({ name: m.slug, type: 'folder', children: (Array.isArray(m.files) ? m.files : []).map(fileNode) }))
  const out = [...top]
  if (missions.length) out.push({ name: 'Missions', type: 'folder', children: missions })
  return out
}

// R88: preview panel that loads and shows the REAL file content (text rendered
// as markdown; images/video/audio fetched as an authed blob and shown inline).
// Module-scoped so it does not remount on every parent render.
function FilePreviewPanel({ node }) {
  const [data, setData] = useState({ state: 'idle' })
  useEffect(() => {
    if (!node || node.type === 'folder' || !node.path) { setData({ state: 'idle' }); return }
    let active = true; let objUrl = null
    const ft = node.fileType
    const isMedia = ft === 'image' || ft === 'video' || ft === 'audio'
    setData({ state: 'loading' })
    const url = `/api/dashboard/project-file?path=${encodeURIComponent(node.path)}${isMedia ? '&raw=1' : ''}`
    authFetch(url).then(async (r) => {
      if (!r.ok) throw new Error('load')
      if (isMedia) { const b = await r.blob(); objUrl = URL.createObjectURL(b); if (active) setData({ state: 'media', url: objUrl }) }
      else { const j = await r.json(); if (active) setData({ state: 'text', text: typeof j.content === 'string' ? j.content : '' }) }
    }).catch(() => { if (active) setData({ state: 'error' }) })
    return () => { active = false; if (objUrl) URL.revokeObjectURL(objUrl) }
  }, [node && node.path, node && node.fileType])

  const hint = (t) => <div style={{ padding: '14px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>{t}</div>
  if (!node) return hint('Select a file to preview')
  if (node.type === 'folder') return hint((node.children || []).length ? `${node.children.length} items inside` : 'Empty folder')
  const color = FILE_TYPE_COLOR[node.fileType] || 'var(--cv6-text-secondary)'
  return (
    <div style={{ padding: '14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cv6-text-primary)', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{node.name}</span>
        <span style={{ fontSize: '10px', fontWeight: '700', color, background: `${color}1f`, padding: '2px 7px', borderRadius: '5px', textTransform: 'uppercase', flexShrink: 0 }}>{node.fileType}</span>
      </div>
      {data.state === 'loading' && hint('Loading…')}
      {data.state === 'error' && <div style={{ fontSize: '13px', color: '#ef4444' }}>Could not open this file.</div>}
      {data.state === 'media' && node.fileType === 'image' && <img src={data.url} alt={node.name} style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />}
      {data.state === 'media' && node.fileType === 'video' && <video src={data.url} controls style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />}
      {data.state === 'media' && node.fileType === 'audio' && <audio src={data.url} controls style={{ width: '100%' }} />}
      {data.state === 'text' && <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--cv6-text-primary)', wordBreak: 'break-word' }}><ChatMessageRenderer content={data.text || '(empty file)'} /></div>}
    </div>
  )
}

function FilesToolOverlay({ projects }) {
  const [proj, setProj] = useState((projects || [])[0] || null)
  const [sel1, setSel1] = useState(null)
  const [sel2, setSel2] = useState(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const [mobileCol, setMobileCol] = useState(0)
  const [tree, setTree] = useState([])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => { setSel1(null); setSel2(null); setMobileCol(0) }, [proj])

  // R88: load the REAL file tree for the selected project and refresh every 12s
  // so files an agent lands on disk appear live. Falls back to sample data on
  // the no-backend gallery (project without a slug).
  useEffect(() => {
    if (!proj || !proj.slug) { setTree(buildFileTree(proj)); return }
    let active = true
    const load = async () => {
      try {
        const r = await authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(proj.slug)}`)
        if (!active) return
        if (!r.ok) { setTree([]); return }
        const d = await r.json()
        setTree(realFileTree(d))
      } catch { if (active) setTree([]) }
    }
    load()
    const t = setInterval(load, 12000)
    return () => { active = false; clearInterval(t) }
  }, [proj])
  const col2items = sel1 && sel1.type === 'folder' ? (sel1.children || []) : []
  const col3node = sel2

  const colStyle = { display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--cv6-divider)', overflowY: 'auto' }
  const headStyle = { flexShrink: 0, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)', padding: '10px 14px', position: 'sticky', top: 0, background: 'var(--cv6-surface)', borderBottom: '1px solid var(--cv6-divider)', zIndex: 1 }
  const emptyHint = (t) => <div style={{ padding: '14px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>{t}</div>

  const FileRow = ({ node, active, onClick }) => {
    const isFolder = node.type === 'folder'
    const color = isFolder ? 'var(--cv6-text-secondary)' : (FILE_TYPE_COLOR[node.fileType] || 'var(--cv6-text-secondary)')
    return (
      <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '8px 12px', margin: '2px 6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? 'hsla(220,90%,55%,0.10)' : 'transparent', transition: 'background 120ms ease' }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ flexShrink: 0, color, display: 'inline-flex' }}>
          {isFolder
            ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
        {isFolder && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>}
      </button>
    )
  }


  const Col1 = () => (
    <div style={colStyle}><div style={headStyle}>{proj ? (proj.name || proj.slug) : 'Files'}</div>
      {tree.length ? tree.map((n, i) => <FileRow key={i} node={n} active={sel1 === n} onClick={() => { setSel1(n); setSel2(null); if (isNarrow && n.type === 'folder') setMobileCol(1) }} />) : emptyHint('No files')}
    </div>
  )
  const Col2 = () => (
    <div style={colStyle}><div style={headStyle}>{sel1 && sel1.type === 'folder' ? sel1.name : 'Contents'}</div>
      {!sel1 ? emptyHint('Select a folder') : (sel1.type === 'file' ? <FilePreviewPanel node={sel1} /> : (col2items.length ? col2items.map((n, i) => <FileRow key={i} node={n} active={sel2 === n} onClick={() => { setSel2(n); if (isNarrow) setMobileCol(2) }} />) : emptyHint('Empty folder')))}
    </div>
  )
  const Col3 = () => (
    <div style={{ ...colStyle, borderRight: 'none' }}><div style={headStyle}>Preview</div><FilePreviewPanel node={col3node} /></div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <select value={proj ? proj.slug : ''} onChange={e => setProj((projects || []).find(p => p.slug === e.target.value) || null)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
          {(projects || []).map(p => <option key={p.slug} value={p.slug}>{p.name || p.slug}</option>)}
        </select>
        <span style={{ fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>Click a folder to open it · click a file to preview it</span>
      </div>
      {isNarrow ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '62vh', minHeight: '360px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
          {mobileCol > 0 && (
            <button onClick={() => setMobileCol(mobileCol - 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>{mobileCol === 1 ? (proj?.name || 'Files') : (sel1?.name || 'Back')}
            </button>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>{mobileCol === 0 ? <Col1 /> : mobileCol === 1 ? <Col2 /> : <Col3 />}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '420px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
          <Col1 /><Col2 /><Col3 />
        </div>
      )}
    </div>
  )
}

// R40: CHAT tool — the old 3-pane room view rebuilt inside the new tool window.
// LEFT rooms list + inline create form · MIDDLE the room's full chat · RIGHT the room's files.
function ChatToolOverlay({ projects, missionsByProject, agents, initialRoom, onCreateProject, onCreateMission, onSend }) {
  const rooms = useMemo(() => {
    const ag = (agents || []).map(a => ({ kind: 'agent', slug: a.slug, name: a.name || a.slug }))
    const pr = (projects || []).map(p => ({ kind: 'project', slug: p.slug, name: p.name || p.slug }))
    return [...ag, ...pr]
  }, [agents, projects])
  // R55: open preselected to the room the user jumped from (match by kind+slug so we reuse the
  // real room object; fall back to the passed room, then the first room).
  const matchInitial = () => initialRoom ? (rooms.find(r => r.kind === initialRoom.kind && r.slug === initialRoom.slug) || initialRoom) : null
  const [sel, setSel] = useState(matchInitial() || rooms[0] || null)
  useEffect(() => { const m = matchInitial(); if (m) setSel(m) }, [initialRoom])
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState({})            // slug -> [{ from, text }]
  const [creating, setCreating] = useState(null)      // 'project' | 'mission'
  const [npName, setNpName] = useState('')
  const [nmProj, setNmProj] = useState((projects || [])[0]?.slug || '')
  const [nmName, setNmName] = useState('')
  const [nmGoal, setNmGoal] = useState('')
  const [localProjects, setLocalProjects] = useState(projects || [])
  const [isNarrow, setIsNarrow] = useState(false)
  const [mobileCol, setMobileCol] = useState(0)       // 0 rooms · 1 chat · 2 files
  const chatNavRef = useRef(null)
  // R56 (Patrik): inside the Chat tool, Down/Up move the room selection and Right opens that
  // room (mobile → chat column; desktop → focus the message box, the chat is already shown).
  // Document-level so it works without juggling focus; ignores input/textarea targets so the
  // message box keeps normal cursor keys.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!rooms.length) return
      const idx = Math.max(0, rooms.findIndex(r => sel && r.kind === sel.kind && r.slug === sel.slug))
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(rooms[(idx + 1) % rooms.length]) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(rooms[(idx - 1 + rooms.length) % rooms.length]) }
      else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (isNarrow) setMobileCol(1)
        else chatNavRef.current?.querySelector('textarea')?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [rooms, sel, isNarrow])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth < 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => {
    setLocalProjects(prev => {
      const have = new Set(prev.map(p => p.slug))
      const add = (projects || []).filter(p => !have.has(p.slug))
      return add.length ? [...prev, ...add] : prev
    })
  }, [projects])

  const hue = (slug) => ((slug ? slug.charCodeAt(0) : 0) * 137) % 360
  const seedThread = (room) => ([
    { from: 'them', text: `On it. Picking up ${room.name} where we left off.` },
    { from: 'me', text: 'Great. Push it as far as you can and flag anything you need.' },
    { from: 'them', text: 'Will do. First pass is ready for you to look at whenever.' },
  ])
  const msgs = sel ? (thread[sel.slug] || seedThread(sel)) : []
  const files = useMemo(() => buildFileTree(sel ? { slug: sel.slug } : null), [sel])

  function send() {
    const t = draft.trim(); if (!t || !sel) return
    setThread(prev => ({ ...prev, [sel.slug]: [...(prev[sel.slug] || seedThread(sel)), { from: 'me', text: t }] }))
    setDraft('')
    // Optimistic UI above; real send via onSend (provided on /cvg + /dashboard).
    // No onSend (e.g. the no-backend gallery) → stays optimistic.
    if (onSend) onSend(sel, t)
    else console.log('[chat-send]', sel.kind, sel.slug, t)
  }
  function commitProject() {
    const name = npName.trim(); if (!name) { setCreating(null); setNpName(''); return }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + (localProjects.length + 1)
    const p = { slug, name }
    setLocalProjects(prev => [p, ...prev]); setSel({ kind: 'project', slug, name })
    setCreating(null); setNpName('')
    onCreateProject && onCreateProject(slug, name)
  }
  function commitMission() {
    const name = nmName.trim(); if (!name || !nmProj) { setCreating(null); return }
    const missionSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    onCreateMission && onCreateMission(nmProj, missionSlug, name)
    setCreating(null); setNmName(''); setNmGoal('')
  }

  const colStyle = { display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--cv6-divider)', overflowY: 'auto' }
  const headStyle = { flexShrink: 0, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cv6-surface)', borderBottom: '1px solid var(--cv6-divider)' }
  const iconBtn = (title, onClick, children) => (
    <button title={title} onClick={onClick} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-secondary)' }}>
      {children}
    </button>
  )
  const projGlyph = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  const fileGlyph = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>

  const RoomsCol = () => (
    <div style={colStyle}>
      <div style={headStyle}>All Rooms</div>
      <div style={{ display: 'flex', gap: '6px', padding: '8px 10px', borderBottom: '1px solid var(--cv6-divider)' }}>
        <button onClick={() => setCreating(creating === 'project' ? null : 'project')} style={{ flex: 1, padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: creating === 'project' ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)', color: creating === 'project' ? '#fff' : 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>+ Project</button>
        <button onClick={() => setCreating(creating === 'mission' ? null : 'mission')} style={{ flex: 1, padding: '7px 8px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: creating === 'mission' ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)', color: creating === 'mission' ? '#fff' : 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>+ Mission</button>
      </div>
      {creating === 'project' && (
        <div style={{ padding: '10px', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)' }}>
          <input autoFocus value={npName} onChange={e => setNpName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitProject(); if (e.key === 'Escape') setCreating(null) }} placeholder="Name the project…" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none', marginBottom: '8px' }} />
          <button onClick={commitProject} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Save</button>
        </div>
      )}
      {creating === 'mission' && (
        <div style={{ padding: '10px', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select value={nmProj} onChange={e => setNmProj(e.target.value)} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px' }}>
            <option value="">Pick a project…</option>
            {localProjects.map(p => <option key={p.slug} value={p.slug}>{p.name || p.slug}</option>)}
          </select>
          <input value={nmName} onChange={e => setNmName(e.target.value)} placeholder="Name the mission…" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
          <textarea value={nmGoal} onChange={e => setNmGoal(e.target.value)} placeholder="Mission goal…" rows={2} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
          <button onClick={commitMission} style={{ padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>Save</button>
        </div>
      )}
      {rooms.map(r => {
        const active = sel?.slug === r.slug && sel?.kind === r.kind
        return (
          <button key={r.kind + r.slug} onClick={() => { setSel(r); if (isNarrow) setMobileCol(1) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '10px 12px', margin: '2px 6px', borderRadius: '6px', border: '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', background: active ? `hsla(${hue(r.slug)}, 60%, 48%, 0.12)` : 'transparent' }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ flexShrink: 0, width: '9px', height: '9px', borderRadius: '50%', background: `hsl(${hue(r.slug)}, 65%, 55%)` }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--cv6-text-tertiary)' }}>{r.kind === 'agent' ? 'Agent' : 'Project'}</span>
          </button>
        )
      })}
    </div>
  )

  const ChatCol = ({ mobile } = {}) => (
    <div style={{ ...colStyle, borderRight: isNarrow ? 'none' : '1px solid var(--cv6-divider)', height: mobile ? '100%' : undefined }}>
      {/* Secondary nav: (mobile) back + dot + name on the left, room Projects/Files icons on the right */}
      <div style={{ ...headStyle, borderBottom: sel ? `2px solid hsl(${hue(sel.slug)}, 70%, 60%)` : '1px solid var(--cv6-divider)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textTransform: 'none', fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)', letterSpacing: 0 }}>
          {mobile && (
            <button onClick={() => setMobileCol(0)} title="Back to rooms" style={{ flexShrink: 0, width: '30px', height: '30px', marginLeft: '-4px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--cv6-accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {sel ? <><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: `hsl(${hue(sel.slug)}, 70%, 60%)`, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.name}</span></> : 'Select a room'}
        </span>
        {sel && <span style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>{iconBtn('Projects', () => { if (isNarrow) setMobileCol(2) }, projGlyph)}{iconBtn('Files', () => { if (isNarrow) setMobileCol(2) }, fileGlyph)}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!sel ? <div style={{ margin: 'auto', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>Pick a room on the left to open its chat.</div> : msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '76%', padding: '9px 13px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.45, background: m.from === 'me' ? roomSolid(sel.slug) : 'var(--cv6-surface-hover)', color: m.from === 'me' ? '#fff' : 'var(--cv6-text-primary)' }}>{m.text}</div>
        ))}
      </div>
      {sel && (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--cv6-divider)', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={`Message ${sel.name}…`} rows={1} style={{ flex: 1, resize: 'none', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none', maxHeight: '110px' }} />
          <button onClick={send} title={draft.trim() ? 'Send' : 'Voice'} style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: draft.trim() ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface-hover)', color: draft.trim() ? '#fff' : 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {draft.trim()
              ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></svg>}
          </button>
        </div>
      )}
    </div>
  )

  const FilesCol = () => (
    <div style={{ ...colStyle, borderRight: 'none' }}>
      <div style={headStyle}><span>Files</span></div>
      {!sel ? <div style={{ padding: '14px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>No room selected</div> : files.map((n, i) => {
        const isFolder = n.type === 'folder'
        const color = isFolder ? 'var(--cv6-text-secondary)' : (FILE_TYPE_COLOR[n.fileType] || 'var(--cv6-text-secondary)')
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', margin: '2px 6px', borderRadius: '6px' }}>
            <span style={{ flexShrink: 0, color, display: 'inline-flex' }}>
              {isFolder
                ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
          </div>
        )
      })}
    </div>
  )

  if (isNarrow) {
    // R49: mobile chat is a FULL room. Chat view fills the tool area (own secondary nav with
    // back + name + room icons via ChatCol mobile); only Rooms/Files keep a plain back bar.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '70vh', height: '100%', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
        {mobileCol === 2 && (
          <button onClick={() => setMobileCol(1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>{sel?.name || 'Chat'}
          </button>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{mobileCol === 0 ? <RoomsCol /> : mobileCol === 1 ? <ChatCol mobile /> : <FilesCol />}</div>
      </div>
    )
  }
  return (
    <div ref={chatNavRef} style={{ display: 'grid', gridTemplateColumns: '230px 1.4fr 0.9fr', height: '460px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
      <RoomsCol /><ChatCol /><FilesCol />
    </div>
  )
}

// R50: COMMAND DECK — compact live table (per Patrik's wireframe). One ROW per reply
// waiting on you: select · agent (+ incoming) · editable reply · timer with depleting bar ·
// send/hold/discard. Header has Hold all + Send selected. Agent color = identity (dot + bar);
// the one action color drives every primary control.
function CommandDeckOverlay({ projects, agents }) {
  const seed = useMemo(() => ([
    { who: (agents || [])[0]?.name || 'Elon', slug: (agents || [])[0]?.slug || 'elon', incoming: 'CTA copy final?', reply: 'Looks good. Lock the CTA as is and move on to the FAQ block.' },
    { who: (projects || [])[0]?.name || 'Corner', slug: (projects || [])[0]?.slug || 'corner', incoming: 'Publish teaser?', reply: 'Approved. Publish it and post the teaser to the launch room.' },
    { who: (projects || [])[1]?.name || 'Space Rising', slug: (projects || [])[1]?.slug || 'space-rising', incoming: 'Enterprise pricing', reply: 'Send the reply as drafted and book a call for next week.' },
  ]), [agents, projects])

  const [rows, setRows] = useState(() => seed.map((c, i) => ({ ...c, id: i, secs: 14 + i * 8, total: 30, status: 'live', held: false, checked: true })))
  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = window.setInterval(() => {
      setRows(prev => prev.map(r => {
        if (r.status !== 'live' || r.held) return r
        const s = r.secs - 1
        return s <= 0 ? { ...r, secs: 0, status: 'sent' } : { ...r, secs: s }
      }))
    }, 1000)
    return () => window.clearInterval(t)
  }, [])

  const hue = (slug) => ((slug ? slug.charCodeAt(0) : 0) * 137) % 360
  const update = (id, patch) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const sendNow = (id) => { update(id, { status: 'sent', secs: 0 }); const r = rows.find(x => x.id === id); console.log('[command-deck-send]', r?.slug, r?.reply) }
  const discard = (id) => update(id, { status: 'discarded' })
  const toggleHold = (id) => setRows(prev => prev.map(r => (r.id === id ? { ...r, held: !r.held } : r)))
  const live = rows.filter(r => r.status === 'live')
  const pending = live.length
  const allChecked = pending > 0 && live.every(r => r.checked)
  const setAllChecked = (v) => setRows(prev => prev.map(r => (r.status === 'live' ? { ...r, checked: v } : r)))
  const holdAll = () => setRows(prev => prev.map(r => (r.status === 'live' ? { ...r, held: true } : r)))
  const sendSelected = () => setRows(prev => prev.map(r => (r.status === 'live' && r.checked ? { ...r, status: 'sent', secs: 0 } : r)))

  const GRID = '28px 132px minmax(200px, 1fr) 72px 104px'
  const head = { fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cv6-text-tertiary)', padding: '9px 8px' }
  const cell = { padding: '10px 8px', minWidth: 0, alignSelf: 'start' }

  return (
    <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header: pending summary + Hold all + Send selected */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)' }}><b style={{ color: 'var(--cv6-text-primary)', fontWeight: '600' }}>{pending} {pending === 1 ? 'reply' : 'replies'}</b> pending · sending automatically</span>
        <span style={{ display: 'flex', gap: '6px' }}>
          <button onClick={holdAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px', borderRadius: '7px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>Hold all
          </button>
          <button onClick={sendSelected} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '7px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>Send selected</button>
        </span>
      </div>

      {/* Table — scrolls horizontally on narrow so the Reply column keeps a usable width */}
      <div style={{ border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflowX: 'auto', background: 'var(--cv6-surface)' }}>
        <div style={{ minWidth: '600px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)' }}>
          <span style={{ ...head, paddingLeft: '10px' }}><input type="checkbox" checked={allChecked} onChange={e => setAllChecked(e.target.checked)} style={{ accentColor: 'var(--cv6-accent-primary)', cursor: 'pointer' }} aria-label="Select all" /></span>
          <span style={head}>Agent</span>
          <span style={head}>Reply (editable)</span>
          <span style={head}>Sends</span>
          <span style={head} />
        </div>
        {pending === 0 && <div style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--cv6-text-tertiary)' }}>All clear. Nothing waiting on you.</div>}
        {rows.map(r => {
          if (r.status === 'discarded' && false) return null
          const h = hue(r.slug)
          const done = r.status !== 'live'
          const pct = Math.max(0, Math.min(100, (r.secs / r.total) * 100))
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'start', borderBottom: '1px solid var(--cv6-divider)', opacity: done ? 0.45 : 1, transition: 'opacity 200ms ease' }}>
              <span style={{ ...cell, paddingLeft: '10px', paddingTop: '13px' }}><input type="checkbox" checked={r.checked} disabled={done} onChange={e => update(r.id, { checked: e.target.checked })} style={{ accentColor: 'var(--cv6-accent-primary)', cursor: done ? 'default' : 'pointer' }} aria-label={`Select ${r.who}`} /></span>
              <span style={cell}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: `hsl(${h}, 65%, 52%)` }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.who}</span>
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--cv6-text-tertiary)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.incoming}>{r.incoming}</span>
              </span>
              <span style={cell}>
                <textarea value={r.reply} disabled={done} onChange={e => update(r.id, { reply: e.target.value, held: true })} rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'none', padding: '6px 8px', borderRadius: '5px', border: '1px solid transparent', background: 'transparent', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.45, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid var(--cv6-accent-primary)'; e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,102,255,0.12)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }} />
              </span>
              <span style={{ ...cell, paddingTop: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', color: r.status === 'sent' ? '#10B981' : r.status === 'discarded' ? 'var(--cv6-text-tertiary)' : r.held ? 'var(--cv6-text-tertiary)' : 'var(--cv6-text-secondary)' }}>
                  {r.status === 'sent' ? 'sent' : r.status === 'discarded' ? 'discarded' : r.held ? 'held' : `${r.secs}s`}
                </span>
                {!done && (
                  <span style={{ display: 'block', height: '2px', borderRadius: '2px', background: 'var(--cv6-surface-hover)', overflow: 'hidden', marginTop: '5px' }}>
                    <span style={{ display: 'block', height: '100%', width: `${r.held ? 100 : pct}%`, background: r.held ? 'var(--cv6-text-tertiary)' : `hsl(${h}, 65%, 52%)`, transition: 'width 1s linear' }} />
                  </span>
                )}
              </span>
              <span style={{ ...cell, paddingTop: '8px', display: 'flex', gap: '2px' }}>
                <button onClick={() => sendNow(r.id)} disabled={done} title="Send now" aria-label="Send now" style={{ padding: '5px 7px', border: 'none', background: 'transparent', borderRadius: '5px', cursor: done ? 'default' : 'pointer', color: 'var(--cv6-accent-primary)', display: 'inline-flex' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
                <button onClick={() => toggleHold(r.id)} disabled={done} title={r.held ? 'Resume timer' : 'Hold timer'} aria-label="Hold timer" style={{ padding: '5px 7px', border: 'none', background: 'transparent', borderRadius: '5px', cursor: done ? 'default' : 'pointer', color: 'var(--cv6-text-secondary)', display: 'inline-flex' }}>
                  {r.held
                    ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>}
                </button>
                <button onClick={() => discard(r.id)} disabled={done} title="Discard without sending" aria-label="Discard" style={{ padding: '5px 7px', border: 'none', background: 'transparent', borderRadius: '5px', cursor: done ? 'default' : 'pointer', color: 'var(--cv6-text-tertiary)', display: 'inline-flex' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </span>
            </div>
          )
        })}
        </div>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--cv6-text-tertiary)', lineHeight: 1.5, margin: '2px' }}>Click any reply to edit it in place. Unchecked rows are left out of Send selected but still send on their own timer unless you hold them.</p>
    </div>
  )
}

export default function HomeView({
  user,
  worldId,
  agents = [],
  projectRooms = [],
  onSelectAgent,
  onSelectProject,
  onOpenSearch,
  initialTool, // R38: gallery pieces can open a tool directly (e.g. 'projects', 'review')
  // "Needs you" rows — home tells the real story before it offers a search box.
  // Each row: { key, label, detail, onOpen }. Parent only passes rows whose
  // click target is real, so every row here is one tap from acting.
  needsYou = [],
  cv6, // R7: gate for CV6 design system (keyboard nav, missions-primary, inline actions, happening now)
  onChatSend, // real send for the CV6 Chat tool (agent/project routing + Gemini lane on /cvg). Omit → optimistic only (gallery).
  onReplyToRoom, // real reply function for Review tool (posts notes to rooms). Omit → review notes are optimistic only.
  commandDeckSlot, // real goal-ledger CommandDeck element (passed from CornerVG). When present the Command tool renders the LIVE ledger instead of the sample deck (gallery has none → sample).
}) {
  // Pin state — keyed by user id
  const userId = user?.id
  const [pinnedAgents, setPinnedAgents] = useState(() => readStored(PIN_AGENTS_KEY + ':' + userId, []))
  const [pinnedProjects, setPinnedProjects] = useState(() => readStored(PIN_PROJECTS_KEY + ':' + userId, []))
  const [expandedProjects, setExpandedProjects] = useState(() => readStored(EXPANDED_PROJECTS_KEY + ':' + userId, {}))
  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const greeting = useMemo(() => pickGreeting(), [])

  // Live recents: track the last time the user visited each project room.
  // Written immediately when they click a project, so even 1 second ago shows up.
  const [recentVisits, setRecentVisits] = useState(() =>
    readStored(RECENT_VISITS_KEY + ':' + userId, {})
  )

  // Section collapse state — persisted per user
  const [collapsedSections, setCollapsedSections] = useState(() =>
    readStored(SECTION_COLLAPSED_KEY + ':' + userId, { recents: false, agents: false, allProjects: false })
  )

  function toggleSection(key) {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] }
      writeStored(SECTION_COLLAPSED_KEY + ':' + userId, next)
      return next
    })
  }

  // R21: Tools box state — which tool is open in full-screen mode
  const [selectedTool, setSelectedTool] = useState(initialTool || 'home') // R26: Home default; R38: gallery can open a tool
  const [toolRecency, setToolRecency] = useState([]) // R48: most-recently-used tools sit next to Home
  // R48: open a tool AND record it as most-recent so the row reorders into recency order.
  const openTool = useCallback((key) => {
    setSelectedTool(key)
    if (key !== 'home') setToolRecency(prev => [key, ...prev.filter(k => k !== key)])
  }, [])

  // R37: right-click menu for active-work cards (missions + projects). Same options as the
  // left-menu; every action is a forward-advance into the project screen (navigate + confirm).
  const [cardMenu, setCardMenu] = useState(null) // { x, y, type:'mission'|'project', item, project }

  // R35: live clock + timezone for the top-right display (greeting font, click to change zone)
  const [now, setNow] = useState(() => new Date())
  const [timezone, setTimezone] = useState(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch (_) { return 'America/Los_Angeles' } })
  const [showTzPicker, setShowTzPicker] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  const TZ_OPTIONS = [
    { label: 'Pacific', zone: 'America/Los_Angeles' },
    { label: 'Mountain', zone: 'America/Denver' },
    { label: 'Central', zone: 'America/Chicago' },
    { label: 'Eastern', zone: 'America/New_York' },
    { label: 'London', zone: 'Europe/London' },
    { label: 'Oslo', zone: 'Europe/Oslo' },
  ]
  const fmtDate = (d, zone) => { try { return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: zone }).format(d) } catch (_) { return '' } }
  const fmtTime = (d, zone) => { try { return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(d) } catch (_) { return '' } }

  // Record a visit — called right before routing away from home.
  // Accepts a project slug and an optional mission slug.
  // Mission visits are stored as 'm:{projSlug}/{missionSlug}' so they share
  // the same localStorage map as project visits without colliding.
  function recordVisit(projSlug, missionSlug) {
    const ts = Date.now()
    setRecentVisits(prev => {
      const next = { ...prev, [projSlug]: ts }
      if (missionSlug) next['m:' + projSlug + '/' + missionSlug] = ts
      writeStored(RECENT_VISITS_KEY + ':' + userId, next)
      return next
    })
  }

  // Return the effective timestamp for a mission, incorporating its visit record.
  // Used when sorting missions inside an expanded project accordion.
  function missionEffectiveTs(projSlug, m) {
    const key = 'm:' + projSlug + '/' + m.slug
    const visitTs = recentVisits[key] || 0
    const msgTs = m.last_message_at ? new Date(m.last_message_at).getTime() : 0
    return Math.max(visitTs, msgTs)
  }

  // Missions per project — fetched from /api/dashboard/missions-tree (same
  // endpoint RightMenu uses). projectRooms from useDataPipe doesn't include
  // missions, so we self-fetch here. Result is a { [projectSlug]: missions[] }
  // map keyed for cheap lookup in the project row render.
  //
  // fetchMissions is extracted as a callable so it can be:
  //   1. Run on mount (via the useEffect below)
  //   2. Re-run every 60s (background interval)
  //   3. Triggered on-demand when the user expands a project that shows 0 missions
  const [missionsByProject, setMissionsByProject] = useState({})
  const fetchMissions = useCallback(async () => {
    if (!worldId) return
    try {
      const res = await authFetch(
        '/api/dashboard/missions-tree?client=' + encodeURIComponent(worldId),
        { credentials: 'include' }
      )
      if (!res.ok) {
        // Fallback: CV6Gallery context (no real API). Derive mock missions from projectRooms.
        if (cv6 && projectRooms && projectRooms.length > 0) {
          const next = {}
          for (const proj of projectRooms) {
            next[proj.slug] = [
              { slug: proj.slug + '-m1', name: proj.name + ' · Main', last_message_at: new Date(Date.now() - 3600000).toISOString(), status: 'idle', depth: 0 },
              { slug: proj.slug + '-m2', name: proj.name + ' · Secondary', last_message_at: new Date(Date.now() - 7200000).toISOString(), status: 'idle', depth: 0 },
            ]
          }
          setMissionsByProject(next)
        }
        return
      }
      const j = await res.json().catch(() => null)
      if (!j || !Array.isArray(j.projects)) return
      const next = {}
      for (const proj of j.projects) {
        if (!proj?.slug) continue
        const missions = (proj.missions || []).map(m => {
          const tasks = m.tasks || []
          const hasRunning = tasks.some(tk => ['running', 'building', 'active'].includes(tk.status))
          const hasQueued = tasks.some(tk => ['queued', 'planning', 'classifying'].includes(tk.status))
          return {
            slug: m.raw_slug || m.slug,
            name: m.name || m.raw_slug || m.slug,
            last_message_at: m.last_message_at || m.last_updated || null,
            status: hasRunning ? 'running' : hasQueued ? 'queued' : 'idle',
            depth: typeof m.depth === 'number' ? m.depth : 0,
          }
        })
        missions.sort((a, b) => {
          if (a.last_message_at && b.last_message_at) return new Date(b.last_message_at) - new Date(a.last_message_at)
          if (a.last_message_at) return -1
          if (b.last_message_at) return 1
          return (a.name || '').localeCompare(b.name || '')
        })
        next[proj.slug] = missions
      }
      setMissionsByProject(next)
    } catch (_) {}
  }, [worldId, cv6, projectRooms])

  useEffect(() => {
    fetchMissions()
    // R88: refresh every 20s so a mission an agent creates lands within seconds
    // (user-created ones refresh immediately via persistCreateMission).
    const timer = setInterval(fetchMissions, 20000)
    return () => clearInterval(timer)
  }, [fetchMissions])

  useEffect(() => { writeStored(PIN_AGENTS_KEY + ':' + userId, pinnedAgents) }, [pinnedAgents, userId])
  useEffect(() => { writeStored(PIN_PROJECTS_KEY + ':' + userId, pinnedProjects) }, [pinnedProjects, userId])
  useEffect(() => { writeStored(EXPANDED_PROJECTS_KEY + ':' + userId, expandedProjects) }, [expandedProjects, userId])

  // Default: pin the EA if user has no pins yet.
  const visibleAgents = useMemo(() => {
    if (!agents || agents.length === 0) return []
    // If user has explicit pins, use them; otherwise default to EAs only.
    if (pinnedAgents.length > 0) {
      return agents.filter(a => pinnedAgents.includes(a.slug))
    }
    return agents.filter(a => a.is_ea)
  }, [agents, pinnedAgents])

  // Recent (top 5): sorted purely by effective last activity (most recent first).
  // Effective activity = max(recentVisit timestamp, project.last_message_at, latest mission.last_message_at).
  // recentVisits is the highest-priority signal — written immediately when the user clicks a room.
  // This means a room they just left will always appear at the top of RECENTS, regardless of pinning.
  // Pinning is preserved for UI affordance but does not change sort order.
  const { recentProjects, allProjects } = useMemo(() => {
    if (!projectRooms || projectRooms.length === 0) return { recentProjects: [], allProjects: [] }

    // Compute effective last-active timestamp per project.
    // recentVisits[slug] is highest priority — written on every project navigation.
    const effectiveTs = (p) => {
      const visitTs = recentVisits[p.slug] || 0           // user just visited this room
      const projTs = p.last_message_at ? new Date(p.last_message_at).getTime() : 0
      const missions = missionsByProject[p.slug] || []
      const missionTs = missions.reduce((max, m) => {
        const t = m.last_message_at ? new Date(m.last_message_at).getTime() : 0
        return t > max ? t : max
      }, 0)
      return Math.max(visitTs, projTs, missionTs)
    }

    // Sort by recency only — most recently visited/active projects come first.
    const sorted = [...projectRooms].sort((a, b) => {
      return effectiveTs(b) - effectiveTs(a)
    })
    const recent = sorted.slice(0, 5)
    const recentSlugs = new Set(recent.map(p => p.slug))
    const rest = [...projectRooms]
      .filter(p => !recentSlugs.has(p.slug))
      .sort((a, b) => (a.name || a.slug || '').localeCompare(b.name || b.slug || ''))
    return { recentProjects: recent, allProjects: rest }
  }, [projectRooms, pinnedProjects, missionsByProject, recentVisits])

  // R43: real persistence for the tool actions. Optimistic UI updates first; these
  // fire the actual backend write. In the gallery (no auth) they no-op gracefully.
  const persistCreateProject = useCallback(async (slug, name) => {
    try {
      await authFetch('/api/dashboard/create-project-from-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, client_id: worldId || 'aom', agent_slug: 'ea' }),
      })
      // R88: refresh now so the new project's missions show in real time, not in 60s.
      fetchMissions()
    } catch { /* optimistic UI already reflects it; surfacing handled elsewhere */ }
  }, [worldId, fetchMissions])
  const persistCreateMission = useCallback(async (parentSlug, missionSlug, name) => {
    try {
      await authFetch('/api/dashboard/create-mission-from-drawer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_slug: parentSlug, mission_slug: missionSlug, name, client_id: worldId || 'aom' }),
      })
      // R88: refresh now so the new mission appears in Active Work within seconds.
      fetchMissions()
    } catch { /* optimistic */ }
  }, [worldId, fetchMissions])
  const persistMoveFile = useCallback(async (slug, from, to) => {
    try {
      await authFetch('/api/dashboard/project-file-move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, from, to }),
      })
    } catch { /* optimistic */ }
  }, [])

  function toggleAgentPin(slug) {
    setPinnedAgents(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }
  function toggleProjectPin(slug) {
    setPinnedProjects(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }
  function toggleExpand(slug) {
    const wasExpanded = !!expandedProjects[slug]
    setExpandedProjects(prev => ({ ...prev, [slug]: !wasExpanded }))
    // If opening an accordion that has 0 cached missions, fetch immediately
    // so the user sees missions appear rather than a stale "No missions yet."
    if (!wasExpanded && (!missionsByProject[slug] || missionsByProject[slug].length === 0)) {
      fetchMissions()
    }
  }

  // Project select — record the visit then route.
  // Records both the project visit AND the mission visit (if a mission was clicked)
  // so that mission lists re-sort with the most recently visited mission at the top.
  function handleProjectSelect(proj, mission) {
    recordVisit(proj.slug, mission?.slug || null)
    // R19: Quick-view wire — set selectedRoom in Conversation column
    setSelectedRoom({ project: proj, mission: mission || null })
    onSelectProject && onSelectProject(proj, mission)
  }

  // R7: for CV6, flatten all missions into a single list with project context
  const allMissionsForCV6 = useMemo(() => {
    if (!cv6 || !projectRooms) return []
    const all = []
    try {
      projectRooms.forEach(p => {
        if (!p || !p.slug) return
        const missions = missionsByProject[p.slug] || []
        if (!Array.isArray(missions)) return
        missions.forEach(m => {
          if (m && m.slug) all.push({ mission: m, project: p })
        })
      })
      // Sort by recency
      return all.sort((a, b) => {
        const tsA = a.mission?.last_message_at ? new Date(a.mission.last_message_at).getTime() : 0
        const tsB = b.mission?.last_message_at ? new Date(b.mission.last_message_at).getTime() : 0
        return tsB - tsA
      })
    } catch (_) {
      return []
    }
  }, [cv6, projectRooms, missionsByProject])

  // R7: compute "happening now" section — agents with recent activity + active tasks
  const happeningNow = useMemo(() => {
    if (!cv6) return null
    try {
      const events = []
      // Agent activity: those with messages in the last 5 minutes
      const now = Date.now()
      const fiveMinAgo = now - 5 * 60000
      if (Array.isArray(visibleAgents)) {
        visibleAgents.forEach(a => {
          if (!a || !a.slug) return
          const lastMsgTs = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          if (lastMsgTs > fiveMinAgo) {
            events.push({
              type: 'agent_activity',
              agent: a,
              timestamp: lastMsgTs,
              label: `${a.name || a.slug} active`,
              detail: relativeTime(a.last_message_at),
            })
          }
        })
      }
      // Active missions (running tasks)
      if (Array.isArray(allMissionsForCV6)) {
        allMissionsForCV6.forEach(m => {
          if (m?.mission?.status === 'running') {
            events.push({
              type: 'mission_running',
              mission: m.mission,
              project: m.project,
              timestamp: m.mission.last_message_at ? new Date(m.mission.last_message_at).getTime() : 0,
              label: `${m.mission.name || m.mission.slug} in progress`,
              detail: `in ${m.project.name || m.project.slug}`,
            })
          }
        })
      }
      return events.length > 0 ? events.sort((a, b) => b.timestamp - a.timestamp) : null
    } catch (_) {
      return null
    }
  }, [cv6, visibleAgents, allMissionsForCV6])

  // R7: keyboard navigation state for CV6 (defined after all dependencies are ready)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const replyInputRef = useRef(null)
  // R22: per-instance ref for the Home region so keyboard nav wires to THIS instance
  // (the gallery renders Home twice; document.querySelector grabbed only the first).
  const homeRef = useRef(null)

  // R19: Conversation column state + quick-view wiring
  const [selectedRoom, setSelectedRoom] = useState(null) // { project, mission } or null
  const [chatInitialRoom, setChatInitialRoom] = useState(null) // R55: room to preselect when the Chat tool opens via keyboard jump
  const [replyText, setReplyText] = useState('')

  // R55 (Patrik): keyboard speed move — from the quick-reply input, when it is EMPTY and the
  // user presses Right, jump straight into the full Chat tool with this room preselected.
  // Desktop + iPad only (>=768px); on a phone Right just moves the cursor as normal.
  const openChatToolForRoom = useCallback((room) => {
    if (!room) return
    if (typeof window !== 'undefined' && window.innerWidth < 768) return
    let initial = null
    if (room.agent) initial = { kind: 'agent', slug: room.agent.slug, name: room.agent.name || room.agent.slug }
    else if (room.project) initial = { kind: 'project', slug: room.project.slug, name: room.project.name || room.project.slug }
    if (!initial) return
    setChatInitialRoom(initial)
    setSelectedTool('chat')
  }, [])
  const [conversationMessages, setConversationMessages] = useState([])

  // Quick-reply from the home conversation preview. Routes a REAL send through
  // onChatSend (agent/project routing + Gemini lane on /cvg); the reply streams
  // back via the preview's realtime subscription. On the no-backend gallery
  // (no onChatSend) it stays optimistic so the demo still responds.
  const sendQuickReply = useCallback((text) => {
    const t = (text || '').trim()
    if (!t || !selectedRoom) return
    const sel = selectedRoom.agent
      ? { type: 'agent', slug: selectedRoom.agent.slug, name: selectedRoom.agent.name || selectedRoom.agent.slug }
      : { type: 'project', slug: selectedRoom.project.slug, name: selectedRoom.project.name || selectedRoom.project.slug, missionSlug: selectedRoom.mission?.slug }
    if (onChatSend) {
      onChatSend(sel, t)
    } else {
      setConversationMessages(prev => [{ id: `temp-${Date.now()}`, sender: 'user', text: t }, ...prev])
    }
  }, [selectedRoom, onChatSend])

  // R23: Active Work search filtering
  const [activeworkSearchText, setActiveworkSearchText] = useState('')

  // Sample conversation thread for CV6 gallery demo
  const sampleConversation = [
    { id: 1, sender: 'user', text: 'Can we schedule the design review for next Tuesday?' },
    { id: 2, sender: 'agent', text: 'I\'ve checked your calendar. Tuesday 2-3 PM works and I\'ve blocked it. The team is invited.' },
    { id: 3, sender: 'user', text: 'Great. Make sure we review the CV6 specs before the meeting.' },
    { id: 4, sender: 'agent', text: 'Done. I\'ve sent the CV6 design spec to the team. They have it now.' },
    { id: 5, sender: 'user', text: 'Perfect. What else needs attention this week?' },
    { id: 6, sender: 'agent', text: 'The Corner refactor is on schedule. One code review pending on Bobby\'s PR. I\'ll chase it today.' },
  ]

  // Quick-chat conversation preview — load the SELECTED room's REAL messages.
  // Patrik: "rooms don't change data, all the chats are the same / not wired up."
  // Root cause was this effect hardcoding sampleConversation for every room.
  // Now we fetch the room's real Supabase thread (newest first, to match the
  // column-reverse render + quick-reply prepend). The sample is only a fallback
  // for the /cv6 gallery where there is no backend.
  useEffect(() => {
    if (!selectedRoom) { setConversationMessages([]); return }

    let active = true
    const toBubble = (m) => ({
      id: m.id,
      sender: (m.role === 'user' || m.agent === 'user' || m.sender === 'user') ? 'user' : 'agent',
      text: m.text || m.content || '',
    })

    const load = async () => {
      // No live backend (gallery): keep the sample demo thread.
      if (!supabase || !worldId) { setConversationMessages(sampleConversation); return }
      try {
        let rows = []
        if (selectedRoom.agent) {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('client_id', worldId)
            .eq('agent', selectedRoom.agent.slug)
            .or('project.is.null,project.eq.')
            .order('timestamp', { ascending: false })
            .limit(50)
          if (error) throw error
          rows = data || []
        } else if (selectedRoom.project) {
          const projSlug = selectedRoom.project.slug
          const sharedCid = `shared:${projSlug}`
          const clientIds = worldId === sharedCid ? [sharedCid] : [worldId, sharedCid]
          const missionSlug = selectedRoom.mission?.slug || null
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .in('client_id', clientIds)
            .or(`project.eq.${projSlug},agent.eq.project:${projSlug}`)
            .order('timestamp', { ascending: false })
            .limit(50)
          if (error) throw error
          rows = (data || []).filter((m) => {
            // Show messages tagged for this mission, or untagged room-level ones.
            const tag = (m && m.metadata && m.metadata.mission_slug) || ''
            if (!missionSlug) return true
            if (!tag) return true
            return tag === missionSlug || tag.endsWith(':' + missionSlug)
          })
        }
        if (!active) return
        // view-1: never render steer-control rows as conversation.
        setConversationMessages(rows.filter((m) => !(m && m.metadata && m.metadata.view_command)).map(toBubble))
      } catch (_) {
        // Backend unreachable → fall back to the sample so the panel isn't blank.
        if (active) setConversationMessages(sampleConversation)
      }
    }

    load()

    // Live: stream new messages into the preview so a reply appears without
    // re-selecting the room. Mirrors the full chat surface's subscription.
    let channel = null
    if (supabase && worldId) {
      const matches = (m) => {
        if (!m || m.client_id !== worldId) return false
        if (m.metadata && m.metadata.view_command) return false // view-1: steer rows are not chat
        if (selectedRoom.agent) return m.agent === selectedRoom.agent.slug && !m.project
        if (selectedRoom.project) {
          const projSlug = selectedRoom.project.slug
          const isRoom = m.project === projSlug || m.agent === `project:${projSlug}`
          if (!isRoom) return false
          const missionSlug = selectedRoom.mission?.slug || null
          const tag = (m.metadata && m.metadata.mission_slug) || ''
          if (!missionSlug || !tag) return true
          return tag === missionSlug || tag.endsWith(':' + missionSlug)
        }
        return false
      }
      channel = supabase
        .channel(`cv6-quickchat-${worldId}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` }, (payload) => {
          if (!active || !matches(payload.new)) return
          setConversationMessages((prev) => prev.some((x) => x.id === payload.new.id) ? prev : [toBubble(payload.new), ...prev])
        })
        .subscribe()
    }

    return () => {
      active = false
      if (channel) { try { supabase.removeChannel(channel) } catch (_) {} }
    }
  }, [selectedRoom, worldId])

  // view-1: agents steer the user's view. An agent posts a message carrying
  // metadata.view_command; the dashboard, if open for this world, navigates
  // there in real time. Reuses the messages realtime channel — no new infra.
  // Commands are scoped to this worldId (the filter), so one person's agent can
  // never move another workspace's screen. Stale commands (>45s old) are ignored
  // so a reconnect can't replay an old jump.
  const VIEW_TOOL_KEYS = useMemo(() => new Set(['home', 'chat', 'projects', 'files', 'review', 'support', 'tracker', 'command', 'scribe']), [])
  useEffect(() => {
    if (!supabase || !worldId || !cv6) return
    let active = true
    const handle = (m) => {
      if (!active || !m || m.client_id !== worldId) return
      const cmd = m.metadata && m.metadata.view_command
      if (!cmd || typeof cmd !== 'object') return
      const ts = m.timestamp ? new Date(m.timestamp).getTime() : Date.now()
      if (Date.now() - ts > 45000) return
      try {
        if (cmd.action === 'open_tool' && VIEW_TOOL_KEYS.has(cmd.tool)) {
          openTool(cmd.tool)
        } else if (cmd.action === 'open_room' && cmd.project) {
          const proj = (projectRooms || []).find((p) => p && p.slug === cmd.project)
          if (proj) {
            const mission = cmd.mission ? { slug: cmd.mission, name: cmd.mission } : null
            setSelectedRoom({ project: proj, mission })
            openTool('chat')
          }
        }
      } catch (_) { /* a bad command must never break the dashboard */ }
    }
    const channel = supabase
      .channel(`cv6-viewcmd-${worldId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` }, (payload) => handle(payload.new))
      .subscribe()
    return () => { active = false; try { supabase.removeChannel(channel) } catch (_) {} }
  }, [worldId, cv6, openTool, projectRooms, VIEW_TOOL_KEYS])

  // R19: Suggested replies based on context (placeholder)
  const suggestedReplies = [
    { text: 'Got it' },
    { text: 'On it' },
    { text: 'Updates?' },
  ]

  const selectableItems = useMemo(() => {
    if (!cv6) return []
    try {
      const items = []
      // R56 (Patrik keyboard model): the Tools row is selectable too, first (it sits at the top).
      // Tab/arrows cycle through these; Right/Enter opens the tool.
      const KB_TOOLS = [
        { key: 'home', label: 'Home' }, { key: 'chat', label: 'Chat' }, { key: 'projects', label: 'Projects' },
        { key: 'files', label: 'Files' }, { key: 'review', label: 'Review' }, { key: 'support', label: 'Support' },
        { key: 'tracker', label: 'Tracker' }, { key: 'command', label: 'Command' }, { key: 'scribe', label: 'Live Scribe' },
      ]
      KB_TOOLS.forEach((t) => items.push({ type: 'tool', item: t }))
      // R18: then Agents (top left), then cascades down
      if (Array.isArray(visibleAgents)) {
        visibleAgents.forEach((a) => {
          if (a?.slug) items.push({ type: 'agent', item: a })
        })
      }
      // Then Active Work (missions)
      if (Array.isArray(allMissionsForCV6)) {
        allMissionsForCV6.forEach((m) => {
          if (m?.mission) items.push({ type: 'mission', item: m.mission, project: m.project })
        })
      }
      // Then actionable stats
      if (Array.isArray(needsYou)) {
        needsYou.forEach((n) => {
          if (n?.key) items.push({ type: 'needsyou', item: n })
        })
      }
      // Projects last
      if (Array.isArray(recentProjects)) {
        recentProjects.forEach((p) => {
          if (p?.slug) items.push({ type: 'project', item: p })
        })
      }
      return items
    } catch (_) {
      return []
    }
  }, [cv6, needsYou, allMissionsForCV6, visibleAgents, recentProjects])

  const handleKeyDown = useCallback((e) => {
    if (!cv6 || selectableItems.length === 0) return
    if (selectedTool && selectedTool !== 'home') return // R56: when a tool is open, its own nav takes over
    // R56 (Patrik keyboard model): Tab + Down/Up move the selection across EVERYTHING
    // (tools, agents, missions, needs-you, projects). Enter behaves EXACTLY like Right:
    // both "activate" the selected thing — open a tool, or two-press a room (quick view → open).
    const activate = () => {
      if (selectedIndex < 0) {
        // R55 fix: Right/Enter from default home (no selection) opens CV6 Chat tool
        openTool('chat')
        return
      }
      if (selectedIndex >= selectableItems.length) return
      const sel = selectableItems[selectedIndex]
      if (sel.type === 'tool') {
        openTool(sel.item.key) // Right/Enter opens tools too
      } else if (sel.type === 'needsyou') {
        sel.item.onOpen && sel.item.onOpen()
      } else if (sel.type === 'mission') {
        // R88 (Patrik): first activate = quick view; second activate opens the
        // Chat TOOL (matching the double-click), not the old full-chat navigation.
        const inQuickView = selectedRoom && selectedRoom.mission && selectedRoom.mission.slug === sel.item.slug
        if (!inQuickView) { recordVisit(sel.project.slug, sel.item.slug); setSelectedRoom({ project: sel.project, mission: sel.item }) }
        else { openChatToolForRoom({ project: sel.project, mission: sel.item }) }
      } else if (sel.type === 'project') {
        const inQuickView = selectedRoom && !selectedRoom.mission && selectedRoom.project?.slug === sel.item.slug
        if (!inQuickView) { recordVisit(sel.item.slug, null); setSelectedRoom({ project: sel.item, mission: null }) }
        else { openChatToolForRoom({ project: sel.item, mission: null }) }
      } else if (sel.type === 'agent') {
        const inQuickView = selectedRoom && selectedRoom.agent && selectedRoom.agent.slug === sel.item.slug
        if (!inQuickView) { setSelectedRoom({ agent: sel.item, project: null, mission: null }) }
        else { openChatToolForRoom({ agent: sel.item }) }
      }
    }
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % selectableItems.length)
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      setSelectedIndex(prev => prev === -1 ? selectableItems.length - 1 : (prev - 1 + selectableItems.length) % selectableItems.length)
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault()
      activate()
    } else if (e.key === 'ArrowLeft') {
      // PUNCH-LIST #2: ArrowLeft back-to-home hook (room-side implementation pending)
      e.preventDefault()
    }
  }, [cv6, selectableItems, selectedIndex, onSelectAgent, selectedRoom, onSelectProject, openTool, selectedTool, openChatToolForRoom])

  useEffect(() => {
    if (!cv6) return
    const homeEl = homeRef.current
    if (!homeEl) return
    homeEl.addEventListener('keydown', handleKeyDown)
    homeEl.focus()
    return () => homeEl.removeEventListener('keydown', handleKeyDown)
  }, [cv6, handleKeyDown])

  // R31: Clicking a card moves the keyboard cursor to that card, so Up/Down
  // resume from where the user clicked instead of snapping back to Agents (top).
  const selectByItem = useCallback((type, slug) => {
    const idx = selectableItems.findIndex(s => s.type === type && s.item?.slug === slug)
    if (idx >= 0) setSelectedIndex(idx)
  }, [selectableItems])

  // R33: keep the keyboard-selected card in view as you arrow through a
  // scrolling column (agents / active work), so the highlight never leaves the frame.
  useEffect(() => {
    if (!cv6) return
    const el = homeRef.current?.querySelector('[data-cv6-sel="true"]')
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [cv6, selectedIndex])

  // R32: a card's "room color" — the same hue as its color dot. Used to tint the
  // selected highlight so it matches the room, with a readable fill for white text.
  const roomHue = (slug) => ((slug ? slug.charCodeAt(0) : 0) * 137) % 360
  const roomFill = (slug) => roomSolid(slug)   // selected background; bright hues darkened so white text reads
  const roomGlow = (slug) => `hsla(${roomHue(slug)}, 60%, 48%, 0.30)`
  const roomTint = (slug) => `hsla(${roomHue(slug)}, 60%, 48%, 0.10)`  // hover wash, text stays dark

  // R34: clean idea chips under the greeting. Real version reads the ledger for the
  // user's top 3 goals + 2 aspirational ("things they'd want but haven't named yet").
  // Here we seed from their most-active rooms so the chips are real + clickable; the
  // ledger-driven data + auto-send pipeline wire when chat/rooms are built.
  const suggestedIdeas = useMemo(() => {
    if (!cv6) return []
    const top = (recentProjects || []).slice(0, 3)
    const goals = top.map(p => ({
      kind: 'goal', project: p,
      label: `Move ${p.name || p.slug} forward`,
      prompt: `Let's make real progress on ${p.name || p.slug}. What's the single highest-value next step, and can you start it now?`,
    }))
    const sparks = [
      { kind: 'spark', project: top[0] || null, label: 'Cut a sizzle reel from recent wins', prompt: 'Pull our strongest recent moments and cut a short sizzle reel I can share.' },
      { kind: 'spark', project: top[0] || null, label: 'Line up 5 lookalike leads', prompt: 'Find 5 new leads that resemble our best customers and draft a first touch for each.' },
    ]
    return [...goals, ...sparks].slice(0, 5)
  }, [cv6, recentProjects])

  // R22: reclaim focus when the user clicks a neutral area inside Home, so arrow
  // keys keep responding after any interaction. Clicks on inputs/buttons keep
  // their own focus (so typing still works).
  const handleHomeMouseDown = useCallback((e) => {
    if (!cv6 || !homeRef.current) return
    const t = e.target
    if (t.closest('input, textarea, button, a, select, [contenteditable="true"]')) return
    homeRef.current.focus()
  }, [cv6])

  return (
    <div data-cv4-home data-cv6={cv6 ? 'true' : undefined} ref={homeRef} onMouseDown={cv6 ? handleHomeMouseDown : undefined} style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: cv6 ? 'var(--cv6-ground)' : 'transparent',
      color: cv6 ? 'var(--cv6-text-primary)' : 'var(--c-text, #E8EBEF)',
      fontFamily: cv6 ? 'inherit' : "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      outline: 'none',
    }} tabIndex={cv6 ? 0 : -1}>
      {/* cv4 home style block — gated OFF in cv6 mode. CV6 owns its home styles in
          cv6.css (ported 2026-06-17), so cv4's dark-ground colors never bleed in. */}
      {!cv6 && <style>{`
        @keyframes hm-breathe { 0%,100%{opacity:1}50%{opacity:.3} }
        @keyframes cv6-msg-float-in { 0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)} }
        @keyframes cv6-msg-fade-in { 0%{opacity:0}100%{opacity:1} }
        /* R32: slow gloss/shine sweep for the What-Needs-You cards */
        @keyframes hm-shine { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(320%)} }
        [data-cv4-home] .hm-needs-card { position:relative; overflow:hidden; }
        [data-cv4-home] .hm-needs-card::after { content:''; position:absolute; top:0; left:0; width:40%; height:100%; background:linear-gradient(100deg, transparent, rgba(255,255,255,0.10), transparent); transform:translateX(-120%); animation:hm-shine 5.5s ease-in-out infinite; pointer-events:none; }
        /* R32: smooth indeterminate progress bar (active work in motion) */
        @keyframes hm-progress-slide { 0%{left:-35%} 100%{left:100%} }
        [data-cv4-home] .hm-progress { position:relative; height:2px; border-radius:2px; overflow:hidden; background:rgba(127,127,127,0.18); }
        [data-cv4-home] .hm-progress::before { content:''; position:absolute; top:0; left:-35%; width:35%; height:100%; border-radius:2px; background:currentColor; animation:hm-progress-slide 1.8s ease-in-out infinite; }
        [data-cv4-home] .hm-shell { max-width:1040px; margin:0 auto; padding:72px 40px 100px; }
        [data-cv4-home] .hm-welcome { font-weight:800; font-size:clamp(40px,6vw,64px); line-height:1.02; letter-spacing:-.03em; margin:0 0 48px; -webkit-font-smoothing:antialiased; text-wrap:balance; }
        [data-cv4-home] .hm-welcome .hm-l1 { color:#E8EBEF; }
        [data-cv4-home] .hm-welcome .hm-l2 { color:#A7B5C8; margin-left:0.32em; }
        [data-cv4-home] .hm-search { position:relative; margin-bottom:52px; }
        [data-cv4-home] .hm-search input { width:100%; box-sizing:border-box; padding:16px 68px 16px 50px; background:transparent; border:1px solid #2D3A4A; border-radius:2px; color:#E8EBEF; font-family:inherit; font-size:16px; font-weight:400; outline:none; transition:border-color 120ms ease, background-color 120ms ease; }
        [data-cv4-home] .hm-search input::placeholder { color:#5A6F8C; font-weight:400; }
        [data-cv4-home] .hm-search input:focus { border-color:#A7B5C8; background:rgba(255,255,255,.015); }
        [data-cv4-home] .hm-search-icon { position:absolute; left:18px; top:50%; transform:translateY(-50%); width:18px; height:18px; color:#5A6F8C; pointer-events:none; }
        [data-cv4-home] .hm-search-hint { position:absolute; right:16px; top:50%; transform:translateY(-50%); font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; letter-spacing:.10em; color:#5A6F8C; text-transform:uppercase; pointer-events:none; }
        [data-cv4-home] .hm-section { margin-bottom:40px; }
        [data-cv4-home] .hm-section-header { display:flex; align-items:center; gap:8px; padding:0 0 12px; border-bottom:1px solid rgba(255,255,255,.055); margin-bottom:4px; cursor:pointer; user-select:none; }
        [data-cv4-home] .hm-section-header:hover .hm-section-label { color:#A7B5C8; }
        [data-cv4-home] .hm-section-header:hover .hm-section-chevron { color:#A7B5C8; }
        [data-cv4-home] .hm-section-label { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#5A6F8C; flex:1; transition:color 120ms ease; }
        [data-cv4-home] .hm-section-chevron { color:#5A6F8C; display:flex; align-items:center; transition:color 120ms ease; }
        [data-cv4-home] .hm-section-body { overflow:hidden; transition:opacity 200ms ease; }
        [data-cv4-home] .hm-section-body.collapsed { display:none; }
        [data-cv4-home] .hm-row { display:flex; align-items:center; gap:14px; padding:13px 0; cursor:pointer; text-decoration:none; color:#E8EBEF; border-bottom:1px solid rgba(255,255,255,.035); transition:background-color 120ms ease, padding-left 160ms ease; background:none; border-left:none; border-right:none; border-top:none; width:100%; font-family:inherit; text-align:left; }
        [data-cv4-home] .hm-row:hover { background:rgba(255,255,255,.018); padding-left:8px; }
        [data-cv4-home] .hm-row:last-of-type { border-bottom:none; }
        [data-cv4-home] .hm-agent-dot { width:7px; height:7px; border-radius:50%; background:#10B981; flex-shrink:0; animation:hm-breathe 2s ease-in-out infinite; }
        [data-cv4-home] .hm-agent-name { flex:1; font-size:16px; font-weight:500; letter-spacing:-.005em; color:#E8EBEF; }
        [data-cv4-home] .hm-agent-meta { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:500; letter-spacing:.04em; color:#5A6F8C; }
        [data-cv4-home] .hm-pin { width:22px; height:22px; border:none; background:transparent; padding:0; cursor:pointer; color:#5A6F8C; opacity:.28; transition:opacity 120ms ease, color 120ms ease; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        [data-cv4-home] .hm-row:hover .hm-pin { opacity:.7; }
        [data-cv4-home] .hm-pin.pinned { color:#10B981; opacity:1; }
        [data-cv4-home] .hm-pin:hover { color:#E8EBEF; }
        [data-cv4-home] .hm-pin.pinned:hover { color:#10B981; }
        [data-cv4-home] .hm-proj { border-bottom:1px solid rgba(255,255,255,.035); }
        [data-cv4-home] .hm-proj:last-of-type { border-bottom:none; }
        [data-cv4-home] .hm-proj-head { display:flex; align-items:center; gap:14px; padding:14px 0; }
        [data-cv4-home] .hm-proj-name { flex:1; font-family:'Hanken Grotesk',sans-serif; font-size:18px; font-weight:700; letter-spacing:-.005em; color:#E8EBEF; cursor:pointer; text-decoration:none; transition:color 120ms ease; background:none; border:none; padding:0; text-align:left; }
        [data-cv4-home] .hm-proj-name:hover { color:#10B981; }
        [data-cv4-home] .hm-icon-btn { width:30px; height:30px; border:none; background:transparent; padding:0; cursor:pointer; color:#5A6F8C; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:2px; transition:background-color 120ms ease, color 120ms ease; }
        [data-cv4-home] .hm-icon-btn:hover { background:rgba(255,255,255,0.05); color:#E8EBEF; }
        [data-cv4-home] .hm-icon-btn.chat:hover { color:#10B981; }
        [data-cv4-home] .hm-caret-svg { transition:transform 180ms ease; }
        [data-cv4-home] .hm-proj.expanded .hm-caret-svg { transform:rotate(180deg); }
        [data-cv4-home] .hm-missions { padding:0 0 14px 4px; border-left:1px solid rgba(255,255,255,.06); margin-left:4px; }
        [data-cv4-home] .hm-mission { display:flex; align-items:center; gap:12px; padding:9px 16px; cursor:pointer; text-decoration:none; color:#E8EBEF; transition:background-color 120ms ease, border-left-color 120ms ease; border-left:2px solid transparent; margin-left:-3px; background:none; border-right:none; border-top:none; border-bottom:none; width:calc(100% + 3px); font-family:inherit; text-align:left; }
        [data-cv4-home] .hm-mission:hover { background:rgba(255,255,255,.022); border-left-color:#10B981; }
        [data-cv4-home] .hm-mdot { width:6px; height:6px; border-radius:50%; flex-shrink:0; background:#2D3A4A; }
        [data-cv4-home] .hm-mdot.active { background:#10B981; animation:hm-breathe 2s ease-in-out infinite; }
        [data-cv4-home] .hm-mdot.queued { background:#F59E0B; }
        [data-cv4-home] .hm-mname { flex:1; font-size:14px; font-weight:500; color:#E8EBEF; letter-spacing:-.005em; }
        [data-cv4-home] .hm-mage { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.04em; color:#5A6F8C; }
        [data-cv4-home] .hm-needs { margin:-16px 0 44px; }
        [data-cv4-home] .hm-needs-row { display:flex; align-items:center; gap:14px; width:100%; padding:14px 16px; margin-bottom:8px; background:rgba(245,158,11,.05); border:1px solid rgba(245,158,11,.28); border-radius:3px; cursor:pointer; font-family:inherit; text-align:left; transition:background-color 120ms ease, border-color 120ms ease; }
        [data-cv4-home] .hm-needs-row:hover { background:rgba(245,158,11,.10); border-color:rgba(245,158,11,.5); }
        [data-cv4-home] .hm-needs-dot { width:7px; height:7px; border-radius:50%; background:#F59E0B; flex-shrink:0; animation:hm-breathe 2s ease-in-out infinite; }
        [data-cv4-home] .hm-needs-label { flex:1; font-size:15px; font-weight:600; letter-spacing:-.005em; color:#E8EBEF; }
        [data-cv4-home] .hm-needs-detail { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.06em; color:#F59E0B; }

        /* Light theme overrides (parent provides data-theme) */
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-welcome .hm-l1 { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-welcome .hm-l2 { color:rgba(42,38,32,0.55); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search input { border-color:rgba(0,0,0,0.16); color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search input::placeholder { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search-icon,
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search-hint { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-section-label { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-section-header { border-bottom-color:rgba(0,0,0,0.08); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-section-chevron { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-row { color:#2A2620; border-bottom-color:rgba(0,0,0,0.06); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-row:hover { background:rgba(0,0,0,0.025); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-agent-name { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-agent-meta { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-pin { color:rgba(42,38,32,0.55); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-pin.pinned { color:#0E8E63; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-pin:hover { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-proj { border-bottom-color:rgba(0,0,0,0.06); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-proj-name { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-proj-name:hover { color:#0E8E63; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-icon-btn { color:rgba(42,38,32,0.6); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-icon-btn:hover { background:rgba(0,0,0,0.04); color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-icon-btn.chat:hover { color:#0E8E63; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-missions { border-left-color:rgba(0,0,0,0.10); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mission { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mission:hover { background:rgba(0,0,0,0.03); border-left-color:#0E8E63; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mdot { background:rgba(0,0,0,0.18); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mdot.active { background:#0E8E63; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mdot.queued { background:#B6862C; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mname { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-mage { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-needs-row { background:rgba(182,134,44,.06); border-color:rgba(182,134,44,.32); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-needs-row:hover { background:rgba(182,134,44,.11); border-color:rgba(182,134,44,.55); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-needs-dot { background:#B6862C; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-needs-label { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-needs-detail { color:#B6862C; }
        /* R21: Mobile responsive — stack 3-column grid to single column on mobile (390px) */
        @media (max-width: 768px) {
          [data-cv4-home] .hm-three-column-grid { grid-template-columns: 1fr; }
          [data-cv4-home] .hm-shell { padding: 48px 20px 80px; }
        }
      `}</style>}

      {/* R7: CV6 layout — missions as primary, keyboard navigation, inline actions, happening now */}
      {cv6 ? (
        <div className="hm-shell" style={{ maxWidth: '100%' }}>
          {/* R12: Top nav bar — global icons — primary (left) + secondary (right) with divider, 24px icons, strong hover */}
          {cv6 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
              marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--cv6-divider)',
            }}>
              {/* Primary group (left): Search + Theme + Info.
                  R50 removed the Home icon (duplicated Tools→Home).
                  R53 removed Explorer (duplicated the projects/missions tree on the Home body)
                  and Files (duplicated the Files tool in the Tools row) — both were unlabeled
                  duplicate destinations. CV6 R71: readded Search, Theme, and Help/Info icons. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Search icon */}
                <button
                  title="Open search"
                  onClick={() => setShowSearch(true)}
                  style={{
                    width: '40px', height: '40px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer', color: 'var(--cv6-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease', padding: 0, fontWeight: 'bold',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>

                {/* Theme toggle */}
                <button
                  title="Toggle theme"
                  onClick={(e) => {
                    // R49: flip the cv6/shell container THIS button lives in (closest), so it works
                    // reliably even when several frames are on the page (gallery). Fall back to the doc shell.
                    const shell = e.currentTarget.closest('[data-cv6]') || e.currentTarget.closest('[data-shell="cv4"]') || document.querySelector('[data-shell="cv4"]')
                    const isDark = shell?.getAttribute('data-theme') === 'dark'
                    shell?.setAttribute('data-theme', isDark ? 'light' : 'dark')
                  }}
                  style={{
                    width: '40px', height: '40px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer', color: 'var(--cv6-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease', padding: 0, fontWeight: 'bold',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </button>
                {/* R88: Help/documentation icon removed (Patrik 2026-06-17) — not used. */}
              </div>

              {/* Divider */}
              <div style={{ flex: 1 }}></div>

              {/* Secondary group (right): date/time + Notifications + Avatar — R32: Support icon removed (Support lives in the Tools row); CV6 R71: readded Notifications icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* R35: live date + time, greeting font; click to change timezone */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTzPicker(v => !v)}
                    title="Change timezone"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px',
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px',
                      borderRadius: '6px', fontFamily: 'inherit', transition: 'background 120ms ease', lineHeight: 1.1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--cv6-text-primary)' }}>{fmtTime(now, timezone)}</span>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--cv6-text-secondary)' }}>{fmtDate(now, timezone)}</span>
                  </button>
                  {showTzPicker && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 20,
                      background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: '6px', minWidth: '150px',
                    }}>
                      {TZ_OPTIONS.map(tz => (
                        <button
                          key={tz.zone}
                          onClick={() => { setTimezone(tz.zone); setShowTzPicker(false) }}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%',
                            padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: '13px', textAlign: 'left',
                            background: timezone === tz.zone ? 'var(--cv6-surface-hover)' : 'transparent',
                            color: timezone === tz.zone ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-primary)',
                            fontWeight: timezone === tz.zone ? '600' : '500',
                          }}
                          onMouseEnter={(e) => { if (timezone !== tz.zone) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                          onMouseLeave={(e) => { if (timezone !== tz.zone) e.currentTarget.style.background = 'transparent' }}
                        >
                          <span>{tz.label}</span>
                          <span style={{ fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>{fmtTime(now, tz.zone)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Notifications bell icon */}
                <button
                  title="Notifications"
                  onClick={() => window.location.href = '/dashboard?view=notifications'}
                  style={{
                    width: '40px', height: '40px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer', color: 'var(--cv6-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease', padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </button>
                {/* Avatar */}
                <button
                  title="User settings"
                  onClick={() => window.location.href = '/dashboard?view=settings'}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--cv6-divider)',
                    background: 'var(--cv6-surface)', cursor: 'pointer', color: 'var(--cv6-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease', padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'; e.currentTarget.style.color = 'var(--cv6-accent-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cv6-divider)'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* R48: greeting + search hide entirely when a tool/room is open (cv6) */}
          {(!cv6 || selectedTool === 'home') && (cv6 && showSearch ? (
            /* R37: search mode — greeting becomes a big "Search" field in the greeting font, icon + underline */
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '-20px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--cv6-text-primary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 'clamp(28px,4vw,44px)', height: 'clamp(28px,4vw,44px)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="hm-welcome"
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchText('') } }}
                placeholder="Search"
                autoComplete="off"
                autoFocus
                style={{ flex: 1, minWidth: 0, margin: 0, border: 'none', outline: 'none', background: 'transparent', padding: 0, color: 'var(--cv6-text-primary)' }}
              />
              <button
                onClick={() => { setShowSearch(false); setSearchText('') }}
                title="Close search"
                style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 120ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-secondary)' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: cv6 ? '-6px' : 0, marginBottom: cv6 ? '10px' : '32px' }}>
            <h1 className="hm-welcome" style={{ margin: 0, lineHeight: 1 }}>
              <span className="hm-l1">{greeting}</span>{' '}
              <span className="hm-l2" style={{ textTransform: 'capitalize' }}>{displayName(user) || 'there'}.</span>
            </h1>
            {/* R14: Search icon button (collapse to icon only) — same row as greeting */}
            <button
              onClick={() => setShowSearch(true)}
              style={{
                width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 120ms ease', fontFamily: 'inherit', flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--cv6-surface)'
                e.currentTarget.style.borderColor = 'var(--cv6-divider)'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
          ))}


          {/* R11: PUNCH-LIST #6 — HAPPENING NOW (density + alive, 6-item grid, breathing room) */}
          {happeningNow && happeningNow.length > 0 && (
            <div className="hm-happening-now" style={{ marginBottom: '48px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '18px', paddingBottom: '14px', borderBottom: '2px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>What's happening now</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {happeningNow.slice(0, 6).map((evt, idx) => (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px',
                    background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)',
                    borderRadius: '8px', fontSize: '13px', color: 'var(--cv6-text-primary)',
                    transition: 'all 120ms ease', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                    e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,102,255,0.12)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--cv6-surface)'
                    e.currentTarget.style.borderColor = 'var(--cv6-divider)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'hm-breathe 2s ease-in-out infinite', flexShrink: 0 }}></span>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{evt.label}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)', marginLeft: '14px' }}>{evt.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* R37: GLOBAL SEARCH RESULTS — category headings spread across 3 columns (stack on mobile) */}
          {cv6 && showSearch && (() => {
            const q = searchText.trim().toLowerCase()
            const match = (s) => !q || (s || '').toLowerCase().includes(q)
            const toolList = [
              { label: 'Home', key: 'home' }, { label: 'Projects', key: 'projects' }, { label: 'Files', key: 'files' },
              { label: 'Review', key: 'review' }, { label: 'Support', key: 'support' }, { label: 'Tracker', key: 'tracker' },
              { label: 'Command', key: 'command' }, { label: 'Live Scribe', key: 'scribe' },
            ].filter(t => match(t.label))
            const projectHits = [...(recentProjects || []), ...(allProjects || [])].filter(p => match(p.name || p.slug)).slice(0, 8)
            const missionHits = (allMissionsForCV6 || []).filter(m => match(m.mission?.name || m.mission?.slug)).slice(0, 8)
            const groups = [
              { key: 'tools', title: 'Tools', rows: toolList.map(t => ({ label: t.label, onClick: () => { setShowSearch(false); setSearchText(''); setSelectedTool(t.key) } })) },
              { key: 'projects', title: 'Projects', rows: projectHits.map(p => ({ label: p.name || p.slug, onClick: () => { setShowSearch(false); setSearchText(''); selectByItem('project', p.slug); handleProjectSelect(p, null) } })) },
              { key: 'missions', title: 'Missions', rows: missionHits.map(m => ({ label: m.mission.name || m.mission.slug, sub: m.project?.name || m.project?.slug, onClick: () => { setShowSearch(false); setSearchText(''); selectByItem('mission', m.mission.slug); handleProjectSelect(m.project, m.mission) } })) },
              { key: 'files', title: 'Files', rows: [] },
              { key: 'review', title: 'Review', rows: [] },
              { key: 'tracker', title: 'Tracker', rows: [] },
              { key: 'support', title: 'Support', rows: [] },
            ]
            return (
              <div className="hm-three-column-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px 28px', marginBottom: '32px', alignItems: 'start' }}>
                {groups.map(g => (
                  <div key={g.key} style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>{g.title}</div>
                    {g.rows.length === 0 ? (
                      <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', padding: '4px 0' }}>{q ? 'No matches' : 'Nothing yet'}</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {g.rows.map((r, i) => (
                          <button
                            key={i}
                            onClick={r.onClick}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 120ms ease' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cv6-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{r.label}</span>
                            {r.sub && <span style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)' }}>in {r.sub}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* R37: home body (tools, columns, what-needs-you, ideas) hides while searching */}
          {!showSearch && (<>
          {/* R23: Tools row — ABOVE three columns with heading + square icon tiles + labels */}
          <div className="hm-tools-block" style={{ marginTop: '-4px', marginBottom: '8px' }}>
            <div className="hm-tools-heading" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Tools</div>
            <div className="hm-tools-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', rowGap: '12px' }}>
              {/* R48: Home pinned first, then tools in recency order (most-recently-used next to Home), then the rest in default order. Mobile: one scrollable row (cv6.css .hm-tools-row). */}
              {(() => {
                const TOOLS = [
                  { key: 'home', label: 'Home', svg: (<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>) },
                  { key: 'chat', label: 'Chat', svg: (<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></>) },
                  { key: 'projects', label: 'Projects', svg: (<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>) },
                  { key: 'files', label: 'Files', svg: (<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>) },
                  { key: 'review', label: 'Review', svg: (<><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></>) },
                  { key: 'support', label: 'Support', svg: (<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>) },
                  { key: 'tracker', label: 'Tracker', svg: (<><rect x="9" y="8" width="6" height="9" rx="3"/><path d="M9 12h6"/><path d="M10 6l-1-2M14 6l1-2"/><path d="M4 9l3 2M20 9l-3 2M4 16l3-2M20 16l-3-2"/></>) },
                  { key: 'command', label: 'Command', svg: (<><polyline points="4 9 7 9 7 20 4 20"/><polyline points="12 9 15 9 15 20 12 20"/><polyline points="20 9 23 9 23 20 20 20"/></>) },
                  { key: 'scribe', label: 'Live Scribe', svg: (<><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></>) },
                ]
                // R50: LOCKED order — a nav that reshuffles kills spatial memory (Patrik).
                // Active tool is shown by color/weight in a FIXED position, never moved.
                return TOOLS
              })().map(t => (
                <button
                  key={t.key}
                  onClick={() => openTool(t.key)}
                  title={t.label}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px 16px', borderRadius: '6px', border: selectedTool === t.key ? '2px solid var(--cv6-accent-primary)' : '1px solid var(--cv6-divider)',
                    // R56: ring the tool the keyboard cursor is on (Tab/arrows), distinct from the open tool
                    boxShadow: (selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'tool' && selectableItems[selectedIndex]?.item?.key === t.key) ? '0 0 0 2px var(--cv6-accent-primary)' : 'none',
                    background: selectedTool === t.key ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                    color: selectedTool === t.key ? '#ffffff' : 'var(--cv6-text-primary)',
                    cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontWeight: '500',
                    minWidth: '64px', minHeight: '56px',
                  }}
                  onMouseEnter={(e) => { if (selectedTool !== t.key) { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)' } }}
                  onMouseLeave={(e) => { if (selectedTool !== t.key) { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.borderColor = 'var(--cv6-divider)' } }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                    {t.svg}
                  </svg>
                  <span style={{ fontSize: '10px', fontWeight: '500', textAlign: 'center', whiteSpace: 'nowrap' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* R23: Full-screen tool app container — rolls in above the 3-column band, above What Needs You */}
          {/* R48: key on selectedTool so the roll-in replays every time a DIFFERENT tool opens (not just the first) */}
          {selectedTool && selectedTool !== 'home' && (
            <div key={selectedTool} style={{
              animation: 'cv6-tool-roll-in 300ms ease-out',
              marginBottom: '24px', borderRadius: '8px', border: 'none',
              background: 'transparent', overflow: 'hidden', minHeight: '72vh',
            }}>
              {/* Tool header with close control */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid var(--cv6-divider)',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)', textTransform: 'capitalize' }}>
                  {selectedTool === 'support' && 'Support'}
                  {selectedTool === 'command' && 'Command Center'}
                  {selectedTool === 'scribe' && 'Live Scribe'}
                  {selectedTool === 'review' && 'Review'}
                  {selectedTool === 'tracker' && 'Tracker'}
                  {selectedTool === 'projects' && 'Projects'}
                  {selectedTool === 'files' && 'Files'}
                  {selectedTool === 'chat' && 'Chat'}
                </div>
                <button
                  onClick={() => setSelectedTool('home')}
                  title="Close"
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px', border: 'none',
                    background: 'transparent', color: 'var(--cv6-text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                    e.currentTarget.style.color = 'var(--cv6-text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--cv6-text-secondary)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Tool content */}
              <div style={{ padding: '16px 20px', minHeight: '64vh', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {selectedTool === 'support' && (
                  <SupportToolOverlay worldId={worldId || 'aom'} />
                )}

                {selectedTool === 'command' && (
                  commandDeckSlot || (
                    <CommandDeckOverlay
                      projects={[...(recentProjects || []), ...(allProjects || [])]}
                      agents={visibleAgents}
                    />
                  )
                )}

                {selectedTool === 'scribe' && (
                  <LiveScribe embedded />
                )}

                {selectedTool === 'projects' && (
                  <ProjectsToolOverlay
                    projects={[...(recentProjects || []), ...(allProjects || [])]}
                    missionsByProject={missionsByProject}
                    onOpen={handleProjectSelect}
                    onCreateProject={persistCreateProject}
                    onCreateMission={persistCreateMission}
                    onMoveFile={persistMoveFile}
                  />
                )}

                {selectedTool === 'review' && (
                  <ReviewToolOverlay
                    projects={[...(recentProjects || []), ...(allProjects || [])]}
                    missionsByProject={missionsByProject}
                    worldId={worldId}
                    onReplyToRoom={onReplyToRoom}
                  />
                )}

                {selectedTool === 'tracker' && (
                  <TrackerToolOverlay
                    projects={[...(recentProjects || []), ...(allProjects || [])]}
                    missionsByProject={missionsByProject}
                  />
                )}

                {selectedTool === 'files' && (
                  <FilesToolOverlay projects={[...(recentProjects || []), ...(allProjects || [])]} />
                )}

                {selectedTool === 'chat' && (
                  <ChatToolOverlay
                    projects={[...(recentProjects || []), ...(allProjects || [])]}
                    missionsByProject={missionsByProject}
                    agents={visibleAgents}
                    initialRoom={chatInitialRoom}
                    onCreateProject={persistCreateProject}
                    onCreateMission={persistCreateMission}
                    onSend={onChatSend}
                  />
                )}
              </div>
            </div>
          )}

          {/* R39: home body (columns, what-needs-you, ideas) hides while a tool is open — tools get the full screen */}
          {selectedTool === 'home' && (<>
          {/* R14: THREE-COLUMN LAYOUT — Collaborators (left) | Active Work (middle) | Conversation+Quick Reply (right) */}
          <div className="hm-three-column-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '24px', marginBottom: '18px', minHeight: '400px' }}>
            {/* R14: LEFT COLUMN — COLLABORATORS */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Agents</div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                {visibleAgents.map((a, idx) => {
                  const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.item?.slug === a.slug && selectableItems[selectedIndex]?.type === 'agent'
                  const agentStatus = a.slug === 'bobby' ? 'building components'
                    : a.slug === 'steffen' ? 'refining brand'
                    : a.slug === 'cleo' ? 'editing video'
                    : a.slug === 'tony' ? 'scheduling posts'
                    : a.slug === 'elon' ? 'routing work'
                    : 'Ready'
                  return (
                    <button
                      key={a.slug}
                      className="hm-card"
                      data-cv6-sel={isSelected ? 'true' : undefined}
                      onClick={() => {
                        if (cv6) {
                          // R31: match the mission card — click pulls the agent's
                          // conversation into the quick-view column AND moves the cursor here.
                          selectByItem('agent', a.slug)
                          setSelectedRoom({ agent: a, project: null, mission: null })
                          homeRef.current?.focus()
                        } else {
                          onSelectAgent && onSelectAgent(a)
                        }
                      }}
                      style={{
                        // R31/R32: single-row card, full width, room-color highlight when selected
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', marginBottom: '8px', minHeight: '56px',
                        boxSizing: 'border-box', width: '100%', position: 'relative', overflow: 'hidden',
                        background: isSelected ? roomFill(a.slug) : 'var(--cv6-surface)',
                        color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                        border: isSelected ? `1px solid ${roomFill(a.slug)}` : '1px solid transparent',
                        boxShadow: isSelected ? `0 3px 14px ${roomGlow(a.slug)}` : 'none',
                        transform: isSelected ? 'translateY(-1px)' : 'none',
                        borderRadius: '6px', cursor: 'pointer',
                        transition: 'box-shadow 220ms ease, border-color 160ms ease, transform 200ms ease',
                        fontFamily: 'inherit', textAlign: 'left', fontSize: '14px', fontWeight: '500',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = roomTint(a.slug)
                          e.currentTarget.style.borderColor = roomFill(a.slug)
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--cv6-surface)'
                          e.currentTarget.style.borderColor = 'transparent'
                        }
                      }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isSelected ? '#ffffff' : `hsl(${roomHue(a.slug)}, 60%, 55%)`, animation: 'hm-breathe 2s ease-in-out infinite', flexShrink: 0 }}></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || a.slug}</div>
                        <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--cv6-text-secondary)', marginTop: '2px', fontWeight: '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agentStatus}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--cv6-text-tertiary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{relativeTime(a.last_message_at)}</span>
                      {/* R32: smooth motion line on agents that are actively working */}
                      {agentStatus !== 'Ready' && (
                        <div className="hm-progress" style={{ position: 'absolute', left: '10px', right: '10px', bottom: '6px', color: isSelected ? 'rgba(255,255,255,0.85)' : `hsl(${roomHue(a.slug)}, 60%, 55%)` }} />
                      )}
                    </button>
                  )
                })}
              </div>

            </div>

            {/* R14: MIDDLE COLUMN — ACTIVE WORK with visible "+N more" affordance, clear scroll indicator */}
            {/* R30b: Combined missions AND projects list, ordered by recency */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Active work</div>
              {/* R23: Search input for Active Work filtering */}
              <input
                type="text"
                placeholder="Search missions & projects..."
                value={activeworkSearchText || ''}
                onChange={(e) => setActiveworkSearchText(e.target.value)}
                style={{
                  marginBottom: '12px', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--cv6-divider)',
                  background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontSize: '13px',
                  fontFamily: 'inherit', outline: 'none', transition: 'border-color 120ms ease',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--cv6-divider)'}
              />
              {allMissionsForCV6.length > 0 || (recentProjects && recentProjects.length > 0) ? (
                <>
                  {/* Scrollable container: shows 5 visible items with internal scroll */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    flex: 1, // Grow to fill column
                    overflow: 'hidden', overflowY: 'auto', paddingRight: '4px',
                    scrollBehavior: 'smooth',
                    // R20: grey container removed — cards fall clean against the page (Patrik 2026-06-16)
                    maxHeight: '328px', // R18: Cap at 5 visible items (56px each + 8px gaps + 16px padding)
                  }}>
                    {/* R30b: Combined missions + projects list, sorted by recency */}
                    {(() => {
                      // Build combined list: missions + projects
                      const combined = []
                      // Add missions
                      if (Array.isArray(allMissionsForCV6)) {
                        allMissionsForCV6.forEach(m => {
                          combined.push({ type: 'mission', mission: m.mission, project: m.project, timestamp: m.mission.last_message_at })
                        })
                      }
                      // Add projects
                      if (Array.isArray(recentProjects)) {
                        recentProjects.forEach(p => {
                          combined.push({ type: 'project', project: p, timestamp: p.last_message_at })
                        })
                      }
                      // Sort by recency (most recent first).
                      // R32: when searching, a project whose NAME matches floats above its missions.
                      const search = activeworkSearchText.trim().toLowerCase()
                      const nameMatchRank = (item) => {
                        if (!search) return 0
                        if (item.type === 'project') {
                          const pn = (item.project.name || item.project.slug).toLowerCase()
                          return pn.includes(search) ? -1 : 0  // matched project leads
                        }
                        return 0
                      }
                      combined.sort((a, b) => {
                        const r = nameMatchRank(a) - nameMatchRank(b)
                        if (r !== 0) return r
                        const aTime = new Date(a.timestamp || 0).getTime()
                        const bTime = new Date(b.timestamp || 0).getTime()
                        return bTime - aTime
                      })
                      // Filter by search text
                      return combined.filter(item => {
                        if (!activeworkSearchText.trim()) return true
                        const searchLower = activeworkSearchText.toLowerCase()
                        if (item.type === 'mission') {
                          const missionName = (item.mission.name || item.mission.slug).toLowerCase()
                          const projectName = (item.project.name || item.project.slug).toLowerCase()
                          return missionName.includes(searchLower) || projectName.includes(searchLower)
                        } else if (item.type === 'project') {
                          const projectName = (item.project.name || item.project.slug).toLowerCase()
                          return projectName.includes(searchLower)
                        }
                        return true
                      }).map((item, idx) => {
                        if (item.type === 'mission') {
                          const m = item
                          const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'mission' && selectableItems[selectedIndex]?.item?.slug === m.mission.slug
                          return (
                            <button
                              key={`mission-${m.mission.slug}`}
                              className="hm-card"
                              data-cv6-sel={isSelected ? 'true' : undefined}
                              onClick={() => {
                                // R88 (Patrik): single click opens the conversation + quick reply in the
                                // right column (matches the agent card). Double click opens the Chat tool.
                                selectByItem('mission', m.mission.slug) // cursor follows the click
                                setSelectedRoom({ project: m.project, mission: m.mission })
                                homeRef.current?.focus()
                              }}
                              onDoubleClick={() => openChatToolForRoom({ project: m.project, mission: m.mission })}
                              onContextMenu={(e) => { e.preventDefault(); selectByItem('mission', m.mission.slug); setCardMenu({ x: e.clientX, y: e.clientY, type: 'mission', item: m.mission, project: m.project }) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', marginBottom: '0',
                                boxSizing: 'border-box', width: '100%',
                                background: isSelected ? roomFill(m.project.slug) : 'var(--cv6-surface)',
                                color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                                border: isSelected ? `1px solid ${roomFill(m.project.slug)}` : '1px solid transparent',
                                boxShadow: isSelected ? `0 3px 14px ${roomGlow(m.project.slug)}` : 'none',
                                transform: isSelected ? 'translateY(-1px)' : 'none',
                                borderRadius: '6px', cursor: 'pointer',
                                transition: 'box-shadow 220ms ease, border-color 160ms ease, transform 200ms ease',
                                fontFamily: 'inherit', textAlign: 'left', fontSize: '14px', fontWeight: '500',
                                flex: '0 0 auto', minHeight: '56px',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = roomTint(m.project.slug)
                                  e.currentTarget.style.borderColor = roomFill(m.project.slug)
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'var(--cv6-surface)'
                                  e.currentTarget.style.borderColor = 'transparent'
                                }
                              }}
                            >
                              {/* R18: Per-item icon from stable set */}
                              <span style={{ color: isSelected ? '#ffffff' : (m.mission.status === 'running' ? '#10B981' : '#5A6F8C'), display: 'inline-flex', flexShrink: 0 }}>
                                {getMissionIcon(m.mission.slug).svg}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.mission.name || m.mission.slug}
                                  {/* R18: Subtle room color dot */}
                                  <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: isSelected ? 'rgba(255,255,255,0.5)' : `hsl(${(m.project.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`,
                                    flexShrink: 0,
                                  }}/>
                                </div>
                                <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--cv6-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>in {m.project.name || m.project.slug}</div>
                              </div>
                              <span style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--cv6-text-tertiary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{relativeTime(m.mission.last_message_at)}</span>
                            </button>
                          )
                        } else if (item.type === 'project') {
                          const p = item.project
                          const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'project' && selectableItems[selectedIndex]?.item?.slug === p.slug
                          return (
                            <button
                              key={`project-${p.slug}`}
                              className="hm-card"
                              data-cv6-sel={isSelected ? 'true' : undefined}
                              onClick={() => {
                                // R88 (Patrik): single click opens the conversation + quick reply in the
                                // right column. Double click opens the Chat tool.
                                selectByItem('project', p.slug) // cursor follows the click
                                setSelectedRoom({ project: p, mission: null })
                                homeRef.current?.focus()
                              }}
                              onDoubleClick={() => openChatToolForRoom({ project: p, mission: null })}
                              onContextMenu={(e) => { e.preventDefault(); selectByItem('project', p.slug); setCardMenu({ x: e.clientX, y: e.clientY, type: 'project', item: p, project: p }) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', marginBottom: '0',
                                boxSizing: 'border-box', width: '100%',
                                background: isSelected ? roomFill(p.slug) : 'var(--cv6-surface)',
                                color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                                border: isSelected ? `1px solid ${roomFill(p.slug)}` : '1px solid transparent',
                                boxShadow: isSelected ? `0 3px 14px ${roomGlow(p.slug)}` : 'none',
                                transform: isSelected ? 'translateY(-1px)' : 'none',
                                borderRadius: '6px', cursor: 'pointer',
                                transition: 'box-shadow 220ms ease, border-color 160ms ease, transform 200ms ease',
                                fontFamily: 'inherit', textAlign: 'left', fontSize: '14px', fontWeight: '500',
                                flex: '0 0 auto', minHeight: '56px',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = roomTint(p.slug)
                                  e.currentTarget.style.borderColor = roomFill(p.slug)
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'var(--cv6-surface)'
                                  e.currentTarget.style.borderColor = 'transparent'
                                }
                              }}
                            >
                              {/* Project folder icon */}
                              <span style={{ color: isSelected ? '#ffffff' : '#5A6F8C', display: 'inline-flex', flexShrink: 0 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                </svg>
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {p.name || p.slug}
                                  {/* R18: Subtle room color dot */}
                                  <span style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: isSelected ? 'rgba(255,255,255,0.5)' : `hsl(${(p.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`,
                                    flexShrink: 0,
                                  }}/>
                                </div>
                                <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--cv6-text-secondary)', marginTop: '2px' }}>Project</div>
                              </div>
                              <span style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--cv6-text-tertiary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{relativeTime(p.last_message_at)}</span>
                            </button>
                          )
                        }
                      })
                    })()}
                  </div>
                  {(allMissionsForCV6.length + (recentProjects?.length || 0) > 5) && (
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--cv6-accent-primary)', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--cv6-divider)', textAlign: 'center' }}>
                      ↓ +{(allMissionsForCV6.length + (recentProjects?.length || 0)) - 5} more (scroll within)
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)', padding: '16px', textAlign: 'center' }}>No active work</div>
              )}
            </div>

            {/* R19: RIGHT COLUMN — CONVERSATION + QUICK REPLY with full interactivity */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              {/* R19: Room identifier header with color tinting */}
              {/* R30b: Support agent rooms in addition to project/mission rooms */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '12px', paddingBottom: '12px',
                borderBottom: selectedRoom ? (selectedRoom.agent
                  ? `2px solid hsl(${(selectedRoom.agent.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`
                  : `2px solid hsl(${(selectedRoom.project.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`)
                  : '1px solid var(--cv6-divider)',
                color: 'var(--cv6-text-secondary)',
                transition: 'border-color 200ms ease',
              }}>
                {selectedRoom ? (
                  selectedRoom.agent ? (
                    // Agent room header
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: `hsl(${(selectedRoom.agent.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`,
                      }}/>
                      {selectedRoom.agent.name || selectedRoom.agent.slug}
                    </span>
                  ) : (
                    // Project/mission room header
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: `hsl(${(selectedRoom.project.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`,
                      }}/>
                      {selectedRoom.project.name || selectedRoom.project.slug} • {selectedRoom.mission?.name || 'Select a mission'}
                    </span>
                  )
                ) : (
                  'Conversation'
                )}

                {/* R31: room-scoped Files + Explorer — same glyphs as the top nav, but for THIS room.
                    Buttons are present + ready; the room-scoped menus get designed in a later phase. */}
                {selectedRoom && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button
                      title="This room's files"
                      onClick={() => onOpenDrawer?.('files')}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent',
                        color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 120ms ease', padding: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                      </svg>
                    </button>
                    <button
                      title="This room's explorer"
                      onClick={() => onOpenDrawer?.('explorer')}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'transparent',
                        color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 120ms ease', padding: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3H9a6 6 0 0 0-6 6v6a6 6 0 0 0 6 6h6a6 6 0 0 0 6-6V9a6 6 0 0 0-6-6z"/><path d="M9 10h2"/><path d="M9 14h2"/><path d="M13 10h2"/><path d="M13 14h2"/>
                      </svg>
                    </button>
                  </span>
                )}
              </div>

              {selectedRoom && conversationMessages.length > 0 ? (
                <>
                  {/* R19: Conversation thread — scrollable area with messages */}
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    maxHeight: '320px', // Fixed box — real threads scroll, they don't grow it (Patrik 2026-06-17)
                    overflowY: 'auto',
                    paddingRight: '4px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column-reverse', // R19: Messages flow upward (newest at bottom, user messages float to top)
                    gap: '12px',
                    // R20: grey container removed — conversation falls clean against the page (Patrik 2026-06-16)
                  }}>
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          animation: msg.sender === 'user' ? 'cv6-msg-float-in 300ms ease-out' : 'cv6-msg-fade-in 300ms ease-out',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            wordWrap: 'break-word',
                            // R19: Color-coded bubbles
                            background: msg.sender === 'user'
                              // R31: agent rooms have no .project — derive room color from agent slug to avoid a crash
                              ? roomSolid((selectedRoom.agent || selectedRoom.project).slug)  // Room color, darkened on bright hues so white text reads
                              : 'var(--cv6-surface)',  // Gray for agent messages
                            color: msg.sender === 'user' ? '#ffffff' : 'var(--cv6-text-primary)',
                          }}
                        >
                          {/* CV4 chat renderer: clean markdown, no raw dashes/asterisks */}
                          <ChatMessageRenderer content={msg.text} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* R24: Conversation input — divider line, then suggested replies, then input row (Patrik: chips below the grey line, above where you type) */}
                  <div style={{ borderTop: '1px solid var(--cv6-divider)', paddingTop: '12px' }}>
                    {/* Suggested replies — below the divider line, ABOVE the input row */}
                    {suggestedReplies.length > 0 && (
                      <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {suggestedReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setReplyText(reply.text)
                              replyInputRef.current?.focus()
                            }}
                            style={{
                              padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--cv6-divider)',
                              background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)',
                              fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
                              transition: 'all 120ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                              e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'
                              e.currentTarget.style.color = 'var(--cv6-accent-primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--cv6-surface)'
                              e.currentTarget.style.borderColor = 'var(--cv6-divider)'
                              e.currentTarget.style.color = 'var(--cv6-text-secondary)'
                            }}
                          >
                            {reply.text}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', height: '42px' }}>
                      {/* R30: Command button (left) — purple gradient + crystal-ball icon, height matches input */}
                      <button
                        onClick={() => console.log('Command menu (placeholder)')}
                        style={{
                          width: '42px', height: '100%', flexShrink: 0, borderRadius: '6px', border: 'none',
                          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', color: '#ffffff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 120ms ease', boxShadow: '0 2px 8px rgba(124,58,237,0.28)',
                          padding: 0, fontFamily: 'inherit',
                        }}
                        title="Command menu"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #6D28D9 0%, #9333EA 100%)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,0.42)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(124,58,237,0.28)'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9.5" r="6.5"/><path d="M6.5 19h11"/><path d="M9.5 19l1-3M14.5 19l-1-3"/><path d="M9.4 7.6a3 3 0 0 1 2.6-1.6"/></svg>
                      </button>

                      {/* Text input (flex) */}
                      <input
                        ref={replyInputRef}
                        type="text"
                        placeholder="Reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          // R55: empty input + Right arrow → jump into the full Chat tool (desktop/iPad). Huge speed move.
                          if (e.key === 'ArrowRight' && !replyText.trim()) {
                            e.preventDefault()
                            openChatToolForRoom(selectedRoom)
                            return
                          }
                          if (e.key === 'Enter' && replyText.trim()) {
                            sendQuickReply(replyText)
                            setReplyText('')
                          }
                        }}
                        style={{
                          flex: 1, height: '100%', boxSizing: 'border-box', padding: '0 14px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                          background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontSize: '14px',
                          fontFamily: 'inherit', outline: 'none', transition: 'border-color 120ms ease',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--cv6-divider)'}
                      />

                      {/* R32: Mic by default (voice), turns into Send once the user types */}
                      <button
                        onClick={() => {
                          if (replyText.trim()) {
                            sendQuickReply(replyText)
                            setReplyText('')
                          } else {
                            // Voice conversation entry point (placeholder until wired)
                            console.log('Voice message (placeholder)')
                          }
                        }}
                        style={{
                          width: '42px', height: '100%', flexShrink: 0, borderRadius: '6px', background: 'var(--cv6-accent-primary)', color: '#ffffff',
                          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 120ms ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                        title={replyText.trim() ? 'Send' : 'Voice message'}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = 'brightness(0.92)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,102,255,0.3)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = 'none'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {replyText.trim() ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cv6-text-secondary)', fontSize: '14px' }}>
                  Select a mission to view conversation
                </div>
              )}
            </div>
          </div>


          {/* R14: WHAT NEEDS YOU — moved below the 3-column layout */}
          {(needsYou && needsYou.length > 0) && (
            <div className="hm-section" style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>What needs you</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {needsYou.map((n, idx) => {
                  const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'needsyou' && selectableItems[selectedIndex]?.item?.key === n.key
                  const roomColorHash = n.roomSlug ? `hsl(${(n.roomSlug.charCodeAt(0) * 137) % 360}, 70%, 60%)` : 'var(--cv6-accent-warn)'
                  return (
                  <button
                    key={n.key}
                    className="hm-needs-card"
                    data-cv6-sel={isSelected ? 'true' : undefined}
                    onClick={() => n.onOpen && n.onOpen()}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px',
                      background: isSelected ? roomColorHash : 'var(--cv6-surface)',
                      color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                      border: isSelected ? `2px solid ${roomColorHash}` : '1px solid var(--cv6-divider)',
                      borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 220ms ease, border-color 160ms ease, transform 200ms ease',
                      textAlign: 'left', fontFamily: 'inherit', fontWeight: '500',
                      boxShadow: isSelected ? `0 3px 14px ${n.roomSlug ? `hsla(${(n.roomSlug.charCodeAt(0) * 137) % 360}, 70%, 50%, 0.30)` : 'rgba(245,158,11,0.25)'}` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--cv6-surface)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                        <span style={{
                          flexShrink: 0, width: '46px', height: '46px', borderRadius: '10px',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: isSelected ? 'rgba(255,255,255,0.18)' : (n.roomSlug ? `hsla(${(n.roomSlug.charCodeAt(0) * 137) % 360}, 70%, 55%, 0.14)` : 'rgba(245,158,11,0.14)'),
                          color: isSelected ? '#ffffff' : roomColorHash,
                        }}>{getNeedsTypeIcon(n)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{n.label}</div>
                          <div style={{ fontSize: '12px', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--cv6-text-secondary)', marginTop: '4px' }}>{n.detail}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '16px', color: isSelected ? '#ffffff' : 'var(--cv6-accent-warn)', flexShrink: 0 }}>→</span>
                    </div>
                  </button>
                )
                })}
              </div>
            </div>
          )}

          {/* R36: Ideas moved to the bottom, below What Needs You — tap one to jump into the room and kick it off */}
          {cv6 && suggestedIdeas.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.6c.6.5 1 1.3 1 2.1v.3h6v-.3c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>
                </svg>
                Ideas
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {suggestedIdeas.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (idea.project) handleProjectSelect(idea.project, null)
                      // Real surface: also auto-sends idea.prompt to that room to kick it off.
                      console.log('[idea]', idea.label, '→', idea.prompt)
                      homeRef.current?.focus()
                    }}
                    title={idea.prompt}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '8px 14px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)',
                      background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)',
                      transition: 'all 140ms ease', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,102,255,0.10)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cv6-divider)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={idea.kind === 'spark' ? '#A855F7' : 'var(--cv6-accent-primary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M12 3l1.8 4.6L18.5 9.4 13.8 11.2 12 16 10.2 11.2 5.5 9.4 10.2 7.6z"/>
                    </svg>
                    {idea.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          </>)}

          {/* R39: close home-body fragment */}
          </>)}

          {/* R37: right-click menu for active-work cards — mirrors the left-menu; each action advances into the project screen */}
          {cardMenu && (() => {
            const isM = cardMenu.type === 'mission'
            const opts = [
              { key: 'brief-me', label: 'Brief me' },
              ...(isM ? [{ key: 'whats-next', label: "What's next" }] : []),
              { key: 'rename', label: 'Rename' },
              { key: 'create-subfolder', label: 'Create subfolder…' },
              { key: 'move-to-folder', label: 'Move to subfolder…' },
              ...(isM ? [{ key: 'embed', label: 'Embed this room' }] : []),
              { key: 'delete', label: 'Delete', danger: true },
            ]
            const advance = (key) => {
              // Forward-advance: open the room (the move happens on the project screen + is shown there)
              console.log('[card-action]', key, cardMenu.type, cardMenu.item.slug)
              handleProjectSelect(cardMenu.project, isM ? cardMenu.item : null)
              setCardMenu(null)
            }
            return (
              <>
                <div onClick={() => setCardMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCardMenu(null) }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'fixed', top: Math.min(cardMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 320), left: Math.min(cardMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 220), zIndex: 41, minWidth: '204px', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', padding: '6px', fontFamily: 'inherit' }}>
                  {opts.map((o, i) => (
                    <Fragment key={o.key}>
                      {o.danger && <div style={{ height: '1px', background: 'var(--cv6-divider)', margin: '6px 4px' }} />}
                      <button
                        onClick={() => advance(o.key)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', color: o.danger ? '#E5484D' : 'var(--cv6-text-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = o.danger ? 'rgba(229,72,77,0.10)' : 'var(--cv6-surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      ) : (
        /* CV4 layout — keep as-is for backward compatibility */
        <div className="hm-shell">
          {/* Welcome */}
          <h1 className="hm-welcome">
            <span className="hm-l1">{greeting}</span>{' '}
            <span className="hm-l2">{displayName(user)}.</span>
          </h1>

          {/* Needs you — the real story, before the search box. Renders only when
              something is actually waiting; a quiet day stays quiet. */}
          {needsYou.length > 0 && (
            <div className="hm-needs">
              {needsYou.map(n => (
                <button key={n.key} className="hm-needs-row" onClick={() => n.onOpen && n.onOpen()}>
                  <span className="hm-needs-dot"></span>
                  <span className="hm-needs-label">{n.label}</span>
                  <span className="hm-needs-detail">{n.detail} →</span>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="hm-search">
            <svg className="hm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && onOpenSearch) onOpenSearch(searchText) }}
              placeholder="messages, tasks, agents"
              autoComplete="off"
            />
            <span className="hm-search-hint">⌘K</span>
          </div>

        {/* Recent Projects */}
        <div className="hm-section">
          <div
            className="hm-section-header"
            onClick={() => toggleSection('recents')}
            role="button"
            aria-expanded={!collapsedSections.recents}
            aria-label="Toggle recents section"
          >
            <span className="hm-section-label">Where you left off</span>
            <span className="hm-section-chevron">
              <Chevron collapsed={collapsedSections.recents} />
            </span>
          </div>
          <div className={'hm-section-body' + (collapsedSections.recents ? ' collapsed' : '')}>
            {recentProjects.length === 0 && (
              <div style={{ padding: '14px 0', color: '#5A6F8C', fontSize: 14, fontStyle: 'italic' }}>No projects yet.</div>
            )}
            {recentProjects.map(p => {
              const isPinned = pinnedProjects.includes(p.slug)
              const isExpanded = !!expandedProjects[p.slug]
              // Re-sort missions at render time so recently-visited missions float to top.
              const missions = [...(missionsByProject[p.slug] || [])].sort((a, b) =>
                missionEffectiveTs(p.slug, b) - missionEffectiveTs(p.slug, a)
              )
              return (
                <div key={p.slug} className={'hm-proj' + (isExpanded ? ' expanded' : '')}>
                  <div className="hm-proj-head">
                    <span style={{ color: '#5A6F8C', display: 'inline-flex', flexShrink: 0 }}>
                      <FolderIcon open={isExpanded} />
                    </span>
                    <button
                      className="hm-proj-name"
                      onClick={() => handleProjectSelect(p, null)}
                    >{p.name || p.slug}</button>
                    {missions.some(m => m.status === 'running') && <StatusDot state="running" size={6} title="An agent is working in here" />}
                    <span className="hm-agent-meta">{(() => {
                      const ts = Math.max(
                        recentVisits[p.slug] || 0,
                        p.last_message_at ? new Date(p.last_message_at).getTime() : 0,
                        ...missions.map(m => m.last_message_at ? new Date(m.last_message_at).getTime() : 0),
                      )
                      return ts > 0 ? relativeTime(new Date(ts).toISOString()) : ''
                    })()}</span>
                    <button
                      className="hm-icon-btn chat"
                      onClick={() => handleProjectSelect(p, null)}
                      title={'Open ' + (p.name || p.slug) + ' chat'}
                      aria-label={'Open ' + (p.name || p.slug) + ' chat'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M4 3 H20 A2 2 0 0 1 22 5 V15 A2 2 0 0 1 20 17 H8 L3 22 V5 A2 2 0 0 1 4 3 Z"/>
                      </svg>
                    </button>
                    <button
                      className="hm-icon-btn"
                      onClick={() => toggleExpand(p.slug)}
                      title="Toggle missions"
                      aria-label={'Toggle ' + (p.name || p.slug) + ' missions'}
                    >
                      <svg className="hm-caret-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    <button
                      className={'hm-pin' + (isPinned ? ' pinned' : '')}
                      onClick={() => toggleProjectPin(p.slug)}
                      title={isPinned ? 'Unpin' : 'Pin'}
                      aria-label={(isPinned ? 'Unpin ' : 'Pin ') + (p.name || p.slug)}
                    >
                      {isPinned ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4v6l3 4v2h-6v6l-1 1-1-1v-6H5v-2l3-4V4h-1V2h10v2h-1z"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4v6l3 4v2h-6v6l-1 1-1-1v-6H5v-2l3-4V4h-1V2h10v2h-1z"/></svg>
                      )}
                    </button>
                  </div>
                  {isExpanded && missions.length > 0 && (
                    <div className="hm-missions">
                      {missions.map(m => (
                        <button
                          key={m.slug}
                          className="hm-mission"
                          onClick={() => handleProjectSelect(p, m)}
                        >
                          <span style={{ color: '#5A6F8C', display: 'inline-flex', flexShrink: 0 }}><MissionIcon /></span>
                          <StatusDot state={m.status === 'running' || m.status === 'active' ? 'running' : 'idle'} size={6} />
                          <span className="hm-mname">{m.name || m.slug}</span>
                          <span className="hm-mage">{relativeTime(m.last_message_at)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {isExpanded && missions.length === 0 && (
                    <div className="hm-missions">
                      <div style={{ padding: '9px 16px', color: '#5A6F8C', fontSize: 13, fontStyle: 'italic' }}>No missions yet.</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Agents */}
        <div className="hm-section">
          <div
            className="hm-section-header"
            onClick={() => toggleSection('agents')}
            role="button"
            aria-expanded={!collapsedSections.agents}
            aria-label="Toggle agents section"
          >
            <span className="hm-section-label">Agents</span>
            <span className="hm-section-chevron">
              <Chevron collapsed={collapsedSections.agents} />
            </span>
          </div>
          <div className={'hm-section-body' + (collapsedSections.agents ? ' collapsed' : '')}>
            {visibleAgents.length === 0 && (
              <div style={{ padding: '14px 0', color: '#5A6F8C', fontSize: 14, fontStyle: 'italic' }}>No agents pinned yet.</div>
            )}
            {visibleAgents.map(a => (
              <button key={a.slug} className="hm-row" onClick={() => onSelectAgent && onSelectAgent(a)}>
                <span className="hm-agent-dot"></span>
                <span className="hm-agent-name">{a.name || a.slug}</span>
                <span className="hm-agent-meta">{relativeTime(a.last_message_at)}</span>
                <button
                  className={'hm-pin' + (pinnedAgents.includes(a.slug) || (pinnedAgents.length === 0 && a.is_ea) ? ' pinned' : '')}
                  onClick={(e) => { e.stopPropagation(); toggleAgentPin(a.slug) }}
                  title={pinnedAgents.includes(a.slug) ? 'Unpin' : 'Pin'}
                  aria-label={(pinnedAgents.includes(a.slug) ? 'Unpin ' : 'Pin ') + (a.name || a.slug)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4v6l3 4v2h-6v6l-1 1-1-1v-6H5v-2l3-4V4h-1V2h10v2h-1z"/></svg>
                </button>
              </button>
            ))}
          </div>
        </div>

        </div>
      )}
    </div>
  )
}
