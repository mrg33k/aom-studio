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

import { useCallback, useEffect, useMemo, useState } from 'react'

const PIN_AGENTS_KEY = 'cv4_pinned_agents'
const PIN_PROJECTS_KEY = 'cv4_pinned_projects'
const EXPANDED_PROJECTS_KEY = 'cv4_expanded_projects'

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

export default function HomeView({
  user,
  worldId,
  agents = [],
  projectRooms = [],
  onSelectAgent,
  onSelectProject,
  onOpenSearch,
}) {
  // Pin state — keyed by user id
  const userId = user?.id
  const [pinnedAgents, setPinnedAgents] = useState(() => readStored(PIN_AGENTS_KEY + ':' + userId, []))
  const [pinnedProjects, setPinnedProjects] = useState(() => readStored(PIN_PROJECTS_KEY + ':' + userId, []))
  const [expandedProjects, setExpandedProjects] = useState(() => readStored(EXPANDED_PROJECTS_KEY + ':' + userId, {}))
  const [searchText, setSearchText] = useState('')
  const greeting = useMemo(() => pickGreeting(), [])

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
      const res = await fetch(
        '/api/dashboard/missions-tree?client=' + encodeURIComponent(worldId),
        { credentials: 'include' }
      )
      if (!res.ok) return
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
  }, [worldId])

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

  // Recent (top 5): pinned first, then chronologically by effective last activity.
  // Effective activity = max(project.last_message_at, latest mission.last_message_at).
  // useDataPipe doesn't set last_message_at on projectRooms, so we derive recency
  // from the missions data which does carry timestamps. This means a project bubbles
  // up to "recent" when any of its missions has recent activity.
  const { recentProjects, allProjects } = useMemo(() => {
    if (!projectRooms || projectRooms.length === 0) return { recentProjects: [], allProjects: [] }
    const pinSet = new Set(pinnedProjects)

    // Compute effective last-active timestamp per project
    const effectiveTs = (p) => {
      const projTs = p.last_message_at ? new Date(p.last_message_at).getTime() : 0
      const missions = missionsByProject[p.slug] || []
      const missionTs = missions.reduce((max, m) => {
        const t = m.last_message_at ? new Date(m.last_message_at).getTime() : 0
        return t > max ? t : max
      }, 0)
      return Math.max(projTs, missionTs)
    }

    const sorted = [...projectRooms].sort((a, b) => {
      const aPin = pinSet.has(a.slug)
      const bPin = pinSet.has(b.slug)
      if (aPin !== bPin) return aPin ? -1 : 1
      return effectiveTs(b) - effectiveTs(a)
    })
    const recent = sorted.slice(0, 5)
    const recentSlugs = new Set(recent.map(p => p.slug))
    const rest = [...projectRooms]
      .filter(p => !recentSlugs.has(p.slug))
      .sort((a, b) => (a.name || a.slug || '').localeCompare(b.name || b.slug || ''))
    return { recentProjects: recent, allProjects: rest }
  }, [projectRooms, pinnedProjects, missionsByProject])

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

  return (
    <div data-cv4-home style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: 'transparent',
      color: 'var(--c-text, #E8EBEF)',
      fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @keyframes hm-breathe { 0%,100%{opacity:1}50%{opacity:.4} }
        [data-cv4-home] .hm-shell { max-width:780px; margin:0 auto; padding:72px 32px 64px; }
        [data-cv4-home] .hm-welcome { font-weight:800; font-size:clamp(34px,5vw,54px); line-height:1.05; letter-spacing:-.025em; margin:0 0 48px; -webkit-font-smoothing:antialiased; text-wrap:balance; }
        [data-cv4-home] .hm-welcome .hm-l1 { color:#E8EBEF; }
        [data-cv4-home] .hm-welcome .hm-l2 { color:#A7B5C8; margin-left:0.32em; }
        [data-cv4-home] .hm-search { position:relative; margin-bottom:52px; }
        [data-cv4-home] .hm-search input { width:100%; box-sizing:border-box; padding:16px 68px 16px 50px; background:transparent; border:1px solid #2D3A4A; border-radius:2px; color:#E8EBEF; font-family:inherit; font-size:16px; font-weight:400; outline:none; transition:border-color 120ms ease, background-color 120ms ease; }
        [data-cv4-home] .hm-search input::placeholder { color:#5A6F8C; font-weight:400; }
        [data-cv4-home] .hm-search input:focus { border-color:#A7B5C8; background:rgba(255,255,255,.015); }
        [data-cv4-home] .hm-search-icon { position:absolute; left:18px; top:50%; transform:translateY(-50%); width:18px; height:18px; color:#5A6F8C; pointer-events:none; }
        [data-cv4-home] .hm-search-hint { position:absolute; right:16px; top:50%; transform:translateY(-50%); font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; letter-spacing:.10em; color:#5A6F8C; text-transform:uppercase; pointer-events:none; }
        [data-cv4-home] .hm-section { margin-bottom:40px; }
        [data-cv4-home] .hm-section-label { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#5A6F8C; padding:0 0 12px; border-bottom:1px solid rgba(255,255,255,.055); margin-bottom:4px; }
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

        /* Light theme overrides (parent provides data-theme) */
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-welcome .hm-l1 { color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-welcome .hm-l2 { color:rgba(42,38,32,0.55); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search input { border-color:rgba(0,0,0,0.16); color:#2A2620; }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search input::placeholder { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search-icon,
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-search-hint { color:rgba(42,38,32,0.5); }
        [data-shell="cv4"][data-theme="light"] [data-cv4-home] .hm-section-label { color:rgba(42,38,32,0.5); border-bottom-color:rgba(0,0,0,0.08); }
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
      `}</style>

      <div className="hm-shell">
        {/* Welcome */}
        <h1 className="hm-welcome">
          <span className="hm-l1">{greeting}</span>{' '}
          <span className="hm-l2">{displayName(user)}.</span>
        </h1>

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

        {/* Agents */}
        <div className="hm-section">
          <div className="hm-section-label">Agents</div>
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

        {/* Projects */}
        <div className="hm-section">
          <div className="hm-section-label">Recent</div>
          {recentProjects.length === 0 && (
            <div style={{ padding: '14px 0', color: '#5A6F8C', fontSize: 14, fontStyle: 'italic' }}>No projects yet.</div>
          )}
          {recentProjects.map(p => {
            const isPinned = pinnedProjects.includes(p.slug)
            const isExpanded = !!expandedProjects[p.slug]
            const missions = missionsByProject[p.slug] || []
            return (
              <div key={p.slug} className={'hm-proj' + (isExpanded ? ' expanded' : '')}>
                <div className="hm-proj-head">
                  <button
                    className="hm-proj-name"
                    onClick={() => onSelectProject && onSelectProject(p, null)}
                  >{p.name || p.slug}</button>
                  <button
                    className="hm-icon-btn chat"
                    onClick={() => onSelectProject && onSelectProject(p, null)}
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
                    {missions.slice(0, 8).map(m => (
                      <button
                        key={m.slug}
                        className="hm-mission"
                        onClick={() => onSelectProject && onSelectProject(p, m)}
                      >
                        <span className={'hm-mdot' + (m.status === 'running' || m.status === 'active' ? ' active' : m.status === 'queued' ? ' queued' : '')}></span>
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

        {/* ALL PROJECTS — every project the user has access to, alphabetical.
            Sits below the recent-5 so users can find anything that's not
            currently pinned/recent without leaving home. */}
        {allProjects.length > 0 && (
          <div className="hm-section">
            <div className="hm-section-label">All Projects</div>
            {allProjects.map(p => {
              const isPinned = pinnedProjects.includes(p.slug)
              const isExpanded = !!expandedProjects[p.slug]
              const missions = missionsByProject[p.slug] || []
              return (
                <div key={p.slug} className={'hm-proj' + (isExpanded ? ' expanded' : '')}>
                  <div className="hm-proj-head">
                    <button
                      className="hm-proj-name"
                      onClick={() => onSelectProject && onSelectProject(p, null)}
                    >{p.name || p.slug}</button>
                    <button
                      className="hm-icon-btn chat"
                      onClick={() => onSelectProject && onSelectProject(p, null)}
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
                      {missions.slice(0, 8).map(m => (
                        <button
                          key={m.slug}
                          className="hm-mission"
                          onClick={() => onSelectProject && onSelectProject(p, m)}
                        >
                          <span className={'hm-mdot' + (m.status === 'running' || m.status === 'active' ? ' active' : m.status === 'queued' ? ' queued' : '')}></span>
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
        )}
      </div>
    </div>
  )
}
