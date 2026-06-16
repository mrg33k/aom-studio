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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authFetch } from '../lib/authFetch.js'
import { FolderIcon, MissionIcon, StatusDot } from './lib/uiKit.jsx'

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

export default function HomeView({
  user,
  worldId,
  agents = [],
  projectRooms = [],
  onSelectAgent,
  onSelectProject,
  onOpenSearch,
  // "Needs you" rows — home tells the real story before it offers a search box.
  // Each row: { key, label, detail, onOpen }. Parent only passes rows whose
  // click target is real, so every row here is one tap from acting.
  needsYou = [],
  cv6, // R7: gate for CV6 design system (keyboard nav, missions-primary, inline actions, happening now)
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
  const [selectedTool, setSelectedTool] = useState(null)

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
    // Refresh every 60s so newly-created missions appear without a page reload.
    const timer = setInterval(fetchMissions, 60000)
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

  // R19: Conversation column state + quick-view wiring
  const [selectedRoom, setSelectedRoom] = useState(null) // { project, mission } or null
  const [replyText, setReplyText] = useState('')
  const [conversationMessages, setConversationMessages] = useState([])

  // Sample conversation thread for CV6 gallery demo
  const sampleConversation = [
    { id: 1, sender: 'user', text: 'Can we schedule the design review for next Tuesday?' },
    { id: 2, sender: 'agent', text: 'I\'ve checked your calendar. Tuesday 2-3 PM works and I\'ve blocked it. The team is invited.' },
    { id: 3, sender: 'user', text: 'Great. Make sure we review the CV6 specs before the meeting.' },
    { id: 4, sender: 'agent', text: 'Done. I\'ve sent the CV6 design spec to the team. They have it now.' },
    { id: 5, sender: 'user', text: 'Perfect. What else needs attention this week?' },
    { id: 6, sender: 'agent', text: 'The Corner refactor is on schedule. One code review pending on Bobby\'s PR. I\'ll chase it today.' },
  ]

  // R19: Initialize conversation thread when a room is selected (quick-view wire)
  useEffect(() => {
    if (selectedRoom) {
      // In production, this would fetch real messages from the room.
      // For CV6 gallery, use sample conversation as placeholder.
      setConversationMessages(sampleConversation)
    }
  }, [selectedRoom])

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
      // R18: Keyboard nav starts with Agents (top left), then cascades down
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
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % selectableItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev === -1 ? selectableItems.length - 1 : (prev - 1 + selectableItems.length) % selectableItems.length)
    } else if (e.key === 'Enter') {
      // Enter opens the selected item
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < selectableItems.length) {
        const sel = selectableItems[selectedIndex]
        if (sel.type === 'mission') {
          handleProjectSelect(sel.project, sel.item)
        } else if (sel.type === 'agent') {
          onSelectAgent && onSelectAgent(sel.item)
        } else if (sel.type === 'project') {
          handleProjectSelect(sel.item, null)
        } else if (sel.type === 'needsyou') {
          sel.item.onOpen && sel.item.onOpen()
        }
      }
    } else if (e.key === 'ArrowRight') {
      // R17: ArrowRight two-press behavior
      // First press: focus reply input (if not already focused)
      // Second press: open the room
      e.preventDefault()
      if (replyInputRef.current === document.activeElement) {
        // Reply input is focused: second press = open the room
        if (selectedIndex >= 0 && selectedIndex < selectableItems.length) {
          const sel = selectableItems[selectedIndex]
          if (sel.type === 'mission') {
            handleProjectSelect(sel.project, sel.item)
          } else if (sel.type === 'project') {
            handleProjectSelect(sel.item, null)
          }
        }
      } else {
        // Reply input not focused: first press = focus it
        if (replyInputRef.current) {
          replyInputRef.current.focus()
        }
      }
    } else if (e.key === 'ArrowLeft') {
      // PUNCH-LIST #2: ArrowLeft back-to-home hook (room-side implementation pending)
      // This is the Home-side wiring. Room view will call onBackToHome to return here.
      // Documented hook: onBackToHome prop must be connected by room view.
      e.preventDefault()
      // For now, Home is already visible; this prep allows room view to wire back
      // Handler will be: onBackToHome?.()
    }
  }, [cv6, selectableItems, selectedIndex, onSelectAgent])

  useEffect(() => {
    if (!cv6) return
    const homeEl = document.querySelector('[data-cv4-home]')
    if (!homeEl) return
    homeEl.addEventListener('keydown', handleKeyDown)
    homeEl.focus()
    return () => homeEl.removeEventListener('keydown', handleKeyDown)
  }, [cv6, handleKeyDown])

  return (
    <div data-cv4-home data-cv6={cv6 ? 'true' : undefined} style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: 'transparent',
      color: 'var(--c-text, #E8EBEF)',
      fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    }} tabIndex={-1}>
      <style>{`
        @keyframes hm-breathe { 0%,100%{opacity:1}50%{opacity:.3} }
        @keyframes cv6-msg-float-in { 0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)} }
        @keyframes cv6-msg-fade-in { 0%{opacity:0}100%{opacity:1} }
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
      `}</style>

      {/* R7: CV6 layout — missions as primary, keyboard navigation, inline actions, happening now */}
      {cv6 ? (
        <div className="hm-shell" style={{ maxWidth: '100%' }}>
          {/* R12: Top nav bar — global icons — primary (left) + secondary (right) with divider, 24px icons, strong hover */}
          {cv6 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
              marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--cv6-divider)',
            }}>
              {/* Primary group (left): Explorer, Files, Home, Theme */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Explorer — R18: compass icon */}
                <button
                  title="Open Explorer"
                  onClick={() => onOpenDrawer?.('explorer')}
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
                    <circle cx="12" cy="12" r="10"/><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>

                {/* Files */}
                <button
                  title="Open Files"
                  onClick={() => onOpenDrawer?.('files')}
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
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                  </svg>
                </button>


                {/* Theme toggle */}
                <button
                  title="Toggle theme"
                  onClick={() => {
                    const shell = document.querySelector('[data-shell="cv4"]')
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
              </div>

              {/* Divider */}
              <div style={{ flex: 1 }}></div>

              {/* Secondary group (right): Support, Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Support */}
                <button
                  title="Go to Support"
                  onClick={() => window.location.href = '/dashboard?view=support'}
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
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <h1 className="hm-welcome" style={{ margin: 0 }}>
              <span className="hm-l1">{greeting}</span>{' '}
              <span className="hm-l2">{displayName(user) || 'there'}.</span>
            </h1>
            {/* R14: Search icon button (collapse to icon only) */}
            <button
              onClick={() => setShowSearch(true)}
              style={{
                width: '40px', height: '40px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 120ms ease', fontFamily: 'inherit',
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

          {/* R21: Tools toolbar row — below greeting, horizontal compact entry point */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {/* Support */}
            <button
              onClick={() => setSelectedTool('support')}
              title="Support"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                background: selectedTool === 'support' ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                color: selectedTool === 'support' ? '#ffffff' : 'var(--cv6-text-secondary)',
                cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontSize: '12px', fontWeight: '500',
              }}
              onMouseEnter={(e) => {
                if (selectedTool !== 'support') {
                  e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                  e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'
                  e.currentTarget.style.color = 'var(--cv6-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTool !== 'support') {
                  e.currentTarget.style.background = 'var(--cv6-surface)'
                  e.currentTarget.style.borderColor = 'var(--cv6-divider)'
                  e.currentTarget.style.color = 'var(--cv6-text-secondary)'
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Support
            </button>

            {/* Command Deck */}
            <button
              onClick={() => setSelectedTool('command')}
              title="Command Deck"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                background: selectedTool === 'command' ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                color: selectedTool === 'command' ? '#ffffff' : 'var(--cv6-text-secondary)',
                cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontSize: '12px', fontWeight: '500',
              }}
              onMouseEnter={(e) => {
                if (selectedTool !== 'command') {
                  e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                  e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'
                  e.currentTarget.style.color = 'var(--cv6-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTool !== 'command') {
                  e.currentTarget.style.background = 'var(--cv6-surface)'
                  e.currentTarget.style.borderColor = 'var(--cv6-divider)'
                  e.currentTarget.style.color = 'var(--cv6-text-secondary)'
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                <polyline points="4 9 7 9 7 20 4 20"/>
                <polyline points="12 9 15 9 15 20 12 20"/>
                <polyline points="20 9 23 9 23 20 20 20"/>
              </svg>
              Command
            </button>
          </div>

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

          {/* R14: Search bar — icon-only (collapsed) when hidden, expands on click next to greeting */}
          {showSearch ? (
            <div className="hm-search" style={{ marginBottom: '16px' }}>
              <svg className="hm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && onOpenSearch) {
                    onOpenSearch(searchText)
                    setShowSearch(false)
                  }
                  if (e.key === 'Escape') setShowSearch(false)
                }}
                placeholder="messages, tasks, agents"
                autoComplete="off"
                autoFocus
              />
              <span className="hm-search-hint">⌘K</span>
            </div>
          ) : null}

          {/* R21: Full-screen tool app container — rolls in above the 3-column band, above What Needs You */}
          {selectedTool && (
            <div style={{
              animation: 'cv6-tool-roll-in 300ms ease-out',
              marginBottom: '24px', borderRadius: '8px', border: '1px solid var(--cv6-divider)',
              background: 'var(--cv6-surface)', overflow: 'hidden', minHeight: '280px',
            }}>
              {/* Tool header with close control */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid var(--cv6-divider)',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--cv6-text-primary)', textTransform: 'capitalize' }}>
                  {selectedTool === 'support' && 'Support'}
                  {selectedTool === 'command' && 'Command Deck'}
                </div>
                <button
                  onClick={() => setSelectedTool(null)}
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
              <div style={{ padding: '16px 20px', maxHeight: '500px', overflowY: 'auto' }}>
                {selectedTool === 'support' && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Support Inbox</div>
                    {/* Support items */}
                    {[
                      { id: 1, from: 'user@example.com', subject: 'Build not loading', time: '2h ago', status: 'open' },
                      { id: 2, from: 'client@company.co', subject: 'Redesign feedback', time: '4h ago', status: 'open' },
                      { id: 3, from: 'support@internal.local', subject: 'Deployment check', time: '1d ago', status: 'resolved' },
                    ].map(item => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', marginBottom: '8px',
                          background: item.status === 'open' ? 'var(--cv6-surface-hover)' : 'transparent',
                          borderRadius: '6px', border: '1px solid var(--cv6-divider)', cursor: 'pointer',
                          transition: 'all 120ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                          e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = item.status === 'open' ? 'var(--cv6-surface-hover)' : 'transparent'
                          e.currentTarget.style.borderColor = 'var(--cv6-divider)'
                        }}
                      >
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                          background: item.status === 'open' ? '#10B981' : '#5A6F8C',
                        }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--cv6-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{item.subject}</div>
                          <div style={{ fontSize: '11px', color: 'var(--cv6-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.from} • {item.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedTool === 'command' && (
                  <div style={{ color: 'var(--cv6-text-secondary)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
                    Command Deck coming soon
                  </div>
                )}
              </div>
            </div>
          )}

          {/* R14: THREE-COLUMN LAYOUT — Collaborators (left) | Active Work (middle) | Conversation+Quick Reply (right) */}
          <div className="hm-three-column-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '24px', marginBottom: '32px', minHeight: '400px' }}>
            {/* R14: LEFT COLUMN — COLLABORATORS */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Agents</div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                {visibleAgents.map((a, idx) => {
                  const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.item?.slug === a.slug && selectableItems[selectedIndex]?.type === 'agent'
                  return (
                    <button
                      key={a.slug}
                      className="hm-row"
                      onClick={() => {
                        onSelectAgent && onSelectAgent(a)
                        document.querySelector('[data-cv4-home]')?.focus()
                      }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '12px 16px', marginBottom: '6px',
                        background: isSelected ? 'var(--cv6-accent-primary)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                        border: isSelected ? '1px solid var(--cv6-accent-primary)' : '1px solid var(--cv6-divider)',
                        borderRadius: '6px', cursor: 'pointer', transition: 'all 120ms ease',
                        fontFamily: 'inherit', textAlign: 'left', fontSize: '14px', fontWeight: '500', width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isSelected ? '#ffffff' : '#10B981', animation: 'hm-breathe 2s ease-in-out infinite', flexShrink: 0 }}></span>
                        <span style={{ flex: 1 }}>{a.name || a.slug}</span>
                        <span style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--cv6-text-tertiary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{relativeTime(a.last_message_at)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--cv6-text-secondary)', paddingLeft: '20px', fontWeight: '400' }}>
                        {a.slug === 'bobby' && 'building components'}
                        {a.slug === 'steffen' && 'refining brand'}
                        {a.slug === 'cleo' && 'editing video'}
                        {a.slug === 'tony' && 'scheduling posts'}
                        {a.slug === 'elon' && 'routing work'}
                        {!['bobby', 'steffen', 'cleo', 'tony', 'elon'].includes(a.slug) && 'idle'}
                      </div>
                    </button>
                  )
                })}
              </div>

            </div>

            {/* R14: MIDDLE COLUMN — ACTIVE WORK with visible "+N more" affordance, clear scroll indicator */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>Active work</div>
              {allMissionsForCV6.length > 0 ? (
                <>
                  {/* Scrollable container: shows 5 visible missions with internal scroll */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    flex: 1, // Grow to fill column
                    overflow: 'hidden', overflowY: 'auto', paddingRight: '4px',
                    scrollBehavior: 'smooth',
                    // R20: grey container removed — cards fall clean against the page (Patrik 2026-06-16)
                    maxHeight: '328px', // R18: Cap at 5 visible missions (56px each + 8px gaps + 16px padding)
                  }}>
                    {allMissionsForCV6.map((m, idx) => {
                      const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'mission' && selectableItems[selectedIndex]?.item?.slug === m.mission.slug
                      return (
                        <button
                          key={m.mission.slug}
                          className="hm-mission"
                          onClick={() => {
                            handleProjectSelect(m.project, m.mission)
                            document.querySelector('[data-cv4-home]')?.focus()
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', marginBottom: '0',
                            background: isSelected ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                            color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                            border: isSelected ? '1px solid var(--cv6-accent-primary)' : '1px solid transparent',
                            borderRadius: '6px', cursor: 'pointer', transition: 'all 120ms ease',
                            fontFamily: 'inherit', textAlign: 'left', fontSize: '14px', fontWeight: '500',
                            flex: '0 0 auto', minHeight: '56px',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                              e.currentTarget.style.borderColor = 'var(--cv6-divider)'
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
                    })}
                  </div>
                  {allMissionsForCV6.length > 5 && (
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--cv6-accent-primary)', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--cv6-divider)', textAlign: 'center' }}>
                      ↓ +{allMissionsForCV6.length - 5} more (scroll within)
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--cv6-text-secondary)', padding: '16px', textAlign: 'center' }}>No active missions</div>
              )}
            </div>

            {/* R19: RIGHT COLUMN — CONVERSATION + QUICK REPLY with full interactivity */}
            <div className="hm-section" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column' }}>
              {/* R19: Room identifier header with color tinting */}
              <div style={{
                fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '12px', paddingBottom: '12px',
                borderBottom: selectedRoom ? `2px solid hsl(${(selectedRoom.project.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)` : '1px solid var(--cv6-divider)',
                color: 'var(--cv6-text-secondary)',
                transition: 'border-color 200ms ease',
              }}>
                {selectedRoom ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: `hsl(${(selectedRoom.project.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`,
                    }}/>
                    {selectedRoom.project.name || selectedRoom.project.slug} • {selectedRoom.mission?.name || 'Select a mission'}
                  </span>
                ) : (
                  'Conversation'
                )}
              </div>

              {selectedRoom && conversationMessages.length > 0 ? (
                <>
                  {/* R19: Conversation thread — scrollable area with messages */}
                  <div style={{
                    flex: 1,
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
                              ? `hsl(${(selectedRoom.project.slug.charCodeAt(0) * 137) % 360}, 70%, 60%)`  // Room color for user messages
                              : 'var(--cv6-surface)',  // Gray for agent messages
                            color: msg.sender === 'user' ? '#ffffff' : 'var(--cv6-text-primary)',
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* R19: Suggested replies section */}
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

                  {/* R19: Conversation input with command menu + Send */}
                  <div style={{ borderTop: '1px solid var(--cv6-divider)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      {/* Command menu button (left) */}
                      <button
                        onClick={() => console.log('Command menu (placeholder)')}
                        style={{
                          width: '36px', height: '36px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                          background: 'var(--cv6-surface)', color: 'var(--cv6-text-secondary)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 120ms ease',
                          padding: 0, fontFamily: 'inherit',
                        }}
                        title="Command menu"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--cv6-surface-hover)'
                          e.currentTarget.style.color = 'var(--cv6-accent-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--cv6-surface)'
                          e.currentTarget.style.color = 'var(--cv6-text-secondary)'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>

                      {/* Text input (flex) */}
                      <input
                        ref={replyInputRef}
                        type="text"
                        placeholder="Reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && replyText.trim()) {
                            // R19: Add user message, animate to top, clear input
                            const newMsg = { id: Math.max(...conversationMessages.map(m => m.id), 0) + 1, sender: 'user', text: replyText }
                            setConversationMessages([newMsg, ...conversationMessages])
                            setReplyText('')
                            // Simulate agent reply
                            setTimeout(() => {
                              const agentMsg = { id: newMsg.id + 1, sender: 'agent', text: 'Got it. Working on it.' }
                              setConversationMessages(prev => [agentMsg, ...prev])
                            }, 800)
                          }
                        }}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--cv6-divider)',
                          background: 'var(--cv6-surface)', color: 'var(--cv6-text-primary)', fontSize: '14px',
                          fontFamily: 'inherit', outline: 'none', transition: 'border-color 120ms ease',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--cv6-accent-primary)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--cv6-divider)'}
                      />

                      {/* Send button (right) — R19: Green (#10B981) */}
                      <button
                        onClick={() => {
                          if (replyText.trim()) {
                            const newMsg = { id: Math.max(...conversationMessages.map(m => m.id), 0) + 1, sender: 'user', text: replyText }
                            setConversationMessages([newMsg, ...conversationMessages])
                            setReplyText('')
                            // Simulate agent reply
                            setTimeout(() => {
                              const agentMsg = { id: newMsg.id + 1, sender: 'agent', text: 'Got it. Working on it.' }
                              setConversationMessages(prev => [agentMsg, ...prev])
                            }, 800)
                          }
                        }}
                        style={{
                          padding: '10px 16px', borderRadius: '6px', background: '#10B981', color: '#ffffff',
                          border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: 'inherit',
                          transition: 'all 120ms ease', opacity: replyText.trim() ? 1 : 0.5,
                        }}
                        disabled={!replyText.trim()}
                        onMouseEnter={(e) => {
                          if (replyText.trim()) {
                            e.currentTarget.style.background = '#0d9b6e'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.3)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#10B981'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        Send
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

          {/* R21: Tools box — positioned below the 3-column grid; appears below Agents on desktop, below Active Work on mobile when stacked */}
          <div className="hm-tools-box" style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', color: 'var(--cv6-text-secondary)' }}>Tools</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Support */}
              <button
                onClick={() => setSelectedTool('support')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px', borderRadius: '6px', border: selectedTool === 'support' ? '2px solid var(--cv6-accent-primary)' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: selectedTool === 'support' ? 'var(--cv6-accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedTool === 'support' ? '#ffffff' : 'var(--cv6-text-primary)',
                  cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontWeight: '500',
                  minHeight: '80px',
                }}
                onMouseEnter={(e) => {
                  if (selectedTool !== 'support') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTool !== 'support') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Support</span>
              </button>

              {/* Command Deck */}
              <button
                onClick={() => setSelectedTool('command')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px', borderRadius: '6px', border: selectedTool === 'command' ? '2px solid var(--cv6-accent-primary)' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: selectedTool === 'command' ? 'var(--cv6-accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedTool === 'command' ? '#ffffff' : 'var(--cv6-text-primary)',
                  cursor: 'pointer', transition: 'all 120ms ease', fontFamily: 'inherit', fontWeight: '500',
                  minHeight: '80px',
                }}
                onMouseEnter={(e) => {
                  if (selectedTool !== 'command') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTool !== 'command') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                  <polyline points="4 9 7 9 7 20 4 20"/>
                  <polyline points="12 9 15 9 15 20 12 20"/>
                  <polyline points="20 9 23 9 23 20 20 20"/>
                </svg>
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Command</span>
              </button>
            </div>
          </div>

          {/* R14: WHAT NEEDS YOU — moved below the 3-column layout */}
          {(needsYou && needsYou.length > 0) && (
            <div className="hm-section" style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--cv6-divider)', color: 'var(--cv6-text-secondary)' }}>What needs you</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {needsYou.map((n, idx) => {
                  const isSelected = cv6 && selectedIndex >= 0 && selectableItems[selectedIndex]?.type === 'needsyou' && selectableItems[selectedIndex]?.item?.key === n.key
                  return (
                  <button
                    key={n.key}
                    onClick={() => n.onOpen && n.onOpen()}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px',
                      background: isSelected ? 'var(--cv6-accent-primary)' : 'var(--cv6-surface)',
                      color: isSelected ? '#ffffff' : 'var(--cv6-text-primary)',
                      border: isSelected ? '2px solid var(--cv6-accent-primary)' : '1px solid var(--cv6-divider)',
                      borderRadius: '8px', cursor: 'pointer', transition: 'all 120ms ease',
                      textAlign: 'left', fontFamily: 'inherit', fontWeight: '500',
                      boxShadow: isSelected ? '0 0 0 3px rgba(0,102,255,0.1)' : 'none',
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? '#ffffff' : 'var(--cv6-accent-warn)', flexShrink: 0, marginTop: '4px', animation: 'hm-breathe 2s ease-in-out infinite' }}></span>
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
