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
import { useThemeMode } from '../hooks/useThemeMode.js'
import { useSystemToast } from '../SystemToast.jsx'
import { useSupportData, buildItems } from './SupportDashboard.jsx'
import LiveScribe from '../../pages/LiveScribe.jsx'
import FileAnnotator from './FileAnnotator.jsx'

const PIN_AGENTS_KEY = 'cv4_pinned_agents'
const PIN_PROJECTS_KEY = 'cv4_pinned_projects'
// R83 (proj-3): missions-tree marks newly-created / agent_status missions 'in-progress',
// and task-derived ones 'running'. The home used to treat ONLY 'running' as active, so a
// brand-new mission rendered grey ("idle"). Honor every active status the backend emits.
const MISSION_ACTIVE_STATUSES = new Set(['running', 'active', 'in-progress', 'working'])
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
// Single-word time phrases (Patrik 2026-06-19): the greeting is "[word], Name." so
// it stays two words and never runs behind the centered tool bar. A couple of
// natural variants per slot keeps it from feeling robotic.
const GREETINGS = {
  morning: ['Morning,', 'Sunrise,'],
  afternoon: ['Afternoon,', 'Midday,'],
  evening: ['Evening,', 'Sundown,'],
  late: ['Midnight,', 'Late,'],
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

// R-QA 2026-06-19 (Patrik): support wishes that arrive by email get logged into the
// room as plain user messages — raw "[SUPPORT WISH SUP-XXXX] from Name <e> (email):\n\n
// Subject\n• body" text. Rendered in the blue user bubble that was unreadable dark text
// on blue ("black text in a blue bubble"). Parse them so the conversation can show a
// clean LETTER card (paper surface, readable text, sender + subject) instead — Patrik:
// "format emails to look like letters and not so crazy."
const ROOM_EMAIL_RE = /^\s*\[SUPPORT WISH\s+([A-Za-z0-9-]+)\]\s*from\s+([^<(]*?)\s*(?:<([^>]+)>)?\s*\((email[^)]*)\)\s*:\s*\n+([\s\S]*)$/
// Keep only the clean summary an email message carries — drop the raw quoted thread,
// machine tags, and signature noise so the letter reads tidily, not "so crazy" (Patrik).
function cleanEmailBody(raw) {
  let b = raw || ''
  const cut = b.search(/---\s*ORIGINAL MESSAGE\s*---/i)
  if (cut !== -1) {
    b = b.slice(0, cut)
  } else {
    const q = b.search(/\n>\s|\nOn .{0,90}wrote:/)
    if (q !== -1) b = b.slice(0, q)
  }
  return b
    .replace(/\[staged_draft:[^\]]*\]/g, '')   // never show the staged-reply machine tag
    .replace(/\[SUPPORT WISH[^\]]*\]/g, '')
    .replace(/￼/g, '')                     // object-replacement glyphs from pasted signatures
    .replace(/<https?:\/\/[^>]*>/g, '')         // bare <url> noise
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
function parseRoomEmail(msg) {
  const text = (msg && msg.text) || ''
  const meta = msg && msg.meta
  const hasMeta = !!(meta && (meta.support_wish_id || meta.support_email))
  const m = ROOM_EMAIL_RE.exec(text)
  if (!m && !hasMeta) return null
  if (m) {
    const rest = (m[5] || '').trim()
    const nl = rest.indexOf('\n')
    const subject = (nl === -1 ? rest : rest.slice(0, nl)).trim()
    const body = cleanEmailBody(nl === -1 ? '' : rest.slice(nl + 1))
    return {
      who: (m[2] || '').trim() || (meta && meta.support_email) || 'Email',
      email: (m[3] || (meta && meta.support_email) || '').trim(),
      subject,
      body,
    }
  }
  // metadata says support-email but the text wasn't the machine format — still render
  // it as a letter (readable) with the cleaned text as the body.
  return { who: (meta.support_email || 'Email'), email: meta.support_email || '', subject: '', body: cleanEmailBody(text) }
}

// A received email rendered as a clean letter (not a chat bubble): paper card, envelope
// badge, sender + address, subject heading, plain readable body. Good contrast on every
// theme, no machine prefix.
function LetterCard({ letter, timestamp }) {
  return (
    <div style={{ display: 'flex', animation: 'cv6-msg-fade-in 300ms ease-out' }}>
      <div style={{
        flex: 1, minWidth: 0,
        background: 'var(--cv6-surface)',
        border: '1px solid var(--cv6-hair)',
        borderRadius: '12px',
        padding: '13px 15px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        {/* Letter header: envelope + sender + address + time */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          marginBottom: '10px', paddingBottom: '10px',
          borderBottom: '1px solid var(--cv6-divider)',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
            background: 'var(--cv6-accent-weak)', color: 'var(--cv6-accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {letter.who}
            </div>
            {letter.email && (
              <div style={{ fontSize: '11.5px', color: 'var(--cv6-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {letter.email}
              </div>
            )}
          </div>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10.5px', color: 'var(--cv6-text-tertiary)', flexShrink: 0 }}>
            {timestamp ? relativeTime(timestamp) : 'Email'}
          </span>
        </div>
        {letter.subject && (
          <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--cv6-text-primary)', lineHeight: 1.4, marginBottom: '8px' }}>
            {letter.subject}
          </div>
        )}
        {letter.body && (
          <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--cv6-text-secondary)', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
            {letter.body}
          </div>
        )}
      </div>
    </div>
  )
}

// The 8 home tools (icon + label) in their LOCKED order. Single source for the
// greeting-row tool bar (desktop) AND the mobile bottom dock so they never drift.
// Icons matched 1:1 to the CV6 design (Home desktop.dc.html).
const HOME_TOOLS = [
  { key: 'home', label: 'Home', svg: (<><path d="M3 11l9-7 9 7"/><path d="M5 9.8V20h14V9.8"/></>) },
  { key: 'chat', label: 'Chat', svg: (<><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z"/></>) },
  { key: 'organize', label: 'Organize', svg: (<><path d="M12 4 3 8l9 4 9-4Z"/><path d="m3 12 9 4 9-4"/></>) },
  { key: 'review', label: 'Review', svg: (<><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></>) },
  { key: 'support', label: 'Support', svg: (<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>) },
  { key: 'tracker', label: 'Tracker', svg: (<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>) },
  { key: 'command', label: 'Command', svg: (<><path d="M7 4H4v16h3M17 4h3v16h-3"/></>) },
  { key: 'scribe', label: 'Live Scribe', svg: (<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>) },
]

// R-MOBILE-NAV 2026-06-19 (Patrik): the mobile right-side rail — profile on top, every tool with
// its title, then Theme / Alerts / Search at the bottom (Search very bottom). These shared styles
// keep each rail item consistent. Active item gets the accent chip + accent label.
const RAIL_W = 72
const railItemSty = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '5px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', flex: 'none' }
function railChipSty(on) { return { width: '34px', height: '34px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: on ? 'var(--cv6-accent-primary)' : 'transparent', color: on ? '#fff' : 'var(--cv6-text-secondary)' } }
function railLabSty(on) { return { fontSize: '9px', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', color: on ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-tertiary)' } }

function SupportToolOverlay({ worldId }) {
  const { wishes, mailboxes } = useSupportData(worldId)
  const items = buildItems(wishes, mailboxes)
  const [selectedItem, setSelectedItem] = useState(null)
  const [filterStatus, setFilterStatus] = useState('open') // 'open' | 'waiting' | 'answered'
  // Mobile (<=1024, matches the other tools): the detail is a full-screen sheet, not a
  // fixed 520px side pane that would overflow a 390px phone.
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth <= 1024)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth <= 1024)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Derive open/waiting/answered counts
  const openCount = items.filter(it => !it.ready && it.status !== 'resolved' && it.status !== 'responded').length
  const waitingCount = items.filter(it => it.ready || (it.status === 'needs_you')).length
  const answeredCount = items.filter(it => it.status === 'resolved' || it.status === 'responded').length

  // "Things you need to know" banner — the real act-now signal is staged replies
  // waiting on your OK (item.ready). Newest first (items is already sorted), so
  // readyItems[0] is the most recent. We surface the count + the newest one; no
  // fabricated agent narrative (real-data rule). Hidden when nothing is staged.
  const readyItems = items.filter(it => it.ready)
  const topReady = readyItems[0] || null

  // Filter items based on the active filter pill
  const filteredItems = (() => {
    if (filterStatus === 'open') return items.filter(it => !it.ready && it.status !== 'resolved' && it.status !== 'responded')
    if (filterStatus === 'waiting') return items.filter(it => it.ready || it.status === 'needs_you')
    if (filterStatus === 'answered') return items.filter(it => it.status === 'resolved' || it.status === 'responded')
    return items
  })()

  // Auto-select first item when list changes — DESKTOP ONLY. On mobile the inbox list
  // shows first and the user taps an ask to open the sheet (auto-opening a sheet over
  // the list on load would be wrong). We still clear a selection that fell out of the
  // current filter.
  useEffect(() => {
    if (isNarrow) {
      if (selectedItem && !filteredItems.find(it => it.key === selectedItem.key)) setSelectedItem(null)
      return
    }
    if (filteredItems.length > 0) {
      if (!selectedItem || !filteredItems.find(it => it.key === selectedItem.key)) {
        setSelectedItem(filteredItems[0])
      }
    } else {
      setSelectedItem(null)
    }
  }, [filteredItems, selectedItem, isNarrow])

  return (
    <>
    <div style={{
      display: 'flex', gap: '0', height: '100%', flex: 1,
      background: 'var(--cv6-surface)', borderRadius: 'var(--cv6-card-radius)',
      border: '1px solid var(--cv6-divider)', overflow: 'hidden'
    }}>
      {/* Left: Inbox list */}
      <div style={{
        flex: '1', minWidth: 0, borderRight: '1px solid var(--cv6-divider)',
        display: 'flex', flexDirection: 'column', background: 'var(--cv6-surface)'
      }}>
        {/* Inbox header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--cv6-divider)', flexShrink: 0 }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--cv6-text-primary)' }}>Support</div>
            <div style={{ fontSize: '12.5px', color: 'var(--cv6-text-secondary)', marginTop: '3px' }}>
              {openCount} open · {waitingCount} waiting on you
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '7px' }}>
            <button
              onClick={() => setFilterStatus('open')}
              style={{
                height: '32px', padding: '0 13px', borderRadius: '16px', border: 'none',
                background: filterStatus === 'open' ? 'var(--cv6-accent-weak)' : 'transparent',
                color: filterStatus === 'open' ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)',
                fontSize: '12.5px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer',
                borderBottom: filterStatus === 'open' ? '2px solid var(--cv6-accent-primary)' : 'none'
              }}
            >
              Open
            </button>
            <button
              onClick={() => setFilterStatus('waiting')}
              style={{
                height: '32px', padding: '0 13px', borderRadius: '16px',
                border: filterStatus === 'waiting' ? 'none' : '1px solid var(--cv6-divider)',
                background: filterStatus === 'waiting' ? 'var(--cv6-accent-weak)' : 'transparent',
                color: filterStatus === 'waiting' ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)',
                fontSize: '12.5px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer',
                borderBottom: filterStatus === 'waiting' ? '2px solid var(--cv6-accent-primary)' : 'none'
              }}
            >
              Waiting
            </button>
            <button
              onClick={() => setFilterStatus('answered')}
              style={{
                height: '32px', padding: '0 13px', borderRadius: '16px',
                border: filterStatus === 'answered' ? 'none' : '1px solid var(--cv6-divider)',
                background: filterStatus === 'answered' ? 'var(--cv6-accent-weak)' : 'transparent',
                color: filterStatus === 'answered' ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)',
                fontSize: '12.5px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer',
                borderBottom: filterStatus === 'answered' ? '2px solid var(--cv6-accent-primary)' : 'none'
              }}
            >
              Answered
            </button>
          </div>
        </div>

        {/* Things you need to know — staged replies waiting on your OK (real, act-now) */}
        {topReady && (
          <button
            onClick={() => { setFilterStatus('waiting'); setSelectedItem(topReady) }}
            style={{
              textAlign: 'left', margin: '12px 16px 0', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-accent-weak)',
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: '4px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-accent-primary)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Things you need to know
            </span>
            <span style={{ fontSize: '13px', color: 'var(--cv6-text-primary)', lineHeight: 1.45 }}>
              {readyItems.length === 1
                ? <>A reply is staged and waiting on your OK: <strong>{topReady.subject || topReady.who}</strong>{topReady.who && topReady.subject ? <> from {topReady.who}</> : null}.</>
                : <>{readyItems.length} replies are staged and waiting on your OK. Newest: <strong>{topReady.subject || topReady.who}</strong>{topReady.who && topReady.subject ? <> from {topReady.who}</> : null}.</>}
            </span>
          </button>
        )}

 {/* Section label, matches the design's OPEN ASKS / WAITING / ANSWERED heading */}
        <div style={{ padding: '14px 18px 4px', fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-tertiary)' }}>
          {filterStatus === 'open' ? 'Open asks' : filterStatus === 'waiting' ? 'Waiting on you' : 'Answered'}
        </div>

        {/* Inbox list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--cv6-text-tertiary)', fontSize: '13px' }}>
              {filterStatus === 'open' && 'No open asks.'}
              {filterStatus === 'waiting' && 'Nothing waiting on you.'}
              {filterStatus === 'answered' && 'Nothing here yet.'}
            </div>
          ) : (
            filteredItems.map(item => (
              <SupportInboxRow
                key={item.key}
                item={item}
                isSelected={selectedItem?.key === item.key}
                onSelect={setSelectedItem}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Ask detail — desktop only (520px fixed). On mobile it opens as a
          full-screen sheet below so it never overflows a 390px phone. */}
      {!isNarrow && (selectedItem ? (
        <SupportDetailPanel item={selectedItem} />
      ) : (
        <div style={{
          width: '520px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cv6-text-tertiary)', fontSize: '13px'
        }}>
          Select an ask to view details
        </div>
      ))}
    </div>

    {/* Mobile: full-screen ask-detail sheet. Slim back bar + the real SupportDetailPanel
        (mobile mode = full width, fills height, keeps its own subject + Resolve header and
        internal scroll). Respects the top safe-area lock; the panel scrolls, not the page. */}
    {isNarrow && selectedItem && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: 'var(--cv6-ground)', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', flexShrink: 0 }}>
          <button onClick={() => setSelectedItem(null)} aria-label="Back to inbox" style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: 'var(--cv6-surface-hover)', color: 'var(--cv6-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--cv6-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Support</span>
        </div>
        <SupportDetailPanel item={selectedItem} mobile />
      </div>
    )}
    </>
  )
}

// Kit Support inbox avatars are colour-coded per sender (support.html: pink, purple,
// teal…), not all-blue. Deterministic hash on the sender name keeps each person's
// colour stable across renders. Uses the real sender name — no fabricated data.
const SUPPORT_AVATAR_COLORS = [
  { bg: 'rgba(244,114,182,0.18)', fg: '#f472b6' }, // pink
  { bg: 'rgba(168,85,247,0.18)',  fg: '#a855f7' }, // purple
  { bg: 'rgba(45,212,191,0.18)',  fg: '#2dd4bf' }, // teal
  { bg: 'rgba(91,155,255,0.18)',  fg: '#5b9bff' }, // blue
  { bg: 'rgba(251,191,36,0.18)',  fg: '#fbbf24' }, // amber
  { bg: 'rgba(132,204,22,0.18)',  fg: '#84cc16' }, // lime
]
const supportAvatarColor = (who) => {
  const s = String(who || '?'); let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return SUPPORT_AVATAR_COLORS[h % SUPPORT_AVATAR_COLORS.length]
}

// ── Support Inbox Row — list item in the left panel ────────────────────────────
function SupportInboxRow({ item, isSelected, onSelect }) {
  const statusColor = item.ready ? 'var(--cv6-accent-primary)' : item.status === 'needs_you' ? 'var(--cv6-accent-warn)' : 'var(--cv6-text-secondary)'
  const statusLabel = item.ready ? 'Ready' : item.status === 'needs_you' ? 'Waiting' : item.status === 'responded' ? 'Answered' : 'Resolved'
  const av = supportAvatarColor(item.who)

  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 14px', borderRadius: '10px',
        background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent',
        border: isSelected ? '1px solid var(--cv6-accent-primary)' : '1px solid transparent',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
        transition: 'all 120ms ease'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--cv6-surface-hover)'
          e.currentTarget.style.borderColor = 'var(--cv6-divider)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
        }
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
        background: av.bg, color: av.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '700'
      }}>
        {(item.who || '').slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.subject || item.who}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.who} · {item.kind} · {relativeTime(new Date(item.date).toISOString())}
        </div>
      </div>

      {/* Status chip */}
      <span style={{
        fontSize: '10.5px', fontWeight: '600', color: statusColor,
        background: item.ready ? 'var(--cv6-accent-weak)' : item.status === 'needs_you' ? 'var(--cv6-accent-warn-weak)' : 'var(--cv6-chip)',
        padding: '3px 8px', borderRadius: '5px', flexShrink: 0, whiteSpace: 'nowrap'
      }}>
        {statusLabel}
      </span>
    </button>
  )
}

// ── Support Detail Panel — right panel showing the selected ask ───────────────
function SupportDetailPanel({ item, mobile }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyState, setReplyState] = useState('idle') // idle | sending
  const [autoSendPaused, setAutoSendPaused] = useState(false)
  const [countdownTime, setCountdownTime] = useState(null)
  const staged = item.wish ? parseSupportStaged(item.wish.message) : null

  // Auto-send countdown timer
  useEffect(() => {
    if (!item.recommendation || !item.auto_send_at || autoSendPaused) {
      setCountdownTime(null)
      return
    }
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const sendTime = new Date(item.auto_send_at).getTime()
      const remaining = sendTime - now
      if (remaining <= 0) {
        setCountdownTime(null)
        clearInterval(timer)
      } else {
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setCountdownTime(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [item.auto_send_at, autoSendPaused, item.recommendation])

  const handleSend = async (e, textOverride = null) => {
    e.stopPropagation()
    if (!item.wish || !staged) return
    setSending(true)
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          wish_id: item.wish.id,
          draft_id: staged.draftId,
          connection_id: staged.connectionId,
          text: textOverride || null,
        }),
      })
      const d = await r.json()
      if (r.ok && d.ok) setSent(true)
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setSending(false)
    }
  }

  // Custom reply (composer text OR a chosen suggested option). Threads onto the
  // staged draft so the client gets a proper threaded reply — so it needs `staged`.
  const handleSendReply = async (e, overrideText = null) => {
    e.stopPropagation()
    const body = (overrideText != null ? overrideText : replyText).trim()
    if (!item.wish || !body) return
    if (!staged) return  // no staged draft = no thread to reply into; composer/options are disabled in that case
    setReplyState('sending')
    try {
      const r = await authFetch('/api/support/send-staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          wish_id: item.wish.id,
          draft_id: staged.draftId,
          connection_id: staged.connectionId,
          text: body,
        }),
      })
      const d = await r.json()
      if (r.ok && d.ok) {
        setReplyText('')
        setReplyState('idle')
      } else {
        setReplyState('idle')
      }
    } catch (e) {
      console.error('Reply failed:', e)
      setReplyState('idle')
    }
  }

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
        // Item resolved; parent will re-fetch
      }
    } catch (e) {
      console.error('Resolve failed:', e)
    } finally {
      setResolving(false)
    }
  }

  const handlePauseAutoSend = (e) => {
    e.stopPropagation()
    setAutoSendPaused(true)
    // Clear auto_send_at on the backend
    authFetch('/api/support/send-staged', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_schedule', wish_id: item.wish.id }),
    }).catch(e => console.error('Pause failed:', e))
  }

  const handleOpenMail = () => {
    if (item.link) window.open(item.link, '_blank')
  }

  return (
    <div style={mobile
      ? { width: '100%', flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column', borderLeft: 'none' }
      : { width: '520px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--cv6-divider)' }}>
      {/* Detail header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px', borderBottom: '1px solid var(--cv6-divider)', flexShrink: 0
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>
            {item.subject || item.who}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', marginTop: '2px' }}>
            {item.who} · {relativeTime(new Date(item.date).toISOString())}
          </div>
        </div>
        <button
          onClick={handleResolve}
          disabled={resolving}
          style={{
            height: '36px', marginLeft: '8px', padding: '0 15px', borderRadius: '10px', border: 'none',
            background: 'var(--cv6-accent-success-weak)', color: 'var(--cv6-accent-success)', fontSize: '13px',
            fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: '6px', opacity: resolving ? 0.6 : 1
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
          Resolve
        </button>
      </div>

      {/* Detail content - scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
        {/* Avatar + sender info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--cv6-accent-weak)', color: 'var(--cv6-accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700'
          }}>
            {(item.who || '').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>
              {item.who}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)' }}>
              {item.kind} · {relativeTime(new Date(item.date).toISOString())}
            </div>
          </div>
          {item.ready && (
            <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--cv6-accent-primary)', background: 'var(--cv6-accent-weak)', padding: '4px 9px', borderRadius: '6px' }}>
              New
            </span>
          )}
        </div>

        {/* Ask title */}
        {item.subject && (
          <h2 style={{ fontSize: '19px', lineHeight: 1.3, fontWeight: '700', color: 'var(--cv6-text-primary)', margin: '0 0 12px' }}>
            {item.subject}
          </h2>
        )}

        {/* Ask body */}
        {item.text && (
          <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--cv6-text-primary)', margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
            {item.text}
          </p>
        )}

        {/* Original message (if exists) */}
        {item.original && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--cv6-surface2)', border: '1px solid var(--cv6-divider)', borderRadius: '10px', padding: '9px 12px', marginBottom: '22px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
            </svg>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: 'var(--cv6-text-primary)' }}>
              original-message
            </span>
            <span style={{ fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>
              attached
            </span>
          </div>
        )}

        {/* Agent assist: recommendations, suggested replies, auto-send timer */}
        {staged && (
          <div style={{ background: 'var(--cv6-surface)', border: '1px solid var(--cv6-accent-weak)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--cv6-accent-primary)" style={{ flexShrink: 0 }}>
                <path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
              </svg>
              <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cv6-accent-primary)' }}>
                Agent assist
              </span>
            </div>

            {/* Recommendation bullets */}
            {item.recommendation && item.recommendation.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)', marginBottom: '7px' }}>
                  Key talking points
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' }}>
                  {item.recommendation.map((bullet, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--cv6-text-primary)' }}>
                      <span style={{ color: 'var(--cv6-accent-primary)' }}>•</span>
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested response option buttons */}
            {item.reply_options && item.reply_options.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)', marginBottom: '7px' }}>
                  Suggested responses
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '15px' }}>
                  {item.reply_options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => handleSendReply(e, option.text)}
                      disabled={sending || sent}
                      style={{
                        textAlign: 'left',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--cv6-divider)',
                        background: 'var(--cv6-surface2)',
                        color: 'var(--cv6-text-primary)',
                        fontSize: '13.5px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        lineHeight: 1.45,
                        opacity: sending || sent ? 0.6 : 1
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-send countdown */}
            {item.auto_send_at && !autoSendPaused && countdownTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'var(--cv6-warn-weak)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4l3 2" />
                </svg>
                <span style={{ fontSize: '12.5px', lineHeight: 1.4, color: 'var(--cv6-text-primary)', flex: 1 }}>
                  Auto-sends the best reply in <strong>{countdownTime}</strong> unless you jump in.
                </span>
                <button
                  onClick={handlePauseAutoSend}
                  style={{ fontSize: '12px', fontWeight: '600', color: 'var(--cv6-warn)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Pause
                </button>
              </div>
            )}

            {/* Send/Edit buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSend}
                disabled={sending || sent}
                style={{
                  flex: 1, height: '40px', borderRadius: '10px', border: 'none',
                  background: sent ? 'transparent' : 'var(--cv6-accent-primary)',
                  color: sent ? 'var(--cv6-accent-primary)' : '#fff',
                  fontSize: '13.5px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer',
                  borderBottom: sent ? '1px solid var(--cv6-accent-primary)' : 'none', opacity: sending ? 0.6 : 1
                }}
              >
                {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send now'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setReplyText(item.reply || '') }}
                title="Load the prepared reply into the box below to edit before sending"
                style={{
                  height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--cv6-divider)',
                  background: 'transparent', color: 'var(--cv6-text-secondary)', fontSize: '13.5px', fontWeight: '600',
                  fontFamily: 'inherit', cursor: 'pointer'
                }}>
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Reply preview if not staged */}
        {item.reply && !staged && (
          <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.10)', borderLeft: '2px solid #10B981', borderRadius: '4px', marginBottom: '14px' }}>
            <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10B981' }}>
              We replied
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', lineHeight: '1.4', marginTop: '3px', whiteSpace: 'pre-wrap' }}>
              {item.reply}
            </div>
          </div>
        )}
      </div>

      {/* Footer: reply composer */}
      <div style={{ borderTop: '1px solid var(--cv6-divider)', padding: '14px 22px', display: 'flex', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write a reply…"
          style={{
            flex: 1,
            height: '42px',
            borderRadius: '11px',
            border: '1px solid var(--cv6-divider)',
            background: 'var(--cv6-surface2)',
            padding: '10px 14px',
            fontSize: '14px',
            color: 'var(--cv6-text-primary)',
            fontFamily: 'inherit',
            resize: 'none',
            boxSizing: 'border-box',
            outline: 'none'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey && replyText.trim()) {
              handleSendReply(e)
            }
          }}
        />
        <button
          onClick={handleSendReply}
          disabled={!replyText.trim() || replyState === 'sending'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            border: 'none',
            background: replyText.trim() ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-tertiary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: replyText.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            opacity: replyState === 'sending' ? 0.6 : 1
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Export SupportToolOverlay for use in CV6Gallery
export { SupportToolOverlay }

// ── Projects Tool — Finder/Dropbox 3-column browser, drag-to-move + confirm + live create + mobile (R38 r2) ──
function ProjectsToolOverlay({ projects: projectsProp, missionsByProject, onOpen, onCreateProject, onCreateMission, onMoveFile, onMoveMission }) {
  const [projects, setProjects] = useState(projectsProp || [])
  const [missionsMap, setMissionsMap] = useState(missionsByProject || {})
  const [selProj, setSelProj] = useState(null)
  const [selMission, setSelMission] = useState(null)
  const [dragMission, setDragMission] = useState(null)   // { mission, fromSlug }
  const [dropProj, setDropProj] = useState(null)         // slug hovered as drop target
  const [invalidDrop, setInvalidDrop] = useState(null)   // dnd-1: source project hovered (can't drop on self)
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
    // R-IPAD 2026-06-19 (Patrik: "weird gap/cutoff on the bottom on iPad fullscreen").
    // 100dvh on iOS Safari resolves to the toolbar-collapsed estimate, so the home grid
    // stopped ~200px short of the real screen — black gap below + clipped composer. Publish
    // the TRUE viewport height (visualViewport, which iOS updates live as the toolbar moves)
    // as --app-height and size the grid off that instead of 100dvh.
    const vv = window.visualViewport
    const check = () => {
      setIsNarrow(window.innerWidth <= 1024)
      const h = Math.round((vv && vv.height) || window.innerHeight || 0)
      if (h) document.documentElement.style.setProperty('--app-height', h + 'px')
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    if (vv) { vv.addEventListener('resize', check); vv.addEventListener('scroll', check) }
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
      if (vv) { vv.removeEventListener('resize', check); vv.removeEventListener('scroll', check) }
    }
  }, [])

  const hue = (slug) => ((slug ? slug.charCodeAt(0) : 0) * 137) % 360
  const missions = selProj ? (missionsMap[selProj.slug] || []) : []
  const slugify = (name, n) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + n

  function doMove(mission, fromSlug, toSlug) {
    // Optimistic: move it in the local tree right away so the UI feels instant.
    setMissionsMap(prev => {
      const next = { ...prev }
      next[fromSlug] = (next[fromSlug] || []).filter(m => m.slug !== mission.slug)
      next[toSlug] = [...(next[toSlug] || []).filter(m => m.slug !== mission.slug), mission]
      return next
    })
    // Persist: reparent the mission folder on disk + re-register it in Supabase
    // via /api/dashboard/mission-move (proj-1). Revert the optimistic move on failure.
    if (onMoveMission) {
      Promise.resolve(onMoveMission(mission, fromSlug, toSlug)).then(ok => {
        if (ok === false) {
          setMissionsMap(prev => {
            const next = { ...prev }
            next[toSlug] = (next[toSlug] || []).filter(m => m.slug !== mission.slug)
            next[fromSlug] = [...(next[fromSlug] || []).filter(m => m.slug !== mission.slug), mission]
            return next
          })
        }
      })
    }
  }
  // create-2: never reuse an existing slug. length+1 can collide when a row was
  // removed elsewhere but local state still holds the same count, so bump the
  // suffix until it is actually free against the given taken-set.
  const uniqueSlug = (name, startN, taken) => {
    let n = startN
    let s = slugify(name, n)
    while (taken.has(s)) { n += 1; s = slugify(name, n) }
    return s
  }
  function commitCreate() {
    const name = draftName.trim(); if (!name) { setCreating(null); return }
    if (creating === 'project') {
      const slug = uniqueSlug(name, projects.length + 1, new Set(projects.map(p => p.slug)))
      const p = { slug, name }
      setProjects(prev => [p, ...prev]); setMissionsMap(prev => ({ ...prev, [slug]: [] }))
      setSelProj(p); setSelMission(null); if (isNarrow) setMobileCol(1)
      onCreateProject && onCreateProject(slug, name)
    } else if (creating === 'mission' && selProj) {
      const slug = uniqueSlug(name, (missionsMap[selProj.slug] || []).length + 1, new Set((missionsMap[selProj.slug] || []).map(m => m.slug)))
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

  const Row = ({ label, sub, slug, active, onClick, chevron, dnd, dropActive, dropInvalid }) => (
    <button
      onClick={onClick}
      {...(dnd || {})}
      title={dropInvalid ? "Already in this project" : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left',
        padding: '9px 12px', borderRadius: '6px', margin: '2px 6px', cursor: dropInvalid ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        border: dropInvalid ? '2px dashed var(--cv6-accent-error, #EF4444)' : dropActive ? '2px dashed var(--cv6-accent-primary)' : '2px solid transparent',
        background: dropInvalid ? 'hsla(0,80%,55%,0.08)' : dropActive ? 'hsla(220,90%,55%,0.10)' : active ? `hsla(${hue(slug)}, 60%, 48%, 0.12)` : 'transparent',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => { if (!active && !dropActive && !dropInvalid) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
      onMouseLeave={(e) => { if (!active && !dropActive && !dropInvalid) e.currentTarget.style.background = 'transparent' }}
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
    onDragStart: (e) => { setDragMission({ mission: m, fromSlug: selProj.slug }); setDropProj(null); setInvalidDrop(null); e.dataTransfer.effectAllowed = 'move' },
    onDragEnd: () => { setDragMission(null); setDropProj(null); setInvalidDrop(null) },
  })
  const projectDrop = (p) => ({
    onDragOver: (e) => {
      if (!dragMission) return
      if (dragMission.fromSlug !== p.slug) { e.preventDefault(); setDropProj(p.slug); setInvalidDrop(null) }
 else { setInvalidDrop(p.slug); setDropProj(null) } // dnd-1: hovering the source project, show "can't drop here"
    },
    onDragLeave: () => { setDropProj(d => (d === p.slug ? null : d)); setInvalidDrop(d => (d === p.slug ? null : d)) },
    onDrop: (e) => { e.preventDefault(); if (dragMission && dragMission.fromSlug !== p.slug) { const fromProj = projects.find(x => x.slug === dragMission.fromSlug); setConfirmMove({ mission: dragMission.mission, fromProj, toProj: p }) } setDragMission(null); setDropProj(null); setInvalidDrop(null) },
  })

  const ProjectsCol = () => (
    <div style={colStyle}>
      <div style={headStyle}>Projects</div>
      {creating === 'project' && (
        <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitCreate(); if (e.key === 'Escape') { setCreating(null); setDraftName('') } }} onBlur={commitCreate} placeholder="Project name…" style={{ margin: '4px 8px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--cv6-accent-primary)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
      )}
      {projects.length ? projects.map(p => (
        <Row key={p.slug} label={p.name || p.slug} sub={`${(missionsMap[p.slug] || []).length} missions`} slug={p.slug} active={selProj?.slug === p.slug} chevron dropActive={dropProj === p.slug} dropInvalid={invalidDrop === p.slug} dnd={projectDrop(p)} onClick={() => { setSelProj(p); setSelMission(null); if (isNarrow) setMobileCol(1) }} />
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
 {/* R48: never "Idle", show last visited instead */}
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
        <ResizableBox minHeight={420} storageKey="projects-tool">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '100%', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
            <ProjectsCol />
            <MissionsCol />
            <PreviewCol />
          </div>
        </ResizableBox>
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
  // R59 (Patrik): every review's "agent acts on changes" switch is ON by default — a
  // change you add goes into effect (the agent looks into it) unless you flip it off.
  const [agentActs, setAgentActs] = useState(true)
  useEffect(() => { setAgentActs(true) }, [openItem?.id])
  const roomSlugFor = useCallback((it) => (it && it.mission && it.mission !== '(root)') ? `${it.project}:${it.mission}` : (it && it.project) || '', [])
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
      // R59: when "agent acts" is on, the change goes into effect — drop it into the
      // deliverable's room so the agent picks it up. Off = recorded only, agent stays put.
      if (agentActs && onReplyToRoom) {
        const slug = roomSlugFor(openItem)
        if (slug) onReplyToRoom(slug, `Review change on "${openItem.item}": ${text}`)
      }
    } finally { setSavingStep(false) }
  }, [newStep, openItem, worldId, loadChecklist, agentActs, onReplyToRoom, roomSlugFor])
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
    const check = () => setIsNarrow(window.innerWidth <= 1024)
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

  // Group items by project for the left column queue
  const groupedByProject = useMemo(() => {
    const groups = {}
    items.forEach(it => {
      const proj = it.project || '(root)'
      if (!groups[proj]) groups[proj] = []
      groups[proj].push(it)
    })
    return groups
  }, [items])

  return (
    // R48: position:relative so the review modal can sit ABSOLUTELY inside the tool area
    // (covering only the review tools, never extending past the screen).
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', minHeight: '100%', flex: 1 }}>
      {/* Top summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)' }}>{items.filter(it => it.ready && !done[it.id]).length} ready for review · {items.length} in the pipeline</div>
      </div>
      {/* Desktop: 3-column layout (queue | preview | checklist) matching the mockup */}
      {!isNarrow ? (
      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr 320px', gap: '0', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)', height: '600px' }}>

        {/* Left: Queue grouped by project */}
        <div style={{ borderRight: '1px solid var(--cv6-divider)', overflowY: 'auto', padding: '18px 20px 12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--cv6-text-primary)', marginBottom: '3px' }}>Queue</div>
          <div style={{ fontSize: '12.5px', color: 'var(--cv6-text-secondary)', marginBottom: '14px' }}>{items.filter(it => it.ready && !done[it.id]).length} ready · {items.length} in pipeline</div>

          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: '7px', marginBottom: '14px', paddingRight: '0px' }}>
            <button style={{ height: '30px', padding: '0 13px', borderRadius: '15px', border: 'none', background: 'var(--cv6-accent-weak)', color: 'var(--cv6-accent-primary)', fontSize: '12.5px', fontWeight: '600', fontFamily: 'Inter', cursor: 'pointer' }}>Ready {items.filter(it => it.ready).length}</button>
            <button style={{ height: '30px', padding: '0 13px', borderRadius: '15px', border: '1px solid var(--cv6-hair)', background: 'transparent', color: 'var(--cv6-text-secondary)', fontSize: '12.5px', fontWeight: '600', fontFamily: 'Inter', cursor: 'pointer' }}>Pipeline</button>
          </div>

          {/* Items grouped by project */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '0px' }}>
            {Object.keys(groupedByProject).length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', textAlign: 'center', padding: '40px 12px' }}>Nothing in the review pipeline yet</div>
            ) : (
              Object.entries(groupedByProject).map(([proj, projItems]) => (
                <div key={proj}>
                  {/* Project group header TODO: add "See all" for each project */}
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cv6-text-secondary)', padding: '12px 12px 8px', marginTop: '8px' }}>
                    {proj}
                  </div>
                  {projItems.map(it => {
                    const isDone = done[it.id]
                    const clickable = it.ready && !isDone
                    return (
                      <div
                        key={it.id}
                        onClick={() => { if (clickable) { setOpenItem(it); setReviewText('') } }}
                        style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 12px', borderRadius: '10px', marginBottom: '2px', cursor: clickable ? 'pointer' : 'default', background: isDone ? 'rgba(16,185,129,0.14)' : clickable ? 'var(--cv6-accent-weak)' : 'transparent', opacity: it.ready ? 1 : 0.5, transition: 'background 120ms ease' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDone ? '#10B981' : it.ready ? 'var(--cv6-accent-success)' : 'var(--cv6-text-tertiary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>{it.item}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--cv6-text-secondary)', marginTop: '2px' }}>{it.path ? it.path.split('/').pop() : it.mission}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: Document preview (TODO: implement image/video/website annotators) */}
        <div style={{ borderRight: '1px solid var(--cv6-divider)', overflowY: 'auto', padding: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', background: 'var(--cv6-surface)' }}>
          {openItem ? (
            <div style={{ width: '100%', maxWidth: '100%' }}>
              {/* The center renders the real document via FilePreviewPanel + the
                  Frame.io-style annotator (annotate). FIXED 2026-06-19: project-file
                  now lets the aom super-admin world read any project's deliverables
                  (it was 404'ing files the review queue listed for projects whose
                  Supabase client_id != aom, e.g. space-rising), so attachments load. */}
              <FilePreviewPanel node={{ name: openItem.item, path: openItem.path, isFile: true }} worldId={worldId} annotate />
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', textAlign: 'center' }}>Select an item to preview</div>
          )}
        </div>

        {/* Right: Document metadata + Request changes checklist */}
        <div style={{ padding: '22px 22px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {openItem ? (
            <>
            {/* Document header — keeps the doc heading */}
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)', marginBottom: '12px' }}>This document</div>

            {/* Document metadata */}
            <div style={{ background: 'var(--cv6-surface)', border: '1px solid var(--cv6-hair)', borderRadius: '12px', overflow: 'hidden', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: '44px', borderBottom: '1px solid var(--cv6-divider)' }}>
                <span style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)' }}>From</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13.5px', fontWeight: '500', color: 'var(--cv6-text-primary)' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--cv6-accent-success-weak)', color: 'var(--cv6-accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700' }}>EA</span>Agent
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: '44px', borderBottom: '1px solid var(--cv6-divider)' }}>
                <span style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)' }}>Location</span>
                <span style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--cv6-text-primary)' }}>{openItem.project} {openItem.mission !== '(root)' ? `→ ${openItem.mission}` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: '44px' }}>
                <span style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)' }}>Status</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '500', color: 'var(--cv6-accent-success)' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--cv6-accent-success)' }} />Ready
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px' }}>
              <button onClick={() => { if (!openItem || !onReplyToRoom) return; const s = roomSlugFor(openItem); if (s) { onReplyToRoom(s, `Approved "${openItem.item}".`); setDone(prev => ({ ...prev, [openItem.id]: true })); setOpenItem(null) } }} style={{ height: '46px', borderRadius: '11px', border: 'none', background: 'var(--cv6-accent-success)', color: '#06281c', fontSize: '14.5px', fontWeight: '600', fontFamily: 'Inter', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>Approve
              </button>
              <button onClick={() => { if (typeof document !== 'undefined') document.querySelector('input[placeholder="Add a change…"]')?.focus() }} style={{ height: '46px', borderRadius: '11px', border: '1px solid var(--cv6-hair)', background: 'transparent', color: 'var(--cv6-text-primary)', fontSize: '14.5px', fontWeight: '600', fontFamily: 'Inter', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h12"/></svg>Request changes
              </button>
            </div>

            {/* Checklist section */}
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)', marginBottom: '10px' }}>Request changes</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '160px', marginBottom: '12px', border: '1px solid var(--cv6-divider)', borderRadius: '12px', padding: '12px', background: 'var(--cv6-ground)' }}>
              {checklist.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--cv6-text-tertiary)', textAlign: 'center' }}>
                  Add changes below
                </div>
              ) : (
                checklist.map(step => (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '8px 0', borderBottom: '1px solid var(--cv6-divider)' }}>
                    <button onClick={() => toggleStep(step.id)} style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '50%', border: step.done ? 'none' : '2px solid var(--cv6-text-tertiary)', background: step.done ? '#10B981' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      {step.done && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.4, color: step.done ? 'var(--cv6-text-tertiary)' : 'var(--cv6-text-primary)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.text}</span>
                    <button onClick={() => deleteStep(step.id)} style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--cv6-text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Input: Add a change */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--cv6-divider)', borderRadius: '12px', padding: '4px 6px 4px 14px', background: 'var(--cv6-ground)' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <input
                value={newStep}
                onChange={e => setNewStep(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }}
                placeholder="Add a change…"
                style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
              />
              <button onClick={addStep} disabled={savingStep || !newStep.trim()} style={{ flexShrink: 0, padding: '7px 12px', borderRadius: '8px', border: 'none', background: newStep.trim() ? 'var(--cv6-text-primary)' : 'var(--cv6-surface-hover)', color: newStep.trim() ? 'var(--cv6-surface)' : 'var(--cv6-text-tertiary)', cursor: newStep.trim() ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700' }}>Save</button>
            </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', textAlign: 'center', padding: '60px 12px' }}>Select an item to request changes</div>
          )}
        </div>
      </div>
      ) : (
      /* Mobile: Fallback card layout */
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
      )}

      {/* Mobile: full-screen preview + annotator sheet (R-MATCH review-3). Tapping a
          deliverable on a phone set openItem but rendered nothing (the preview only
          existed in the desktop 3-col grid), so Patrik could not open a file or leave a
          comment on his iPhone. This sheet renders the real file + the Frame.io
          annotator (video timeline / point comments) + Approve + the request-changes
          checklist. Respects the mobile top/bottom safe-area lock; only the sheet body
          scrolls (overscroll-contain), never the page. */}
      {isNarrow && openItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: 'var(--cv6-ground)', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', flexShrink: 0 }}>
            <button onClick={() => setOpenItem(null)} aria-label="Back to review list" style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px', border: 'none', background: 'var(--cv6-surface-hover)', color: 'var(--cv6-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span style={{ flex: 1, minWidth: 0, fontSize: '15px', fontWeight: '700', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openItem.item}</span>
            <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '700', color: openItem.type.color, background: `${openItem.type.color}1f`, padding: '3px 8px', borderRadius: '5px' }}>{openItem.type.label}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '14px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            <FilePreviewPanel node={{ name: openItem.item, path: openItem.path, isFile: true }} worldId={worldId} annotate bare />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '18px', padding: '12px 14px', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-hair)', borderRadius: '12px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--cv6-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openItem.project}{openItem.mission !== '(root)' ? ` → ${openItem.mission}` : ''}</span>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--cv6-accent-success)' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--cv6-accent-success)' }} />Ready</span>
            </div>
            {/* R-MATCH-KIT 2026-06-20: kit mobile review action bar (review.html line 123) is
                Approve (flex-1 green) + Changes (surface-2). Changes jumps to the request-changes
 input below, "never approve blind". The checklist stays the real mechanism. */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={() => { if (!openItem || !onReplyToRoom) return; const s = roomSlugFor(openItem); if (s) { onReplyToRoom(s, `Approved "${openItem.item}".`); setDone(prev => ({ ...prev, [openItem.id]: true })); setOpenItem(null) } }} style={{ flex: 1, height: '48px', borderRadius: '13px', border: 'none', background: 'var(--cv6-accent-success)', color: '#06281c', fontSize: '14.5px', fontWeight: '600', fontFamily: 'Inter', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>Approve
              </button>
              <button onClick={() => { const el = document.getElementById('cv6-review-change-input'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 200) } }} style={{ width: '120px', height: '48px', borderRadius: '13px', border: '1px solid var(--cv6-hair)', background: 'var(--cv6-surface-2)', color: 'var(--cv6-text-primary)', fontSize: '13.5px', fontWeight: '600', fontFamily: 'Inter', cursor: 'pointer' }}>Changes</button>
            </div>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)', margin: '20px 0 10px' }}>Request changes</div>
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--cv6-divider)', borderRadius: '12px', padding: '12px', background: 'var(--cv6-surface)' }}>
              {checklist.length === 0 ? (
                <div style={{ padding: '14px 4px', fontSize: '13px', color: 'var(--cv6-text-tertiary)', textAlign: 'center' }}>Add a change below to send it back.</div>
              ) : checklist.map(step => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--cv6-divider)' }}>
                  <button onClick={() => toggleStep(step.id)} style={{ flexShrink: 0, marginTop: '1px', width: '22px', height: '22px', borderRadius: '50%', border: step.done ? 'none' : '2px solid var(--cv6-text-tertiary)', background: step.done ? '#10B981' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    {step.done && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                  <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.4, color: step.done ? 'var(--cv6-text-tertiary)' : 'var(--cv6-text-primary)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.text}</span>
                  <button onClick={() => deleteStep(step.id)} aria-label="Delete change" style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--cv6-text-tertiary)', cursor: 'pointer' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: checklist.length ? '10px' : '0', borderTop: checklist.length ? '1px solid var(--cv6-divider)' : 'none', paddingTop: checklist.length ? '10px' : '0' }}>
                <input id="cv6-review-change-input" value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }} placeholder="Add a change…" style={{ flex: 1, height: '40px', padding: '0 12px', border: '1px solid var(--cv6-divider)', borderRadius: '10px', background: 'var(--cv6-ground)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                <button onClick={addStep} disabled={savingStep || !newStep.trim()} style={{ flexShrink: 0, height: '40px', padding: '0 16px', borderRadius: '10px', border: 'none', background: newStep.trim() ? 'var(--cv6-text-primary)' : 'var(--cv6-surface-hover)', color: newStep.trim() ? 'var(--cv6-surface)' : 'var(--cv6-text-tertiary)', cursor: newStep.trim() ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>Save</button>
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
const STATUS_COLORS = { 'Open': 'var(--cv6-accent-error)', 'In progress': 'var(--cv6-accent-warn)', 'Done': 'var(--cv6-accent-success)' }
const STATUS_BG_COLORS = { 'Open': 'var(--cv6-accent-error-weak)', 'In progress': 'var(--cv6-accent-warn-weak)', 'Done': 'var(--cv6-accent-success-weak)' }
// Priority 1 (now) -> 5 (later). Warm/urgent at the top, cool/calm at the bottom.
const PRIORITY_COLORS = { 1: 'var(--cv6-accent-error)', 2: 'var(--cv6-accent-warn)', 3: 'var(--cv6-accent-primary)', 4: 'var(--cv6-text-secondary)', 5: 'var(--cv6-text-tertiary)' }

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

function TrackerToolOverlay({ projects, missionsByProject, agents, user }) {
  const firstProj = (projects || [])[0]
  // Custom trackers PERSIST via /api/dashboard/trackers (Patrik 2026-06-19: "wire so
  // trackers actually save"). They load from the store on mount; the real trackers
  // (cv6-bugs, sr-tickets) insert themselves from their own endpoints below. No
  // hardcoded local seed any more — a created tracker survives a reload.
  const TWORLD = 'aom'
  const [trackers, setTrackers] = useState([])
  const [selId, setSelId] = useState(null)
  const cellSaveTimers = useRef({}) // debounce per tracker:row:col so typing doesn't spam the store
  // Is this a persisted custom tracker (vs a live one with its own endpoint)?
  const isCustom = (id) => typeof id === 'string' && id.startsWith('trk-')
  const postTracker = useCallback(async (payload) => {
    try {
      const r = await authFetch('/api/dashboard/trackers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ world: TWORLD, ...payload }) })
      return r.ok ? await r.json() : null
    } catch { return null }
  }, [])
  // Load saved custom trackers once; merge so the live cv6-bugs/sr-tickets stay put.
  useEffect(() => {
    let active = true
    authFetch(`/api/dashboard/trackers?world=${TWORLD}`)
      .then(r => (r.ok ? r.json() : { trackers: [] }))
      .then(d => {
        if (!active) return
        const saved = Array.isArray(d.trackers) ? d.trackers : []
        setTrackers(prev => {
          const live = prev.filter(t => !isCustom(t.id))
          return [...live, ...saved]
        })
      })
      .catch(() => {})
    return () => { active = false }
  }, [])
  // Always keep a valid selection: prefer the live cv6-bugs, then sr-tickets, then
  // the first tracker. Runs whenever the list changes (replaces the old 't1' default).
  useEffect(() => {
    if (!trackers.length) return
    if (selId && trackers.find(t => t.id === selId)) return
    const pref = trackers.find(t => t.id === 'cv6-bugs') || trackers.find(t => t.id === 'sr-tickets') || trackers[0]
    if (pref) setSelId(pref.id)
  }, [trackers, selId])
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
  const [selectorCollapsed, setSelectorCollapsed] = useState(false) // collapse Trackers list to a slim bar so the sheet is the focus
  const [sheetFocused, setSheetFocused] = useState(false) // u-mqil0bc9: freeze sort while user is reading/typing to prevent list jumping

  // Space Rising real tracker (admin_tickets) — live via /api/dashboard/admin-tickets.
  const [srStatus, setSrStatus] = useState(null) // null|loading|connected|needs_key|error
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth <= 1024)
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
 const srTracker = { id: 'sr-tickets', name: 'Space Rising, Tickets', scope: 'Space Rising', template: 'bugs', columns: ['Item', 'Priority', 'Status', 'Area', 'Owner'], rows, on: false, live: true }
        // STABLE SORT FIX: update Space Rising tracker in place to preserve list order (no re-insert on refresh)
        setTrackers(prev => {
          const hasSR = prev.some(t => t.id === 'sr-tickets')
          if (hasSR) {
            return prev.map(t => t.id !== 'sr-tickets' ? t : { ...t, rows })
          }
          // First load; insert at top
          return [srTracker, ...prev.filter(t => t.id !== 'sr-tickets')]
        })
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
        Priority: b.priority || 3,
        Page: b.page || '',
        Bug: b.title || '(untitled)',
        Expected: b.expected || '',
        Severity: (b.severity || '').replace(/^\w/, c => c.toUpperCase()),
        Status: b.status || 'Open',
        Owner: b.owner || '',
      }))
      const cv6Tracker = { id: 'cv6-bugs', name: 'CV6 Bugs', scope: 'Corner CV6', template: 'bugs', columns: ['Priority', 'Page', 'Bug', 'Expected', 'Severity', 'Status', 'Owner'], rows, on: true, live: true }
      // STABLE SORT FIX: never re-insert cv6Tracker on refresh; always update in place to preserve list order.
      // This prevents the tracker list from jumping when viewing. Background updates merge new rows by __id,
      // keeping the current sort order stable (rows within the tracker update; tracker position unchanged).
      setTrackers(prev => {
        const hasCV6 = prev.some(t => t.id === 'cv6-bugs')
        if (hasCV6) {
          // Tracker exists; update rows in place, preserve position in list
          return prev.map(t => t.id !== 'cv6-bugs' ? t : { ...t, rows })
        }
        // First load; insert cv6Tracker at top
        return [cv6Tracker, ...prev.filter(t => t.id !== 'cv6-bugs')]
      })
      setSelId(prev => (prev === 't1' || prev === 'sr-tickets') ? 'cv6-bugs' : prev)
    } catch { /* best-effort */ }
  }, [sheetFocused])
  useEffect(() => {
    pullBugs()
    const t = setInterval(pullBugs, 30000)
    return () => clearInterval(t)
  }, [pullBugs])

  // R-WIRE compose (Patrik 2026-06-19: "wire so trackers actually save + attachments +
  // assign/invite people"). One clean grouped new-bug / new-item form that matches
  // DESIGN-tracker.png: a big title + Status / Priority / Severity / Assignee rows + an
  // Attach row + a full-width Create button. cv6-bugs files via /api/dashboard/cv6-bugs
  // (owner = the assignee); a custom tracker files a row via /api/dashboard/trackers so
  // __assignee + __attachments persist. Files upload for real through
  // /api/dashboard/file-upload (returns a served URL), so an attachment is a real file.
  const blankDraft = { title: '', page: 'Homepage', expected: '', severity: 'Medium', priority: 3, status: 'Open', assignee: '', attachments: [] }
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState(blankDraft)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const openCompose = () => { setDraft(blankDraft); setAssigneeOpen(false); setComposing(true) }
  const onPickFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const data_base64 = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result).split(',')[1] || ''); fr.onerror = reject; fr.readAsDataURL(file) })
      const r = await authFetch('/api/dashboard/file-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ world: 'aom', filename: file.name, data_base64, mime_type: file.type || 'application/octet-stream' }) })
      if (r.ok) { const d = await r.json().catch(() => ({})); setDraft(dd => ({ ...dd, attachments: [...dd.attachments, { name: d.filename || file.name, path: d.url || '' }] })) }
    } catch { /* best effort; the file just will not attach */ } finally { setUploading(false) }
  }, [])
  const submitCompose = useCallback(async () => {
    const title = (draft.title || '').trim(); if (!title) return
    const cur = trackers.find(t => t.id === selId); if (!cur) return
    setSaving(true)
    try {
      if (cur.id === 'cv6-bugs') {
        // owner = whoever the filer actually picked. No default: an unassigned bug
        // lands unassigned (the API stores ''), it does not land on one person's
        // plate because nobody chose. Sending a default here would also re-supply
        // the one the API deliberately stopped applying.
        const r = await authFetch('/api/dashboard/cv6-bugs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', world: 'aom', page: draft.page, title, expected: draft.expected, severity: draft.severity, priority: draft.priority, owner: draft.assignee || '', attachments: draft.attachments }) })
        if (r.ok) { setComposing(false); await pullBugs() }
      } else {
        const sc = TRACKER_TEMPLATES[cur.template].statusCol
        const row = {}
        row[cur.columns[0]] = title
        if (sc) row[sc] = draft.status || 'Open'
        if (cur.columns.includes('Severity')) row.Severity = draft.severity
        if (cur.columns.includes('Owner')) row.Owner = draft.assignee
        if (cur.columns.includes('Expected')) row.Expected = draft.expected
        if (draft.assignee) row.__assignee = draft.assignee
        if (draft.attachments.length) row.__attachments = draft.attachments
        setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, rows: [...t.rows, row] }))
        setComposing(false)
        if (isCustom(selId)) await postTracker({ action: 'add-row', id: selId, row })
      }
    } finally { setSaving(false) }
  }, [draft, trackers, selId, pullBugs, postTracker])
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
  const updateBugPriority = useCallback(async (id, priority) => {
    if (!id) return
    const pr = parseInt(priority, 10)
    setTrackers(prev => prev.map(t => t.id !== 'cv6-bugs' ? t : { ...t, rows: t.rows.map(r => r.__id === id ? { ...r, Priority: pr } : r) }))
    try {
      await authFetch('/api/dashboard/cv6-bugs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', world: 'aom', id, priority: pr }),
      })
    } catch { /* optimistic; next poll reconciles */ }
  }, [])

  const sel = trackers.find(t => t.id === selId)
  const scopeName = (slug) => { const p = (projects || []).find(x => x.slug === slug); return p ? (p.name || p.slug) : slug }

  async function createTracker() {
    const name = draftName.trim(); if (!name) { setCreating(false); return }
    const tpl = TRACKER_TEMPLATES[draftTemplate]
    const rows = tpl.seed.map(r => ({ ...r }))
    const scope = scopeName(draftScope) || 'Unassigned'
    setCreating(false); setDraftName('')
    // Persist first so the returned tracker carries its real (trk-) id; fall back to a
    // local id if the store is unreachable so the UI still works this session.
    const res = await postTracker({ action: 'create', name, scope, template: draftTemplate, columns: tpl.columns, rows })
    const t = (res && res.tracker) ? res.tracker : { id: 'trk-local-' + Date.now().toString(36), name, scope, template: draftTemplate, columns: tpl.columns, rows, on: false }
    setTrackers(prev => [...prev, t]); setSelId(t.id); if (isNarrow) setMobilePane('sheet')
  }
  function setCell(rowIdx, col, val) {
    setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, rows: t.rows.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r) }))
    // Debounce per cell so typing doesn't spam the store. Only custom trackers persist
    // here (cv6-bugs / sr-tickets have their own endpoints).
    if (isCustom(selId)) {
      const key = `${selId}:${rowIdx}:${col}`
      clearTimeout(cellSaveTimers.current[key])
      cellSaveTimers.current[key] = setTimeout(() => { postTracker({ action: 'set-cell', id: selId, rowIdx, col, val }) }, 600)
    }
  }
  function addRow() {
    const cur = trackers.find(t => t.id === selId); if (!cur) return
    const row = Object.fromEntries(cur.columns.map(c => [c, c === TRACKER_TEMPLATES[cur.template].statusCol ? 'Open' : '']))
    setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, rows: [...t.rows, row] }))
    if (isCustom(selId)) postTracker({ action: 'add-row', id: selId, row })
  }
  function toggleOn() {
    setTrackers(prev => prev.map(t => t.id !== selId ? t : { ...t, on: !t.on }))
    if (isCustom(selId)) postTracker({ action: 'toggle', id: selId })
  }

  const statusCol = sel ? TRACKER_TEMPLATES[sel.template].statusCol : null

  // Collapsed: a slim pillar so the spreadsheet is the focus; click to expand.
  const SelectorCollapsed = () => (
    <div onClick={() => setSelectorCollapsed(false)} title="Show trackers" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0', borderRight: isNarrow ? 'none' : '1px solid var(--cv6-divider)', height: '100%', cursor: 'pointer', background: 'var(--cv6-surface)' }}>
      <button title="Show trackers" style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--cv6-text-secondary)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: '4px' }}>Trackers</span>
    </div>
  )
  const Selector = () => selectorCollapsed ? SelectorCollapsed() : (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: isNarrow ? 'none' : '1px solid var(--cv6-divider)', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--cv6-divider)', position: 'sticky', top: 0, background: 'var(--cv6-surface)' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)' }}>Trackers</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => { setCreating(true); setDraftName('') }} title="New tracker" style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onClick={() => setSelectorCollapsed(true)} title="Collapse trackers" style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
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
        <button key={t.id} onClick={() => { setSelId(t.id); if (isNarrow) setMobilePane('sheet') }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '11px 14px', margin: '2px 6px', borderRadius: '6px', border: '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', background: selId === t.id ? 'var(--cv6-accent-weak)' : 'transparent' }}
          onMouseEnter={(e) => { if (selId !== t.id) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={(e) => { if (selId !== t.id) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.on ? 'var(--cv6-accent-success)' : 'var(--cv6-text-tertiary)', flexShrink: 0 }} />
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
   if (composing) {
     const isBug = sel.id === 'cv6-bugs'
     const sc = TRACKER_TEMPLATES[sel.template].statusCol
     const hasPriority = isBug
     const hasSeverity = isBug || sel.columns.includes('Severity')
     // Assignees = YOU (the signed-in person) + this world's agents. The human
     // entry used to be the literal 'Patrik', so Ash and Courtney could not
     // assign anything to themselves and every world saw the same one name.
     // Resolve it from the session instead; if there is no session, the list is
     // just the agents rather than a person nobody verified.
     const meName = String(user?.user_metadata?.full_name || user?.full_name || user?.email?.split('@')[0] || '').trim()
     const people = Array.from(new Set([...(meName ? [meName] : []), ...((agents || []).map(a => a && a.name).filter(Boolean))])).slice(0, 12)
     const cycleSeverity = () => setDraft(d => ({ ...d, severity: { Low: 'Medium', Medium: 'High', High: 'Low' }[d.severity] || 'Medium' }))
     const cyclePriority = () => setDraft(d => ({ ...d, priority: (d.priority % 5) + 1 }))
     const cycleStatus = () => setDraft(d => ({ ...d, status: { 'Open': 'In progress', 'In progress': 'Done', 'Done': 'Open' }[d.status] || 'Open' }))
     const initials = (n) => (String(n)[0] + (String(n).split(' ')[1] ? String(n).split(' ')[1][0] : '')).toUpperCase()
     const rowStyle = { display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 15px', cursor: 'pointer', userSelect: 'none' }
     const labelStyle = { fontSize: '14px', color: 'var(--cv6-text-secondary)', flex: 1 }
     const valStyle = { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)' }
     const cardStyle = { borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)' }
     const divider = { height: '1px', background: 'var(--cv6-divider)', marginLeft: '15px' }
     const avatar = (n) => <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(91,155,255,0.2)', color: 'var(--cv6-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9.5px', fontWeight: '700', flexShrink: 0 }}>{initials(n)}</span>
     const chev = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
     return (
      <div style={isNarrow
        ? { position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', background: 'var(--cv6-ground)', paddingTop: 'env(safe-area-inset-top, 0px)' }
        : { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--cv6-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--cv6-divider)', flexShrink: 0 }}>
          <button onClick={() => setComposing(false)} style={{ border: 'none', background: 'transparent', color: 'var(--cv6-text-secondary)', fontFamily: 'inherit', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--cv6-text-primary)' }}>{isBug ? 'New bug' : 'New item'}</span>
          <button onClick={submitCompose} disabled={!draft.title.trim() || saving} style={{ border: 'none', background: 'transparent', color: draft.title.trim() ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-tertiary)', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', cursor: draft.title.trim() ? 'pointer' : 'default' }}>{saving ? 'Saving…' : 'Create'}</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input autoFocus value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submitCompose() }} placeholder={isBug ? 'What is wrong?' : 'Title'} style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '21px', fontWeight: '700', letterSpacing: '-0.01em', outline: 'none' }} />
            <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', marginTop: '5px' }}>Add detail, steps to reproduce, logs…</div>
          </div>
          {isBug && (
            <input value={draft.expected} onChange={e => setDraft(d => ({ ...d, expected: e.target.value }))} placeholder="What should happen instead?" style={{ width: '100%', padding: '12px 14px', borderRadius: '11px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
          )}
          <div style={cardStyle}>
            <div style={{ ...rowStyle, cursor: 'default' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
              <span style={labelStyle}>Tracker</span>
              <span style={valStyle}>{sel.name}</span>
            </div>
            {sc && (<><div style={divider} /><div style={rowStyle} onClick={cycleStatus}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
              <span style={labelStyle}>Status</span>
              <span style={valStyle}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLORS[draft.status] || 'var(--cv6-accent-primary)' }} />{draft.status}</span>{chev}
            </div></>)}
            {hasPriority && (<><div style={divider} /><div style={rowStyle} onClick={cyclePriority}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
              <span style={labelStyle}>Priority</span>
              <span style={valStyle}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: PRIORITY_COLORS[draft.priority] || 'var(--cv6-text-primary)' }} />P{draft.priority}</span>{chev}
            </div></>)}
            {hasSeverity && (<><div style={divider} /><div style={rowStyle} onClick={cycleSeverity}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={labelStyle}>Severity</span>
              <span style={valStyle}>{draft.severity}</span>{chev}
            </div></>)}
          </div>
          <div style={cardStyle}>
            <div style={rowStyle} onClick={() => setAssigneeOpen(v => !v)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style={labelStyle}>Assignee</span>
              {draft.assignee ? (<span style={valStyle}>{avatar(draft.assignee)}{draft.assignee}</span>) : (<span style={{ ...valStyle, color: 'var(--cv6-text-tertiary)', fontWeight: '500' }}>Unassigned</span>)}
              {chev}
            </div>
            {assigneeOpen && (
              <div style={{ borderTop: '1px solid var(--cv6-divider)', padding: '6px' }}>
                {people.map(p => (
                  <button key={p} onClick={() => { setDraft(d => ({ ...d, assignee: d.assignee === p ? '' : p })); setAssigneeOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: '9px', border: 'none', background: draft.assignee === p ? 'var(--cv6-accent-weak)' : 'transparent', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '13.5px', cursor: 'pointer' }}>
                    {avatar(p)}{p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <label style={{ ...rowStyle, cursor: uploading ? 'default' : 'pointer' }}>
              <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onPickFile(f) }} />
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span style={{ ...labelStyle, color: 'var(--cv6-text-primary)', flex: 'unset' }}>{uploading ? 'Uploading…' : 'Attach screenshot or log'}</span>
            </label>
            {draft.attachments.length > 0 && (
              <div style={{ borderTop: '1px solid var(--cv6-divider)', padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {draft.attachments.map((a, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--cv6-text-secondary)', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '8px', padding: '5px 9px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {a.name}
                    <span onClick={() => setDraft(d => ({ ...d, attachments: d.attachments.filter((_, j) => j !== i) }))} style={{ cursor: 'pointer', color: 'var(--cv6-text-tertiary)', fontWeight: '700' }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--cv6-divider)', flexShrink: 0, paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={submitCompose} disabled={!draft.title.trim() || saving} style={{ width: '100%', height: '48px', borderRadius: '13px', border: 'none', background: draft.title.trim() ? 'var(--cv6-accent-primary)' : 'var(--cv6-divider)', color: '#fff', fontFamily: 'inherit', fontSize: '15px', fontWeight: '700', cursor: draft.title.trim() ? 'pointer' : 'default', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : `Create ${isBug ? 'bug' : 'item'} in ${sel.name}`}</button>
        </div>
      </div>
     )
   }
   const gridTemplate = sel.columns.map(trackerColTrack).join(' ')
   return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '20px 24px 16px', borderBottom: '1px solid var(--cv6-divider)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--cv6-accent-success)', flexShrink: 0 }} />
            <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.01em', color: 'var(--cv6-text-primary)' }}>{sel.name}</span>
            {sel.columns && sel.columns.length > 0 && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cv6-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            )}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--cv6-text-secondary)', marginTop: '3px' }}>{sel.scope} · {sel.id === 'cv6-bugs' ? 'Bug tracker' : 'Tracker'} · {sel.rows.length} {sel.rows.length === 1 ? 'item' : 'items'} open</div>
        </div>
        <button onClick={openCompose} style={{ height: '38px', padding: '0 16px', borderRadius: '10px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', fontSize: '13.5px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          {sel.id === 'cv6-bugs' ? 'New bug' : 'New item'}
        </button>
      </div>
      {sel.on && <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--cv6-accent-success)', background: 'var(--cv6-accent-success-weak)', borderBottom: '1px solid var(--cv6-divider)' }}>Agent is watching this tracker and working items toward done.</div>}
      <div style={{ flex: 1, overflow: 'auto' }} onMouseEnter={() => setSheetFocused(true)} onMouseLeave={() => setSheetFocused(false)}>
        <div>
          <div style={{ display: isNarrow ? 'none' : 'flex', alignItems: 'center', height: '34px', borderBottom: '1px solid var(--cv6-divider)', paddingLeft: '24px', paddingRight: '24px', position: 'sticky', top: 0, background: 'var(--cv6-surface)', zIndex: 1, fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)' }}>
            {sel.columns.length > 0 && (
              <>
                <div style={{ flex: 1, cursor: 'pointer', userSelect: 'none' }} onClick={() => { setSortDir(d => sortCol === sel.columns[0] ? -d : 1); setSortCol(sel.columns[0]); setExpandedRow(null) }}>
                  {sel.columns[0]}{sortCol === sel.columns[0] ? <span style={{ fontSize: '9px', marginLeft: '4px' }}>{sortDir === 1 ? '▲' : '▼'}</span> : null}
                </div>
                {sel.columns.slice(1).map((c, i) => {
                  const WIDTHS = { Status: '120px', Priority: '100px', Assignee: '120px', Updated: '70px', Owner: '120px', Area: '120px', Severity: '100px', Page: '100px', Bug: 'auto', Expected: '140px', Item: 'auto' }
                  const w = WIDTHS[c] || '100px'
                  return (
                    <div key={c} style={{ width: w, flex: w === 'auto' ? 1 : 'none', cursor: 'pointer', userSelect: 'none', paddingRight: '12px' }} onClick={() => { setSortDir(d => sortCol === c ? -d : 1); setSortCol(c); setExpandedRow(null) }}>
                      {c}{sortCol === c ? <span style={{ fontSize: '9px', marginLeft: '4px' }}>{sortDir === 1 ? '▲' : '▼'}</span> : null}
                    </div>
                  )
                })}
              </>
            )}
          </div>
          {(() => {
            // Sort a decorated copy so inline edit + expand still reference the
            // original row index. Severity/Status sort by rank, others A-Z.
            const RANK = { Severity: { High: 0, Medium: 1, Low: 2 }, Status: { Open: 0, 'In progress': 1, Done: 2 } }
            const decorated = sel.rows.map((row, origIndex) => ({ row, origIndex }))
            const cmp = (a, b, col, dir) => {
              if (col === 'Priority') return ((Number(a.row.Priority) || 3) - (Number(b.row.Priority) || 3)) * dir
              const av = a.row[col] == null ? '' : a.row[col]
              const bv = b.row[col] == null ? '' : b.row[col]
              const rmap = RANK[col]
              const c = rmap ? ((rmap[av] ?? 99) - (rmap[bv] ?? 99)) : String(av).localeCompare(String(bv))
              return c * dir
            }
            let displayRows
            if (sortCol) {
              displayRows = [...decorated].sort((a, b) => cmp(a, b, sortCol, sortDir))
            } else if (sel.id === 'cv6-bugs') {
              // Default: what's now at the top. Done sinks; then by priority 1->5; then status.
              const doneZ = (x) => (String(x.row.Status).toLowerCase() === 'done' ? 1 : 0)
              displayRows = [...decorated].sort((a, b) =>
                (doneZ(a) - doneZ(b)) || cmp(a, b, 'Priority', 1) || cmp(a, b, 'Status', 1))
            } else {
              displayRows = decorated
            }
            return displayRows.map(({ row, origIndex }) => {
            const ri = origIndex
            const isExp = expandedRow === ri
            const isSelected = expandedRow === ri && sel.live
            // Desktop shows the selected bug in the right detail pane (matches the design's
            // 3-pane layout); only mobile expands the row inline since it has no room for a pane.
            const inlineExpand = isExp && isNarrow
            if (isNarrow) {
              // Mobile: the desktop flex-table overlaps at 390px (fixed-width Page/
              // Expected/Severity/Status/Owner columns blow past the viewport). Stack
              // each row into a card — description first, status chip, priority dot,
              // then a wrapped meta line — the way the Command ledger reflows. Tap to
              // expand the full Expected text.
              const titleColM = sel.id === 'cv6-bugs' ? 'Bug' : sel.columns[0]
 const titleM = row[titleColM] || '·'
              const cv6idM = sel.id === 'cv6-bugs' && row.__id ? `CV6-${(String(row.__id).charCodeAt(0) * 137) % 999}` : null
              const sValM = row[statusCol] || 'Open'
              const metaColsM = sel.columns.filter(c => c !== titleColM && c !== statusCol && c !== 'Expected')
              return (
                <div key={ri} onClick={sel.live ? () => setExpandedRow(isExp ? null : ri) : undefined}
                  style={{ display: 'flex', flexDirection: 'column', gap: '7px', padding: '13px 18px', borderBottom: '1px solid var(--cv6-divider)', cursor: sel.live ? 'pointer' : 'default', background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent', transition: 'background 120ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                    {sel.id === 'cv6-bugs' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '5px', flexShrink: 0, background: PRIORITY_COLORS[row.Priority || 3] || 'var(--cv6-text-tertiary)' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)', lineHeight: 1.35 }}>{titleM}</div>
                      {cv6idM && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--cv6-text-secondary)', marginTop: '2px' }}>{cv6idM}</div>}
                    </div>
                    <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: '600', color: STATUS_COLORS[sValM] || 'var(--cv6-text-primary)', background: STATUS_BG_COLORS[sValM] || 'var(--cv6-accent-weak)', padding: '3px 9px', borderRadius: '13px', whiteSpace: 'nowrap' }}>{sValM}</span>
                  </div>
                  {metaColsM.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontSize: '12px', color: 'var(--cv6-text-secondary)', paddingLeft: sel.id === 'cv6-bugs' ? '17px' : '0' }}>
                      {metaColsM.map(c => {
                        const v = c === 'Priority' ? `P${row.Priority || 3}` : row[c]
                        if (v == null || v === '') return null
                        return <span key={c}>{c === 'Priority' ? '' : <span style={{ color: 'var(--cv6-text-tertiary)' }}>{c} </span>}{v}</span>
                      })}
                    </div>
                  )}
                  {inlineExpand && row.Expected && (
                    <div style={{ fontSize: '13px', color: 'var(--cv6-text-primary)', lineHeight: 1.45, paddingLeft: sel.id === 'cv6-bugs' ? '17px' : '0' }}>
                      <span style={{ color: 'var(--cv6-text-tertiary)' }}>Expected </span>{row.Expected}
                    </div>
                  )}
                </div>
              )
            }
            return (
            <div key={ri} onClick={sel.live ? () => setExpandedRow(isExp ? null : ri) : undefined} style={{ display: 'flex', alignItems: 'center', minHeight: '60px', paddingTop: '11px', paddingBottom: '11px', borderBottom: '1px solid var(--cv6-divider)', paddingLeft: '24px', paddingRight: '24px', cursor: sel.live ? 'pointer' : 'default', background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent', outline: isSelected ? '2px solid var(--cv6-accent-primary)' : 'none', outlineOffset: isSelected ? '-2px' : 'auto', margin: inlineExpand ? '0 -8px' : '0', borderRadius: inlineExpand ? '8px' : '0', transition: 'background 120ms ease' }}>
              {sel.columns.length > 0 && (
                <>
                  <div key={sel.columns[0]} style={{ flex: 1, minWidth: 0, paddingRight: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>
 <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[sel.columns[0]] || ', '}</div>
                    {sel.id === 'cv6-bugs' && row.__id && (
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--cv6-text-secondary)', marginTop: '2px' }}>CV6-{(String(row.__id).charCodeAt(0) * 137) % 999}</div>
                    )}
                  </div>
                  {sel.columns.slice(1).map(c => {
                    const WIDTHS = { Status: '120px', Priority: '100px', Assignee: '120px', Updated: '70px', Owner: '120px', Area: '120px', Severity: '100px', Page: '100px', Expected: '140px', Item: 'auto' }
                    const w = WIDTHS[c] || '100px'
                    // Render specific column content
                    const renderCell = () => {
                      if (sel.id === 'cv6-bugs' && c === 'Priority') {
                        // Priority with inline-adjustable selector
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: PRIORITY_COLORS[row.Priority || 3] || 'var(--cv6-text-primary)' }} />
                            <select value={row.Priority || 3} onChange={e => updateBugPriority(row.__id, e.target.value)} onClick={e => e.stopPropagation()} style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer', color: 'var(--cv6-text-primary)', fontWeight: '600', outline: 'none', appearance: 'none', padding: 0 }}>
                              {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>P{p}</option>)}
                            </select>
                          </div>
                        )
                      } else if (c === statusCol) {
                        // Status column
                        if (sel.id === 'cv6-bugs') {
                          return (
                            <select value={row[c] || 'Open'} onChange={e => updateBugStatus(row.__id, e.target.value)} onClick={e => e.stopPropagation()} style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '11.5px', cursor: 'pointer', fontWeight: '600', color: STATUS_COLORS[row[c]] || 'var(--cv6-text-primary)', outline: 'none', appearance: 'none', padding: '3px 9px', borderRadius: '13px' }}>
                              {['Open', 'In progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )
                        } else if (sel.live) {
                          return (
                            <div style={{ display: 'inline-flex', fontSize: '11.5px', fontWeight: '600', color: STATUS_COLORS[row[c]] || 'var(--cv6-text-primary)', background: STATUS_BG_COLORS[row[c]] || 'transparent', padding: '3px 9px', borderRadius: '13px' }}>
                              {row[c] || 'Open'}
                            </div>
                          )
                        } else {
                          return (
                            <select value={row[c] || 'Open'} onChange={e => setCell(ri, c, e.target.value)} onClick={e => e.stopPropagation()} style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer', color: STATUS_COLORS[row[c]] || 'var(--cv6-text-primary)', fontWeight: '600', outline: 'none', appearance: 'none', padding: 0 }}>
                              {['Open', 'In progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )
                        }
                      } else if (c === 'Assignee' && sel.live) {
                        // Assignee avatar + name
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {row[c] && (
                              <>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(91, 155, 255, 0.2)', color: 'var(--cv6-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9.5px', fontWeight: '700', flexShrink: 0 }}>
                                  {(String(row[c])[0] + (String(row[c]).split(' ')[1] ? String(row[c]).split(' ')[1][0] : '')).toUpperCase()}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--cv6-text-primary)' }}>{row[c]}</span>
                              </>
                            )}
                          </div>
                        )
                      } else if (c === 'Updated' && sel.live) {
                        // Time-ago format
                        return (
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: 'var(--cv6-text-secondary)' }}>
 {row[c] || '·'}
                          </div>
                        )
                      } else {
                        // Generic content
                        return sel.live ? (
                          <div style={{ fontSize: '13px', color: 'var(--cv6-text-primary)', overflow: 'hidden', display: inlineExpand ? 'block' : '-webkit-box', WebkitLineClamp: inlineExpand ? 'none' : 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
 {row[c] || '·'}
                          </div>
                        ) : (
 <input value={row[c] || ''} onChange={e => setCell(ri, c, e.target.value)} onClick={e => e.stopPropagation()} placeholder=", " style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', color: 'var(--cv6-text-primary)', outline: 'none', width: '100%' }} />
                        )
                      }
                    }

                    return (
                      <div key={c} style={{ width: w, flex: w === 'auto' ? 1 : 'none', paddingRight: '12px', minWidth: 0 }}>
                        {renderCell()}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )})
          })()}
        </div>
      </div>
    </div>
   )
  }

  // Right detail pane — the selected bug/row rendered as a focused card (matches the
  // design's 3rd column). Real row fields; status is changeable from here too.
  const Detail = () => {
    if (expandedRow == null || !sel) return null
    const row = sel.rows[expandedRow]
    if (!row) return null
    const isBug = sel.id === 'cv6-bugs'
    const titleCol = isBug ? 'Bug' : sel.columns[0]
 const title = row[titleCol] || '·'
    const cv6id = isBug && row.__id ? `CV6-${(String(row.__id).charCodeAt(0) * 137) % 999}` : null
    const statusVal = row[statusCol] || 'Open'
    const fieldCols = sel.columns.filter(c => c !== titleCol && c !== statusCol)
    const statusSelectStyle = { width: '100%', padding: '11px 12px', borderRadius: '9px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', outline: 'none' }
    const onStatus = (val) => { if (isBug) updateBugStatus(row.__id, val); else setCell(expandedRow, statusCol, val) }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', borderLeft: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', padding: '18px 18px 14px', borderBottom: '1px solid var(--cv6-divider)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--cv6-text-primary)', lineHeight: 1.3 }}>{title}</div>
            {cv6id && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--cv6-text-secondary)', marginTop: '4px' }}>{cv6id}</div>}
          </div>
          <button onClick={() => setExpandedRow(null)} title="Close" style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {fieldCols.map(c => {
            const val = row[c]
            if (val == null || val === '') return null
            return (
              <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-tertiary)' }}>{c}</span>
                {c === 'Severity' ? (
                  <span style={{ alignSelf: 'flex-start', fontSize: '12.5px', fontWeight: '600', color: STATUS_COLORS[val] || 'var(--cv6-text-primary)' }}>{val}</span>
                ) : c === 'Priority' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--cv6-text-primary)' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: PRIORITY_COLORS[val || 3] || 'var(--cv6-text-primary)' }} />P{val}
                  </span>
                ) : (c === 'Owner' || c === 'Assignee') ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--cv6-text-primary)' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(91, 155, 255, 0.2)', color: 'var(--cv6-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9.5px', fontWeight: '700', flexShrink: 0 }}>{(String(val)[0] + (String(val).split(' ')[1] ? String(val).split(' ')[1][0] : '')).toUpperCase()}</span>
                    {val}
                  </span>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--cv6-text-primary)', lineHeight: 1.45 }}>{val}</span>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--cv6-divider)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-tertiary)' }}>Change status</span>
          <select value={statusVal} onChange={e => onStatus(e.target.value)} style={statusSelectStyle}>
            {['Open', 'In progress', 'Done'].map(s => <option key={s} value={s} style={{ color: 'var(--cv6-text-primary)', background: 'var(--cv6-surface)' }}>{s}</option>)}
          </select>
        </div>
      </div>
    )
  }
  const detailOpen = !isNarrow && expandedRow != null && !!sel

  return (
   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {srStatus === 'needs_key' && (
      <div style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '8px', padding: '10px 14px' }}>
        Space Rising live tracker is wired and ready. It needs its data key added to the dashboard settings to switch on.
      </div>
    )}
    <div style={{ height: isNarrow ? '64vh' : (tall ? '82vh' : '440px'), minHeight: '360px', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)', display: isNarrow ? 'block' : 'grid', gridTemplateColumns: isNarrow ? undefined : ((selectorCollapsed ? '40px' : '230px') + ' minmax(0, 1fr)' + (detailOpen ? ' 340px' : '')), gridTemplateRows: isNarrow ? undefined : 'minmax(0, 1fr)', transition: 'grid-template-columns 160ms ease, height 160ms ease' }}>
      {isNarrow ? (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {mobilePane === 'sheet' && !composing && (
            <button onClick={() => setMobilePane('list')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Trackers
            </button>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'list' ? Selector() : Sheet()}</div>
        </div>
      ) : (<>{Selector()}{Sheet()}{detailOpen ? Detail() : null}</>)}
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
// Resolve a preview kind from a node. Callers (e.g. the Review modal) may pass a
// node WITHOUT fileType, so we always fall back to the filename extension. This is
// why images/PDFs used to break in Review: no fileType -> everything fetched as text.
function previewKind(node) {
  if (!node) return 'text'
  const ext = String(node.name || '').toLowerCase().split('.').pop()
  if (node.fileType === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(ext)) return 'image'
  if (node.fileType === 'video' || ['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video'
  if (node.fileType === 'audio' || ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  return 'text'
}

// R59 (Patrik): make text/markdown read like an article — inject the typographic
// rules once. Targets the markdown the ChatMessageRenderer emits inside .cv6-article.
if (typeof document !== 'undefined' && !document.getElementById('cv6-article-style')) {
  const s = document.createElement('style')
  s.id = 'cv6-article-style'
  s.textContent = `
  .cv6-article .cmr-content { font-size: 15px; line-height: 1.72; }
  .cv6-article .cmr-content h1 { font-size: 1.7em; font-weight: 700; line-height: 1.2; margin: 0 0 .5em; letter-spacing: -0.01em; }
  .cv6-article .cmr-content h2 { font-size: 1.32em; font-weight: 700; line-height: 1.25; margin: 1.5em 0 .5em; }
  .cv6-article .cmr-content h3 { font-size: 1.12em; font-weight: 700; margin: 1.3em 0 .4em; }
  .cv6-article .cmr-content p { margin: 0 0 1em; }
  .cv6-article .cmr-content ul, .cv6-article .cmr-content ol { margin: 0 0 1em; padding-left: 1.4em; }
  .cv6-article .cmr-content li { margin: .35em 0; }
  .cv6-article .cmr-content li > ul, .cv6-article .cmr-content li > ol { margin: .35em 0; }
  .cv6-article .cmr-content blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid var(--cv6-divider); color: var(--cv6-text-secondary); }
  .cv6-article .cmr-content table { border-collapse: collapse; width: 100%; margin: 0 0 1.2em; font-size: 0.95em; }
  .cv6-article .cmr-content th, .cv6-article .cmr-content td { border: 1px solid var(--cv6-divider); padding: 7px 10px; text-align: left; vertical-align: top; word-break: normal; overflow-wrap: normal; }
  .cv6-article .cmr-content th { background: var(--cv6-surface-hover); font-weight: 700; }
  .cv6-article .cmr-content hr { border: none; border-top: 1px solid var(--cv6-divider); margin: 1.6em 0; }
  .cv6-article .cmr-content code { font-size: 0.9em; }
  `
  document.head.appendChild(s)
}

function FilePreviewPanel({ node, worldId, annotate, bare }) {
  const [data, setData] = useState({ state: 'idle' })
  const [zoom, setZoom] = useState(false)
  const kind = previewKind(node)
  useEffect(() => { setZoom(false) }, [node && node.path])
  useEffect(() => {
    if (!node || node.type === 'folder' || !node.path) { setData({ state: 'idle' }); return }
    let active = true; let objUrl = null
    const isBinary = kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'pdf'
    setData({ state: 'loading' })
    const url = `/api/dashboard/project-file?path=${encodeURIComponent(node.path)}${isBinary ? '&raw=1' : ''}`
    authFetch(url).then(async (r) => {
      if (!r.ok) throw new Error('load')
      if (isBinary) { const b = await r.blob(); objUrl = URL.createObjectURL(b); if (active) setData({ state: 'media', url: objUrl }) }
      else { const j = await r.json(); if (active) setData({ state: 'text', text: typeof j.content === 'string' ? j.content : '' }) }
    }).catch(() => { if (active) setData({ state: 'error' }) })
    return () => { active = false; if (objUrl) URL.revokeObjectURL(objUrl) }
  }, [node && node.path, kind])

  const hint = (t) => <div style={{ padding: '14px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>{t}</div>
  if (!node) return hint('Select a file to preview')
  if (node.type === 'folder') return hint((node.children || []).length ? `${node.children.length} items inside` : 'Empty folder')
  const chip = kind === 'pdf' ? 'pdf' : (node.fileType || kind)
  const color = FILE_TYPE_COLOR[chip] || FILE_TYPE_COLOR.doc
  return (
    <div style={{ padding: bare ? '0' : '14px', minWidth: 0 }}>
      {/* `bare` drops the internal name + type chip when the surrounding container
          already shows them (e.g. the mobile Review sheet header) so the filename
          doesn't render twice. */}
      {!bare && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cv6-text-primary)', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{node.name}</span>
        <span style={{ fontSize: '10px', fontWeight: '700', color, background: `${color}1f`, padding: '2px 7px', borderRadius: '5px', textTransform: 'uppercase', flexShrink: 0 }}>{chip}</span>
      </div>
      )}
      {data.state === 'loading' && hint('Loading…')}
      {data.state === 'error' && <div style={{ fontSize: '13px', color: '#ef4444' }}>Could not open this file.</div>}
      {data.state === 'media' && kind === 'image' && (annotate ? (
        <FileAnnotator node={node} worldId={worldId} kind="image" url={data.url} />
      ) : (
        <>
          <img src={data.url} alt={node.name} onClick={() => setZoom(true)} title="Click to zoom" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', cursor: 'zoom-in' }} />
          {zoom && (
            <div onClick={() => setZoom(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '24px' }}>
              <img src={data.url} alt={node.name} style={{ maxWidth: '96vw', maxHeight: '94vh', objectFit: 'contain', borderRadius: '6px' }} />
            </div>
          )}
        </>
      ))}
      {data.state === 'media' && kind === 'video' && (annotate ? (
        <FileAnnotator node={node} worldId={worldId} kind="video" url={data.url} />
      ) : (
        <video src={data.url} controls style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
      ))}
      {data.state === 'media' && kind === 'audio' && <audio src={data.url} controls style={{ width: '100%' }} />}
      {data.state === 'media' && kind === 'pdf' && (
        <div>
          <iframe src={`${data.url}#zoom=page-width`} title={node.name} style={{ width: '100%', height: '74vh', border: '1px solid var(--cv6-divider)', borderRadius: '8px', background: 'var(--cv6-surface)', display: 'block' }} />
          <a href={data.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: 'var(--cv6-accent-primary)', textDecoration: 'none' }}>Open full size (zoom) →</a>
        </div>
      )}
      {/* R58/R59 (Patrik): text/markdown reads like an article — roomy type, a comfortable
          measure, and the heading/list/table hierarchy from the injected .cv6-article CSS. */}
      {data.state === 'text' && (annotate ? (
        <FileAnnotator node={node} worldId={worldId} kind="text" text={data.text} />
      ) : (
        <article className="cv6-article" style={{ color: 'var(--cv6-text-primary)', overflowWrap: 'break-word', maxWidth: '72ch' }}>
          <ChatMessageRenderer content={data.text || '(empty file)'} />
        </article>
      ))}
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
    const check = () => setIsNarrow(window.innerWidth <= 1024)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => { setSel1(null); setSel2(null); setMobileCol(0) }, [proj])

  // R88/R107: load the REAL file tree for the selected project and refresh every
  // 10s so files an agent lands on disk appear live within Patrik's "10 or so is
  // fine" bar (was 12s). Falls back to sample data on the no-backend gallery.
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
    const t = setInterval(load, 10000)
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
        <ResizableBox minHeight={420} storageKey="files-tool">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: '100%', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
            <Col1 /><Col2 /><Col3 />
          </div>
        </ResizableBox>
      )}
    </div>
  )
}

// R-QA 2026-06-19: Organize desktop = the Claude design's 3 columns at once —
// PROJECTS (left) | that project's FILES (middle) | PREVIEW (right, reads the file
// you clicked). Composes the already-wired real-data pieces: project-files API ->
// realFileTree, and FilePreviewPanel (real content, no placeholder). Replaces the
// old Projects|Files toggle that showed one view at a time with no preview.
function OrganizeBrowser({ projects }) {
  const list = projects || []
  const [proj, setProj] = useState(list[0] || null)
  const [tree, setTree] = useState([])
  const [selFile, setSelFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  // R-MATCH-KIT 2026-06-20: mobile Files/Projects segmented toggle (kit ui_kits/tools/organize.html)
  const [mobileTab, setMobileTab] = useState('files')
  const projPickedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsNarrow(window.innerWidth <= 900)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  useEffect(() => { setSelFile(null) }, [proj])
  useEffect(() => {
    if (!proj || !proj.slug) { setTree(buildFileTree(proj)); return }
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const r = await authFetch(`/api/dashboard/project-files?slug=${encodeURIComponent(proj.slug)}`)
        if (!active) return
        if (!r.ok) { setTree([]); return }
        const d = await r.json()
        setTree(realFileTree(d))
      } catch { if (active) setTree([]) }
      finally { if (active) setLoading(false) }
    }
    load()
    const t = setInterval(load, 12000)
    return () => { active = false; clearInterval(t) }
  }, [proj])
  // On mobile, picking a project jumps to its Files view (kit toggle UX). Ref-guarded
  // so the initial default-project selection on mount does not auto-switch tabs.
  useEffect(() => { if (projPickedRef.current) setMobileTab('files'); else projPickedRef.current = true }, [proj])

  // Flatten the tree into file rows (top-level files + files inside folders/missions,
  // tagged with their group) so the middle column reads like the design's flat file list.
  const flatFiles = []
  const walk = (nodes, group) => (nodes || []).forEach(n => {
    if (n.type === 'file') flatFiles.push({ ...n, group })
    else walk(n.children, n.name)
  })
  walk(tree, null)
  const fileCount = flatFiles.length
  // Desktop keeps a real file selected so the Preview column is never an empty void
  // (the kit's Organize always shows a selected file + rendered preview). Re-pick the
  // first file when the project changes; keep the user's pick while it is still in view.
  useEffect(() => {
    if (isNarrow) return
    if (!flatFiles.length) { if (selFile) setSelFile(null); return }
    if (!selFile || !flatFiles.some(f => f.path === selFile.path)) setSelFile(flatFiles[0])
  }, [isNarrow, proj, fileCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const colStyle = { display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto', borderRight: '1px solid var(--cv6-divider)' }
  const headStyle = { flexShrink: 0, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-text-secondary)', padding: '12px 14px', position: 'sticky', top: 0, background: 'var(--cv6-surface)', borderBottom: '1px solid var(--cv6-divider)', zIndex: 1 }
  const emptyHint = (t) => <div style={{ padding: '14px', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>{t}</div>

  const ProjRow = (p) => {
    const active = proj && proj.slug === p.slug
    return (
      <button key={p.slug} onClick={() => setProj(p)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '9px 14px', margin: '2px 6px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? 'var(--cv6-accent-weak)' : 'transparent' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ flexShrink: 0, color: `hsl(${roomHueOf(p.slug)},65%,60%)`, display: 'inline-flex' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || p.slug}</span>
      </button>
    )
  }
  const FileRow = (f, i) => {
    const active = selFile && selFile.path === f.path
    const color = FILE_TYPE_COLOR[f.fileType] || 'var(--cv6-text-secondary)'
    return (
      <button key={f.path || i} onClick={() => setSelFile(f)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '8px 12px', margin: '2px 6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? 'var(--cv6-accent-weak)' : 'transparent' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ flexShrink: 0, color, display: 'inline-flex' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: '13.5px', fontWeight: '600', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
        {f.group ? <span style={{ flexShrink: 0, fontSize: '10px', color: 'var(--cv6-text-tertiary)' }}>{f.group}</span> : null}
      </button>
    )
  }

  const projCol = <div style={colStyle}><div style={headStyle}>Projects</div>{list.length ? list.map(ProjRow) : emptyHint('No projects')}</div>
  // Kit Files header (organize.html:63) is a title row, not an eyebrow: project
  // name 15px/600/fg on the left, "N files" in mono on the right.
  const filesHeadStyle = { ...headStyle, padding: '16px 16px 12px', textTransform: 'none', letterSpacing: 'normal', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }
  const filesCol = <div style={colStyle}><div style={filesHeadStyle}>{proj ? (<><span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name || proj.slug}</span><span style={{ fontFamily: 'var(--cv6-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)', fontSize: '11.5px', color: 'var(--cv6-text-tertiary)', flexShrink: 0 }}>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span></>) : <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--cv6-text-primary)' }}>Files</span>}</div>{loading && !flatFiles.length ? emptyHint('Loading…') : flatFiles.length ? flatFiles.map(FileRow) : emptyHint('No files yet')}</div>
  const previewCol = <div style={{ ...colStyle, borderRight: 'none' }}><div style={headStyle}>Preview</div><FilePreviewPanel node={selFile} /></div>

  if (isNarrow) {
    // R-MATCH-KIT 2026-06-20: mobile Organize = a Files/Projects segmented toggle
    // (kit ui_kits/tools/organize.html line 95) that switches the view, not three
    // stacked columns. Files = the current project's files (tap a file -> preview
    // with a back row); Projects = pick a project, which jumps you to its Files.
    const wrap = (child, cap) => <div className="hm-organize-grid" style={{ border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)', maxHeight: cap, overflowY: 'auto' }}>{child}</div>
    const seg = (label, val) => (
      <button onClick={() => { setMobileTab(val); if (val === 'projects') setSelFile(null) }}
        style={{ flex: 1, height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 600, background: mobileTab === val ? 'var(--cv6-accent-primary)' : 'transparent', color: mobileTab === val ? '#fff' : 'var(--cv6-text-secondary)', transition: 'background 120ms ease' }}>{label}</button>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--cv6-surface-2)', borderRadius: '11px', padding: '4px' }}>
          {seg('Files', 'files')}{seg('Projects', 'projects')}
        </div>
        {mobileTab === 'projects'
          ? wrap(projCol, '62vh')
          : selFile
            ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => setSelFile(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 2px', background: 'transparent', border: 'none', color: 'var(--cv6-accent-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
                  Files
                </button>
                {wrap(previewCol, 'none')}
              </div>
            )
            : wrap(filesCol, '62vh')}
      </div>
    )
  }
  return (
    <ResizableBox minHeight={460} storageKey="organize-browser">
      <div className="hm-organize-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,280px) minmax(320px,380px) minmax(0,1fr)', height: '100%', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)' }}>
        {projCol}{filesCol}{previewCol}
      </div>
    </ResizableBox>
  )
}

// R60 (Patrik): every tool surface (and the quick chat) keeps its designed height by
// default but can be dragged TALLER from the bottom edge — never shorter than the design.
// The child fills 100% height; we own the height and a grab handle at the bottom.
function ResizableBox({ minHeight = 320, storageKey, style, children }) {
  const key = storageKey ? 'cv6-rh-' + storageKey : null
  const [h, setH] = useState(() => {
    if (key && typeof window !== 'undefined') { const v = parseInt(window.localStorage.getItem(key) || '', 10); if (v >= minHeight) return v }
    return minHeight
  })
  // Keep at least the designed minimum even if the design grows later.
  useEffect(() => { setH(prev => Math.max(prev, minHeight)) }, [minHeight])
  const start = useRef(null)
  const onDown = (e) => {
    e.preventDefault()
    start.current = { y: e.clientY, h }
    const move = (ev) => {
      const next = Math.max(minHeight, Math.round(start.current.h + (ev.clientY - start.current.y)))
      setH(next)
      if (key) { try { window.localStorage.setItem(key, String(next)) } catch (_) { /* ignore */ } }
    }
    const up = () => {
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }
  return (
    <div style={{ position: 'relative', height: h + 'px', ...style }}>
      {children}
      <div onMouseDown={onDown} title="Drag to make taller" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '12px', cursor: 'ns-resize', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', zIndex: 3 }}>
        <div style={{ width: '44px', height: '4px', borderRadius: '2px', background: 'var(--cv6-divider)' }} />
      </div>
    </div>
  )
}

// R40: CHAT tool — the old 3-pane room view rebuilt inside the new tool window.
// LEFT rooms list + inline create form · MIDDLE the room's full chat · RIGHT the room's files.
function ChatToolOverlay({ projects, missionsByProject, agents, initialRoom, onCreateProject, onCreateMission, onSend, onClose, worldId }) {
  const rooms = useMemo(() => {
    const ag = (agents || []).map(a => ({ kind: 'agent', slug: a.slug, name: a.name || a.slug }))
    const pr = (projects || []).map(p => ({ kind: 'project', slug: p.slug, name: p.name || p.slug }))
    return [...ag, ...pr]
  }, [agents, projects])
  // R55: open preselected to the room the user jumped from (match by kind+slug so we reuse the
  // real room object; fall back to the passed room, then the first room).
  const matchInitial = () => initialRoom ? (rooms.find(r => r.kind === initialRoom.kind && r.slug === initialRoom.slug) || initialRoom) : null
  const [sel, setSel] = useState(matchInitial() || rooms[0] || null)
  useEffect(() => {
    const m = matchInitial(); if (m) setSel(m)
    // R62: when opened on a mission, drill the left column into its project so the
    // browser shows that project's missions in context; agent/project open at the root.
    if (initialRoom && initialRoom.kind === 'mission') {
      const p = (projects || []).find(x => x.slug === initialRoom.slug)
      setBrowseProj({ slug: initialRoom.slug, name: (p && (p.name || p.slug)) || initialRoom.slug })
    } else if (initialRoom) {
      setBrowseProj(null)
    }
  }, [initialRoom])
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState({})            // slug -> [{ from, text }]
  // Step indicator: while a turn is in flight, show the assistant's current step
  // (real step events from /api/dashboard/message-steps) or "Working…". Ported
  // from CvgChatSurface so the in-page chat tool gets the same live feedback.
  const [awaitingReply, setAwaitingReply] = useState(false)
  const [stepText, setStepText] = useState('')
  const [creating, setCreating] = useState(null)      // 'project' | 'mission'
  const [npName, setNpName] = useState('')
  const [nmProj, setNmProj] = useState((projects || [])[0]?.slug || '')
  const [nmName, setNmName] = useState('')
  const [nmGoal, setNmGoal] = useState('')
  const [localProjects, setLocalProjects] = useState(projects || [])
  const [isNarrow, setIsNarrow] = useState(false)
  const [mobileCol, setMobileCol] = useState(0)       // 0 rooms · 1 chat · 2 files
  // R184 (Patrik: "click open room on mobile → be IN the room the next second"):
  // opening from a room / catch-up tap jumps straight to the chat column on phones,
  // not the room list. Desktop ignores mobileCol (it shows all columns at once).
  useEffect(() => { if (initialRoom) setMobileCol(1) }, [initialRoom])
  const [listFocused, setListFocused] = useState(false) // R57: room list is the active column (Left from empty input)
  const chatNavRef = useRef(null)
  const taRef = useRef(null)   // composer textarea — focused by the command button
  // R61 (Patrik): the "all rooms" column is a single-column Dropbox-style drill-through —
  // root shows agents + projects; clicking a project pushes INTO its missions (one column,
  // the view changes as you click, with a back affordance). browseProj = the project we're
  // drilled into (null = root). navIdx = the keyboard-highlighted row in the visible list.
  const [browseProj, setBrowseProj] = useState(null)
  const [navIdx, setNavIdx] = useState(0)
  useEffect(() => { setNavIdx(0) }, [browseProj])
  // R61: rooms + files columns collapse to a slim pillar (same move as the Tracker), so the
  // chat itself can be the focus. Desktop only — mobile is already one column at a time.
  const [roomsCollapsed, setRoomsCollapsed] = useState(false)
  const [filesCollapsed, setFilesCollapsed] = useState(false)
  const keyOf = (r) => r ? (r.roomKey || r.slug) : ''
  const missionsFor = (slug) => (missionsByProject && missionsByProject[slug]) || []
  // The rows currently visible in the drill-through left column. Drives BOTH the render and
  // the keyboard nav so they never disagree. Root = agents then projects (projects drill in);
  // drilled = the project's own room then each of its missions (all openable chat rooms).
  const visibleRooms = useMemo(() => {
    if (browseProj) {
      const projRoom = { kind: 'project', type: 'project', slug: browseProj.slug, name: browseProj.name || browseProj.slug, isProjectRoom: true }
      const ms = missionsFor(browseProj.slug).map(m => ({
        kind: 'mission', type: 'project', slug: browseProj.slug, missionSlug: m.slug,
        name: m.name || m.slug, roomKey: `${browseProj.slug}:${m.slug}`, status: m.status,
      }))
      return [projRoom, ...ms]
    }
    const ag = (agents || []).map(a => ({ kind: 'agent', slug: a.slug, name: a.name || a.slug }))
    const pr = (localProjects || []).map(p => ({ kind: 'projectNav', slug: p.slug, name: p.name || p.slug, drill: p }))
    return [...ag, ...pr]
  }, [browseProj, agents, localProjects, missionsByProject])
  // R56 (Patrik): inside the Chat tool, Down/Up move the room selection and Right opens that
  // room (mobile → chat column; desktop → focus the message box, the chat is already shown).
  // Document-level so it works without juggling focus; ignores input/textarea targets so the
  // message box keeps normal cursor keys.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!visibleRooms.length) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setListFocused(true); setNavIdx(i => (i + 1) % visibleRooms.length) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setListFocused(true); setNavIdx(i => (i - 1 + visibleRooms.length) % visibleRooms.length) }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        const row = visibleRooms[Math.min(navIdx, visibleRooms.length - 1)]
        if (!row) return
        // A project row drills IN (Dropbox-style); any real room opens its chat.
        if (row.kind === 'projectNav') { setBrowseProj(row.drill); setListFocused(true) }
        else { setSel(row); setListFocused(false); if (isNarrow) setMobileCol(1); else chatNavRef.current?.querySelector('textarea')?.focus() }
      }
      else if (e.key === 'ArrowLeft') {
        // R61: Left drills OUT of a project back to the root list; at the root it goes Home.
        e.preventDefault()
        if (browseProj) setBrowseProj(null)
        else onClose && onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visibleRooms, navIdx, isNarrow, onClose, browseProj])
  // R57: opening the Chat tool means "I'm in the room" — focus the message box (desktop) so
  // the keyboard flow is input → Left → room list → Left → Home, matching the home rail.
  useEffect(() => {
    if (isNarrow) return
    const ta = chatNavRef.current?.querySelector('textarea')
    if (ta) { ta.focus(); setListFocused(false) }
  }, [isNarrow])
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Tablet/iPad (<=1024) uses the readable full-screen drill-in chat (rooms -> tap ->
    // full-width conversation) instead of the 3-pane desktop layout, which crushed the
    // conversation to ~90px and wrapped message text one word per line.
    // (2026-06-18, Patrik: "messages still hard to read".) Desktop (1025+) keeps 3-pane.
    const check = () => setIsNarrow(window.innerWidth <= 1024)
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
  // Gallery-only fallback (no backend): a tiny demo thread so /cv6 isn't blank.
  const seedThread = (room) => ([
    { from: 'them', text: `On it. Picking up ${room.name} where we left off.` },
    { from: 'me', text: 'Great. Push it as far as you can and flag anything you need.' },
    { from: 'them', text: 'Will do. First pass is ready for you to look at whenever.' },
  ])
  const hasBackend = !!(supabase && worldId)
  // Load the SELECTED room's REAL Supabase thread (was showing a hardcoded
  // demo for every room — chat-tool conversations were never wired). Mirrors the
  // home quick-chat preview. Streams new messages in live.
  useEffect(() => {
    if (!sel || !hasBackend) return
    const k = keyOf(sel)
    let active = true
    const toMsg = (m) => ({
      id: m.id,
      from: (m.role === 'user' || m.agent === 'user' || m.sender === 'user') ? 'me' : 'them',
      text: m.text || m.content || '',
      // Chat Detail (2026-06-18): agent rows show an author + Space Mono time, so carry them through.
      ts: m.timestamp || m.created_at || null,
      who: m.agent_name || (m.agent && m.agent !== 'user' ? m.agent : null) || (sel && sel.name) || '',
    })
    const isView = (m) => m && m.metadata && m.metadata.view_command
    const load = async () => {
      try {
        let rows = []
        if (sel.kind === 'agent') {
          const { data } = await supabase.from('messages').select('*')
            .eq('client_id', worldId).eq('agent', sel.slug)
            .or('project.is.null,project.eq.')
            .order('timestamp', { ascending: true }).limit(50)
          rows = data || []
        } else {
          const projSlug = sel.slug
          const sharedCid = `shared:${projSlug}`
          const clientIds = worldId === sharedCid ? [sharedCid] : [worldId, sharedCid]
          const missionSlug = sel.missionSlug || null
          const { data } = await supabase.from('messages').select('*')
            .in('client_id', clientIds)
            .or(`project.eq.${projSlug},agent.eq.project:${projSlug}`)
            .order('timestamp', { ascending: true }).limit(50)
          rows = (data || []).filter((m) => {
            const tag = (m && m.metadata && m.metadata.mission_slug) || ''
            if (!missionSlug) return true
            if (!tag) return true
            return tag === missionSlug || tag.endsWith(':' + missionSlug)
          })
        }
        if (!active) return
        setThread(prev => ({ ...prev, [k]: rows.filter(m => !isView(m)).map(toMsg) }))
      } catch (_) { if (active) setThread(prev => ({ ...prev, [k]: prev[k] || [] })) }
    }
    load()
    const matches = (m) => {
      if (!m || m.client_id !== worldId || isView(m)) return false
      if (sel.kind === 'agent') return m.agent === sel.slug && !m.project
      const projSlug = sel.slug
      const isRoom = m.project === projSlug || m.agent === `project:${projSlug}`
      if (!isRoom) return false
      const missionSlug = sel.missionSlug || null
      const tag = (m.metadata && m.metadata.mission_slug) || ''
      if (!missionSlug || !tag) return true
      return tag === missionSlug || tag.endsWith(':' + missionSlug)
    }
    const channel = supabase
      .channel(`cv6-chattool-${worldId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` }, (payload) => {
        if (!active || !matches(payload.new)) return
        const m = payload.new
        setThread(prev => {
          const cur = prev[k] || []
          const incoming = toMsg(m)
          // Dedup by id; and reconcile an optimistic id-less echo of the user's
          // own just-sent message (same side + text) so it doesn't show twice.
          if (cur.some(x => x.id && x.id === m.id)) return prev
          const optIdx = cur.findIndex(x => !x.id && x.from === incoming.from && x.text === incoming.text)
          if (optIdx !== -1) {
            const next = cur.slice(); next[optIdx] = incoming
            return { ...prev, [k]: next }
          }
          return { ...prev, [k]: [...cur, incoming] }
        })
        // An assistant reply ends the in-flight turn → hide the step indicator.
        const isUser = m.role === 'user' || m.agent === 'user' || m.sender === 'user'
        if (!isUser) { setAwaitingReply(false); setStepText('') }
      })
      .subscribe()
    return () => { active = false; try { supabase.removeChannel(channel) } catch (_) {} }
  }, [sel && keyOf(sel), worldId, hasBackend])
  // While awaiting a reply, poll the real step events for this room and show the
  // assistant's current step; "Working…" until one lands. 60s safety net.
  useEffect(() => {
    if (!awaitingReply || !hasBackend || !sel) return
    let active = true
    const qs = new URLSearchParams({ client_id: worldId, limit: '20' })
    if (sel.kind === 'agent') qs.set('agent', sel.slug)
    else qs.set('project', sel.slug)
    const poll = async () => {
      try {
        const r = await authFetch(`/api/dashboard/message-steps?${qs.toString()}`)
        if (!r.ok || !active) return
        const d = await r.json()
        const steps = Array.isArray(d.steps) ? d.steps : []
        const sorted = steps.slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        const live = sorted.find(s => s.status === 'in_progress') || sorted[0]
        if (active && live && live.text) setStepText(live.text)
      } catch (_) { /* keep last */ }
    }
    poll()
    const t = setInterval(poll, 2000)
    const safety = setTimeout(() => { if (active) { setAwaitingReply(false); setStepText('') } }, 60000)
    return () => { active = false; clearInterval(t); clearTimeout(safety) }
  }, [awaitingReply, hasBackend, worldId, sel && keyOf(sel)])
  const loadedThread = sel ? thread[keyOf(sel)] : null
  // Real backend: show the loaded thread (empty array = a real, empty room).
  // Gallery only: fall back to the demo seed so it isn't blank.
  // Collapse identical (sender+time+text) rows — real threads arrive duplicated across client_id
  // scopes; each message should read once (matches the handoff: one message, one block).
  const _rawMsgs = sel ? (loadedThread != null ? loadedThread : (hasBackend ? [] : seedThread(sel))) : []
  const msgs = (() => { const seen = new Set(), out = []; for (const m of _rawMsgs) { const key = `${m.from}|${(m.text || '').trim()}`; if (seen.has(key)) continue; seen.add(key); out.push(m) } return out })()
  const files = useMemo(() => buildFileTree(sel ? { slug: keyOf(sel) } : null), [sel])

  // R-PIXEL-LOOP (Chat right panel): real per-room mission-goals checklist + agent-on autopilot.
  // Goal steps come from a real per-room store (room-goal-steps.json via the tunnel, same proven
  // pattern as review-checklist.json) — the user adds/toggles them; the first not-done step renders
  // as the active goal. No fabricated steps (real-data-only). Agent-on writes the room-autopilot flag.
  const [goalSteps, setGoalSteps] = useState([])
  const [goalDraft, setGoalDraft] = useState('')
  const [autopilotOn, setAutopilotOn] = useState(true)
  const isAgentRoom = !!(sel && sel.kind === 'agent')
  useEffect(() => {
    if (!sel || !worldId) { setGoalSteps([]); return }
    let active = true
    const rk = keyOf(sel)
    ;(async () => {
      try {
        const r = await authFetch(`/api/dashboard/room-goal-steps?world=${encodeURIComponent(worldId)}&room=${encodeURIComponent(rk)}`)
        if (r?.ok) { const d = await r.json(); if (active) setGoalSteps(Array.isArray(d.list) ? d.list : []) }
      } catch (_) { /* ignore */ }
      try {
        const r2 = await authFetch(`/api/dashboard/room-autopilot?world=${encodeURIComponent(worldId)}`)
        if (r2?.ok) { const d2 = await r2.json(); const bare = String(rk).split(':').pop(); if (active) setAutopilotOn(d2.autopilot && (bare in d2.autopilot) ? d2.autopilot[bare] !== false : true) }
      } catch (_) { /* ignore */ }
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel && keyOf(sel), worldId])

  const addGoalStep = useCallback(async () => {
    const text = goalDraft.trim(); if (!text || !sel) return
    const rk = keyOf(sel)
    setGoalDraft('')
    const tmp = { id: 'tmp-' + Math.max(1, text.length) + '-' + text.slice(0, 4), text, done: false }
    setGoalSteps(prev => [...prev, tmp])
    try {
      const r = await authFetch('/api/dashboard/room-goal-steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', world: worldId, room: rk, text }) })
      if (r?.ok) { const d = await r.json(); setGoalSteps(prev => prev.map(g => g === tmp ? { ...tmp, id: d.id } : g)) }
    } catch (_) { /* ignore */ }
  }, [goalDraft, sel, worldId])

  const toggleGoalStep = useCallback(async (id) => {
    if (!sel) return
    const rk = keyOf(sel)
    setGoalSteps(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g))
    try { await authFetch('/api/dashboard/room-goal-steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', world: worldId, room: rk, id }) }) } catch (_) { /* ignore */ }
  }, [sel, worldId])

  const setAutopilot = useCallback(async (on) => {
    if (!sel) return
    const bare = String(keyOf(sel)).split(':').pop()
    setAutopilotOn(on)
    try { await authFetch('/api/dashboard/room-autopilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ world: worldId, slug: bare, on }) }) } catch (_) { /* ignore */ }
  }, [sel, worldId])

  function send() {
    const t = draft.trim(); if (!t || !sel) return
    const k = keyOf(sel)
    setThread(prev => ({ ...prev, [k]: [...(prev[k] || []), { from: 'me', text: t }] }))
    setDraft('')
    if (hasBackend) { setAwaitingReply(true); setStepText('Working…') }
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

  // Collapsed pillar — a slim bar so the chat is the focus; click to expand (Tracker move).
  const RoomsCollapsedBar = () => (
    <div onClick={() => setRoomsCollapsed(false)} title="Show rooms" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0', borderRight: '1px solid var(--cv6-divider)', height: '100%', cursor: 'pointer', background: 'var(--cv6-surface)' }}>
      <button title="Show rooms" style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--cv6-text-secondary)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: '4px' }}>Rooms</span>
    </div>
  )
  const roomRowStyle = (active, hi, r) => ({
    display: 'flex', alignItems: 'center', gap: '10px', width: 'auto', textAlign: 'left', padding: '10px 12px', margin: '2px 6px', borderRadius: '6px',
    border: hi ? '2px solid var(--cv6-accent-primary)' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? `hsla(${hue(keyOf(r))}, 60%, 48%, 0.12)` : 'transparent',
  })
  const folderGlyph = (slug) => <span style={{ flexShrink: 0, color: `hsl(${hue(slug)}, 60%, 52%)`, display: 'inline-flex' }}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>
  const chevronRight = <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--cv6-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
  const RoomsCol = () => {
    if (roomsCollapsed && !isNarrow) return <RoomsCollapsedBar />
    return (
    <div style={colStyle}>
      <div style={headStyle}>
        {browseProj ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
            <button onClick={() => setBrowseProj(null)} title="All rooms" style={{ flexShrink: 0, width: '26px', height: '26px', marginLeft: '-4px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--cv6-accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ textTransform: 'none', fontSize: '13px', fontWeight: '700', color: 'var(--cv6-text-primary)', letterSpacing: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{browseProj.name || browseProj.slug}</span>
          </span>
        ) : <span>All Rooms</span>}
        {!isNarrow && (
          <button onClick={() => setRoomsCollapsed(true)} title="Collapse rooms" style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
      </div>
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
      {visibleRooms.map((r, i) => {
        const hi = listFocused && navIdx === i
        // Project rows at the root drill IN (Finder/Dropbox forward step), not open a chat.
        if (r.kind === 'projectNav') {
          const count = missionsFor(r.slug).length
          return (
            <button key={'pnav-' + r.slug} onClick={() => { setBrowseProj(r.drill); setNavIdx(0); setListFocused(true) }} style={roomRowStyle(false, hi, r)}
              onMouseEnter={(e) => { if (!hi) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={(e) => { if (!hi) e.currentTarget.style.background = 'transparent' }}>
              {folderGlyph(r.slug)}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--cv6-text-secondary)' }}>{count} mission{count === 1 ? '' : 's'}</span>
              </span>
              {chevronRight}
            </button>
          )
        }
        const active = sel && keyOf(sel) === keyOf(r)
        const tag = r.isProjectRoom ? 'Room' : r.kind === 'agent' ? 'Agent' : (r.status === 'running' ? 'Working' : 'Mission')
        return (
          <button key={r.kind + '-' + keyOf(r)} onClick={() => { setSel(r); setNavIdx(i); setListFocused(true); if (isNarrow) setMobileCol(1) }} style={roomRowStyle(active, hi || (active && listFocused), r)}
            onMouseEnter={(e) => { if (!active && !hi) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }} onMouseLeave={(e) => { if (!active && !hi) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ flexShrink: 0, width: '9px', height: '9px', borderRadius: '50%', background: `hsl(${hue(keyOf(r))}, 65%, 55%)` }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--cv6-text-tertiary)' }}>{tag}</span>
          </button>
        )
      })}
    </div>
    )
  }

  // Chat Detail (2026-06-18): agent rows carry an author avatar + Space Mono time.
  const monoFont = 'ui-monospace, "Space Mono", monospace'
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch (_) { return '' } }
  const initials = (name) => (name || '?').trim().split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  const titleCase = (s) => (s || '').replace(/\b([a-z])/g, (m, c) => c.toUpperCase())
  const dayKey = (ts) => { try { return new Date(ts).toDateString() } catch (_) { return '' } }
  const dayLabel = (ts) => { try { const d = new Date(ts), now = new Date(); const isToday = d.toDateString() === now.toDateString(); const y = new Date(now); y.setDate(now.getDate() - 1); const isY = d.toDateString() === y.toDateString(); return `${isToday ? 'Today' : isY ? 'Yesterday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${fmtTime(ts)}` } catch (_) { return '' } }
  // Agents post task reports in a fixed shape ("Task failed: <title>. Reason: <why>. <options>. I'm on it — retry or different angle?").
  // Typeset them like the handoff: a status pill, a Reason callout, the body, and inline actions — instead of one runon paragraph.
  const parseAgentReport = (text) => {
    const t = (text || '').trim()
    const mStatus = /^Task (failed|done)\s*:\s*/i.exec(t)
    if (!mStatus) return { status: null, body: t }
    const status = mStatus[1].toLowerCase() === 'done' ? 'done' : 'failed'
    let rest = t.slice(mStatus[0].length)
    let reason = null
    const mReason = /(?:^|\.\s*)Reason\s*:\s*([^]*?)(?:\.\s*(?=[A-Z(])|$)/.exec(rest)
    if (mReason) { reason = mReason[1].trim().replace(/\.+$/, ''); rest = (rest.slice(0, mReason.index) + ' ' + rest.slice(mReason.index + mReason[0].length)).trim() }
    const hasRetry = /retry|different angle/i.test(t)
    rest = rest.replace(/\s*I'?m on it\s*[—-]?\s*want me to retry( or try a different angle)?\??/i, '').replace(/\s{2,}/g, ' ').trim()
    return { status, reason, body: rest, hasRetry }
  }
  const ChatCol = ({ mobile } = {}) => (
    <div style={{ ...colStyle, borderRight: isNarrow ? 'none' : '1px solid var(--cv6-divider)', height: mobile ? '100%' : undefined }}>
      {/* Secondary nav: (mobile) back + dot + name on the left, room Projects/Files icons on the right */}
      <div style={{ ...headStyle, paddingTop: mobile ? 'calc(10px + env(safe-area-inset-top, 0px))' : headStyle.padding, borderBottom: sel ? `2px solid hsl(${hue(keyOf(sel))}, 70%, 60%)` : '1px solid var(--cv6-divider)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textTransform: 'none', fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)', letterSpacing: 0 }}>
          {mobile && (
            // R187: this is the single header for the full-screen room — back exits to Home
            // (where Catch Up lives), top-left. The room list is reached via the Chat tab.
            <button onClick={() => onClose && onClose()} title="Back" aria-label="Back" style={{ flexShrink: 0, width: '34px', height: '34px', marginLeft: '-4px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--cv6-accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          {sel ? <>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: `hsl(${hue(keyOf(sel))}, 70%, 60%)`, flexShrink: 0, boxShadow: `0 0 8px hsla(${hue(keyOf(sel))}, 70%, 60%, 0.6)` }} />
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: mobile ? '16px' : '15px', fontWeight: 600, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{sel.name}</span>
              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--cv6-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.isProjectRoom || sel.kind === 'project' ? 'Project room' : sel.kind === 'mission' ? `Mission${sel.status === 'running' ? ' · working' : ''}` : 'Direct chat'}</span>
            </span>
          </> : 'Select a room'}
        </span>
        {sel && <span style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>{iconBtn('Projects', () => { if (isNarrow) setMobileCol(2) }, projGlyph)}{iconBtn('Files', () => { if (isNarrow) setMobileCol(2) }, fileGlyph)}</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 0 14px', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Detail (2026-06-18): agent output typeset full-column (no box); user replies are right-aligned accent bubbles. */}
        <style>{`@keyframes cv6-step-pulse{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}@keyframes cv6-indet{0%{transform:translateX(-110%)}100%{transform:translateX(300%)}}.cv6-step-dot{width:6px;height:6px;border-radius:50%;background:var(--cv6-accent-primary);display:inline-block;animation:cv6-step-pulse 1.2s infinite ease-in-out}`}</style>
        {!sel ? <div style={{ margin: 'auto', fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>Pick a room on the left to open its chat.</div> : msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const showDay = m.ts && (!prev || !prev.ts || dayKey(prev.ts) !== dayKey(m.ts))
          const divider = showDay ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '4px 0 20px' }}>
              <span style={{ flex: 1, height: '1px', background: 'var(--cv6-divider)', maxWidth: '70px' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cv6-text-tertiary)' }}>{dayLabel(m.ts)}</span>
              <span style={{ flex: 1, height: '1px', background: 'var(--cv6-divider)', maxWidth: '70px' }} />
            </div>
          ) : null
          if (m.from === 'me') {
            return (<Fragment key={i}>{divider}
              <div style={{ padding: '0 18px', marginBottom: '22px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ maxWidth: '82%', background: 'var(--cv6-accent-primary)', color: '#fff', fontSize: '14.5px', lineHeight: 1.5, padding: '11px 15px', borderRadius: '18px 18px 5px 18px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                {m.ts && <span style={{ fontFamily: monoFont, fontSize: '10.5px', color: 'var(--cv6-text-tertiary)', marginTop: '5px' }}>{fmtTime(m.ts)} · seen</span>}
              </div>
            </Fragment>)
          }
          const rep = parseAgentReport(m.text)
          const pill = rep.status === 'failed' ? { label: 'Task failed', col: 'var(--cv6-accent-error)' } : rep.status === 'done' ? { label: 'Task done', col: 'var(--cv6-accent-success)' } : null
          return (<Fragment key={i}>{divider}
            <div style={{ padding: '0 18px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `hsla(${hue(keyOf(sel))}, 60%, 50%, 0.18)`, color: `hsl(${hue(keyOf(sel))}, 65%, 62%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{initials(m.who || sel.name)}</div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cv6-text-primary)' }}>{titleCase(m.who || sel.name)}</span>
                {m.ts && <span style={{ fontFamily: monoFont, fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>{fmtTime(m.ts)}</span>}
                {pill && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: pill.col, background: `color-mix(in srgb, ${pill.col} 16%, transparent)`, padding: '4px 9px', borderRadius: '6px', flexShrink: 0 }}>
                  {rep.status === 'done'
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>}
                  {pill.label}
                </span>}
              </div>
              {rep.reason && (
                <div style={{ margin: '0 0 12px', padding: '12px 14px', background: 'var(--cv6-surface-hover)', borderRadius: '10px', borderLeft: `2px solid ${pill ? pill.col : 'var(--cv6-accent-primary)'}` }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: pill ? pill.col : 'var(--cv6-accent-primary)', marginBottom: '6px' }}>Reason</div>
                  <div style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--cv6-text-secondary)' }}>{rep.reason}</div>
                </div>
              )}
              <div className="cv6-article" style={{ fontSize: '15px', lineHeight: 1.62, color: 'var(--cv6-text-primary)' }}>
                <ChatMessageRenderer content={rep.body || m.text} />
              </div>
              {rep.hasRetry && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                  <button onClick={() => { if (onSend) onSend(sel, 'Retry that.'); setAwaitingReply(true); setStepText('Working…') }} style={{ height: '38px', padding: '0 15px', borderRadius: '10px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', fontSize: '13.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Retry</button>
                  <button onClick={() => { if (onSend) onSend(sel, 'Try a different angle.'); setAwaitingReply(true); setStepText('Working…') }} style={{ height: '38px', padding: '0 15px', borderRadius: '10px', border: '1px solid var(--cv6-divider)', background: 'transparent', color: 'var(--cv6-text-primary)', fontSize: '13.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Different angle</button>
                  <button onClick={() => { if (isNarrow) setMobileCol(2); else setFilesCollapsed(false) }} style={{ height: '38px', padding: '0 13px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--cv6-text-secondary)', fontSize: '13.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Logs</button>
                </div>
              )}
            </div>
          </Fragment>)
        })}
        {sel && awaitingReply && (
          <div style={{ padding: '0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `hsla(${hue(keyOf(sel))}, 60%, 50%, 0.18)`, color: `hsl(${hue(keyOf(sel))}, 65%, 62%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{initials(sel.name)}</div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cv6-text-primary)' }}>{sel.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--cv6-text-tertiary)' }}>working…</span>
            </div>
            <div style={{ background: 'var(--cv6-surface-hover)', borderRadius: '12px', padding: '14px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ display: 'inline-flex', gap: '3px' }}>
                  <span className="cv6-step-dot" style={{ animationDelay: '0ms' }} />
                  <span className="cv6-step-dot" style={{ animationDelay: '200ms' }} />
                  <span className="cv6-step-dot" style={{ animationDelay: '400ms' }} />
                </span>
                <span style={{ fontSize: '14px', color: 'var(--cv6-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stepText || 'Working…'}</span>
              </div>
              <div style={{ height: '3px', borderRadius: '2px', background: 'var(--cv6-divider)', overflow: 'hidden', marginTop: '12px' }}>
                <div style={{ height: '100%', width: '40%', borderRadius: '2px', background: 'var(--cv6-accent-primary)', animation: 'cv6-indet 1.4s ease-in-out infinite' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      {sel && (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--cv6-divider)', padding: mobile ? '10px 14px calc(16px + env(safe-area-inset-bottom, 0px))' : '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          {/* CV4 command button (crystal ball) — replaces the plus. Begins a slash command. */}
          <button onClick={() => { setDraft(d => (d && d.trim()) ? d : '/'); setTimeout(() => taRef.current?.focus(), 0) }} title="Command" style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(124,58,237,0.28)' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9.5" r="6.5"/><path d="M6.5 19h11"/><path d="M9.5 19l1-3M14.5 19l-1-3"/><path d="M9.4 7.6a3 3 0 0 1 2.6-1.6"/></svg>
          </button>
          <textarea ref={taRef} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return }
            // R57: Left in an empty input → step back to the room list (which then takes Up/Down).
            if (e.key === 'ArrowLeft' && !draft) { e.preventDefault(); setListFocused(true); e.target.blur() }
          }} placeholder={`Message ${sel.name}…`} rows={1} style={{ flex: 1, resize: 'none', padding: '11px 16px', borderRadius: '22px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)', color: 'var(--cv6-text-primary)', fontFamily: 'inherit', fontSize: '15px', lineHeight: 1.4, outline: 'none', maxHeight: '110px', minHeight: '44px', boxSizing: 'border-box' }} />
          <button onClick={send} title={draft.trim() ? 'Send' : 'Voice'} style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: draft.trim() ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface-hover)', color: draft.trim() ? '#fff' : 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {draft.trim()
              ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></svg>}
          </button>
        </div>
      )}
    </div>
  )

  const ContextCollapsedBar = () => (
    <div onClick={() => setFilesCollapsed(false)} title="Show context" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0', borderLeft: '1px solid var(--cv6-divider)', height: '100%', cursor: 'pointer', background: 'var(--cv6-surface)' }}>
      <button title="Show context" style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--cv6-text-secondary)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: '4px' }}>Context</span>
    </div>
  )
  const ContextCol = () => {
    if (filesCollapsed && !isNarrow) return <ContextCollapsedBar />
    return (
    <div style={{ ...colStyle, borderRight: 'none', display: 'flex', flexDirection: 'column' }}>
      <div style={headStyle}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
          <span>Mission goals</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* R-PIXEL-LOOP: "Agent on" autopilot toggle (matches the dc.html). Applies to
                project/mission rooms; disabled for agent direct chats (no goal record). */}
            {sel && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }} title={isAgentRoom ? 'Autopilot applies to project and mission rooms' : 'Keep the assistant pushing this room forward on its own'}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cv6-text-secondary)', textTransform: 'none', letterSpacing: 0 }}>Agent on</span>
                <button onClick={() => { if (!isAgentRoom) setAutopilot(!autopilotOn) }} disabled={isAgentRoom} aria-label="Toggle autopilot"
                  style={{ width: 30, height: 14, borderRadius: 7, border: 'none', background: (autopilotOn && !isAgentRoom) ? 'var(--cv6-accent-success)' : 'var(--cv6-divider)', cursor: isAgentRoom ? 'default' : 'pointer', position: 'relative', padding: 2, boxSizing: 'border-box', opacity: isAgentRoom ? 0.5 : 1, transition: 'background 200ms ease' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--cv6-surface)', position: 'absolute', left: (autopilotOn && !isAgentRoom) ? 18 : 2, top: 2, transition: 'left 200ms ease', display: 'block' }} />
                </button>
              </span>
            )}
            {!isNarrow && (
              <button onClick={() => setFilesCollapsed(true)} title="Collapse context" style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </span>
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {!sel ? (
          <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)' }}>No room selected</div>
        ) : (
          <>
            {/* R-PIXEL-LOOP: real per-room goal-steps checklist (room-goal-steps store). The first
                not-done step is the ACTIVE goal (accent dot + owner); done = check, rest = todo ring.
                Click a row to toggle done. No fabricated steps — the list is what the user added. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(() => {
                const firstActive = goalSteps.findIndex(g => !g.done)
                return goalSteps.map((g, i) => {
                  const state = g.done ? 'done' : (i === firstActive ? 'active' : 'todo')
                  return (
                    <button key={g.id} onClick={() => toggleGoalStep(g.id)} title={g.done ? 'Mark not done' : 'Mark done'}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', width: '100%', background: state === 'active' ? 'var(--cv6-accent-weak)' : 'transparent', border: 'none', borderRadius: '8px', padding: '7px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <span style={{ flexShrink: 0, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: state === 'todo' ? '1.5px solid var(--cv6-divider)' : 'none',
                        background: state === 'done' ? 'var(--cv6-accent-success)' : (state === 'active' ? 'var(--cv6-accent-primary)' : 'transparent'), color: '#fff' }}>
                        {state === 'done' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>}
                        {state === 'active' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      <span style={{ flex: 1, fontSize: '13px', lineHeight: 1.4, color: state === 'done' ? 'var(--cv6-text-tertiary)' : 'var(--cv6-text-primary)', textDecoration: state === 'done' ? 'line-through' : 'none' }}>{g.text}</span>
                      {state === 'active' && isAgentRoom && <span style={{ flexShrink: 0, fontSize: '11px', color: 'var(--cv6-text-secondary)' }}>{sel.name}</span>}
                    </button>
                  )
                })
              })()}
              {goalSteps.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--cv6-text-tertiary)', padding: '2px 2px 4px' }}>No goals yet.</div>
              )}
            </div>

            {/* Add a goal — wired to the real room-goal-steps store (Enter to add). */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '40px', border: '1.5px dashed var(--cv6-divider)', borderRadius: '11px', padding: '0 12px', color: 'var(--cv6-text-tertiary)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <input value={goalDraft} onChange={e => setGoalDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoalStep() } }} placeholder="Add a goal…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', color: 'var(--cv6-text-primary)' }} />
            </div>

            {/* Files section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--cv6-divider)' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv6-text-secondary)' }}>Files</span>
              {files.map((n, i) => {
                const isFolder = n.type === 'folder'
                const color = isFolder ? 'var(--cv6-text-secondary)' : (FILE_TYPE_COLOR[n.fileType] || 'var(--cv6-text-secondary)')
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '8px' }}>
                    <span style={{ flexShrink: 0, color, display: 'inline-flex' }}>
                      {isFolder
                        ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
    )
  }

  if (isNarrow) {
    // R49: mobile chat is a FULL room. Chat view fills the tool area (own secondary nav with
    // back + name + room icons via ChatCol mobile); only Rooms/Files keep a plain back bar.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '70vh', height: '100%', border: 'none', borderRadius: 0, overflow: 'hidden', background: 'var(--cv6-ground)' }}>
        {mobileCol === 2 && (
          <button onClick={() => setMobileCol(1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', color: 'var(--cv6-accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>{sel?.name || 'Chat'}
          </button>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{mobileCol === 0 ? <RoomsCol /> : mobileCol === 1 ? <ChatCol mobile /> : <ContextCol />}</div>
      </div>
    )
  }
  const gridCols = `${roomsCollapsed ? '40px' : '300px'} 1fr ${filesCollapsed ? '40px' : '320px'}`
  return (
    <ResizableBox minHeight={460} storageKey="chat-tool">
      <div ref={chatNavRef} style={{ display: 'grid', gridTemplateColumns: gridCols, height: '100%', border: '1px solid var(--cv6-divider)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cv6-surface)', transition: 'grid-template-columns 160ms ease' }}>
        <RoomsCol /><ChatCol /><ContextCol />
      </div>
    </ResizableBox>
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
                  onFocus={e => { e.currentTarget.style.border = '1px solid var(--cv6-accent-primary)'; e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--cv6-accent-weak)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }} />
              </span>
              <span style={{ ...cell, paddingTop: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontVariantNumeric: 'tabular-nums', color: r.status === 'sent' ? 'var(--cv6-accent-success)' : r.status === 'discarded' ? 'var(--cv6-text-tertiary)' : r.held ? 'var(--cv6-text-tertiary)' : 'var(--cv6-text-secondary)' }}>
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
 openChatRequest, // R62: { kind:'agent'|'project'|'mission', slug, name, missionSlug?, nonce }, opens the in-page Chat tool preselected (replaces the old full-screen chat).
 openToolRequest, // R82: { tool, nonce }, an agent (via the cv6-view channel) opens a tool on the user's screen.
  catchupNotifications = [], // R64: unread items for the home Catch-up column (CornerVG builds them).
  onCatchupOpenRoom, // R64: open a catch-up item's room (routes to the in-page Chat tool via CornerVG handleSelect*).
  onCatchupViewAll, // R75: open the full Catch Up modal (the home column is a 5-card quick tool; overflow lives here).
  onCatchupDismiss, // R98: mark a catch-up item handled (clears it from the board) — harvested from the mobile triage design.
  onCatchupReply, // R110: send a real reply to a catch-up item's room (CornerVG handleCatchupReply → supabase + mark read).
}) {
  // Pin state — keyed by user id
  const userId = user?.id
  const [pinnedAgents, setPinnedAgents] = useState(() => readStored(PIN_AGENTS_KEY + ':' + userId, []))
  const [pinnedProjects, setPinnedProjects] = useState(() => readStored(PIN_PROJECTS_KEY + ':' + userId, []))
  const [expandedProjects, setExpandedProjects] = useState(() => readStored(EXPANDED_PROJECTS_KEY + ':' + userId, {}))
  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  // All Rooms column-scoped search (distinct from the global top-bar search above).
  // Filters the Recents + Agents + Projects lists inside the middle column only.
  const [colQuery, setColQuery] = useState('')
  // Plus-button create menu (anchored popover): null | 'open'
  const [roomCreateMenu, setRoomCreateMenu] = useState(false)
  const greeting = useMemo(() => pickGreeting(), [])

  // Theme cycle for the home top-bar toggle: light → dark → glass[0..N-1] → light.
  // Owned by useThemeMode so it persists + drives the parent's GlassBackdrop.
  const { mode: themeMode, cycleTheme, setTheme, glassIndex, glassVariantCount, glassCard } = useThemeMode()
  const onLastGlass = themeMode === 'glass' && glassIndex >= glassVariantCount - 1
  const themeTitle = themeMode === 'light' ? 'Light · tap for Dark'
    : themeMode === 'dark' ? 'Dark · tap for Glass'
    : onLastGlass ? `Glass ${glassIndex + 1}/${glassVariantCount} (${glassCard}) · tap for Light`
    : `Glass ${glassIndex + 1}/${glassVariantCount} (${glassCard}) · tap for next`

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
  const [organizeSubtool, setOrganizeSubtool] = useState('projects') // 'projects' | 'files' for Organize tool (u-mqir8cr7)

  const [toolRecency, setToolRecency] = useState([]) // R48: most-recently-used tools sit next to Home
  // R48: open a tool AND record it as most-recent so the row reorders into recency order.
  const openTool = useCallback((key) => {
    setSelectedTool(key)
    if (key !== 'home') setToolRecency(prev => [key, ...prev.filter(k => k !== key)])
  }, [])

  // R37: right-click menu for active-work cards (missions + projects). Same options as the
  // left-menu; every action is a forward-advance into the project screen (navigate + confirm).
  const [cardMenu, setCardMenu] = useState(null) // { x, y, type:'mission'|'project', item, project }

  // create-1: guard against double-submit on project/mission creation
  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingMission, setCreatingMission] = useState(false)
  // R-LIVE-FEEDBACK: locally cache newly-created projects/missions until they appear in props
  const [localProjects, setLocalProjects] = useState([])

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

  // R2 (CV6 round 2): All Rooms drill-through — when user clicks a project, show its missions in the same column with a back arrow
  const [browsingProject, setBrowsingProject] = useState(null)
  // R-LIVE-FEEDBACK: locally cache newly-created missions until they appear in fetched data
  const [localMissions, setLocalMissions] = useState({}) // { projectSlug: [mission, ...] }
  // R-LIVE-FEEDBACK: merge fetched missions with locally-created ones for live display
  const effectiveMissionsByProject = useMemo(() => {
    const merged = { ...missionsByProject }
    for (const [projSlug, missions] of Object.entries(localMissions)) {
      merged[projSlug] = [...(missions || []), ...(missionsByProject[projSlug] || [])].filter((m, i, arr) => arr.findIndex(x => x.slug === m.slug) === i) // dedup by slug
    }
    return merged
  }, [missionsByProject, localMissions])
  // R-LIVE-FEEDBACK: cleanup — when projectRooms updates and includes our local projects, remove them from cache
  useEffect(() => {
    if (!projectRooms || localProjects.length === 0) return
    const projSlugs = new Set(projectRooms.map(p => p.slug))
    setLocalProjects(prev => prev.filter(p => !projSlugs.has(p.slug)))
  }, [projectRooms])
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
            // proj-3: tasks win when present; otherwise keep the backend status
            // (missions-tree marks fresh/agent_status missions 'in-progress') instead
            // of forcing 'idle' — that's why brand-new missions always looked dead.
            status: hasRunning ? 'running' : hasQueued ? 'queued' : (m.status || 'idle'),
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
    // R107: refresh every 10s so a mission an agent creates lands within Patrik's
    // "no delay longer than a few seconds (10 or so is fine)" bar (was 20s, which
    // doubled it). User-created ones still refresh immediately via persistCreateMission.
    const timer = setInterval(fetchMissions, 10000)
    return () => clearInterval(timer)
  }, [fetchMissions])

  useEffect(() => { writeStored(PIN_AGENTS_KEY + ':' + userId, pinnedAgents) }, [pinnedAgents, userId])
  useEffect(() => { writeStored(PIN_PROJECTS_KEY + ':' + userId, pinnedProjects) }, [pinnedProjects, userId])
  useEffect(() => { writeStored(EXPANDED_PROJECTS_KEY + ':' + userId, expandedProjects) }, [expandedProjects, userId])

  // persist-1: keep pins in sync across browser tabs. A `storage` event fires only
  // in OTHER tabs when this user's pin keys change, so adopt the new value instead of
  // letting a stale tab overwrite it on its next write.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e) => {
      if (!e.key) return
      if (e.key === PIN_AGENTS_KEY + ':' + userId) setPinnedAgents(readStored(PIN_AGENTS_KEY + ':' + userId, []))
      else if (e.key === PIN_PROJECTS_KEY + ':' + userId) setPinnedProjects(readStored(PIN_PROJECTS_KEY + ':' + userId, []))
      else if (e.key === EXPANDED_PROJECTS_KEY + ':' + userId) setExpandedProjects(readStored(EXPANDED_PROJECTS_KEY + ':' + userId, {}))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [userId])

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
    // R-LIVE-FEEDBACK: merge prop-supplied projects with locally-created ones
    const allRooms = [...localProjects, ...(projectRooms || [])]
    if (allRooms.length === 0) return { recentProjects: [], allProjects: [] }

    // Compute effective last-active timestamp per project.
    // recentVisits[slug] is highest priority — written on every project navigation.
    const effectiveTs = (p) => {
      const visitTs = recentVisits[p.slug] || 0           // user just visited this room
      const projTs = p.last_message_at ? new Date(p.last_message_at).getTime() : 0
      const missions = effectiveMissionsByProject[p.slug] || []
      const missionTs = missions.reduce((max, m) => {
        const t = m.last_message_at ? new Date(m.last_message_at).getTime() : 0
        return t > max ? t : max
      }, 0)
      return Math.max(visitTs, projTs, missionTs)
    }

    // Sort by recency only — most recently visited/active projects come first.
    const sorted = [...allRooms].sort((a, b) => {
      return effectiveTs(b) - effectiveTs(a)
    })
    const recent = sorted.slice(0, 5)
    const recentSlugs = new Set(recent.map(p => p.slug))
    const rest = [...allRooms]
      .filter(p => !recentSlugs.has(p.slug))
      .sort((a, b) => (a.name || a.slug || '').localeCompare(b.name || b.slug || ''))
    return { recentProjects: recent, allProjects: rest }
  }, [projectRooms, pinnedProjects, effectiveMissionsByProject, recentVisits, localProjects])

  // R43: real persistence for the tool actions. Optimistic UI updates first; these
  // fire the actual backend write. In the gallery (no auth) they no-op gracefully.
  const { showToast } = useSystemToast()
  // proj-2: surface create failures. The create row appears optimistically; if the
  // server rejects it, the user must be told (silent failure = a ghost project that
  // vanishes on refresh). Returns true/false so the overlay can revert the optimistic row.
  const errText = async (res, fallback) => {
    try { const e = await res.json(); if (e?.error) return `${fallback}: ${e.error}` } catch {}
    return fallback
  }
  const persistCreateProject = useCallback(async (slug, name) => {
    if (creatingProject) return false
    if (!slug || !name) return false
    setCreatingProject(true)
    try {
      const res = await authFetch('/api/dashboard/create-project-from-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, client_id: worldId || 'aom', agent_slug: 'ea' }),
      })
      if (!res.ok) { showToast(await errText(res, 'Could not create that project'), 'error', 6000); return false }
      // R88: refresh now so the new project's missions show in real time, not in 60s.
      fetchMissions()
      // R-LIVE-FEEDBACK: add to local cache so it appears immediately in All Rooms
      setLocalProjects(prev => [{ slug, name, last_message_at: null }, ...prev.filter(p => p.slug !== slug)])
      // R-LIVE-FEEDBACK: close tool and return to Home so user sees new project immediately
      setSelectedTool('home')
      showToast(`"${name}" created`, 'success', 4000)
      return true
    } catch {
      showToast('Could not create that project. Check your connection and try again.', 'error', 6000)
      return false
    } finally {
      setCreatingProject(false)
    }
  }, [worldId, fetchMissions, showToast, creatingProject])
  const persistCreateMission = useCallback(async (parentSlug, missionSlug, name) => {
    if (creatingMission) return false
    if (!parentSlug || !missionSlug || !name) return false
    setCreatingMission(true)
    try {
      const res = await authFetch('/api/dashboard/create-mission-from-drawer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_slug: parentSlug, mission_slug: missionSlug, name, client_id: worldId || 'aom' }),
      })
      if (!res.ok) { showToast(await errText(res, 'Could not create that mission'), 'error', 6000); return false }
      // R88: refresh now so the new mission appears in Active Work within seconds.
      fetchMissions()
      // R-LIVE-FEEDBACK: add to local cache so it appears immediately in the All Rooms list
      setLocalMissions(prev => ({
        ...prev,
        [parentSlug]: [{ slug: missionSlug, name, status: 'idle', last_message_at: null }, ...(prev[parentSlug] || []).filter(m => m.slug !== missionSlug)]
      }))
      // R-LIVE-FEEDBACK: close tool and return to Home so user sees new mission immediately
      setSelectedTool('home')
      showToast(`"${name}" created in ${parentSlug}`, 'success', 4000)
      return true
    } catch {
      showToast('Could not create that mission. Check your connection and try again.', 'error', 6000)
      return false
    } finally {
      setCreatingMission(false)
    }
  }, [worldId, fetchMissions, showToast, creatingMission])
  const persistMoveFile = useCallback(async (slug, from, to) => {
    try {
      await authFetch('/api/dashboard/project-file-move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, from, to }),
      })
    } catch { /* optimistic */ }
  }, [])
  // proj-1: reparent a mission to another project (folder move on disk +
  // Supabase re-register). Returns true on success, false so the caller can
  // revert its optimistic move.
  const persistMoveMission = useCallback(async (mission, fromSlug, toSlug) => {
    try {
      const r = await authFetch('/api/dashboard/mission-move', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world: worldId || 'aom',
          project_slug: fromSlug,
          mission_slug: mission.slug,
          new_project_slug: toSlug,
        }),
      })
      if (!r || !r.ok) return false
      // Reconcile real state so the move sticks across the next refresh.
      fetchMissions()
      return true
    } catch { return false }
  }, [worldId, fetchMissions])

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

  // RECENTS (Patrik 2026-06-19): the 3 most recently active rooms — projects OR missions,
  // mixed — pinned to the top of the All Rooms column. Effective activity = max(user visit,
  // last message). A room they just opened jumps to the front because recordVisit writes the
  // visit timestamp immediately. Only rooms with real activity (ts > 0) qualify, so a brand
  // new world doesn't show arbitrary "recents".
  const recentRooms = useMemo(() => {
    if (!cv6) return []
    const cands = []
    for (const p of (projectRooms || [])) {
      if (!p?.slug) continue
      const visitTs = recentVisits[p.slug] || 0
      const projTs = p.last_message_at ? new Date(p.last_message_at).getTime() : 0
      cands.push({ type: 'project', project: p, mission: null, ts: Math.max(visitTs, projTs), key: p.slug })
    }
    for (const m of (allMissionsForCV6 || [])) {
      const proj = m.project, mis = m.mission
      if (!proj?.slug || !mis?.slug) continue
      const vk = 'm:' + proj.slug + '/' + mis.slug
      const visitTs = recentVisits[vk] || 0
      const msgTs = mis.last_message_at ? new Date(mis.last_message_at).getTime() : 0
      cands.push({ type: 'mission', project: proj, mission: mis, ts: Math.max(visitTs, msgTs), key: vk })
    }
    return cands.filter(c => c.ts > 0).sort((a, b) => b.ts - a.ts).slice(0, 4)
  }, [cv6, projectRooms, allMissionsForCV6, recentVisits])

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
  // Patrik's model: arrows move the LIST (default = first agent); Tab moves the
  // TOOLS row; Enter/Right activates whichever lane is focused.
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [toolsFocused, setToolsFocused] = useState(false)
  const [toolNavIndex, setToolNavIndex] = useState(0)
  // R98: catch-up cards a user has cleared this session (optimistic — the parent also
  // marks them read, but hide instantly so the triage feels immediate).
  const [dismissedCatchup, setDismissedCatchup] = useState(() => new Set())
  // R183 (Patrik: "catch up + mobile matching the Claude design files"): a mobile
  // flag so the Catch Up cards size to the design spec on phones — body text never
  // below 16px (prevents iOS zoom), 44px touch targets — without touching the dense
  // desktop column. Breakpoint 720 matches the rest of the file's mobile swap.
  const [isNarrowHV, setIsNarrowHV] = useState(false)
  useEffect(() => {
    const check = () => setIsNarrowHV(typeof window !== 'undefined' && window.innerWidth <= 720)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  // R183: active card index for the mobile Catch Up carousel (drives the dots).
  const [catchupIdx, setCatchupIdx] = useState(0)
  // R-MOBILE 2026-06-19 (Patrik: "cards should swipe to the next one marking that catchup
  // resolved"). Mobile Catch Up is a full-width swipe-to-dismiss DECK: drag the top card past
  // a threshold and it flies off + marks that item caught up, surfacing the next behind it.
  // swipe.dx is the live drag offset; swipe.fly (-1/+1) plays the fly-off before the dismiss
  // commits. swipeStartX/swipeActive are refs so dragging never causes a stale-closure jump.
  const [swipe, setSwipe] = useState({ dx: 0, fly: 0 })
  const swipeStartX = useRef(0)
  const swipeActive = useRef(false)
  const [catchupReplyText, setCatchupReplyText] = useState('') // R110: custom reply on the top catch-up card
  // R110: reply to the top catch-up card (real send via onCatchupReply), then resolve + advance.
  const replyToCatchup = useCallback((notif, text) => {
    const t = (text || '').trim()
    if (!t || !notif) return
    if (onCatchupReply) onCatchupReply(notif, t)
    setCatchupReplyText('')
    setDismissedCatchup(prev => { const next = new Set(prev); next.add(notif.id); return next })
    if (onCatchupDismiss) onCatchupDismiss(notif)
  }, [onCatchupReply, onCatchupDismiss])
  const TOOL_TABS = useMemo(() => ([
    { key: 'organize', label: 'Organize' },
    { key: 'tracker', label: 'Tracker' }, { key: 'command', label: 'Command' }, { key: 'scribe', label: 'Live Scribe' },
  ]), [])
  const replyInputRef = useRef(null)
  // R137 (mobile): the 4 overflow tools live behind a "More" sheet on phones.
  // Home/Chat/Organize/Review stay as the 5-tab bottom bar (5th = More). Desktop
  // is untouched — the overflow tools and More toggle swap purely via cv6.css at
  // <=720px. MOBILE_MORE_KEYS = the tools that move into the sheet.
  const MOBILE_MORE_KEYS = useMemo(() => new Set(['support', 'tracker', 'command', 'scribe']), [])
  const [moreOpen, setMoreOpen] = useState(false)
  // R-MOBILE-NAV 2026-06-19 (Patrik): mobile gets a top-left menu icon that opens a left
  // side-nav drawer listing every tool vertically with its title (replaces the bottom dock).
  const [navDrawerOpen, setNavDrawerOpen] = useState(false)
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
    // A MISSION room must preselect the MISSION, not its parent project (Patrik: Right-arrow
    // from a mission quick-chat opened the project's chat). Mirror the openChatRequest mission
    // shape so the Chat tool resolves the exact room (roomKey project:mission).
    else if (room.project && room.mission) initial = { kind: 'mission', type: 'project', slug: room.project.slug, missionSlug: room.mission.slug, name: room.mission.name || room.mission.slug, roomKey: `${room.project.slug}:${room.mission.slug}` }
    else if (room.project) initial = { kind: 'project', type: 'project', slug: room.project.slug, name: room.project.name || room.project.slug }
    if (!initial) return
    setChatInitialRoom(initial)
    setSelectedTool('chat')
  }, [])
  // R62 (Patrik): a room picked anywhere in CV6 (notification, catchup, command tracker,
  // room links) opens THIS in-page Chat tool, preselected — never the old full-screen chat.
  // CornerVG bumps openChatRequest.nonce; we translate it to a Chat-tool room and open.
  useEffect(() => {
    if (!openChatRequest || !openChatRequest.slug) return
    let initial = null
    if (openChatRequest.kind === 'agent') initial = { kind: 'agent', slug: openChatRequest.slug, name: openChatRequest.name || openChatRequest.slug }
    else if (openChatRequest.kind === 'mission' && openChatRequest.missionSlug) initial = { kind: 'mission', type: 'project', slug: openChatRequest.slug, missionSlug: openChatRequest.missionSlug, name: openChatRequest.name || openChatRequest.missionSlug, roomKey: `${openChatRequest.slug}:${openChatRequest.missionSlug}` }
    else initial = { kind: 'project', type: 'project', slug: openChatRequest.slug, name: openChatRequest.name || openChatRequest.slug }
    setChatInitialRoom(initial)
    setSelectedTool('chat')
  }, [openChatRequest?.nonce])
  // Tablet/iPad (768-1024): the home conversation quick-view column is collapsed (cv6.css), so a
  // room tapped in the home All-Rooms list would open nothing. Route any room selected at tablet
  // width into the Chat tool's full-screen drill-in. (<768 opens chat via its own mobile path;
  // >1024 keeps the desktop quick-view.) Fixes the iPad home room-tap dead-end.
  useEffect(() => {
    if (!cv6 || !selectedRoom || typeof window === 'undefined') return
    const w = window.innerWidth
    if (w < 768 || w > 1024) return
    openChatToolForRoom(selectedRoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom])
  // R-PIXEL-LOOP R2: the Claude design's Home always shows a populated conversation in the right
  // column — never an empty "Select a mission" void. On desktop, default-select the first agent on
  // mount so the column is alive on load. Guarded to >1024 so it does NOT auto-open the Chat tool at
  // tablet width (the effect above routes tablet selections into the full Chat tool).
  useEffect(() => {
    if (!cv6 || selectedRoom || typeof window === 'undefined') return
    if (window.innerWidth <= 1024) return
    const first = Array.isArray(visibleAgents) && visibleAgents.length ? visibleAgents[0] : null
    if (!first) return
    setSelectedRoom({ agent: { slug: first.slug, name: first.name || first.slug } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv6, visibleAgents])
  // R82: an agent opens a tool on the user's screen (cv6-view channel → CornerVG → here).
  useEffect(() => {
    if (!openToolRequest || !openToolRequest.tool) return
    setSelectedTool(openToolRequest.tool)
  }, [openToolRequest?.nonce])
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
  const [roomSearchOpen, setRoomSearchOpen] = useState(false) // R98 (Patrik): search hidden behind an icon on the All rooms heading row

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
      meta: m.metadata || null,
      timestamp: m.timestamp || null,
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
            // Open the Chat tool PRESELECTED to this room. The tool reads chatInitialRoom
            // (not selectedRoom), so set it via openChatToolForRoom or it defaults to room 0.
            openChatToolForRoom({ project: proj })
          }
        }
      } catch (_) { /* a bad command must never break the dashboard */ }
    }
    const channel = supabase
      .channel(`cv6-viewcmd-${worldId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` }, (payload) => handle(payload.new))
      .subscribe()
    return () => { active = false; try { supabase.removeChannel(channel) } catch (_) {} }
  }, [worldId, cv6, openTool, openChatToolForRoom, projectRooms, VIEW_TOOL_KEYS])

  // R19: Suggested replies based on context (placeholder)
  const suggestedReplies = [
    { text: 'Got it' },
    { text: 'On it' },
    { text: 'Updates?' },
  ]

  // The arrow list mirrors the middle (All Rooms) column EXACTLY, top to bottom, so
  // ArrowDown starts at the top of that list and never lands on a hidden item
  // (Patrik 2026-06-19). When drilled into a project, the list is that project's
  // missions; otherwise it is Recents -> Agents -> all rooms.
  const selectableItems = useMemo(() => {
    if (!cv6) return []
    try {
      const items = []
      if (browsingProject) {
        const ms = missionsByProject[browsingProject.slug] || []
        ms.forEach((m) => { if (m?.slug) items.push({ type: 'mission', item: m, project: browsingProject }) })
        return items
      }
      recentRooms.forEach((r) => items.push({ type: 'recent', item: r }))
      if (Array.isArray(visibleAgents)) {
        visibleAgents.forEach((a) => { if (a?.slug) items.push({ type: 'agent', item: a }) })
      }
      ;[...(recentProjects || []), ...(allProjects || [])].forEach((p) => {
        if (p?.slug) items.push({ type: 'project', item: p })
      })
      return items
    } catch (_) {
      return []
    }
  }, [cv6, browsingProject, missionsByProject, recentRooms, visibleAgents, recentProjects, allProjects])

  // Return cursor to the top of the list whenever the middle column's screen changes
  // (enter a project -> top of its missions; back out -> top of all rooms).
  useEffect(() => { setSelectedIndex(0) }, [browsingProject])

  const handleKeyDown = useCallback((e) => {
    if (!cv6 || selectableItems.length === 0) return
    if (selectedTool && selectedTool !== 'home' && selectedTool !== 'files') return // R56: when a tool is open, its own nav takes over; 'files' shares home room nav
    // input-1: while the user is typing in the quick-reply (or any editable field),
    // arrows/Enter belong to that field — don't hijack focus into list navigation.
    const ae = (typeof document !== 'undefined') ? document.activeElement : null
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) return
    // R56 (Patrik keyboard model): Tab + Down/Up move the selection across EVERYTHING
    // (tools, agents, missions, needs-you, projects). Enter behaves EXACTLY like Right:
    // both "activate" the selected thing — open a tool, or two-press a room (quick view → open).
    const activate = () => {
      if (selectedIndex < 0 || selectedIndex >= selectableItems.length) return
      const sel = selectableItems[selectedIndex]
      if (!sel) return
      if (sel.type === 'recent') {
        // A recent row (project or mission): first activate = quick view, second = open chat.
        const r = sel.item
        const isM = r.type === 'mission'
        const inQuickView = selectedRoom && (isM
          ? (selectedRoom.mission && selectedRoom.mission.slug === r.mission.slug)
          : (!selectedRoom.mission && selectedRoom.project?.slug === r.project.slug))
        if (!inQuickView) {
          recordVisit(r.project.slug, isM ? r.mission.slug : null)
          setSelectedRoom({ project: r.project, mission: isM ? r.mission : null })
        } else {
          openChatToolForRoom({ project: r.project, mission: isM ? r.mission : null })
        }
      } else if (sel.type === 'needsyou') {
        sel.item.onOpen && sel.item.onOpen()
      } else if (sel.type === 'mission') {
        // R88 (Patrik): first activate = quick view; second activate opens the
        // Chat TOOL (matching the double-click), not the old full-chat navigation.
        const inQuickView = selectedRoom && selectedRoom.mission && selectedRoom.mission.slug === sel.item.slug
        if (!inQuickView) { recordVisit(sel.project.slug, sel.item.slug); setSelectedRoom({ project: sel.project, mission: sel.item }) }
        else { openChatToolForRoom({ project: sel.project, mission: sel.item }) }
      } else if (sel.type === 'project') {
        // Right/Enter on a folder drills into its missions in the middle column
        // (Patrik 2026-06-19): a project is a folder, so activating it changes the
        // column to its sub-missions — matching the row click + the chevron affordance.
        recordVisit(sel.item.slug, null)
        setBrowsingProject(sel.item)
      } else if (sel.type === 'agent') {
        const inQuickView = selectedRoom && selectedRoom.agent && selectedRoom.agent.slug === sel.item.slug
        if (!inQuickView) { setSelectedRoom({ agent: sel.item, project: null, mission: null }) }
        else { openChatToolForRoom({ agent: sel.item }) }
      }
    }
    if (e.key === 'Tab') {
      // Tab lane = the Tools row. First Tab enters the lane on the current tool
      // (Home by default); subsequent Tabs cycle. In files panel, Tab works normally.
      if (selectedTool === 'files') return
      e.preventDefault()
      if (!toolsFocused) { setToolsFocused(true); return }
      setToolNavIndex(prev => e.shiftKey ? (prev - 1 + TOOL_TABS.length) % TOOL_TABS.length : (prev + 1) % TOOL_TABS.length)
    } else if (e.key === 'ArrowDown') {
      // Arrow lane = the list. Coming down out of the tools lane lands on the TOP of the
      // All Rooms list (Patrik 2026-06-19), not wherever the cursor last sat.
      e.preventDefault()
      if (toolsFocused) { setToolsFocused(false); setSelectedIndex(0); return }
      if (selectableItems.length === 0) return
      setSelectedIndex(prev => (prev + 1) % selectableItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (toolsFocused) { setToolsFocused(false); return }
      if (selectableItems.length === 0) return
      setSelectedIndex(prev => prev <= 0 ? selectableItems.length - 1 : (prev - 1))
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (toolsFocused) { openTool(TOOL_TABS[toolNavIndex].key); return }
      activate()
    } else if (e.key === 'ArrowLeft') {
      // Left backs out: from inside a project's missions, return to the All Rooms list
      // (the useEffect on browsingProject puts the cursor back at the top). Otherwise
      // step out of a quick-view room (Patrik 2026-06-19).
      // In files panel, left always returns to home.
      e.preventDefault()
      if (selectedTool === 'files') { openTool('home'); return }
      if (browsingProject) { setBrowsingProject(null); setSelectedRoom(null) }
      else if (selectedRoom) setSelectedRoom(null)
    }
  }, [cv6, selectableItems, selectedIndex, toolsFocused, toolNavIndex, TOOL_TABS, selectedRoom, openTool, selectedTool, openChatToolForRoom, recordVisit, browsingProject])

  useEffect(() => {
    if (!cv6) return
    const homeEl = homeRef.current
    if (!homeEl) return
    homeEl.addEventListener('keydown', handleKeyDown)
    return () => homeEl.removeEventListener('keydown', handleKeyDown)
  }, [cv6, handleKeyDown])
  // R57: only grab focus for the home rail when we're actually on Home. Doing it on every
  // handleKeyDown recreation stole focus back from an open tool's inputs (e.g. the chat box),
  // which broke the chat tool's Left-arrow flow.
  useEffect(() => {
    if (!cv6) return
    if (selectedTool === 'home' || selectedTool === 'files') homeRef.current?.focus()
    // kb-6: leaving home into a tool drops the home quick-view room so it can't
    // linger as a stale ArrowLeft target after the tool is closed.
    else if (selectedRoom) setSelectedRoom(null)
  }, [cv6, selectedTool])
  // kb-4: clamp selectedIndex when selectableItems.length shrinks
  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, selectableItems.length - 1))
  }, [selectableItems.length])

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

  // R64: a single agent row, reused so Agents can sit stacked above Active Work in the
  // middle column (Patrik) without duplicating markup. Same click/keyboard behavior as before.
  const renderAgentRow = (a, idx) => {
    const isSelected = cv6 && !toolsFocused && selectedIndex >= 0 && selectableItems[selectedIndex]?.item?.slug === a.slug && selectableItems[selectedIndex]?.type === 'agent'
    return (
      <button
        key={a.slug}
        className="hm-card hm-room-row"
        data-cv6-sel={isSelected ? 'true' : undefined}
        onClick={() => {
          if (cv6) { selectByItem('agent', a.slug); setSelectedRoom({ agent: a, project: null, mission: null }); homeRef.current?.focus() }
          else { onSelectAgent && onSelectAgent(a) }
        }}
        onContextMenu={cv6 ? (e) => { e.preventDefault(); selectByItem('agent', a.slug); setCardMenu({ x: e.clientX, y: e.clientY, type: 'agent', item: a, project: null }) } : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '0 15px', height: '52px',
          boxSizing: 'border-box', width: '100%', position: 'relative', overflow: 'hidden',
          background: isSelected ? roomFill(a.slug) : 'transparent',
          color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
          border: isSelected ? `1px solid ${roomFill(a.slug)}` : '1px solid transparent',
          boxShadow: isSelected ? `0 3px 14px ${roomGlow(a.slug)}` : 'none',
          borderRadius: '0', cursor: 'pointer',
          transition: 'background 220ms ease, border-color 160ms ease, transform 200ms ease',
          fontFamily: 'inherit', textAlign: 'left', fontSize: '14.5px', fontWeight: '600',
          borderBottom: isSelected ? 'none' : '1px solid var(--cv6-divider)',
        }}
        onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'var(--cv6-surface-hover)' } }}
        onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent' } }}
      >
        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: `hsl(${roomHue(a.slug)}, 60%, 55%)`, boxShadow: `0 0 8px ${roomGlow(a.slug)}`, flexShrink: 0 }}></span>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || a.slug}</div>
        {/* DELTA 3: live status label — render ONLY when a REAL status exists on the
            agent object. No fake placeholder (project rule: real data only). Wire from
            the worker / command-ledger status source as a follow-up. */}
        {a.status && (
          <span style={{ fontSize: '11.5px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--cv6-text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {a.status}
          </span>
        )}
      </button>
    )
  }

  // R64: the home Catch-up column (Patrik) — lives where Agents used to be. A polished,
  // simple list of what landed while you were away; tap a row to open that room's chat.
  const renderCatchupColumn = () => (
    <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '26px', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cv6-text-secondary)' }}>Catch up</span>
        {catchupNotifications.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '20px', height: '20px', fontSize: '11px', fontWeight: '700', color: 'var(--cv6-accent-primary)', background: 'var(--cv6-accent-weak)', borderRadius: '10px', padding: '0 6px' }}>{catchupNotifications.length}</span>
        )}
        {isNarrowHV && catchupNotifications.length > 1 && (
          <span style={{ marginLeft: 'auto', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--cv6-text-tertiary)' }}>1 of {catchupNotifications.length} · swipe →</span>
        )}
      </div>
      {catchupNotifications.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center', padding: '24px', minHeight: '220px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--cv6-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px var(--cv6-divider)' }}>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="var(--cv6-accent-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-secondary)', maxWidth: '200px' }}>Nothing needs you right now.</div>
        </div>
      ) : (() => {
        // Patrik (R75): Catch up is a QUICK TOOL, not a feed. Collapse the firehose to
        // ONE card per room (latest message wins, with an "N new" count), rank by what
        // most deserves attention (human > attachment > a question/ask > recency), and
        // cap at FIVE. Overflow lives behind "View all" → the full Catch Up modal.
        const byRoom = new Map()
        for (const n of catchupNotifications) {
          const key = n._roomKey || (n.roomName && n.projectSlug ? `${n.roomName}_${n.projectSlug}` : n.roomName) || n.id
          const prev = byRoom.get(key)
          const tNew = new Date(n.timestamp || 0).getTime() || 0
          const tPrev = prev ? (new Date(prev.timestamp || 0).getTime() || 0) : -1
          if (!prev || tNew >= tPrev) byRoom.set(key, { ...n, _roomCount: (prev?._roomCount || 0) + 1 })
          else byRoom.set(key, { ...prev, _roomCount: (prev._roomCount || 0) + 1 })
        }
        const isAsk = (s) => /\?\s*$/.test((s || '').trim()) || /\?/.test(s || '')
        const score = (n) => {
          let s = 0
          if (n.senderType === 'human') s += 1000
          if (n.attachment || (n.attachments && n.attachments.length)) s += 60
          if (isAsk(n.messagePreview)) s += 40
          s += (new Date(n.timestamp || 0).getTime() || 0) / 1e10 // recency tiebreaker
          return s
        }
        const top = [...byRoom.values()].filter(n => !dismissedCatchup.has(n.id)).sort((a, b) => score(b) - score(a)).slice(0, 5)
        const overflow = catchupNotifications.length - top.length
        // R183 (Patrik top priority — Mobile Handoff): on phones, Catch Up is a
        // horizontal snap carousel of 296px cards (matches Corner Mobile.dc.html
        // Direction A, themed by the live light/dark/glass picker). Desktop keeps
        // the dense vertical list below. swipe → hint + pagination dots.
        // R-MOBILE-B 2026-06-19 (Patrik: "cards in catch up not swipeable"). Mobile uses the
        // horizontal swipe carousel (Corner Mobile.dc.html Direction A/B — both are swipe decks,
        // differing only in surface style). Desktop keeps the stacked deck below.
        if (isNarrowHV) {
          // R-MOBILE 2026-06-19 (Patrik live iPhone): full-width swipe-to-dismiss DECK. The top
          // card fills the column (no 296px peek = no "white bar" on the right); swiping it past
          // a threshold flies it off and marks that item caught up, surfacing the next behind it.
          const THRESH = 90
          const topCard = top[0]
          const dismissTop = () => {
            if (!topCard) return
            setDismissedCatchup(prev => { const next = new Set(prev); next.add(topCard.id); return next })
            if (onCatchupDismiss) onCatchupDismiss(topCard)
            setCatchupIdx(0)
          }
          if (!topCard) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '28px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--cv6-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px var(--cv6-divider)' }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--cv6-accent-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cv6-text-secondary)' }}>Nothing needs you right now.</div>
              </div>
            )
          }
          const deck = top.slice(0, 3)
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                {deck.map((n, idx) => {
                  const isTop = idx === 0
                  // cards behind the top one are just faint surfaces that give the stack depth.
                  if (!isTop) {
                    return (
                      <div key={n.id} aria-hidden="true" className="hm-catchup-card"
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', zIndex: 5 - idx,
                          transform: `translateY(${idx * 9}px) scale(${1 - idx * 0.045})`, opacity: idx === 1 ? 0.9 : 0.74,
                          background: 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '18px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.10), 0 10px 26px -14px rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
                    )
                  }
                  const human = n.senderType === 'human'
                  const ask = isAsk(n.messagePreview)
                  const hasAttachment = !!(n.attachment || (n.attachments && n.attachments.length))
                  const att = n.attachment || (n.attachments && n.attachments[0]) || null
                  const attName = att ? (att.name || (typeof att === 'string' ? att : 'Attachment')) : 'Attachment'
                  const attSize = att && att.size ? `${Math.max(1, Math.round(att.size / 1024))} KB` : ''
                  const open = () => onCatchupOpenRoom && onCatchupOpenRoom(n)
                  const dismiss = (e) => { e.stopPropagation(); setDismissedCatchup(prev => { const next = new Set(prev); next.add(n.id); return next }); onCatchupDismiss && onCatchupDismiss(n) }
                  const flying = swipe.fly !== 0
                  const dragging = swipeActive.current && swipe.dx !== 0
                  const vw = typeof window !== 'undefined' ? window.innerWidth : 480
                  const tx = flying ? swipe.fly * (vw + 140) : (dragging ? swipe.dx : 0)
                  return (
                    <div key={n.id} role="button" tabIndex={0} className="hm-catchup-card"
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
                      onPointerDown={(e) => { swipeStartX.current = e.clientX; swipeActive.current = true; try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {} }}
                      onPointerMove={(e) => { if (!swipeActive.current) return; setSwipe(s => ({ ...s, dx: e.clientX - swipeStartX.current })) }}
                      onPointerUp={(e) => {
                        if (!swipeActive.current) return
                        swipeActive.current = false
                        const dx = e.clientX - swipeStartX.current
                        if (Math.abs(dx) > THRESH) { setSwipe({ dx, fly: dx > 0 ? 1 : -1 }); window.setTimeout(() => { dismissTop(); setSwipe({ dx: 0, fly: 0 }) }, 240) }
                        else { setSwipe({ dx: 0, fly: 0 }); if (Math.abs(dx) < 6 && !(e.target.closest && e.target.closest('button'))) open() }
                      }}
                      onPointerCancel={() => { swipeActive.current = false; setSwipe({ dx: 0, fly: 0 }) }}
                      style={{ position: 'relative', zIndex: 5, boxSizing: 'border-box', overflow: 'hidden',
                        transform: `translateX(${tx}px) rotate(${dragging ? swipe.dx * 0.022 : 0}deg)`,
                        transition: dragging ? 'none' : 'transform 240ms cubic-bezier(.22,1,.36,1), opacity 240ms ease',
                        opacity: flying ? 0 : 1, touchAction: 'none', userSelect: 'none',
                        background: 'var(--cv6-surface)', backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
                        border: '1px solid var(--cv6-divider)', borderRadius: '18px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.10), 0 14px 36px -14px rgba(0,0,0,0.45)', cursor: 'grab', textAlign: 'left', fontFamily: 'inherit' }}>
                      {/* Catch-up card — canonical mobile design (claude_design 2b54700b ui_kits/mobile):
                          icon tile + name/context + type tag, summary box, action items (conditional),
                          attachment row (conditional), then a divided Suggested actions section. */}
                      <div style={{ padding: '14px 16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <span style={{ width: '34px', height: '34px', borderRadius: '10px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12.5px', fontWeight: 700,
                            background: human ? 'color-mix(in srgb, var(--cv6-accent-primary) 16%, transparent)' : 'color-mix(in srgb, var(--cv6-accent-success) 16%, transparent)',
                            color: human ? 'var(--cv6-accent-primary)' : 'var(--cv6-accent-success)' }}>{n.senderInitials || (n.senderName || '?')[0]}</span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {/* name wraps to the next line on mobile instead of truncating (Patrik) */}
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cv6-text-primary)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                              {n.projectSlug ? `${n.senderName} · ${n.roomName || n.projectSlug}` : n.senderName}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--cv6-text-secondary)', overflowWrap: 'anywhere' }}>
                              {n._roomCount > 1 ? `${n._roomCount} new updates` : (n.projectSlug ? `→ ${n.projectSlug}` : (n.roomName || ''))}
                            </div>
                          </div>
                          {ask && <span style={{ flex: 'none', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cv6-accent-primary)', background: 'var(--cv6-accent-weak)', borderRadius: '6px', padding: '3px 8px' }}>Ask</span>}
                        </div>
 {/* Summary block, the message gist in the design's inset card (no border,
 surface-2 fill). Real message text; the AI "Summary , " lead is the wiring gap. */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'var(--cv6-surface2)', borderRadius: '10px', padding: '11px 12px', marginBottom: '14px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--cv6-accent-primary)" style={{ flex: 'none', marginTop: '1px' }}><path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15l-1.6-4.4L5.5 9l4.9-1.1Z"/></svg>
                          <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--cv6-text-primary)', maxHeight: '84px', overflowY: 'auto' }}>
                            {(n.messagePreview || (n._roomCount > 1 ? `${n._roomCount} new updates` : 'New update')).replace(/[*_~\x60]|^#+\s?/gm, '')}
                          </div>
                        </div>
                        {/* Action items — shown only when an agent has extracted them. Real-data-only:
                            the extraction step is the open wiring gap, so this stays conditional, never faked. */}
                        {Array.isArray(n.actionItems) && n.actionItems.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cv6-text-secondary)', marginBottom: '9px' }}>Action items</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {n.actionItems.slice(0, 4).map((it, ix) => (
                                <div key={ix} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '13px', color: 'var(--cv6-text-primary)', lineHeight: 1.4 }}>
                                  <span style={{ width: '16px', height: '16px', borderRadius: '5px', border: '2px solid var(--cv6-accent-primary)', flex: 'none', marginTop: '1px' }} />
                                  <span>{String(it).replace(/[*_~\x60]/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Attachment row — when the catch-up item carries one (real name + size). */}
                        {hasAttachment && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 11px', border: '1px solid var(--cv6-hair)', borderRadius: '11px', background: 'var(--cv6-surface2)', marginBottom: '15px' }}>
                            <span style={{ width: '38px', height: '38px', borderRadius: '9px', background: 'var(--cv6-accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: 'var(--cv6-accent-primary)' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attName}</div>
                              {attSize && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10.5px', color: 'var(--cv6-text-tertiary)' }}>{attSize}</div>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); openTool('review') }} style={{ height: '30px', padding: '0 12px', borderRadius: '8px', border: 'none', background: 'var(--cv6-accent-weak)', color: 'var(--cv6-accent-primary)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', flex: 'none' }}>Review</button>
                          </div>
                        )}
                      </div>
 {/* Suggested actions, in the design's divided footer section. Draft reply opens
                          the room; Add to Tracker opens the tracker. Real handlers; mark-handled = swipe. */}
                      <div style={{ borderTop: '1px solid var(--cv6-divider)', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cv6-text-secondary)', marginBottom: '10px' }}>Suggested actions</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button onClick={(e) => { e.stopPropagation(); open() }} style={{ height: '42px', borderRadius: '10px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            Draft reply
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openTool('tracker') }} style={{ height: '42px', borderRadius: '10px', border: '1px solid var(--cv6-hair)', background: 'var(--cv6-surface2)', color: 'var(--cv6-text-primary)', fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                            Add to Tracker
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {(top.length > 1 || overflow > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '13px' }}>
                  {top.map((_, i) => (
                    <span key={i} style={{ height: '6px', borderRadius: '3px', width: i === 0 ? '18px' : '6px', background: i === 0 ? 'var(--cv6-accent-primary)' : 'var(--cv6-divider)', transition: 'width .25s ease, background .25s ease' }} />
                  ))}
                  {overflow > 0 && (
                    <button onClick={() => onCatchupViewAll && onCatchupViewAll()}
                      style={{ marginLeft: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 600, color: 'var(--cv6-text-tertiary)' }}>
                      +{overflow} more
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        }
        // DELTA 2: Desktop = swipe deck (same as mobile, but positioned cards instead of carousel)
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Stacked card deck container */}
            <div style={{
              position: 'relative',
              height: '128px',
              marginBottom: '22px',
            }}>
              {/* Cards loop — top 3 visible (rest hidden behind) */}
              {top.map((n, i) => {
                const human = n.senderType === 'human'
                const ask = isAsk(n.messagePreview)
                const open = () => onCatchupOpenRoom && onCatchupOpenRoom(n)
                const dismiss = (e) => { e.stopPropagation(); setDismissedCatchup(prev => { const next = new Set(prev); next.add(n.id); return next }); onCatchupDismiss && onCatchupDismiss(n) }

                // Transform for stacking effect
                let tf, op, trans, pe
                if (i === 0) {
                  // Top card: draggable (placeholder for future drag state)
                  const dragX = 0
                  tf = `translateX(${dragX}px) rotate(${(dragX * 0.025).toFixed(2)}deg)`
                  op = Math.max(0, 1 - Math.abs(dragX) / 300)
                  trans = 'transform .4s cubic-bezier(.22,1,.36,1),opacity .3s ease'
                  pe = 'auto'
                } else {
                  // Behind cards: parallax scale/translate
                  tf = `translateY(${i * 10}px) scale(${(1 - i * 0.04).toFixed(3)})`
                  op = i === 1 ? 0.9 : 0.74
                  trans = 'transform .4s cubic-bezier(.22,1,.36,1),opacity .3s ease'
                  pe = 'none'
                }

                return (
                  <div key={n.id}
                    className="glassy hm-catchup-card"
                    onClick={i === 0 ? () => onCatchupOpenRoom && onCatchupOpenRoom(n) : undefined}
                    title={i === 0 ? 'Open in chat to read the full message' : undefined}
                    style={{
                      position: 'absolute',
                      left: 0, right: 0, top: 0,
                      height: '118px',
                      overflow: 'hidden',
                      background: 'var(--cv6-surface)',
                      border: '1px solid var(--cv6-divider)',
                      borderRadius: '16px',
                      padding: '14px',
                      // Softer, single shadow only on the top card (Patrik 2026-06-19: the
                      // stacked cards had too much drop shadow). Behind cards rely on the
                      // border + scale offset, no shadow, so the stack reads clean.
                      boxShadow: i === 0 ? '0 6px 18px -12px rgba(0,0,0,.30)' : 'none',
                      touchAction: 'none',
                      cursor: i === 0 ? 'pointer' : 'default',
                      transition: trans,
                      transform: tf,
                      opacity: op,
                      zIndex: 30 - i,
                      pointerEvents: pe,
                    }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'color-mix(in srgb, var(--cv6-accent-primary) 16%, transparent)',
                        color: 'var(--cv6-accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700', flex: 'none',
                      }}>
                        {n.senderInitials || (n.senderName || '?')[0]}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>
                          {/* R3: Show Project → Mission room name if this is a mission room; otherwise show senderName for 1:1 EA messages */}
                          {n.projectSlug ? `${n.projectSlug} → ${n.roomName}` : n.senderName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--cv6-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.projectSlug ? `From ${n.senderName}` : n.roomName}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10.5px', color: 'var(--cv6-text-tertiary)', flex: 'none' }}>
                        {n.timeAgo}
                      </div>
                    </div>
                    {/* R-PIXEL-LOOP R3: plain left-aligned body (2-line clamp) to match the Claude
                        design. Was a centered italic quote box with an accent border + tint — not
                        in the picture. */}
                    <div style={{
                      fontSize: '13.5px', lineHeight: 1.5, color: 'var(--cv6-text-primary)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {(() => {
                        if (n.attachment || (n.attachments && n.attachments.length)) {
                          const fname = n.attachment?.name || (n.attachments?.[0]?.name) || 'attachment'
                          return `Attached file: ${fname}`
                        }
                        return (n.messagePreview || 'New update').replace(/[*_~\x60]|^#+\s?/gm, '')
                      })()}
                    </div>
                  </div>
                )
              })}
              {/* "All caught up" state when remaining.length === 0 */}
              {top.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '16px', border: '1px solid var(--cv6-divider)',
                  background: 'var(--cv6-surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cv6-accent-success-weak)', color: 'var(--cv6-accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>You're all caught up</div>
                </div>
              )}
            </div>

            {/* Top-card actions (Patrik): suggested quick replies + a custom reply + Open in chat
                + resolve — ALL act on the TOP card and advance on action. zIndex sits above the
                stacked cards. Replies send for REAL via onCatchupReply (CornerVG → supabase, marks
                read). TODO(cv6): make the quick replies context-aware via a smart-reply model —
                light heuristic (ask vs not) for now, no fabricated per-card data. */}
            {top.length > 0 && (
              // Options sit directly under the cards (Patrik 2026-06-19); the breathing space
              // goes BELOW the options, with the Corner lockup pinned to the column bottom.
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 40 }}>
                {/* R-PIXEL-LOOP R3: two outlined chips under the card (Thanks / Review), matching the
                    Claude design. With an attachment the second chip is "Review" (jumps to the Review
                    view); otherwise both are quick replies. The free-text "Reply to…" input was removed
                    — the composer lives in the conversation column, not here (design has no input here). */}
                {onCatchupReply && (() => {
                  const hasAttach = !!(top[0].attachment || (top[0].attachments && top[0].attachments.length))
                  const ask = isAsk(top[0].messagePreview)
                  const chips = hasAttach
                    ? [{ label: 'Thanks', act: () => replyToCatchup(top[0], 'Thanks') }, { label: 'Review', act: () => openTool('review') }]
                    : (ask
                        ? [{ label: 'Sounds good', act: () => replyToCatchup(top[0], 'Sounds good') }, { label: 'Tell me more', act: () => replyToCatchup(top[0], 'Tell me more') }]
                        : [{ label: 'Thanks', act: () => replyToCatchup(top[0], 'Thanks') }, { label: 'On it', act: () => replyToCatchup(top[0], 'On it') }])
                  return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {chips.map(c => (
                        <button key={c.label} onClick={c.act}
                          style={{ flex: 1, height: '44px', borderRadius: '12px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface2)', color: 'var(--cv6-text-primary)', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer' }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )
                })()}
                {/* Custom reply bar below the quick responses (Patrik 2026-06-19): type a reply
                    to the top card; Enter or the send button posts it for real. */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={catchupReplyText}
                    onChange={(e) => setCatchupReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && catchupReplyText.trim()) { e.preventDefault(); replyToCatchup(top[0], catchupReplyText) } }}
                    placeholder="Write a reply…"
                    style={{ flex: 1, height: '44px', boxSizing: 'border-box', padding: '0 14px', borderRadius: '12px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface2)', color: 'var(--cv6-text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                  />
                  <button onClick={() => replyToCatchup(top[0], catchupReplyText)} disabled={!catchupReplyText.trim()} title="Send reply"
                    style={{ width: '44px', height: '44px', flex: 'none', borderRadius: '12px', border: 'none', background: catchupReplyText.trim() ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface2)', color: catchupReplyText.trim() ? '#fff' : 'var(--cv6-text-tertiary)', cursor: catchupReplyText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { onCatchupOpenRoom && onCatchupOpenRoom(top[0]) }}
                    style={{ flex: 1, height: '44px', borderRadius: '12px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
                    Open in chat
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </button>
                  <button onClick={() => { setDismissedCatchup(prev => { const next = new Set(prev); next.add(top[0].id); return next }); onCatchupDismiss && onCatchupDismiss(top[0]) }}
                    title="Resolve"
                    style={{ width: '44px', height: '44px', flex: 'none', borderRadius: '12px', border: '1px solid var(--cv6-accent-success-weak)', background: 'var(--cv6-accent-success-weak)', color: 'var(--cv6-accent-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Corner lockup pinned to the bottom of the catch-up column (Patrik 2026-06-19):
                cards, options, then breathing space, then the logo at the bottom. Faint grey
                (container opacity fades the mark + wordmark together so they match in both
                themes) and shrunk 20% (30 -> 24px). Desktop only — on the phone home the
                column is content-height and All Rooms follows directly, so the logo would
                float mid-page (R-MOBILE-B). */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', display: isNarrowHV ? 'none' : 'flex', alignItems: 'center', gap: '8px', opacity: 0.4 }}>
              <img src={themeMode === 'light' ? '/corner/brand/corner-mark-dark.png' : '/corner/brand/corner-mark-white.png'} alt="Corner" style={{ height: '24px', width: '24px', display: 'block', objectFit: 'contain', flexShrink: 0 }} />
              <span style={{ fontFamily: "'Bricolage Grotesque', 'Hanken Grotesk', sans-serif", fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--cv6-text-primary)', lineHeight: 1 }}>Corner</span>
            </div>
          </div>
        )
      })()}
    </div>
  )

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
          [data-cv4-home] .hm-shell { padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px calc(80px + env(safe-area-inset-bottom, 0px)); }
        }
      `}</style>}

      {/* R7: CV6 layout — missions as primary, keyboard navigation, inline actions, happening now */}
      {cv6 ? (
        <div className="hm-shell" style={{ maxWidth: '100%' }}>
          {/* R12: Top nav bar — global icons — primary (left) + secondary (right) with divider, 24px icons, strong hover.
              R-QA-FIX-15: on HOME these four icons move into the one-line greeting row (top-right);
              this standalone bar now renders only on tool screens (selectedTool !== 'home'). */}
          {/* Superseded by the always-on top bar below (Patrik 2026-06-19: the greeting +
              tools + icons bar is now locked into EVERY view, so this separate tool-screen
              bar is disabled to avoid duplicate icons). */}
          {false && cv6 && selectedTool !== 'home' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
              height: '54px', marginBottom: '8px',
            }}>
              {/* Primary group (left): Search + Theme + Info.
                  R50 removed the Home icon (duplicated Tools→Home).
                  R53 removed Explorer (duplicated the projects/missions tree on the Home body)
                  and Files (duplicated the Files tool in the Tools row) — both were unlabeled
                  duplicate destinations. CV6 R71: readded Search, Theme, and Help/Info icons. */}
              {/* Primary group (left): compact Search icon + Theme cycle button. Patrik prefers
                  the space-saving icons over the wide pill / segmented switch (2026-06-18). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  title="Search anything"
                  onClick={() => setShowSearch(true)}
                  style={{
                    width: '38px', height: '38px', borderRadius: '11px', border: 'none',
                    background: 'var(--cv6-surface)', cursor: 'pointer', color: 'var(--cv6-text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease', padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
                  </svg>
                </button>
                {/* Theme cycle: sun (light) → moon (dark) → glass orb (glass). */}
                <button
                  title="Switch theme"
                  aria-label="Switch theme"
                  data-theme-mode={themeMode}
                  onClick={() => cycleTheme()}
                  style={{
                    width: '38px', height: '38px', borderRadius: '11px', border: 'none',
                    background: 'var(--cv6-surface)', cursor: 'pointer', color: 'var(--cv6-text-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms ease', padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; }}
                >
                  {themeMode === 'light' ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  ) : themeMode === 'dark' ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="10" r="7"/>
                      <path d="M8.4 7.6a4.6 4.6 0 0 1 3-1.9" opacity="0.85"/>
                      <path d="M9 17.4h6M9.6 17.4l-1 3.1M14.4 17.4l1 3.1"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div style={{ flex: 1 }}></div>

              {/* Secondary group (right): Notifications + Avatar. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Notifications bell — transparent, 38x38, unread accent dot */}
                <button
                  title="Notifications"
                  onClick={() => { if (cv6) setSelectedTool('home'); else window.location.href = '/dashboard?view=notifications' }}
                  style={{
                    width: '38px', height: '38px', borderRadius: '11px', border: 'none',
                    background: 'transparent', cursor: 'pointer', color: 'var(--cv6-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    transition: 'all 120ms ease', padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
                  </svg>
                  {catchupNotifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '7px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--cv6-accent-primary)', border: '2px solid var(--cv6-ground)' }} />
                  )}
                </button>
 {/* Avatar, gradient circle with the user's initial. On mobile (R-MOBILE-NAV,
                    Patrik) it's the menu trigger: tap opens the right side-nav drawer. Desktop
                    keeps it as the settings link. */}
                <button
                  title={isNarrowHV ? 'Menu' : 'User settings'}
                  onClick={() => isNarrowHV ? setNavDrawerOpen(true) : (window.location.href = '/dashboard?view=settings')}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                    background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', cursor: 'pointer', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                    fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                    transition: 'transform 120ms ease', padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {(displayName(user) || 'U').trim().charAt(0).toUpperCase()}
                </button>
              </div>
            </div>
          )}

          {/* Top bar (greeting + centered tools + right icons) LOCKED into every view
              (Patrik 2026-06-19: "we feel good about the top bar, lock it into all tool
              views"). Was home-only; now always rendered, with the active tool tile as the
              header indicator. */}
          {(true) && (cv6 && showSearch ? (
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: cv6 ? 'flex-start' : 'space-between', marginTop: cv6 ? '-6px' : 0, marginBottom: cv6 ? '10px' : '32px' }}>
            {/* Cell 1 — greeting, over the Catch Up column (mirrors its 360px width). The Corner
                mark moved to the bottom-left brand lockup (Patrik 2026-06-19). The cell sizes to
                content but holds 360px min and grows for a longer name, keeping the tools clear. */}
            <div className="hm-greeting-cell" style={{ display: 'flex', alignItems: 'center', ...(cv6 ? { flex: '0 0 auto', minWidth: '360px' } : {}) }}>
              <h1 className="hm-welcome" style={{ margin: 0, lineHeight: 1, ...(cv6 ? { minWidth: 0, whiteSpace: 'nowrap' } : {}) }}>
                <span className="hm-l1">{greeting}</span>{' '}
                <span className="hm-l2" style={{ textTransform: 'capitalize' }}>{displayName(user) || 'there'}.</span>
              </h1>
            </div>
            {/* Cell 2 — compact tool bar, CENTERED within the All Rooms column span (Patrik
                2026-06-19). Tiles ~20% smaller; the active tile is solid accent and serves as
                the section/header indicator. Big tile row is hidden on home desktop (cv6.css)
                and stays as the mobile dock + the tool-screen nav. */}
            {cv6 && (<>
              {/* Flexible spacers each side keep the tools centered between the greeting and the
                  icons. The greeting cell sizes to its content (min 360px = the catch-up column
                  width) and GROWS if a longer name ever lands, pushing the tools right; the 32px
                  min on this spacer guarantees a gap so the tools can never collide with the
                  greeting (Patrik 2026-06-19). The tools cell never shrinks (flex 0 0 auto). */}
              <div style={{ flex: 1, minWidth: '32px' }} />
              <div style={{ flex: '0 0 auto', display: 'flex', minWidth: 0 }}>
                <div className="hm-greeting-tools" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {HOME_TOOLS.map(t => {
                    const active = selectedTool === t.key
                    return (
                      <button
                        key={t.key}
                        data-active={active ? 'true' : undefined}
                        onClick={() => openTool(t.key)}
                        title={t.label}
                        style={{
                          flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          borderRadius: '10px', padding: '6px 5px', minWidth: '51px',
                          border: active ? '1px solid var(--cv6-accent-primary)' : '1px solid var(--cv6-divider)',
                          background: active ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                          color: active ? '#ffffff' : 'var(--cv6-text-secondary)',
                          cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)' } }}
                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.borderColor = 'var(--cv6-divider)' } }}
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.svg}</svg>
                        <span style={{ fontSize: '8.5px', fontWeight: 600, whiteSpace: 'nowrap', color: active ? '#ffffff' : 'var(--cv6-text-secondary)' }}>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '32px' }} />
            </>)}
            {/* Cell 3 — global icons (search, theme, notifications, avatar), over the
                conversation column on the right. Smaller than the tool tiles; the bell gets a
                solid white background (Patrik 2026-06-19) so notifications stand out. */}
            {cv6 && (
              <div className="hm-topbar-globals" style={{ flex: '0 1 420px', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button title="Search anything" onClick={() => setShowSearch(true)}
                  style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', cursor: 'pointer', color: 'var(--cv6-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flex: 'none', transition: 'all 120ms ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-secondary)' }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                </button>
                <button title="Switch theme" aria-label="Switch theme" data-theme-mode={themeMode} onClick={() => cycleTheme()}
                  style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', cursor: 'pointer', color: 'var(--cv6-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flex: 'none', transition: 'all 120ms ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-secondary)' }}>
                  {themeMode === 'light' ? (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : themeMode === 'dark' ? (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7"/><path d="M8.4 7.6a4.6 4.6 0 0 1 3-1.9" opacity="0.85"/><path d="M9 17.4h6M9.6 17.4l-1 3.1M14.4 17.4l1 3.1"/></svg>
                  )}
                </button>
                <button className="hm-global-bell" title="Notifications" onClick={() => { if (cv6) setSelectedTool('home'); else window.location.href = '/dashboard?view=notifications' }}
                  style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface)', cursor: 'pointer', color: 'var(--cv6-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 0, flex: 'none', transition: 'all 120ms ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.color = 'var(--cv6-text-secondary)' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
                  {catchupNotifications.length > 0 && (
                    <span style={{ position: 'absolute', top: '5px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cv6-accent-primary)', border: '1.5px solid var(--cv6-surface)' }} />
                  )}
                </button>
                <button className="hm-global-avatar" title={isNarrowHV ? 'Menu' : 'User settings'} onClick={() => isNarrowHV ? setNavDrawerOpen(true) : (window.location.href = '/dashboard?view=settings')}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', padding: 0, transition: 'transform 120ms ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
                  {(displayName(user) || 'U').trim().charAt(0).toUpperCase()}
                </button>
              </div>
            )}
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
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--cv6-accent-weak)'
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
          <div className={'hm-tools-block hm-tools-block--home'} style={{ marginTop: '-4px', marginBottom: '8px' }}>
            <div className="hm-tools-heading" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', paddingBottom: '10px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Tools</div>
            <div className="hm-tools-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'nowrap', rowGap: '12px' }}>
              {/* R48: Home pinned first, LOCKED order (a nav that reshuffles kills spatial
                  memory). Mobile: one scrollable bottom dock (cv6.css .hm-tools-row).
                  R-QA-FIX-15: this big tile row is now the MOBILE dock only; on desktop it is
                  hidden (cv6.css) in favor of the compact greeting-row tool bar below. */}
              {HOME_TOOLS.map(t => (
                <button
                  key={t.key}
                  data-active={selectedTool === t.key ? 'true' : undefined}
                  className={MOBILE_MORE_KEYS.has(t.key) ? 'hm-tool hm-tool-overflow' : 'hm-tool hm-tool-primary'}
                  onClick={() => openTool(t.key)}
                  title={t.label}
                  style={{
                    flex: '1 1 0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '9px',
                    padding: '15px 8px', borderRadius: '14px', border: selectedTool === t.key ? '2px solid var(--cv6-accent-primary)' : '1px solid var(--cv6-divider)',
                    // R56: ring the tool the keyboard cursor is on (Tab/arrows), distinct from the open tool
                    boxShadow: (toolsFocused && TOOL_TABS[toolNavIndex]?.key === t.key) ? '0 0 0 2px var(--cv6-accent-primary)' : 'none',
                    // kbd-tool-ring: the glass frost rule sets box-shadow !important on tool
                    // tiles, masking the ring above. outline is not overridden by box-shadow,
                    // so the keyboard cursor stays visible on every theme (incl. glass).
                    outline: (toolsFocused && TOOL_TABS[toolNavIndex]?.key === t.key) ? '2px solid var(--cv6-accent-primary)' : 'none',
                    outlineOffset: '2px',
                    background: selectedTool === t.key ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                    color: selectedTool === t.key ? '#ffffff' : 'var(--cv6-text-secondary)',
                    cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontWeight: '500',
                    minWidth: '88px', minHeight: '78px',
                  }}
                  onMouseEnter={(e) => { if (selectedTool !== t.key) { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)' } }}
                  onMouseLeave={(e) => { if (selectedTool !== t.key) { e.currentTarget.style.background = 'var(--cv6-surface)'; e.currentTarget.style.borderColor = 'var(--cv6-divider)' } }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                    {t.svg}
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', color: selectedTool === t.key ? '#ffffff' : 'var(--cv6-text-secondary)' }}>{t.label}</span>
                </button>
              ))}
              {/* R137 (mobile only — hidden on desktop via cv6.css): the 5th tab.
                  Opens a sheet holding Support / Tracker / Command / Live Scribe. */}
              <button
                className="hm-tool hm-tool-more"
                data-active={(moreOpen || MOBILE_MORE_KEYS.has(selectedTool)) ? 'true' : undefined}
                onClick={() => setMoreOpen(v => !v)}
                title="More"
                aria-label="More tools"
                style={{
                  flex: '0 0 auto', display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px 16px', borderRadius: '6px',
                  border: (moreOpen || MOBILE_MORE_KEYS.has(selectedTool)) ? '2px solid var(--cv6-accent-primary)' : '1px solid var(--cv6-divider)',
                  background: (moreOpen || MOBILE_MORE_KEYS.has(selectedTool)) ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                  color: (moreOpen || MOBILE_MORE_KEYS.has(selectedTool)) ? '#ffffff' : 'var(--cv6-text-primary)',
                  cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontWeight: '500', minWidth: '64px', minHeight: '56px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                  <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '500', textAlign: 'center', whiteSpace: 'nowrap', color: (moreOpen || MOBILE_MORE_KEYS.has(selectedTool)) ? '#ffffff' : 'var(--cv6-text-primary)' }}>More</span>
              </button>
            </div>
          </div>

          {/* R137 (mobile only) — the More sheet: the 4 overflow tools as a bottom sheet
              above the 5-tab bar. Hidden on desktop (cv6.css). Tap a tool to open it. */}
          {moreOpen && (
            <div className="hm-more-backdrop" onClick={() => setMoreOpen(false)}
              style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)' }}>
              <div className="hm-more-sheet" onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  background: 'var(--cv6-surface)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
                  padding: '8px 12px calc(16px + env(safe-area-inset-bottom, 0px))',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.32)',
                }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--cv6-divider)', margin: '8px auto 12px' }} />
                {[
                  { key: 'support', label: 'Support' }, { key: 'tracker', label: 'Tracker' },
                  { key: 'command', label: 'Command' }, { key: 'scribe', label: 'Live Scribe' },
                ].map(t => (
                  <button key={t.key} onClick={() => { setMoreOpen(false); openTool(t.key) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
                      padding: '14px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: selectedTool === t.key ? 'var(--cv6-accent-primary)' : 'transparent',
                      color: selectedTool === t.key ? '#ffffff' : 'var(--cv6-text-primary)',
                      fontFamily: 'inherit', fontSize: '16px', fontWeight: '500',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* R-MOBILE-NAV 2026-06-19 (Patrik, Corner Mobile.dc.html "Side menu · closed & open"):
              CLOSED — content runs full-bleed; the profile avatar floats BOTTOM-RIGHT as the only
              chrome (unread dot). OPEN — a NARROW rail slides in from the right: profile pinned at
              top, then nav (Home/Chat/Organize/Review), then tools (Support/Tracker/Command/Scribe),
              then Theme / Alerts / Search at the bottom. Each item = icon chip + title. Mobile only. */}
          {isNarrowHV && navDrawerOpen && (
            <>
              <div onClick={() => setNavDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 131, background: 'rgba(0,0,0,0.45)' }} />
              <nav style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: RAIL_W + 'px', zIndex: 132,
                /* R-MOBILE 2026-06-19: stack the surface token 3× so the rail reads as an OPAQUE
                   panel in glass theme too (rgba surface alone let the page bleed through — the
                   "+" / labels showed through the open menu). Solid in light/dark, ~0.91 in glass. */
                background: 'linear-gradient(var(--cv6-surface), var(--cv6-surface)), linear-gradient(var(--cv6-surface), var(--cv6-surface)), var(--cv6-surface)',
                backdropFilter: 'blur(28px) saturate(1.4)', WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
                borderLeft: '1px solid var(--cv6-divider)',
                boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                gap: '1px', overflowY: 'auto', overflowX: 'hidden',
                animation: 'cv6-drawer-in 0.22s cubic-bezier(.22,1,.36,1)',
              }}>
                {/* profile pinned top — also the close affordance */}
                <button onClick={() => setNavDrawerOpen(false)} title="Close menu"
                  style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', flex: 'none', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600 }}>
                  {(displayName(user) || 'U').trim().charAt(0).toUpperCase()}
                </button>
                <span style={{ width: '30px', height: '1px', background: 'var(--cv6-divider)', margin: '9px 0' }} />
                {/* nav */}
                {HOME_TOOLS.slice(0, 4).map(t => { const on = selectedTool === t.key; return (
                  <button key={t.key} onClick={() => { setNavDrawerOpen(false); openTool(t.key) }} title={t.label} style={railItemSty}>
                    <span style={railChipSty(on)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.svg}</svg></span>
                    <span style={railLabSty(on)}>{t.label}</span>
                  </button>
                )})}
                <span style={{ width: '30px', height: '1px', background: 'var(--cv6-divider)', margin: '9px 0' }} />
                {/* tools */}
                {HOME_TOOLS.slice(4).map(t => { const on = selectedTool === t.key; const label = t.key === 'scribe' ? 'Scribe' : t.label; return (
                  <button key={t.key} onClick={() => { setNavDrawerOpen(false); openTool(t.key) }} title={t.label} style={railItemSty}>
                    <span style={railChipSty(on)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.svg}</svg></span>
                    <span style={railLabSty(on)}>{label}</span>
                  </button>
                )})}
                {/* bottom group: theme, alerts, search (search very bottom — Patrik) */}
                <span style={{ marginTop: 'auto' }} />
                <span style={{ width: '30px', height: '1px', background: 'var(--cv6-divider)', margin: '9px 0' }} />
                <button onClick={() => cycleTheme()} title="Theme" style={railItemSty}>
                  <span style={railChipSty(false)}>
                    {themeMode === 'light'
                      ? (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>)
                      : themeMode === 'dark'
                      ? (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>)
                      : (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7"/><path d="M9 17.4h6M9.6 17.4l-1 3.1M14.4 17.4l1 3.1"/></svg>)}
                  </span>
                  <span style={railLabSty(false)}>Theme</span>
                </button>
                <button onClick={() => { setNavDrawerOpen(false); if (cv6) setSelectedTool('home') }} title="Alerts" style={railItemSty}>
                  <span style={railChipSty(false)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
                    {catchupNotifications.length > 0 && (<span style={{ position: 'absolute', top: '3px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cv6-accent-primary)', border: '1.5px solid var(--cv6-surface)' }} />)}
                  </span>
                  <span style={railLabSty(false)}>Alerts</span>
                </button>
                <button onClick={() => { setNavDrawerOpen(false); setShowSearch(true) }} title="Search" style={railItemSty}>
                  <span style={railChipSty(false)}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
                  <span style={railLabSty(false)}>Search</span>
                </button>
              </nav>
            </>
          )}

          {/* CLOSED state: the profile avatar floats bottom-right as the only chrome (mobile). Tap
              to slide the rail in. The dot flags unread. */}
          {isNarrowHV && !navDrawerOpen && (
            <button className="hm-fab" onClick={() => setNavDrawerOpen(true)} title="Menu" aria-label="Open menu"
              style={{
                // R-MOBILE 2026-06-19 (Patrik): the menu must float above EVERY screen, including the
                // full-screen Chat tool (zIndex 120) — at 53 it was hidden behind tools, so tool
                // screens looked menu-less. 130 clears the tool layer; the rail/backdrop go higher.
                position: 'fixed', right: '18px', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', zIndex: 130,
                width: '60px', height: '60px', borderRadius: '50%', border: 'none',
                background: 'linear-gradient(135deg, #5B9BFF, #2563EB)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 14px 34px -8px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.14)',
              }}>
              {/* R-MATCH-KIT 2026-06-20: keep the Final frame's button SHAPE (60px circle, --avatar
                  gradient, white-ring shadow, 15px accent dot) but the glyph is a MENU icon, not the
 profile "P", Patrik override 2026-06-20: "the menu button being a p it should be a
                  menu icon." It still opens the rail. Do NOT switch this back to a P. */}
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
              {catchupNotifications.length > 0 && (<span style={{ position: 'absolute', top: '1px', right: '1px', width: '15px', height: '15px', borderRadius: '50%', background: '#5B9BFF', border: '2.5px solid var(--cv6-ground)' }} />)}
            </button>
          )}

          {/* R23: Full-screen tool app container — rolls in above the 3-column band, above What Needs You */}
          {/* R48: key on selectedTool so the roll-in replays every time a DIFFERENT tool opens (not just the first) */}
          {selectedTool && selectedTool !== 'home' && (
            <div key={selectedTool}
              // R100 — every tool renders inside this one wrapper, so this is where
              // the glass scrim belongs. Without it the tool canvas is transparent
              // and a bright glass backdrop bleeds through, washing out dense panels
              // (the Command table, Tracker, etc). data-cv6-tool-surface gives the
              // whole tool area the frosted --cv6-surface scrim (+ dark text in
              // light-glass) and is a no-op in light/dark themes. Closes glass-1.
              data-cv6-tool-surface=""
              style={{
              animation: 'cv6-tool-roll-in 300ms ease-out',
              // R185 (Patrik: open room on mobile = full-screen chat, tools below, back top-left):
              // on phones the Chat tool becomes a fixed full-screen layer from the top down to
              // just above the bottom tools dock (so the dock stays visible "below"), with its
              // own back-arrow header. Other tools + desktop keep the in-page panel.
              ...((isNarrowHV && selectedTool === 'chat')
                ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120, margin: 0, borderRadius: 0, border: 'none', background: 'var(--cv6-ground)', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }
                : { marginBottom: '24px', borderRadius: '8px', border: 'none', background: 'transparent', overflow: 'hidden', minHeight: '72vh' }),
            }}>
              {/* Tool header removed per CV6 design: tool button row is the only header.
                  Content flows directly below with 1px divider already in place between tools row and content.
                  Mobile Chat (R185) uses its own room-name bar instead. Close via Home button in tool row. */}

              {/* Tool content — R85 (tools-1): drag the bottom edge to resize. Native CSS
                  resize gives a grip at the bottom with no JS; works for every tool uniformly.
                  R185: mobile Chat fills the full-screen layer (no fixed height / resize) so the
                  conversation and message box use all the space down to the dock. */}
              <div style={(isNarrowHV && selectedTool === 'chat')
                ? { padding: '0', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
                : { padding: '16px 20px', minHeight: '45vh', maxHeight: 'calc(100vh - 140px)', height: '64vh', overflow: 'auto', resize: 'vertical', display: 'flex', flexDirection: 'column' }}>
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
                    missionsByProject={effectiveMissionsByProject}
                    onCreateProject={persistCreateProject}
                    onCreateMission={persistCreateMission}
                    onMoveFile={persistMoveFile}
                    onMoveMission={persistMoveMission}
                  />
                )}

                {selectedTool === 'organize' && (
                  // R-QA 2026-06-19: the Claude design's Organize = Projects | files |
                  // preview, all three columns at once (not the old Projects/Files
                  // toggle with no preview). OrganizeBrowser composes the real-data
                  // file tree + FilePreviewPanel. Mobile stacks the three.
                  <OrganizeBrowser projects={[...(recentProjects || []), ...(allProjects || [])]} />
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
                    agents={visibleAgents}
                    user={user}
                  />
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
                    onClose={() => setSelectedTool('home')}
                    worldId={worldId}
                  />
                )}
              </div>
            </div>
          )}

          {/* R39: home body (columns, what-needs-you, ideas) hides while a tool is open — tools get the full screen */}
          {selectedTool === 'home' && (<>
          {/* R14: THREE-COLUMN LAYOUT — Collaborators (left) | Active Work (middle) | Conversation+Quick Reply (right) */}
          {/* R76 (Patrik): grid layout lives in cv6.css so the ≤768px media query can
              collapse it to ONE stacked column on mobile. Inline display/columns used to
              override the media query, which is why mobile rendered 3 cramped columns. */}
          {/* Fit the grid to the viewport (Patrik 2026-06-19): fill the available height so the
              quick reply sits just above the bottom and the section never gets cut off. No upper
              cap — the columns keep extending as the user grows the window height, holding the
              same ~110px bottom offset. A 480px floor protects very short windows. */}
          <div className="hm-three-column-grid" style={{ gap: '0', height: 'max(480px, calc(var(--app-height, 100dvh) - 150px))', marginBottom: '18px', position: 'relative' }}>
            {/* R64: LEFT COLUMN — CATCH UP (Patrik: lives where Agents used to be) */}
            {renderCatchupColumn()}

            {/* Design spec (lines 104–118): THREE stacked sections — Agents, Projects, nothing else.
                No missions list, no combined view. Just agent status + all projects (scrollable).
                R2: Drill-through mode: click project → see its missions + back arrow */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* "All rooms" header row (Patrik 2026-06-19): label on the left, a search
                  icon + a plus icon on the right. The plain label keeps NO underline (only
                  the conversation column header carries a divider). */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cv6-text-secondary)' }}>
                  All rooms
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                  {/* Search this column */}
                  <button
                    title="Search rooms"
                    onClick={() => { setRoomCreateMenu(false); setRoomSearchOpen(v => { const n = !v; if (!n) setColQuery(''); return n }) }}
                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: roomSearchOpen ? 'var(--cv6-accent-weak)' : 'transparent', color: roomSearchOpen ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms ease' }}
                    onMouseEnter={(e) => { if (!roomSearchOpen) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                    onMouseLeave={(e) => { if (!roomSearchOpen) e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
                  </button>
                  {/* Add a new project or mission */}
                  <button
                    title="New project or mission"
                    onClick={() => { setRoomSearchOpen(false); setRoomCreateMenu(v => !v) }}
                    style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: roomCreateMenu ? 'var(--cv6-accent-weak)' : 'transparent', color: roomCreateMenu ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms ease' }}
                    onMouseEnter={(e) => { if (!roomCreateMenu) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                    onMouseLeave={(e) => { if (!roomCreateMenu) e.currentTarget.style.background = 'transparent' }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  {/* Plus popover: New project / New mission → open the Projects tool (its
                      create UI is the real, tested surface). */}
                  {roomCreateMenu && (
                    <div style={{ position: 'absolute', top: '32px', right: 0, zIndex: 30, minWidth: '168px', background: 'var(--cv6-surface)', border: '1px solid var(--cv6-hair)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {[{ label: 'New project', sub: 'A new room with its own missions' }, { label: 'New mission', sub: 'A workstream inside a project' }].map(opt => (
                        <button key={opt.label}
                          onClick={() => { setRoomCreateMenu(false); setSelectedTool('projects') }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cv6-text-primary)' }}>{opt.label}</span>
                          <span style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)' }}>{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Column-scoped search bar (revealed by the search icon). Filters Recents +
                  Agents + Projects below by name. */}
              {roomSearchOpen && !browsingProject && (
                <input
                  autoFocus
                  value={colQuery}
                  onChange={(e) => setColQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setColQuery(''); setRoomSearchOpen(false) } }}
                  placeholder="Search rooms"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', marginBottom: '12px', fontSize: '13px', fontFamily: 'inherit', color: 'var(--cv6-text-primary)', background: 'var(--cv6-surface-hover)', border: '1px solid var(--cv6-hair)', borderRadius: '9px', outline: 'none' }}
                />
              )}

              {/* R2: If browsing a project, show back arrow + its missions */}
              {browsingProject ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {/* Back button + project name header */}
                  <button
                    onClick={() => setBrowsingProject(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', marginBottom: '14px',
                      background: 'transparent', border: 'none', color: 'var(--cv6-text-secondary)', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                      transition: 'color 120ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cv6-text-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cv6-text-secondary)' }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 19l-7-7 7-7"/>
                    </svg>
                    {browsingProject.name || browsingProject.slug}
                  </button>

                  {/* Scrollable missions list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: 'calc(100% - 50px)', overflowY: 'auto' }}>
                    {/* "Recent rooms" label above missions */}
                    {((missionsByProject[browsingProject.slug] || []).length > 0) && (
                      <div style={{ fontSize: '10.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-faint)', marginBottom: '8px', padding: '0 12px' }}>
                        Recent rooms
                      </div>
                    )}
                    {(missionsByProject[browsingProject.slug] || []).map((m) => {
                      const isSelected = cv6 && !toolsFocused && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'mission' && selectableItems[selectedIndex]?.item?.slug === m.slug
                      return (
                      <button key={m.slug}
                        className="hm-card hm-room-row"
                        data-cv6-sel={isSelected ? 'true' : undefined}
                        onClick={() => {
                          openChatToolForRoom({ project: browsingProject, mission: m })
                          setBrowsingProject(null)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', marginBottom: '0',
                          boxSizing: 'border-box', width: '100%',
                          background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent', color: 'var(--cv6-text-primary)', border: 'none', borderRadius: '10px',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                      >
                        {/* Mission icon (from getMissionIcon) */}
                        <span style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--cv6-text-secondary)' }}>
                          {getMissionIcon(m.slug).svg}
                        </span>
                        {/* Mission name (14px 500) */}
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name || m.slug}
                        </span>
                        {/* Status indicator if running */}
                        {MISSION_ACTIVE_STATUSES.has(m.status) && (
                          <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--cv6-accent-success)', background: 'color-mix(in srgb, var(--cv6-accent-success) 14%, transparent)', borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>
                            Running
                          </span>
                        )}
                      </button>
                    )})}
                  </div>
                </div>
              ) : (() => {
                const colQ = (colQuery || '').trim().toLowerCase()
                const colMatch = (n) => !colQ || (n || '').toLowerCase().includes(colQ)
                const searching = colQ.length > 0
                const filteredAgents = (visibleAgents || []).filter(a => colMatch(a.name || a.slug))
                // The FULL room list (recent first, then the alphabetical rest) — this is the
                // fix for "only a few projects show / barely scroll": previously only the 5
                // recents rendered. Now every project renders in a bounded, scrollable list.
                const allRoomsProjects = [...(recentProjects || []), ...(allProjects || [])]
                const filteredProjects = allRoomsProjects.filter(p => colMatch(p.name || p.slug))
                return (
                <>
                  {/* SECTION 0: RECENTS — folded into the ONE single list below per Patrik
                      2026-06-19 ("single list for all rooms"). Recent projects already bubble to
                      the top of the projects list, so nothing is lost. Disabled (kept for history). */}
                  {false && !searching && recentRooms.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cv6-faint)', marginBottom: '6px' }}>Recents</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {recentRooms.map((r) => {
                          const isMission = r.type === 'mission'
                          const isSelected = cv6 && !toolsFocused && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'recent' && selectableItems[selectedIndex]?.item?.key === r.key
                          const openRoom = () => {
                            const idx = selectableItems.findIndex(s => s.type === 'recent' && s.item?.key === r.key)
                            if (idx >= 0) setSelectedIndex(idx)
                            recordVisit(r.project.slug, isMission ? r.mission.slug : null)
                            setSelectedRoom({ project: r.project, mission: isMission ? r.mission : null })
                            homeRef.current?.focus()
                          }
                          return (
                            <button key={r.key}
                              className="hm-card hm-room-row"
                              data-cv6-sel={isSelected ? 'true' : undefined}
                              onClick={openRoom}
                              onDoubleClick={() => openChatToolForRoom({ project: r.project, mission: isMission ? r.mission : null })}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', marginBottom: '0',
                                boxSizing: 'border-box', width: '100%',
                                background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent', color: 'var(--cv6-text-primary)', border: 'none', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 120ms ease',
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ display: 'inline-flex', flexShrink: 0, color: isMission ? 'var(--cv6-text-secondary)' : `hsl(${roomHue(r.project.slug)}, 65%, 60%)` }}>
                                {isMission ? getMissionIcon(r.mission.slug).svg : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>
                                )}
                              </span>
                              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {isMission ? (r.mission.name || r.mission.slug) : (r.project.name || r.project.slug)}
                                </span>
                                {isMission && (
                                  <span style={{ fontSize: '11px', color: 'var(--cv6-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.project.name || r.project.slug}
                                  </span>
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 1+2: the ONE All Rooms list — OPEN in the column (no card box),
                      matching the desktop design's open three-column layout where the thin
                      vertical divider between columns (cv6.css .hm-three-column-grid) is the only
                      separation. 54px rows divided by --divider. Agents read by status dot,
                      projects by folder. */}
                  {(filteredAgents.length > 0 || filteredProjects.length > 0) && (
                  <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                  {filteredAgents.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {filteredAgents.map((a) => {
                          const isSelected = cv6 && !toolsFocused && selectedIndex >= 0 && selectableItems[selectedIndex]?.item?.slug === a.slug && selectableItems[selectedIndex]?.type === 'agent'
                          // Status dot per the kit's status-dots guideline (kit-2026-06-19):
                          // online = green + glow / working = lime / attention = amber / idle = faint.
                          const _st = (a.status || '').toLowerCase()
                          const dotColor = _st.includes('online') ? 'var(--cv6-accent-success)'
                            : (_st.includes('work') || _st.includes('rout') || _st.includes('activ') || _st.includes('run')) ? '#A3E635'
                            : (_st.includes('wait') || _st.includes('review') || _st.includes('block') || _st.includes('attention') || _st.includes('need')) ? '#FBBF24'
                            : 'var(--cv6-text-tertiary)'
                          const dotGlow = _st.includes('online') ? '0 0 8px rgba(52,211,153,.6)' : 'none'
                          return (
                            <button key={a.slug}
                              className="hm-card hm-room-row"
                              data-cv6-sel={isSelected ? 'true' : undefined}
                              onClick={() => { selectByItem('agent', a.slug); setSelectedRoom({ agent: a, project: null, mission: null }); homeRef.current?.focus() }}
                              onContextMenu={(e) => { e.preventDefault(); selectByItem('agent', a.slug); setCardMenu({ x: e.clientX, y: e.clientY, type: 'agent', item: a, project: null }) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '0 15px', minHeight: '54px',
                                boxSizing: 'border-box', width: '100%',
                                background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent',
                                color: 'var(--cv6-text-primary)', border: 'none', borderBottom: '1px solid var(--cv6-divider)', borderRadius: '0',
                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                transition: 'background 120ms ease',
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                            >
                              {/* 9px status dot per the kit: online green+glow / working lime / attention amber / idle faint */}
                              <span title={a.status || 'idle'} style={{
                                width: '9px', height: '9px', borderRadius: '50%',
                                background: dotColor, boxShadow: dotGlow,
                                flexShrink: 0,
                              }}/>
                              {/* Agent name (14.5px 600, matching the kit .rn) */}
                              <span style={{ flex: 1, fontSize: '14.5px', fontWeight: 600, color: 'var(--cv6-text-primary)' }}>
                                {a.name || a.slug}
                              </span>
 {/* Type tag, "AGENT" (mono faint), distinguishing agent rows from project rows
                                  in the one All Rooms list; live status stays on hover via the dot title. */}
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--cv6-text-tertiary)', flexShrink: 0 }}>AGENT</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: Projects — the FULL list (recent first, then alphabetical),
                      in a flex-bounded scroll area so ~5 show before it scrolls and every
                      project is reachable. */}
                  {/* SECTION 2: Projects — continues the ONE single list (no sub-label, Patrik
                      2026-06-19). Recent projects bubble to the top so recents live here too. */}
                  {filteredProjects.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: 0, flex: 1, overflowY: 'auto' }}>
                        {filteredProjects.map((p) => {
                          const isSelected = cv6 && !toolsFocused && selectedIndex >= 0 && selectableItems[selectedIndex]?.item?.slug === p.slug && selectableItems[selectedIndex]?.type === 'project'
                          const missionCount = Array.isArray(allMissionsForCV6) ? allMissionsForCV6.filter(x => (x.project?.slug || x.project?.id) === (p.slug || p.id)).length : 0
                          return (
                            <button key={p.slug}
                              className="hm-card hm-room-row"
                              data-cv6-sel={isSelected ? 'true' : undefined}
                              onClick={() => { setBrowsingProject(p); homeRef.current?.focus() }}
                              onContextMenu={(e) => { e.preventDefault(); selectByItem('project', p.slug); setCardMenu({ x: e.clientX, y: e.clientY, type: 'project', item: p, project: p }) }}
                              onDoubleClick={() => openChatToolForRoom({ project: p, mission: null })}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '0 15px', minHeight: '54px',
                                boxSizing: 'border-box', width: '100%',
                                background: isSelected ? 'var(--cv6-accent-weak)' : 'transparent',
                                color: 'var(--cv6-text-primary)', border: 'none', borderBottom: '1px solid var(--cv6-divider)', borderRadius: '0',
                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                transition: 'background 120ms ease',
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--cv6-surface-hover)' }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                            >
                              {/* Colored folder icon (per-project color). R-PIXEL-LOOP R4: use a BRIGHT
                                  saturated hue (was roomFill = a darkened background tone, which made the
                                  folders read muted/grey). Matches the dc.html's clearly-colored folders. */}
                              <span style={{ display: 'inline-flex', flexShrink: 0, color: `hsl(${roomHue(p.slug)}, 65%, 60%)` }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>
                                </svg>
                              </span>
                              {/* Project name (14.5px 500, matching the kit .rn) */}
                              <span style={{ flex: 1, fontSize: '14.5px', fontWeight: 500, color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name || p.slug}
                              </span>
                              {/* Mission count right (12px muted) — the kit shows just the count, no chevron;
                                  the whole row is tappable to drill in. */}
                              <span style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', flexShrink: 0 }}>
                                {missionCount}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  </div>
                  )}

                  {/* Empty state when a column search matches nothing */}
                  {searching && filteredAgents.length === 0 && filteredProjects.length === 0 && (
                    <div style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)', padding: '8px 12px' }}>
                      No rooms match "{colQuery.trim()}"
                    </div>
                  )}
                </>
                )
              })()}
            </div>

            {/* R19: RIGHT COLUMN — CONVERSATION + QUICK REPLY with full interactivity
                R5: More top padding so room name isn't jammed against border
                iPad fix: when no room selected, the heading aligns top with catch-up/all-rooms */}
            <div className="hm-section hm-convo-col" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column', paddingTop: '6px' }}>
              {/* R19: Room identifier header with color tinting */}
              {/* R30b: Support agent rooms in addition to project/mission rooms */}
              {/* ONE-line header (Patrik 2026-06-19): green dot + name + muted subname all on
                  the same row as the Files button, to give the conversation more height. */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                marginBottom: '6px', paddingBottom: '6px',
                // Patrik 2026-06-19: inset the column's items 20px from the left divider so they
                // breathe; the border-bottom still spans the full column width (padding is inside
                // the box) so the header underline stays connected to the middle column.
                paddingLeft: '20px', paddingRight: '20px',
                // Design: the header underline is a plain neutral hairline (no room-hue color),
                // flush like the other columns. The old room-hue border was the green line Patrik flagged.
                borderBottom: '1px solid var(--cv6-divider)',
                transition: 'border-color 200ms ease',
              }}>
                {selectedRoom ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--cv6-accent-success)',
                      boxShadow: '0 0 8px rgba(52,211,153,.6)',
                    }}/>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--cv6-text-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {selectedRoom.agent ? (selectedRoom.agent.name || selectedRoom.agent.slug) : (selectedRoom.project.name || selectedRoom.project.slug)}
                    </span>
                    {/* subname inline, muted, truncates if the row gets tight */}
                    <span style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                      · {selectedRoom.agent ? 'Agent' : (selectedRoom.mission ? `${selectedRoom.project.slug} · /chat` : selectedRoom.project.slug)}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>Conversation</div>
                  </div>
                )}

                {/* R31: room-scoped Files button (right side) — 1px hair border, file icon */}
                {selectedRoom && (
                  <button
                    title="This room's files"
                    onClick={() => onOpenDrawer?.('files')}
                    style={{
                      flexShrink: 0, height: '34px', padding: '0 12px', borderRadius: '9px', border: '1px solid var(--cv6-hair)',
                      background: 'transparent', color: 'var(--cv6-text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontSize: '12.5px', fontWeight: '600', fontFamily: 'inherit',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv6-surface-hover)'; e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                    </svg>
                    Files
                  </button>
                )}
              </div>

              {selectedRoom && conversationMessages.length > 0 ? (
                <>
                  {/* R19: Conversation thread — scrollable area with messages */}
                  <div style={{
                    flex: 1, // fills the equal-height column; composer pins to the bottom (matches the design)
                    minHeight: 0,
                    overflowY: 'auto',
                    paddingLeft: '20px', paddingRight: '8px', // left inset from divider; trim the right (Patrik 2026-06-19)
                    marginBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column-reverse', // R19: Messages flow upward (newest at bottom, user messages float to top)
                    gap: '12px',
                    // R20: grey container removed — conversation falls clean against the page (Patrik 2026-06-16)
                  }}>
                    {conversationMessages.map((msg) => {
                      // Email-type messages (support wishes that arrived by email) render
                      // as a clean letter card, not a chat bubble (Patrik: readable letters).
                      const letter = parseRoomEmail(msg)
                      if (letter) {
                        return <LetterCard key={msg.id} letter={letter} timestamp={msg.timestamp} />
                      }
                      if (msg.sender === 'user') {
                        // R6: User message = right-aligned accent bubble (radius 16/16/4/16)
                        return (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', animation: 'cv6-msg-float-in 300ms ease-out' }}>
                            <div className="hm-user-bubble" style={{
                              maxWidth: '75%', padding: '10px 13px', borderRadius: '16px 16px 4px 16px',
                              // R-QA: user bubble = the design's single blue accent, NOT roomSolid(slug).
                              // roomSolid maps the room hue to an hsl color, which for green-band rooms
                              // returned a saturated green bubble — the "green chat bubble" Patrik flagged.
                              // The Claude design shows user messages in one consistent blue. (2026-06-18)
                              background: 'var(--cv6-accent-primary)',
                              color: '#ffffff', fontSize: '14px', lineHeight: '1.55', wordWrap: 'break-word',
                            }}>
                              <ChatMessageRenderer content={msg.text} />
                            </div>
                          </div>
                        )
                      } else {
                        // R6: Agent message = small avatar + name + Space Mono timestamp + flat readable body (14px/1.55)
                        return (
                          <div key={msg.id} style={{ display: 'flex', gap: '8px', animation: 'cv6-msg-fade-in 300ms ease-out' }}>
                            {/* Avatar */}
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                              background: 'color-mix(in srgb, var(--cv6-accent-success) 16%, transparent)',
                              color: 'var(--cv6-accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: '700',
                            }}>
                              {(msg.sender || 'A').slice(0, 2).toUpperCase()}
                            </div>
                            {/* Name + timestamp + body */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--cv6-text-primary)' }}>
                                  {msg.sender || 'Agent'}
                                </span>
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10.5px', color: 'var(--cv6-text-tertiary)' }}>
                                  {msg.timestamp ? relativeTime(msg.timestamp) : 'now'}
                                </span>
                              </div>
                              <div style={{ fontSize: '14px', lineHeight: '1.55', color: 'var(--cv6-text-primary)', wordWrap: 'break-word' }}>
                                <ChatMessageRenderer content={msg.text} />
                              </div>
                            </div>
                          </div>
                        )
                      }
                    })}
                  </div>

                  {/* R24: Conversation input — divider line, then suggested replies, then input row (Patrik: chips below the grey line, above where you type) */}
                  <div style={{ borderTop: '1px solid var(--cv6-divider)', padding: '8px 20px 12px' }}>
                    {/* Suggested replies — below the divider line, ABOVE the input row */}
                    {suggestedReplies.length > 0 && (
                      <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                    {/* R7: Design spec (lines 128–134): left→right = [crystal-ball] · [input: attachment FIRST, text, master-loop icon] · [send|voice]
                        When user hasn't typed, send icon is voice-chat icon. If Gemini unavailable, show honest message. */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', height: '40px' }}>
                      {/* R7: Crystal ball (command icon) — left (40×40) */}
                      <button
                        onClick={() => {
                          console.log('[crystal-ball command icon clicked]')
                          // TODO: wire to command launcher
                        }}
                        style={{
                          width: '40px', height: '40px', flexShrink: 0, borderRadius: '11px', border: 'none',
                          background: 'var(--cv6-accent-primary)', color: '#ffffff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 120ms ease', boxShadow: '0 0 0 4px var(--cv6-accent-weak)',
                          padding: 0, fontFamily: 'inherit',
                        }}
                        title="Command launcher"
                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.92)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {/* Patrik 2026-06-19: the design's orb-with-ticks glyph read as a
                            "weird drawing" at this size. Replaced with a clean sparkles icon
                            (a real, recognizable AI/command-launcher affordance). */}
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l1.6 4.9a3 3 0 0 0 1.9 1.9L20.4 11.4l-4.9 1.6a3 3 0 0 0-1.9 1.9L12 19.8l-1.6-4.9a3 3 0 0 0-1.9-1.9L3.6 11.4l4.9-1.6a3 3 0 0 0 1.9-1.9z"/>
                          <path d="M19 4v2.6M20.3 5.3h-2.6"/>
                        </svg>
                      </button>

 {/* Input field, design: placeholder "Message {name}…" + a single paperclip (attach) on the right.
 (Was a refresh-glyph "attach" on the left + a second refresh "master-loop" icon, neither matched the design.) */}
                      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          ref={replyInputRef}
                          type="text"
                          placeholder={`Message ${(selectedRoom && (selectedRoom.agent ? (selectedRoom.agent.name || selectedRoom.agent.slug) : (selectedRoom.project.name || selectedRoom.project.slug))) || ''}…`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
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
                            width: '100%', height: '100%', boxSizing: 'border-box', padding: '0 38px 0 14px',
                            borderRadius: '11px', border: '1px solid var(--cv6-divider)',
                            background: 'var(--cv6-surface2)', color: 'var(--cv6-text-primary)', fontSize: '14px',
                            fontFamily: 'inherit', outline: 'none', transition: 'border-color 120ms ease',
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'}
                          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--cv6-divider)'}
                        />

                        {/* Attach (paperclip) — RIGHT inside the input, matches the design */}
                        <button
                          onClick={() => onOpenDrawer?.('files')}
                          style={{
                            position: 'absolute', right: '10px', width: '20px', height: '20px',
                            background: 'none', border: 'none', color: 'var(--cv6-text-secondary)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, transition: 'color 120ms ease',
                          }}
                          title="Attach files"
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cv6-text-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cv6-text-secondary)'; }}
                        >
                          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.4 11 12.25 20.2a5 5 0 0 1-7.07-7.07l9.2-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"/>
                          </svg>
                        </button>
                      </div>

                      {/* R7: Send button (40×40, right) — accent color
                          When user HAS typed: send icon (arrow up)
                          When user HASN'T typed: voice icon → starts Gemini voice chat, or honest unavailable message */}
                      <button
                        onClick={() => {
                          if (replyText.trim()) {
                            sendQuickReply(replyText)
                            setReplyText('')
                          } else {
                            // Voice chat mode — TODO: wire to real Gemini voice on /cvg
 console.log('[voice-chat button clicked, would start Gemini voice]')
                          }
                        }}
                        style={{
                          width: '40px', height: '40px', flexShrink: 0, borderRadius: '11px', border: 'none',
                          background: 'var(--cv6-accent-primary)', color: '#ffffff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 120ms ease', padding: 0, fontFamily: 'inherit',
                        }}
                        title={replyText.trim() ? 'Send' : 'Voice chat'}
                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.92)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {replyText.trim() ? (
                          // Send icon (arrow up)
                          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                        ) : (
                          // Voice icon (microphone)
                          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
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
 {/* (Corner lockup moved into the catch-up column's bottom, Patrik 2026-06-19.) */}
          </div>
          </>)}

          {/* R39: close home-body fragment */}
          </>)}

          {/* R37: right-click menu for active-work cards — mirrors the left-menu; each action advances into the project screen */}
          {cardMenu && (() => {
            const isM = cardMenu.type === 'mission'
            const isAgent = cardMenu.type === 'agent'
            const isProject = cardMenu.type === 'project'
            // R75 (Patrik): agents pin to the top of All rooms (right-click to unpin); projects pin too.
            const agentPinned = isAgent && (pinnedAgents.includes(cardMenu.item.slug) || (pinnedAgents.length === 0 && cardMenu.item.is_ea))
            const projectPinned = isProject && pinnedProjects.includes(cardMenu.item.slug)
            const opts = isAgent ? [
              { key: 'brief-me', label: 'Brief me' },
              { key: 'toggle-agent-pin', label: agentPinned ? 'Unpin from top' : 'Pin to top' },
            ] : [
              { key: 'brief-me', label: 'Brief me' },
              ...(isM ? [{ key: 'whats-next', label: "What's next" }] : []),
              ...(isProject ? [{ key: 'toggle-project-pin', label: projectPinned ? 'Unpin from top' : 'Pin to top' }] : []),
              { key: 'rename', label: 'Rename' },
              { key: 'create-subfolder', label: 'Create subfolder…' },
              { key: 'move-to-folder', label: 'Move to subfolder…' },
              ...(isM ? [{ key: 'embed', label: 'Embed this room' }] : []),
              { key: 'delete', label: 'Delete', danger: true },
            ]
            const advance = (key) => {
              if (key === 'toggle-agent-pin') { toggleAgentPin(cardMenu.item.slug); setCardMenu(null); return }
              if (key === 'toggle-project-pin') { toggleProjectPin(cardMenu.item.slug); setCardMenu(null); return }
              if (isAgent) { setSelectedRoom({ agent: cardMenu.item, project: null, mission: null }); homeRef.current?.focus(); setCardMenu(null); return }
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
                      onContextMenu={(e) => { e.preventDefault(); setCardMenu({ x: e.clientX, y: e.clientY, type: 'project', item: p, project: p }) }}
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
                          onContextMenu={(e) => { e.preventDefault(); setCardMenu({ x: e.clientX, y: e.clientY, type: 'mission', item: m, project: p }) }}
                        >
                          <span style={{ color: '#5A6F8C', display: 'inline-flex', flexShrink: 0 }}><MissionIcon /></span>
                          <StatusDot state={MISSION_ACTIVE_STATUSES.has(m.status) ? 'running' : 'idle'} size={6} />
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