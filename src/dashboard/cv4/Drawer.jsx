// CV4 Drawer — left sidebar / file browser.
//
// Two render modes:
//  - overlay (mobile/tablet): position:fixed slide-in with backdrop
//  - docked  (desktop):       inline flex column, part of the layout
//
// R6.1 / R6.3 = projects+missions tree as a file browser.
// R6.6 (2026-05-13) = docked mode so the sidebar is always-on at >=1024px.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { FolderIcon as KitFolderIcon, MissionIcon as KitMissionIcon } from './lib/uiKit.jsx'
import missionsData from '../data/missions.json'
import useHomeSearch from '../components/cv3/conversations/useHomeSearch.js'
import { authFetch } from '../lib/authFetch.js'
import LeftMailPanel from './LeftMailPanel.jsx'
import RoutinesPanel from './RoutinesPanel.jsx'
import SkillsShelf from './SkillsShelf.jsx'
import SkillsBadge from './SkillsBadge.jsx'
import { MissionContextMenu, ProjectContextMenu, useIsMobile, useLongPress } from '../components/cv3/ContextMenuVariants.jsx'
import useChatDispatch from '../components/cv3/useChatDispatch.js'

// R5 — sort missions the same way projects sort: most recently active
// (newest last_message_at) floats to the top. Among missions with no
// recent activity, keep active ahead of done, then alphabetical. Mirrors
// the project-level recency sort and HomeView's mission ordering.
function byMissionRecency(a, b) {
  const ta = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0
  const tb = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0
  if (ta !== tb) return tb - ta                          // most recent first
  if (!!a?.is_done !== !!b?.is_done) return a?.is_done ? 1 : -1  // active before done
  return (a?.name || '').localeCompare(b?.name || '')    // alpha fallback
}

const PANEL_WIDTH = 300
const MENU = {
  bodyFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  displayFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  monoFont: "'JetBrains Mono', monospace",
  amber: 'var(--c-yellow)',
}

// Patrik's Supabase Auth uid (the super-admin). Used to gate the
// "Reset to AOM" backdoor link in the Account section — that link wipes
// the world override + force-reloads, which is an emergency debug tool
// for the super-admin (tenant world-switcher state) and not something
// other AOM team members or tenant users need or should see.
const SUPER_ADMIN_UID = '833f6828-1dae-409c-a24b-1438f46544d0'

export default function CV4Drawer({
  open,
  onClose,
  docked = false,
  agents = [],
  projectRooms = [],
  notifItems = [],
  worldId,
  currentUserId = null,
  selectedAgentSlug,
  selectedProjectSlug,
  activeTool = null,
  selectedMailId = null,
  onSelectMail,
  onSelectTool,
  onSelectAgent,
  onSelectProject,
  onNewProject,
  onNewMission,
  onSelectMission,
  onSelectTask,
  onLogout,
  // R78-p9c: counter prop — increment from outside (CornerV4) after a new
  // project or mission is created to force an immediate missions-tree refetch.
  refreshKey = 0,
  // corner:skills-picker R1: when true, replace the project tree body with
  // the SkillsShelf takeover. CornerV4 owns the toggle state. The badge
  // lives inside the Drawer body (above Agents) so the user sees the
  // affordance from the same rail it takes over.
  skillsShelfOpen = false,
  onToggleSkillsShelf,
  onCloseSkillsShelf,
  onPickSkill,
}) {
  const isSuperAdmin = currentUserId === SUPER_ADMIN_UID
  useEffect(() => {
    if (docked || !open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, docked])

  const missionsByProject = useMemo(() => {
    const map = new Map()
    for (const m of (missionsData.missions || [])) {
      if (!m.projectSlug) continue
      const list = map.get(m.projectSlug) || []
      list.push(m)
      map.set(m.projectSlug, list)
    }
    for (const list of map.values()) list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return map
  }, [])

  // corner:notifications R2 — green dot next to a project / mission that has an
  // unread notification. notifItems is already filtered by per-room read state
  // in CornerV4, so a dot clears once the room is opened (handleSelectProject /
  // handleSelectMission stamp the read time). A project dot lights when the
  // project room OR any mission under it has unread.
  const { projectNotif, missionNotif } = useMemo(() => {
    const projectNotif = new Set() // project slug
    const missionNotif = new Set() // full "project:mission" slug
    for (const item of (notifItems || [])) {
      const projSlug = item.project ||
        (item.missionSlug && item.missionSlug.includes(':') ? item.missionSlug.slice(0, item.missionSlug.indexOf(':')) : null)
      if (projSlug) projectNotif.add(projSlug)
      if (item.missionSlug) missionNotif.add(item.missionSlug)
    }
    return { projectNotif, missionNotif }
  }, [notifItems])

  // R5 corner:task-rooms — live missions-tree layered over the static catalog.
  // Brings active task counts + ids under each mission so the rail can open
  // task rooms directly from the tree.
  //
  // R-refresh (2026-05-18): extracted into a loadTree callback so the user can
  // manually refresh (button in the Explorer header) and so the tree auto-
  // refreshes on window focus + document visibility change.
  const [tasksTree, setTasksTree] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Keep a ref to the latest worldId so the stable loadTree callback can
  // always use the current value without re-creating on every worldId change.
  const worldIdRef = useRef(worldId)
  useEffect(() => { worldIdRef.current = worldId }, [worldId])

  const loadTree = useCallback(async () => {
    const wid = worldIdRef.current
    if (!wid) return
    setRefreshing(true)
    try {
      const r = await authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(wid)}`, { credentials: 'include' })
      if (!r.ok) return
      const j = await r.json().catch(() => null)
      if (j && Array.isArray(j.projects)) setTasksTree(j)
    } catch { /* swallow — falls back to static-only rendering */ }
    setRefreshing(false)
  }, [])

  // Initial load whenever the drawer becomes visible or worldId changes.
  useEffect(() => {
    if (!worldId) return
    if (!docked && !open) return  // overlay mode: only load when drawer is open
    loadTree()
  }, [open, worldId, docked]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh on window focus and document visibility change so the tree
  // picks up any disk changes made while the user was away from the tab.
  useEffect(() => {
    const onFocus = () => { if (worldIdRef.current) loadTree() }
    const onVis   = () => { if (!document.hidden && worldIdRef.current) loadTree() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loadTree])

  // R78-p9c: CornerV4 increments refreshKey after creating a project or mission.
  // Trigger an immediate tree reload so the new entry appears without waiting
  // for a focus/visibility event. Skip the initial 0 value (mount).
  useEffect(() => {
    if (!refreshKey) return
    loadTree()
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Index: project slug -> { missionSlug -> tasks[], unfiled: tasks[] }.
  // R4 — also expose a per-mission meta map (last_message_at etc) so the
  // drawer can light its "active" dot from real activity, not status field.
  const tasksByProject = useMemo(() => {
    const map = new Map()
    if (!tasksTree) return map
    for (const p of (tasksTree.projects || [])) {
      const missions = new Map()
      const missionMeta = new Map()
      for (const m of (p.missions || [])) {
        missions.set(m.slug, m.tasks || [])
        missionMeta.set(m.slug, {
          last_message_at: m.last_message_at || null,
          status: m.status || null,
          is_done: !!m.is_done,
        })
      }
      map.set(p.slug, { missions, missionMeta, unfiled: p.unfiled_tasks || [], tree: p.tree || null, projectLastMessageAt: p.last_message_at || null })
    }
    return map
  }, [tasksTree])

  const [expanded, setExpanded] = useState(() => new Set(selectedProjectSlug ? [selectedProjectSlug] : []))
  useEffect(() => {
    if (selectedProjectSlug && !expanded.has(selectedProjectSlug)) {
      setExpanded(prev => new Set(prev).add(selectedProjectSlug))
    }
  }, [selectedProjectSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (slug) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug); else next.add(slug)
      return next
    })
  }

  const sharedStyles = (
    <style>{`
      @keyframes cv4DrawerFade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes cv4Spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      [data-cv4-drawer] [data-row]:hover { background: rgba(255,255,255,0.035); }
      [data-cv4-drawer] [data-row][data-active="true"] { background: rgba(234,179,8,0.08); }
      [data-cv4-drawer] [data-row][data-active="true"]::before {
        content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 2px;
        background: ${MENU.amber}; border-radius: 0 2px 2px 0;
      }
      [data-cv4-drawer] [data-row] { position: relative; }
      [data-cv4-refresh-btn] { opacity: 0.45; transition: opacity 0.15s, color 0.15s; }
      [data-cv4-refresh-btn]:hover { opacity: 1; }
      [data-cv4-refresh-btn][data-spinning="true"] svg {
        animation: cv4Spin 0.8s linear infinite;
      }
    `}</style>
  )

  const body = (
    <DrawerBody
      projectRooms={projectRooms}
      missionsByProject={missionsByProject}
      tasksByProject={tasksByProject}
      projectNotif={projectNotif}
      missionNotif={missionNotif}
      onSelectTask={onSelectTask}
      expanded={expanded}
      toggle={toggle}
      selectedProjectSlug={selectedProjectSlug}
      selectedAgentSlug={selectedAgentSlug}
      agents={agents}
      worldId={worldId}
      activeTool={activeTool}
      selectedMailId={selectedMailId}
      onSelectMail={onSelectMail}
      onSelectTool={onSelectTool}
      onSelectAgent={onSelectAgent}
      onSelectProject={onSelectProject}
      onNewProject={onNewProject}
      onNewMission={onNewMission}
      onSelectMission={onSelectMission}
      onLogout={onLogout}
      onClose={docked ? () => {} : onClose}
      isSuperAdmin={isSuperAdmin}
      onToggleSkillsShelf={onToggleSkillsShelf}
      skillsShelfOpen={skillsShelfOpen}
    />
  )

  // corner:skills-picker R1 — when Skills shelf is open, it takes over the
  // entire body of the drawer. Header stays the same so the user can still
  // close the drawer; the Refresh button isn't relevant in shelf mode but
  // keeping the header consistent avoids a layout jump.
  const displayedBody = skillsShelfOpen ? (
    <SkillsShelf
      onPickSkill={(skill) => onPickSkill?.(skill)}
      onClose={() => onCloseSkillsShelf?.()}
    />
  ) : body

  if (docked) {
    return (
      <aside
        data-cv4-drawer
        data-cv4-drawer-docked="true"
        data-testid="cv4-drawer"
        style={{
          width: PANEL_WIDTH, flexShrink: 0,
          background: C.bg,
          borderRight: '1px solid ' + C.border,
          display: 'flex', flexDirection: 'column',
          fontFamily: MENU.bodyFont,
          overflow: 'hidden',
        }}
      >
        {sharedStyles}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 12px',
          borderBottom: '1px solid ' + C.border,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{
              fontFamily: MENU.bodyFont,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              lineHeight: 1.1,
              color: C.text,
            }}>Explorer</span>
          </div>
          <button
            data-cv4-refresh-btn
            data-spinning={refreshing ? 'true' : 'false'}
            onClick={loadTree}
            aria-label="Refresh"
            title="Refresh"
            disabled={refreshing}
            style={{
              width: 22, height: 22, borderRadius: 5,
              background: 'none', border: 'none',
              color: C.muted, cursor: refreshing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, flexShrink: 0,
            }}
          >
            <RefreshIcon />
          </button>
        </div>
        {displayedBody}
      </aside>
    )
  }

  return (
    <>
      {sharedStyles}

      <div
        data-testid="cv4-drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 220,
          background: 'rgba(0,0,0,0.45)',
          animation: 'cv4DrawerFade 0.15s ease-out',
          pointerEvents: open ? 'auto' : 'none',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.15s ease-out',
        }}
        aria-hidden={!open}
      />

      <aside
        data-cv4-drawer
        data-testid="cv4-drawer"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: PANEL_WIDTH, maxWidth: '85vw',
          zIndex: 221,
          background: C.bg,
          borderRight: '1px solid ' + C.border,
          boxShadow: open ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(.2,.8,.2,1)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          fontFamily: MENU.bodyFont,
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 12px',
          borderBottom: '1px solid ' + C.border,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{
              fontFamily: MENU.bodyFont,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              lineHeight: 1.1,
              color: C.text,
            }}>Explorer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              data-cv4-refresh-btn
              data-spinning={refreshing ? 'true' : 'false'}
              onClick={loadTree}
              aria-label="Refresh"
              title="Refresh"
              disabled={refreshing}
              style={{
                width: 22, height: 22, borderRadius: 5,
                background: 'none', border: 'none',
                color: C.muted, cursor: refreshing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, flexShrink: 0,
              }}
            >
              <RefreshIcon />
            </button>
            <button
              onClick={onClose}
              aria-label="Close menu"
              style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'none', border: 'none',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>
        {displayedBody}
      </aside>
    </>
  )
}

function DrawerBody({
  projectRooms,
  missionsByProject,
  tasksByProject,
  projectNotif = new Set(),
  missionNotif = new Set(),
  onSelectTask,
  expanded,
  toggle,
  selectedProjectSlug,
  selectedAgentSlug,
  agents,
  worldId,
  activeTool,
  selectedMailId,
  onSelectMail,
  onSelectTool,
  onSelectAgent,
  onSelectProject,
  onNewProject,
  onNewMission,
  onSelectMission,
  onLogout,
  onClose,
  isSuperAdmin = false,
  onToggleSkillsShelf,
  skillsShelfOpen = false,
}) {
  // ── Mail new-mail dot (R21, 2026-05-26) ──────────────────────────────────
  // Orange dot on the Mail pill when there's email newer than the last time
  // the user opened the Mail section. localStorage key cv4.mail.lastCheck
  // stores the ISO timestamp of the last open; no cross-session reset.
  const MAIL_LAST_CHECK_KEY = 'cv4.mail.lastCheck'
  const [hasNewMail, setHasNewMail] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Step 1: get Gmail connection
        const r = await authFetch('/api/dashboard/mail/connections')
        if (!r.ok || cancelled) return
        const body = await r.json()
        const connections = Array.isArray(body?.connections) ? body.connections : []
        if (connections.length === 0) return // no Gmail connected

        // Step 2: fetch newest email in awaiting-reply bucket
        const connection = connections[0]
        const r2 = await authFetch(
          `/api/dashboard/mail/list?connection_id=${encodeURIComponent(connection.id)}&bucket=awaiting-reply`
        )
        if (!r2.ok || cancelled) return
        const body2 = await r2.json()
        if (body2?.mode === 'not-connected') return
        const emails = Array.isArray(body2?.emails) ? body2.emails : []
        if (emails.length === 0) return

        // Step 3: compare newest email date vs stored lastCheck
        const newestDate = emails[0]?.date
        if (!newestDate) return

        const lastCheck = typeof window !== 'undefined' ? localStorage.getItem(MAIL_LAST_CHECK_KEY) : null
        if (!lastCheck) {
          // Never opened mail → show dot
          if (!cancelled) setHasNewMail(true)
          return
        }
        const lastCheckTime = new Date(lastCheck).getTime()
        const newestTime = new Date(newestDate).getTime()
        if (newestTime > lastCheckTime && !cancelled) setHasNewMail(true)
      } catch { /* swallow — dot stays off on any error */ }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMailOpen = useCallback(() => {
    // User opened the Mail section — stamp the lastCheck + clear dot
    try {
      if (typeof window !== 'undefined') localStorage.setItem(MAIL_LAST_CHECK_KEY, new Date().toISOString())
    } catch { /* swallow */ }
    setHasNewMail(false)
  }, [])

  // ── R6 right-click + long-press wiring ──
  const dispatchToChat = useChatDispatch()
  const isMobile = useIsMobile()
  const [ctxMenu, setCtxMenu] = useState(null) // {kind, x, y, payload}
  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])
  const openMissionMenu = useCallback((x, y, mission, projectSlug) => {
    setCtxMenu({ kind: 'mission', x, y, mission: { ...mission, projectSlug: projectSlug || mission.projectSlug || mission.project } })
  }, [])
  const openProjectMenu = useCallback((x, y, project) => {
    setCtxMenu({ kind: 'project', x, y, project })
  }, [])
  const handleAgentPrompt = useCallback(async (text) => {
    closeCtxMenu()
    const r = await dispatchToChat(text)
    if (!r?.ok) console.warn('[Drawer] chat dispatch failed', r)
  }, [dispatchToChat, closeCtxMenu])
  const handleMissionRename = useCallback(async (mission) => {
    closeCtxMenu()
    const current = mission.name || mission.slug
    const next = typeof window !== 'undefined' ? window.prompt(`Rename mission "${current}" to:`, current) : null
    if (!next || next.trim() === current) return
    try {
      await authFetch('/api/dashboard/mission-update', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug, mission_slug: mission.slug, name: next.trim() }),
      })
    } catch (e) { console.error(e) }
  }, [closeCtxMenu])
  const handleMissionDelete = useCallback(async (mission) => {
    closeCtxMenu()
    if (typeof window === 'undefined') return
    if (window.prompt(`Delete mission "${mission.name || mission.slug}"? Type DELETE in caps:`) !== 'DELETE') return
    try {
      await authFetch('/api/dashboard/mission-update', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug, mission_slug: mission.slug, confirm: 'DELETE' }),
      })
    } catch (e) { console.error(e) }
  }, [closeCtxMenu])
  const handleProjectRename = useCallback(async (project) => {
    closeCtxMenu()
    const current = project.name || project.slug
    const next = typeof window !== 'undefined' ? window.prompt(`Rename project "${current}" to:`, current) : null
    if (!next || next.trim() === current) return
    try {
      await authFetch('/api/dashboard/project-update', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: project.slug, name: next.trim() }),
      })
    } catch (e) { console.error(e) }
  }, [closeCtxMenu])
  const handleProjectDelete = useCallback(async (project) => {
    closeCtxMenu()
    if (typeof window === 'undefined') return
    if (window.prompt(`Delete project "${project.name || project.slug}"? Type DELETE in caps:`) !== 'DELETE') return
    try {
      await authFetch('/api/dashboard/project-update', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: project.slug, confirm: 'DELETE' }),
      })
    } catch (e) { console.error(e) }
  }, [closeCtxMenu])
  const handleCreateSubfolder = useCallback(async (target) => {
    closeCtxMenu()
    const projectSlug = target.projectSlug || target.slug
    const name = typeof window !== 'undefined' ? window.prompt(`Create subfolder under project "${projectSlug}":`) : null
    if (!name || !name.trim()) return
    try {
      await authFetch('/api/dashboard/mission-folders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: projectSlug, name: name.trim() }),
      })
    } catch (e) { console.error(e) }
  }, [closeCtxMenu])
  const handleMissionMoveToFolder = useCallback(async (mission, folder) => {
    closeCtxMenu()
    try {
      await authFetch('/api/dashboard/mission-folders', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_slug: mission.projectSlug, mission_slug: mission.slug, folder_slug: folder?.slug || null }),
      })
    } catch (e) { console.error(e) }
  }, [closeCtxMenu])

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 8px 12px', minWidth: 0 }}>
      <DrawerSearchRow
        projectRooms={projectRooms}
        agents={agents}
        worldId={worldId}
        onSelectProject={onSelectProject}
        onSelectAgent={onSelectAgent}
        onClose={onClose}
      />

      {/* Projects first — above Agents + Skills per Patrik 2026-05-28.
          Always open (no defaultCollapsed) + sorted by most recent activity. */}
      <TreeSection
        title="Projects"
        collapsible
        action={onNewProject ? (
          <button
            data-cv4-new-project
            onClick={(e) => { e.stopPropagation(); onNewProject() }}
            aria-label="New project"
            title="New project"
            style={{
              background: 'none', border: '1px solid ' + C.border, borderRadius: 5,
              color: C.muted, cursor: 'pointer', padding: '1px 7px 2px',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1.4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.muted }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
          >+ New</button>
        ) : null}
      >
        {projectRooms.length === 0 ? (
          <Empty label="No projects" />
        ) : (
          // Sort by most recent mission activity — project with the newest
          // last_message_at across any of its missions floats to the top.
          // Projects with no activity data fall to the bottom alphabetically.
          (() => {
            const getRecent = (slug) => {
              const entry = tasksByProject?.get(slug)
              let max = 0
              // Project-level recency (newest message anywhere in the project,
              // including project chat — not just mission-tagged messages).
              const projTs = entry?.projectLastMessageAt
              if (projTs) max = new Date(projTs).getTime()
              // Also fold in per-mission timestamps as a safety net.
              const meta = entry?.missionMeta
              if (meta && meta.size > 0) {
                for (const m of meta.values()) {
                  const t = m?.last_message_at ? new Date(m.last_message_at).getTime() : 0
                  if (t > max) max = t
                }
              }
              return max
            }
            const ranked = [...projectRooms]
              .map(p => ({ p, ts: getRecent(p.slug) }))
              .sort((x, y) => {
                if (x.ts !== y.ts) return y.ts - x.ts  // most recent first
                return (x.p.name || '').localeCompare(y.p.name || '')  // alpha fallback
              })
            // The living and the dormant should read differently: a quiet
            // divider separates projects with an activity signal from the
            // silent alphabetical tail, so 25 rows stop reading as one wall.
            const firstQuiet = ranked.findIndex(x => x.ts === 0)
            return ranked.map(({ p }, rankIdx) => {
            // R4 — prefer the live registry-backed tree (from missions-tree
            // API), fall back to the static missions.json catalog. The
            // registry is authoritative; the static catalog is stale.
            const staticMissions = missionsByProject.get(p.slug) || []
            const liveMeta = tasksByProject?.get(p.slug)?.missionMeta
            const missions = (liveMeta && liveMeta.size > 0)
              ? Array.from(liveMeta.entries()).map(([key, meta]) => {
                  const rawSlug = key.startsWith(`${p.slug}:`)
                    ? key.slice(p.slug.length + 1)
                    : key
                  const display = rawSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  return {
                    slug: rawSlug,
                    name: display,
                    status: meta?.status || null,
                    is_done: !!meta?.is_done,
                    last_message_at: meta?.last_message_at || null,
                    projectSlug: p.slug,
                  }
                }).sort(byMissionRecency)
              : staticMissions
            const isExpanded = expanded.has(p.slug)
            const hasMissions = missions.length > 0
            return (
              <div key={p.slug}>
                {rankIdx === firstQuiet && firstQuiet > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px 4px' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: C.muted, fontFamily: MENU.monoFont }}>Quiet</span>
                    <span style={{ flex: 1, height: 1, background: C.border2 }} />
                  </div>
                )}
                <FolderRow
                  label={p.name}
                  hasChildren={hasMissions}
                  expanded={isExpanded}
                  active={selectedProjectSlug === p.slug}
                  hasNotif={projectNotif.has(p.slug)}
                  onToggle={() => toggle(p.slug)}
                  onOpen={() => { onSelectProject?.(p); onClose() }}
                  onContextMenu={(e) => { e.preventDefault(); openProjectMenu(e.clientX, e.clientY, p) }}
                  onLongPress={(x, y) => openProjectMenu(x, y, p)}
                />
                {isExpanded && (
                  <div>
                    {/* R-MP-2 — if the API gave us a nested tree for this project,
                        render it with collapsible parent/child rows. Otherwise
                        fall back to the legacy flat list. Both paths use the
                        same MissionRow + expanded Set. */}
                    {(tasksByProject?.get(p.slug)?.tree && tasksByProject.get(p.slug).tree.length > 0) ? (
                      <MissionTreeBranch
                        nodes={tasksByProject.get(p.slug).tree}
                        projectSlug={p.slug}
                        projectName={p.name}
                        expanded={expanded}
                        onToggle={toggle}
                        onSelectMission={onSelectMission}
                        onClose={onClose}
                        missionNotif={missionNotif}
                        depth={0}
                      />
                    ) : (
                      hasMissions && missions.map(m => {
                        const missionKey = `${p.slug}:${m.slug}`
                        const liveMeta = tasksByProject?.get(p.slug)?.missionMeta?.get(missionKey)
                          || tasksByProject?.get(p.slug)?.missionMeta?.get(m.slug)
                          || null
                        return (
                          <MissionRow
                            key={`${p.slug}-${m.slug}`}
                            mission={m}
                            lastMessageAt={liveMeta?.last_message_at || null}
                            hasNotif={missionNotif.has(missionKey)}
                            onClick={() => {
                              onSelectMission?.(m, p)
                              onClose()
                            }}
                            onContextMenu={(e) => { e.preventDefault(); openMissionMenu(e.clientX, e.clientY, m, p.slug) }}
                            onLongPress={(x, y, mm) => openMissionMenu(x, y, mm, p.slug)}
                          />
                        )
                      })
                    )}
                    {/* R78-p9b — new mission door: always visible when expanded */}
                    {onNewMission && (
                      <NewMissionRow onClick={() => onNewMission(p)} />
                    )}
                  </div>
                )}
              </div>
            )
          })
          })()
        )}
      </TreeSection>

 {/* corner:skills-picker R1, purple "Browse skills" CTA above the
          Agents section. Click opens the Skills shelf takeover. */}
      {onToggleSkillsShelf && (
        <SkillsBadge open={skillsShelfOpen} onToggle={onToggleSkillsShelf} />
      )}

      <TreeSection title="Agents" collapsible defaultCollapsed>
        {agents.length === 0 ? (
          <Empty label="No agents" />
        ) : (
          agents.map(a => (
            <AgentRow
              key={a.slug}
              agent={a}
              active={selectedAgentSlug === a.slug}
              onClick={() => { onSelectAgent?.(a); onClose() }}
            />
          ))
        )}
      </TreeSection>

      {/* corner:routines R1 (2026-06-11) — open loops live here: list, kill,
          create, attach to a room, pick model. RoutinesPanel owns its data
          (fetches /api/dashboard/routines); the room picker reuses the
          drawer's projects/missions/agents. */}
      <TreeSection
        title="Routines"
        collapsible
        defaultCollapsed
        onHeaderClick={() => { onSelectTool?.('routines'); onClose() }}
      >
        <RoutinesPanel
          worldId={worldId}
          projectRooms={projectRooms}
          agents={agents}
          getMissions={(projectSlug) => {
            const liveMeta = tasksByProject?.get(projectSlug)?.missionMeta
            if (liveMeta && liveMeta.size > 0) {
              return Array.from(liveMeta.keys()).map(key => {
                const rawSlug = key.startsWith(`${projectSlug}:`) ? key.slice(projectSlug.length + 1) : key
                return { slug: rawSlug, name: rawSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
              })
            }
            return (missionsByProject.get(projectSlug) || []).map(m => ({ slug: m.slug, name: m.name }))
          }}
        />
      </TreeSection>

      {/* R20 (2026-05-25) — Mail moved below Projects (2026-05-28 per Patrik).
          R21 (2026-05-26) — defaults to CLOSED; orange dot when new mail. */}
      <TreeSection title="Mail" collapsible defaultCollapsed badge={hasNewMail} onOpen={handleMailOpen}>
        <LeftMailPanel
          selectedMailId={selectedMailId}
          onSelectMail={(email) => { onSelectMail?.(email); onClose() }}
        />
      </TreeSection>

      {/* R20 — Account also collapsible (default open) so every section
          shares the same chevron heading affordance. */}
      <TreeSection title="Account" collapsible>
        {/* Blanket model switch (corner:gemini-workers R4) — flips EVERY chat
            between Claude and Gemini in one tap. Per-chat picks (chat settings
            → Model) still win over this. The bridge reads the '_all' key. */}
        <GlobalModelSwitch worldId={worldId} />
 {/* "Reset to AOM" is a super-admin backdoor, wipes world override +
            force-reloads. Useful when the super-admin is debugging tenant
            world-switcher state; harmful (and confusing) for any other user,
            since it would force-reset *their* world to AOM (which they
            usually don't even have access to). Gate strictly on the
            super-admin uid. */}
        {isSuperAdmin && (
          <PlainRow
            icon={<ResetIcon />}
            label="Reset to AOM"
            onClick={() => {
              try {
                sessionStorage.removeItem('corner-world-override')
                localStorage.removeItem('corner-world-override-persist')
              } catch { /* ignore */ }
              // Force a clean reload so every hook re-subscribes to the
              // auth-derived world (no more sticky overrides).
              // R7.21: stay on the entry-point base path (/dashboard or /cv4).
              window.location.replace(window.location.pathname.startsWith('/cv4') ? '/cv4' : '/dashboard')
            }}
          />
        )}
        <PlainRow icon={<SignOutIcon />} label="Sign out" onClick={() => { onLogout?.(); onClose() }} />

      {ctxMenu?.kind === 'mission' && (
        <MissionContextMenu
          open x={ctxMenu.x} y={ctxMenu.y} mission={ctxMenu.mission} folders={[]}
          mobile={isMobile} onClose={closeCtxMenu} onAgentPrompt={handleAgentPrompt}
          onRename={handleMissionRename} onDelete={handleMissionDelete}
          onCreateSubfolder={handleCreateSubfolder} onMoveToFolder={handleMissionMoveToFolder}
        />
      )}
      {ctxMenu?.kind === 'project' && (
        <ProjectContextMenu
          open x={ctxMenu.x} y={ctxMenu.y} project={ctxMenu.project} folders={[]}
          mobile={isMobile} onClose={closeCtxMenu} onAgentPrompt={handleAgentPrompt}
          onRename={handleProjectRename} onDelete={handleProjectDelete}
          onCreateSubfolder={handleCreateSubfolder} onMoveToFolder={() => closeCtxMenu()}
        />
      )}
      </TreeSection>
    </div>
  )
}

// R10-2 — section labels match the right-menu SectionLabel cadence
// (mono 10px, 0.12em letter-spacing, muted color, breathing padding).
// R19 — `collapsible` + `defaultCollapsed` props let Agents + Projects
// default to closed (chevron-toggled) while Account stays always-open.
// The `action` element (e.g. + New on Projects) remains visible
// regardless of expanded state — you can spin up a project without
// expanding the list first.
// badge = boolean — renders a small orange dot next to the title (used by
// Mail section to signal new email since the user last opened the section).
// onOpen = callback — fires when the section transitions from closed to open.
// onHeaderClick = callback — fires on EVERY header click (open or close),
// unlike onOpen which only fires on the closed→open transition. Used by
// Routines to open the full-area board in the center column.
function TreeSection({ title, action = null, collapsible = false, defaultCollapsed = false, badge = false, onOpen, onHeaderClick, children }) {
  const [open, setOpen] = useState(!defaultCollapsed)
  const showChildren = !collapsible || open

  const handleToggle = useCallback(() => {
    const next = !open
    setOpen(next)
    if (next && onOpen) onOpen()
    if (onHeaderClick) onHeaderClick()
  }, [open, onOpen, onHeaderClick])

  return (
    <section style={{
      margin: '0 0 8px',
      padding: '10px 0 4px',
      borderTop: '1px solid rgba(255,255,255,0.045)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px 7px',
      }}>
        {collapsible ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={open}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, textAlign: 'left',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.muted}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{
                flexShrink: 0,
                transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.12s',
              }}>
              <polyline points="9 6 15 12 9 18"/>
            </svg>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: C.muted,
              fontFamily: MENU.monoFont,
            }}>{title}</span>
            {badge && (
              <span
                title="New email"
                aria-label="New email"
                style={{
                  display: 'inline-block',
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#FF4F00',
                  boxShadow: '0 0 0 2px rgba(255,79,0,0.22)',
                  flexShrink: 0, marginLeft: 2,
                  alignSelf: 'center',
                }}
              />
            )}
          </button>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: C.muted,
            fontFamily: MENU.monoFont,
          }}>{title}</span>
        )}
        {action}
      </div>
      {showChildren && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
      )}
    </section>
  )
}

function FolderRow({ label, hasChildren, expanded, active, hasNotif = false, onToggle, onOpen, onContextMenu, onLongPress }) {
  const longPressHandlers = useLongPress(onLongPress)
  return (
    <div
      data-row
      data-active={active ? 'true' : 'false'}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 8px 5px 4px',
        borderRadius: 5,
        cursor: 'pointer',
      }}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      {...(longPressHandlers || {})}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle() }}
        aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : undefined}
        style={{
          width: 16, height: 16, padding: 0,
          background: 'none', border: 'none',
          cursor: hasChildren ? 'pointer' : 'default',
          color: C.muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          opacity: hasChildren ? 1 : 0.25,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
          <polyline points="9 6 15 12 9 18"/>
        </svg>
      </button>
      <FolderIcon open={expanded} />
      <span style={{
        fontSize: 13, fontWeight: 500, color: active ? C.text : C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
        fontFamily: MENU.bodyFont,
      }}>{label}</span>
      {hasNotif && (
        <span
          data-notif-dot
          title="New message in this project"
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: MENU.amber,
            boxShadow: '0 0 0 2px rgba(234,179,8,0.22)',
            flexShrink: 0, marginLeft: 4,
          }}
        />
      )}
    </div>
  )
}

function MissionTreeBranch({ nodes, projectSlug, projectName, expanded, onToggle, onSelectMission, onClose, missionNotif, depth = 0 }) {
  // R-MP-2 — recursive renderer for a project's nested mission tree.
  // Each parent gets a chevron toggle controlled by the shared `expanded`
  // Set (same one that opens projects). Children indent by depth.
  // R5 — sort by recent activity (same as the flat list + projects).
  return [...nodes].sort(byMissionRecency).map(node => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0
    const missionKey = node.slug // already "<projectSlug>:<rawSlug>"
    const isExpanded = expanded.has(missionKey)
    const missionForRow = {
      slug: node.raw_slug,
      name: node.name,
      status: node.status,
      is_done: node.is_done,
      projectSlug,
    }
    return (
      <div key={missionKey}>
        <MissionRow
          mission={missionForRow}
          lastMessageAt={node.last_message_at || null}
          hasNotif={missionNotif.has(missionKey)}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onToggleChildren={hasChildren ? () => onToggle(missionKey) : null}
          onClick={() => {
            onSelectMission?.(missionForRow, { slug: projectSlug, name: projectName })
            onClose?.()
          }}
        />
        {hasChildren && isExpanded && (
          <MissionTreeBranch
            nodes={node.children}
            projectSlug={projectSlug}
            projectName={projectName}
            expanded={expanded}
            onToggle={onToggle}
            onSelectMission={onSelectMission}
            onClose={onClose}
            missionNotif={missionNotif}
            depth={depth + 1}
          />
        )}
      </div>
    )
  })
}

function MissionRow({ mission, lastMessageAt = null, hasNotif = false, onClick, onContextMenu, onLongPress, depth = 0, hasChildren = false, isExpanded = false, onToggleChildren = null }) {
  const longPressHandlers = useLongPress(onLongPress ? (x, y) => onLongPress(x, y, mission) : null)
  // corner:mission-rooms — tasks retired 2026-05-17. Active dot is driven by
  // recent chat in the mission room. corner:notifications R2 — the same dot
  // also lights for an unread notification, which takes the headline meaning
  // (a notification is a stronger signal than "recent activity").
  // R-MP-2 — depth indents nested mission rows; hasChildren shows a chevron
  // toggle that opens/closes the child branch without selecting the parent.
  const recentChat = (() => {
    if (!lastMessageAt) return false
    const then = new Date(lastMessageAt).getTime()
    if (!Number.isFinite(then)) return false
    return (Date.now() - then) < (24 * 60 * 60 * 1000)
  })()
  const isActive = hasNotif || recentChat
  const indentBase = 40
  const indentStep = 14
  const paddingLeft = indentBase + (depth * indentStep)
  return (
    <div
      data-row
      data-active={isActive ? 'true' : undefined}
      data-test-id="mission-row"
      data-mission-slug={mission?.slug || ''}
      data-mission-depth={depth}
      data-mission-active={isActive ? 'true' : 'false'}
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...(longPressHandlers || {})}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: `4px 8px 4px ${paddingLeft}px`,
        borderRadius: 5,
        cursor: 'pointer',
      }}
    >
      {hasChildren ? (
        <span
          onClick={e => { e.stopPropagation(); onToggleChildren?.() }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 14, height: 14, marginRight: -2, flexShrink: 0,
            cursor: 'pointer', color: C.muted,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.12s',
            fontFamily: MENU.monoFont, fontSize: 10, lineHeight: 1,
          }}
        >›</span>
      ) : (
        <span style={{ width: 14, flexShrink: 0 }} />
      )}
      <DocIcon />
      <span
        data-active-dot
        data-notif={hasNotif ? 'true' : undefined}
        title={hasNotif ? 'New message in this room' : (isActive ? 'Recent chat in this room' : '')}
        style={{
          width: hasNotif ? 7 : 6, height: hasNotif ? 7 : 6, borderRadius: '50%',
          background: isActive ? MENU.amber : 'transparent',
          boxShadow: hasNotif ? '0 0 0 2px rgba(234,179,8,0.22)' : (isActive ? '0 0 0 1px rgba(234,179,8,0.35)' : 'none'),
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: 12, fontWeight: 500,
        color: isActive ? C.text : C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
        fontFamily: MENU.bodyFont,
      }}>{mission.name}</span>
      {mission.status && mission.status !== 'in-progress' && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: C.muted, fontFamily: MENU.monoFont,
          flexShrink: 0,
        }}>{mission.status}</span>
      )}
    </div>
  )
}

function TaskTreeRow({ task, unfiled = false, onClick }) {
  // R5 corner:task-rooms — task tier under a mission (or directly under
  // a project for unfiled tasks). Clicking opens the task room.
  const isRunning = task.status === 'running'
  const isFailed = task.status === 'failed'
  const isWaiting = task.status === 'waiting' || task.status === 'blocked' || task.status === 'needs_input'
  const dot = isRunning
    ? '#10B981'
    : (isFailed ? '#FCA5A5' : (isWaiting ? '#A78BFA' : C.muted))
  return (
    <div
      data-row
      data-test-id="task-tree-row"
      data-task-id={task.id}
      onClick={onClick}
      title={task.title || ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: unfiled ? '2px 10px 2px 44px' : '2px 10px 2px 56px',
        cursor: 'pointer',
        fontSize: 11.5,
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: dot, flexShrink: 0,
      }} />
      <span style={{
        color: isFailed ? '#FCA5A5' : C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}>{task.title || '(untitled)'}</span>
      {task.agent && (
        <span style={{
          fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}>{task.agent}</span>
      )}
    </div>
  )
}

function AgentRow({ agent, active, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  const spriteUrl = agent.slug ? `/corner/sprites-v2/${agent.slug}-sprite.png` : null
  return (
    <div
      data-row
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 8px',
        borderRadius: 5,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: C.muted,
        fontFamily: MENU.monoFont,
        overflow: 'hidden',
      }}>
        {spriteUrl && !imgFailed ? (
          <img
            src={spriteUrl}
            alt=""
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
          />
        ) : (
          (agent.name || '?')[0].toUpperCase()
        )}
      </div>
      <span style={{
        fontSize: 13, fontWeight: 500, color: active ? C.text : C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1,
        fontFamily: MENU.bodyFont,
      }}>{agent.name}</span>
    </div>
  )
}

// Blanket model switch (corner:gut-pruning-ship + universal setting).
// Lives in the Account section: one tap moves EVERY chat to the picked model
// via the '_all' key in user_preferences/agent_models. Per-chat picks
// (chat settings → Model) still win over this. Single source is
// src/dashboard/data/models.json — keep in sync via import.
// iOS default is Muse Spark (native platform).
import modelsJson from '../data/models.json'
const GLOBAL_MODEL_CHOICES = modelsJson.map(m => ({ id: m.id, label: m.label }))

function GlobalModelSwitch({ worldId }) {
  const [globalModel, setGlobalModel] = useState('muse-spark')
  const [open, setOpen] = useState(false)
  const [justApplied, setJustApplied] = useState('')

  useEffect(() => {
    if (!worldId) return
    authFetch(`/api/dashboard/agent-model?client=${encodeURIComponent(worldId)}`)
      .then(r => (r.ok ? r.json() : { models: {} }))
      .then(({ models }) => {
        const pref = models && models._all ? String(models._all) : ''
        if (pref) setGlobalModel(pref)
        else {
          // Default for now is Muse Spark — apply once, next turns use it
          setGlobalModel('muse-spark')
          authFetch('/api/dashboard/agent-model', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: '_all', model: 'muse-spark', client_id: worldId }),
          }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [worldId])

  const pick = (id) => {
    setGlobalModel(id)
    setOpen(false)
    const label = (GLOBAL_MODEL_CHOICES.find(m => m.id === id) || {}).label || id
    setJustApplied(label)
    setTimeout(() => setJustApplied(''), 3200)
    authFetch('/api/dashboard/agent-model', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: '_all', model: id, client_id: worldId }),
    }).then(() => { try { window.dispatchEvent(new Event('aom-model-pref-changed')) } catch { /* ignore */ } })
      .catch(() => {})
  }

  const active = GLOBAL_MODEL_CHOICES.find(m => m.id === globalModel)
  return (
    <div data-testid="global-model-switch">
      <div
        data-row
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer', color: C.muted,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: C.text2, fontFamily: MENU.bodyFont }}>
          AI model — all chats
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: globalModel === 'default' ? C.muted : '#60A5FA', fontFamily: MENU.bodyFont }}>
          {(active || {}).label || globalModel}
        </span>
      </div>
      {open && (
        <div style={{ padding: '2px 8px 6px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GLOBAL_MODEL_CHOICES.map(({ id, label }) => (
            <div
              key={id}
              data-testid={`global-model-${id}`}
              onClick={() => pick(id)}
              style={{
                padding: '4px 8px', borderRadius: 5, cursor: 'pointer',
                fontSize: 12, fontFamily: MENU.bodyFont,
                fontWeight: globalModel === id ? 700 : 500,
                color: globalModel === id ? '#60A5FA' : C.text2,
                background: globalModel === id ? 'rgba(96,165,250,0.10)' : 'transparent',
              }}
            >
              {label}{globalModel === id ? '  ✓' : ''}
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: C.muted, fontFamily: MENU.bodyFont, padding: '2px 8px 0', lineHeight: 1.5 }}>
            Applies to every chat. A chat with its own pick (chat settings → Model) keeps it.
          </div>
        </div>
      )}
      {justApplied && (
        <div data-testid="global-model-confirm" style={{ marginTop: 6, padding: '6px 8px', borderRadius: 7, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)', color: '#22C55E', fontSize: 11, fontWeight: 600, fontFamily: MENU.bodyFont, lineHeight: 1.4 }}>
          Applied to all rooms — next turns will use {justApplied}.
        </div>
      )}
    </div>
  )
}

function PlainRow({ icon, label, onClick }) {
  return (
    <div
      data-row
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 8px',
        borderRadius: 5,
        cursor: 'pointer',
        color: C.muted,
      }}
    >
      {icon}
      <span style={{ fontSize: 13, fontWeight: 500, color: C.text2, fontFamily: MENU.bodyFont }}>{label}</span>
    </div>
  )
}

// R78-p9b — "New mission" row at the bottom of an expanded project's mission list.
// Clicking opens the NewRoomModal without closing the drawer.
function NewMissionRow({ onClick }) {
  return (
    <div
      data-row
      data-cv4-new-mission
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px 4px 40px',
        borderRadius: 5,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.querySelector('[data-label]').style.color = C.muted }}
      onMouseLeave={(e) => { e.currentTarget.querySelector('[data-label]').style.color = C.dim }}
    >
      <span style={{
        width: 12, height: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.dim,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </span>
      <span
        data-label
        style={{
          fontSize: 11.5, fontWeight: 500, color: C.dim,
          fontFamily: MENU.bodyFont,
          userSelect: 'none',
        }}
      >New mission</span>
    </div>
  )
}

function Empty({ label }) {
  return (
    <div style={{
      padding: '4px 14px 8px 30px',
      fontSize: 11, color: C.muted,
      fontStyle: 'italic',
      fontFamily: MENU.bodyFont,
    }}>{label}</div>
  )
}

// Shared vocabulary (M16-R3): the same FolderIcon the Home view uses — one
// object, one identity, everywhere. Wrapper pins the Explorer's muted color.
function FolderIcon({ open }) {
  return <KitFolderIcon open={open} color={C.muted} />
}

function DocIcon() {
  return <KitMissionIcon color={C.muted} />
}

// R20 — NestedUnderMail retired. Projects is its own top-level
// section now; no more "Filed under Mail" label, no more indented
// border. Function deleted along with the JSX usage.

function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.5" y2="16.5"/>
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}

// R7.15 — Search row directly under the EXPLORER header. Click expands
// into an inline input that filters projects + agents; tapping a result
// routes via the existing handlers. Stays out of the way when not in use.
function DrawerSearchRow({ projectRooms, agents, worldId, onSelectProject, onSelectAgent, onClose }) {
  const [open, setOpen] = useState(false)
  const {
    searchQuery, setSearchQuery,
    msgHits, taskHits, agentHits, projectHits, fileHits,
    searching, showSearch,
  } = useHomeSearch({ agents, projects: projectRooms, world: worldId })

  const agentMap = useMemo(() => {
    const m = new Map()
    for (const a of (agents || [])) m.set(a.slug, a)
    return m
  }, [agents])
  const projectMap = useMemo(() => {
    const m = new Map()
    for (const p of (projectRooms || [])) m.set(p.slug, p)
    return m
  }, [projectRooms])

  const close = () => { setSearchQuery(''); setOpen(false) }
  const goAgent = (slug) => {
    const a = agentMap.get(slug); if (a) { onSelectAgent?.(a); onClose?.(); close() }
  }
  const goProject = (slug) => {
    const p = projectMap.get(slug); if (p) { onSelectProject?.(p); onClose?.(); close() }
  }
  const goFromMessage = (m) => {
    // Route to the agent/project that owns the message, then dispatch a
    // scroll-to-message event the MessageList picks up to scroll + flash.
    if (m.agent && agentMap.has(m.agent)) {
      goAgent(m.agent)
    } else if (m.project && projectMap.has(m.project)) {
      goProject(m.project)
    } else {
      return
    }
    if (typeof window !== 'undefined' && m.id != null) {
      // Slight delay so the agent/project navigation has time to mount and
      // load the target thread's messages before we look up the element.
      window.setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('cv4:scroll-to-message', { detail: { messageId: m.id } }))
        } catch (_) { /* ignore */ }
      }, 350)
    }
  }

  if (!open) {
    return (
      <div
        data-cv4-drawer-search-row
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          cursor: 'pointer',
          color: C.muted,
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <SearchIcon />
        <span>Search</span>
      </div>
    )
  }

  const anyHits = !!(projectHits.length || agentHits.length || msgHits.length || taskHits.length || fileHits.length)

  return (
    <div data-cv4-drawer-search-row data-open style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '8px 10px 10px',
      minWidth: 0,
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        padding: '6px 10px',
      }}>
        <SearchIcon />
        <input
          autoFocus
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Messages, files…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: C.text, fontFamily: MENU.bodyFont, fontSize: 13,
          }}
          onKeyDown={e => { if (e.key === 'Escape') close() }}
        />
        <button
          onClick={close}
          aria-label="Close search"
          style={{
            background: 'none', border: 'none', color: C.muted, cursor: 'pointer',
            padding: 0, fontFamily: MENU.monoFont, fontSize: 10,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >ESC</button>
      </div>

      {showSearch && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
          {projectHits.length > 0 && (
            <SearchGroup title="Projects">
              {projectHits.slice(0, 6).map(p => (
                <SearchHitRow key={`s-p-${p.slug}`} onClick={() => goProject(p.slug)}>{p.name}</SearchHitRow>
              ))}
            </SearchGroup>
          )}
          {agentHits.length > 0 && (
            <SearchGroup title="Agents">
              {agentHits.slice(0, 6).map(a => (
                <SearchHitRow key={`s-a-${a.slug}`} onClick={() => goAgent(a.slug)}>{a.name}</SearchHitRow>
              ))}
            </SearchGroup>
          )}
          {msgHits.length > 0 && (
            <SearchGroup title="Messages">
              {msgHits.slice(0, 6).map(m => (
                <SearchHitRow
                  key={`s-m-${m.id}`}
                  onClick={() => goFromMessage(m)}
                  meta={agentMap.get(m.agent)?.name || projectMap.get(m.project)?.name || m.agent || m.project}
                >{truncate(m.text, 80)}</SearchHitRow>
              ))}
            </SearchGroup>
          )}
          {/* corner:mission-rooms — Tasks search group removed 2026-05-17. */}
          {fileHits.length > 0 && (
            <SearchGroup title="Files">
              {fileHits.slice(0, 6).map(f => (
                <SearchHitRow
                  key={`s-f-${f.path || f.slug || f.title}`}
                  onClick={() => { if (f.project) goProject(f.project) }}
                  meta={projectMap.get(f.project)?.name || f.project}
                >{f.title || f.filename || f.slug}</SearchHitRow>
              ))}
            </SearchGroup>
          )}
          {!anyHits && !searching && (
            <div style={{
              marginTop: 4, padding: '6px 8px',
              fontSize: 11, color: C.dim, fontStyle: 'italic',
              fontFamily: MENU.bodyFont,
            }}>No matches</div>
          )}
          {searching && !anyHits && (
            <div style={{
              marginTop: 4, padding: '6px 8px',
              fontSize: 10, color: C.dim,
              fontFamily: MENU.monoFont,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Searching…</div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchGroup({ title, children }) {
  return (
    <div style={{ marginTop: 6, minWidth: 0, width: '100%' }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: C.dim,
        letterSpacing: '0.10em', textTransform: 'uppercase',
        padding: '4px 4px 2px',
        fontFamily: MENU.monoFont,
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

function SearchHitRow({ children, meta, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '6px 8px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: C.text, fontSize: 13,
        fontFamily: MENU.bodyFont,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2,
        width: '100%', minWidth: 0, maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'block', minWidth: 0, maxWidth: '100%',
      }}>{children}</span>
      {meta ? (
        <span style={{
          fontSize: 9, color: C.dim,
          fontFamily: MENU.monoFont,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block', minWidth: 0, maxWidth: '100%',
        }}>{meta}</span>
      ) : null}
    </button>
  )
}

function truncate(s, n) {
  if (!s) return ''
  if (s.length <= n) return s
  return s.slice(0, n).trim() + '…'
}