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
import missionsData from '../data/missions.json'
import useHomeSearch from '../components/cv3/conversations/useHomeSearch.js'
import { authFetch } from '../lib/authFetch.js'
import LeftMailPanel from './LeftMailPanel.jsx'

const PANEL_WIDTH = 300
const MENU = {
  bodyFont: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  displayFont: "'Instrument Serif', Georgia, serif",
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
      map.set(p.slug, { missions, missionMeta, unfiled: p.unfiled_tasks || [] })
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
    />
  )

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
        {body}
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
        {body}
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
}) {
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

      {/* R10-1 (2026-05-25) — Mail leads, Agents follow (per Patrik). */}
      {/* Mail Room lives in the left rail.
          Disconnected: amber Connect Gmail hero (kicks OAuth start).
          Connected: 5-bucket tab strip + inline email list. Clicking an
          email pins it as a chat chip on the EA via onSelectMail. */}
      <LeftMailPanel
        selectedMailId={selectedMailId}
        onSelectMail={(email) => { onSelectMail?.(email); onClose() }}
      />

      <TreeSection title="Agents">
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

      <NestedUnderMail>
      <TreeSection
        title="Projects"
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
          projectRooms.map(p => {
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
                    projectSlug: p.slug,
                  }
                }).sort((a, b) => {
                  if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
                  return (a.name || '').localeCompare(b.name || '')
                })
              : staticMissions
            const isExpanded = expanded.has(p.slug)
            const hasMissions = missions.length > 0
            return (
              <div key={p.slug}>
                <FolderRow
                  label={p.name}
                  hasChildren={hasMissions}
                  expanded={isExpanded}
                  active={selectedProjectSlug === p.slug}
                  hasNotif={projectNotif.has(p.slug)}
                  onToggle={() => toggle(p.slug)}
                  onOpen={() => { onSelectProject?.(p); onClose() }}
                />
                {isExpanded && (
                  <div>
                    {hasMissions && missions.map(m => {
                      // corner:mission-rooms — tasks retired 2026-05-17. Only
                      // last_message_at metadata drives the active dot; no
                      // task tree, no expand-tasks, no unfiled tasks section.
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
                        />
                      )
                    })}
                    {/* R78-p9b — new mission door: always visible when expanded */}
                    {onNewMission && (
                      <NewMissionRow onClick={() => onNewMission(p)} />
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </TreeSection>

      </NestedUnderMail>

      <TreeSection title="Account">
        {/* "Reset to AOM" is a super-admin backdoor — wipes world override +
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
      </TreeSection>
    </div>
  )
}

// R10-2: section labels match the right-menu SectionLabel cadence
// (mono 10px, 0.12em letter-spacing, muted not dim, more breathing above).
function TreeSection({ title, action = null, children }) {
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
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: C.muted,
          fontFamily: MENU.monoFont,
        }}>{title}</span>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </section>
  )
}

function FolderRow({ label, hasChildren, expanded, active, hasNotif = false, onToggle, onOpen }) {
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

function MissionRow({ mission, lastMessageAt = null, hasNotif = false, onClick }) {
  // corner:mission-rooms — tasks retired 2026-05-17. Active dot is driven by
  // recent chat in the mission room. corner:notifications R2 — the same dot
  // also lights for an unread notification, which takes the headline meaning
  // (a notification is a stronger signal than "recent activity").
  const recentChat = (() => {
    if (!lastMessageAt) return false
    const then = new Date(lastMessageAt).getTime()
    if (!Number.isFinite(then)) return false
    return (Date.now() - then) < (24 * 60 * 60 * 1000)
  })()
  const isActive = hasNotif || recentChat
  return (
    <div
      data-row
      data-active={isActive ? 'true' : undefined}
      data-test-id="mission-row"
      data-mission-slug={mission?.slug || ''}
      data-mission-active={isActive ? 'true' : 'false'}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px 4px 40px',
        borderRadius: 5,
        cursor: 'pointer',
      }}
    >
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

function FolderIcon({ open }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/>
        <path d="M3 10h18l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.muted, flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

// R9/R10 — Visual nest. Projects + Agents are filed under Mail. A subtle
// left rule + indent communicates the hierarchy without shouting.
function NestedUnderMail({ children }) {
  return (
    <div style={{
      paddingLeft: 8,
      marginLeft: 4,
      marginBottom: 4,
      borderLeft: '1px solid rgba(234,179,8,0.14)',
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 8, fontWeight: 700, color: C.dim,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        padding: '4px 6px 2px',
        fontFamily: MENU.monoFont,
        opacity: 0.7,
      }}>Filed under Mail</div>
      {children}
    </div>
  )
}

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
