// CV4 ContextNav — second navigation row.
//
// Layout: [hamburger] + [context title with switcher dropdown]
//         · [Chat | Tasks toggle]
//         · [compaction meters slot]
//
// R5.1 Phase H: the old in-thread ThreadHeader is gone; everything that
// used to live there moves here or into the bottom Commands menu. Title
// becomes a click-to-switch dropdown (agents + projects). Right slot
// renders the context-fullness + storage-quota meters when an agent
// chat is active.

import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { Badge, Tab } from '../components/cv3/shared.jsx'
import { ChatIcon, TasksIcon } from '../components/cv3/icons.jsx'
import ContextFullnessMeter from '../components/cv3/session/ContextFullnessMeter.jsx'
import StorageQuotaMeter from '../components/cv3/session/StorageQuotaMeter.jsx'

export default function CV4ContextNav({
  tab,
  onSwitchTab,
  unreadChat = 0,
  activeTaskCount = 0,
  drawerOpen,
  onToggleDrawer,
  tasksDrawerOpen,
  onToggleTasksDrawer,
  isDesktop = false,
  selectedAgent,
  conversationTarget,
  agents = [],
  projects = [],
  onSelectAgent,
  onSelectProject,
  worldId,
  activeTool = null,
  onExitTool,
  deckActive = false,
  onToggleDeck,
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)

  useEffect(() => {
    if (!switcherOpen) return
    const handler = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [switcherOpen])

  // Default state — first paint / home view: the title IS the room switcher
  // entry point. switchable=true so the user can jump directly into any room
  // from the home view without needing the left rail.
  let title = 'Home'
  let dotColor = null
  let switchable = true
  if (activeTool === 'mail') {
    // Mail Room takeover: title is the room, dot is amber so it reads as
    // "tool mode" instead of an agent thread. Agent switcher stays disabled
    // — to leave the room the user clears the tool via the exit affordance.
    title = 'Mail Room'
    dotColor = C.yellow
    switchable = false
  } else if (tab === 'tasks') {
    title = conversationTarget?.type === 'project' ? conversationTarget.name : 'Tasks'
    dotColor = conversationTarget?.type === 'project' ? (conversationTarget.color || C.yellow) : null
  } else if (selectedAgent) {
    title = selectedAgent.name
    dotColor = selectedAgent.color || C.accent
    switchable = true
  } else if (conversationTarget?.type === 'project') {
    title = conversationTarget.name
    dotColor = conversationTarget.color || C.blue
    switchable = true
  }

  const sortedProjects = [...projects].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  const showMeters = tab === 'chat' && selectedAgent?.slug

  // Model badge (corner:gemini-workers R4) — which brain answers this room.
  // Self-contained: fetch the agent_models prefs once per world; effective =
  // per-chat pick, else the '_all' blanket switch, else default Claude.
  const [modelPrefs, setModelPrefs] = useState({})
  useEffect(() => {
    if (!worldId) return
    const load = () => authFetch(`/api/dashboard/agent-model?client=${encodeURIComponent(worldId)}`)
      .then(r => (r.ok ? r.json() : { models: {} }))
      .then(({ models }) => { if (models) setModelPrefs(models) })
      .catch(() => {})
    load()
    // Any model switch (chat settings Model tab or the Account blanket
    // switch) fires this event so the badge updates without a reload.
    window.addEventListener('aom-model-pref-changed', load)
    return () => window.removeEventListener('aom-model-pref-changed', load)
  }, [worldId, selectedAgent?.slug, conversationTarget?.slug])
  const badgeChatKey = selectedAgent?.slug
    || (conversationTarget?.type === 'project' && conversationTarget?.slug ? `project:${conversationTarget.slug}` : null)
  // corner:gemini-workers full-experience — on /cvg every send is forced onto a
  // Gemini model regardless of the room's saved pref (mirrors
  // useChatSend.cvgModelOverride). The badge must name the brain that ACTUALLY
  // answers, not the stale saved pref — otherwise /cvg shows "CLAUDE" while it's
  // running Gemini.
  let cvgForced = null
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/cvg')) {
    try { cvgForced = window.localStorage.getItem('cvgModel') } catch { /* private mode */ }
    cvgForced = cvgForced || 'gemini-3.5-flash'
  }
  let effectiveModel = 'default'
  if (cvgForced) {
    effectiveModel = cvgForced
  } else if (badgeChatKey) {
    const own = (modelPrefs[badgeChatKey] || '').trim()
    const all = (modelPrefs._all || '').trim()
    effectiveModel = (own && own !== 'default') ? own : ((all && all !== 'default') ? all : 'default')
  }
  const modelBadgeLabel = {
    default: 'Claude', opus: 'Claude Opus', sonnet: 'Claude Sonnet',
    haiku: 'Claude Haiku', 'gemini-3.5-flash': 'Gemini 3.5 Flash',
    'gemini-3.1-pro': 'Gemini 3.1 Pro',
  }[effectiveModel] || effectiveModel
  const modelBadgeIsGemini = effectiveModel.startsWith('gemini')
  const showModelBadge = !!badgeChatKey && activeTool !== 'mail'

  return (
    <div
      data-cv4-context-nav
      style={{
        width: '100%',
        flexShrink: 0,
        background: C.bg,
        borderBottom: '1px solid ' + C.border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}
    >
      {/* LEFT: search button (opens drawer + the search row inside it). */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <button
          data-testid="cv4-context-drawer-toggle"
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: drawerOpen ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${drawerOpen ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: drawerOpen ? C.accent : C.muted,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {/* Search icon — opens the file-browser drawer. The drawer
              also surfaces a search row under EXPLORE for quick lookup. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.5" y2="16.5"/>
          </svg>
        </button>
      </div>

      {/* CENTER: agent/room name switcher, centered across the bar. */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
        <div ref={switcherRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
          {dotColor && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: dotColor, flexShrink: 0,
            }} />
          )}
          {switchable ? (
            <button
              data-testid="cv4-context-title-switcher"
              onClick={() => setSwitcherOpen(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer',
                color: C.text,
                fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                minWidth: 0,
              }}
            >
              <span style={{
                fontSize: 17, fontWeight: 800,
                letterSpacing: '-0.018em',
                textTransform: 'uppercase',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{title}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          ) : (
            <span style={{
              fontSize: 17, fontWeight: 800, color: C.text,
              fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: '-0.018em',
              textTransform: 'uppercase',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{title}</span>
          )}
          {showModelBadge && (
            <span
              data-testid="model-badge"
 title="The AI model answering this room, change it in chat settings or Account → AI model"
              style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
                padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                textTransform: 'uppercase',
                fontFamily: "'Hanken Grotesk', -apple-system, sans-serif",
                color: modelBadgeIsGemini ? '#60A5FA' : C.muted,
                background: modelBadgeIsGemini ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${modelBadgeIsGemini ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              {modelBadgeLabel}
            </span>
          )}
          {activeTool === 'mail' && onExitTool && (
            <button
              type="button"
              onClick={onExitTool}
              aria-label="Leave Mail Room"
              title="Leave Mail Room"
              style={{
                marginLeft: 6, flexShrink: 0,
                width: 20, height: 20, borderRadius: 5,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, lineHeight: 1,
              }}
            >×</button>
          )}

          {switcherOpen && switchable && (
            <div data-cv4-switcher-popover style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 6,
              width: 260,
              maxWidth: '90vw',
              maxHeight: 360,
              overflowY: 'auto',
              background: '#0B1018',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 2,
              padding: 6,
              zIndex: 200,
              boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
            }}>
              {agents.length > 0 && (
                <>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: C.dim,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '6px 8px 4px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>Agents</div>
                  {agents.map(agent => (
                    <button
                      key={`cv4-sw-a-${agent.slug}`}
                      onClick={() => {
                        setSwitcherOpen(false)
                        if (agent.slug !== selectedAgent?.slug) onSelectAgent?.(agent)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 8px',
                        borderRadius: 8,
                        background: agent.slug === selectedAgent?.slug ? 'rgba(16,185,129,0.10)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (agent.slug !== selectedAgent?.slug) e.currentTarget.style.background = C.s2 }}
                      onMouseLeave={e => { if (agent.slug !== selectedAgent?.slug) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: agent.color || C.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 10, color: '#000',
                      }}>
                        {(agent.name || '?')[0].toUpperCase()}
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: C.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{agent.name}</span>
                      {agent.slug === selectedAgent?.slug && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </>
              )}
              {sortedProjects.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 8px' }} />
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: C.dim,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '6px 8px 4px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>Projects</div>
                  {sortedProjects.map(project => {
                    const pColor = project.color || '#6B8AB0'
                    return (
                      <button
                        key={`cv4-sw-p-${project.id || project.slug}`}
                        onClick={() => {
                          setSwitcherOpen(false)
                          onSelectProject?.(project)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 8px',
                          borderRadius: 8,
                          background: 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                          border: `1px solid ${pColor}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: pColor }} />
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: C.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{project.name}</span>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: tasks/missions toggle + mail toggle.
          Tasks/missions button shows in ALL non-mail contexts — this was the bug:
          it was previously gated to project rooms only, so in agent chats (the
          default view) there was no button and no way to open the right rail.
          Fix (2026-05-18): condition changed from `conversationTarget?.type === 'project'`
          to `activeTool !== 'mail'` so the button is always present.
          Mail button only appears when activeTool === 'mail'. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 30, justifyContent: 'flex-end' }}>
 {/* command:deck, loop icon, Elon's room only. Opens the Command Deck
            (the loop's control surface) right here. Sits next to the tasks icon;
            amber tint when the deck is open. Replaces the old in-room tab row. */}
        {selectedAgent?.slug === 'elon' && activeTool !== 'mail' && onToggleDeck && (
          <button
            data-testid="cv4-context-deck-toggle"
            onClick={onToggleDeck}
            aria-label={deckActive ? 'Close Command Deck' : 'Open Command Deck'}
            title={deckActive ? 'Close Command Deck' : 'Command Deck'}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: deckActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${deckActive ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.08)'}`,
              color: deckActive ? '#FBBF24' : C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {/* loop / cycle glyph */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2.1l4 4-4 4"/>
              <path d="M3 12.9v-2a4 4 0 0 1 4-4h14"/>
              <path d="M7 21.9l-4-4 4-4"/>
              <path d="M21 11.1v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>
        )}
        {/* Tasks/missions panel toggle — opens the RIGHT drawer (desktop) or
            switches to tasks tab (mobile). Active (green tint) when the right
            drawer is open or the user is inside a specific mission room. */}
        {activeTool !== 'mail' && (
          <button
            data-testid="cv4-context-missions-toggle"
            onClick={() => isDesktop
              ? onToggleTasksDrawer?.()
              : onSwitchTab(tab === 'tasks' ? 'chat' : 'tasks')
            }
            aria-label={conversationTarget?.type === 'project' ? 'View missions' : 'View tasks'}
            title={conversationTarget?.type === 'project' ? 'View missions' : 'View tasks'}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: ((isDesktop ? tasksDrawerOpen : tab === 'tasks') || conversationTarget?.missionSlug)
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${((isDesktop ? tasksDrawerOpen : tab === 'tasks') || conversationTarget?.missionSlug)
                ? 'rgba(16,185,129,0.4)'
                : 'rgba(255,255,255,0.08)'}`,
              color: ((isDesktop ? tasksDrawerOpen : tab === 'tasks') || conversationTarget?.missionSlug) ? C.accent : C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {conversationTarget?.type === 'project' ? (
              /* Flag icon — missions context (project room). */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            ) : (
              /* Right-panel icon — generic tasks/missions context (agent chat, home). */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
            )}
          </button>
        )}
        {!isDesktop && activeTool === 'mail' && (
          <button
            data-testid="cv4-mail-tab-toggle"
            onClick={() => onSwitchTab(tab === 'tasks' ? 'chat' : 'tasks')}
            aria-label={tab === 'tasks' ? 'Switch to chat' : 'View mail'}
            title={tab === 'tasks' ? 'Switch to chat' : 'View mail'}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: tab === 'tasks' ? 'rgba(234,179,8,0.14)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === 'tasks' ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === 'tasks' ? C.yellow : C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <polyline points="3 7 12 13 21 7"/>
            </svg>
          </button>
        )}
        {isDesktop && onToggleTasksDrawer && activeTool === 'mail' && (
          <button
            data-testid="cv4-mail-drawer-toggle"
            onClick={onToggleTasksDrawer}
            aria-label={tasksDrawerOpen ? 'Close mail' : 'Open mail'}
            title={tasksDrawerOpen ? 'Close mail' : 'Open mail'}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: tasksDrawerOpen ? 'rgba(234,179,8,0.14)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tasksDrawerOpen ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: tasksDrawerOpen ? C.yellow : C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <polyline points="3 7 12 13 21 7"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
